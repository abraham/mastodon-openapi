import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { EntityClass } from '../interfaces/EntityClass';
import { EntityAttribute } from '../interfaces/EntityAttribute';

class EntityParser {
  private entitiesPath: string;

  constructor() {
    this.entitiesPath = path.join(
      __dirname,
      '../../mastodon-documentation/content/en/entities'
    );
  }

  public parseAllEntities(): EntityClass[] {
    const entities: EntityClass[] = [];

    if (!fs.existsSync(this.entitiesPath)) {
      console.error(`Entities path does not exist: ${this.entitiesPath}`);
      return entities;
    }

    const files = fs
      .readdirSync(this.entitiesPath)
      .filter((file) => file.endsWith('.md'));

    for (const file of files) {
      try {
        const fileEntities = this.parseEntityFile(
          path.join(this.entitiesPath, file)
        );
        if (fileEntities) {
          entities.push(...fileEntities);
        }
      } catch (error) {
        console.error(`Error parsing file ${file}:`, error);
      }
    }

    return entities;
  }

  private parseEntityFile(filePath: string): EntityClass[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(content);

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

  private parseAttributes(content: string): EntityAttribute[] {
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

  private parseAdditionalEntities(content: string): EntityClass[] {
    const entities: EntityClass[] = [];

    // Find all sections that define additional entities
    // Pattern 1: ## [EntityName] entity attributes {#[id]}
    // Pattern 2: ## [EntityName] attributes {#[id]}
    const entitySectionRegex1 = /## ([^#\n]+?) entity attributes \{#([^}]+)\}/g;
    const entitySectionRegex2 = /## ([^#\n]+?) attributes \{#([^}]+)\}/g;

    // Process both patterns
    [entitySectionRegex1, entitySectionRegex2].forEach((regex) => {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const [fullMatch, entityName, entityId] = match;

        // Skip if we already processed this entity (avoid duplicates)
        if (entities.some((e) => e.name === entityName.trim())) {
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
        const attributes = this.parseAttributesFromSection(entityContent);

        entities.push({
          name: entityName.trim(),
          description: `Additional entity definition for ${entityName.trim()}`,
          attributes,
        });
      }
    });

    return entities;
  }

  private parseAttributesFromSection(content: string): EntityAttribute[] {
    const attributes: EntityAttribute[] = [];

    // Match each attribute definition in this section
    const attributeRegex =
      /### `([^`]+)`[^{]*(?:\{\{%([^%]+)%\}\})?\s*\{#[^}]+\}\s*\n\n\*\*Description:\*\*\s*([^\n]+).*?\n\*\*Type:\*\*\s*([^\n]+)/g;

    let match;
    while ((match = attributeRegex.exec(content)) !== null) {
      const [, name, modifiers, description, type] = match;

      const attribute: EntityAttribute = {
        name: name.trim(),
        type: this.cleanType(type.trim()),
        description: this.cleanDescription(description.trim()),
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

      attributes.push(attribute);
    }

    return attributes;
  }

  private cleanType(type: string): string {
    // Remove markdown formatting and extra text
    return type
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\{\{<[^>]+>\}\}/g, '') // Remove Hugo shortcodes
      .replace(/\\\s*$/, '') // Remove trailing backslashes
      .trim();
  }

  private cleanDescription(description: string): string {
    // Remove markdown formatting and trailing backslashes
    return description
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\\\s*$/, '') // Remove trailing backslashes
      .trim();
  }
}

export { EntityParser };
