import { EntityAttribute } from '../interfaces/EntityAttribute';

interface JsonAttributeInfo {
  name: string;
  type: string;
  isArray?: boolean;
  nestedObject?: JsonAttributeInfo[];
}

class JsonExampleAnalyzer {
  /**
   * Analyzes a JSON object and extracts attribute information
   */
  public analyzeJsonObject(jsonObj: any, path: string = ''): JsonAttributeInfo[] {
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
            attribute.type = 'object';
            attribute.nestedObject = this.analyzeJsonObject(firstItem, `${path}.${key}[0]`);
          } else {
            attribute.type = this.inferTypeFromValue(firstItem);
          }
        } else {
          attribute.type = 'unknown'; // Empty array
        }
      }
      // Handle nested objects
      else if (typeof value === 'object' && value !== null) {
        attribute.type = 'object';
        attribute.nestedObject = this.analyzeJsonObject(value, `${path}.${key}`);
      }

      attributes.push(attribute);
    }

    return attributes;
  }

  /**
   * Converts JsonAttributeInfo to EntityAttribute format
   */
  public convertToEntityAttributes(jsonAttributes: JsonAttributeInfo[]): EntityAttribute[] {
    const entityAttributes: EntityAttribute[] = [];

    for (const jsonAttr of jsonAttributes) {
      const entityAttr: EntityAttribute = {
        name: jsonAttr.name,
        type: this.formatTypeForEntity(jsonAttr),
        description: `Attribute discovered from JSON example`,
      };

      entityAttributes.push(entityAttr);

      // For nested objects, also add their attributes with prefixed names
      if (jsonAttr.nestedObject) {
        const nestedAttrs = this.convertToEntityAttributes(jsonAttr.nestedObject);
        for (const nestedAttr of nestedAttrs) {
          entityAttributes.push({
            ...nestedAttr,
            name: `${jsonAttr.name}.${nestedAttr.name}`,
            description: `Nested attribute discovered from JSON example`,
          });
        }
      }
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
    const existingNames = new Set(existingAttributes.map(attr => attr.name));

    for (const exampleAttr of exampleAttributes) {
      if (!existingNames.has(exampleAttr.name)) {
        // Add new attribute found in example
        merged.push({
          ...exampleAttr,
          description: `${exampleAttr.description} (missing from entity definition)`,
        });
      }
    }

    return merged;
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