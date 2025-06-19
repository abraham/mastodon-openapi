import { EntityAttribute } from '../interfaces/EntityAttribute';
import { EntityParsingUtils } from './EntityParsingUtils';
import { VersionParser } from './VersionParser';

/**
 * Handles parsing of entity attributes from different content formats
 */
export class AttributeParser {
  /**
   * Parses attributes from a section of content (for entity files)
   */
  static parseAttributesFromSection(
    content: string,
    entityName?: string
  ): EntityAttribute[] {
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

      // Skip attributes marked as removed
      if (heading.modifiers && heading.modifiers.includes('removed')) {
        continue;
      }

      // Special exception: exclude 'source' attribute from Suggestion entity
      if (entityName === 'Suggestion' && heading.name === 'source') {
        continue;
      }

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

      // Look for Version history in this specific section
      const versionMatch = sectionContent.match(
        /\*\*Version history:\*\*\\?\s*([\s\S]*?)(?=\n####|\n###|\n##|$)/
      );

      if (descMatch && typeMatch) {
        const description = descMatch[1].trim();
        const typeStr = typeMatch[1].trim();
        const cleanedType = EntityParsingUtils.cleanType(typeStr);

        // Check if this is a nullable field
        const isNullable =
          typeStr.includes('{{<nullable>}}') ||
          typeStr.includes('{{%nullable%}}') ||
          typeStr.includes(' or null') ||
          typeStr.includes(' or empty string');

        const attribute: EntityAttribute = {
          name: heading.name.trim(),
          type: cleanedType,
          description: EntityParsingUtils.cleanDescription(description),
        };

        // Check for optional/deprecated/nullable modifiers
        if (heading.modifiers) {
          if (heading.modifiers.includes('optional')) {
            attribute.optional = true;
            attribute.nullable = true;
          }
          if (heading.modifiers.includes('nullable')) {
            attribute.optional = true;
            attribute.nullable = true;
          }
          if (heading.modifiers.includes('deprecated')) {
            attribute.deprecated = true;
          }
        }

        // Mark as optional if nullable pattern is detected
        if (isNullable) {
          attribute.optional = true;
          attribute.nullable = true;
        }

        // Special case: Account#hide_collections should be nullable due to servers returning null values
        if (entityName === 'Account' && heading.name === 'hide_collections') {
          attribute.nullable = true;
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

        // Extract version numbers from version history
        if (versionMatch) {
          const versionHistory = versionMatch[1].trim();
          const versions = VersionParser.extractVersionNumbers(versionHistory);
          if (versions.length > 0) {
            attribute.versions = versions;
          }
        }

        // Mark attributes as nullable if they were added in a version newer than supported
        if (
          attribute.versions &&
          VersionParser.hasNewerVersion(attribute.versions)
        ) {
          attribute.nullable = true;
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
      /#### `([^`]+)`[^{]*?(?:\{\{%([^%]+)%\}\})?\s*(?:\{#[^}]+\})?\s*\n\n\*\*Description:\*\*\s*([^\n]+?)\\?\s*\n\*\*Type:\*\*\s*([^\n]+?)\\?\s*\n(.*?)\*\*Version history:\*\*\\?\s*([\s\S]*?)(?=\n#### |$)/gs;

    let match;
    while ((match = attributeRegex.exec(content)) !== null) {
      const [
        ,
        name,
        modifiers,
        description,
        type,
        enumContent,
        versionHistory,
      ] = match;

      // Skip attributes marked as removed
      if (modifiers && modifiers.includes('removed')) {
        continue;
      }

      const typeStr = type.trim();
      const cleanedType = EntityParsingUtils.cleanType(typeStr);

      // Check if this is a nullable field
      const isNullable =
        typeStr.includes('{{<nullable>}}') ||
        typeStr.includes('{{%nullable%}}') ||
        typeStr.includes(' or null') ||
        typeStr.includes(' or empty string');

      const attribute: EntityAttribute = {
        name: name.trim(),
        type: cleanedType,
        description: EntityParsingUtils.cleanDescription(description.trim()),
      };

      // Check for optional/deprecated/nullable modifiers
      if (modifiers) {
        if (modifiers.includes('optional')) {
          attribute.optional = true;
          attribute.nullable = true;
        }
        if (modifiers.includes('nullable')) {
          attribute.optional = true;
          attribute.nullable = true;
        }
        if (modifiers.includes('deprecated')) {
          attribute.deprecated = true;
        }
      }

      // Mark as optional if nullable pattern is detected
      if (isNullable) {
        attribute.optional = true;
        attribute.nullable = true;
      }

      // Special case: Account#hide_collections should be nullable due to servers returning null values
      // Note: this covers method entities that might reference Account fields
      if (name === 'hide_collections') {
        attribute.nullable = true;
      }

      // Check for enum values in the content between Type and Version history
      if (enumContent && enumContent.trim()) {
        const enumValues = EntityParsingUtils.extractEnumValues(enumContent);
        if (enumValues.length > 0) {
          attribute.enumValues = enumValues;
        }
      }

      // Extract version numbers from version history
      if (versionHistory && versionHistory.trim()) {
        const versions = VersionParser.extractVersionNumbers(
          versionHistory.trim()
        );
        if (versions.length > 0) {
          attribute.versions = versions;
        }
      }

      // Mark attributes as nullable if they were added in a version newer than supported
      if (
        attribute.versions &&
        VersionParser.hasNewerVersion(attribute.versions)
      ) {
        attribute.nullable = true;
      }

      attributes.push(attribute);
    }

    return attributes;
  }
}
