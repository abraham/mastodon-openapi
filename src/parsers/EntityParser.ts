import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { EntityClass } from '../interfaces/EntityClass';
import { EntityAttribute } from '../interfaces/EntityAttribute';

class EntityParser {
  private entitiesPath: string;
  private methodsPath: string;

  constructor() {
    this.entitiesPath = path.join(
      __dirname,
      '../../mastodon-documentation/content/en/entities'
    );
    this.methodsPath = path.join(
      __dirname,
      '../../mastodon-documentation/content/en/methods'
    );
  }

  public parseAllEntities(): EntityClass[] {
    const entities: EntityClass[] = [];

    // Parse entities from dedicated entity files
    if (fs.existsSync(this.entitiesPath)) {
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
          console.error(`Error parsing entity file ${file}:`, error);
        }
      }
    } else {
      console.error(`Entities path does not exist: ${this.entitiesPath}`);
    }

    // Parse entities from method files
    if (fs.existsSync(this.methodsPath)) {
      const methodFiles = fs
        .readdirSync(this.methodsPath)
        .filter((file) => file.endsWith('.md'));

      for (const file of methodFiles) {
        try {
          const methodEntities = this.parseEntitiesFromMethodFile(
            path.join(this.methodsPath, file)
          );
          if (methodEntities.length > 0) {
            entities.push(...methodEntities);
          }
        } catch (error) {
          console.error(
            `Error parsing entities from method file ${file}:`,
            error
          );
        }
      }
    } else {
      console.error(`Methods path does not exist: ${this.methodsPath}`);
    }

    return entities;
  }

  private parseEntitiesFromMethodFile(filePath: string): EntityClass[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(content);

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
      const attributes = this.parseMethodEntityAttributes(entityContent);

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
    // Capture more content after Type to get enum values
    const attributeRegex =
      /### `([^`]+)`[^{]*(?:\{\{%([^%]+)%\}\})?\s*\{#[^}]+\}\s*\n\n\*\*Description:\*\*\s*([^\n]+).*?\n\*\*Type:\*\*\s*([^\n]+)(.*?)(?=\n\*\*Version history:\*\*|\n\*\*|\n###|$)/gs;

    let match;
    while ((match = attributeRegex.exec(content)) !== null) {
      const [, name, modifiers, description, type, additionalContent] = match;

      const cleanedType = this.cleanType(type.trim());
      const attribute: EntityAttribute = {
        name: name.trim(),
        type: cleanedType,
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

      // Extract enum values if this is an enumerable type
      if (cleanedType.toLowerCase().includes('enumerable')) {
        const enumValues = this.extractEnumValues(additionalContent);
        if (enumValues.length > 0) {
          attribute.enumValues = enumValues;
        }
      }

      attributes.push(attribute);
    }

    return attributes;
  }

  private parseMethodEntityAttributes(content: string): EntityAttribute[] {
    // Parse attributes using pattern matching instead of complex regex
    return this.parseMethodEntityAttributesWithPatternMatching(content);
  }

  private parseMethodEntityAttributesWithPatternMatching(content: string): EntityAttribute[] {
    const attributes: EntityAttribute[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for attribute headers: #### `attribute_name` {{%optional%}} {#id}
      if (this.isMethodEntityAttributeHeader(line)) {
        const attributeData = this.parseMethodEntityAttribute(lines, i);
        if (attributeData) {
          attributes.push(attributeData.attribute);
          i = attributeData.nextIndex;
        }
      }
    }
    
    return attributes;
  }

  private isMethodEntityAttributeHeader(line: string): boolean {
    // Must start with #### and contain `attribute_name`
    return line.startsWith('####') && line.includes('`') && line.includes('`');
  }

  private parseMethodEntityAttribute(lines: string[], startIndex: number): {
    attribute: EntityAttribute;
    nextIndex: number;
  } | null {
    const headerLine = lines[startIndex].trim();
    
    // Extract attribute name from #### `attribute_name` {{%modifiers%}} {#id}
    const nameMatch = headerLine.match(/#### `([^`]+)`/);
    if (!nameMatch) {
      return null;
    }
    
    const name = nameMatch[1];
    
    // Extract modifiers
    const modifiers = this.extractModifiersFromHeader(headerLine);
    
    // Find Description and Type lines
    let descriptionLine = '';
    let typeLine = '';
    let enumContent = '';
    let currentIndex = startIndex + 1;
    
    // Skip empty lines after header
    while (currentIndex < lines.length && lines[currentIndex].trim() === '') {
      currentIndex++;
    }
    
    // Look for **Description:**
    if (currentIndex < lines.length && lines[currentIndex].trim().startsWith('**Description:**')) {
      descriptionLine = lines[currentIndex].trim().replace(/^\*\*Description:\*\*\s*/, '').replace(/\\$/, '');
      currentIndex++;
    }
    
    // Look for **Type:**
    if (currentIndex < lines.length && lines[currentIndex].trim().startsWith('**Type:**')) {
      typeLine = lines[currentIndex].trim().replace(/^\*\*Type:\*\*\s*/, '').replace(/\\$/, '');
      currentIndex++;
    }
    
    // Collect content until **Version history:** or next attribute
    const enumLines: string[] = [];
    while (currentIndex < lines.length) {
      const line = lines[currentIndex].trim();
      
      // Stop at Version history
      if (line.startsWith('**Version history:**')) {
        break;
      }
      
      // Stop at next attribute
      if (this.isMethodEntityAttributeHeader(line)) {
        currentIndex--; // Back up so the next iteration will process this header
        break;
      }
      
      enumLines.push(line);
      currentIndex++;
    }
    
    enumContent = enumLines.join('\n');
    
    // Skip to end of Version history section
    while (currentIndex < lines.length) {
      const line = lines[currentIndex].trim();
      if (this.isMethodEntityAttributeHeader(line)) {
        currentIndex--; // Back up so the next iteration will process this header
        break;
      }
      currentIndex++;
    }
    
    // Create the attribute
    const cleanedType = this.cleanType(typeLine);
    const attribute: EntityAttribute = {
      name: name.trim(),
      type: cleanedType,
      description: this.cleanDescription(descriptionLine),
    };
    
    // Apply modifiers
    if (modifiers.includes('optional')) {
      attribute.optional = true;
    }
    if (modifiers.includes('deprecated')) {
      attribute.deprecated = true;
    }
    
    // Extract enum values
    if (enumContent.trim()) {
      const enumValues = this.extractEnumValues(enumContent);
      if (enumValues.length > 0) {
        attribute.enumValues = enumValues;
      }
    }
    
    return {
      attribute,
      nextIndex: currentIndex
    };
  }

  private extractModifiersFromHeader(header: string): string[] {
    const modifiers: string[] = [];
    
    // Look for {{%modifier%}} patterns
    const modifierPattern = /\{\{%([^%]+)%\}\}/g;
    let match;
    
    while ((match = modifierPattern.exec(header)) !== null) {
      modifiers.push(match[1].trim());
    }
    
    return modifiers;
  }

  private cleanType(type: string): string {
    // Remove markdown formatting and extra text
    return type
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\{\{<[^>]+>\}\}/g, '') // Remove Hugo shortcodes
      .replace(/\\\s*$/, '') // Remove trailing backslashes
      .trim();
  }

  private extractEnumValues(content: string): string[] {
    const enumValues: string[] = [];

    // Look for enum value patterns like `value` = description
    const enumPattern = /`([^`]+)`\s*=\s*[^\n]+/g;
    let match;

    while ((match = enumPattern.exec(content)) !== null) {
      const enumValue = match[1].trim();
      if (enumValue) {
        enumValues.push(enumValue);
      }
    }

    return enumValues;
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
