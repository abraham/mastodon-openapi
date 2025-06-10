import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator Non-Alpha OperationId Generation', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('operationId generation for paths with non-alphanumeric characters', () => {
    it('should strip non-alphanumeric characters from operationId', () => {
      const testMethods: ApiMethodsFile[] = [
        {
          name: 'oauth',
          description: 'OAuth methods',
          methods: [
            {
              name: 'Get OAuth authorization server metadata',
              httpMethod: 'GET',
              endpoint: '/.well-known/oauth-authorization-server',
              description: 'Get OAuth authorization server metadata',
            },
            {
              name: 'Get OpenID Connect configuration',
              httpMethod: 'GET',
              endpoint: '/.well-known/openid-connect',
              description: 'Get OpenID Connect configuration',
            },
            {
              name: 'Get path with mixed separators',
              httpMethod: 'GET',
              endpoint: '/path/with.dots_and-dashes/example',
              description: 'Get path with mixed separators',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], testMethods);

      // Test the specific case mentioned in the GitHub issue
      expect(spec.paths['/.well-known/oauth-authorization-server']?.get?.operationId)
        .toBe('getWellKnownOauthAuthorizationServer');

      // Test other similar cases
      expect(spec.paths['/.well-known/openid-connect']?.get?.operationId)
        .toBe('getWellKnownOpenidConnect');

      expect(spec.paths['/path/with.dots_and-dashes/example']?.get?.operationId)
        .toBe('getPathWithDotsAndDashesExample');
    });

    it('should handle paths with special characters in API endpoints', () => {
      const testMethods: ApiMethodsFile[] = [
        {
          name: 'special',
          description: 'Special character methods',
          methods: [
            {
              name: 'Get at-mention endpoint',
              httpMethod: 'GET',
              endpoint: '/api/v1/accounts/@username',
              description: 'Get at-mention endpoint',
            },
            {
              name: 'Get hash-tag endpoint',
              httpMethod: 'GET',
              endpoint: '/api/v1/tags#trending',
              description: 'Get hash-tag endpoint',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], testMethods);

      // Should strip @ and # characters and apply normal operationId logic
      expect(spec.paths['/api/v1/accounts/@username']?.get?.operationId)
        .toBe('getAccountUsername');
      expect(spec.paths['/api/v1/tags#trending']?.get?.operationId)
        .toBe('getTagsTrending');
    });

    it('should handle paths with multiple consecutive non-alphanumeric characters', () => {
      const testMethods: ApiMethodsFile[] = [
        {
          name: 'complex',
          description: 'Complex path methods',
          methods: [
            {
              name: 'Get complex path',
              httpMethod: 'GET',
              endpoint: '/api/v1/path...with///multiple---separators',
              description: 'Get complex path',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], testMethods);

      // Should handle multiple consecutive separators
      expect(spec.paths['/api/v1/path...with///multiple---separators']?.get?.operationId)
        .toBe('getPathWithMultipleSeparators');
    });
  });
});