/**
 * Handles parsing of JSON examples from markdown content
 */
export class ExampleParser {
  /**
   * Attempts to parse JSON with improved error handling
   * 1. Strips out comments (e.g. // ...) before parsing
   * 2. If parsing fails, wraps content in {} and tries again
   */
  private static parseJsonWithFallback(jsonContent: string): any | null {
    if (!jsonContent.trim()) {
      return null;
    }

    // First, strip out line comments (// ...)
    // This handles comments at the end of lines
    let cleanedContent = jsonContent
      .split('\n')
      .map((line) => {
        // Find // that's not inside a string
        // More robust approach: track if we're inside a string
        let inString = false;
        let escaped = false;
        let commentIndex = -1;
        
        for (let i = 0; i < line.length - 1; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          if (escaped) {
            escaped = false;
            continue;
          }
          
          if (char === '\\') {
            escaped = true;
            continue;
          }
          
          if (char === '"') {
            inString = !inString;
            continue;
          }
          
          // If we're not in a string and we find //, mark it
          if (!inString && char === '/' && nextChar === '/') {
            commentIndex = i;
            break;
          }
        }
        
        if (commentIndex !== -1) {
          return line.substring(0, commentIndex).trimEnd();
        }
        
        return line;
      })
      .join('\n')
      .trim();

    // Remove trailing commas before closing braces/brackets
    // This handles cases where comments were removed leaving trailing commas
    cleanedContent = cleanedContent
      .replace(/,(\s*[}\]])/g, '$1');

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
    // Look for "## Example" section followed by a JSON code block
    const exampleMatch = content.match(
      /## Example\s*\n\s*```json\s*\n([\s\S]*?)\n\s*```/i
    );

    if (!exampleMatch) {
      return null;
    }

    const jsonContent = exampleMatch[1].trim();
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

    // Split content by response headers to process each response section individually
    const responseSections = content.split(/(?=##### \d{3}:)/);

    for (const section of responseSections) {
      // Check if this section contains a response status header
      const headerMatch = section.match(/^##### (\d{3}):/);
      if (!headerMatch) {
        continue;
      }

      const statusCode = headerMatch[1];

      // Look for JSON blocks within this response section
      const jsonMatch = section.match(/```json\s*\n([\s\S]*?)\n\s*```/);
      if (!jsonMatch) {
        continue;
      }

      const jsonContent = jsonMatch[1].trim();
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
