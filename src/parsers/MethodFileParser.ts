import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';
import { ApiMethod } from '../interfaces/ApiMethod';
import { MethodSectionParser } from './MethodSectionParser';

/**
 * Handles parsing individual method files
 */
export class MethodFileParser {
  private methodSectionParser: MethodSectionParser;

  constructor() {
    this.methodSectionParser = new MethodSectionParser();
  }

  /**
   * Parse a single method file
   */
  public parseMethodFile(filePath: string): ApiMethodsFile | null {
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

  /**
   * Parse all methods from markdown content
   */
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

        const method = this.methodSectionParser.parseMethodSection(subSection.trim());
        if (method) {
          methods.push(method);
        }
      }
    }

    return methods;
  }
}