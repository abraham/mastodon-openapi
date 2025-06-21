import * as fs from 'fs';
import matter from 'gray-matter';
import { EntityClass } from '../interfaces/EntityClass';
import { AttributeParser } from './AttributeParser';
import { ExampleParser } from './ExampleParser';
import { EntityAttribute } from '../interfaces/EntityAttribute';

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

    // Also look for inline JSON response entities
    const inlineEntities = this.parseInlineResponseEntities(parsed.content);
    entities.push(...inlineEntities);

    return entities;
  }

  /**
   * Parses entities from inline JSON response examples in method documentation
   */
  private static parseInlineResponseEntities(content: string): EntityClass[] {
    const entities: EntityClass[] = [];

    // Split the content into method sections (each starting with ##)
    const methodSections = content.split(/(?=^## )/gm);

    for (const section of methodSections) {
      // Look for sections with returns field indicating inline JSON
      const returnsMatch = section.match(/\*\*Returns:\*\*\s*([^\n]+)/);
      if (!returnsMatch) {
        continue;
      }

      const returnsText = returnsMatch[1].trim();

      // Check if this indicates an inline JSON response (not an explicit entity reference)
      if (!this.isInlineJsonResponse(returnsText)) {
        continue;
      }

      // Extract method name for entity naming
      const methodNameMatch = section.match(/^## ([^{]+)/);
      if (!methodNameMatch) {
        continue;
      }

      const methodName = methodNameMatch[1].trim();

      // Parse the response examples
      const responseExamples =
        ExampleParser.parseMethodResponseExamples(section);

      // Look for a 200 response with a complex JSON structure
      if (
        responseExamples['200'] &&
        typeof responseExamples['200'] === 'object'
      ) {
        const jsonExample = responseExamples['200'];

        // Generate entity name from method name
        const entityName = this.generateEntityName(methodName);

        // Convert JSON example to entity attributes
        const attributes = this.jsonToAttributes(jsonExample);

        if (attributes.length > 0) {
          entities.push({
            name: entityName,
            description: `Response schema for ${methodName}`,
            attributes,
            example: jsonExample,
          });
        }
      }
    }

    return entities;
  }

  /**
   * Checks if the returns text indicates an inline JSON response
   */
  private static isInlineJsonResponse(returnsText: string): boolean {
    // Look for patterns indicating inline JSON rather than entity references
    const inlinePatterns = [
      /JSON\s+as\s+per/i,
      /JSON\s+response/i,
      /JSON\s+object/i,
      /JSON\s+containing/i,
    ];

    return (
      inlinePatterns.some((pattern) => pattern.test(returnsText)) &&
      !returnsText.includes('[') &&
      !returnsText.includes(']')
    ); // Exclude entity references like [Token]
  }

  /**
   * Generates an entity name from a method name
   */
  private static generateEntityName(methodName: string): string {
    // Clean the method name and convert to PascalCase
    const cleaned = methodName
      .replace(/[{}#]/g, '') // Remove Hugo shortcodes and anchors
      .replace(/\s+/g, ' ')
      .trim();

    // Convert to PascalCase
    const words = cleaned.split(/\s+/);
    const pascalCase = words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');

    // Add Response suffix to avoid naming conflicts
    return `${pascalCase}Response`;
  }

  /**
   * Converts a JSON object to entity attributes
   */
  private static jsonToAttributes(
    jsonObj: any,
    prefix = ''
  ): EntityAttribute[] {
    const attributes: EntityAttribute[] = [];

    if (!jsonObj || typeof jsonObj !== 'object') {
      return attributes;
    }

    for (const [key, value] of Object.entries(jsonObj)) {
      const attributeName = prefix ? `${prefix}.${key}` : key;

      if (value === null) {
        attributes.push({
          name: attributeName,
          type: 'String',
          description: `${key} field`,
          optional: true,
          nullable: true,
        });
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object') {
          // Array of objects - create nested attributes
          const nestedAttributes = this.jsonToAttributes(
            value[0],
            `${attributeName}[]`
          );
          attributes.push(...nestedAttributes);
        }
        attributes.push({
          name: attributeName,
          type: this.inferArrayType(value),
          description: `Array of ${key}`,
          optional: false,
          nullable: false,
        });
      } else if (typeof value === 'object') {
        // Nested object - create nested attributes
        const nestedAttributes = this.jsonToAttributes(value, attributeName);
        attributes.push(...nestedAttributes);

        attributes.push({
          name: attributeName,
          type: 'Hash',
          description: `${key} object`,
          optional: false,
          nullable: false,
        });
      } else {
        // Primitive value
        attributes.push({
          name: attributeName,
          type: this.inferPrimitiveType(value),
          description: `${key} field`,
          optional: false,
          nullable: false,
        });
      }
    }

    return attributes;
  }

  /**
   * Infers the type of an array based on its first element
   */
  private static inferArrayType(arr: any[]): string {
    if (arr.length === 0) {
      return 'Array';
    }

    const firstElement = arr[0];
    if (typeof firstElement === 'string') {
      return 'Array of String';
    } else if (typeof firstElement === 'number') {
      return 'Array of Number';
    } else if (typeof firstElement === 'boolean') {
      return 'Array of Boolean';
    } else if (typeof firstElement === 'object') {
      return 'Array of Hash';
    }

    return 'Array';
  }

  /**
   * Infers the type of a primitive value
   */
  private static inferPrimitiveType(value: any): string {
    if (typeof value === 'string') {
      // Check for common patterns
      if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        return 'String (ISO 8601 Datetime)';
      }
      if (value.match(/^https?:\/\//)) {
        return 'String (URL)';
      }
      return 'String';
    } else if (typeof value === 'number') {
      return Number.isInteger(value) ? 'Integer' : 'Number';
    } else if (typeof value === 'boolean') {
      return 'Boolean';
    }

    return 'String';
  }
}
