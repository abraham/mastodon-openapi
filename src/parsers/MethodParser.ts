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

    // Split method sections using pattern matching instead of complex regex
    const methodSections = this.splitIntoMethodSections(content);

    for (const section of methodSections) {
      if (section.trim() === '') continue;

      // Check if this section contains multiple methods separated by ---
      const subSections = this.splitByHorizontalRule(section);

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

  private splitIntoMethodSections(content: string): string[] {
    const sections: string[] = [];
    const lines = content.split('\n');
    let currentSection: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if this line is a method header (## or ### followed by {#anchor})
      if (this.isMethodHeader(line)) {
        // If we have a current section, save it
        if (currentSection.length > 0) {
          sections.push(currentSection.join('\n'));
        }
        // Start a new section
        currentSection = [line];
      } else {
        // Add line to current section
        currentSection.push(line);
      }
    }

    // Add the last section if it exists
    if (currentSection.length > 0) {
      sections.push(currentSection.join('\n'));
    }

    return sections;
  }

  private isMethodHeader(line: string): boolean {
    const trimmed = line.trim();

    // Must start with ## or ###
    if (!trimmed.startsWith('##')) {
      return false;
    }

    // Must have {#anchor} pattern
    if (!trimmed.includes('{#') || !trimmed.endsWith('}')) {
      return false;
    }

    // Check the basic pattern: ##+ text {#anchor}
    const headerPattern = /^##+ .+\{#[^}]+\}$/;
    return headerPattern.test(trimmed);
  }

  private splitByHorizontalRule(section: string): string[] {
    // Split by horizontal rules (---) with optional whitespace
    const parts: string[] = [];
    const lines = section.split('\n');
    let currentPart: string[] = [];

    for (const line of lines) {
      // Check if this is a horizontal rule line
      if (this.isHorizontalRule(line)) {
        // Save current part if it has content
        if (currentPart.length > 0) {
          parts.push(currentPart.join('\n'));
          currentPart = [];
        }
        // Skip the horizontal rule line itself
      } else {
        currentPart.push(line);
      }
    }

    // Add the last part
    if (currentPart.length > 0) {
      parts.push(currentPart.join('\n'));
    }

    return parts;
  }

  private isHorizontalRule(line: string): boolean {
    const trimmed = line.trim();
    // Horizontal rule is three or more dashes, possibly with spaces
    return /^-{3,}$/.test(trimmed);
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
    // Use pattern matching instead of regex for better maintainability
    const description = this.extractDescription(section);

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
    };
  }

  private extractDescription(section: string): string {
    // Find the end of the HTTP block
    const httpBlockEndIndex = section.indexOf(
      '```',
      section.indexOf('```http') + 7
    );
    if (httpBlockEndIndex === -1) {
      return '';
    }

    // Get content after the HTTP block
    const afterHttpBlock = section.substring(httpBlockEndIndex + 3);

    // Split into lines for pattern matching
    const lines = afterHttpBlock.split('\n');

    // Skip empty lines at the beginning
    let startIndex = 0;
    while (startIndex < lines.length && lines[startIndex].trim() === '') {
      startIndex++;
    }

    // Check if we have any content left
    if (startIndex >= lines.length) {
      return '';
    }

    // Get the first non-empty line
    const firstLine = lines[startIndex].trim();

    // Check if it's a structural element that should not be treated as description
    if (this.isStructuralElement(firstLine)) {
      return '';
    }

    // If it passes all checks, it's a valid description
    return firstLine;
  }

  private isStructuralElement(line: string): boolean {
    const trimmed = line.trim();

    // Check for markdown headers (any level)
    if (trimmed.startsWith('#')) {
      return true;
    }

    // Check for bold markdown fields like **Returns:**
    if (trimmed.startsWith('**') && trimmed.includes(':**')) {
      return true;
    }

    // Check for list items
    if (
      trimmed.startsWith('-') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('+')
    ) {
      return true;
    }

    // Check for code blocks
    if (trimmed.startsWith('```')) {
      return true;
    }

    return false;
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

    // Find parameters section using pattern matching
    const paramSection = this.extractParameterSection(section, sectionName);
    if (!paramSection) return [];

    // Parse parameter definitions using pattern matching
    const parameters = this.parseParameterDefinitions(paramSection);
    rawParameters.push(...parameters);

    // Process raw parameters to handle complex types
    return this.processComplexParameters(rawParameters, parameterLocation);
  }

  private extractParameterSection(
    section: string,
    sectionName: string
  ): string | null {
    // Look for the section header: ##### sectionName
    const headerToFind = `##### ${sectionName}`;
    const headerIndex = section.indexOf(headerToFind);

    if (headerIndex === -1) {
      return null;
    }

    // Start after the header
    const startIndex = headerIndex + headerToFind.length;

    // Find the end of this section (next header or end of content)
    const remainingContent = section.substring(startIndex);

    // Look for the next header (any level starting with #)
    const lines = remainingContent.split('\n');
    let endIndex = lines.length;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#')) {
        endIndex = i;
        break;
      }
    }

    // Extract the section content
    const sectionContent = lines.slice(0, endIndex).join('\n');
    return sectionContent.trim();
  }

  private parseParameterDefinitions(paramSection: string): Array<{
    name: string;
    description: string;
    required?: boolean;
    enumValues?: string[];
  }> {
    const parameters: Array<{
      name: string;
      description: string;
      required?: boolean;
      enumValues?: string[];
    }> = [];

    const lines = paramSection.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Skip empty lines
      if (line === '') {
        i++;
        continue;
      }

      // Check if this line could be a parameter name
      if (this.isValidParameterName(line) && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();

        // Check if the next line starts with ':' (parameter description)
        if (nextLine.startsWith(':')) {
          const paramName = line;
          let description = nextLine.substring(1).trim(); // Remove the ':'

          // Collect multi-line descriptions
          let j = i + 2;
          while (j < lines.length) {
            const descLine = lines[j].trim();

            // Stop if we hit another parameter or empty line followed by parameter
            if (
              this.isValidParameterName(descLine) &&
              j + 1 < lines.length &&
              lines[j + 1].trim().startsWith(':')
            ) {
              break;
            }

            // Stop if we hit an empty line and the next non-empty line is a parameter
            if (descLine === '') {
              let nextNonEmpty = j + 1;
              while (
                nextNonEmpty < lines.length &&
                lines[nextNonEmpty].trim() === ''
              ) {
                nextNonEmpty++;
              }
              if (
                nextNonEmpty < lines.length &&
                this.isValidParameterName(lines[nextNonEmpty].trim()) &&
                nextNonEmpty + 1 < lines.length &&
                lines[nextNonEmpty + 1].trim().startsWith(':')
              ) {
                break;
              }
            }

            // Add to description if it's not empty
            if (descLine !== '') {
              description += ' ' + descLine;
            }

            j++;
          }

          // Process the parameter
          const cleanDesc = this.cleanMarkdown(description);
          const required =
            cleanDesc.includes('{{<required>}}') ||
            cleanDesc.includes('required');
          const enumValues = this.extractEnumValuesFromDescription(cleanDesc);

          parameters.push({
            name: paramName,
            description: cleanDesc.replace(/\{\{<required>\}\}\s*/g, ''),
            required: required ? true : undefined,
            enumValues: enumValues.length > 0 ? enumValues : undefined,
          });

          i = j;
          continue;
        }
      }

      i++;
    }

    return parameters;
  }

  private isValidParameterName(name: string): boolean {
    // Parameter names should start with letter or underscore
    // and contain only letters, numbers, underscores, and square brackets
    const pattern = /^[a-zA-Z_][a-zA-Z0-9_\[\]]*$/;
    return pattern.test(name);
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
}

export { MethodParser };
