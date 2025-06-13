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
        try {
          examples[statusCode] = JSON.parse(jsonContent);
        } catch (error) {
          // If JSON parsing fails, skip this example (don't break the build)
          console.warn(
            `Failed to parse response example for ${statusCode}: ${error}`
          );
        }
      }
    }

    return examples;
  }
}
