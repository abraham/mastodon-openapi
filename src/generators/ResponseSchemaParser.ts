import { HashAttribute } from '../interfaces/ApiMethod';
import { OpenAPIProperty, OpenAPISpec } from '../interfaces/OpenAPISchema';
import { EntityParsingUtils } from '../parsers/EntityParsingUtils';
import { UtilityHelpers } from './UtilityHelpers';

type ParseType = (typeString: string) => OpenAPIProperty;

/**
 * Resolves a method's `**Returns:**` prose into a response schema, registering
 * any inline component schemas it needs along the way.
 */
class ResponseSchemaParser {
  constructor(
    private readonly utilityHelpers: UtilityHelpers,
    private readonly parseType: ParseType
  ) {}

  /**
   * Parse response schema from returns field
   */
  public parseResponseSchema(
    returns: string | undefined,
    spec: OpenAPISpec,
    hashAttributes?: HashAttribute[],
    methodName?: string
  ): OpenAPIProperty | null {
    if (!returns) {
      return null;
    }

    // Check for inline JSON responses (like "JSON as per the above description")
    if (this.isInlineJsonResponse(returns) && methodName) {
      const entityName = this.generateEntityNameFromMethod(methodName);
      const sanitizedEntityName =
        this.utilityHelpers.sanitizeSchemaName(entityName);

      // Check if we generated an entity for this method
      if (spec.components?.schemas?.[sanitizedEntityName]) {
        return {
          $ref: `#/components/schemas/${sanitizedEntityName}`,
        };
      }
    }

    // Handle "Hash with a single key of `key_name`" pattern (simple value wrapper)
    // Example: "Hash with a single key of `count`"
    const simpleHashKeyMatch = returns.match(
      /Hash with a single key of `([^`]+)`$/i
    );
    if (simpleHashKeyMatch) {
      const keyName = simpleHashKeyMatch[1];
      const responseName = this.generateResponseName(keyName);

      // Create a named component for the response wrapper
      if (spec.components?.schemas) {
        if (!spec.components.schemas[responseName]) {
          spec.components.schemas[responseName] = {
            type: 'object',
            description: `Response containing a ${keyName} value`,
            properties: {
              [keyName]: {
                type: 'integer',
              },
            },
            required: [keyName],
          } as any;
        }
        return {
          $ref: `#/components/schemas/${responseName}`,
        };
      }

      // Fallback to inline schema if components don't exist
      return {
        type: 'object',
        properties: {
          [keyName]: {
            type: 'integer',
          },
        },
        required: [keyName],
      };
    }

    // Handle "Hash with a single [type] attribute `key_name`" pattern
    // Example: "Hash with a single boolean attribute `merged`"
    const hashAttrMatch = returns.match(
      /Hash with a single (boolean|integer|string) attribute `([^`]+)`/i
    );
    if (hashAttrMatch) {
      const typeName = hashAttrMatch[1].toLowerCase();
      const keyName = hashAttrMatch[2];
      let openApiType: string;

      switch (typeName) {
        case 'boolean':
          openApiType = 'boolean';
          break;
        case 'integer':
          openApiType = 'integer';
          break;
        case 'string':
        default:
          openApiType = 'string';
          break;
      }

      const responseName = this.generateResponseName(keyName);

      // Create a named component for the response wrapper
      if (spec.components?.schemas) {
        if (!spec.components.schemas[responseName]) {
          spec.components.schemas[responseName] = {
            type: 'object',
            description: `Response containing a ${keyName} value`,
            properties: {
              [keyName]: {
                type: openApiType,
              },
            },
            required: [keyName],
          } as any;
        }
        return {
          $ref: `#/components/schemas/${responseName}`,
        };
      }

      // Fallback to inline schema if components don't exist
      return {
        type: 'object',
        properties: {
          [keyName]: {
            type: openApiType,
          },
        },
        required: [keyName],
      };
    }

    // Handle "Hash with a single key of `key_name` with value of [EntityName]" pattern
    // Example: "Hash with a single key of `async_refresh` with value of [AsyncRefresh]"
    const hashKeyEntityMatch = returns.match(
      /Hash with a single key of `([^`]+)` with value of \[([^\]]+)\]/i
    );
    if (hashKeyEntityMatch) {
      const keyName = hashKeyEntityMatch[1];
      const entityName = hashKeyEntityMatch[2];
      const sanitizedEntityName =
        this.utilityHelpers.sanitizeSchemaName(entityName);

      // Check if the entity exists in the components.schemas
      if (spec.components?.schemas?.[sanitizedEntityName]) {
        // Create a named response component using the entity name
        const responseName = `${sanitizedEntityName}Response`;

        // Create the response wrapper component if it doesn't exist
        if (!spec.components.schemas[responseName]) {
          spec.components.schemas[responseName] = {
            type: 'object',
            description: `Response containing an ${entityName} object`,
            properties: {
              [keyName]: {
                $ref: `#/components/schemas/${sanitizedEntityName}`,
              },
            },
            required: [keyName],
          } as any;
        }

        return {
          $ref: `#/components/schemas/${responseName}`,
        };
      }
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

    // Handle Hash with enumerable keys pattern:
    // "Hash of String (Enumerable, anyOf `home` or `notifications`) key and associated [Entity] value"
    const hashEnumMatch = returns.match(
      /Hash of String \(Enumerable,\s*anyOf\s+([^)]+)\)\s+key and associated \[([^\]]+)\]/i
    );
    if (hashEnumMatch) {
      const enumValuesStr = hashEnumMatch[1];
      const entityName = hashEnumMatch[2];
      const sanitizedEntityName =
        this.utilityHelpers.sanitizeSchemaName(entityName);

      // Extract enum values from backtick-quoted strings
      const enumValues = enumValuesStr
        .match(/`([^`]+)`/g)
        ?.map((val) => val.replace(/`/g, ''));

      // Check if the entity exists in the components.schemas
      if (spec.components?.schemas?.[sanitizedEntityName]) {
        const schema: OpenAPIProperty = {
          type: 'object',
          additionalProperties: {
            $ref: `#/components/schemas/${sanitizedEntityName}`,
          },
        };

        // Add propertyNames constraint with enum if we found enum values
        if (enumValues && enumValues.length > 0) {
          schema.propertyNames = {
            enum: enumValues,
          };
        }

        return schema;
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

      // If we found multiple valid entities, return oneOf directly
      if (validEntityRefs.length > 1) {
        return {
          oneOf: validEntityRefs,
        };
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
   * Checks if the returns text indicates an inline JSON response
   */
  private isInlineJsonResponse(returnsText: string): boolean {
    // Clean the returns text of backslashes and trim
    const cleanedReturnsText = returnsText.replace(/\\+$/, '').trim();

    // Look for patterns indicating inline JSON rather than entity references
    const inlinePatterns = [
      /JSON\s+as\s+per/i,
      /JSON\s+response/i,
      /JSON\s+object/i,
      /JSON\s+containing/i,
      /metadata$/i, // For cases like "OEmbed metadata", "Server metadata"
    ];

    return (
      inlinePatterns.some((pattern) => pattern.test(cleanedReturnsText)) &&
      !cleanedReturnsText.includes('[') &&
      !cleanedReturnsText.includes(']')
    ); // Exclude entity references like [Token]
  }

  /**
   * Generates an entity name from a method name for response entities
   */
  private generateEntityNameFromMethod(methodName: string): string {
    // Clean the method name and convert to PascalCase
    const cleaned = methodName
      .replace(/[{}#]/g, '') // Remove Hugo shortcodes and anchors
      .replace(/\s+/g, ' ')
      .trim();

    // Special case for OEmbed - use simplified name
    if (cleaned.toLowerCase().includes('oembed')) {
      return 'OEmbedResponse';
    }

    // Convert to PascalCase
    const words = cleaned.split(/\s+/);
    const pascalCase = words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');

    // Add Response suffix to avoid naming conflicts
    return `${pascalCase}Response`;
  }

  /**
   * Generates a response component name from a key name
   * Converts snake_case to PascalCase and appends "Response"
   * Example: "count" -> "CountResponse", "async_refresh" -> "AsyncRefreshResponse"
   */
  private generateResponseName(keyName: string): string {
    // Convert snake_case to PascalCase
    const pascalCase = keyName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');

    return `${pascalCase}Response`;
  }
}

export { ResponseSchemaParser };
