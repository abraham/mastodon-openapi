/**
 * Type inference and enum extraction utilities
 */
export class TypeInference {
  /**
   * Infer type from parameter description
   */
  static inferTypeFromDescription(description: string): string {
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('boolean')) {
      return 'boolean';
    } else if (lowerDesc.match(/\bhash\b/) && !lowerDesc.includes('hashtag')) {
      return 'object';
    } else if (lowerDesc.includes('integer') || lowerDesc.includes('number')) {
      return 'integer';
    } else if (
      lowerDesc.includes('array of string') ||
      lowerDesc.includes('array of id')
    ) {
      return 'string';
    } else if (lowerDesc.includes('array')) {
      return 'string'; // Default for arrays if not specified
    }

    return 'string';
  }

  /**
   * Extract enum values from parameter description
   */
  static extractEnumValuesFromDescription(description: string): string[] {
    const enumValues: string[] = [];

    // Look for patterns like "to `value1`, `value2`, `value3`"
    // This pattern matches the visibility parameter format specifically
    // Make sure it's not part of "due to" by using negative lookbehind
    const toPattern = /(?<!due\s+)to\s+(`[^`]+`(?:\s*,\s*`[^`]+`)*)/gi;
    let match = toPattern.exec(description);
    if (match) {
      const valuesList = match[1];
      const values = valuesList.match(/`([^`]+)`/g);
      if (values && values.length > 1) {
        // Only extract if multiple values found
        for (const value of values) {
          const cleanValue = value.slice(1, -1).trim(); // Remove backticks
          if (cleanValue && !enumValues.includes(cleanValue)) {
            enumValues.push(cleanValue);
          }
        }
      }
    }

    // If we didn't find the "to" pattern, try other patterns
    if (enumValues.length === 0) {
      const patterns = [
        // Pattern for "due to" with mixed backticks and additional text between values
        /due\s+to\s+(.*?)(?:\s+reason|\s+defaults|\.|$)/gi,
        /values?\s*:\s*(`[^`]+`(?:\s*,\s*`[^`]+`)*)/gi,
        /(?:set|choose|select)(?:\s+(?:to|from|between))?\s+(`[^`]+`(?:\s*,\s*`[^`]+`)*)/gi,
        /can\s+be\s+(`[^`]+`(?:\s*,\s*`[^`]+`)*(?:\s*,?\s*or\s+`[^`]+`)?)/gi,
        /(?:include|includes)\s+(`[^`]+`(?:\s*,\s*`[^`]+`)*)/gi,
        // Pattern for "One of" with backticks
        /one\s+of\s+(`[^`]+`(?:\s*,\s*`[^`]+`)*(?:\s*,?\s*or\s+`[^`]+`)?)/gi,
        // Pattern for "One of X, Y, or Z" without backticks
        /one\s+of\s+([a-z_,\s]+?)(?=\.|\s+defaults|\s+$)/gi,
      ];

      for (const pattern of patterns) {
        pattern.lastIndex = 0; // Reset regex state
        const match = pattern.exec(description);
        if (match) {
          const valuesList = match[1];

          // Handle "due to" pattern with mixed formatting
          if (pattern.source.includes('due\\s+to')) {
            // Special handling for "due to" pattern - extract all backticked values
            const backtickValues = valuesList.match(/`([^`]+)`/g) || [];
            const cleanBacktickValues = backtickValues.map((v) =>
              v.slice(1, -1).trim()
            );

            if (cleanBacktickValues.length > 1) {
              for (const value of cleanBacktickValues) {
                if (value && !enumValues.includes(value)) {
                  enumValues.push(value);
                }
              }
            }
          }
          // Handle "One of" pattern - both with and without backticks
          else if (pattern.source.includes('one\\s+of')) {
            if (valuesList.includes('`')) {
              // Pattern with backticks - use original logic
              const values = valuesList.match(/`([^`]+)`/g);
              if (values && values.length > 1) {
                for (const value of values) {
                  const cleanValue = value.slice(1, -1).trim(); // Remove backticks
                  if (cleanValue && !enumValues.includes(cleanValue)) {
                    enumValues.push(cleanValue);
                  }
                }
              }
            } else {
              // Pattern without backticks - split by comma and "or"
              const values = valuesList
                .split(/,|\s+or\s+/)
                .map((v) => v.trim())
                .filter((v) => v && v.length > 0);

              if (values.length > 1) {
                for (const value of values) {
                  const cleanValue = value.trim();
                  if (cleanValue && !enumValues.includes(cleanValue)) {
                    enumValues.push(cleanValue);
                  }
                }
              }
            }
          } else {
            // Original logic for backtick patterns
            const values = valuesList.match(/`([^`]+)`/g);
            if (values && values.length > 1) {
              // Only extract if multiple values found
              for (const value of values) {
                const cleanValue = value.slice(1, -1).trim(); // Remove backticks
                if (cleanValue && !enumValues.includes(cleanValue)) {
                  enumValues.push(cleanValue);
                }
              }
            }
          }
          break; // Found a pattern, don't try others
        }
      }
    }

    return enumValues;
  }

  /**
   * Extract default value from parameter description
   */
  static extractDefaultValueFromDescription(
    description: string
  ): string | undefined {
    // Look for patterns like "Defaults to value" where value can be alphanumeric, underscore, numbers, or surrounded by backticks
    // For non-backtick values, ensure they're followed by period/end or are numbers to avoid matching descriptive phrases
    const defaultsToPattern =
      /defaults?\s+to\s+(?:`([^`]+)`|(\d+)|([a-zA-Z_][a-zA-Z0-9_]*)(?=\.|$))/gi;
    const match = defaultsToPattern.exec(description);

    if (match) {
      // Return the first captured group (backtick content), second (numbers), or third (words at end)
      return (match[1] || match[2] || match[3]).trim();
    }

    return undefined;
  }
}
