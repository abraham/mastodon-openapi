import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { ApiParameter } from '../../interfaces/ApiParameter';

describe('TypeParser Default Value Types', () => {
  let typeParser: TypeParser;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
  });

  it('should convert string default values to integers for integer type parameters', () => {
    const parameter: ApiParameter = {
      name: 'limit',
      description:
        'Maximum number of results to return. Defaults to 20 statuses.',
      in: 'query',
      defaultValue: '20',
      schema: {
        type: 'integer',
      },
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema.type).toBe('integer');
    expect(schema.default).toBe(20); // Should be number, not string
    expect(typeof schema.default).toBe('number');
  });

  it('should convert string default values to numbers for number type parameters', () => {
    const parameter: ApiParameter = {
      name: 'price',
      description: 'Price value. Defaults to 15.99.',
      in: 'query',
      defaultValue: '15.99',
      schema: {
        type: 'number',
      },
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema.type).toBe('number');
    expect(schema.default).toBe(15.99); // Should be number, not string
    expect(typeof schema.default).toBe('number');
  });

  it('should convert string default values to booleans for boolean type parameters', () => {
    const parameter: ApiParameter = {
      name: 'enabled',
      description: 'Enable feature. Defaults to true.',
      in: 'query',
      defaultValue: 'true',
      schema: {
        type: 'boolean',
      },
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema.type).toBe('boolean');
    expect(schema.default).toBe(true); // Should be boolean, not string
    expect(typeof schema.default).toBe('boolean');
  });

  it('should convert string "false" default values to booleans for boolean type parameters', () => {
    const parameter: ApiParameter = {
      name: 'disabled',
      description: 'Disable feature. Defaults to false.',
      in: 'query',
      defaultValue: 'false',
      schema: {
        type: 'boolean',
      },
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema.type).toBe('boolean');
    expect(schema.default).toBe(false); // Should be boolean, not string
    expect(typeof schema.default).toBe('boolean');
  });

  it('should keep string default values as strings for string type parameters', () => {
    const parameter: ApiParameter = {
      name: 'visibility',
      description: 'Status visibility. Defaults to public.',
      in: 'query',
      defaultValue: 'public',
      schema: {
        type: 'string',
      },
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema.type).toBe('string');
    expect(schema.default).toBe('public'); // Should remain string
    expect(typeof schema.default).toBe('string');
  });

  it('should handle fallback paths with type conversion for integers', () => {
    const parameter: ApiParameter = {
      name: 'limit',
      description:
        'Integer. Maximum number of results to return. Defaults to 20 statuses.',
      in: 'query',
      defaultValue: '20',
      // No schema property, will use fallback path
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema.type).toBe('string'); // Fallback defaults to string
    expect(schema.default).toBe('20'); // Should remain string since type is string
    expect(typeof schema.default).toBe('string');
  });

  it('should handle edge cases with invalid number strings', () => {
    const parameter: ApiParameter = {
      name: 'limit',
      description: 'Maximum number of results to return. Defaults to invalid.',
      in: 'query',
      defaultValue: 'invalid',
      schema: {
        type: 'integer',
      },
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema.type).toBe('integer');
    expect(schema.default).toBe('invalid'); // Should remain string if conversion fails
    expect(typeof schema.default).toBe('string');
  });

  it('should handle undefined default values', () => {
    const parameter: ApiParameter = {
      name: 'limit',
      description: 'Maximum number of results to return.',
      in: 'query',
      schema: {
        type: 'integer',
      },
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema.type).toBe('integer');
    expect(schema.default).toBeUndefined();
  });
});
