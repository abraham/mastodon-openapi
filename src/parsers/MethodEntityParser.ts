import * as fs from 'fs';
import matter from 'gray-matter';
import { EntityClass } from '../interfaces/EntityClass';
import { AttributeParser } from './AttributeParser';

/**
 * Handles parsing entities from method documentation files
 */
export class MethodEntityParser {
  /**
   * Parses entities from a method documentation file
   */
  static parseEntitiesFromMethodFile(filePath: string): EntityClass[] {
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
        ? startIndex + (nextSectionMatch.index || 0)
        : parsed.content.length;

      const entityContent = parsed.content.substring(startIndex, endIndex);

      // Parse attributes for this entity
      const attributes =
        AttributeParser.parseMethodEntityAttributes(entityContent);

      // Extract description from the content or use a default
      let description = `Entity defined in method documentation`;

      // Try to find a description in the content following the heading
      const descMatch = entityContent.match(/\n\n([^\n]+)/);
      if (descMatch) {
        description = descMatch[1].trim();
      }

      entities.push({
        name: entityName.trim(),
        description,
        attributes,
      });
    }

    return entities;
  }
}
