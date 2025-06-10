import * as fs from 'fs';
import matter from 'gray-matter';
import { EntityClass } from '../interfaces/EntityClass';
import { EntityAttribute } from '../interfaces/EntityAttribute';
import { AttributeParser } from './AttributeParser';

/**
 * Handles parsing entities from dedicated entity files
 */
export class EntityFileParser {
  /**
   * Parses entities from a single entity file
   */
  static parseEntityFile(filePath: string): EntityClass[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(content);

    // Skip draft files
    if (parsed.data.draft === true) {
      return [];
    }

    const entities: EntityClass[] = [];

    // Extract main class name from frontmatter title
    const className = parsed.data.title;
    if (!className) {
      console.warn(`No title found in ${filePath}`);
      return entities;
    }

    // Extract description from frontmatter
    const description = parsed.data.description || '';

    // Parse main entity attributes from markdown content
    const attributes = this.parseAttributes(parsed.content, className);

    // Extract nested hash entities and update parent attributes
    const { processedAttributes, nestedEntities } =
      this.extractNestedHashEntities(className, attributes);

    entities.push({
      name: className,
      description,
      attributes: processedAttributes,
    });

    // Add extracted nested entities
    entities.push(...nestedEntities);

    // Parse additional entity definitions in the same file
    const additionalEntities = this.parseAdditionalEntities(parsed.content);
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

    // Find the "## Attributes" section (for main entity only)
    // Stop at any additional entity definitions
    const attributesMatch = content.match(
      /## Attributes\s*([\s\S]*?)(?=\n## .* entity attributes|\n## |$)/
    );
    if (attributesMatch) {
      const attributesSection = attributesMatch[1];
      attributes.push(
        ...AttributeParser.parseAttributesFromSection(
          attributesSection,
          entityName
        )
      );
    }

    // Also look for "## Data attributes" section and convert to data[][] format
    const dataAttributesMatch = content.match(
      /## Data attributes\s*([\s\S]*?)(?=\n## |$)/
    );
    if (dataAttributesMatch) {
      const dataAttributesSection = dataAttributesMatch[1];
      const dataAttributes = AttributeParser.parseAttributesFromSection(
        dataAttributesSection,
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
  private static parseAdditionalEntities(content: string): EntityClass[] {
    const entities: EntityClass[] = [];

    // Find all sections that define additional entities
    // Pattern 1: ## [EntityName] entity attributes {#[id]} - extract just EntityName, not "EntityName entity"
    // Pattern 2: ## [EntityName] attributes {#[id]}
    const entitySectionRegex1 = /## ([^#\n]+?) entity attributes \{#([^}]+)\}/g;
    const entitySectionRegex2 = /## ([^#\n]+?) attributes \{#([^}]+)\}/g;

    // Process both patterns
    [entitySectionRegex1, entitySectionRegex2].forEach((regex) => {
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
        const nextSectionMatch = content.substring(startIndex).match(/\n## /);
        const endIndex = nextSectionMatch
          ? startIndex + (nextSectionMatch.index || 0)
          : content.length;

        const entityContent = content.substring(startIndex, endIndex);

        // Parse attributes for this entity
        const attributes = AttributeParser.parseAttributesFromSection(
          entityContent,
          entityName
        );

        entities.push({
          name: entityName,
          description: `Additional entity definition for ${entityName}`,
          attributes,
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
    attributes: EntityAttribute[]
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

      // Create the nested entity
      nestedEntities.push({
        name: nestedEntityName,
        description: `Nested entity extracted from ${parentEntityName}.${parentFieldName}`,
        attributes: childAttributes,
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
