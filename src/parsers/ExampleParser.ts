import { MarkdownDocument } from '../document/MarkdownDocument';
import { firstCodeBlock } from '../document/codeBlocks';
import { splitOutsideFences } from '../document/blocks';

/**
 * Handles parsing of JSON examples from markdown content
 */
export class ExampleParser {
  /**
   * Remove line and block comments, ignoring anything inside strings.
   * Newlines are preserved so line-based fallbacks still line up.
   */
  private static stripJsonComments(content: string): string {
    let result = '';
    let inString = false;
    let escaped = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const next = content[i + 1];

      if (inLineComment) {
        if (char === '\n') {
          inLineComment = false;
          result += char;
        }
        continue;
      }

      if (inBlockComment) {
        if (char === '*' && next === '/') {
          inBlockComment = false;
          i++;
        } else if (char === '\n') {
          result += char;
        }
        continue;
      }

      if (inString) {
        result += char;
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        result += char;
        continue;
      }

      if (char === '/' && next === '/') {
        inLineComment = true;
        i++;
        continue;
      }

      if (char === '/' && next === '*') {
        inBlockComment = true;
        i++;
        continue;
      }

      result += char;
    }

    return result;
  }

  /**
   * Attempts to parse JSON with improved error handling
   * 1. Strips out line and block comments before parsing
   * 2. If parsing fails, wraps content in {} and tries again
   */
  private static parseJsonWithFallback(jsonContent: string): any | null {
    if (!jsonContent.trim()) {
      return null;
    }

    let cleanedContent = ExampleParser.stripJsonComments(jsonContent).trim();

    // Remove trailing commas before closing braces/brackets
    // This handles cases where comments were removed leaving trailing commas
    cleanedContent = cleanedContent.replace(/,(\s*[}\]])/g, '$1');

    // Try parsing the cleaned content directly
    try {
      return JSON.parse(cleanedContent);
    } catch (error) {
      // If that fails, try wrapping in braces
      try {
        const wrappedContent = `{${cleanedContent}}`;
        return JSON.parse(wrappedContent);
      } catch (secondError) {
        // If both attempts fail, return null
        return null;
      }
    }
  }
  /**
   * Parses JSON examples from an "## Example" section in entity markdown
   */
  static parseEntityExample(content: string): any | null {
    const section = MarkdownDocument.fromBody(content)
      .allSections()
      .find(
        (candidate) =>
          candidate.heading.level === 2 &&
          candidate.heading.title.toLowerCase() === 'example'
      );

    if (!section) {
      return null;
    }

    // Pages introduce the sample in several ways: directly, after a paragraph,
    // or under a subheading such as `### Image`. Take the first JSON block in
    // the section regardless.
    const block = firstCodeBlock(section.content, 'json');
    if (!block) {
      return null;
    }

    const jsonContent = block.content.trim();
    if (!jsonContent) {
      return null;
    }

    const result = this.parseJsonWithFallback(jsonContent);
    if (result === null) {
      // If JSON parsing fails, return null (don't break the build)
      console.warn(`Failed to parse example JSON: unable to parse content`);
    }
    return result;
  }

  /**
   * Parses JSON examples from method response sections
   * Returns a map of status codes to examples
   */
  static parseMethodResponseExamples(content: string): Record<string, any> {
    const examples: Record<string, any> = {};

    // Split content by response headers, ignoring lines inside fenced samples
    const responseSections = splitOutsideFences(content, (line) =>
      /^##### \d{3}:/.test(line)
    );

    for (const section of responseSections) {
      // Check if this section contains a response status header
      const headerMatch = section.match(/^##### (\d{3}):/);
      if (!headerMatch) {
        continue;
      }

      const statusCode = headerMatch[1];

      // Look for JSON blocks within this response section
      const block = firstCodeBlock(section, 'json');
      if (!block) {
        continue;
      }

      const jsonContent = block.content.trim();
      if (jsonContent) {
        const result = this.parseJsonWithFallback(jsonContent);
        if (result !== null) {
          examples[statusCode] = result;
        } else {
          // If JSON parsing fails, skip this example (don't break the build)
          console.warn(
            `Failed to parse response example for ${statusCode}: unable to parse content`
          );
        }
      }
    }

    return examples;
  }
}
