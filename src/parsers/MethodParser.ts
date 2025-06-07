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
    const nameMatch = section.match(/^## ([^{]+)\{#[^}]+\}/m);
    if (!nameMatch) return null;

    const name = nameMatch[1].trim();

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

    // Parse parameters from Form data parameters section
    const parameters = this.parseParameters(section);

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

  private parseParameters(section: string): ApiParameter[] {
    const parameters: ApiParameter[] = [];

    // Find parameters section
    const paramMatch = section.match(
      /##### Form data parameters\s*([\s\S]*?)(?=\n#|$)/
    );
    if (!paramMatch) return parameters;

    const paramSection = paramMatch[1];

    // Match parameter definitions: parameter_name\n: description
    const paramRegex =
      /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\n:\s*([^]*?)(?=\n[a-zA-Z_]|\n\n|$)/gm;

    let match;
    while ((match = paramRegex.exec(paramSection)) !== null) {
      const [, name, desc] = match;

      const cleanDesc = this.cleanMarkdown(desc.trim());
      const required =
        cleanDesc.includes('{{<required>}}') || cleanDesc.includes('required');

      parameters.push({
        name: name.trim(),
        description: cleanDesc.replace(/\{\{<required>\}\}\s*/g, ''),
        required: required ? true : undefined,
      });
    }

    return parameters;
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
    return text
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\{\{<[^>]+>\}\}/g, '') // Remove Hugo shortcodes
      // For returns field, preserve entity names but remove the link part: [EntityName](link) -> [EntityName]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '[$1]')
      .replace(/\\\s*$/, '') // Remove trailing backslashes
      .trim();
  }
}

export { MethodParser };
