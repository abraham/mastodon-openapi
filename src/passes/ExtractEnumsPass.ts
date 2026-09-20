import {
  OpenAPISpec,
  OpenAPISchema,
  OpenAPIProperty,
} from '../interfaces/OpenAPISchema';
import { SpecPass } from './SpecPass';
import {
  collectEnumsFromProperties,
  extractEntityEnumsToComponents,
} from './EntityEnumCollector';
import {
  findExistingEntityEnumForSubset,
  generateEntityEnumComponentName,
  generateSharedEnumComponentName,
  isMethodParameterContext,
} from './EnumNaming';

/**
 * Hoists every inline enum into a shared component and points the original
 * sites at it. Runs last because it needs the finished document: an enum's
 * component name depends on every place the same value set appears.
 */
export class ExtractEnumsPass implements SpecPass {
  public readonly name = 'deduplicate-enums';

  public run(spec: OpenAPISpec): void {
    this.deduplicateEnumsGlobally(spec);
  }

  /**
   * Perform global enum deduplication across entities and method parameters
   */
  private deduplicateEnumsGlobally(spec: OpenAPISpec): void {
    // Track enum patterns: key = enum signature, value = shared component name
    const enumPatterns = new Map<string, string>();

    // First pass: identify all enum patterns from entities and methods
    const enumSignatureToOriginalValues = new Map<string, any[]>();

    // Special first pass: Extract ALL entity enums into their own components
    if (spec.components?.schemas) {
      extractEntityEnumsToComponents(
        spec,
        enumPatterns,
        enumSignatureToOriginalValues
      );
    }

    // Collect enums from entity schemas (for remaining deduplication)
    if (spec.components?.schemas) {
      for (const [entityName, schema] of Object.entries(
        spec.components.schemas
      )) {
        this.collectEnumPatternsFromSchema(
          schema as OpenAPISchema,
          entityName,
          enumPatterns,
          enumSignatureToOriginalValues
        );
      }
    }

    // Collect enums from method parameters and request bodies
    if (spec.paths) {
      for (const [path, pathItem] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (typeof operation === 'object' && operation !== null) {
            // Collect from parameters
            if (operation.parameters) {
              for (const param of operation.parameters) {
                if (param.schema) {
                  // Sanitize path and method for valid component names
                  const sanitizedPath = path.replace(/[^a-zA-Z0-9]/g, '_');
                  const sanitizedMethod = method.replace(/[^a-zA-Z0-9]/g, '_');
                  this.collectEnumPatternsFromProperty(
                    param.schema,
                    `${sanitizedMethod}_${sanitizedPath}_param_${param.name}`,
                    enumPatterns,
                    enumSignatureToOriginalValues
                  );
                }
              }
            }

            // Collect from request body
            if (operation.requestBody?.content?.['application/json']?.schema) {
              const schema =
                operation.requestBody.content['application/json'].schema;
              // Sanitize path and method for valid component names
              const sanitizedPath = path.replace(/[^a-zA-Z0-9]/g, '_');
              const sanitizedMethod = method.replace(/[^a-zA-Z0-9]/g, '_');
              this.collectEnumPatternsFromSchema(
                schema as OpenAPISchema,
                `${sanitizedMethod}_${sanitizedPath}_requestBody`,
                enumPatterns,
                enumSignatureToOriginalValues
              );
            }
          }
        }
      }
    }

    // Create shared components for patterns that appear in multiple places
    for (const [enumSignature, componentName] of enumPatterns) {
      if (componentName) {
        const originalValues = enumSignatureToOriginalValues.get(enumSignature);

        if (spec.components?.schemas && originalValues) {
          // Only create/overwrite if we have valid enum values
          // This prevents overwriting entity enums that were already created properly
          spec.components.schemas[componentName] = {
            type: 'string',
            enum: originalValues,
          } as any;
        }
      }
    }

    // Second pass: replace inline enums with references to shared components
    if (spec.components?.schemas) {
      for (const [entityName, schema] of Object.entries(
        spec.components.schemas
      )) {
        this.replaceEnumsWithReferences(schema as OpenAPISchema, enumPatterns);
      }
    }

    if (spec.paths) {
      for (const [path, pathItem] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (typeof operation === 'object' && operation !== null) {
            // Replace in parameters
            if (operation.parameters) {
              for (const param of operation.parameters) {
                if (param.schema) {
                  this.replaceEnumsInProperty(param.schema, enumPatterns);
                }
              }
            }

            // Replace in request body
            if (operation.requestBody?.content?.['application/json']?.schema) {
              const schema =
                operation.requestBody.content['application/json'].schema;
              this.replaceEnumsWithReferences(
                schema as OpenAPISchema,
                enumPatterns
              );
            }
          }
        }
      }
    }
  }

  /**
   * Collect enum patterns from a schema
   */
  private collectEnumPatternsFromSchema(
    schema: OpenAPISchema,
    contextName: string,
    enumPatterns: Map<string, string>,
    enumSignatureToOriginalValues: Map<string, any[]>
  ): void {
    if (!schema.properties) return;

    for (const [propName, property] of Object.entries(schema.properties)) {
      this.collectEnumPatternsFromProperty(
        property,
        `${contextName}_${propName}`,
        enumPatterns,
        enumSignatureToOriginalValues
      );
    }
  }

  /**
   * Collect enum patterns from a property
   */
  private collectEnumPatternsFromProperty(
    property: OpenAPIProperty,
    contextName: string,
    enumPatterns: Map<string, string>,
    enumSignatureToOriginalValues: Map<string, any[]>
  ): void {
    // Look for array properties with enum values
    if (
      property.type === 'array' &&
      property.items &&
      typeof property.items === 'object' &&
      property.items.enum &&
      Array.isArray(property.items.enum)
    ) {
      const enumSignature = JSON.stringify([...property.items.enum].sort());
      this.processEnumPattern(
        enumSignature,
        property.items.enum,
        contextName,
        enumPatterns,
        enumSignatureToOriginalValues
      );
    }
    // Look for direct enum properties
    else if (property.enum && Array.isArray(property.enum)) {
      const enumSignature = JSON.stringify([...property.enum].sort());
      this.processEnumPattern(
        enumSignature,
        property.enum,
        contextName,
        enumPatterns,
        enumSignatureToOriginalValues
      );
    }
    // Look for nested object properties
    else if (
      property.type === 'object' &&
      property.properties &&
      typeof property.properties === 'object'
    ) {
      // Recursively process nested properties
      for (const [nestedPropName, nestedProperty] of Object.entries(
        property.properties
      )) {
        this.collectEnumPatternsFromProperty(
          nestedProperty,
          `${contextName}_${nestedPropName}`,
          enumPatterns,
          enumSignatureToOriginalValues
        );
      }
    }
  }

  /**
   * Process a single enum pattern
   */
  private processEnumPattern(
    enumSignature: string,
    enumValues: any[],
    contextName: string,
    enumPatterns: Map<string, string>,
    enumSignatureToOriginalValues: Map<string, any[]>
  ): void {
    if (!enumPatterns.has(enumSignature)) {
      // First occurrence - check if this enum is a subset of an existing entity enum
      // But only for method parameter enums (not entity enums)
      if (isMethodParameterContext(contextName)) {
        const existingEntityEnum = findExistingEntityEnumForSubset(
          enumValues,
          enumPatterns,
          enumSignatureToOriginalValues
        );

        if (existingEntityEnum) {
          // Reuse existing entity enum instead of creating a new one
          enumPatterns.set(enumSignature, existingEntityEnum);
          return;
        }
      }

      // Save original values and mark it for potential shared component creation
      enumPatterns.set(enumSignature, '');
      enumSignatureToOriginalValues.set(enumSignature, enumValues);
    } else if (enumPatterns.get(enumSignature) === '') {
      // Second occurrence - create shared component
      const componentName = generateSharedEnumComponentName(
        contextName,
        enumValues
      );
      enumPatterns.set(enumSignature, componentName);
    }
  }

  /**
   * Replace inline enums with references to shared components in schemas
   */
  private replaceEnumsWithReferences(
    schema: OpenAPISchema,
    enumPatterns: Map<string, string>
  ): void {
    if (!schema.properties) return;

    for (const [propName, property] of Object.entries(schema.properties)) {
      this.replaceEnumsInProperty(property, enumPatterns);
    }
  }

  /**
   * Replace inline enums with references to shared components in properties
   */
  private replaceEnumsInProperty(
    property: OpenAPIProperty,
    enumPatterns: Map<string, string>
  ): void {
    // Handle array properties with enum items
    if (
      property.type === 'array' &&
      property.items &&
      typeof property.items === 'object' &&
      property.items.enum &&
      Array.isArray(property.items.enum)
    ) {
      const enumSignature = JSON.stringify([...property.items.enum].sort());
      const componentName = enumPatterns.get(enumSignature);

      if (componentName) {
        // Replace with reference to shared component
        property.items = {
          $ref: `#/components/schemas/${componentName}`,
        };
      }
    }
    // Handle direct enum properties
    else if (property.enum && Array.isArray(property.enum)) {
      const enumSignature = JSON.stringify([...property.enum].sort());
      const componentName = enumPatterns.get(enumSignature);

      if (componentName) {
        // Replace with reference to shared component
        delete property.enum;
        property.$ref = `#/components/schemas/${componentName}`;
      }
    }
    // Handle nested object properties
    else if (
      property.type === 'object' &&
      property.properties &&
      typeof property.properties === 'object'
    ) {
      // Recursively process nested properties
      for (const [, nestedProperty] of Object.entries(property.properties)) {
        this.replaceEnumsInProperty(nestedProperty, enumPatterns);
      }
    }
  }
}
