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
   * Cleans description strings by removing markdown formatting and redundant type prefixes
   */
  static cleanDescription(description: string): string {
    // Remove markdown formatting and trailing backslashes
    let cleaned = description
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\\\s*$/, '') // Remove trailing backslashes
      .trim();

    // Remove redundant type prefixes like "String.", "Boolean.", etc.
    // Match case-insensitive type prefix followed by period and space at start of string
    const typePattern = /^(String|Boolean|Integer|Number|Array|Object|Hash)\.\s*/i;
    cleaned = cleaned.replace(typePattern, '');

    return cleaned.trim();
  }

  /**
   * Strips redundant type prefixes from descriptions
   */
  static stripTypePrefix(description: string): string {
    // Remove redundant type prefixes like "String.", "Boolean.", etc.
    // Match case-insensitive type prefix followed by period and space at start of string
    const typePattern = /^(String|Boolean|Integer|Number|Array|Object|Hash)\.\s*/i;
    return description.replace(typePattern, '').trim();
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
