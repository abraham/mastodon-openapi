/**
 * Utility functions for entity parsing operations
 */
export class EntityParsingUtils {
  /**
   * Cleans type strings by removing markdown formatting and Hugo shortcodes
   */
  static cleanType(type: string): string {
    // Remove markdown formatting and extra text
    return type
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\{\{<[^>]+>\}\}/g, '') // Remove Hugo shortcodes
      .replace(/\\\s*$/, '') // Remove trailing backslashes
      .trim();
  }

  /**
   * Cleans description strings by removing markdown formatting
   */
  static cleanDescription(description: string): string {
    // Remove markdown formatting and trailing backslashes
    return description
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\\\s*$/, '') // Remove trailing backslashes
      .trim();
  }

  /**
   * Extracts enum values from content using pattern matching
   */
  static extractEnumValues(content: string): string[] {
    const enumValues: string[] = [];

    // Look for enum value patterns like `value` = description
    const enumPattern = /`([^`]+)`\s*=\s*[^\n]+/g;
    let match;

    while ((match = enumPattern.exec(content)) !== null) {
      const enumValue = match[1].trim();
      if (enumValue) {
        enumValues.push(enumValue);
      }
    }

    return enumValues;
  }
}
