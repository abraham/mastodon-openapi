import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('TypeParser - Inline JSON Response Schema Integration', () => {
  let typeParser: TypeParser;
  let utilityHelpers: UtilityHelpers;
  let spec: OpenAPISpec;

  beforeEach(() => {
    utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);

    // Create a minimal spec with a generated entity
    spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          DiscoverOauthServerConfigurationResponse: {
            type: 'object',
            description:
              'Response schema for Discover OAuth Server Configuration',
            properties: {
              issuer: {
                type: 'string',
                format: 'uri',
                description: 'issuer field',
              },
              scopes_supported: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of scopes_supported',
              },
            },
            required: ['issuer', 'scopes_supported'],
          },
          OEmbedResponse: {
            type: 'object',
            description: 'Response schema for Get OEmbed info as JSON',
            properties: {
              type: {
                type: 'string',
                description: 'type field',
              },
              version: {
                type: 'string',
                description: 'version field',
              },
            },
            required: ['type', 'version'],
          },
        },
      },
    };
  });

  test('should detect and return inline JSON response schema', () => {
    const returns = 'JSON as per the above description';
    const methodName = 'Discover OAuth Server Configuration';

    const result = typeParser.parseResponseSchema(
      returns,
      spec,
      undefined,
      methodName
    );

    expect(result).toEqual({
      $ref: '#/components/schemas/DiscoverOauthServerConfigurationResponse',
    });
  });

  test('should return null for inline JSON when entity does not exist', () => {
    const returns = 'JSON as per the above description';
    const methodName = 'Non-existent Method';

    const result = typeParser.parseResponseSchema(
      returns,
      spec,
      undefined,
      methodName
    );

    expect(result).toBeNull();
  });

  test('should prioritize entity references over inline JSON detection', () => {
    const returns = '[Account] as per the above description';
    const methodName = 'Discover OAuth Server Configuration';

    // Add Account entity to spec
    spec.components!.schemas!['Account'] = {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
    };

    const result = typeParser.parseResponseSchema(
      returns,
      spec,
      undefined,
      methodName
    );

    // Should return Account reference, not the inline JSON response
    expect(result).toEqual({
      $ref: '#/components/schemas/Account',
    });
  });

  test('should not detect inline JSON for regular text without "JSON as per" pattern', () => {
    const returns = 'String response with detailed information';
    const methodName = 'Some Method';

    const result = typeParser.parseResponseSchema(
      returns,
      spec,
      undefined,
      methodName
    );

    expect(result).toBeNull();
  });

  test('should handle various inline JSON patterns', () => {
    const testCases = [
      'JSON as per the above description',
      'JSON response containing the data',
      'JSON object with server metadata',
      'JSON containing configuration details',
    ];

    for (const returns of testCases) {
      const result = typeParser.parseResponseSchema(
        returns,
        spec,
        undefined,
        'Discover OAuth Server Configuration'
      );

      expect(result).toEqual({
        $ref: '#/components/schemas/DiscoverOauthServerConfigurationResponse',
      });
    }
  });

  test('should detect metadata patterns as inline JSON', () => {
    const testCases = [
      'OEmbed metadata',
      'Server metadata',
      'Configuration metadata\\', // With trailing backslash like in actual docs
    ];

    for (const returns of testCases) {
      const result = typeParser.parseResponseSchema(
        returns,
        spec,
        undefined,
        'Get OEmbed info as JSON'
      );

      expect(result).toEqual({
        $ref: '#/components/schemas/OEmbedResponse',
      });
    }
  });
});
