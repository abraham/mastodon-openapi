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
    const cleanedContent = jsonContent
      .split('\n')
      .map((line) => {
        // Find // that's not inside a string
        // Simple approach: remove // and everything after it
        // This might be overly aggressive but handles common cases
        const commentIndex = line.indexOf('//');
        if (commentIndex !== -1) {
          // Check if // is inside quotes by counting quotes before it
          const beforeComment = line.substring(0, commentIndex);
          const quoteCount = (beforeComment.match(/"/g) || []).length;
          // If odd number of quotes, we're inside a string, don't remove
          if (quoteCount % 2 === 0) {
            return line.substring(0, commentIndex).trimEnd();
          }
        }
        return line;
      })
      .join('\n')
      .trim();

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
