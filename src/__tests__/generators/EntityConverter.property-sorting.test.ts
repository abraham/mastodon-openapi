import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';
import { SpecBuilder } from '../../generators/SpecBuilder';
import { EntityClass } from '../../interfaces/EntityClass';

describe('EntityConverter - Property Sorting', () => {
  let entityConverter: EntityConverter;
  let spec: OpenAPISpec;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);

    entityConverter = new EntityConverter(typeParser, utilityHelpers);

    const specBuilder = new SpecBuilder();
    spec = specBuilder.buildInitialSpec();
  });

  it('should sort entity properties by required first then alphabetically', () => {
    const testEntities: EntityClass[] = [
      {
        name: 'TestEntity',
        description: 'Test entity with mixed property order',
        attributes: [
          {
            name: 'zebra',
            description: 'Optional zebra field',
            optional: true,
            type: 'String',
          },
          {
            name: 'apple',
            description: 'Required apple field',
            optional: false,
            type: 'String',
          },
          {
            name: 'dog',
            description: 'Optional dog field',
            optional: true,
            type: 'String',
          },
          {
            name: 'banana',
            description: 'Required banana field',
            optional: false,
            type: 'String',
          },
        ],
      },
    ];

    entityConverter.convertEntities(testEntities, spec);

    const schema = spec.components?.schemas?.TestEntity;
    expect(schema).toBeDefined();
    expect(schema!.properties).toBeDefined();

    // Extract property names in order
    const propertyNames = Object.keys(schema!.properties!);

    // Should be: required properties first (apple, banana), then optional (dog, zebra)
    const expectedOrder = ['apple', 'banana', 'dog', 'zebra'];
    expect(propertyNames).toEqual(expectedOrder);

    // Verify required array also follows the same order
    expect(schema!.required).toEqual(['apple', 'banana']);
  });

  it('should sort nested object properties by required first then alphabetically', () => {
    const testEntities: EntityClass[] = [
      {
        name: 'TestEntityWithNested',
        description: 'Test entity with nested properties',
        attributes: [
          {
            name: 'simple_field',
            description: 'Simple required field',
            optional: false,
            type: 'String',
          },
          {
            name: 'nested.zebra',
            description: 'Optional nested zebra field',
            optional: true,
            type: 'String',
          },
          {
            name: 'nested.apple',
            description: 'Required nested apple field',
            optional: false,
            type: 'String',
          },
          {
            name: 'nested.dog',
            description: 'Optional nested dog field',
            optional: true,
            type: 'String',
          },
          {
            name: 'nested.banana',
            description: 'Required nested banana field',
            optional: false,
            type: 'String',
          },
        ],
      },
    ];

    entityConverter.convertEntities(testEntities, spec);

    const schema = spec.components?.schemas?.TestEntityWithNested;
    expect(schema).toBeDefined();
    expect(schema!.properties).toBeDefined();
    expect(schema!.properties!.nested).toBeDefined();

    const nestedSchema = schema!.properties!.nested as any;
    expect(nestedSchema.type).toBe('object');
    expect(nestedSchema.properties).toBeDefined();

    // Extract nested property names in order
    const nestedPropertyNames = Object.keys(nestedSchema.properties);

    // Should be: required properties first (apple, banana), then optional (dog, zebra)
    const expectedOrder = ['apple', 'banana', 'dog', 'zebra'];
    expect(nestedPropertyNames).toEqual(expectedOrder);
  });

  it('should sort array item properties by required first then alphabetically', () => {
    const testEntities: EntityClass[] = [
      {
        name: 'TestEntityWithArrayItems',
        description: 'Test entity with array item properties',
        attributes: [
          {
            name: 'items[].zebra',
            description: 'Optional zebra field in array items',
            optional: true,
            type: 'String',
          },
          {
            name: 'items[].apple',
            description: 'Required apple field in array items',
            optional: false,
            type: 'String',
          },
          {
            name: 'items[].dog',
            description: 'Optional dog field in array items',
            optional: true,
            type: 'String',
          },
          {
            name: 'items[].banana',
            description: 'Required banana field in array items',
            optional: false,
            type: 'String',
          },
        ],
      },
    ];

    entityConverter.convertEntities(testEntities, spec);

    const schema = spec.components?.schemas?.TestEntityWithArrayItems;
    expect(schema).toBeDefined();
    expect(schema!.properties).toBeDefined();
    
    // The EntityConverter creates a property named "items[]" for items[].property patterns
    expect(schema!.properties!['items[]']).toBeDefined();

    const itemsSchema = schema!.properties!['items[]'] as any;
    expect(itemsSchema.type).toBe('object');
    expect(itemsSchema.properties).toBeDefined();

    // Extract array item property names in order
    const itemPropertyNames = Object.keys(itemsSchema.properties);

    // Should be: required properties first (apple, banana), then optional (dog, zebra)
    const expectedOrder = ['apple', 'banana', 'dog', 'zebra'];
    expect(itemPropertyNames).toEqual(expectedOrder);
  });

  it('should handle nullable properties correctly in sorting', () => {
    const testEntities: EntityClass[] = [
      {
        name: 'TestEntityWithNullable',
        description: 'Test entity with nullable properties',
        attributes: [
          {
            name: 'zebra',
            description: 'Optional zebra field',
            optional: true,
            nullable: false,
            type: 'String',
          },
          {
            name: 'apple',
            description: 'Required apple field',
            optional: false,
            nullable: false,
            type: 'String',
          },
          {
            name: 'dog',
            description: 'Required but nullable dog field',
            optional: false,
            nullable: true,
            type: 'String',
          },
          {
            name: 'banana',
            description: 'Required banana field',
            optional: false,
            nullable: false,
            type: 'String',
          },
        ],
      },
    ];

    entityConverter.convertEntities(testEntities, spec);

    const schema = spec.components?.schemas?.TestEntityWithNullable;
    expect(schema).toBeDefined();
    expect(schema!.properties).toBeDefined();

    // Extract property names in order
    const propertyNames = Object.keys(schema!.properties!);

    // Should be: required non-nullable first (apple, banana), then nullable (dog), then optional (zebra)
    // Note: nullable properties are treated as non-required in the required array
    const expectedOrder = ['apple', 'banana', 'dog', 'zebra'];
    expect(propertyNames).toEqual(expectedOrder);

    // Verify required array excludes nullable properties
    expect(schema!.required).toEqual(['apple', 'banana']);
  });
});