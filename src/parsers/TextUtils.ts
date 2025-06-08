/**
 * Utility functions for text processing and markdown cleaning
 */
export class TextUtils {
  /**
   * Clean markdown formatting from text
   */
  static cleanMarkdown(text: string): string {
    return (
      text
        .replace(/\*\*/g, '') // Remove bold markdown
        .replace(/\{\{<[^>]+>\}\}/g, '') // Remove Hugo shortcodes
        // Preserve type information in brackets but remove the link part: [Date](link) -> [Date]
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '[$1]')
        .replace(/\\\s*$/, '') // Remove trailing backslashes
        .trim()
    );
  }

  /**
   * Clean returns field text with specific formatting rules
   */
  static cleanReturnsField(text: string): string {
    return (
      text
        .replace(/\*\*/g, '') // Remove bold markdown
        .replace(/\{\{<[^>]+>\}\}/g, '') // Remove Hugo shortcodes
        // For returns field, preserve entity names but remove the link part: [EntityName](link) -> [EntityName]
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '[$1]')
        .replace(/\\\s*$/, '') // Remove trailing backslashes
        .trim()
    );
  }
}
