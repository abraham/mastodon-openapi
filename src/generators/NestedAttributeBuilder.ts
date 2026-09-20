import { EntityAttribute } from '../interfaces/EntityAttribute';
import { OpenAPIProperty, OpenAPISchema } from '../interfaces/OpenAPISchema';
import { parseNestedAttributeName } from './NestedAttributeName';

type ConvertAttribute = (attribute: EntityAttribute) => OpenAPIProperty;

/**
 * Assembles the flat list of documented attributes into nested object and
 * array-item schemas.
 *
 * Attribute names carry their own structure (`poll.options[].title`), so the
 * list has to be regrouped by path before any of it can be emitted.
 */
export class NestedAttributeBuilder {
  constructor(private readonly convertAttribute: ConvertAttribute) {}

  public build(attributes: EntityAttribute[], schema: OpenAPISchema): void {
    const flatAttributes: EntityAttribute[] = [];
    const nestedGroups = new Map<string, EntityAttribute[]>();
    const arrayItemGroups = new Map<string, EntityAttribute[]>();

    for (const attribute of attributes) {
      const nestedMatch = parseNestedAttributeName(attribute.name);

      if (!nestedMatch) {
        flatAttributes.push(attribute);
        continue;
      }

      const { parentName, fullPath, arrayPositions } = nestedMatch;

      // An array position with segments after it means these are properties of
      // the array's items rather than of the array itself.
      let arrayPath = '';
      for (const arrayPos of arrayPositions) {
        if (arrayPos < fullPath.length - 1) {
          arrayPath = fullPath.slice(0, arrayPos + 1).join('.');
          break;
        }
      }

      if (arrayPath) {
        const propertyName = fullPath[fullPath.length - 1];

        if (!arrayItemGroups.has(arrayPath)) {
          arrayItemGroups.set(arrayPath, []);
        }
        arrayItemGroups.get(arrayPath)!.push({
          ...attribute,
          name: propertyName,
        });
      } else {
        if (!nestedGroups.has(parentName)) {
          nestedGroups.set(parentName, []);
        }
        nestedGroups.get(parentName)!.push(attribute);
      }
    }

    for (const attribute of flatAttributes) {
      const property = this.convertAttribute(attribute);
      if (schema.properties) {
        schema.properties[attribute.name] = property;
      }

      if (!attribute.optional && !attribute.nullable && schema.required) {
        schema.required.push(attribute.name);
      }
    }

    for (const [parentName, groupAttributes] of nestedGroups.entries()) {
      this.processNestedGroup(parentName, groupAttributes, schema);
    }

    for (const [arrayPath, itemProperties] of arrayItemGroups.entries()) {
      this.processArrayItemGroup(arrayPath, itemProperties, schema);
    }
  }

  private processNestedGroup(
    parentName: string,
    attributes: EntityAttribute[],
    parentSchema: OpenAPISchema
  ): void {
    if (!parentSchema.properties) {
      parentSchema.properties = {};
    }

    let parentProperty = parentSchema.properties[parentName];
    if (!parentProperty) {
      const parentAttr = attributes.find((attr) => attr.name === parentName);
      parentProperty = parentAttr
        ? this.convertAttribute(parentAttr)
        : { type: 'object', description: `${parentName} object` };
      parentSchema.properties[parentName] = parentProperty;
    }

    const isObjectType =
      parentProperty.type === 'object' ||
      (Array.isArray(parentProperty.type) &&
        parentProperty.type.includes('object'));

    if (isObjectType) {
      if (!parentProperty.properties) {
        parentProperty.properties = {};
      }
      if (!parentProperty.required) {
        parentProperty.required = [];
      }

      const nestedAttributes: EntityAttribute[] = [];
      const directProperties = new Map<string, EntityAttribute>();

      for (const attr of attributes) {
        if (attr.name === parentName) {
          continue;
        }

        const parsed = parseNestedAttributeName(attr.name);
        if (parsed && parsed.fullPath.length > 1) {
          const newPath = parsed.fullPath.slice(1);

          // A single remaining segment is a leaf: `alerts[admin.sign_up]`
          // names one property, not a nested object.
          if (newPath.length === 1) {
            directProperties.set(newPath[0], attr);
          } else {
            nestedAttributes.push({
              ...attr,
              name: newPath[0] + '[' + newPath.slice(1).join('][') + ']',
            });
          }
        }
      }

      for (const [propName, attr] of directProperties.entries()) {
        parentProperty.properties[propName] = this.convertAttribute(attr);

        if (!attr.optional && !attr.nullable && parentProperty.required) {
          parentProperty.required.push(propName);
        }
      }

      if (parentProperty.required && parentProperty.required.length === 0) {
        delete parentProperty.required;
      }

      if (nestedAttributes.length > 0) {
        const nestedSchema: OpenAPISchema = {
          type: 'object',
          properties: parentProperty.properties,
          required: parentProperty.required,
        };

        this.build(nestedAttributes, nestedSchema);

        parentProperty.properties = nestedSchema.properties;
        if (nestedSchema.required && nestedSchema.required.length > 0) {
          parentProperty.required = nestedSchema.required;
        } else {
          delete parentProperty.required;
        }
      } else if (
        parentProperty.required &&
        parentProperty.required.length === 0
      ) {
        delete parentProperty.required;
      }
    }

    // Required children do not make an optional parent required.
    const parentAttr = attributes.find((attr) => attr.name === parentName);
    const parentIsRequired =
      parentAttr && !parentAttr.optional && !parentAttr.nullable;

    if (
      parentIsRequired &&
      parentSchema.required &&
      !parentSchema.required.includes(parentName)
    ) {
      parentSchema.required.push(parentName);
    }
  }

  private processArrayItemGroup(
    arrayPath: string,
    itemProperties: EntityAttribute[],
    schema: OpenAPISchema
  ): void {
    const pathParts = arrayPath.split('.');
    let currentProperty = schema.properties;

    if (!currentProperty) {
      return;
    }

    for (let i = 0; i < pathParts.length; i++) {
      const cleanPart = pathParts[i].replace('[]', '');

      if (!currentProperty || !currentProperty[cleanPart]) {
        return;
      }

      if (i < pathParts.length - 1) {
        const nextProperty: any = currentProperty[cleanPart];
        if (!nextProperty || !nextProperty.properties) {
          return;
        }
        currentProperty = nextProperty.properties;
        continue;
      }

      const arrayProperty = currentProperty[cleanPart];

      if (
        arrayProperty.type === 'array' &&
        arrayProperty.items &&
        typeof arrayProperty.items === 'object' &&
        !Array.isArray(arrayProperty.items)
      ) {
        if (!arrayProperty.items.properties) {
          arrayProperty.items.properties = {};
        }
        if (!arrayProperty.items.required) {
          arrayProperty.items.required = [];
        }

        for (const prop of itemProperties) {
          arrayProperty.items.properties[prop.name] =
            this.convertAttribute(prop);

          if (
            !prop.optional &&
            !prop.nullable &&
            !arrayProperty.items.required.includes(prop.name)
          ) {
            arrayProperty.items.required.push(prop.name);
          }
        }

        if (arrayProperty.items.required.length === 0) {
          delete arrayProperty.items.required;
        }
      }
    }
  }
}
