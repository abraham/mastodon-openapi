import { ApiParameter } from '../interfaces/ApiParameter';
import { TextUtils } from './TextUtils';
import { TypeInference } from './TypeInference';

/**
 * Handles parsing of API parameters from method documentation
 */
export class ParameterParser {
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

    return parameters;
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
    const paramRegex =
      /^([a-zA-Z_][a-zA-Z0-9_\[\]]*)\s*\n:\s*([^]*?)(?=\n[a-zA-Z_]|\n\n|$)/gm;

    let match;
    while ((match = paramRegex.exec(paramSection)) !== null) {
      const [, name, desc] = match;

      const cleanDesc = TextUtils.cleanMarkdown(desc.trim());
      const required =
        cleanDesc.includes('{{<required>}}') || cleanDesc.includes('required');

      // Extract enum values from description
      const enumValues = TypeInference.extractEnumValuesFromDescription(cleanDesc);

      const rawParam = {
        name: name.trim(),
        description: cleanDesc.replace(/\{\{<required>\}\}\s*/g, ''),
        required: required ? true : undefined,
        enumValues: enumValues.length > 0 ? enumValues : undefined,
      };

      rawParameters.push(rawParam);
    }

    // Process raw parameters to handle complex types
    return ParameterParser.processComplexParameters(rawParameters, parameterLocation);
  }

  /**
   * Process complex parameters (arrays, objects)
   */
  static processComplexParameters(
    rawParameters: Array<{
      name: string;
      description: string;
      required?: boolean;
      enumValues?: string[];
    }>,
    parameterLocation: string
  ): ApiParameter[] {
    const parameters: ApiParameter[] = [];
    const objectGroups: Record<
      string,
      Array<{
        name: string;
        property: string;
        isArray: boolean;
        description: string;
        required?: boolean;
        enumValues?: string[];
      }>
    > = {};

    for (const rawParam of rawParameters) {
      const { name } = rawParam;

      // Check if it's an array parameter (ends with [])
      if (name.endsWith('[]')) {
        const baseName = name.slice(0, -2);

        // Check if it's an object property array like poll[options][]
        const objectPropertyArrayMatch = baseName.match(
          /^([a-zA-Z_][a-zA-Z0-9_]*)\[([a-zA-Z_][a-zA-Z0-9_]*)\]$/
        );
        if (objectPropertyArrayMatch) {
          const [, objectName, propertyName] = objectPropertyArrayMatch;
          if (!objectGroups[objectName]) {
            objectGroups[objectName] = [];
          }
          objectGroups[objectName].push({
            name: rawParam.name,
            property: propertyName,
            isArray: true,
            description: rawParam.description,
            required: rawParam.required,
            enumValues: rawParam.enumValues,
          });
        } else {
          // Simple array parameter like media_ids[]
          parameters.push({
            name: baseName,
            description: rawParam.description,
            required: rawParam.required,
            in: parameterLocation,
            enumValues: rawParam.enumValues,
            schema: {
              type: 'array',
              items: {
                type: TypeInference.inferTypeFromDescription(rawParam.description),
              },
            },
          });
        }
      }
      // Check if it's an object property like poll[expires_in]
      else {
        const objectPropertyMatch = name.match(
          /^([a-zA-Z_][a-zA-Z0-9_]*)\[([a-zA-Z_][a-zA-Z0-9_]*)\]$/
        );
        if (objectPropertyMatch) {
          const [, objectName, propertyName] = objectPropertyMatch;
          if (!objectGroups[objectName]) {
            objectGroups[objectName] = [];
          }
          objectGroups[objectName].push({
            name: rawParam.name,
            property: propertyName,
            isArray: false,
            description: rawParam.description,
            required: rawParam.required,
            enumValues: rawParam.enumValues,
          });
        } else {
          // Simple parameter
          const inferredType = TypeInference.inferTypeFromDescription(
            rawParam.description
          );
          const param: ApiParameter = {
            name: rawParam.name,
            description: rawParam.description,
            required: rawParam.required,
            in: parameterLocation,
            enumValues: rawParam.enumValues,
          };

          // If inferred as object, create a schema for it
          if (inferredType === 'object') {
            param.schema = {
              type: 'object',
            };
          }

          parameters.push(param);
        }
      }
    }

    // Process object groups
    for (const [objectName, properties] of Object.entries(objectGroups)) {
      const objectProperties: Record<
        string,
        { type: string; description?: string; items?: { type: string } }
      > = {};
      let objectDescription = `Object containing the following properties:`;
      let hasRequiredProperty = false;

      for (const prop of properties) {
        const propType = TypeInference.inferTypeFromDescription(prop.description);
        const enumValues = TypeInference.extractEnumValuesFromDescription(
          prop.description
        );

        if (prop.isArray) {
          objectProperties[prop.property] = {
            type: 'array',
            description: prop.description,
            items: { type: propType },
          };
        } else {
          const property: any = {
            type: propType,
            description: prop.description,
          };

          if (enumValues.length > 0) {
            property.enum = enumValues;
          }

          objectProperties[prop.property] = property;
        }

        if (prop.required) {
          hasRequiredProperty = true;
        }
      }

      parameters.push({
        name: objectName,
        description: objectDescription,
        required: hasRequiredProperty ? true : undefined,
        in: parameterLocation,
        schema: {
          type: 'object',
          properties: objectProperties,
        },
      });
    }

    return parameters;
  }
}