import { EntityAttribute } from '../interfaces/EntityAttribute';
import { EntityClass } from '../interfaces/EntityClass';

interface JsonAttributeInfo {
  name: string;
  type: string;
  isArray?: boolean;
  nestedObject?: JsonAttributeInfo[];
  entityRef?: string; // Reference to an existing entity if detected
}

class JsonExampleAnalyzer {
  private knownEntities: EntityClass[] = [];

  /**
   * Set the known entities so we can create proper references
   */
  public setKnownEntities(entities: EntityClass[]): void {
    this.knownEntities = entities;
  }
  /**
   * Analyzes a JSON object and extracts attribute information
   */
  public analyzeJsonObject(
    jsonObj: any,
    path: string = ''
  ): JsonAttributeInfo[] {
    const attributes: JsonAttributeInfo[] = [];

    if (typeof jsonObj !== 'object' || jsonObj === null) {
      return attributes;
    }

    for (const [key, value] of Object.entries(jsonObj)) {
      const attribute: JsonAttributeInfo = {
        name: key,
        type: this.inferTypeFromValue(value),
      };

      // Handle arrays
      if (Array.isArray(value)) {
        attribute.isArray = true;
        if (value.length > 0) {
          const firstItem = value[0];
          if (typeof firstItem === 'object' && firstItem !== null) {
            // Check if this looks like a known entity
            const matchedEntity = this.findMatchingEntity(firstItem);
            if (matchedEntity) {
              attribute.type = 'object';
              attribute.entityRef = matchedEntity.name;
            } else {
              attribute.type = 'object';
              attribute.nestedObject = this.analyzeJsonObject(
                firstItem,
                `${path}.${key}[0]`
              );
            }
          } else {
            attribute.type = this.inferTypeFromValue(firstItem);
          }
        } else {
          attribute.type = 'unknown'; // Empty array
        }
      }
      // Handle nested objects
      else if (typeof value === 'object' && value !== null) {
        // Check if this looks like a known entity
        const matchedEntity = this.findMatchingEntity(value);
        if (matchedEntity) {
          attribute.type = 'object';
          attribute.entityRef = matchedEntity.name;
        } else {
          attribute.type = 'object';
          attribute.nestedObject = this.analyzeJsonObject(
            value,
            `${path}.${key}`
          );
        }
      }

      attributes.push(attribute);
    }

    return attributes;
  }

  /**
   * Converts JsonAttributeInfo to EntityAttribute format
   */
  public convertToEntityAttributes(
    jsonAttributes: JsonAttributeInfo[]
  ): EntityAttribute[] {
    const entityAttributes: EntityAttribute[] = [];

    for (const jsonAttr of jsonAttributes) {
      const entityAttr: EntityAttribute = {
        name: jsonAttr.name,
        type: this.formatTypeForEntity(jsonAttr),
        description: `Attribute discovered from JSON example`,
      };

      // Handle entity references
      if (jsonAttr.entityRef) {
        if (jsonAttr.isArray) {
          entityAttr.type = `Array of [${jsonAttr.entityRef}]`;
        } else {
          entityAttr.type = `[${jsonAttr.entityRef}]`;
        }
      }
      // For nested objects without entity reference, add their properties to the properties field
      else if (jsonAttr.nestedObject && jsonAttr.nestedObject.length > 0) {
        const nestedEntityAttrs = this.convertToEntityAttributes(
          jsonAttr.nestedObject
        );
        entityAttr.properties = {};
        for (const nestedAttr of nestedEntityAttrs) {
          entityAttr.properties[nestedAttr.name] = nestedAttr;
        }
      }

      entityAttributes.push(entityAttr);
    }

    return entityAttributes;
  }

  /**
   * Merges attributes found in examples with existing entity attributes
   */
  public mergeWithExistingAttributes(
    existingAttributes: EntityAttribute[],
    exampleAttributes: EntityAttribute[]
  ): EntityAttribute[] {
    const merged = [...existingAttributes];
    const existingNamesMap = new Map(
      existingAttributes.map((attr, index) => [attr.name, index])
    );

    for (const exampleAttr of exampleAttributes) {
      const existingIndex = existingNamesMap.get(exampleAttr.name);

      if (existingIndex !== undefined) {
        // Attribute exists - merge nested properties if the example has them
        const existingAttr = merged[existingIndex];
        if (
          exampleAttr.properties &&
          Object.keys(exampleAttr.properties).length > 0
        ) {
          // Update existing attribute to include nested properties
          merged[existingIndex] = {
            ...existingAttr,
            properties: exampleAttr.properties,
            // Also update type to "object" if it wasn't already
            type: exampleAttr.type,
          };
        }
      } else {
        // Add new attribute found in example
        merged.push({
          ...exampleAttr,
          description: `${exampleAttr.description} (missing from entity definition)`,
        });
      }
    }

    return merged;
  }

  /**
   * Attempts to find a known entity that matches the structure of the given object
   */
  private findMatchingEntity(obj: any): EntityClass | null {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    const objKeys = Object.keys(obj).sort();

    // Look for entities that have a significant overlap in attributes
    for (const entity of this.knownEntities) {
      const entityKeys = entity.attributes
        .filter((attr) => !attr.optional) // Only consider non-optional attributes for matching
        .map((attr) => attr.name)
        .sort();

      // Check if object has most of the required entity attributes
      const matchingKeys = entityKeys.filter((key) => objKeys.includes(key));
      const matchRatio = matchingKeys.length / Math.max(entityKeys.length, 1);

      // If we have a good match (60% or more of required attributes)
      // and the object doesn't have too many extra attributes
      if (matchRatio >= 0.6 && objKeys.length <= entityKeys.length * 2) {
        return entity;
      }
    }

    // Special case: look for entities with specific identifying attributes
    const specialMappings = [
      { keys: ['shortcode', 'url', 'static_url'], entityName: 'CustomEmoji' },
      { keys: ['name', 'value'], entityName: 'Field' },
      { keys: ['acct', 'username', 'display_name'], entityName: 'Account' },
      { keys: ['id', 'uri', 'url', 'content'], entityName: 'Status' },
    ];

    for (const mapping of specialMappings) {
      const hasRequiredKeys = mapping.keys.every((key) =>
        objKeys.includes(key)
      );
      if (hasRequiredKeys) {
        const entity = this.knownEntities.find(
          (e) => e.name.toLowerCase() === mapping.entityName.toLowerCase()
        );
        if (entity) {
          return entity;
        }
      }
    }

    return null;
  }

  private inferTypeFromValue(value: any): string {
    if (value === null) {
      return 'null';
    }

    const type = typeof value;

    switch (type) {
      case 'boolean':
        return 'Boolean';
      case 'number':
        return Number.isInteger(value) ? 'Integer' : 'Number';
      case 'string':
        // Check if it looks like a date
        if (this.isDateString(value)) {
          return 'String (Date)';
        }
        // Check if it looks like a URL
        if (this.isUrlString(value)) {
          return 'String (URL)';
        }
        return 'String';
      case 'object':
        if (Array.isArray(value)) {
          return 'Array';
        }
        return 'Object';
      default:
        return 'unknown';
    }
  }

  private isDateString(value: string): boolean {
    // Check for ISO 8601 date format
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return isoDateRegex.test(value);
  }

  private isUrlString(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  private formatTypeForEntity(jsonAttr: JsonAttributeInfo): string {
    if (jsonAttr.isArray) {
      if (jsonAttr.type === 'object') {
        return 'Array of Object';
      }
      return `Array of ${jsonAttr.type}`;
    }

    return jsonAttr.type;
  }
}

export { JsonExampleAnalyzer, JsonAttributeInfo };
