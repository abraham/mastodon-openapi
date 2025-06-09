import { EntityClass } from '../interfaces/EntityClass';
import { EntityAttribute } from '../interfaces/EntityAttribute';
import {
  OpenAPIProperty,
  OpenAPISchema,
  OpenAPISpec,
} from '../interfaces/OpenAPISchema';
import { TypeParser } from './TypeParser';
import { UtilityHelpers } from './UtilityHelpers';

/**
 * Converter for transforming entity classes to OpenAPI schemas
 */
class EntityConverter {
  private typeParser: TypeParser;
  private utilityHelpers: UtilityHelpers;

  constructor(typeParser: TypeParser, utilityHelpers: UtilityHelpers) {
    this.typeParser = typeParser;
    this.utilityHelpers = utilityHelpers;
  }

  /**
   * Convert entities to OpenAPI schemas and add them to the spec
   */
  public convertEntities(entities: EntityClass[], spec: OpenAPISpec): void {
    if (!spec.components?.schemas) {
      spec.components = { schemas: {} };
    }

    // First pass: collect all entities and their schemas
    const entitySchemas = new Map<string, OpenAPISchema>();

    for (const entity of entities) {
      const schema: OpenAPISchema = {
        type: 'object',
        description: entity.description,
        properties: {},
        required: [],
      };

      // Process attributes to build nested structure
      this.processAttributesRecursively(entity.attributes, schema);

      // Remove empty required array
      if (schema.required && schema.required.length === 0) {
        delete schema.required;
      }

      const sanitizedName = this.utilityHelpers.sanitizeSchemaName(entity.name);
      entitySchemas.set(sanitizedName, schema);
    }

    // Second pass: detect and deduplicate identical enums
    this.deduplicateEnums(entitySchemas, spec);

    // Add all schemas to the spec
    for (const [name, schema] of entitySchemas) {
      if (spec.components?.schemas) {
        spec.components.schemas[name] = schema;
      }
    }
  }

  /**
   * Detect and deduplicate identical enums across entities
   */
  private deduplicateEnums(
    entitySchemas: Map<string, OpenAPISchema>,
    spec: OpenAPISpec
  ): void {
    // Track enum patterns: key = enum signature, value = shared component name
    const enumPatterns = new Map<string, string>();

    // First pass: identify all enum patterns
    const enumSignatureToOriginalValues = new Map<string, any[]>();

    for (const [entityName, schema] of entitySchemas) {
      this.collectEnumPatterns(
        schema,
        entityName,
        enumPatterns,
        enumSignatureToOriginalValues
      );
    }

    // Create shared components for patterns that appear in multiple entities
    for (const [enumSignature, componentName] of enumPatterns) {
      if (componentName) {
        const originalValues = enumSignatureToOriginalValues.get(enumSignature);

        if (spec.components?.schemas) {
          spec.components.schemas[componentName] = {
            type: 'string',
            enum: originalValues || JSON.parse(enumSignature),
          } as any;
        }
      }
    }

    // Second pass: replace inline enums with references to shared components
    for (const [entityName, schema] of entitySchemas) {
      this.replaceEnumsWithReferences(schema, enumPatterns);
    }
  }

  /**
   * Collect all enum patterns from a schema
   */
  private collectEnumPatterns(
    schema: OpenAPISchema,
    entityName: string,
    enumPatterns: Map<string, string>,
    enumSignatureToOriginalValues: Map<string, any[]>
  ): void {
    if (!schema.properties) return;

    for (const [propName, property] of Object.entries(schema.properties)) {
      // Look for array properties with enum values
      if (
        property.type === 'array' &&
        property.enum &&
        Array.isArray(property.enum) &&
        propName === 'context' // Specifically target context enums for FilterContext
      ) {
        const enumSignature = JSON.stringify(property.enum.sort());

        if (!enumPatterns.has(enumSignature)) {
          // First occurrence - save original values and mark it
          enumPatterns.set(enumSignature, '');
          enumSignatureToOriginalValues.set(enumSignature, property.enum);
        } else if (enumPatterns.get(enumSignature) === '') {
          // Second occurrence - create shared component
          const componentName = this.generateSharedEnumComponentName(
            propName,
            property.enum
          );
          enumPatterns.set(enumSignature, componentName);
        }
      }
    }
  }

  /**
   * Replace inline enums with references to shared components
   */
  private replaceEnumsWithReferences(
    schema: OpenAPISchema,
    enumPatterns: Map<string, string>
  ): void {
    if (!schema.properties) return;

    for (const [propName, property] of Object.entries(schema.properties)) {
      if (
        property.type === 'array' &&
        property.enum &&
        Array.isArray(property.enum) &&
        propName === 'context'
      ) {
        const enumSignature = JSON.stringify(property.enum.sort());
        const componentName = enumPatterns.get(enumSignature);

        if (componentName) {
          // Replace with reference to shared component
          delete property.enum;
          property.items = {
            $ref: `#/components/schemas/${componentName}`,
          };
        }
      }
    }
  }

  /**
   * Generate a name for a shared enum component
   */
  private generateSharedEnumComponentName(
    propertyName: string,
    enumValues: any[]
  ): string {
    // For context enums, generate "FilterContext"
    if (propertyName === 'context') {
      return 'FilterContext';
    }

    // Fallback for other enum types
    const capitalizedName =
      propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
    return `${capitalizedName}Enum`;
  }

  /**
   * Convert entity attribute to OpenAPI property
   */
  public convertAttribute(attribute: EntityAttribute): OpenAPIProperty {
    const property: OpenAPIProperty = {
      description: attribute.description,
    };

    if (attribute.deprecated) {
      property.deprecated = true;
    }

    // Parse type information to determine OpenAPI type
    const type = this.typeParser.parseType(attribute.type);

    if (type.type) {
      property.type = type.type;
    }
    if (type.format) {
      property.format = type.format;
    }
    if (type.items) {
      property.items = type.items;
    }
    if (type.$ref) {
      property.$ref = type.$ref;
    }
    if (type.oneOf) {
      property.oneOf = type.oneOf;
    }

    // Special handling for _at properties that should be date-time format
    if (
      attribute.name.endsWith('_at') &&
      property.type === 'string' &&
      !property.format
    ) {
      property.format = 'date-time';
    }

    // Use enum values from attribute if available, otherwise from type parsing
    if (attribute.enumValues && attribute.enumValues.length > 0) {
      property.enum = attribute.enumValues;
    } else if (type.enum) {
      property.enum = type.enum;
    }

    return property;
  }

  /**
   * Process attributes recursively to build nested object structures
   */
  private processAttributesRecursively(
    attributes: EntityAttribute[],
    schema: OpenAPISchema
  ): void {
    // Group attributes by their structure
    const flatAttributes: EntityAttribute[] = [];
    const nestedGroups = new Map<string, EntityAttribute[]>();

    for (const attribute of attributes) {
      // Check if this is a nested attribute pattern
      const nestedMatch = this.parseNestedAttributeName(attribute.name);

      if (nestedMatch) {
        const { parentName, fullPath } = nestedMatch;

        if (!nestedGroups.has(parentName)) {
          nestedGroups.set(parentName, []);
        }
        nestedGroups.get(parentName)!.push(attribute);
      } else {
        flatAttributes.push(attribute);
      }
    }

    // Process flat attributes first
    for (const attribute of flatAttributes) {
      const property = this.convertAttribute(attribute);
      if (schema.properties) {
        schema.properties[attribute.name] = property;
      }

      // Add to required array if not optional
      if (!attribute.optional && schema.required) {
        schema.required.push(attribute.name);
      }
    }

    // Process nested groups
    for (const [parentName, groupAttributes] of nestedGroups.entries()) {
      this.processNestedGroup(parentName, groupAttributes, schema);
    }
  }

  /**
   * Parse nested attribute name to extract parent and path information
   */
  private parseNestedAttributeName(
    name: string
  ): { parentName: string; fullPath: string[] } | null {
    // Match patterns like "parent[child]" or "parent[child][grandchild]"
    const match = name.match(/^([^[]+)(\[.+\])$/);
    if (!match) {
      return null;
    }

    const parentName = match[1];
    const bracketPart = match[2];

    // Extract all bracket segments
    const segments = bracketPart.match(/\[([^\]]+)\]/g);
    if (!segments) {
      return null;
    }

    const fullPath = [parentName];
    for (const segment of segments) {
      // Remove brackets and add to path
      fullPath.push(segment.slice(1, -1));
    }

    return { parentName, fullPath };
  }

  /**
   * Process a group of nested attributes for a parent property
   */
  private processNestedGroup(
    parentName: string,
    attributes: EntityAttribute[],
    parentSchema: OpenAPISchema
  ): void {
    // Find or create the parent property
    if (!parentSchema.properties) {
      parentSchema.properties = {};
    }

    let parentProperty = parentSchema.properties[parentName];
    if (!parentProperty) {
      // Find the parent attribute definition
      const parentAttr = attributes.find((attr) => attr.name === parentName);
      if (parentAttr) {
        parentProperty = this.convertAttribute(parentAttr);
      } else {
        // Create a default object property for the parent
        parentProperty = {
          type: 'object',
          description: `${parentName} object`,
        };
      }
      parentSchema.properties[parentName] = parentProperty;
    }

    // Ensure parent is an object with properties
    if (parentProperty.type === 'object') {
      if (!parentProperty.properties) {
        parentProperty.properties = {};
      }
      if (!parentProperty.required) {
        parentProperty.required = [];
      }

      // Build nested structure recursively
      const nestedAttributes: EntityAttribute[] = [];
      for (const attr of attributes) {
        if (attr.name === parentName) {
          // Skip the parent definition itself
          continue;
        }

        const parsed = this.parseNestedAttributeName(attr.name);
        if (parsed && parsed.fullPath.length > 1) {
          // Create a new attribute for the nested structure
          const newPath = parsed.fullPath.slice(1); // Remove parent name
          const newName =
            newPath.length === 1
              ? newPath[0]
              : newPath[0] + '[' + newPath.slice(1).join('][') + ']';

          const nestedAttr: EntityAttribute = {
            ...attr,
            name: newName,
          };
          nestedAttributes.push(nestedAttr);
        }
      }

      // Recursively process nested attributes
      const nestedSchema: OpenAPISchema = {
        type: 'object',
        properties: parentProperty.properties,
        required: parentProperty.required,
      };

      this.processAttributesRecursively(nestedAttributes, nestedSchema);

      // Update parent property with processed nested structure
      parentProperty.properties = nestedSchema.properties;
      if (nestedSchema.required && nestedSchema.required.length > 0) {
        parentProperty.required = nestedSchema.required;
      } else {
        delete parentProperty.required;
      }
    }

    // Check if parent should be required (any non-optional attribute in this group makes parent required)
    const hasRequiredChild = attributes.some(
      (attr) => attr.name !== parentName && !attr.optional
    );
    const parentAttr = attributes.find((attr) => attr.name === parentName);
    const parentIsRequired =
      (parentAttr && !parentAttr.optional) || hasRequiredChild;

    if (
      parentIsRequired &&
      parentSchema.required &&
      !parentSchema.required.includes(parentName)
    ) {
      parentSchema.required.push(parentName);
    }
  }
}

export { EntityConverter };
