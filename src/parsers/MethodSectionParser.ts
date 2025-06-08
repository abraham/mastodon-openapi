import { ApiMethod } from '../interfaces/ApiMethod';
import { ParameterParser } from './ParameterParser';

/**
 * Handles parsing individual method sections from markdown
 */
export class MethodSectionParser {
  private parameterParser: ParameterParser;

  constructor() {
    this.parameterParser = new ParameterParser();
  }

  /**
   * Parse a method section from markdown
   */
  public parseMethodSection(section: string): ApiMethod | null {
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
    const parameters = this.parameterParser.parseAllParameters(section);

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

  /**
   * Clean returns field by removing markdown formatting
   */
  private cleanReturnsField(returns: string): string {
    return returns
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/_(.*?)_/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '[$1]') // Convert links to entity references
      .replace(/\{\{<[^>]+>\}\}/g, '') // Remove Hugo shortcodes
      .replace(/\\n/g, ' ') // Replace escaped newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
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
