import { ApiParameter, ApiProperty } from '../interfaces/ApiParameter';
import { ParameterParser, ParsedParameter } from './ParameterParser';
import { EntityParsingUtils } from './EntityParsingUtils';
import { TypeInference } from './TypeInference';

/**
 * Process complex parameters (arrays, objects)
 */
export function processComplexParameters(
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
          'string' | 'number' | 'boolean' | 'object' | 'array' | 'integer',
      };

      // For string parameters, check for date/datetime formats
      if (param.schema.type === 'string' && rawParam.description) {
        const description = rawParam.description;

        // Check for date/datetime formats
        if (
          description.includes('[Date]') &&
          !description.toLowerCase().includes('[datetime]') &&
          !description.toLowerCase().includes('[iso8601') &&
          !description.toLowerCase().includes('iso8601')
        ) {
          param.schema.format = 'date';
        } else if (
          description.includes('[Datetime]') ||
          description.includes('[ISO8601') ||
          description.toLowerCase().includes('iso8601') ||
          (description.toLowerCase().includes('datetime') &&
            !description.toLowerCase().includes('datetime-format'))
        ) {
          param.schema.format = 'date-time';
        }
      }

      parameters.push(param);
    }
  }

  // Process all object groups (combining nested and simple properties)
  for (const [rootName, groups] of Object.entries(allObjectGroups)) {
    const allProperties: Record<string, ApiProperty> = {};
    let additionalProperties: ApiProperty | undefined;
    let hasRequiredProperty = false;

    // Process nested properties first
    if (groups.nested.length > 0) {
      const nestedSchema = ParameterParser.buildNestedObject(groups.nested);
      Object.assign(allProperties, nestedSchema.properties);
      additionalProperties = nestedSchema.additionalProperties;

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
      // Use pre-extracted enum values instead of re-extracting from stripped description
      const enumValues = prop.enumValues || [];

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

    const schema = {
      type: 'object' as const,
      properties: allProperties,
      ...(additionalProperties && { additionalProperties }),
    };

    // A root parameter of the same name carries the documented description,
    // so attach the shape to it rather than emitting a second parameter.
    const documentedRoot = parameters.find((p) => p.name === rootName);

    if (documentedRoot) {
      documentedRoot.schema = schema;
      if (hasRequiredProperty) {
        documentedRoot.required = true;
      }
    } else {
      parameters.push({
        name: rootName,
        description: `Object containing properties`,
        required: hasRequiredProperty ? true : undefined,
        in: parameterLocation,
        schema,
      });
    }
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
