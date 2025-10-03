import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';
import { ApiMethod, HashAttribute } from '../interfaces/ApiMethod';
import { ParameterParser } from './ParameterParser';
import { TextUtils } from './TextUtils';
import { VersionParser } from './VersionParser';
import { ExampleParser } from './ExampleParser';

class MethodParser {
  private methodsPath: string;

  // Pattern to extract entity names from response code descriptions
  // Matches patterns like "EntityName was created", "EntityName is being processed", etc.
  private static readonly ENTITY_EXTRACTION_PATTERN =
    /^([A-Z][a-zA-Z0-9_]*)\s+(was|is|will be|has been|have been)/;

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

    // Load blocked files from config
    let blockedFiles: string[] = [];
    try {
      const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
      blockedFiles = config.blockedFiles || [];
    } catch (error) {
      console.warn('Could not load blockedFiles from config.json:', error);
    }

    const files = fs
      .readdirSync(this.methodsPath)
      .filter(
        (file) =>
          file.endsWith('.md') &&
          fs.statSync(path.join(this.methodsPath, file)).isFile()
      );

    for (const file of files) {
      // Check if file is blocked
      const relativePath = `methods/${file}`;
      if (blockedFiles.includes(relativePath)) {
        console.log(`Skipping blocked file: ${relativePath}`);
        continue;
      }

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

    // Skip draft files
    if (parsed.data.draft === true) {
      return null;
    }

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

    // Match method sections: only ## Method Name {#anchor} (level 2 headers)
    // Level 3+ headers (###, ####, etc.) should be treated as subsections of the method
    const methodSections = content.split(/(?=^## [^{]*\{#[^}]+\})/m);

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
    // Extract method name and anchor from header: ## Method Name {#anchor} or ### Method Name {#anchor}
    // Handle headers that may contain {{%removed%}} or other Hugo shortcodes
    const nameMatch = section.match(/^##+ (.+?)\s*\{#([^}]+)\}/m);
    if (!nameMatch) return null;

    const name = nameMatch[1].trim();
    const anchor = nameMatch[2].trim();

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
      ? TextUtils.cleanReturnsField(returnsMatch[1].trim())
      : undefined;

    const oauthMatch = section.match(/\*\*OAuth:\*\*\s*([^\\\n]+)/);
    const oauth = oauthMatch
      ? TextUtils.cleanMarkdown(oauthMatch[1].trim())
      : undefined;

    const versionMatch = section.match(
      /\*\*Version history:\*\*\\?\s*([\s\S]*?)(?=\n####|\n##|$)/
    );
    const version = versionMatch
      ? TextUtils.cleanMarkdown(versionMatch[1].trim())
      : undefined;

    // Extract version numbers from the version history
    const versions = version
      ? VersionParser.extractVersionNumbers(version)
      : [];

    // Parse parameters from both Query parameters and Form data parameters sections
    const parameters = ParameterParser.parseAllParameters(section);

    // Parse hash attributes if returns is "Array of Hash"
    let hashAttributes: HashAttribute[] | undefined;
    if (returns && returns.toLowerCase().includes('array of hash')) {
      hashAttributes = this.parseHashAttributes(section);
    }

    // Clean the method name by removing Hugo shortcodes
    const cleanedName = name.replace(/\{\{%deprecated%\}\}/g, '').trim();

    // Check if this is a streaming endpoint (Server Sent Events)
    // Streaming endpoints are all /api/v1/streaming/* except /health which returns plain text
    const isStreaming =
      endpoint.startsWith('/api/v1/streaming/') &&
      !endpoint.endsWith('/health');

    // Parse response examples from the section
    const responseExamples = ExampleParser.parseMethodResponseExamples(section);

    // Parse response codes from the section
    const responseCodes = this.parseMethodResponseCodes(section);

    return {
      name: cleanedName,
      httpMethod,
      endpoint,
      description,
      parameters: parameters.length > 0 ? parameters : undefined,
      returns,
      hashAttributes:
        hashAttributes && hashAttributes.length > 0
          ? hashAttributes
          : undefined,
      oauth,
      version,
      versions: versions.length > 0 ? versions : undefined,
      deprecated: isDeprecated || undefined,
      isStreaming: isStreaming || undefined,
      responseExamples:
        Object.keys(responseExamples).length > 0 ? responseExamples : undefined,
      responseCodes: responseCodes.length > 0 ? responseCodes : undefined,
      anchor,
    };
  }

  /**
   * Parse response codes from method section
   * Looks for patterns like "##### 200: OK" or "##### 202: Accepted"
   * Also extracts return types from the description text if an entity is mentioned
   */
  private parseMethodResponseCodes(
    section: string
  ): Array<{ code: string; description: string; returnType?: string }> {
    const responseCodes: Array<{
      code: string;
      description: string;
      returnType?: string;
    }> = [];

    // Match response headers: ##### 200: OK or ##### 202: Accepted
    const responseHeaderPattern = /^##### (\d{3}):\s*(.+)$/gm;
    let match;

    while ((match = responseHeaderPattern.exec(section)) !== null) {
      const code = match[1];
      const description = match[2].trim();

      // Extract the text after the status code header until the next header or code block
      const startPos = match.index + match[0].length;
      const remainingSection = section.substring(startPos);
      const nextHeaderMatch = remainingSection.match(/\n(#{2,5}|```)/);
      const endPos = nextHeaderMatch
        ? nextHeaderMatch.index
        : remainingSection.length;
      const descriptionText = remainingSection.substring(0, endPos).trim();

      // Try to extract entity name from the beginning of the description text
      let returnType: string | undefined;
      const entityMatch = descriptionText.match(
        MethodParser.ENTITY_EXTRACTION_PATTERN
      );
      if (entityMatch) {
        returnType = entityMatch[1];
      }

      responseCodes.push({ code, description, returnType });
    }

    return responseCodes;
  }

  /**
   * Parse hash attributes from "Each hash in the array will contain the following attributes:" section
   */
  private parseHashAttributes(section: string): HashAttribute[] {
    const attributes: HashAttribute[] = [];

    // Look for the "Each hash in the array will contain the following attributes:" section
    const hashAttributesMatch = section.match(
      /Each hash in the array will contain the following attributes:\s*([\s\S]*?)(?=\n```|\n#+|$)/i
    );

    if (!hashAttributesMatch) {
      return attributes;
    }

    const attributesSection = hashAttributesMatch[1];

    // Parse each attribute definition (field name followed by description with type)
    // Pattern: field_name\n: Type. Description text
    const attributePattern = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\n:\s*([^\n]+)/gm;
    let match;

    while ((match = attributePattern.exec(attributesSection)) !== null) {
      const fieldName = match[1].trim();
      const typeAndDescription = match[2].trim();

      // Split type and description - type is typically at the beginning
      // Patterns like "String (cast from an integer). Description text"
      // or "String (UNIX Timestamp). Description text"
      const typeMatch = typeAndDescription.match(/^([^.]+)\.\s*(.*)$/);

      if (typeMatch) {
        let type = typeMatch[1].trim();
        const description = typeMatch[2].trim();

        // Clean up the type by removing extra info in parentheses for OpenAPI
        // "String (cast from an integer)" -> "String"
        // "String (UNIX Timestamp)" -> "String"
        type = type.replace(/\s*\([^)]+\).*$/, '').trim();

        attributes.push({
          name: fieldName,
          type: type,
          description: description,
        });
      }
    }

    return attributes;
  }
}

export { MethodParser };
