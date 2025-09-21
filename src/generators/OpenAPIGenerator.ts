import { EntityClass } from '../interfaces/EntityClass';
import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';
import {
  OpenAPISpec,
  OpenAPISchema,
  OpenAPIProperty,
} from '../interfaces/OpenAPISchema';
import { SpecBuilder } from './SpecBuilder';
import { EntityConverter } from './EntityConverter';
import { MethodConverter } from './MethodConverter';
import { TypeParser } from './TypeParser';
import { UtilityHelpers } from './UtilityHelpers';
import { ErrorExampleRegistry } from './ErrorExampleRegistry';
import { LinkGenerator } from './LinkGenerator';

class OpenAPIGenerator {
  private spec: OpenAPISpec;
  private specBuilder: SpecBuilder;
  private entityConverter: EntityConverter;
  private methodConverter: MethodConverter;
  private typeParser: TypeParser;
  private utilityHelpers: UtilityHelpers;
  private errorExampleRegistry: ErrorExampleRegistry;
  private linkGenerator: LinkGenerator;

  constructor() {
    // Initialize helper modules
    this.utilityHelpers = new UtilityHelpers();
    this.typeParser = new TypeParser(this.utilityHelpers);
    this.errorExampleRegistry = new ErrorExampleRegistry();
    this.entityConverter = new EntityConverter(
      this.typeParser,
      this.utilityHelpers
    );
    this.methodConverter = new MethodConverter(
      this.typeParser,
      this.utilityHelpers,
      this.errorExampleRegistry
    );
    this.specBuilder = new SpecBuilder();
    this.linkGenerator = new LinkGenerator();

    // Build initial OpenAPI spec
    this.spec = this.specBuilder.buildInitialSpec();
  }

  public generateSchema(
    entities: EntityClass[],
    methodFiles: ApiMethodsFile[]
  ): OpenAPISpec {
    // First, collect error examples from all method files
    this.errorExampleRegistry.collectErrorExamples(methodFiles);

    // Convert entities to OpenAPI schemas (without deduplication)
    this.entityConverter.convertEntities(entities, this.spec);

    // Convert methods to OpenAPI paths
    this.methodConverter.convertMethods(methodFiles, this.spec);

    // Generate operation links after all operations are created
    this.linkGenerator.generateLinks(methodFiles, this.spec);

    // Perform global enum deduplication across both entities and methods
    this.deduplicateEnumsGlobally(this.spec);

    return this.spec;
  }

  public toJSON(): string {
    return JSON.stringify(this.spec, null, 2);
  }

  // Public methods for testing - delegating to the appropriate modules
  public convertParameterToSchema(param: any): any {
    return this.typeParser.convertParameterToSchema(param);
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
      this.extractEntityEnumsToComponents(
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
   * Select the best occurrence from multiple entities sharing the same enum
   * Prioritizes shorter entity names and more canonical entity names
   */
  private selectBestEnumOccurrence(
    occurrences: { entityName: string; propName: string; enumValues: any[] }[]
  ): { entityName: string; propName: string; enumValues: any[] } {
    if (occurrences.length === 1) {
      return occurrences[0];
    }

    // Priority rules:
    // 1. Prefer certain canonical entities like "Status" over others
    // 2. Prefer shorter entity names (more likely to be canonical)
    // 3. As fallback, use alphabetical order

    const canonicalEntities = ['Status', 'Account', 'Notification', 'User'];

    // First, try to find a canonical entity
    for (const canonicalEntity of canonicalEntities) {
      const match = occurrences.find(
        (occ) => occ.entityName === canonicalEntity
      );
      if (match) {
        return match;
      }
    }

    // Then, prefer shorter entity names
    occurrences.sort((a, b) => {
      const lengthDiff = a.entityName.length - b.entityName.length;
      if (lengthDiff !== 0) {
        return lengthDiff;
      }
      // If same length, use alphabetical order
      return a.entityName.localeCompare(b.entityName);
    });

    return occurrences[0];
  }

  /**
   * Recursively collect enum properties from nested object structures
   */
  private collectEnumsFromProperties(
    properties: Record<string, any>,
    entityName: string,
    parentPath: string,
    enumOccurrences: Map<
      string,
      { entityName: string; propName: string; enumValues: any[] }[]
    >
  ): void {
    for (const [propName, property] of Object.entries(properties)) {
      const fullPropName = parentPath ? `${parentPath}.${propName}` : propName;

      // Check for direct enum properties
      if (property.enum && Array.isArray(property.enum)) {
        const enumSignature = JSON.stringify([...property.enum].sort());

        if (!enumOccurrences.has(enumSignature)) {
          enumOccurrences.set(enumSignature, []);
        }
        enumOccurrences.get(enumSignature)!.push({
          entityName,
          propName: fullPropName,
          enumValues: property.enum,
        });
      }

      // Check for array properties with enum items
      if (
        property.type === 'array' &&
        property.items &&
        typeof property.items === 'object' &&
        property.items.enum &&
        Array.isArray(property.items.enum)
      ) {
        const enumSignature = JSON.stringify([...property.items.enum].sort());

        if (!enumOccurrences.has(enumSignature)) {
          enumOccurrences.set(enumSignature, []);
        }
        enumOccurrences.get(enumSignature)!.push({
          entityName,
          propName: fullPropName,
          enumValues: property.items.enum,
        });
      }

      // Recursively process nested object properties
      if (
        property.type === 'object' &&
        property.properties &&
        typeof property.properties === 'object'
      ) {
        this.collectEnumsFromProperties(
          property.properties,
          entityName,
          fullPropName,
          enumOccurrences
        );
      }
    }
  }

  /**
   * Extract ALL entity enums into their own components
   */
  private extractEntityEnumsToComponents(
    spec: OpenAPISpec,
    enumPatterns: Map<string, string>,
    enumSignatureToOriginalValues: Map<string, any[]>
  ): void {
    if (!spec.components?.schemas) return;

    // First pass: collect all enum occurrences to detect sharing opportunities
    const enumOccurrences = new Map<
      string,
      { entityName: string; propName: string; enumValues: any[] }[]
    >();

    for (const [entityName, schema] of Object.entries(
      spec.components.schemas
    )) {
      const openAPISchema = schema as OpenAPISchema;
      if (!openAPISchema.properties) continue;

      // Use recursive helper to collect all enums including nested ones
      this.collectEnumsFromProperties(
        openAPISchema.properties,
        entityName,
        '',
        enumOccurrences
      );
    }

    // Second pass: create enum components based on best occurrence
    for (const [enumSignature, occurrences] of enumOccurrences) {
      if (occurrences.length === 0) continue;

      // Choose the best occurrence to determine the component name
      const bestOccurrence = this.selectBestEnumOccurrence(occurrences);
      const componentName = this.generateEntityEnumComponentName(
        bestOccurrence.entityName,
        bestOccurrence.propName,
        bestOccurrence.enumValues
      );

      // Store the mapping and original values
      enumPatterns.set(enumSignature, componentName);
      enumSignatureToOriginalValues.set(
        enumSignature,
        bestOccurrence.enumValues
      );

      // Create the enum component
      spec.components.schemas[componentName] = {
        type: 'string',
        enum: bestOccurrence.enumValues,
      } as any;
    }
  }

  /**
   * Convert strings to PascalCase, handling both underscore-separated and already-PascalCase strings
   */
  private toPascalCase(input: string): string {
    // If the string contains underscores, split on them and capitalize each word
    if (input.includes('_')) {
      return input
        .split('_')
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join('');
    }

    // If it's already in PascalCase (starts with uppercase), return as-is
    if (/^[A-Z]/.test(input)) {
      return input;
    }

    // Otherwise, just capitalize the first letter
    return input.charAt(0).toUpperCase() + input.slice(1);
  }

  /**
   * Generate a unique name for an entity enum component
   */
  private generateEntityEnumComponentName(
    entityName: string,
    propertyName: string,
    enumValues: any[]
  ): string {
    // Sanitize property name to remove invalid characters
    const sanitizedPropName = propertyName.replace(/[^a-zA-Z0-9_]/g, '_');

    // Convert both entity name and property name to PascalCase
    const pascalEntityName = this.toPascalCase(entityName);
    const pascalPropName = this.toPascalCase(sanitizedPropName);

    // Create the enum name using the pattern: {Entity}{Attribute}Enum
    return `${pascalEntityName}${pascalPropName}Enum`;
  }

  /**
   * Create a short hash from a string
   */
  private createShortHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).slice(0, 6);
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
      if (this.isMethodParameterContext(contextName)) {
        const existingEntityEnum = this.findExistingEntityEnumForSubset(
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
      const componentName = this.generateSharedEnumComponentName(
        contextName,
        enumValues
      );
      enumPatterns.set(enumSignature, componentName);
    }
  }

  /**
   * Check if a context name indicates this is a method parameter enum
   */
  private isMethodParameterContext(contextName: string): boolean {
    // Method parameter contexts have these patterns:
    // - {method}_{path}_param_{paramName} (e.g., "get_api_v1_notifications_param_types")
    // - {method}_{path}_requestBody (e.g., "post_api_v2_filters_requestBody")
    // Entity contexts are just the entity name (e.g., "Filter", "Notification")
    return (
      contextName.includes('_param_') || contextName.includes('_requestBody')
    );
  }

  /**
   * Find an existing entity enum that contains all the values in the given subset
   */
  private findExistingEntityEnumForSubset(
    subsetValues: any[],
    enumPatterns: Map<string, string>,
    enumSignatureToOriginalValues: Map<string, any[]>
  ): string | null {
    // Look through existing entity enum patterns to find one that contains all our values
    for (const [signature, componentName] of enumPatterns.entries()) {
      // Only consider entity enums (those that already have component names)
      if (componentName && !componentName.includes('_')) {
        const existingValues = enumSignatureToOriginalValues.get(signature);
        if (existingValues && this.isSubsetOf(subsetValues, existingValues)) {
          return componentName;
        }
      }
    }
    return null;
  }

  /**
   * Check if subset is completely contained within superset
   */
  private isSubsetOf(subset: any[], superset: any[]): boolean {
    return subset.every((value) => superset.includes(value));
  }

  /**
   * Generate a name for a shared enum component
   */
  private generateSharedEnumComponentName(
    contextName: string,
    enumValues: any[]
  ): string {
    // Sanitize context name to remove invalid characters
    const sanitizedContext = contextName.replace(/[^a-zA-Z0-9_]/g, '_');

    // Extract entity and property names from context (format: EntityName_PropertyName)
    const parts = sanitizedContext.split('_');
    const propertyName = parts[parts.length - 1];
    const entityParts = parts.slice(0, -1);
    const entityName = entityParts.join('_');

    // Convert both to PascalCase
    const pascalEntityName = this.toPascalCase(entityName);
    const pascalPropName = this.toPascalCase(propertyName);

    // Create the enum name using the pattern: {Entity}{Attribute}Enum
    return `${pascalEntityName}${pascalPropName}Enum`;
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

export { OpenAPIGenerator };
