import { ApiParameter, ApiProperty } from '../interfaces/ApiParameter';
import { HashAttribute } from '../interfaces/ApiMethod';
import { OpenAPIProperty, OpenAPISpec } from '../interfaces/OpenAPISchema';
import { EntityParsingUtils } from '../parsers/EntityParsingUtils';
import { UtilityHelpers } from './UtilityHelpers';
import { ResponseSchemaParser } from './ResponseSchemaParser';
import { parseTypeRef } from '../model/parseTypeRef';
import { typeRefToProperty } from '../model/typeRefToProperty';

/**
 * Type parser for converting various type formats to OpenAPI properties
 */
class TypeParser {
  private utilityHelpers: UtilityHelpers;
  private responseSchemas: ResponseSchemaParser;

  constructor(utilityHelpers: UtilityHelpers) {
    this.utilityHelpers = utilityHelpers;
    this.responseSchemas = new ResponseSchemaParser(utilityHelpers, (type) =>
      this.parseType(type)
    );
  }

  /**
   * Parse type string to OpenAPI property
   */
  public parseType(typeString: string): OpenAPIProperty {
    return typeRefToProperty(parseTypeRef(typeString), this.utilityHelpers);
  }

  public parseResponseSchema(
    returns: string | undefined,
    spec: OpenAPISpec,
    hashAttributes?: HashAttribute[],
    methodName?: string
  ): OpenAPIProperty | null {
    return this.responseSchemas.parseResponseSchema(
      returns,
      spec,
      hashAttributes,
      methodName
    );
  }

  /**
   * Convert default value string to appropriate type based on parameter type
   */
  private convertDefaultValue(
    defaultValue: string,
    paramType: string | string[] | undefined
  ): any {
    if (!defaultValue || !paramType || Array.isArray(paramType))
      return defaultValue;

    switch (paramType) {
      case 'integer':
        const intValue = parseInt(defaultValue, 10);
        return isNaN(intValue) ? defaultValue : intValue;
      case 'number':
        const numValue = parseFloat(defaultValue);
        return isNaN(numValue) ? defaultValue : numValue;
      case 'boolean':
        if (defaultValue.toLowerCase() === 'true') return true;
        if (defaultValue.toLowerCase() === 'false') return false;
        return defaultValue;
      default:
        return defaultValue;
    }
  }

  /**
   * Copy a parsed parameter property tree into an OpenAPI property, at any depth.
   */
  private apiPropertyToOpenAPI(source: ApiProperty): OpenAPIProperty {
    const property: OpenAPIProperty = { type: source.type };

    if (source.description) {
      property.description = source.description;
    }

    if (source.enum && source.enum.length > 0) {
      property.enum = source.enum;
    }

    if (source.items) {
      property.items = { type: source.items.type };
    }

    if (source.properties) {
      const nested: Record<string, OpenAPIProperty> = {};
      for (const [name, value] of Object.entries(source.properties)) {
        nested[name] = this.apiPropertyToOpenAPI(value);
      }
      property.properties = nested;
    }

    if (source.additionalProperties) {
      property.additionalProperties = this.apiPropertyToOpenAPI(
        source.additionalProperties
      );
    }

    return property;
  }

  /**
   * Convert API parameter to OpenAPI schema
   */
  public convertParameterToSchema(param: ApiParameter): OpenAPIProperty {
    // Check for "String or Array of Strings" pattern to generate oneOf schema
    // Also check for redirect_uris parameter specifically, which often has this pattern
    if (param.description) {
      const stringOrArrayPattern = /string\s+or\s+array\s+of\s+strings?/i.test(
        param.description
      );

      // Special case for redirect_uris parameter - it's commonly "String or Array of Strings"
      // even if the type prefix has been stripped
      const isRedirectUrisParameter =
        param.name.toLowerCase() === 'redirect_uris' &&
        param.description.toLowerCase().includes('redirect');

      if (stringOrArrayPattern || isRedirectUrisParameter) {
        // Detect if URIs are involved for format specification
        const hasUriIndicator =
          param.name.toLowerCase().includes('uri') ||
          param.name.toLowerCase().includes('url') ||
          param.description.toLowerCase().includes('url') ||
          param.description.toLowerCase().includes('uri') ||
          param.description.toLowerCase().includes('redirect');

        const baseStringSchema: OpenAPIProperty = { type: 'string' };
        const baseArraySchema: OpenAPIProperty = {
          type: 'array',
          items: { type: 'string' },
        };

        if (hasUriIndicator) {
          baseStringSchema.format = 'uri';
          baseArraySchema.items!.format = 'uri';
        }

        return {
          description: EntityParsingUtils.cleanDescription(param.description),
          oneOf: [baseStringSchema, baseArraySchema],
        };
      }
    }

    // If parameter has a complex schema, use it
    if (param.schema) {
      const schema: OpenAPIProperty = {
        type: param.schema.type,
        description: param.description
          ? EntityParsingUtils.cleanDescription(param.description)
          : undefined,
      };

      // Add format if available
      if (param.schema.format) {
        schema.format = param.schema.format;
      }

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
        schema.default = this.convertDefaultValue(
          param.defaultValue,
          param.schema.type
        );
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
      } else if (
        param.schema.type === 'object' &&
        (param.schema.properties || param.schema.additionalProperties)
      ) {
        if (param.schema.properties) {
          const properties: Record<string, OpenAPIProperty> = {};
          for (const [propName, propSchema] of Object.entries(
            param.schema.properties
          )) {
            properties[propName] = this.apiPropertyToOpenAPI(propSchema);
          }
          schema.properties = properties;
        }

        if (param.schema.additionalProperties) {
          schema.additionalProperties = this.apiPropertyToOpenAPI(
            param.schema.additionalProperties
          );
        }
      }

      return schema;
    }

    // Fallback to parsing type from description for basic string parameters
    // Check if this is a parameter that might have date/datetime format or ISO 639 format
    const hasSpecialFormat =
      param.description &&
      (param.description.includes('[Date]') ||
        param.description.includes('[Datetime]') ||
        param.description.toLowerCase().includes('datetime') ||
        param.description.toLowerCase().includes('iso8601') ||
        param.description.toLowerCase().includes('iso 639') ||
        param.description.toLowerCase().includes('iso639'));

    if (hasSpecialFormat) {
      const parsedType = this.parseType(param.description || '');
      const schema: OpenAPIProperty = {
        description: param.description
          ? EntityParsingUtils.cleanDescription(param.description)
          : undefined,
        ...parsedType,
      };

      // Add enum values if available (override any enum from parseType)
      if (param.enumValues && param.enumValues.length > 0) {
        schema.enum = param.enumValues;
      }

      // Add default value if available
      if (param.defaultValue) {
        schema.default = this.convertDefaultValue(
          param.defaultValue,
          schema.type
        );
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
        description: param.description
          ? EntityParsingUtils.cleanDescription(param.description)
          : undefined,
      };

      // Add enum values if available
      if (param.enumValues && param.enumValues.length > 0) {
        schema.enum = param.enumValues;
      }

      // Add default value if available
      if (param.defaultValue) {
        schema.default = this.convertDefaultValue(
          param.defaultValue,
          schema.type
        );
      }

      return schema;
    }

    // Default fallback for other parameters
    const schema: OpenAPIProperty = {
      type: 'string',
      description: param.description
        ? EntityParsingUtils.cleanDescription(param.description)
        : undefined,
    };

    // Check for ISO 639 format in parameter description
    if (
      param.description &&
      (param.description.toLowerCase().includes('iso 639') ||
        param.description.toLowerCase().includes('iso639'))
    ) {
      schema.format = 'iso-639-1';
    }

    // Add enum values if available
    if (param.enumValues && param.enumValues.length > 0) {
      schema.enum = param.enumValues;
    }

    // Add default value if available
    if (param.defaultValue) {
      schema.default = this.convertDefaultValue(
        param.defaultValue,
        schema.type
      );
    }

    return schema;
  }
}

export { TypeParser };
