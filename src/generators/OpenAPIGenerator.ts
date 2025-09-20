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

    // After extraction, consolidate enums with identical values
    // this.consolidateIdenticalEnums(spec);

    // Collect enums from entity schemas (for remaining deduplication)
    // Temporarily disabled to demonstrate entity-specific naming
    /*
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
    */

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
   * Consolidate enums with identical values and find common names
   */
  private consolidateIdenticalEnums(spec: OpenAPISpec): void {
    if (!spec.components?.schemas) return;

    // Group enums by their values (signature)
    const enumValueToComponents = new Map<string, string[]>();
    const enumComponents = new Map<string, any>();

    // Find all enum components and group by values
    for (const [componentName, schema] of Object.entries(spec.components.schemas)) {
      const component = schema as any;
      if (component.type === 'string' && Array.isArray(component.enum)) {
        const signature = JSON.stringify([...component.enum].sort());
        if (!enumValueToComponents.has(signature)) {
          enumValueToComponents.set(signature, []);
        }
        enumValueToComponents.get(signature)!.push(componentName);
        enumComponents.set(componentName, component);
      }
    }

    // For each set of enums with identical values, consolidate to a common name
    for (const [signature, componentNames] of enumValueToComponents) {
      if (componentNames.length > 1) {
        const commonName = this.findCommonEnumName(componentNames);
        const enumValues = enumComponents.get(componentNames[0]).enum;

        // Keep only the common name component
        spec.components.schemas[commonName] = {
          type: 'string',
          enum: enumValues,
        } as any;

        // Remove the other components and update all references
        for (const oldName of componentNames) {
          if (oldName !== commonName) {
            delete spec.components.schemas[oldName];
            this.updateEnumReferences(spec, oldName, commonName);
          }
        }
      }
    }
  }

  /**
   * Find a common name for enums with identical values
   */
  private findCommonEnumName(componentNames: string[]): string {
    // Sort by length to prefer shorter names first
    const sorted = componentNames.sort((a, b) => a.length - b.length);
    
    // Try to find common patterns
    for (const name of sorted) {
      // Check if this name could be a generalization of others
      const baseName = name.replace(/Enum$/, '');
      
      // If name contains Type and others are variations, prefer the Type version
      if (name.includes('Type') && name.endsWith('Enum')) {
        const otherTypesMatch = sorted.some(other => 
          other !== name && 
          other.includes('Type') && 
          other.endsWith('Enum') &&
          this.namesAreSimilar(name, other)
        );
        if (otherTypesMatch) {
          // Return the shortest type-based name
          const typeNames = sorted.filter(n => n.includes('Type'));
          return typeNames.sort((a, b) => a.length - b.length)[0];
        }
      }
    }

    // Default: return the shortest name
    return sorted[0];
  }

  /**
   * Check if two enum names are similar enough to be consolidated
   */
  private namesAreSimilar(name1: string, name2: string): boolean {
    // Remove 'Enum' suffix for comparison
    const base1 = name1.replace(/Enum$/, '');
    const base2 = name2.replace(/Enum$/, '');
    
    // Check if one is contained in the other (e.g., NotificationType vs NotificationGroupType)
    return base1.includes(base2) || base2.includes(base1) || 
           this.shareCommonWords(base1, base2);
  }

  /**
   * Check if two names share significant common words
   */
  private shareCommonWords(name1: string, name2: string): boolean {
    // Split camelCase/PascalCase into words
    const words1 = name1.split(/(?=[A-Z])/).filter(w => w.length > 1);
    const words2 = name2.split(/(?=[A-Z])/).filter(w => w.length > 1);
    
    // Check if they share at least 2 significant words
    const commonWords = words1.filter(w => words2.includes(w));
    return commonWords.length >= 2;
  }

  /**
   * Update all references from old enum name to new enum name
   */
  private updateEnumReferences(spec: OpenAPISpec, oldName: string, newName: string): void {
    const oldRef = `#/components/schemas/${oldName}`;
    const newRef = `#/components/schemas/${newName}`;

    // Update references in entity schemas
    if (spec.components?.schemas) {
      for (const [entityName, schema] of Object.entries(spec.components.schemas)) {
        this.updateReferencesInSchema(schema as OpenAPISchema, oldRef, newRef);
      }
    }

    // Update references in paths
    if (spec.paths) {
      for (const [path, pathItem] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (typeof operation === 'object' && operation !== null) {
            // Update parameters
            if (operation.parameters) {
              for (const param of operation.parameters) {
                if (param.schema) {
                  this.updateReferencesInProperty(param.schema, oldRef, newRef);
                }
              }
            }

            // Update request body
            if (operation.requestBody?.content?.['application/json']?.schema) {
              const schema = operation.requestBody.content['application/json'].schema;
              this.updateReferencesInSchema(schema, oldRef, newRef);
            }
          }
        }
      }
    }
  }

  /**
   * Update references in a schema recursively
   */
  private updateReferencesInSchema(schema: any, oldRef: string, newRef: string): void {
    if (schema.$ref === oldRef) {
      schema.$ref = newRef;
    }

    if (schema.properties) {
      for (const property of Object.values(schema.properties)) {
        this.updateReferencesInProperty(property, oldRef, newRef);
      }
    }

    if (schema.items) {
      this.updateReferencesInProperty(schema.items, oldRef, newRef);
    }
  }

  /**
   * Update references in a property
   */
  private updateReferencesInProperty(property: any, oldRef: string, newRef: string): void {
    if (property.$ref === oldRef) {
      property.$ref = newRef;
    }

    if (property.items?.$ref === oldRef) {
      property.items.$ref = newRef;
    }

    if (property.properties) {
      for (const nestedProperty of Object.values(property.properties)) {
        this.updateReferencesInProperty(nestedProperty, oldRef, newRef);
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
          const componentName = this.generateEntityEnumComponentName(
            entityName,
            propName,
            property.enum
          );

          // Create the enum component immediately
          spec.components.schemas[componentName] = {
            type: 'string',
            enum: property.enum,
          } as any;

          // Replace the property with a reference
          delete property.enum;
          (property as any).$ref = `#/components/schemas/${componentName}`;
        }

        // Check for array properties with enum items
        if (
          property.type === 'array' &&
          property.items &&
          typeof property.items === 'object' &&
          property.items.enum &&
          Array.isArray(property.items.enum)
        ) {
          const componentName = this.generateEntityEnumComponentName(
            entityName,
            propName,
            property.items.enum
          );

          // Create the enum component immediately
          spec.components.schemas[componentName] = {
            type: 'string',
            enum: property.items.enum,
          } as any;

          // Replace the items with a reference
          property.items = {
            $ref: `#/components/schemas/${componentName}`,
          };
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

    // Convert entity name to PascalCase only if it contains underscores (snake_case)
    const capitalizedEntity = entityName.includes('_') 
      ? this.toPascalCase(entityName)
      : entityName; // Already in PascalCase

    // Convert property name to PascalCase
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

    // Convert property name to PascalCase
    const capitalizedName = this.toPascalCase(propertyName);

    // For shared enums, create a generic name based on property
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
