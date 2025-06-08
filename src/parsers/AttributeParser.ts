import { EntityAttribute } from '../interfaces/EntityAttribute';

/**
 * Handles parsing of entity attributes from markdown content
 */
export class AttributeParser {
  /**
   * Parse attributes from markdown content
   */
  public parseAttributes(content: string): EntityAttribute[] {
    const attributes: EntityAttribute[] = [];

    // Find the "## Attributes" section (for main entity only)
    // Stop at any additional entity definitions
    const attributesMatch = content.match(
      /## Attributes\s*([\s\S]*?)(?=\n## .* entity attributes|\n## |$)/
    );
    if (!attributesMatch) {
      return attributes;
    }

    const attributesSection = attributesMatch[1];
    return this.parseAttributesFromSection(attributesSection);
  }

  /**
   * Parse attributes from a markdown section
   */
  public parseAttributesFromSection(content: string): EntityAttribute[] {
    const attributes: EntityAttribute[] = [];

    // Match each attribute definition in this section
    // Capture more content after Type to get enum values
    // Updated to match level 3 (###), 4 (####), and 5 (#####) headings for nested attributes
    // Fixed to handle both {{%...%}} and {{<...>}} Hugo shortcode patterns
    const attributeRegex =
      /#{3,5} `([^`]+)`[^{]*(?:\{\{[%<]([^%>]+)[%>]\}\})?\s*\{#[^}]+\}\s*\n\n\*\*Description:\*\*\s*([^\n]+).*?\n\*\*Type:\*\*\s*([^\n]+)(.*?)(?=\n\*\*Version history:\*\*|\n\*\*|\n#{3,5}|$)/gs;

    let match;
    while ((match = attributeRegex.exec(content)) !== null) {
      const [, name, modifiers, description, type, additionalContent] = match;

      const cleanedType = this.cleanType(type.trim());
      const cleanedDescription = this.cleanDescription(description.trim());

      // Check for optional and deprecated markers
      const optional = modifiers?.includes('optional') || false;
      const deprecated = modifiers?.includes('deprecated') || false;

      // Extract enum values from the additional content
      const enumValues = this.extractEnumValues(additionalContent);

      attributes.push({
        name: name.trim(),
        type: cleanedType,
        description: cleanedDescription,
        optional: optional || undefined,
        deprecated: deprecated || undefined,
        enumValues: enumValues.length > 0 ? enumValues : undefined,
      });
    }

    return attributes;
  }

  /**
   * Parse entity attributes specifically from method files
   */
  public parseMethodEntityAttributes(content: string): EntityAttribute[] {
    const attributes: EntityAttribute[] = [];

    // Method files may have slightly different patterns for entity attributes
    // Looking for patterns like:
    // - id (String): The ID of the entity
    // - name (String, optional): The name
    const methodAttrRegex =
      /^-\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]+)\)\s*:\s*([^]*?)(?=\n-|\n\n|$)/gm;

    let match;
    while ((match = methodAttrRegex.exec(content)) !== null) {
      const [, name, typeInfo, desc] = match;

      const cleanDesc = this.cleanDescription(desc.trim());
      const optional =
        typeInfo.includes('optional') || cleanDesc.includes('optional');
      const deprecated =
        typeInfo.includes('deprecated') || cleanDesc.includes('deprecated');

      // Extract type from type info
      let type = typeInfo.replace(/,?\s*(optional|deprecated)/gi, '').trim();
      type = this.cleanType(type);

      // Extract enum values if present
      const enumValues = this.extractEnumValues(cleanDesc);

      attributes.push({
        name: name.trim(),
        type,
        description: cleanDesc,
        optional: optional || undefined,
        deprecated: deprecated || undefined,
        enumValues: enumValues.length > 0 ? enumValues : undefined,
      });
    }

    return attributes;
  }

  /**
   * Clean and normalize type strings
   */
  private cleanType(type: string): string {
    // Remove markdown formatting and extra text
    return type
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\{\{<[^>]+>\}\}/g, '') // Remove Hugo shortcodes
      .replace(/\\\s*$/, '') // Remove trailing backslashes
      .trim();
  }

  /**
   * Extract enum values from content
   */
  private extractEnumValues(content: string): string[] {
    const enumValues: string[] = [];

    // Look for patterns like "one of: value1, value2, value3"
    const enumPatterns = [
      /one of:?\s*([^.!?]*)/i,
      /must be one of:?\s*([^.!?]*)/i,
      /can be\s+([^.!?]*)/i,
      /either\s+([^.!?]*)/i,
      /possible values:?\s*([^.!?]*)/i,
    ];

    for (const pattern of enumPatterns) {
      const match = content.match(pattern);
      if (match) {
        const text = match[1];
        // Extract values in backticks or quotes
        const valueMatches = text.match(/[`"']([^`"']+)[`"']/g);
        if (valueMatches) {
          for (const valueMatch of valueMatches) {
            const value = valueMatch.slice(1, -1); // Remove quotes/backticks
            if (value && !enumValues.includes(value)) {
              enumValues.push(value);
            }
          }
        }
        break;
      }
    }

    return enumValues;
  }

  /**
   * Clean description by removing markdown formatting
   */
  private cleanDescription(description: string): string {
    return description
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/_(.*?)_/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove code formatting
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/\{\{<[^>]+>\}\}/g, '') // Remove Hugo shortcodes
      .replace(/\\n/g, ' ') // Replace escaped newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}
