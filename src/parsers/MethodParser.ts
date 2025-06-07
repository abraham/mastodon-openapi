import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';
import { ApiMethod } from '../interfaces/ApiMethod';
import { ApiParameter } from '../interfaces/ApiParameter';
import { ApiResponse } from '../interfaces/ApiResponse';

class MethodParser {
  private methodsPath: string;

  constructor() {
    this.methodsPath = path.join(
      __dirname,
      '../../mastodon-documentation/content/en/methods'
    );
  }

  public parseAllMethods(): ApiMethodsFile[] {
    const methodFiles: ApiMethodsFile[] = [];

    if (!fs.existsSync(this.methodsPath)) {
      console.error(`Methods path does not exist: ${this.methodsPath}`);
      return methodFiles;
    }

    const files = fs
      .readdirSync(this.methodsPath)
      .filter(
        (file) =>
          file.endsWith('.md') &&
          fs.statSync(path.join(this.methodsPath, file)).isFile()
      );

    for (const file of files) {
      try {
        const methodFile = this.parseMethodFile(
          path.join(this.methodsPath, file)
        );
        if (methodFile) {
          methodFiles.push(methodFile);
        }
      } catch (error) {
        console.error(`Error parsing method file ${file}:`, error);
      }
    }

    return methodFiles;
  }

  private parseMethodFile(filePath: string): ApiMethodsFile | null {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(content);

    // Extract file name from path (for tagging based on filename)
    const fileName = path.basename(filePath, '.md');
    if (!fileName) {
      console.warn(`No filename found in ${filePath}`);
      return null;
    }

    // Extract description from frontmatter
    const description = parsed.data.description || '';

    // Parse methods from markdown content
    const methods = this.parseMethods(parsed.content);

    return {
      name: fileName,
      description,
      methods,
    };
  }

  private parseMethods(content: string): ApiMethod[] {
    const methods: ApiMethod[] = [];

    // Match method sections: ## Method Name {#anchor} or ### Method Name {#anchor}
    const methodSections = content.split(/(?=^##+ [^{]*\{#[^}]+\})/m);

    for (const section of methodSections) {
      if (section.trim() === '') continue;

      // Check if this section contains multiple methods separated by ---
      // Simple split on --- since it's a clear separator
      const subSections = section.split(/\n---\n+/);

      for (const subSection of subSections) {
        if (subSection.trim() === '') continue;

        const method = this.parseMethodSection(subSection.trim());
        if (method) {
          methods.push(method);
        }
      }
    }

    return methods;
  }

  private parseMethodSection(section: string): ApiMethod | null {
    // Extract method name from header: ## Method Name {#anchor} or ### Method Name {#anchor}
    // Handle headers that may contain {{%removed%}} or other Hugo shortcodes
    const nameMatch = section.match(/^##+ (.+?)\s*\{#[^}]+\}/m);
    if (!nameMatch) return null;

    const name = nameMatch[1].trim();

    // Skip methods marked as removed
    if (name.includes('{{%removed%}}')) {
      return null;
    }

    // Check if method is marked as deprecated
    const isDeprecated = name.includes('{{%deprecated%}}');

    // Extract HTTP method and endpoint: ```http\nMETHOD /path\n```
    const httpMatch = section.match(
      /```http\s*\n([A-Z]+)\s+([^\s\n]+)[^\n]*\n```/
    );
    if (!httpMatch) return null;

    const httpMethod = httpMatch[1].trim();
    const endpoint = httpMatch[2].trim();

    // Extract description (first paragraph after the endpoint)
    // Exclude lines starting with *, #, or blank lines to avoid capturing markdown headers
    const descriptionMatch = section.match(
      /```http[^`]*```\s*\n\n([^*#\n][^\n]*)/
    );
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';

    // Extract returns, oauth, version info
    const returnsMatch = section.match(/\*\*Returns:\*\*\s*([^\\\n]+)/);
    const returns = returnsMatch
      ? this.cleanReturnsField(returnsMatch[1].trim())
      : undefined;

    const oauthMatch = section.match(/\*\*OAuth:\*\*\s*([^\\\n]+)/);
    const oauth = oauthMatch
      ? this.cleanMarkdown(oauthMatch[1].trim())
      : undefined;

    const versionMatch = section.match(/\*\*Version history:\*\*\s*([^\n]*)/);
    const version = versionMatch
      ? this.cleanMarkdown(versionMatch[1].trim())
      : undefined;

    // Parse parameters from both Query parameters and Form data parameters sections
    const parameters = this.parseAllParameters(section);

    // Parse responses with JSON examples
    const responses = this.parseResponses(section);

    // Clean the method name by removing Hugo shortcodes
    const cleanedName = name.replace(/\{\{%deprecated%\}\}/g, '').trim();

    return {
      name: cleanedName,
      httpMethod,
      endpoint,
      description,
      parameters: parameters.length > 0 ? parameters : undefined,
      returns,
      oauth,
      version,
      deprecated: isDeprecated || undefined,
      responses: responses.length > 0 ? responses : undefined,
    };
  }

  private parseAllParameters(section: string): ApiParameter[] {
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
          parameters.push({
            name: rawParam.name,
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
        { type: string; description?: string; items?: { type: string } }
      > = {};
      let objectDescription = `Object containing the following properties:`;
      let hasRequiredProperty = false;

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

  private inferTypeFromDescription(description: string): string {
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('boolean')) {
      return 'boolean';
    } else if (lowerDesc.includes('integer') || lowerDesc.includes('number')) {
      return 'integer';
    } else if (
      lowerDesc.includes('array of string') ||
      lowerDesc.includes('array of id')
    ) {
      return 'string';
    } else if (lowerDesc.includes('array')) {
      return 'string'; // Default for arrays if not specified
    }

    return 'string';
  }

  private extractEnumValuesFromDescription(description: string): string[] {
    const enumValues: string[] = [];

    // Look for patterns like "to `value1`, `value2`, `value3`"
    // This pattern matches the visibility parameter format specifically
    const toPattern = /to\s+(`[^`]+`(?:\s*,\s*`[^`]+`)*)/gi;
    let match = toPattern.exec(description);
    if (match) {
      const valuesList = match[1];
      const values = valuesList.match(/`([^`]+)`/g);
      if (values && values.length > 1) {
        // Only extract if multiple values found
        for (const value of values) {
          const cleanValue = value.slice(1, -1).trim(); // Remove backticks
          if (cleanValue && !enumValues.includes(cleanValue)) {
            enumValues.push(cleanValue);
          }
        }
      }
    }

    // If we didn't find the "to" pattern, try other patterns
    if (enumValues.length === 0) {
      const patterns = [
        /values?\s*:\s*(`[^`]+`(?:\s*,\s*`[^`]+`)*)/gi,
        /(?:set|choose|select)(?:\s+(?:to|from|between))?\s+(`[^`]+`(?:\s*,\s*`[^`]+`)*)/gi,
      ];

      for (const pattern of patterns) {
        pattern.lastIndex = 0; // Reset regex state
        const match = pattern.exec(description);
        if (match) {
          const valuesList = match[1];
          const values = valuesList.match(/`([^`]+)`/g);
          if (values && values.length > 1) {
            // Only extract if multiple values found
            for (const value of values) {
              const cleanValue = value.slice(1, -1).trim(); // Remove backticks
              if (cleanValue && !enumValues.includes(cleanValue)) {
                enumValues.push(cleanValue);
              }
            }
          }
          break; // Found a pattern, don't try others
        }
      }
    }

    return enumValues;
  }

  private cleanMarkdown(text: string): string {
    return text
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\{\{<[^>]+>\}\}/g, '') // Remove Hugo shortcodes
      .replace(/\[[^\]]*\]\([^)]*\)/g, '') // Remove markdown links
      .replace(/\\\s*$/, '') // Remove trailing backslashes
      .trim();
  }

  private cleanReturnsField(text: string): string {
    return (
      text
        .replace(/\*\*/g, '') // Remove bold markdown
        .replace(/\{\{<[^>]+>\}\}/g, '') // Remove Hugo shortcodes
        // For returns field, preserve entity names but remove the link part: [EntityName](link) -> [EntityName]
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '[$1]')
        .replace(/\\\s*$/, '') // Remove trailing backslashes
        .trim()
    );
  }

  private parseResponses(section: string): ApiResponse[] {
    const responses: ApiResponse[] = [];

    // Find the Response section - match from "#### Response" to the end of the section
    const responseMatch = section.match(/#### Response\s*([\s\S]*)$/);
    if (!responseMatch) {
      return responses;
    }

    const responseSection = responseMatch[1];

    // Match response status sections: ##### 200: OK, ##### 401: Unauthorized, etc.
    const statusRegex = /##### (\d+):\s*([^\n]*)\s*([\s\S]*?)(?=\n#####|$)/g;

    let match;
    while ((match = statusRegex.exec(responseSection)) !== null) {
      const [, statusCode, statusDescription, content] = match;

      // Look for JSON code blocks in this status section
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const jsonExample = jsonMatch[1].trim();
        
        let parsedExample: any = undefined;
        try {
          parsedExample = JSON.parse(jsonExample);
        } catch (error) {
          // If JSON parsing fails, just store the raw example
          console.warn(`Failed to parse JSON example for ${statusCode}: ${error}`);
        }

        responses.push({
          statusCode,
          description: statusDescription.trim() || undefined,
          example: jsonExample,
          parsedExample,
        });
      }
    }

    return responses;
  }
}

export { MethodParser };
