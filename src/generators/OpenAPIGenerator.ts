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

    // Note: No longer collecting from entity schemas again since extractEntityEnumsToComponents handles this

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
    // Also create individual components for patterns that appear only once
    // Track component names to detect conflicts
    const componentNameToSignature = new Map<string, string>();

    for (const [enumSignature, componentName] of enumPatterns) {
      const originalValues = enumSignatureToOriginalValues.get(enumSignature);

      if (componentName && componentName !== '') {
        // This is a shared component (appears multiple times)

        // Check for naming conflicts
        if (componentNameToSignature.has(componentName)) {
          const existingSignature = componentNameToSignature.get(componentName);
          if (existingSignature !== enumSignature) {
            // Naming conflict! Different enum signatures would have same name
            // Add hash to make it unique
            const enumSignatureForHash = JSON.stringify(
              [...originalValues!].sort()
            );
            const hash = this.createShortHash(enumSignatureForHash);
            const parts = componentName.split('Enum');
            const newComponentName = `${parts[0]}${hash}Enum`;
            enumPatterns.set(enumSignature, newComponentName);

            if (spec.components?.schemas) {
              spec.components.schemas[newComponentName] = {
                type: 'string',
                enum: originalValues,
              } as any;
            }
            continue;
          }
        }

        // No conflict, use the simple name
        componentNameToSignature.set(componentName, enumSignature);

        if (spec.components?.schemas) {
          spec.components.schemas[componentName] = {
            type: 'string',
            enum: originalValues,
          } as any;
        }
      } else if (componentName === '') {
        // This is a single occurrence - create entity-specific component
        const contextInfo = this.findContextForEnumSignature(
          enumSignature,
          spec,
          enumSignatureToOriginalValues
        );

        if (contextInfo) {
          const individualComponentName = this.generateEntityEnumComponentName(
            contextInfo.entityName,
            contextInfo.propertyName,
            originalValues || []
          );

          // Update the mapping to use the individual component name
          enumPatterns.set(enumSignature, individualComponentName);

          if (spec.components?.schemas) {
            spec.components.schemas[individualComponentName] = {
              type: 'string',
              enum: originalValues,
            } as any;
          }
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
   * Extract ALL entity enums into their own components
   */
  private extractEntityEnumsToComponents(
    spec: OpenAPISpec,
    enumPatterns: Map<string, string>,
    enumSignatureToOriginalValues: Map<string, any[]>
  ): void {
    if (!spec.components?.schemas) return;

    for (const [entityName, schema] of Object.entries(
      spec.components.schemas
    )) {
      const openAPISchema = schema as OpenAPISchema;
      if (!openAPISchema.properties) continue;

      for (const [propName, property] of Object.entries(
        openAPISchema.properties
      )) {
        // Check for direct enum properties
        if (property.enum && Array.isArray(property.enum)) {
          const enumSignature = JSON.stringify([...property.enum].sort());
          const contextName = `${entityName}_${propName}`;

          // Use the processEnumPattern for proper deduplication tracking
          this.processEnumPattern(
            enumSignature,
            property.enum,
            contextName,
            enumPatterns,
            enumSignatureToOriginalValues
          );
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
          const contextName = `${entityName}_${propName}`;

          // Use the processEnumPattern for proper deduplication tracking
          this.processEnumPattern(
            enumSignature,
            property.items.enum,
            contextName,
            enumPatterns,
            enumSignatureToOriginalValues
          );
        }
      }
    }
  }

  /**
   * Convert underscore-separated words to PascalCase
   */
  private toPascalCase(input: string): string {
    // If the input doesn't contain underscores and is already in a reasonable case,
    // preserve it to avoid converting PascalCase/camelCase to incorrect forms
    if (!input.includes('_')) {
      // If it's already PascalCase or camelCase, preserve it
      if (/^[A-Z][a-zA-Z0-9]*$/.test(input) || /^[a-z][a-zA-Z0-9]*$/.test(input)) {
        // Ensure first letter is uppercase for PascalCase
        return input.charAt(0).toUpperCase() + input.slice(1);
      }
    }
    
    // For underscore-separated strings, convert each part
    return input
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Generate a unique name for an entity enum component
   */
  private generateEntityEnumComponentName(
    entityName: string,
    propertyName: string,
    enumValues: any[]
  ): string {
    // Sanitize entity name to remove invalid characters
    const sanitizedEntityName = entityName.replace(/[^a-zA-Z0-9_]/g, '_');

    // Sanitize property name to remove invalid characters
    const sanitizedPropName = propertyName.replace(/[^a-zA-Z0-9_]/g, '_');

    // Handle special cases for shorter enum names when there are similar entities
    let processedEntityName = sanitizedEntityName;
    
    // For NotificationGroup, prefer the shorter base name to avoid very long enum names
    if (sanitizedEntityName === 'NotificationGroup') {
      // Use just "Group" to make it shorter while avoiding conflicts with "Notification"
      processedEntityName = 'Group';
    }

    // Create a descriptive name using the pattern EntityAttributeEnum
    const capitalizedEntity = this.toPascalCase(processedEntityName);
    const capitalizedProp = this.toPascalCase(sanitizedPropName);

    // Default naming pattern: EntityAttributeEnum
    return `${capitalizedEntity}${capitalizedProp}Enum`;
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
  }

  /**
   * Find context information for an enum signature to generate proper entity-specific names
   */
  private findContextForEnumSignature(
    enumSignature: string,
    spec: OpenAPISpec,
    enumSignatureToOriginalValues: Map<string, any[]>
  ): { entityName: string; propertyName: string } | null {
    const targetEnumValues = enumSignatureToOriginalValues.get(enumSignature);
    if (!targetEnumValues || !spec.components?.schemas) return null;

    // Search through all entity schemas to find the matching enum
    for (const [entityName, schema] of Object.entries(
      spec.components.schemas
    )) {
      const openAPISchema = schema as OpenAPISchema;
      if (!openAPISchema.properties) continue;

      for (const [propName, property] of Object.entries(
        openAPISchema.properties
      )) {
        // Check direct enum properties
        if (property.enum && Array.isArray(property.enum)) {
          const propEnumSignature = JSON.stringify([...property.enum].sort());
          if (propEnumSignature === enumSignature) {
            return { entityName, propertyName: propName };
          }
        }

        // Check array properties with enum items
        if (
          property.type === 'array' &&
          property.items &&
          typeof property.items === 'object' &&
          property.items.enum &&
          Array.isArray(property.items.enum)
        ) {
          const itemEnumSignature = JSON.stringify(
            [...property.items.enum].sort()
          );
          if (itemEnumSignature === enumSignature) {
            return { entityName, propertyName: propName };
          }
        }
      }
    }

    return null;
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
      // First occurrence - save original values and mark it
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
   * Generate a name for a shared enum component
   */
  private generateSharedEnumComponentName(
    contextName: string,
    enumValues: any[]
  ): string {
    // Sanitize context name to remove invalid characters
    const sanitizedContext = contextName.replace(/[^a-zA-Z0-9_]/g, '_');

    // Extract property name from context
    const parts = sanitizedContext.split('_');
    const propertyName = parts[parts.length - 1];

    // Create a descriptive name based on property name
    const capitalizedName = this.toPascalCase(propertyName);

    // Use the AttributeEnum pattern for shared enums
    return `${capitalizedName}Enum`;
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
  }
}

export { OpenAPIGenerator };
