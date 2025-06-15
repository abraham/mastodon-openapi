import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { ApiParameter } from '../../interfaces/ApiParameter';

describe('TypeParser Enum Values Fix', () => {
  let typeParser: TypeParser;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
  });

  it('should preserve enum values when parameter has schema and enumValues', () => {
    const parameter: ApiParameter = {
      name: 'visibility',
      description:
        'String. Sets the visibility of the posted status to `public`, `unlisted`, `private`, `direct`.',
      in: 'formData',
      enumValues: ['public', 'unlisted', 'private', 'direct'],
      schema: {
        type: 'string',
      },
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema.type).toBe('string');
    expect(schema.description).toBe('Sets the visibility of the posted status to `public`, `unlisted`, `private`, `direct`.');
    expect(schema.enum).toEqual(['public', 'unlisted', 'private', 'direct']);
  });

  it('should preserve enum values for array parameters with schema and enumValues', () => {
    const parameter: ApiParameter = {
      name: 'types',
      description: 'Array of notification types',
      in: 'query',
      enumValues: ['mention', 'reblog', 'favourite'],
      schema: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['mention', 'reblog', 'favourite'],
        },
      },
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema.type).toBe('array');
    expect(schema.description).toBe('Array of notification types');
    // Array properties should NOT have enum on the array itself, only on items
    expect(schema.enum).toBeUndefined();
    expect(schema.items).toBeDefined();
    expect(schema.items!.type).toBe('string');
    expect(schema.items!.enum).toEqual(['mention', 'reblog', 'favourite']);
  });

  it('should work correctly when parameter has no schema (fallback path)', () => {
    const parameter: ApiParameter = {
      name: 'visibility',
      description:
        'String. Sets the visibility of the posted status to `public`, `unlisted`, `private`, `direct`.',
      in: 'formData',
      enumValues: ['public', 'unlisted', 'private', 'direct'],
      // No schema property
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema.type).toBe('string');
    expect(schema.description).toBe('Sets the visibility of the posted status to `public`, `unlisted`, `private`, `direct`.');
    expect(schema.enum).toEqual(['public', 'unlisted', 'private', 'direct']);
  });

  it('should work correctly when parameter has schema but no enumValues', () => {
    const parameter: ApiParameter = {
      name: 'status',
      description: 'String. The text content of the status.',
      in: 'formData',
      schema: {
        type: 'string',
      },
      // No enumValues property
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema.type).toBe('string');
    expect(schema.description).toBe('The text content of the status.');
    expect(schema.enum).toBeUndefined();
  });
});
