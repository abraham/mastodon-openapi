import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';
import { HashAttribute } from '../../interfaces/ApiMethod';

describe('TypeParser - Array of Hash handling', () => {
  let typeParser: TypeParser;
  let spec: OpenAPISpec;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);

    // Create a minimal spec to test with
    spec = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };
  });

  test('should handle "Array of Hash" return type', () => {
    const result = typeParser.parseResponseSchema('Array of Hash', spec);

    expect(result).toEqual({
      type: 'array',
      items: {
        type: 'object',
      },
    });
  });

  test('should handle "Array of Object" return type', () => {
    const result = typeParser.parseResponseSchema('Array of Object', spec);

    expect(result).toEqual({
      type: 'array',
      items: {
        type: 'object',
      },
    });
  });

  test('should handle "Array of String" for comparison', () => {
    const result = typeParser.parseResponseSchema('Array of String', spec);

    expect(result).toEqual({
      type: 'array',
      items: {
        type: 'string',
      },
    });
  });

  test('should handle "Array of Hash" with hash attributes', () => {
    const hashAttributes: HashAttribute[] = [
      {
        name: 'week',
        type: 'String',
        description: 'Midnight at the first day of the week.',
      },
      {
        name: 'statuses',
        type: 'String',
        description: 'The number of Statuses created since the week began.',
      },
      {
        name: 'logins',
        type: 'String',
        description: 'The number of user logins since the week began.',
      },
      {
        name: 'registrations',
        type: 'String',
        description: 'The number of user registrations since the week began.',
      },
    ];

    const result = typeParser.parseResponseSchema(
      'Array of Hash',
      spec,
      hashAttributes
    );

    expect(result).toEqual({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          week: {
            type: 'string',
            description: 'Midnight at the first day of the week.',
          },
          statuses: {
            type: 'string',
            description: 'The number of Statuses created since the week began.',
          },
          logins: {
            type: 'string',
            description: 'The number of user logins since the week began.',
          },
          registrations: {
            type: 'string',
            description:
              'The number of user registrations since the week began.',
          },
        },
      },
    });
  });
});
