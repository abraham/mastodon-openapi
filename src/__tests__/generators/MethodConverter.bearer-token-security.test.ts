import { MethodConverter } from '../../generators/MethodConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { ErrorExampleRegistry } from '../../generators/ErrorExampleRegistry';
import { ApiMethod } from '../../interfaces/ApiMethod';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('MethodConverter Bearer Token Security', () => {
  let methodConverter: MethodConverter;
  let spec: OpenAPISpec;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    const errorExampleRegistry = new ErrorExampleRegistry();
    methodConverter = new MethodConverter(
      typeParser,
      utilityHelpers,
      errorExampleRegistry
    );

    spec = {
      openapi: '3.1.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          OAuth2: {
            type: 'oauth2',
            description: 'OAuth 2.0 authentication',
            flows: {
              authorizationCode: {
                authorizationUrl: '/oauth/authorize',
                tokenUrl: '/oauth/token',
                scopes: {},
              },
              clientCredentials: {
                tokenUrl: '/oauth/token',
                scopes: {},
              },
            },
          },
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Bearer token authentication',
          },
        },
      },
    };
  });

  describe('Public endpoints with optional user token', () => {
    test('should handle "OAuth: Public" - no auth required', () => {
      const method: ApiMethod = {
        name: 'Get account',
        httpMethod: 'GET',
        endpoint: '/api/v1/accounts/{id}',
        description: 'View information about a profile',
        oauth: 'Public',
      };

      methodConverter.convertMethod(method, 'accounts', spec);

      const operation = spec.paths['/api/v1/accounts/{id}']?.get;
      expect(operation).toBeDefined();
      // Public endpoints should not require authentication
      expect(operation?.security).toBeUndefined();
    });

    test('should handle "OAuth: Public" with optional user token support', () => {
      const method: ApiMethod = {
        name: 'Get account statuses',
        httpMethod: 'GET',
        endpoint: '/api/v1/accounts/{id}/statuses',
        description: 'Statuses posted to the given account',
        oauth:
          'Public (for public statuses only), or user token + `read:statuses` (for private statuses the user is authorized to see)',
      };

      methodConverter.convertMethod(method, 'accounts', spec);

      const operation = spec.paths['/api/v1/accounts/{id}/statuses']?.get;
      expect(operation).toBeDefined();
      // Should support optional user token with scopes (empty objects removed)
      expect(operation?.security).toEqual([
        { OAuth2: ['read:statuses'] }, // Optional user token with scope
      ]);
    });
  });

  describe('User token required endpoints', () => {
    test('should handle "OAuth: User token + scope" - user token required', () => {
      const method: ApiMethod = {
        name: 'Update credentials',
        httpMethod: 'PATCH',
        endpoint: '/api/v1/accounts/update_credentials',
        description: 'Update the current user profile',
        oauth: 'User token + `write:accounts`',
      };

      methodConverter.convertMethod(method, 'accounts', spec);

      const operation =
        spec.paths['/api/v1/accounts/update_credentials']?.patch;
      expect(operation).toBeDefined();
      // Should require user token (authorization code flow)
      expect(operation?.security).toEqual([{ OAuth2: ['write:accounts'] }]);
    });

    test('should handle user token with multiple scopes', () => {
      const method: ApiMethod = {
        name: 'Follow account',
        httpMethod: 'POST',
        endpoint: '/api/v1/accounts/{id}/follow',
        description: 'Follow the given account',
        oauth: 'User token + `write:follows` + `read:accounts`',
      };

      methodConverter.convertMethod(method, 'accounts', spec);

      const operation = spec.paths['/api/v1/accounts/{id}/follow']?.post;
      expect(operation).toBeDefined();
      expect(operation?.security).toEqual([
        { OAuth2: ['write:follows', 'read:accounts'] },
      ]);
    });
  });

  describe('App token required endpoints', () => {
    test('should handle "OAuth: App token + scope" - app token required', () => {
      const method: ApiMethod = {
        name: 'Create account',
        httpMethod: 'POST',
        endpoint: '/api/v1/accounts',
        description: 'Create a new account',
        oauth: 'App token + `write:accounts`',
      };

      methodConverter.convertMethod(method, 'accounts', spec);

      const operation = spec.paths['/api/v1/accounts']?.post;
      expect(operation).toBeDefined();
      // Should require app token (client credentials flow via OAuth2 security scheme)
      expect(operation?.security).toEqual([{ OAuth2: ['write:accounts'] }]);
    });

    test('should handle app token with multiple scopes', () => {
      const method: ApiMethod = {
        name: 'Admin action',
        httpMethod: 'POST',
        endpoint: '/api/v1/admin/action',
        description: 'Perform admin action',
        oauth: 'App token + `admin:write` + `write:accounts`',
      };

      methodConverter.convertMethod(method, 'admin', spec);

      const operation = spec.paths['/api/v1/admin/action']?.post;
      expect(operation).toBeDefined();
      expect(operation?.security).toEqual([
        { OAuth2: ['admin:write', 'write:accounts'] },
      ]);
    });
  });

  describe('Complex OAuth patterns', () => {
    test('should handle mixed token types', () => {
      const method: ApiMethod = {
        name: 'Flexible endpoint',
        httpMethod: 'GET',
        endpoint: '/api/v1/flexible',
        description: 'Endpoint that accepts different token types',
        oauth: 'User token + `read` or App token + `read`',
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/flexible']?.get;
      expect(operation).toBeDefined();
      // Mixed token types use the same OAuth2 security scheme with both flows available
      expect(operation?.security).toEqual([{ OAuth2: ['read'] }]);
    });

    test('should handle token without scopes', () => {
      const method: ApiMethod = {
        name: 'Simple auth',
        httpMethod: 'GET',
        endpoint: '/api/v1/simple',
        description: 'Simple authenticated endpoint',
        oauth: 'User token',
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/simple']?.get;
      expect(operation).toBeDefined();
      expect(operation?.security).toEqual([{ OAuth2: [] }]);
    });
  });

  describe('Edge cases', () => {
    test('should handle malformed OAuth patterns gracefully', () => {
      const method: ApiMethod = {
        name: 'Malformed',
        httpMethod: 'GET',
        endpoint: '/api/v1/malformed',
        description: 'Method with malformed OAuth',
        oauth: 'Something weird that we cannot parse',
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/malformed']?.get;
      expect(operation).toBeDefined();
      // Should fallback to basic OAuth with no scopes
      expect(operation?.security).toEqual([{ OAuth2: [] }]);
    });

    test('should handle empty OAuth field', () => {
      const method: ApiMethod = {
        name: 'No OAuth',
        httpMethod: 'GET',
        endpoint: '/api/v1/no-oauth',
        description: 'Method without OAuth field',
        oauth: '',
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/no-oauth']?.get;
      expect(operation).toBeDefined();
      // Empty OAuth should result in no security requirement
      expect(operation?.security).toBeUndefined();
    });
  });
});
