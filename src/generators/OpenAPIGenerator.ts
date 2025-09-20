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

/**
 * Interface for tracking enum information during collection phase
 */
interface EnumInfo {
  values: any[];
  contexts: string[];
  propertyName: string;
  entityNames: string[];
}

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
    // Step 1: Collect all enum information
    const enumInfo = new Map<string, {
      values: any[];
      candidateNames: string[];
      contexts: string[];
    }>();

    // Extract from entities
    if (spec.components?.schemas) {
      this.collectEntityEnums(spec, enumInfo);
    }

    // Collect from method parameters and request bodies
    if (spec.paths) {
      this.collectMethodEnums(spec, enumInfo);
    }

    // Step 2: Generate final names using deduplication logic
    const finalNames = this.generateOptimalEnumNamesFromInfo(enumInfo);

    // Step 3: Create shared components
    for (const [signature, info] of enumInfo) {
      const componentName = finalNames.get(signature);
      if (componentName && info.contexts.length > 0) {
        if (spec.components?.schemas) {
          spec.components.schemas[componentName] = {
            type: 'string',
            enum: info.values,
          } as any;
        }
      }
    }

    // Step 4: Replace inline enums with references
    this.replaceAllEnumsWithReferences(spec, finalNames);
  }

  /**
   * Collect enum information from entities
   */
  private collectEntityEnums(
    spec: OpenAPISpec, 
    enumInfo: Map<string, { values: any[]; candidateNames: string[]; contexts: string[] }>
  ): void {
    if (!spec.components?.schemas) return;

    for (const [entityName, schema] of Object.entries(spec.components.schemas)) {
      const openAPISchema = schema as OpenAPISchema;
      if (!openAPISchema.properties) continue;

      for (const [propName, property] of Object.entries(openAPISchema.properties)) {
        // Handle direct enum properties
        if (property.enum && Array.isArray(property.enum)) {
          this.addEnumToInfo(enumInfo, property.enum, entityName, propName, `${entityName}.${propName}`);
        }

        // Handle array properties with enum items
        if (
          property.type === 'array' &&
          property.items &&
          typeof property.items === 'object' &&
          property.items.enum &&
          Array.isArray(property.items.enum)
        ) {
          this.addEnumToInfo(enumInfo, property.items.enum, entityName, propName, `${entityName}.${propName}[]`);
        }
      }
    }
  }

  /**
   * Collect enum information from method parameters
   */
  private collectMethodEnums(
    spec: OpenAPISpec,
    enumInfo: Map<string, { values: any[]; candidateNames: string[]; contexts: string[] }>
  ): void {
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (typeof operation === 'object' && operation !== null) {
          // Collect from parameters
          if (operation.parameters) {
            for (const param of operation.parameters) {
              if (param.schema) {
                this.collectEnumFromProperty(param.schema, enumInfo, 'Method', param.name, `${method}:${path}:${param.name}`);
              }
            }
          }

          // Collect from request body
          if (operation.requestBody?.content?.['application/json']?.schema) {
            const schema = operation.requestBody.content['application/json'].schema;
            this.collectEnumFromSchema(schema as OpenAPISchema, enumInfo, 'Method', `${method}:${path}:body`);
          }
        }
      }
    }
  }

  /**
   * Add enum information to the collection
   */
  private addEnumToInfo(
    enumInfo: Map<string, { values: any[]; candidateNames: string[]; contexts: string[] }>,
    enumValues: any[],
    entityName: string,
    propertyName: string,
    context: string
  ): void {
    const signature = JSON.stringify([...enumValues].sort());
    
    if (!enumInfo.has(signature)) {
      enumInfo.set(signature, {
        values: enumValues,
        candidateNames: [],
        contexts: []
      });
    }
    
    const info = enumInfo.get(signature)!;
    
    // Generate candidate names: AttributeEnum and EntityAttributeEnum
    const sanitizedProp = propertyName.replace(/[^a-zA-Z0-9_]/g, '_');
    const capitalizedProp = this.toPascalCase(sanitizedProp);
    
    const sanitizedEntity = entityName.replace(/[^a-zA-Z0-9_]/g, '_');
    const capitalizedEntity = this.toPascalCase(sanitizedEntity);
    
    // Add both AttributeEnum and EntityAttributeEnum as candidates
    const attributeEnum = `${capitalizedProp}Enum`;
    const entityAttributeEnum = `${capitalizedEntity}${capitalizedProp}Enum`;
    
    if (!info.candidateNames.includes(attributeEnum)) {
      info.candidateNames.push(attributeEnum);
    }
    if (!info.candidateNames.includes(entityAttributeEnum)) {
      info.candidateNames.push(entityAttributeEnum);
    }
    
    info.contexts.push(context);
  }

  /**
   * Generate optimal names considering deduplication
   */
  private generateOptimalEnumNamesFromInfo(
    enumInfo: Map<string, { values: any[]; candidateNames: string[]; contexts: string[] }>
  ): Map<string, string> {
    const finalNames = new Map<string, string>();
    
    // For each enum signature, choose the shortest candidate name
    for (const [signature, info] of enumInfo) {
      if (info.candidateNames.length === 0) continue;
      
      // Sort candidate names by length, then alphabetically
      const sortedCandidates = info.candidateNames.sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return a.localeCompare(b);
      });
      
      finalNames.set(signature, sortedCandidates[0]);
    }
    
    return finalNames;
  }

  /**
   * Replace all inline enums with references
   */
  private replaceAllEnumsWithReferences(spec: OpenAPISpec, finalNames: Map<string, string>): void {
    // Replace in entity schemas
    if (spec.components?.schemas) {
      for (const schema of Object.values(spec.components.schemas)) {
        this.replaceEnumsWithReferences(schema as OpenAPISchema, finalNames);
      }
    }

    // Replace in method parameters and request bodies
    if (spec.paths) {
      for (const pathItem of Object.values(spec.paths)) {
        for (const operation of Object.values(pathItem)) {
          if (typeof operation === 'object' && operation !== null) {
            // Replace in parameters
            if (operation.parameters) {
              for (const param of operation.parameters) {
                if (param.schema) {
                  this.replaceEnumsInProperty(param.schema, finalNames);
                }
              }
            }

            // Replace in request body
            if (operation.requestBody?.content?.['application/json']?.schema) {
              const schema = operation.requestBody.content['application/json'].schema;
              this.replaceEnumsWithReferences(schema as OpenAPISchema, finalNames);
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

    // For now, always use EntityAttributeEnum pattern - deduplication will be handled later
    const sanitizedEntityName = entityName.replace(/[^a-zA-Z0-9_]/g, '_');
    const capitalizedEntity = this.toPascalCase(sanitizedEntityName);
    
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
   * Generate optimal enum names considering deduplication of identical values
   */
  private generateOptimalEnumNames(enumPatterns: Map<string, string[]>): Map<string, string> {
    const finalNames = new Map<string, string>();
    
    // Group enum signatures by their values
    const valueGroups = new Map<string, { signature: string; names: string[] }>();
    
    for (const [signature, candidateNames] of enumPatterns) {
      if (!valueGroups.has(signature)) {
        valueGroups.set(signature, { signature, names: candidateNames });
      }
    }
    
    // For each group of identical values, choose the shortest name
    for (const [signature, group] of valueGroups) {
      if (group.names.length === 0) continue;
      
      // Sort names by length, then alphabetically to get the shortest/simplest name
      const sortedNames = group.names.sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return a.localeCompare(b);
      });
      
      const chosenName = sortedNames[0];
      finalNames.set(signature, chosenName);
    }
    
    return finalNames;
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

  /**
   * Collect enum from a property
   */
  private collectEnumFromProperty(
    property: OpenAPIProperty,
    enumInfo: Map<string, { values: any[]; candidateNames: string[]; contexts: string[] }>,
    entityName: string,
    propertyName: string,
    context: string
  ): void {
    // Handle direct enum properties
    if (property.enum && Array.isArray(property.enum)) {
      this.addEnumToInfo(enumInfo, property.enum, entityName, propertyName, context);
    }

    // Handle array properties with enum items
    if (
      property.type === 'array' &&
      property.items &&
      typeof property.items === 'object' &&
      property.items.enum &&
      Array.isArray(property.items.enum)
    ) {
      this.addEnumToInfo(enumInfo, property.items.enum, entityName, propertyName, context + '[]');
    }
  }

  /**
   * Collect enum from a schema
   */
  private collectEnumFromSchema(
    schema: OpenAPISchema,
    enumInfo: Map<string, { values: any[]; candidateNames: string[]; contexts: string[] }>,
    entityName: string,
    context: string
  ): void {
    if (!schema.properties) return;

    for (const [propName, property] of Object.entries(schema.properties)) {
      this.collectEnumFromProperty(property, enumInfo, entityName, propName, `${context}.${propName}`);
    }
  }
}

export { OpenAPIGenerator };
