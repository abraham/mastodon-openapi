import { ApiParameter } from '../interfaces/ApiParameter';

/**
 * Handles parsing of API parameters from markdown sections
 */
export class ParameterParser {
  
  /**
   * Parse all parameters from section (both query and form data)
   */
  public parseAllParameters(section: string): ApiParameter[] {
    const parameters: ApiParameter[] = [];

    // Parse query parameters
    const queryParams = this.parseParametersByType(
      section,
      'Query parameters',
      'query'
    );
    parameters.push(...queryParams);

    // Parse form data parameters
    const formParams = this.parseParametersByType(
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
  private parseParametersByType(
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

      const cleanDesc = this.cleanMarkdown(desc.trim());
      const required =
        cleanDesc.includes('{{<required>}}') || cleanDesc.includes('required');

      // Extract enum values from description
      const enumValues = this.extractEnumValuesFromDescription(cleanDesc);

      const rawParam = {
        name: name.trim(),
        description: cleanDesc.replace(/\{\{<required>\}\}\s*/g, ''),
        required: required ? true : undefined,
        enumValues: enumValues.length > 0 ? enumValues : undefined,
      };

      rawParameters.push(rawParam);
    }

    // Process raw parameters to handle complex types
    return this.processComplexParameters(rawParameters, parameterLocation);
  }

  /**
   * Process complex parameters like objects and arrays
   */
  private processComplexParameters(
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
                type: this.inferTypeFromDescription(rawParam.description),
              },
            },
          });
        }
      }
      // Check if it's an object property like poll[options]
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
          parameters.push({
            name,
            description: rawParam.description,
            required: rawParam.required,
            in: parameterLocation,
            enumValues: rawParam.enumValues,
          });
        }
      }
    }

    // Process object groups
    for (const [objectName, properties] of Object.entries(objectGroups)) {
      const objectProperties: Record<
        string,
        {
          type: string;
          description?: string;
          items?: { type: string };
        }
      > = {};

      for (const prop of properties) {
        const propType = this.inferTypeFromDescription(prop.description);
        if (prop.isArray) {
          objectProperties[prop.property] = {
            type: 'array',
            description: prop.description,
            items: { type: propType },
          };
        } else {
          objectProperties[prop.property] = {
            type: propType,
            description: prop.description,
          };
        }
      }

      // Check if any property in the object is required
      const hasRequiredProperties = properties.some((prop) => prop.required);

      parameters.push({
        name: objectName,
        description: `Object containing properties: ${properties
          .map((p) => p.property)
          .join(', ')}`,
        required: hasRequiredProperties,
        in: parameterLocation,
        schema: {
          type: 'object',
          properties: objectProperties,
        },
      });
    }

    return parameters;
  }

  /**
   * Infer parameter type from description
   */
  private inferTypeFromDescription(description: string): string {
    if (!description) return 'string';

    const lowerDesc = description.toLowerCase();
    if (
      lowerDesc.includes('boolean') ||
      lowerDesc.includes('true') ||
      lowerDesc.includes('false')
    ) {
      return 'boolean';
    }
    if (
      lowerDesc.includes('integer') ||
      lowerDesc.includes('number') ||
      lowerDesc.includes('count') ||
      lowerDesc.includes('limit') ||
      lowerDesc.includes('max') ||
      lowerDesc.includes('min')
    ) {
      return 'integer';
    }
    return 'string';
  }

  /**
   * Extract enum values from parameter description
   */
  private extractEnumValuesFromDescription(description: string): string[] {
    const enumValues: string[] = [];

    // Common patterns for enum values in descriptions
    const patterns = [
      // Pattern: One of: `value1`, `value2`, `value3`
      /One of:?\s*([^.!?]*)/i,
      // Pattern: Must be one of: `value1`, `value2`
      /Must be one of:?\s*([^.!?]*)/i,
      // Pattern: Can be `value1`, `value2`, or `value3`
      /Can be\s+([^.!?]*)/i,
      // Pattern: Either `value1` or `value2`
      /Either\s+([^.!?]*)/i,
      // Pattern: Possible values: `value1`, `value2`
      /Possible values:?\s*([^.!?]*)/i,
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        const text = match[1];
        // Extract values in backticks
        const backtickMatches = text.match(/`([^`]+)`/g);
        if (backtickMatches) {
          for (const backtickMatch of backtickMatches) {
            const value = backtickMatch.slice(1, -1); // Remove backticks
            if (value && !enumValues.includes(value)) {
              enumValues.push(value);
            }
          }
        }
        break; // Found a pattern, don't try others
      }
    }

    return enumValues;
  }

  /**
   * Clean markdown content
   */
  private cleanMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/_(.*?)_/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove code formatting
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/\{\{<[^>]+>\}\}/g, '') // Remove Hugo shortcodes
      .replace(/\\n/g, ' ') // Replace escaped newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}