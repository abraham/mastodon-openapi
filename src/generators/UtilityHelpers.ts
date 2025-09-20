/**
 * Utility helper functions for string manipulation and naming conventions
 */
class UtilityHelpers {
  /**
   * Convert string to PascalCase
   */
  public toPascalCase(str: string): string {
    return str
      .split(/[^a-zA-Z0-9]+/)
      .filter((word) => word.length > 0)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Convert plural word to singular form
   */
  public toSingular(word: string): string {
    // Handle common plural forms
    if (word.endsWith('ies')) {
      return word.slice(0, -3) + 'y'; // stories -> story
    } else if (word.endsWith('ines')) {
      return word.slice(0, -1); // timelines -> timeline
    } else if (word.endsWith('es')) {
      return word.slice(0, -2); // statuses -> status
    } else if (word.endsWith('s')) {
      return word.slice(0, -1); // accounts -> account
    }
    return word;
  }

  /**
   * Convert PascalCase entity name to snake_case property name
   */
  public entityNameToPropertyName(entityName: string): string {
    // Convert PascalCase to snake_case
    return entityName.replace(/([A-Z])/g, (match, letter, index) => {
      return index === 0 ? letter.toLowerCase() : '_' + letter.toLowerCase();
    });
  }

  /**
   * Sanitize schema name to be OpenAPI compliant and convert to PascalCase
   */
  public sanitizeSchemaName(name: string): string {
    // Replace :: with _ and spaces with _ to normalize separators
    // OpenAPI schema names must match ^[a-zA-Z0-9\.\-_]+$
    const normalized = name.replace(/::/g, '_').replace(/\s+/g, '_');

    // If no underscores remain and it's already properly cased, return as-is
    if (!normalized.includes('_')) {
      // If it's already in PascalCase (starts with uppercase), return as-is
      if (/^[A-Z]/.test(normalized)) {
        return normalized;
      }
      // Otherwise, just capitalize the first letter
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    // Convert to PascalCase by splitting on underscores and capitalizing each word
    // Preserve original casing of words to handle cases like EmailBlock properly
    return normalized
      .split('_')
      .filter((word) => word.length > 0) // Remove empty segments
      .map((word) => {
        // If word is all uppercase, convert to proper case
        if (word === word.toUpperCase()) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        // Otherwise just capitalize first letter and preserve rest
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join('');
  }
}

export { UtilityHelpers };
