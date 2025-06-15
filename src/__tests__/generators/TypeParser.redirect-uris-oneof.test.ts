import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { ApiParameter } from '../../interfaces/ApiParameter';

describe('TypeParser - redirect_uris oneOf pattern', () => {
  let typeParser: TypeParser;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
  });

  test('should generate oneOf schema for redirect_uris parameter with String or Array of Strings', () => {
    const parameter: ApiParameter = {
      name: 'redirect_uris',
      description:
        'String or Array of Strings. Where the user should be redirected after authorization. To display the authorization code to the user instead of redirecting to a web page, use `urn:ietf:wg:oauth:2.0:oob` in this parameter.',
      in: 'formData',
      required: true,
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema).toEqual({
      description:
        'Where the user should be redirected after authorization. To display the authorization code to the user instead of redirecting to a web page, use `urn:ietf:wg:oauth:2.0:oob` in this parameter.',
      oneOf: [
        {
          type: 'string',
          format: 'uri',
        },
        {
          type: 'array',
          items: {
            type: 'string',
            format: 'uri',
          },
        },
      ],
    });
  });

  test('should generate oneOf schema for parameter with "String or Array of String" pattern', () => {
    const parameter: ApiParameter = {
      name: 'test_param',
      description: 'String or Array of String. Test parameter description.',
      in: 'formData',
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema).toEqual({
      description: 'Test parameter description.',
      oneOf: [
        {
          type: 'string',
        },
        {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      ],
    });
  });

  test('should detect URI format in redirect_uris case-insensitive', () => {
    const parameter: ApiParameter = {
      name: 'redirect_uris',
      description:
        'String or Array of String (URLs). Where the user should be redirected.',
      in: 'formData',
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema.oneOf).toBeDefined();
    expect(schema.oneOf![0]).toEqual({
      type: 'string',
      format: 'uri',
    });
    expect(schema.oneOf![1]).toEqual({
      type: 'array',
      items: {
        type: 'string',
        format: 'uri',
      },
    });
  });

  test('should not generate oneOf for regular string parameters', () => {
    const parameter: ApiParameter = {
      name: 'client_name',
      description: 'String. A name for your application',
      in: 'formData',
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema).toEqual({
      type: 'string',
      description: 'A name for your application',
    });
  });

  test('should not generate oneOf for regular array parameters', () => {
    const parameter: ApiParameter = {
      name: 'scopes',
      description: 'Array of String. List of scopes.',
      in: 'formData',
    };

    const schema = typeParser.convertParameterToSchema(parameter);

    expect(schema).toEqual({
      type: 'string',
      description: 'List of scopes.',
    });
  });
});
