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

    // CRUCIAL STEP: Resolve name clashes first, then consolidate identical enum values
    this.resolveEnumNameClashes(spec);
    this.consolidateIdenticalEnumValues(spec, enumSignatureToOriginalValues);
  }

  /**
   * Resolve enum name clashes by using EntityAttributeEnum pattern
   */
  private resolveEnumNameClashes(spec: OpenAPISpec): void {
    if (!spec.components?.schemas) return;

    // Group enum components by name to find clashes
    const nameGroups = new Map<string, {
      componentName: string;
      enumValues: any[];
      entityName?: string;
      propertyName?: string;
    }[]>();
    
    for (const [componentName, schema] of Object.entries(spec.components.schemas)) {
      const enumSchema = schema as any;
      if (enumSchema.type === 'string' && Array.isArray(enumSchema.enum)) {
        // Extract property name and entity context
        const propertyName = this.extractPropertyNameFromComponentName(componentName);
        const entityName = this.extractEntityNameFromComponentName(componentName);
        
        if (!nameGroups.has(componentName)) {
          nameGroups.set(componentName, []);
        }
        
        nameGroups.get(componentName)!.push({
          componentName,
          enumValues: enumSchema.enum,
          entityName,
          propertyName
        });
      }
    }

    // Find groups that have name clashes (same name but different enum values)
    const nameReplacements = new Map<string, string>();
    
    for (const [groupName, components] of nameGroups) {
      if (components.length <= 1) continue;
      
      // Check if components have different enum values (indicating a clash)
      const distinctEnumSignatures = new Set<string>();
      for (const comp of components) {
        const signature = JSON.stringify([...comp.enumValues].sort());
        distinctEnumSignatures.add(signature);
      }
      
      // If there are multiple distinct enum value sets, it's a clash
      if (distinctEnumSignatures.size > 1) {
        // Replace each component with EntityAttributeEnum naming
        for (const comp of components) {
          if (comp.entityName && comp.propertyName) {
            const sanitizedEntity = comp.entityName.replace(/[^a-zA-Z0-9_]/g, '_');
            const capitalizedEntity = this.toPascalCase(sanitizedEntity);
            const capitalizedProp = this.toPascalCase(comp.propertyName);
            
            const newName = `${capitalizedEntity}${capitalizedProp}Enum`;
            if (newName !== comp.componentName) {
              nameReplacements.set(comp.componentName, newName);
              
              // Create the new component
              spec.components.schemas[newName] = {
                type: 'string',
                enum: comp.enumValues
              } as any;
              
              // Delete the old component
              delete spec.components.schemas[comp.componentName];
            }
          }
        }
      }
    }

    // Replace all references to use the new names
    this.replaceComponentReferences(spec, nameReplacements);
  }

  /**
   * Extract entity name from a component name (for clash resolution)
   */
  private extractEntityNameFromComponentName(componentName: string): string | undefined {
    // This is tricky since we currently generate AttributeEnum names
    // We need to track the entity context during creation
    // For now, return undefined - we'll need to modify the creation process to track this
    return undefined;
  }

  /**
   * Consolidate identical enum values to use the shortest names
   */
  private consolidateIdenticalEnumValues(
    spec: OpenAPISpec,
    enumSignatureToOriginalValues: Map<string, any[]>
  ): void {
    if (!spec.components?.schemas) return;

    // Group existing enum components by their values (enum signature)
    const enumValueGroups = new Map<string, { 
      componentNames: string[];
      values: any[];
      propertyName?: string;
    }>();
    
    for (const [componentName, schema] of Object.entries(spec.components.schemas)) {
      // Check if this is an enum component
      const enumSchema = schema as any;
      if (enumSchema.type === 'string' && Array.isArray(enumSchema.enum)) {
        const enumSignature = JSON.stringify([...enumSchema.enum].sort());
        
        if (!enumValueGroups.has(enumSignature)) {
          // Try to extract property name from component names
          const propertyName = this.extractPropertyNameFromComponentName(componentName);
          enumValueGroups.set(enumSignature, {
            componentNames: [],
            values: enumSchema.enum,
            propertyName
          });
        }
        enumValueGroups.get(enumSignature)!.componentNames.push(componentName);
      }
    }

    // For each group of identical enum values, choose the best name and replace references
    const nameReplacements = new Map<string, string>();
    
    for (const [enumSignature, group] of enumValueGroups) {
      if (group.componentNames.length <= 1) continue; // No duplicates
      
      // Generate the optimal name for this enum
      const optimalName = this.generateOptimalEnumName(group.componentNames, group.propertyName);
      
      // If the optimal name is different from existing names, create it
      let chosenName = optimalName;
      if (!group.componentNames.includes(optimalName)) {
        // Create the new optimal component
        spec.components.schemas[optimalName] = {
          type: 'string',
          enum: group.values
        } as any;
        chosenName = optimalName;
        
        // Map all existing names to the optimal name
        for (const name of group.componentNames) {
          nameReplacements.set(name, chosenName);
          delete spec.components.schemas[name];
        }
      } else {
        // One of the existing names is already optimal, use it
        for (const name of group.componentNames) {
          if (name !== chosenName) {
            nameReplacements.set(name, chosenName);
            delete spec.components.schemas[name];
          }
        }
      }
    }

    // Replace all references in schemas and paths
    this.replaceComponentReferences(spec, nameReplacements);
  }

  /**
   * Extract property name from a component name
   */
  private extractPropertyNameFromComponentName(componentName: string): string {
    // Handle EntityAttributeEnum pattern (e.g., FilterContextEnum -> context)
    const entityAttrMatch = componentName.match(/^[A-Z][a-zA-Z0-9]*([A-Z][a-zA-Z0-9]*)Enum$/);
    if (entityAttrMatch) {
      return entityAttrMatch[1].toLowerCase();
    }
    
    // Handle AttributeEnum pattern (e.g., ContextEnum -> context)
    const attrMatch = componentName.match(/^([A-Z][a-zA-Z0-9]*)Enum$/);
    if (attrMatch) {
      return attrMatch[1].toLowerCase();
    }
    
    return componentName.toLowerCase();
  }

  /**
   * Generate the optimal name for an enum based on existing component names
   */
  private generateOptimalEnumName(componentNames: string[], propertyName?: string): string {
    if (!propertyName) {
      // Extract from the first component name
      propertyName = this.extractPropertyNameFromComponentName(componentNames[0]);
    }
    
    // Always prefer AttributeEnum pattern as the optimal name
    const capitalizedProp = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
    return `${capitalizedProp}Enum`;
  }

  /**
   * Replace component references with new names
   */
  private replaceComponentReferences(
    spec: OpenAPISpec,
    nameReplacements: Map<string, string>
  ): void {
    if (nameReplacements.size === 0) return;

    // Helper function to replace $ref values
    const replaceRef = (obj: any) => {
      if (typeof obj === 'object' && obj !== null) {
        if (obj.$ref && typeof obj.$ref === 'string') {
          const refParts = obj.$ref.split('/');
          const componentName = refParts[refParts.length - 1];
          if (nameReplacements.has(componentName)) {
            const newName = nameReplacements.get(componentName)!;
            refParts[refParts.length - 1] = newName;
            obj.$ref = refParts.join('/');
          }
        }
        
        // Recursively process nested objects
        for (const key in obj) {
          replaceRef(obj[key]);
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(item => replaceRef(item));
      }
    };

    // Replace references in all schemas
    if (spec.components?.schemas) {
      for (const schema of Object.values(spec.components.schemas)) {
        replaceRef(schema);
      }
    }

    // Replace references in all paths
    if (spec.paths) {
      replaceRef(spec.paths);
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

    // First pass: collect all enum information to detect clashes
    const propertyEnumInfo = new Map<string, {
      enumSignature: string;
      entityNames: string[];
      propertyName: string;
      enumValues: any[];
    }[]>();

    for (const [entityName, schema] of Object.entries(
      spec.components.schemas
    )) {
      const openAPISchema = schema as OpenAPISchema;
      if (!openAPISchema.properties) continue;

      for (const [propName, property] of Object.entries(
        openAPISchema.properties
      )) {
        // Collect direct enum properties
        if (property.enum && Array.isArray(property.enum)) {
          this.collectEnumInfo(propertyEnumInfo, propName, entityName, property.enum);
        }

        // Collect array properties with enum items
        if (
          property.type === 'array' &&
          property.items &&
          typeof property.items === 'object' &&
          property.items.enum &&
          Array.isArray(property.items.enum)
        ) {
          this.collectEnumInfo(propertyEnumInfo, propName, entityName, property.items.enum);
        }
      }
    }

    // Second pass: create components with appropriate names
    for (const [entityName, schema] of Object.entries(
      spec.components.schemas
    )) {
      const openAPISchema = schema as OpenAPISchema;
      if (!openAPISchema.properties) continue;

      for (const [propName, property] of Object.entries(
        openAPISchema.properties
      )) {
        // Handle direct enum properties
        if (property.enum && Array.isArray(property.enum)) {
          this.createEnumComponent(
            spec,
            enumPatterns,
            enumSignatureToOriginalValues,
            propertyEnumInfo,
            entityName,
            propName,
            property.enum
          );
        }

        // Handle array properties with enum items
        if (
          property.type === 'array' &&
          property.items &&
          typeof property.items === 'object' &&
          property.items.enum &&
          Array.isArray(property.items.enum)
        ) {
          this.createEnumComponent(
            spec,
            enumPatterns,
            enumSignatureToOriginalValues,
            propertyEnumInfo,
            entityName,
            propName,
            property.items.enum
          );
        }
      }
    }
  }

  /**
   * Collect enum information for clash detection
   */
  private collectEnumInfo(
    propertyEnumInfo: Map<string, {
      enumSignature: string;
      entityNames: string[];
      propertyName: string;
      enumValues: any[];
    }[]>,
    propName: string,
    entityName: string,
    enumValues: any[]
  ): void {
    const enumSignature = JSON.stringify([...enumValues].sort());
    
    if (!propertyEnumInfo.has(propName)) {
      propertyEnumInfo.set(propName, []);
    }
    
    // Check if this exact enum signature already exists for this property
    const existing = propertyEnumInfo.get(propName)!.find(info => info.enumSignature === enumSignature);
    if (existing) {
      existing.entityNames.push(entityName);
    } else {
      propertyEnumInfo.get(propName)!.push({
        enumSignature,
        entityNames: [entityName],
        propertyName: propName,
        enumValues
      });
    }
  }

  /**
   * Create enum component with appropriate name (AttributeEnum vs EntityAttributeEnum)
   */
  private createEnumComponent(
    spec: OpenAPISpec,
    enumPatterns: Map<string, string>,
    enumSignatureToOriginalValues: Map<string, any[]>,
    propertyEnumInfo: Map<string, any[]>,
    entityName: string,
    propName: string,
    enumValues: any[]
  ): void {
    const enumSignature = JSON.stringify([...enumValues].sort());
    
    // Determine if this property has clashes (multiple different enum value sets)
    const propertyEnums = propertyEnumInfo.get(propName) || [];
    const hasClashes = propertyEnums.length > 1;
    
    let componentName: string;
    if (hasClashes) {
      // Use EntityAttributeEnum pattern for clashes
      const sanitizedEntityName = entityName.replace(/[^a-zA-Z0-9_]/g, '_');
      const capitalizedEntity = this.toPascalCase(sanitizedEntityName);
      const capitalizedProp = this.toPascalCase(propName.replace(/[^a-zA-Z0-9_]/g, '_'));
      componentName = `${capitalizedEntity}${capitalizedProp}Enum`;
    } else {
      // Use AttributeEnum pattern for no clashes
      componentName = this.generateEntityEnumComponentName(entityName, propName, enumValues);
    }

    // Store the mapping and original values
    enumPatterns.set(enumSignature, componentName);
    enumSignatureToOriginalValues.set(enumSignature, enumValues);

    // Create the enum component
    if (spec.components?.schemas) {
      spec.components.schemas[componentName] = {
        type: 'string',
        enum: enumValues,
      } as any;
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

    // Default to AttributeEnum pattern - clashes will be resolved later
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

    // Default naming pattern: AttributeEnum
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
