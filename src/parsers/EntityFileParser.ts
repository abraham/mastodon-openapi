import * as path from 'path';
import matter from 'gray-matter';
import { EntityClass } from '../interfaces/EntityClass';
import { EntityAttribute } from '../interfaces/EntityAttribute';
import { AttributeParser } from './AttributeParser';
import { VersionParser } from './VersionParser';
import { ExampleParser } from './ExampleParser';
import { EntityParsingUtils } from './EntityParsingUtils';
import { MarkdownDocument } from '../document/MarkdownDocument';

/**
 * Handles parsing entities from dedicated entity files
 */
export class EntityFileParser {
  /**
   * Parses entities from a single entity document
   * @param content Raw markdown, including frontmatter
   * @param documentId Document name such as `Account.md`, used for diagnostics
   *   and for the `sourceFile` back-link
   */
  static parseEntityFile(content: string, documentId: string): EntityClass[] {
    const parsed = matter(content);

    // Skip draft files
    if (parsed.data.draft === true) {
      return [];
    }

    const entities: EntityClass[] = [];

    // Extract source file name (without path and extension)
    const sourceFile = path.basename(documentId, '.md');

    // Extract main class name from frontmatter title
    const className = parsed.data.title;
    if (!className) {
      console.warn(`No title found in ${documentId}`);
      return entities;
    }

    // Extract description from frontmatter
    const description = parsed.data.description || '';

    // Parse main entity attributes from markdown content
    const attributes = this.parseAttributes(parsed.content, className);

    // Remove nullable flag if all attributes were added in the same version
    const adjustedAttributes =
      EntityParsingUtils.removeNullableIfSameVersion(attributes);

    // Extract nested hash entities and update parent attributes
    const { processedAttributes, nestedEntities } =
      this.extractNestedHashEntities(className, adjustedAttributes, sourceFile);

    // Parse example from the content
    const example = ExampleParser.parseEntityExample(parsed.content, className);

    // Collect all version numbers from attributes
    const allVersions: string[] = [];
    for (const attr of processedAttributes) {
      if (attr.versions) {
        allVersions.push(...attr.versions);
      }
    }

    entities.push({
      name: className,
      description,
      attributes: processedAttributes,
      versions: allVersions.length > 0 ? allVersions : undefined,
      example: example || undefined,
      sourceFile,
    });

    // Add extracted nested entities
    entities.push(...nestedEntities);

    // Parse additional entity definitions in the same file
    const additionalEntities = this.parseAdditionalEntities(
      parsed.content,
      sourceFile
    );
    entities.push(...additionalEntities);

    return entities;
  }

  /**
   * Parses main entity attributes from content
   */
  private static parseAttributes(
    content: string,
    entityName: string
  ): EntityAttribute[] {
    const attributes: EntityAttribute[] = [];
    const document = MarkdownDocument.fromBody(content);

    const topLevel = (title: string) =>
      document
        .allSections()
        .find(
          (section) =>
            section.heading.level === 2 && section.heading.title === title
        );

    // Attribute subsections live under the heading, so take the full content
    const attributesSection = topLevel('Attributes');
    if (attributesSection) {
      attributes.push(
        ...AttributeParser.parseAttributesFromSection(
          attributesSection.content,
          entityName
        )
      );
    }

    // Also look for "## Data attributes" section and convert to data[][] format
    const dataAttributesSection = topLevel('Data attributes');
    if (dataAttributesSection) {
      const dataAttributes = AttributeParser.parseAttributesFromSection(
        dataAttributesSection.content,
        entityName
      );

      // Convert each data attribute to data[][fieldname] format
      for (const dataAttr of dataAttributes) {
        attributes.push({
          ...dataAttr,
          name: `data[][${dataAttr.name}]`,
        });
      }
    }

    return attributes;
  }

  /**
   * Parses additional entity definitions from the same file
   */
  private static parseAdditionalEntities(
    content: string,
    sourceFile: string
  ): EntityClass[] {
    const entities: EntityClass[] = [];

    // Find all sections that define additional entities
    // Pattern 1: ## [EntityName] entity attributes {#[id]} - extract just EntityName, not "EntityName entity"
    // Pattern 2: ## [EntityName] attributes {#[id]}
    // Pattern 3: ## `[EntityName]` entity {#[id]} - backtick-wrapped entity name
    // Pattern 4: ## [EntityName] entity {#[id]} - plain entity name (no backticks)
    const entitySectionRegex1 = /## ([^#\n]+?) entity attributes \{#([^}]+)\}/g;
    const entitySectionRegex2 = /## ([^#\n]+?) attributes \{#([^}]+)\}/g;
    const entitySectionRegex3 = /## `([^`]+)` entity \{#([^}]+)\}/g;
    const entitySectionRegex4 = /## ([^#\n`]+?) entity \{#([^}]+)\}/g;

    // Process all patterns
    [
      entitySectionRegex1,
      entitySectionRegex2,
      entitySectionRegex3,
      entitySectionRegex4,
    ].forEach((regex) => {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const [fullMatch, entityNameRaw, entityId] = match;

        // For Pattern 1 (entity attributes), remove " entity" suffix if present
        // This handles cases like "CredentialAccount entity attributes" -> "CredentialAccount"
        const entityName = entityNameRaw.trim().replace(/\s+entity$/, '');

        // Skip if we already processed this entity (avoid duplicates)
        if (entities.some((e) => e.name === entityName)) {
          continue;
        }

        // Find the content for this entity (from this heading to the next ## heading or end of file)
        const startIndex = match.index + fullMatch.length;

        // Check if the next section is an "## Attributes" heading
        // If so, we need to include it in the entity content
        let endIndex = content.length;
        const remainingContent = content.substring(startIndex);
        const nextAttributesMatch =
          remainingContent.match(/\n## Attributes\s*\n/);

        if (nextAttributesMatch && nextAttributesMatch.index !== undefined) {
          // Found "## Attributes" - find the section after that
          const afterAttributesStart =
            startIndex +
            nextAttributesMatch.index +
            nextAttributesMatch[0].length;
          const afterAttributesContent =
            content.substring(afterAttributesStart);
          const nextSectionMatch = afterAttributesContent.match(/\n## /);

          if (nextSectionMatch && nextSectionMatch.index !== undefined) {
            endIndex = afterAttributesStart + nextSectionMatch.index;
          }
          // If no next section found, use the rest of the file (endIndex already set to content.length)
        } else {
          // No "## Attributes" section found, look for next ## heading
          const nextSectionMatch = remainingContent.match(/\n## /);
          if (nextSectionMatch && nextSectionMatch.index !== undefined) {
            endIndex = startIndex + nextSectionMatch.index;
          }
        }

        const entityContent = content.substring(startIndex, endIndex);

        // Parse attributes for this entity
        const attributes = AttributeParser.parseAttributesFromSection(
          entityContent,
          entityName
        );

        // Remove nullable flag if all attributes were added in the same version
        const adjustedAttributes =
          EntityParsingUtils.removeNullableIfSameVersion(attributes);

        // Collect all version numbers from attributes
        const entityVersions: string[] = [];
        for (const attr of adjustedAttributes) {
          if (attr.versions) {
            entityVersions.push(...attr.versions);
          }
        }

        entities.push({
          name: entityName,
          description: `Additional entity definition for ${entityName}`,
          attributes: adjustedAttributes,
          versions: entityVersions.length > 0 ? entityVersions : undefined,
          sourceFile,
        });
      }
    });

    return entities;
  }

  /**
   * Extracts nested hash entities from attributes and updates parent attributes
   */
  private static extractNestedHashEntities(
    parentEntityName: string,
    attributes: EntityAttribute[],
    sourceFile: string
  ): { processedAttributes: EntityAttribute[]; nestedEntities: EntityClass[] } {
    const nestedEntities: EntityClass[] = [];
    const processedAttributes: EntityAttribute[] = [];
    const nestedFieldGroups = new Map<string, EntityAttribute[]>();

    // Group attributes by nested field pattern (e.g., "history[][day]" -> "history")
    for (const attribute of attributes) {
      const nestedMatch = attribute.name.match(/^([^[]+)\[\]\[([^\]]+)\]$/);

      if (nestedMatch) {
        const [, parentFieldName, childFieldName] = nestedMatch;

        if (!nestedFieldGroups.has(parentFieldName)) {
          nestedFieldGroups.set(parentFieldName, []);
        }

        // Create a new attribute for the child field (without the parent prefix)
        const childAttribute: EntityAttribute = {
          name: childFieldName,
          type: attribute.type,
          description: attribute.description,
          optional: attribute.optional,
          deprecated: attribute.deprecated,
          enumValues: attribute.enumValues,
          versions: attribute.versions,
        };

        nestedFieldGroups.get(parentFieldName)!.push(childAttribute);
      } else {
        // Regular attribute, keep as-is
        processedAttributes.push(attribute);
      }
    }

    // Create nested entities and update parent attributes
    for (const [
      parentFieldName,
      childAttributes,
    ] of nestedFieldGroups.entries()) {
      // Generate entity name by combining parent entity name and field name
      // This ensures uniqueness and clarity
      const nestedEntityName = `${parentEntityName}${parentFieldName.charAt(0).toUpperCase() + parentFieldName.slice(1)}`;

      // Collect all version numbers from child attributes
      const childVersions: string[] = [];
      for (const childAttr of childAttributes) {
        if (childAttr.versions) {
          childVersions.push(...childAttr.versions);
        }
      }

      // Create the nested entity
      nestedEntities.push({
        name: nestedEntityName,
        description: `Nested entity extracted from ${parentEntityName}.${parentFieldName}`,
        attributes: childAttributes,
        versions: childVersions.length > 0 ? childVersions : undefined,
        sourceFile,
      });

      // Update the parent attribute type from "Array of Hash" to "Array of [EntityName]"
      const parentAttribute = processedAttributes.find(
        (attr) => attr.name === parentFieldName
      );
      if (parentAttribute && parentAttribute.type === 'Array of Hash') {
        parentAttribute.type = `Array of [${nestedEntityName}]`;
      }
    }

    return { processedAttributes, nestedEntities };
  }
}
