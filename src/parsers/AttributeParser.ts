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

    // Match each attribute definition in this section
    // Capture more content after Type to get enum values
    // Updated to match level 3 (###), 4 (####), and 5 (#####) headings for nested attributes
    // Fixed to handle both {{%...%}} and {{<...>}} Hugo shortcode patterns
    const attributeRegex =
      /#{3,5} `([^`]+)`[^{]*(?:\{\{[%<]([^%>]+)[%>]\}\})?\s*\{#[^}]+\}\s*\n\n\*\*Description:\*\*\s*([^\n]+).*?\n\*\*Type:\*\*\s*([^\n]+)(.*?)(?=\n\*\*Version history:\*\*|\n\*\*|\n#{3,5}|$)/gs;

    let match;
    while ((match = attributeRegex.exec(content)) !== null) {
      const [, name, modifiers, description, type, additionalContent] = match;

      const cleanedType = EntityParsingUtils.cleanType(type.trim());
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

      // Extract enum values if this is an enumerable type
      if (cleanedType.toLowerCase().includes('enumerable')) {
        const enumValues =
          EntityParsingUtils.extractEnumValues(additionalContent);
        if (enumValues.length > 0) {
          attribute.enumValues = enumValues;
        }
      }

      attributes.push(attribute);
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

      const cleanedType = EntityParsingUtils.cleanType(type.trim());
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
