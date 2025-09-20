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

    // First pass: collect all enums with their initial names
    const enumInfo: Map<string, {
      componentName: string;
      enumValues: any[];
      entities: Array<{ entityName: string; propName: string; isArray: boolean }>;
    }> = new Map();

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
          const componentName = this.generateEntityEnumComponentName(
            entityName,
            propName,
            property.enum
          );

          if (!enumInfo.has(enumSignature)) {
            enumInfo.set(enumSignature, {
              componentName,
              enumValues: property.enum,
              entities: []
            });
          }
          enumInfo.get(enumSignature)!.entities.push({
            entityName,
            propName,
            isArray: false
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
          const componentName = this.generateEntityEnumComponentName(
            entityName,
            propName,
            property.items.enum
          );

          if (!enumInfo.has(enumSignature)) {
            enumInfo.set(enumSignature, {
              componentName,
              enumValues: property.items.enum,
              entities: []
            });
          }
          enumInfo.get(enumSignature)!.entities.push({
            entityName,
            propName,
            isArray: true
          });
        }
      }
    }

    // Second pass: consolidate enums with identical values
    const consolidatedEnums = this.consolidateEnums(enumInfo);

    // Create the enum components and update mappings
    for (const [enumSignature, info] of consolidatedEnums) {
      // Store the mapping and original values
      enumPatterns.set(enumSignature, info.componentName);
      enumSignatureToOriginalValues.set(enumSignature, info.enumValues);

      // Create the enum component
      spec.components.schemas[info.componentName] = {
        type: 'string',
        enum: info.enumValues,
      } as any;
    }
  }

  /**
   * Consolidate enums with identical values to use common names
   */
  private consolidateEnums(enumInfo: Map<string, {
    componentName: string;
    enumValues: any[];
    entities: Array<{ entityName: string; propName: string; isArray: boolean }>;
  }>): Map<string, {
    componentName: string;
    enumValues: any[];
    entities: Array<{ entityName: string; propName: string; isArray: boolean }>;
  }> {
    const result = new Map(enumInfo);

    // For enums that have multiple entities with the same values,
    // find a common name
    for (const [enumSignature, info] of enumInfo) {
      if (info.entities.length > 1) {
        const commonName = this.findCommonEnumName(info.entities, info.componentName);
        result.set(enumSignature, {
          ...info,
          componentName: commonName
        });
      }
    }

    return result;
  }

  /**
   * Find a common name for enums that appear in multiple entities
   */
  private findCommonEnumName(entities: Array<{ entityName: string; propName: string; isArray: boolean }>, fallbackName: string): string {
    // Group entities by property name
    const entitiesByProp = new Map<string, string[]>();
    for (const entity of entities) {
      if (!entitiesByProp.has(entity.propName)) {
        entitiesByProp.set(entity.propName, []);
      }
      entitiesByProp.get(entity.propName)!.push(entity.entityName);
    }

    // If there's only one property name, use it to find a common base
    if (entitiesByProp.size === 1) {
      const [propName, entityNames] = Array.from(entitiesByProp.entries())[0];
      
      // Special logic for finding common names
      if (propName === 'type') {
        // For type enums, try to find the shortest/most common entity name
        const commonBase = this.findCommonEntityBase(entityNames);
        if (commonBase) {
          return `${commonBase}TypeEnum`;
        } else {
          // No common base found, use generic TypeEnum
          return 'TypeEnum';
        }
      }
      
      if (propName === 'context') {
        // Context enums should be FilterContext (legacy naming)
        return 'FilterContext';
      }
      
      if (propName === 'visibility') {
        return 'VisibilityEnum';
      }
      
      // For other properties, try to find a common base
      const commonBase = this.findCommonEntityBase(entityNames);
      if (commonBase) {
        const capitalizedProp = this.toPascalCase(propName);
        return `${commonBase}${capitalizedProp}Enum`;
      }
    }

    return fallbackName;
  }

  /**
   * Find a common base name from a list of entity names
   */
  private findCommonEntityBase(entityNames: string[]): string | null {
    if (entityNames.length === 0) return null;
    if (entityNames.length === 1) return this.toPascalCase(entityNames[0]);

    // Special cases for known patterns
    const hasNotification = entityNames.some(name => name.includes('Notification'));
    const hasNotificationGroup = entityNames.some(name => name.includes('NotificationGroup'));
    
    if (hasNotification && hasNotificationGroup) {
      return 'Notification'; // NotificationTypeEnum vs NotificationGroupTypeEnum -> NotificationTypeEnum
    }

    const hasPreviewCard = entityNames.some(name => name.includes('PreviewCard'));
    const hasTrendsLink = entityNames.some(name => name.includes('Trends_Link'));
    
    if (hasPreviewCard && hasTrendsLink) {
      return 'Preview'; // PreviewCardTypeEnum vs TrendsLinkTypeEnum -> PreviewTypeEnum
    }

    // Find the shortest name as the common base
    const shortestName = entityNames.reduce((shortest, current) => 
      current.length < shortest.length ? current : shortest
    );
    
    // For generic entity names that don't have meaningful common patterns,
    // just return null to let the caller use a generic name
    if (entityNames.every(name => !name.includes('Notification') && 
                                    !name.includes('Preview') && 
                                    !name.includes('Filter'))) {
      // Check if this is a 'type' property consolidation for generic entities
      return null; // This will make the caller use a generic name like TypeEnum
    }
    
    return this.toPascalCase(shortestName);
  }

  /**
   * Convert underscore-separated words to PascalCase
   * Handles cases where the input is already in PascalCase
   */
  private toPascalCase(input: string): string {
    // If input contains underscores, split on them
    if (input.includes('_')) {
      return input
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
    }
    
    // If already in PascalCase (or camelCase), preserve it and ensure first letter is uppercase
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
    
    // Sanitize entity name to remove invalid characters
    const sanitizedEntityName = entityName.replace(/[^a-zA-Z0-9_]/g, '_');

    // Create EntityAttributeEnum format
    const capitalizedEntity = this.toPascalCase(sanitizedEntityName);
    const capitalizedProp = this.toPascalCase(sanitizedPropName);

    // Special cases to maintain backward compatibility
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
        return `${capitalizedEntity}${capitalizedProp}Enum`;
      }
    }

    // Special cases for backward compatibility with existing tests
    if (
      sanitizedPropName === 'visibility' ||
      sanitizedPropName === 'posting_default_visibility'
    ) {
      return 'VisibilityEnum';
    }

    // For simple property names that don't benefit from entity prefix, use just PropertyEnum
    if (
      sanitizedPropName === 'status' ||
      sanitizedPropName === 'category' ||
      sanitizedPropName === 'state' ||
      sanitizedPropName === 'policy'
    ) {
      return `${capitalizedProp}Enum`;
    }

    // Default format: EntityAttributeEnum
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
