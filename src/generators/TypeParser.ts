import { ApiParameter } from '../interfaces/ApiParameter';
import { HashAttribute } from '../interfaces/ApiMethod';
import { OpenAPIProperty, OpenAPISpec } from '../interfaces/OpenAPISchema';
import { UtilityHelpers } from './UtilityHelpers';

/**
 * Type parser for converting various type formats to OpenAPI properties
 */
class TypeParser {
  private utilityHelpers: UtilityHelpers;

  constructor(utilityHelpers: UtilityHelpers) {
    this.utilityHelpers = utilityHelpers;
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
        const refName = refMatch[1];

        // Only treat as entity reference if it's an actual entity name
        // Skip documentation references like "Datetime", "Date", etc.
        const isDocumentationLink =
          refName.toLowerCase().includes('/') ||
          refName.toLowerCase() === 'datetime' ||
          refName.toLowerCase() === 'date' ||
          refName.toLowerCase().includes('iso8601');

        if (!isDocumentationLink) {
          // Clean up reference name and sanitize for OpenAPI compliance
          const cleanRefName = refName.replace(/[^\w:]/g, '');
          const sanitizedRefName =
            this.utilityHelpers.sanitizeSchemaName(cleanRefName);
          return {
            $ref: `#/components/schemas/${sanitizedRefName}`,
          };
        }
      }
    }

    // Handle basic types
    if (cleanType.includes('string')) {
      const property: OpenAPIProperty = { type: 'string' };

      if (cleanType.includes('url')) {
        property.format = 'uri';
      } else if (
        cleanType.includes('iso8601') ||
        (cleanType.includes('datetime') &&
          !cleanType.includes('datetime-format'))
      ) {
        property.format = 'date-time';
      } else if (
        typeString.includes('[Date]') &&
        !typeString.toLowerCase().includes('[datetime]') &&
        !typeString.toLowerCase().includes('[iso8601') &&
        !typeString.toLowerCase().includes('iso8601')
      ) {
        // Specific [Date] reference should use date format
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

    // Default to string for unknown types
    return {
      type: 'string',
      description: `Original type: ${typeString}`,
    };
  }

  /**
   * Parse response schema from returns field
   */
  public parseResponseSchema(
    returns: string | undefined,
    spec: OpenAPISpec,
    hashAttributes?: HashAttribute[]
  ): OpenAPIProperty | null {
    if (!returns) {
      return null;
    }

    // Handle array responses: "Array of [EntityName]"
    const arrayMatch = returns.match(/Array of \[([^\]]+)\]/i);
    if (arrayMatch) {
      const entityName = arrayMatch[1];
      const sanitizedEntityName =
        this.utilityHelpers.sanitizeSchemaName(entityName);

      // Check if the entity exists in the components.schemas
      if (spec.components?.schemas?.[sanitizedEntityName]) {
        return {
          type: 'array',
          items: {
            $ref: `#/components/schemas/${sanitizedEntityName}`,
          },
        };
      }
    }

    // Handle array responses: "Array of String", "Array of Integer", etc.
    const basicArrayMatch = returns.match(/Array of (\w+)/i);
    if (basicArrayMatch) {
      const itemType = basicArrayMatch[1].toLowerCase();
      let openApiType = 'string'; // default

      if (itemType === 'integer' || itemType === 'number') {
        openApiType = 'integer';
      } else if (itemType === 'boolean') {
        openApiType = 'boolean';
      } else if (itemType === 'string') {
        openApiType = 'string';
      } else if (itemType === 'hash' || itemType === 'object') {
        // If we have hash attributes, create a proper object schema with properties
        if (hashAttributes && hashAttributes.length > 0) {
          const properties: Record<string, OpenAPIProperty> = {};

          for (const attr of hashAttributes) {
            properties[attr.name] = this.parseType(attr.type);
            if (attr.description) {
              properties[attr.name].description = attr.description;
            }
          }

          return {
            type: 'array',
            items: {
              type: 'object',
              properties: properties,
            },
          };
        } else {
          openApiType = 'object';
        }
      }

      return {
        type: 'array',
        items: {
          type: openApiType,
        },
      };
    }

    // Find all entity references: "[EntityName]"
    const entityMatches = returns.match(/\[([^\]]+)\]/g);
    if (entityMatches && entityMatches.length > 0) {
      const validEntityRefs: OpenAPIProperty[] = [];
      const entityNames: string[] = [];

      for (const match of entityMatches) {
        const entityName = match.slice(1, -1); // Remove [ and ]
        const sanitizedEntityName =
          this.utilityHelpers.sanitizeSchemaName(entityName);

        // Check if the entity exists in the components.schemas
        if (spec.components?.schemas?.[sanitizedEntityName]) {
          validEntityRefs.push({
            $ref: `#/components/schemas/${sanitizedEntityName}`,
          });
          entityNames.push(sanitizedEntityName);
        }
      }

      // If we found multiple valid entities, create a synthetic schema
      if (validEntityRefs.length > 1) {
        return this.createSyntheticOneOfSchema(
          validEntityRefs,
          entityNames,
          spec
        );
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
   * Create synthetic oneOf schema for multiple entity references
   */
  public createSyntheticOneOfSchema(
    validEntityRefs: OpenAPIProperty[],
    entityNames: string[],
    spec: OpenAPISpec
  ): OpenAPIProperty {
    // Generate synthetic schema name by joining entity names with "Or"
    const syntheticSchemaName = entityNames.join('Or');

    // Initialize components if not present
    if (!spec.components) {
      spec.components = { schemas: {} };
    }
    if (!spec.components.schemas) {
      spec.components.schemas = {};
    }

    // Check if synthetic schema already exists
    if (!spec.components.schemas[syntheticSchemaName]) {
      // Create object properties from entity references
      const properties: Record<string, OpenAPIProperty> = {};
      const propertyNames: string[] = [];

      for (let i = 0; i < entityNames.length; i++) {
        const entityName = entityNames[i];
        const propertyName =
          this.utilityHelpers.entityNameToPropertyName(entityName);
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
   * Convert API parameter to OpenAPI schema
   */
  public convertParameterToSchema(param: ApiParameter): OpenAPIProperty {
    // If parameter has a complex schema, use it
    if (param.schema) {
      const schema: OpenAPIProperty = {
        type: param.schema.type,
        description: param.description,
      };

      // Add enum values if available - for arrays, put enum on items instead of array
      if (param.enumValues && param.enumValues.length > 0) {
        if (param.schema.type === 'array') {
          // For arrays, enum values should be on items, not on the array itself
          // Will be handled below when processing items
        } else {
          schema.enum = param.enumValues;
        }
      }

      // Add default value if available
      if (param.defaultValue) {
        schema.default = param.defaultValue;
      }

      if (param.schema.type === 'array' && param.schema.items) {
        schema.items = {
          type: param.schema.items.type,
        };

        // Copy enum values from array items if they exist in the schema
        if (param.schema.items.enum && param.schema.items.enum.length > 0) {
          schema.items.enum = param.schema.items.enum;
        }
        // If no enum on items but parameter has enumValues, apply them to items
        else if (param.enumValues && param.enumValues.length > 0) {
          schema.items.enum = param.enumValues;
        }

        // Handle array items with properties (objects)
        if (param.schema.items.properties) {
          const itemProperties: Record<string, OpenAPIProperty> = {};
          for (const [propName, propSchema] of Object.entries(
            param.schema.items.properties
          )) {
            const property: OpenAPIProperty = {
              type: propSchema.type,
            };

            if (propSchema.description) {
              property.description = propSchema.description;
            }

            if (propSchema.enum && propSchema.enum.length > 0) {
              property.enum = propSchema.enum;
            }

            if (propSchema.items) {
              property.items = {
                type: propSchema.items.type,
              };
            }

            itemProperties[propName] = property;
          }
          schema.items.properties = itemProperties;
        }
      } else if (param.schema.type === 'object' && param.schema.properties) {
        const properties: Record<string, OpenAPIProperty> = {};
        for (const [propName, propSchema] of Object.entries(
          param.schema.properties
        )) {
          const property: OpenAPIProperty = {
            type: propSchema.type,
          };

          if (propSchema.description) {
            property.description = propSchema.description;
          }

          if (propSchema.enum && propSchema.enum.length > 0) {
            property.enum = propSchema.enum;
          }

          if (propSchema.items) {
            property.items = {
              type: propSchema.items.type,
            };
          }

          // Handle nested object properties recursively
          if (propSchema.type === 'object' && propSchema.properties) {
            const nestedProperties: Record<string, OpenAPIProperty> = {};
            for (const [nestedPropName, nestedPropSchema] of Object.entries(
              propSchema.properties
            )) {
              const nestedProperty: OpenAPIProperty = {
                type: nestedPropSchema.type,
              };

              if (nestedPropSchema.description) {
                nestedProperty.description = nestedPropSchema.description;
              }

              if (nestedPropSchema.enum && nestedPropSchema.enum.length > 0) {
                nestedProperty.enum = nestedPropSchema.enum;
              }

              if (nestedPropSchema.items) {
                nestedProperty.items = {
                  type: nestedPropSchema.items.type,
                };
              }

              // TODO: Could be made more recursive for deeper nesting if needed
              nestedProperties[nestedPropName] = nestedProperty;
            }
            property.properties = nestedProperties;
          }

          properties[propName] = property;
        }
        schema.properties = properties;
      }

      return schema;
    }

    // Fallback to parsing type from description for basic string parameters
    // Check if this is a parameter that might have date/datetime format
    const hasDateTimePattern =
      param.description &&
      (param.description.includes('[Date]') ||
        param.description.includes('[Datetime]') ||
        param.description.toLowerCase().includes('datetime') ||
        param.description.toLowerCase().includes('iso8601'));

    if (hasDateTimePattern) {
      const parsedType = this.parseType(param.description || '');
      const schema: OpenAPIProperty = {
        description: param.description,
        ...parsedType,
      };

      // Add enum values if available (override any enum from parseType)
      if (param.enumValues && param.enumValues.length > 0) {
        schema.enum = param.enumValues;
      }

      // Add default value if available
      if (param.defaultValue) {
        schema.default = param.defaultValue;
      }

      return schema;
    }

    // Check for email format - only for actual email fields, not descriptions mentioning email
    const isEmailField =
      param.name.toLowerCase().includes('email') ||
      (param.description &&
        (param.description.toLowerCase().includes('email address') ||
          param.description.toLowerCase().includes('e-mail address') ||
          (param.description.toLowerCase().includes('email') &&
            !param.description.toLowerCase().includes('confirmation email') &&
            !param.description
              .toLowerCase()
              .includes('email that will be sent'))));

    if (isEmailField) {
      const schema: OpenAPIProperty = {
        type: 'string',
        format: 'email',
        description: param.description,
      };

      // Add enum values if available
      if (param.enumValues && param.enumValues.length > 0) {
        schema.enum = param.enumValues;
      }

      // Add default value if available
      if (param.defaultValue) {
        schema.default = param.defaultValue;
      }

      return schema;
    }

    // Default fallback for other parameters
    const schema: OpenAPIProperty = {
      type: 'string',
      description: param.description,
    };

    // Add enum values if available
    if (param.enumValues && param.enumValues.length > 0) {
      schema.enum = param.enumValues;
    }

    // Add default value if available
    if (param.defaultValue) {
      schema.default = param.defaultValue;
    }

    return schema;
  }
}

export { TypeParser };
