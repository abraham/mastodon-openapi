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
        Array.isArray(property.enum)
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
        Array.isArray(property.enum)
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
    // Create a descriptive name based on property name
    const capitalizedName =
      propertyName.charAt(0).toUpperCase() + propertyName.slice(1);

    // Special cases for well-known property names
    if (propertyName === 'context') {
      return 'FilterContext';
    }

    // For other enum types, create a generic name
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

    if (attribute.nullable) {
      property.nullable = true;
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
    const arrayItemGroups = new Map<string, EntityAttribute[]>();

    for (const attribute of attributes) {
      // Check if this is a nested attribute pattern
      const nestedMatch = this.parseNestedAttributeName(attribute.name);

      if (nestedMatch) {
        const { parentName, fullPath, arrayPositions } = nestedMatch;

        // Check if this is an array item property (e.g., "poll.options[].title")
        // Look for array positions and check if we have properties after an array
        let isArrayItemProperty = false;
        let arrayPath = '';

        for (const arrayPos of arrayPositions) {
          if (arrayPos < fullPath.length - 1) {
            // There are properties after this array position
            isArrayItemProperty = true;
            arrayPath = fullPath.slice(0, arrayPos + 1).join('.');
            break;
          }
        }

        if (isArrayItemProperty && arrayPath) {
          // This is a property of array items
          const propertyName = fullPath[fullPath.length - 1];

          if (!arrayItemGroups.has(arrayPath)) {
            arrayItemGroups.set(arrayPath, []);
          }

          // Create an attribute for the array item property
          const arrayItemAttr: EntityAttribute = {
            ...attribute,
            name: propertyName,
          };
          arrayItemGroups.get(arrayPath)!.push(arrayItemAttr);
        } else {
          // Regular nested structure
          if (!nestedGroups.has(parentName)) {
            nestedGroups.set(parentName, []);
          }
          nestedGroups.get(parentName)!.push(attribute);
        }
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

    // Process array item groups
    for (const [arrayPath, itemProperties] of arrayItemGroups.entries()) {
      this.processArrayItemGroup(arrayPath, itemProperties, schema);
    }
  }

  /**
   * Parse nested attribute name to extract parent and path information
   */
  private parseNestedAttributeName(name: string): {
    parentName: string;
    fullPath: string[];
    arrayPositions: number[];
  } | null {
    // Handle dotted patterns like "poll.options[]" or "poll.options[].title"
    if (name.includes('.')) {
      const parts = name.split('.');
      if (parts.length >= 2) {
        // Check if this is a bracket pattern with dots inside
        const bracketMatch = name.match(/^([^[]+)(\[.+\])$/);
        if (bracketMatch) {
          // This is a bracket pattern like "alerts[admin.sign_up]"
          // Don't split on dots, handle as bracket pattern
          // Fall through to bracket parsing logic below
        } else {
          // This is a regular dotted pattern like "poll.options[]"
          const parentName = parts[0];
          const fullPath = [parentName];
          const arrayPositions: number[] = [];

          for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            // Handle array notation in dotted paths
            if (part.endsWith('[]')) {
              fullPath.push(part.slice(0, -2)); // Remove []
              arrayPositions.push(fullPath.length - 1); // Mark this position as an array
            } else {
              fullPath.push(part);
            }
          }

          return { parentName, fullPath, arrayPositions };
        }
      }
    }

    // Match patterns like "parent[child]" or "parent[child][grandchild]"
    const match = name.match(/^([^[]+)(\[.+\])$/);
    if (!match) {
      return null;
    }

    const parentName = match[1];
    const bracketPart = match[2];

    // Parse bracket segments manually to handle nested brackets properly
    const fullPath = [parentName];
    const arrayPositions: number[] = [];
    let i = 0;

    while (i < bracketPart.length) {
      if (bracketPart[i] === '[') {
        // Find the matching closing bracket
        let depth = 0;
        let j = i;
        let segmentContent = '';

        // Skip the opening bracket
        j++;

        while (j < bracketPart.length) {
          const char = bracketPart[j];
          if (char === '[') {
            depth++;
            segmentContent += char;
          } else if (char === ']') {
            if (depth === 0) {
              // Found the matching closing bracket
              break;
            } else {
              depth--;
              segmentContent += char;
            }
          } else {
            segmentContent += char;
          }
          j++;
        }

        // Process the segment content
        if (segmentContent === '') {
          // Empty brackets indicate the previous element is an array
          if (fullPath.length > 0) {
            arrayPositions.push(fullPath.length - 1);
          }
        } else if (segmentContent.endsWith('[]')) {
          // Handle patterns like "options[]" - extract the name and mark as array
          const arrayName = segmentContent.slice(0, -2);
          fullPath.push(arrayName);
          arrayPositions.push(fullPath.length - 1);
        } else {
          // Regular nested property
          fullPath.push(segmentContent);
        }

        // Move to the next segment
        i = j + 1;
      } else {
        i++;
      }
    }

    return { parentName, fullPath, arrayPositions };
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

      // Build nested structure
      const nestedAttributes: EntityAttribute[] = [];
      const directProperties = new Map<string, EntityAttribute>();

      for (const attr of attributes) {
        if (attr.name === parentName) {
          // Skip the parent definition itself
          continue;
        }

        const parsed = this.parseNestedAttributeName(attr.name);
        if (parsed && parsed.fullPath.length > 1) {
          const newPath = parsed.fullPath.slice(1); // Remove parent name

          // If the new path has only one element, treat it as a direct property
          // This handles cases like alerts[admin.sign_up] where admin.sign_up should be a single property
          if (newPath.length === 1) {
            directProperties.set(newPath[0], attr);
          } else {
            // For complex nested structures, reconstruct the name
            const newName =
              newPath[0] + '[' + newPath.slice(1).join('][') + ']';
            const nestedAttr: EntityAttribute = {
              ...attr,
              name: newName,
            };
            nestedAttributes.push(nestedAttr);
          }
        }
      }

      // Process direct properties first (these should not be parsed further)
      for (const [propName, attr] of directProperties.entries()) {
        const property = this.convertAttribute(attr);
        parentProperty.properties[propName] = property;

        if (!attr.optional && parentProperty.required) {
          parentProperty.required.push(propName);
        }
      }

      // Clean up empty required array after processing direct properties
      if (parentProperty.required && parentProperty.required.length === 0) {
        delete parentProperty.required;
      }

      // Recursively process nested attributes only if there are any
      if (nestedAttributes.length > 0) {
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
      } else {
        // No nested attributes to process, just clean up empty required array
        if (parentProperty.required && parentProperty.required.length === 0) {
          delete parentProperty.required;
        }
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

  /**
   * Process array item properties to update array item schemas
   */
  private processArrayItemGroup(
    arrayPath: string,
    itemProperties: EntityAttribute[],
    schema: OpenAPISchema
  ): void {
    // Parse the array path to find the array property
    const pathParts = arrayPath.split('.');
    let currentProperty = schema.properties;

    if (!currentProperty) {
      return;
    }

    // Navigate to the array property
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const cleanPart = part.replace('[]', ''); // Remove array notation for property lookup

      if (!currentProperty || !currentProperty[cleanPart]) {
        // Array property doesn't exist yet, skip
        return;
      }

      if (i === pathParts.length - 1) {
        // This is the array property
        const arrayProperty = currentProperty[cleanPart];

        if (arrayProperty.type === 'array' && arrayProperty.items) {
          // Update the array items schema with the properties
          if (
            typeof arrayProperty.items === 'object' &&
            !Array.isArray(arrayProperty.items)
          ) {
            if (!arrayProperty.items.properties) {
              arrayProperty.items.properties = {};
            }
            if (!arrayProperty.items.required) {
              arrayProperty.items.required = [];
            }

            // Add each property to the array items schema
            for (const prop of itemProperties) {
              const propertySchema = this.convertAttribute(prop);
              arrayProperty.items.properties[prop.name] = propertySchema;

              // Add to required if not optional
              if (
                !prop.optional &&
                !arrayProperty.items.required.includes(prop.name)
              ) {
                arrayProperty.items.required.push(prop.name);
              }
            }

            // Clean up empty required array
            if (arrayProperty.items.required.length === 0) {
              delete arrayProperty.items.required;
            }
          }
        }
      } else {
        // Navigate deeper into the structure
        const nextProperty: any = currentProperty[cleanPart];
        if (nextProperty && nextProperty.properties) {
          currentProperty = nextProperty.properties;
        } else {
          // Can't navigate further, skip
          return;
        }
      }
    }
  }
}

export { EntityConverter };
