import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { EntityClass } from '../interfaces/EntityClass';
import { AttributeParser } from './AttributeParser';

/**
 * Handles parsing individual entity files
 */
export class EntityFileParser {
  private attributeParser: AttributeParser;

  constructor() {
    this.attributeParser = new AttributeParser();
  }

  /**
   * Parse entities from a method file
   */
  public parseEntitiesFromMethodFile(filePath: string): EntityClass[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(content);

    // Skip draft files
    if (parsed.data.draft === true) {
      return [];
    }

    const entities: EntityClass[] = [];

    // Look for entity definitions in the format: ## `EntityName` entity {#EntityName}
    const entityRegex = /## `([^`]+)` entity \{#([^}]+)\}/g;

    let match;
    while ((match = entityRegex.exec(parsed.content)) !== null) {
      const [fullMatch, entityName, entityId] = match;

      // Find the content for this entity (from this heading to the next ## heading or end of file)
      const startIndex = match.index + fullMatch.length;
      const nextSectionMatch = parsed.content
        .substring(startIndex)
        .match(/\n## /);
      const endIndex = nextSectionMatch
        ? startIndex + nextSectionMatch.index!
        : parsed.content.length;

      const entityContent = parsed.content.substring(startIndex, endIndex);

      // Parse attributes from this entity section
      const attributes =
        this.attributeParser.parseMethodEntityAttributes(entityContent);

      if (attributes.length > 0) {
        entities.push({
          name: entityName,
          description: `Entity definition for ${entityName}`,
          attributes,
        });
      }
    }

    return entities;
  }

  /**
   * Parse entities from a dedicated entity file
   */
  public parseEntityFile(filePath: string): EntityClass[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(content);

    // Skip draft files
    if (parsed.data.draft === true) {
      return [];
    }

    const entities: EntityClass[] = [];

    // Extract main entity from frontmatter or filename
    const title = parsed.data.title || path.basename(filePath, '.md');
    const description = parsed.data.description || '';

    // Parse main entity attributes
    const attributes = this.attributeParser.parseAttributes(parsed.content);

    if (attributes.length > 0 || title) {
      entities.push({
        name: title,
        description: description || `Entity: ${title}`,
        attributes,
      });
    }

    // Look for additional entities defined in the content
    const additionalEntities = this.parseAdditionalEntities(parsed.content);
    entities.push(...additionalEntities);

    return entities;
  }

  /**
   * Parse additional entities defined within the content
   */
  private parseAdditionalEntities(content: string): EntityClass[] {
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
          this.attributeParser.parseAttributesFromSection(entityContent);

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
