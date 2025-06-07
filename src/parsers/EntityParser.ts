import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { EntityClass } from '../interfaces/EntityClass';
import { EntityAttribute } from '../interfaces/EntityAttribute';
import { JsonExampleAnalyzer } from './JsonExampleAnalyzer';
import { MethodParser } from './MethodParser';
import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';

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

  /**
   * Enriches entities with attributes discovered from JSON examples in method responses
   */
  public enrichEntitiesWithExamples(entities: EntityClass[]): EntityClass[] {
    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();
    const analyzer = new JsonExampleAnalyzer();

    const enrichedEntities = entities.map((entity) => ({
      ...entity,
      attributes: [...entity.attributes],
    })); // Deep clone

    for (const methodFile of methodFiles) {
      for (const method of methodFile.methods) {
        if (method.responses && method.returns) {
          // Extract entity names from the returns field
          const entityNames = this.extractEntityNamesFromReturns(
            method.returns
          );

          for (const entityName of entityNames) {
            // Find successful responses (200-299 status codes)
            const successfulResponses = method.responses.filter((response) => {
              const statusCode = parseInt(response.statusCode);
              return (
                statusCode >= 200 && statusCode < 300 && response.parsedExample
              );
            });

            for (const response of successfulResponses) {
              // Find the entity to enrich
              const entityToEnrich = enrichedEntities.find(
                (e) => e.name.toLowerCase() === entityName.toLowerCase()
              );

              if (entityToEnrich && response.parsedExample) {
                // Check if the response is an array of entities
                let dataToAnalyze = response.parsedExample;
                if (
                  Array.isArray(response.parsedExample) &&
                  response.parsedExample.length > 0
                ) {
                  // If it's an array, analyze the first element which should be an entity
                  dataToAnalyze = response.parsedExample[0];
                }

                // Analyze the JSON example
                const jsonAttributes =
                  analyzer.analyzeJsonObject(dataToAnalyze);
                const exampleAttributes =
                  analyzer.convertToEntityAttributes(jsonAttributes);

                // Merge with existing attributes
                entityToEnrich.attributes =
                  analyzer.mergeWithExistingAttributes(
                    entityToEnrich.attributes,
                    exampleAttributes
                  );
              }
            }
          }
        }
      }
    }

    return enrichedEntities;
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

      // Check for enum values in the content between Type and Version history
      if (enumContent && enumContent.trim()) {
        const enumValues = this.extractEnumValues(enumContent);
        if (enumValues.length > 0) {
          attribute.enumValues = enumValues;
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

  /**
   * Extracts entity names from the returns field of a method
   * Examples:
   * - "[Account]({{< relref \"entities/account\" >}})" -> ["Account"]
   * - "Array of [Account]({{< relref \"entities/account\" >}})" -> ["Account"]
   * - "[CredentialAccount]({{< relref \"entities/Account#CredentialAccount\">}})" -> ["Account"]
   */
  private extractEntityNamesFromReturns(returns: string): string[] {
    const entityNames: string[] = [];

    // Match patterns like [EntityName](link) or [EntityName]
    const entityRegex = /\[([^\]]+)\]/g;
    let match;

    while ((match = entityRegex.exec(returns)) !== null) {
      const entityName = match[1];

      // Handle special cases like "CredentialAccount" -> "Account"
      // Extract the base entity name if it has a prefix like "Credential"
      let baseEntityName = entityName;

      // Check for common prefixes and extract the base name
      const prefixes = ['Credential', 'Admin_', 'Partial', 'V1_'];
      for (const prefix of prefixes) {
        if (entityName.startsWith(prefix)) {
          baseEntityName = entityName.substring(prefix.length);
          break;
        }
      }

      if (baseEntityName && !entityNames.includes(baseEntityName)) {
        entityNames.push(baseEntityName);
      }
    }

    return entityNames;
  }
}

export { EntityParser };
