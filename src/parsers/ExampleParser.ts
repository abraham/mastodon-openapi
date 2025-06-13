/**
 * Handles parsing of JSON examples from markdown content
 */
export class ExampleParser {
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

    try {
      return JSON.parse(jsonContent);
    } catch (error) {
      // If JSON parsing fails, return null (don't break the build)
      console.warn(`Failed to parse example JSON: ${error}`);
      return null;
    }
  }

  /**
   * Parses JSON examples from method response sections
   * Returns a map of status codes to examples
   */
  static parseMethodResponseExamples(content: string): Record<string, any> {
    const examples: Record<string, any> = {};

    // Look for response sections like "##### 200: OK" followed by JSON blocks
    const responseRegex = /##### (\d{3}):[^\n]*\n\s*```json\s*\n([\s\S]*?)\n\s*```/gi;
    
    let match;
    while ((match = responseRegex.exec(content)) !== null) {
      const statusCode = match[1];
      const jsonContent = match[2].trim();
      
      if (jsonContent) {
        try {
          examples[statusCode] = JSON.parse(jsonContent);
        } catch (error) {
          // If JSON parsing fails, skip this example (don't break the build)
          console.warn(`Failed to parse response example for ${statusCode}: ${error}`);
        }
      }
    }

    return examples;
  }
}