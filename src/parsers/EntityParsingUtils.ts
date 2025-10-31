import { EntityAttribute } from '../interfaces/EntityAttribute';

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
    // Also remove complex type prefixes like "Array of String.", "Array of Integer.", etc.
    // Also remove "String or Array of..." patterns
    // Match case-insensitive type prefix followed by period and space at start of string
    const typePattern =
      /^(String(\s+or\s+Array\s+of\s+(String|Strings?)(\s+\([^)]+\))?)?|Boolean|Integer|Number|Array(\s+of\s+(String|Boolean|Integer|Number|Object|Hash))?|Object|Hash)\.\s*/i;
    cleaned = cleaned.replace(typePattern, '');

    return cleaned.trim();
  }

  /**
   * Strips redundant type prefixes from descriptions
   */
  static stripTypePrefix(description: string): string {
    // Remove redundant type prefixes like "String.", "Boolean.", etc.
    // Also remove complex type prefixes like "Array of String.", "Array of Integer.", etc.
    // Also remove "String or Array of..." patterns
    // Match case-insensitive type prefix followed by period and space at start of string
    const typePattern =
      /^(String(\s+or\s+Array\s+of\s+(String|Strings?)(\s+\([^)]+\))?)?|Boolean|Integer|Number|Array(\s+of\s+(String|Boolean|Integer|Number|Object|Hash))?|Object|Hash)\.\s*/i;
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

  /**
   * Checks if all attributes were added in the same version and removes nullable flag if true.
   * If all attributes of an entity were added in the same version, the entity itself was
   * introduced in that version, so older versions wouldn't know about this entity type.
   * Therefore, attributes shouldn't be marked as nullable in this case.
   *
   * Note: This only removes the nullable flag, not the optional flag. Optional fields
   * (marked with {{%optional%}} in docs) should remain optional even if all attributes
   * share the same version.
   */
  static removeNullableIfSameVersion(
    attributes: EntityAttribute[]
  ): EntityAttribute[] {
    // Only process if we have attributes
    if (attributes.length === 0) {
      return attributes;
    }

    // Extract the "added" version for each attribute that has version information
    const addedVersions = new Set<string>();
    const attributesWithVersions: EntityAttribute[] = [];

    for (const attr of attributes) {
      // Consider all attributes that have version information
      if (attr.versions && attr.versions.length > 0) {
        const earliestVersion = this.getEarliestVersion(attr.versions);
        addedVersions.add(earliestVersion);
        attributesWithVersions.push(attr);
      }
    }

    // If all attributes with version information were added in the same version,
    // and we have at least one such attribute, remove only the nullable flag
    if (addedVersions.size === 1 && attributesWithVersions.length > 0) {
      return attributes.map((attr) => {
        // Only remove nullable from attributes that have version information
        if (attr.versions && attr.versions.length > 0) {
          const earliestVersion = this.getEarliestVersion(attr.versions);

          if (addedVersions.has(earliestVersion) && attr.nullable === true) {
            // Create a new object without the nullable property
            const result: EntityAttribute = {
              name: attr.name,
              type: attr.type,
              description: attr.description,
            };

            // Preserve other properties if they exist
            if (attr.optional !== undefined) result.optional = attr.optional;
            if (attr.deprecated !== undefined)
              result.deprecated = attr.deprecated;
            if (attr.enumValues !== undefined)
              result.enumValues = attr.enumValues;
            if (attr.versions !== undefined) result.versions = attr.versions;

            return result;
          }
        }
        return attr;
      });
    }

    return attributes;
  }

  /**
   * Gets the earliest version from an array of version strings
   * @param versions Array of version strings (e.g., ["4.4.0", "4.5.0"])
   * @returns The earliest version string
   */
  private static getEarliestVersion(versions: string[]): string {
    return versions.reduce((earliest, current) => {
      return this.getMinVersion(earliest, current);
    });
  }

  /**
   * Compares two version strings and returns the smaller (earlier) one
   * @param version1 First version string (e.g., "1.2.3")
   * @param version2 Second version string (e.g., "2.1.0")
   * @returns The earlier version string, or version1 if they're equal
   */
  private static getMinVersion(version1: string, version2: string): string {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part < v2Part) {
        return version1;
      } else if (v2Part < v1Part) {
        return version2;
      }
    }

    return version1; // They are equal, return first one
  }
}
