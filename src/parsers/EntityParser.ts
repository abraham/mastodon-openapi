import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { EntityClass } from '../interfaces/EntityClass';
import { EntityAttribute } from '../interfaces/EntityAttribute';

class EntityParser {
  private entitiesPath: string;

  constructor() {
    this.entitiesPath = path.join(__dirname, '../../mastodon-documentation/content/en/entities');
  }

  public parseAllEntities(): EntityClass[] {
    const entities: EntityClass[] = [];
    
    if (!fs.existsSync(this.entitiesPath)) {
      console.error(`Entities path does not exist: ${this.entitiesPath}`);
      return entities;
    }

    const files = fs.readdirSync(this.entitiesPath).filter(file => file.endsWith('.md'));
    
    for (const file of files) {
      try {
        const entity = this.parseEntityFile(path.join(this.entitiesPath, file));
        if (entity) {
          entities.push(entity);
        }
      } catch (error) {
        console.error(`Error parsing file ${file}:`, error);
      }
    }

    return entities;
  }

  private parseEntityFile(filePath: string): EntityClass | null {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(content);
    
    // Extract class name from frontmatter title
    const className = parsed.data.title;
    if (!className) {
      console.warn(`No title found in ${filePath}`);
      return null;
    }

    // Extract description from frontmatter
    const description = parsed.data.description || '';

    // Parse attributes from markdown content
    const attributes = this.parseAttributes(parsed.content);

    return {
      name: className,
      description,
      attributes
    };
  }

  private parseAttributes(content: string): EntityAttribute[] {
    const attributes: EntityAttribute[] = [];
    
    // Find the "## Attributes" section
    const attributesMatch = content.match(/## Attributes\s*([\s\S]*?)(?=\n## |$)/);
    if (!attributesMatch) {
      return attributes;
    }

    const attributesSection = attributesMatch[1];
    
    // Match each attribute definition
    const attributeRegex = /### `([^`]+)`[^{]*(?:\{\{%([^%]+)%\}\})?\s*\{#[^}]+\}\s*\n\n\*\*Description:\*\*\s*([^\n]+).*?\n\*\*Type:\*\*\s*([^\n]+)/g;
    
    let match;
    while ((match = attributeRegex.exec(attributesSection)) !== null) {
      const [, name, modifiers, description, type] = match;
      
      const attribute: EntityAttribute = {
        name: name.trim(),
        type: this.cleanType(type.trim()),
        description: this.cleanDescription(description.trim())
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