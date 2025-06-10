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
   * Sanitize schema name to be OpenAPI compliant
   */
  public sanitizeSchemaName(name: string): string {
    // Replace :: with _ and spaces with _ to make schema names OpenAPI compliant
    // OpenAPI schema names must match ^[a-zA-Z0-9\.\-_]+$
    return name.replace(/::/g, '_').replace(/\s+/g, '_');
  }
}

export { UtilityHelpers };
