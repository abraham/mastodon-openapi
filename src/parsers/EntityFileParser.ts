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
    const attributes = this.parseAttributes(parsed.content);

    entities.push({
      name: className,
      description,
      attributes,
    });

    // Parse additional entity definitions in the same file
    const additionalEntities = this.parseAdditionalEntities(parsed.content);
    entities.push(...additionalEntities);

    return entities;
  }

  /**
   * Parses main entity attributes from content
   */
  private static parseAttributes(content: string): EntityAttribute[] {
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
    return AttributeParser.parseAttributesFromSection(attributesSection);
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
        const attributes =
          AttributeParser.parseAttributesFromSection(entityContent);

        entities.push({
          name: entityName,
          description: `Additional entity definition for ${entityName}`,
          attributes,
        });
      }
    });

    return entities;
  }
}
