import { EntityClass } from '../interfaces/EntityClass';
import { EntityAttribute } from '../interfaces/EntityAttribute';
import {
  OpenAPISpec,
  OpenAPISchema,
  OpenAPIProperty,
} from '../interfaces/OpenAPISchema';

/**
 * Handles conversion of entities to OpenAPI schemas
 */
export class SchemaGenerator {
  /**
   * Convert entities to OpenAPI schemas and add them to the spec
   */
  public convertEntities(entities: EntityClass[], spec: OpenAPISpec): void {
    if (!spec.components?.schemas) {
      spec.components = { schemas: {} };
    }

    for (const entity of entities) {
      const schema: OpenAPISchema = {
        type: 'object',
        description: entity.description,
        properties: {},
        required: [],
      };

      for (const attribute of entity.attributes) {
        const property = this.convertAttribute(attribute);
        if (schema.properties) {
          schema.properties[attribute.name] = property;
        }

        // Add to required array if not optional
        if (!attribute.optional && schema.required) {
          schema.required.push(attribute.name);
        }
      }

      // Remove empty required array
      if (schema.required && schema.required.length === 0) {
        delete schema.required;
      }

      if (spec.components?.schemas) {
        const sanitizedName = this.sanitizeSchemaName(entity.name);
        spec.components.schemas[sanitizedName] = schema;
      }
    }
  }

  /**
   * Sanitize schema names to be OpenAPI compliant
   */
  public sanitizeSchemaName(name: string): string {
    // Replace :: with _ and spaces with _ to make schema names OpenAPI compliant
    // OpenAPI schema names must match ^[a-zA-Z0-9\.\-_]+$
    return name.replace(/::/g, '_').replace(/\s+/g, '_');
  }

  /**
   * Convert an entity attribute to OpenAPI property
   */
  private convertAttribute(attribute: EntityAttribute): OpenAPIProperty {
    const property: OpenAPIProperty = {
      description: attribute.description,
    };

    if (attribute.deprecated) {
      property.deprecated = true;
    }

    // Parse type information to determine OpenAPI type
    const type = this.parseType(attribute.type);

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

    // Use enum values from attribute if available, otherwise from type parsing
    if (attribute.enumValues && attribute.enumValues.length > 0) {
      property.enum = attribute.enumValues;
    } else if (type.enum) {
      property.enum = type.enum;
    }

    return property;
  }

  /**
   * Parse type string to OpenAPI property
   */
  public parseType(typeString: string): OpenAPIProperty {
    const cleanType = typeString.toLowerCase().trim();

    // Handle arrays
    if (cleanType.includes('array of')) {
      const itemTypeMatch = typeString.match(/array of\s+(.+?)(?:\s|$)/i);
      if (itemTypeMatch) {
        const itemType = this.parseType(itemTypeMatch[1]);
        return {
          type: 'array',
          items: itemType,
        };
      }
      return { type: 'array' };
    }

    // Handle references to other entities (only for actual entity names, not documentation links)
    if (typeString.includes('[') && typeString.includes(']')) {
      const refMatch = typeString.match(/\[([^\]]+)\]/);
      if (refMatch) {
        const entityName = refMatch[1];
        // Only create references for valid entity names (no spaces, URLs, etc.)
        if (!entityName.includes(' ') && !entityName.includes('/')) {
          return {
            $ref: `#/components/schemas/${this.sanitizeSchemaName(entityName)}`,
          };
        }
      }
    }

    // Handle basic types
    if (cleanType.includes('string')) {
      const property: OpenAPIProperty = { type: 'string' };

      if (cleanType.includes('url')) {
        property.format = 'uri';
      } else if (cleanType.includes('datetime')) {
        property.format = 'date-time';
      } else if (cleanType.includes('date')) {
        property.format = 'date';
      } else if (cleanType.includes('email')) {
        property.format = 'email';
      } else if (cleanType.includes('html')) {
        property.description = (property.description || '') + ' (HTML content)';
      }

      return property;
    }

    if (
      cleanType.includes('integer') ||
      cleanType.includes('cast from an integer')
    ) {
      return { type: 'integer' };
    }

    if (cleanType.includes('boolean')) {
      return { type: 'boolean' };
    }

    if (cleanType.includes('number') || cleanType.includes('float')) {
      return { type: 'number' };
    }

    if (cleanType.includes('hash') || cleanType.includes('object')) {
      return { type: 'object' };
    }

    // Handle enums
    if (cleanType.includes('enumerable') || cleanType.includes('oneof')) {
      return {
        type: 'string',
        description: typeString.includes('Enumerable')
          ? 'Enumerable value'
          : '',
      };
    }

    // Handle nullable types
    if (cleanType.includes('null')) {
      return { type: 'string', description: 'Nullable value' };
    }

    // Check if it's an enum (contains pipe symbols)
    if (typeString.includes('|')) {
      const enumValues = typeString
        .split('|')
        .map((v) => v.trim())
        .filter((v) => v && !v.toLowerCase().includes('null'));
      if (enumValues.length > 0) {
        return { type: 'string', enum: enumValues };
      }
    }

    // Default to string for unknown types
    return {
      type: 'string',
      description: `Original type: ${typeString}`,
    };
  }

  /**
   * Parse response schema from returns field
   */
  public parseResponseSchema(returns?: string, spec?: OpenAPISpec): OpenAPIProperty | null {
    if (!returns) {
      return null;
    }

    // Handle array responses: "Array of [EntityName]"
    const arrayMatch = returns.match(/Array of \[([^\]]+)\]/i);
    if (arrayMatch) {
      const entityName = arrayMatch[1];
      const sanitizedEntityName = this.sanitizeSchemaName(entityName);

      // Check if the entity exists in the components.schemas
      if (spec?.components?.schemas?.[sanitizedEntityName]) {
        return {
          type: 'array',
          items: {
            $ref: `#/components/schemas/${sanitizedEntityName}`,
          },
        };
      }
    }

    // Find all entity references: "[EntityName]"
    const entityMatches = returns.match(/\[([^\]]+)\]/g);
    if (entityMatches && entityMatches.length > 0) {
      const validEntityRefs: OpenAPIProperty[] = [];
      const entityNames: string[] = [];

      for (const match of entityMatches) {
        const entityName = match.slice(1, -1); // Remove [ and ]
        const sanitizedEntityName = this.sanitizeSchemaName(entityName);

        // Check if the entity exists in the components.schemas
        if (spec?.components?.schemas?.[sanitizedEntityName]) {
          validEntityRefs.push({
            $ref: `#/components/schemas/${sanitizedEntityName}`,
          });
          entityNames.push(sanitizedEntityName);
        }
      }

      // If we found multiple valid entities, create a synthetic schema
      if (validEntityRefs.length > 1) {
        return this.createSyntheticOneOfSchemaImmediate(validEntityRefs, entityNames, spec);
      }
      // If we found exactly one valid entity, return it directly
      else if (validEntityRefs.length === 1) {
        return validEntityRefs[0];
      }
    }

    // If no entity reference found or entity doesn't exist, return null to fallback to description-only
    return null;
  }

  /**
   * Create synthetic oneOf schema for multiple entity types (immediate creation)
   */
  public createSyntheticOneOfSchemaImmediate(
    validEntityRefs: OpenAPIProperty[],
    entityNames: string[],
    spec?: OpenAPISpec
  ): OpenAPIProperty {
    // Generate synthetic schema name by joining entity names with "Or"
    const syntheticSchemaName = entityNames.join('Or');

    // Initialize components if not present
    if (!spec?.components) {
      if (spec) {
        spec.components = { schemas: {} };
      }
    }
    if (!spec?.components?.schemas) {
      if (spec?.components) {
        spec.components.schemas = {};
      }
    }

    // Check if synthetic schema already exists
    if (spec?.components?.schemas && !spec.components.schemas[syntheticSchemaName]) {
      // Create object properties from entity references
      const properties: Record<string, OpenAPIProperty> = {};
      const propertyNames: string[] = [];

      for (let i = 0; i < entityNames.length; i++) {
        const entityName = entityNames[i];
        const propertyName = this.entityNameToPropertyNameOriginal(entityName);
        properties[propertyName] = validEntityRefs[i];
        propertyNames.push(propertyName);
      }

      // Create the synthetic schema as an object with optional properties
      spec.components.schemas[syntheticSchemaName] = {
        type: 'object',
        properties: properties,
        description: `Object containing one of: ${propertyNames.join(', ')}`,
      };
    }

    // Return reference to the synthetic schema
    return {
      $ref: `#/components/schemas/${syntheticSchemaName}`,
    };
  }

  /**
   * Convert entity name to property name (original snake_case version)
   */
  private entityNameToPropertyNameOriginal(entityName: string): string {
    // Convert PascalCase to snake_case
    return entityName.replace(/([A-Z])/g, (match, letter, index) => {
      return index === 0 ? letter.toLowerCase() : '_' + letter.toLowerCase();
    });
  }

  /**
   * Generate synthetic schemas for oneOf combinations and add them to spec
   */
  public generateSyntheticSchemas(spec: OpenAPISpec, syntheticSchemas: Set<string>): void {
    if (!spec.components?.schemas) {
      spec.components = { schemas: {} };
    }

    for (const schemaName of syntheticSchemas) {
      if (spec.components.schemas && !spec.components.schemas[schemaName]) {
        // Parse the schema name to get constituent entities
        const entities = schemaName.split('Or');
        const properties: Record<string, OpenAPIProperty> = {};
        
        for (const entity of entities) {
          const propertyName = this.entityNameToPropertyName(entity);
          properties[propertyName] = {
            $ref: `#/components/schemas/${this.sanitizeSchemaName(entity)}`,
          };
        }

        spec.components.schemas[schemaName] = {
          type: 'object',
          properties,
          description: `Object containing one of: ${entities.map(e => this.entityNameToPropertyName(e)).join(', ')}`,
        };
      }
    }
  }

  /**
   * Convert entity name to property name (camelCase)
   */
  private entityNameToPropertyName(entityName: string): string {
    // Convert PascalCase to camelCase
    return entityName.charAt(0).toLowerCase() + entityName.slice(1);
  }
}