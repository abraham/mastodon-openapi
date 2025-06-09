import { EntityAttribute } from '../interfaces/EntityAttribute';
import { EntityParsingUtils } from './EntityParsingUtils';

/**
 * Handles parsing of entity attributes from different content formats
 */
export class AttributeParser {
  /**
   * Parses attributes from a section of content (for entity files)
   */
  static parseAttributesFromSection(content: string): EntityAttribute[] {
    const attributes: EntityAttribute[] = [];

    // First, find all attribute headings with their positions
    const headingRegex =
      /#{3,5} `([^`]+)`(?:[^{\n]*(?:\{\{[%<]([^%>]+)[%>]\})?[^{\n]*)?(?:\{#[^}]+\})?\s*\n\n/g;
    const headings: Array<{
      name: string;
      modifiers?: string;
      start: number;
      end: number;
    }> = [];

    let headingMatch;
    while ((headingMatch = headingRegex.exec(content)) !== null) {
      headings.push({
        name: headingMatch[1],
        modifiers: headingMatch[2],
        start: headingMatch.index,
        end: headingRegex.lastIndex,
      });
    }

    // For each heading, extract the description and type that immediately follow
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const nextHeadingStart =
        i + 1 < headings.length ? headings[i + 1].start : content.length;

      // Get the content between this heading and the next one (or end of content)
      const sectionContent = content.substring(heading.end, nextHeadingStart);

      // Look for Description and Type in this specific section
      const descMatch = sectionContent.match(
        /\*\*Description:\*\*\s*([^\n\\]+)(?:\\[^\n]*)?/
      );
      const typeMatch = sectionContent.match(
        /\*\*Type:\*\*\s*([^\n\\]+)(?:\\[^\n]*)?/
      );

      if (descMatch && typeMatch) {
        const description = descMatch[1].trim();
        const typeStr = typeMatch[1].trim();
        const cleanedType = EntityParsingUtils.cleanType(typeStr);

        // Check if this is a nullable field
        const isNullable =
          typeStr.includes('{{<nullable>}}') || typeStr.includes(' or null');

        const attribute: EntityAttribute = {
          name: heading.name.trim(),
          type: cleanedType,
          description: EntityParsingUtils.cleanDescription(description),
        };

        // Check for optional/deprecated modifiers
        if (heading.modifiers) {
          if (heading.modifiers.includes('optional')) {
            attribute.optional = true;
          }
          if (heading.modifiers.includes('deprecated')) {
            attribute.deprecated = true;
          }
        }

        // Mark as optional if nullable pattern is detected
        if (isNullable) {
          attribute.optional = true;
        }

        // Extract enum values if this is an enumerable type
        if (cleanedType.toLowerCase().includes('enumerable')) {
          // Look for enum values in the section content
          const enumValues =
            EntityParsingUtils.extractEnumValues(sectionContent);
          if (enumValues.length > 0) {
            attribute.enumValues = enumValues;
          }
        }

        attributes.push(attribute);
      }
    }

    return attributes;
  }

  /**
   * Parses attributes from method entity format content
   */
  static parseMethodEntityAttributes(content: string): EntityAttribute[] {
    const attributes: EntityAttribute[] = [];

    // Match each attribute definition in method entity format
    // Method entities use #### `attribute_name` instead of ### `attribute_name`
    // The format is: #### `attribute_name` {{%optional%}} {#id}
    // Then: **Description:** text\
    // Then: **Type:** type text\
    // Then potentially some enum values or additional content
    // Then: **Version history:**\
    const attributeRegex =
      /#### `([^`]+)`[^{]*?(?:\{\{%([^%]+)%\}\})?\s*(?:\{#[^}]+\})?\s*\n\n\*\*Description:\*\*\s*([^\n]+?)\\?\s*\n\*\*Type:\*\*\s*([^\n]+?)\\?\s*\n(.*?)\*\*Version history:\*\*[^]*?(?=\n#### |$)/gs;

    let match;
    while ((match = attributeRegex.exec(content)) !== null) {
      const [, name, modifiers, description, type, enumContent] = match;

      const typeStr = type.trim();
      const cleanedType = EntityParsingUtils.cleanType(typeStr);

      // Check if this is a nullable field
      const isNullable =
        typeStr.includes('{{<nullable>}}') || typeStr.includes(' or null');

      const attribute: EntityAttribute = {
        name: name.trim(),
        type: cleanedType,
        description: EntityParsingUtils.cleanDescription(description.trim()),
      };

      // Check for optional/deprecated modifiers
      if (modifiers) {
        if (modifiers.includes('optional')) {
          attribute.optional = true;
        }
        if (modifiers.includes('deprecated')) {
          attribute.deprecated = true;
        }
      }

      // Mark as optional if nullable pattern is detected
      if (isNullable) {
        attribute.optional = true;
      }

      // Check for enum values in the content between Type and Version history
      if (enumContent && enumContent.trim()) {
        const enumValues = EntityParsingUtils.extractEnumValues(enumContent);
        if (enumValues.length > 0) {
          attribute.enumValues = enumValues;
        }
      }

      attributes.push(attribute);
    }

    return attributes;
  }
}
