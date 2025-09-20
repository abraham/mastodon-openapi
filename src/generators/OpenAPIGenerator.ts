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

        if (spec.components?.schemas) {
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

          // Generate component name for this entity enum (with hash for uniqueness)
          const sanitizedPropName = propName.replace(/[^a-zA-Z0-9_]/g, '_');
          const contextName = `${entityName}_${sanitizedPropName}`;
          const componentName = this.generateEntityEnumComponentName(
            entityName,
            propName,
            property.enum
          );

          // Store the mapping and original values
          enumPatterns.set(enumSignature, componentName);
          enumSignatureToOriginalValues.set(enumSignature, property.enum);

          // Create the enum component immediately
          spec.components.schemas[componentName] = {
            type: 'string',
            enum: property.enum,
          } as any;
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

          // Generate component name for this entity enum
          const sanitizedPropName = propName.replace(/[^a-zA-Z0-9_]/g, '_');
          const contextName = `${entityName}_${sanitizedPropName}`;
          const componentName = this.generateEntityEnumComponentName(
            entityName,
            propName,
            property.items.enum
          );

          // Store the mapping and original values
          enumPatterns.set(enumSignature, componentName);
          enumSignatureToOriginalValues.set(enumSignature, property.items.enum);

          // Create the enum component immediately
          spec.components.schemas[componentName] = {
            type: 'string',
            enum: property.items.enum,
          } as any;
        }
      }
    }
  }

  /**
   * Convert underscore-separated words to PascalCase
   */
  private toPascalCase(input: string): string {
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
    // Sanitize property name to remove invalid characters
    const sanitizedPropName = propertyName.replace(/[^a-zA-Z0-9_]/g, '_');

    // Create a descriptive name based on property name (convert to PascalCase)
    const capitalizedProp = this.toPascalCase(sanitizedPropName);

    // Create a short hash from enum values to ensure uniqueness
    const enumSignature = JSON.stringify([...enumValues].sort());
    const hash = this.createShortHash(enumSignature);

    // Special cases for well-known property names with unique hash
    if (sanitizedPropName === 'context') {
      // For context enums, check if they're the standard filter context values
      const standardFilterContext = [
        'home',
        'notifications',
        'public',
        'thread',
        'account',
      ].sort();
      const currentValues = [...enumValues].sort();

      if (
        JSON.stringify(currentValues) === JSON.stringify(standardFilterContext)
      ) {
        return 'FilterContext';
      } else {
        return `FilterContext${hash}`;
      }
    }

    // Special cases for 'type' property based on entity context
    if (sanitizedPropName === 'type') {
      // Notification type enum
      if (
        entityName.includes('Notification') ||
        entityName.includes('NotificationGroup')
      ) {
        return 'NotificationTypeEnum';
      }

      // Preview card type enum (includes Trends_Link which inherits from PreviewCard)
      if (
        entityName.includes('PreviewCard') ||
        entityName.includes('Trends_Link')
      ) {
        return 'PreviewTypeEnum';
      }

      // Fallback to generic type enum for other contexts
      return 'TypeEnum';
    }

    // Special cases for other properties
    if (
      sanitizedPropName === 'visibility' ||
      sanitizedPropName === 'posting_default_visibility'
    ) {
      return 'VisibilityEnum';
    }

    if (sanitizedPropName === 'category') {
      return 'CategoryEnum';
    }

    if (sanitizedPropName === 'state') {
      return 'StateEnum';
    }

    if (sanitizedPropName === 'policy') {
      return 'PolicyEnum';
    }

    // Special handling for media-related properties
    if (sanitizedPropName === 'reading_expand_media') {
      return 'MediaExpandEnum';
    }

    // For other enum types, create a descriptive name
    return `${capitalizedProp}Enum`;
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
    const capitalizedName =
      propertyName.charAt(0).toUpperCase() + propertyName.slice(1);

    // Special cases for well-known property names
    if (propertyName === 'context') {
      return 'FilterContext';
    }

    // Special cases for 'type' property based on entity context
    if (propertyName === 'type') {
      // Check the entity context to determine the appropriate enum name
      const entityContext = parts.slice(0, -1).join('_');

      // Notification type enum
      if (
        entityContext.includes('Notification') ||
        entityContext.includes('NotificationGroup')
      ) {
        return 'NotificationTypeEnum';
      }

      // Preview card type enum (includes Trends_Link which inherits from PreviewCard)
      if (
        entityContext.includes('PreviewCard') ||
        entityContext.includes('Trends_Link')
      ) {
        return 'PreviewTypeEnum';
      }

      // Fallback to generic type enum for other contexts
      return 'TypeEnum';
    }

    // For other enum types, create a generic name
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
