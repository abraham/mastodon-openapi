import { ApiParameter, ApiProperty } from '../interfaces/ApiParameter';
import { TextUtils } from './TextUtils';
import { TypeInference } from './TypeInference';
import { EntityParsingUtils } from './EntityParsingUtils';
import { OAuthScopeParser } from './OAuthScopeParser';

/**
 * Parsed parameter structure for nested objects
 */
interface ParsedParameter {
  rootName: string;
  path: string[];
  isArray: boolean;
  description: string;
  originalDescription?: string;
  required?: boolean;
  enumValues?: string[];
}

/**
 * Handles parsing of API parameters from method documentation
 */
export class ParameterParser {
  /**
   * Extract notification types from "Types to filter include" section
   */
  static extractNotificationTypes(section: string): string[] {
    const typesSection = section.match(
      /Types to filter include:([\s\S]*?)(?=\n#{1,5}\s|\n\*\*Returns|\n\*\*OAuth|$)/i
    );

    if (!typesSection) return [];

    const types: string[] = [];
    const typePattern = /^\s*-\s*`([^`]+)`/gm;
    let match;

    while ((match = typePattern.exec(typesSection[1])) !== null) {
      const type = match[1].trim();
      if (type && !types.includes(type)) {
        types.push(type);
      }
    }

    return types;
  }

  /**
   * Parse all parameters from a method section
   */
  static parseAllParameters(section: string): ApiParameter[] {
    const parameters: ApiParameter[] = [];

    // Parse query parameters
    const queryParams = ParameterParser.parseParametersByType(
      section,
      'Query parameters',
      'query'
    );
    parameters.push(...queryParams);

    // Parse form data parameters
    const formParams = ParameterParser.parseParametersByType(
      section,
      'Form data parameters',
      'formData'
    );
    parameters.push(...formParams);

    // Parse header parameters, excluding Authorization headers (handled by OAuth)
    const headerParams = ParameterParser.parseParametersByType(
      section,
      'Headers',
      'header'
    ).filter((param) => param.name !== 'Authorization');
    parameters.push(...headerParams);

    // Apply special handling for notification type parameters
    const notificationTypes = ParameterParser.extractNotificationTypes(section);
    if (notificationTypes.length > 0) {
      for (const param of parameters) {
        if (
          (param.name === 'grouped_types' ||
            param.name === 'types' ||
            param.name === 'exclude_types') &&
          param.schema?.type === 'array'
        ) {
          // Apply notification types as enum values to array items
          if (param.schema.items && !param.schema.items.enum) {
            param.schema.items.enum = notificationTypes;
            param.enumValues = notificationTypes;
          }
        }
      }
    }

    // Apply special handling for OAuth scope parameters
    for (const param of parameters) {
      if (param.name === 'scopes' && param.schema?.type === 'string') {
        // Parse OAuth scopes and apply as enum values for the scopes parameter
        const oauthParser = new OAuthScopeParser();
        const oauthScopes = oauthParser.parseOAuthScopes();
        const scopeNames = oauthScopes.scopes.map((scope) => scope.name);

        if (scopeNames.length > 0) {
          param.schema.enum = scopeNames;
          param.enumValues = scopeNames;
        }
      }
    }

    return parameters;
  }

  /**
   * Parse a parameter name with nested brackets into a structured format
   * Examples:
   * - "subscription[keys][auth]" -> { rootName: "subscription", path: ["keys", "auth"], isArray: false }
   * - "data[alerts][mention]" -> { rootName: "data", path: ["alerts", "mention"], isArray: false }
   * - "poll[options][]" -> { rootName: "poll", path: ["options"], isArray: true }
   */
  static parseNestedParameter(name: string): ParsedParameter | null {
    // Check if it contains brackets
    if (!name.includes('[')) {
      return null;
    }

    // Parse the bracket structure
    const match = name.match(/^([a-zA-Z_][a-zA-Z0-9_]*)((\[.*?\])+)$/);
    if (!match) {
      return null;
    }

    const rootName = match[1];
    const bracketsPart = match[2];

    // Extract all bracket contents
    const bracketMatches = bracketsPart.match(/\[([^\]]*)\]/g);
    if (!bracketMatches) {
      return null;
    }

    const path: string[] = [];
    let isArray = false;

    for (const bracket of bracketMatches) {
      const content = bracket.slice(1, -1); // Remove [ and ]
      if (content === '') {
        // Empty brackets indicate array
        isArray = true;
      } else {
        path.push(content);
      }
    }

    return {
      rootName,
      path,
      isArray,
      description: '',
      required: undefined,
      enumValues: undefined,
    };
  }

  /**
   * Build nested object structure from parsed parameters
   */
  static buildNestedObject(
    parameters: Array<
      ParsedParameter & {
        description: string;
        inferredType?: string;
        required?: boolean;
        enumValues?: string[];
      }
    >
  ): ApiProperty {
    const properties: Record<string, ApiProperty> = {};

    for (const param of parameters) {
      let current = properties;

      // Navigate through the path, creating nested objects as needed
      for (let i = 0; i < param.path.length - 1; i++) {
        const pathSegment = param.path[i];
        if (!current[pathSegment]) {
          current[pathSegment] = {
            type: 'object',
            properties: {},
          };
        }
        current = current[pathSegment].properties!;
      }

      // Set the final property
      const finalProperty = param.path[param.path.length - 1];
      const propType =
        param.inferredType ||
        TypeInference.inferTypeFromDescription(param.description);
      const enumValues = TypeInference.extractEnumValuesFromDescription(
        param.description
      );

      const property: ApiProperty = {
        type: propType,
        description: EntityParsingUtils.stripTypePrefix(param.description),
      };

      if (enumValues.length > 0) {
        property.enum = enumValues;
      }

      if (param.isArray) {
        current[finalProperty] = {
          type: 'array',
          items: property,
          description: EntityParsingUtils.stripTypePrefix(param.description),
        };
      } else {
        current[finalProperty] = property;
      }
    }

    return {
      type: 'object',
      properties,
    };
  }

  /**
   * Parse parameters by type (query or form data)
   */
  static parseParametersByType(
    section: string,
    sectionName: string,
    parameterLocation: string
  ): ApiParameter[] {
    const rawParameters: Array<{
      name: string;
      description: string;
      originalDescription?: string;
      inferredType?: string;
      required?: boolean;
      enumValues?: string[];
    }> = [];

    // Find parameters section
    const paramMatch = section.match(
      new RegExp(`##### ${sectionName}\\s*([\\s\\S]*?)(?=\\n#|$)`)
    );
    if (!paramMatch) return [];

    const paramSection = paramMatch[1];

    // Match parameter definitions: parameter_name\n: description
    // Allow dots, brackets, and hyphens in parameter names to support patterns like alerts[admin.sign_up] and Idempotency-Key
    const paramRegex =
      /^([a-zA-Z_][a-zA-Z0-9_.\[\]-]*)\s*\n:\s*([^]*?)(?=\n[a-zA-Z_]|\n\n|$)/gm;

    let match;
    while ((match = paramRegex.exec(paramSection)) !== null) {
      const [, name, desc] = match;

      const originalDesc = desc.trim();
      const required =
        originalDesc.includes('{{<required>}}') ||
        originalDesc.includes('required');
      const cleanDesc = TextUtils.cleanMarkdown(originalDesc);

      // Extract enum values from description
      const enumValues =
        TypeInference.extractEnumValuesFromDescription(cleanDesc);

      // Extract default value from description
      const defaultValue =
        TypeInference.extractDefaultValueFromDescription(cleanDesc);

      // Infer type from original description before cleaning
      const inferredType = TypeInference.inferTypeFromDescription(originalDesc);

      const rawParam = {
        name: name.trim(),
        description: cleanDesc.replace(/\{\{<required>\}\}\s*/g, ''),
        originalDescription: originalDesc, // Store original for type inference
        inferredType: inferredType, // Store pre-computed type
        required: required ? true : undefined,
        enumValues: enumValues.length > 0 ? enumValues : undefined,
        defaultValue: defaultValue,
      };

      rawParameters.push(rawParam);
    }

    // Process raw parameters to handle complex types
    return ParameterParser.processComplexParameters(
      rawParameters,
      parameterLocation
    );
  }

  /**
   * Process complex parameters (arrays, objects)
   */
  static processComplexParameters(
    rawParameters: Array<{
      name: string;
      description: string;
      originalDescription?: string;
      inferredType?: string;
      required?: boolean;
      enumValues?: string[];
      defaultValue?: string;
    }>,
    parameterLocation: string
  ): ApiParameter[] {
    const parameters: ApiParameter[] = [];
    const allObjectGroups: Record<
      string,
      {
        nested: Array<
          ParsedParameter & {
            description: string;
            inferredType?: string;
            required?: boolean;
            enumValues?: string[];
            defaultValue?: string;
          }
        >;
        simple: Array<{
          name: string;
          property: string;
          isArray: boolean;
          description: string;
          inferredType?: string;
          required?: boolean;
          enumValues?: string[];
          defaultValue?: string;
        }>;
      }
    > = {};
    const arrayOfObjectGroups: Record<
      string,
      Array<{
        name: string;
        property: string;
        description: string;
        inferredType?: string;
        required?: boolean;
        enumValues?: string[];
        defaultValue?: string;
      }>
    > = {};

    for (const rawParam of rawParameters) {
      const { name } = rawParam;

      // Check if it's an array of objects parameter like name[][property] FIRST
      const arrayOfObjectsMatch = name.match(
        /^([a-zA-Z_][a-zA-Z0-9_]*)\[\]\[([a-zA-Z_][a-zA-Z0-9_.]*)\]$/
      );
      if (arrayOfObjectsMatch) {
        const [, arrayName, propertyName] = arrayOfObjectsMatch;
        if (!arrayOfObjectGroups[arrayName]) {
          arrayOfObjectGroups[arrayName] = [];
        }
        arrayOfObjectGroups[arrayName].push({
          name: rawParam.name,
          property: propertyName,
          description: EntityParsingUtils.stripTypePrefix(rawParam.description),
          inferredType: rawParam.inferredType,
          required: rawParam.required,
          enumValues: rawParam.enumValues,
          defaultValue: rawParam.defaultValue,
        });
        continue;
      }

      // Then try to parse as nested parameter
      const nestedParam = ParameterParser.parseNestedParameter(name);
      if (nestedParam && nestedParam.path.length > 0) {
        // Only use nested parsing for bracket parameters that are not simple arrays
        // Simple arrays like "media_ids[]" should be handled by the array logic below
        if (
          name.endsWith('[]') &&
          nestedParam.path.length === 1 &&
          !nestedParam.path[0]
        ) {
          // This is a simple array like media_ids[] - handle below
        } else {
          if (!allObjectGroups[nestedParam.rootName]) {
            allObjectGroups[nestedParam.rootName] = { nested: [], simple: [] };
          }

          if (nestedParam.path.length > 1) {
            // Multi-level nesting like subscription[keys][auth]
            allObjectGroups[nestedParam.rootName].nested.push({
              ...nestedParam,
              description: EntityParsingUtils.stripTypePrefix(
                rawParam.description
              ),
              inferredType: rawParam.inferredType,
              required: rawParam.required,
              enumValues: rawParam.enumValues,
              defaultValue: rawParam.defaultValue,
            });
          } else {
            // Single-level nesting like subscription[endpoint]
            allObjectGroups[nestedParam.rootName].simple.push({
              name: rawParam.name,
              property: nestedParam.path[0],
              isArray: nestedParam.isArray,
              description: EntityParsingUtils.stripTypePrefix(
                rawParam.description
              ),
              inferredType: rawParam.inferredType,
              required: rawParam.required,
              enumValues: rawParam.enumValues,
              defaultValue: rawParam.defaultValue,
            });
          }
          continue;
        }
      }
      // Check if it's an array parameter (ends with [])
      else if (name.endsWith('[]')) {
        const baseName = name.slice(0, -2);

        // Create items schema with enum values if available
        const itemsSchema: any = {
          type:
            rawParam.inferredType ||
            TypeInference.inferTypeFromDescription(
              rawParam.originalDescription || rawParam.description
            ),
        };

        if (rawParam.enumValues && rawParam.enumValues.length > 0) {
          itemsSchema.enum = rawParam.enumValues;
        }

        // Simple array parameter like media_ids[]
        parameters.push({
          name: baseName,
          description: EntityParsingUtils.stripTypePrefix(rawParam.description),
          required: rawParam.required,
          in: parameterLocation,
          enumValues: rawParam.enumValues,
          defaultValue: rawParam.defaultValue,
          schema: {
            type: 'array',
            items: itemsSchema,
          },
        });
      } else {
        // Simple parameter
        const inferredType =
          rawParam.inferredType ||
          TypeInference.inferTypeFromDescription(
            rawParam.originalDescription || rawParam.description
          );
        const param: ApiParameter = {
          name: rawParam.name,
          description: EntityParsingUtils.stripTypePrefix(rawParam.description),
          required: rawParam.required,
          in: parameterLocation,
          enumValues: rawParam.enumValues,
          defaultValue: rawParam.defaultValue,
        };

        // Create schema with the inferred type
        param.schema = {
          type: inferredType as
            | 'string'
            | 'number'
            | 'boolean'
            | 'object'
            | 'array'
            | 'integer',
        };

        parameters.push(param);
      }
    }

    // Process all object groups (combining nested and simple properties)
    for (const [rootName, groups] of Object.entries(allObjectGroups)) {
      const allProperties: Record<string, ApiProperty> = {};
      let hasRequiredProperty = false;

      // Process nested properties first
      if (groups.nested.length > 0) {
        const nestedSchema = ParameterParser.buildNestedObject(groups.nested);
        Object.assign(allProperties, nestedSchema.properties);

        // Check if any nested property is required
        for (const param of groups.nested) {
          if (param.required) {
            hasRequiredProperty = true;
          }
        }
      }

      // Process simple properties
      for (const prop of groups.simple) {
        const propType =
          prop.inferredType ||
          TypeInference.inferTypeFromDescription(prop.description);
        const enumValues = TypeInference.extractEnumValuesFromDescription(
          prop.description
        );

        if (prop.isArray) {
          allProperties[prop.property] = {
            type: 'array',
            description: prop.description,
            items: { type: propType },
          };
        } else {
          const property: ApiProperty = {
            type: propType,
            description: prop.description,
          };

          if (enumValues.length > 0) {
            property.enum = enumValues;
          }

          allProperties[prop.property] = property;
        }

        if (prop.required) {
          hasRequiredProperty = true;
        }
      }

      parameters.push({
        name: rootName,
        description: `Object containing properties`,
        required: hasRequiredProperty ? true : undefined,
        in: parameterLocation,
        schema: {
          type: 'object',
          properties: allProperties,
        },
      });
    }

    // Process array of objects groups
    for (const [arrayName, properties] of Object.entries(arrayOfObjectGroups)) {
      const objectProperties: Record<string, ApiProperty> = {};

      for (const prop of properties) {
        const propType =
          prop.inferredType ||
          TypeInference.inferTypeFromDescription(prop.description);
        const enumValues = TypeInference.extractEnumValuesFromDescription(
          prop.description
        );

        const property: ApiProperty = {
          type: propType,
          description: prop.description,
        };

        if (enumValues.length > 0) {
          property.enum = enumValues;
        }

        objectProperties[prop.property] = property;
      }

      parameters.push({
        name: arrayName,
        description: `Array of objects with properties: ${Object.keys(objectProperties).join(', ')}`,
        in: parameterLocation,
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: objectProperties,
          },
        },
      });
    }

    return parameters;
  }
}
