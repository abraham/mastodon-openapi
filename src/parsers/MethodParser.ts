import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';
import { ApiMethod } from '../interfaces/ApiMethod';
import { ApiParameter } from '../interfaces/ApiParameter';

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

    // Match method sections: ## Method Name {#anchor}
    const methodSections = content.split(/(?=^## [^{]*\{#[^}]+\})/m);

    for (const section of methodSections) {
      if (section.trim() === '') continue;

      const method = this.parseMethodSection(section);
      if (method) {
        methods.push(method);
      }
    }

    return methods;
  }

  private parseMethodSection(section: string): ApiMethod | null {
    // Extract method name from header: ## Method Name {#anchor}
    // Handle headers that may contain {{%removed%}} or other Hugo shortcodes
    const nameMatch = section.match(/^## (.+?)\s*\{#[^}]+\}/m);
    if (!nameMatch) return null;

    const name = nameMatch[1].trim();

    // Skip methods marked as removed
    if (name.includes('{{%removed%}}')) {
      return null;
    }

    // Extract HTTP method and endpoint: ```http\nMETHOD /path\n```
    const httpMatch = section.match(
      /```http\s*\n([A-Z]+)\s+([^\s\n]+)[^\n]*\n```/
    );
    if (!httpMatch) return null;

    const httpMethod = httpMatch[1].trim();
    const endpoint = httpMatch[2].trim();

    // Extract description (first paragraph after the endpoint)
    const descriptionMatch = section.match(
      /```http[^`]*```\s*\n\n([^*\n][^\n]*)/
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

    return {
      name,
      httpMethod,
      endpoint,
      description,
      parameters: parameters.length > 0 ? parameters : undefined,
      returns,
      oauth,
      version,
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
    const parameters: ApiParameter[] = [];

    // Find parameters section
    const paramMatch = section.match(
      new RegExp(`##### ${sectionName}\\s*([\\s\\S]*?)(?=\\n#|$)`)
    );
    if (!paramMatch) return parameters;

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

      const parameter: ApiParameter = {
        name: name.trim(),
        description: cleanDesc.replace(/\{\{<required>\}\}\s*/g, ''),
        required: required ? true : undefined,
        in: parameterLocation,
      };

      // Add enum values if found
      if (enumValues.length > 0) {
        parameter.enumValues = enumValues;
      }

      parameters.push(parameter);
    }

    return parameters;
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
}

export { MethodParser };
