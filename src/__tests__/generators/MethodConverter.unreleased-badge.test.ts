import { MethodConverter } from '../../generators/MethodConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { ErrorExampleRegistry } from '../../generators/ErrorExampleRegistry';
import { ApiMethod } from '../../interfaces/ApiMethod';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('MethodConverter Unreleased Badge', () => {
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
        securitySchemes: {},
      },
    };
  });

  describe('Methods with unreleased operations', () => {
    test('should add x-badge for method added in version newer than supported (4.4.0)', () => {
      const method: ApiMethod = {
        name: 'Get userinfo',
        httpMethod: 'GET',
        endpoint: '/oauth/userinfo',
        description: 'Get userinfo',
        version: '4.4.0 - added', // Operation added in 4.4.0
      };

      methodConverter.convertMethod(method, 'oauth', spec);

      const operation = spec.paths['/oauth/userinfo']?.get;
      expect(operation).toBeDefined();
      expect((operation as any)['x-badge']).toEqual({ name: 'Unreleased' });
    });

    test('should add x-badge for method added in version newer than supported (4.5.0)', () => {
      const method: ApiMethod = {
        name: 'Future method',
        httpMethod: 'PUT',
        endpoint: '/api/v1/future',
        description: 'Future endpoint',
        version: '4.5.0 - added', // Operation added in 4.5.0
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/future']?.put;
      expect(operation).toBeDefined();
      expect((operation as any)['x-badge']).toEqual({ name: 'Unreleased' });
    });

    test('should add x-badge for method with complex version history but added in newer version', () => {
      const method: ApiMethod = {
        name: 'Complex method',
        httpMethod: 'POST',
        endpoint: '/api/v1/complex',
        description: 'Complex endpoint',
        version: '4.4.0 - added\\n4.5.0 - some parameter updated', // Operation added in 4.4.0
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/complex']?.post;
      expect(operation).toBeDefined();
      expect((operation as any)['x-badge']).toEqual({ name: 'Unreleased' });
    });
  });

  describe('Methods without unreleased operations', () => {
    test('should not add x-badge for method added in current supported version (4.3.0)', () => {
      const method: ApiMethod = {
        name: 'Current method',
        httpMethod: 'GET',
        endpoint: '/api/v1/current',
        description: 'Current endpoint',
        version: '4.3.0 - added', // Operation added in current supported version
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/current']?.get;
      expect(operation).toBeDefined();
      expect((operation as any)['x-badge']).toBeUndefined();
    });

    test('should not add x-badge for method added in older version', () => {
      const method: ApiMethod = {
        name: 'Old method',
        httpMethod: 'GET',
        endpoint: '/api/v1/old',
        description: 'Old endpoint',
        version: '2.7.0 - added', // Operation added in older version
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/old']?.get;
      expect(operation).toBeDefined();
      expect((operation as any)['x-badge']).toBeUndefined();
    });

    test('should not add x-badge for method added in older version but with newer parameter additions', () => {
      const method: ApiMethod = {
        name: 'Accounts',
        httpMethod: 'POST',
        endpoint: '/api/v1/accounts',
        description: 'Register an account',
        version:
          '2.7.0 - added\\n3.0.0 - added reason parameter\\n3.4.0 - added details to failure response\\n4.4.0 - added date_of_birth parameter',
      };

      methodConverter.convertMethod(method, 'accounts', spec);

      const operation = spec.paths['/api/v1/accounts']?.post;
      expect(operation).toBeDefined();
      expect((operation as any)['x-badge']).toBeUndefined();
    });

    test('should not add x-badge for method with mixed older and current versions', () => {
      const method: ApiMethod = {
        name: 'Mixed method',
        httpMethod: 'GET',
        endpoint: '/api/v1/mixed',
        description: 'Mixed endpoint',
        version: '1.0.0 - added\\n4.3.0 - some update', // Operation added in 1.0.0
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/mixed']?.get;
      expect(operation).toBeDefined();
      expect((operation as any)['x-badge']).toBeUndefined();
    });

    test('should not add x-badge for method without version history', () => {
      const method: ApiMethod = {
        name: 'No versions method',
        httpMethod: 'GET',
        endpoint: '/api/v1/no-versions',
        description: 'Endpoint without versions',
        // No version property
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/no-versions']?.get;
      expect(operation).toBeDefined();
      expect((operation as any)['x-badge']).toBeUndefined();
    });

    test('should not add x-badge for method with empty version history', () => {
      const method: ApiMethod = {
        name: 'Empty versions method',
        httpMethod: 'GET',
        endpoint: '/api/v1/empty-versions',
        description: 'Endpoint with empty versions',
        version: '', // Empty string
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/empty-versions']?.get;
      expect(operation).toBeDefined();
      expect((operation as any)['x-badge']).toBeUndefined();
    });
  });

  describe('Interaction with other features', () => {
    test('should add x-badge alongside deprecated flag', () => {
      const method: ApiMethod = {
        name: 'Deprecated unreleased method',
        httpMethod: 'GET',
        endpoint: '/api/v1/deprecated-unreleased',
        description: 'Deprecated endpoint that was unreleased',
        version: '4.4.0 - added',
        deprecated: true,
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/deprecated-unreleased']?.get;
      expect(operation).toBeDefined();
      expect(operation?.deprecated).toBe(true);
      expect((operation as any)['x-badge']).toEqual({ name: 'Unreleased' });
    });

    test('should add x-badge alongside OAuth configuration', () => {
      const method: ApiMethod = {
        name: 'Unreleased OAuth method',
        httpMethod: 'POST',
        endpoint: '/api/v1/unreleased-oauth',
        description: 'Unreleased endpoint with OAuth',
        version: '4.4.0 - added',
        oauth: 'User token + `write:statuses`',
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/unreleased-oauth']?.post;
      expect(operation).toBeDefined();
      expect(operation?.security).toBeDefined();
      expect((operation as any)['x-badge']).toEqual({ name: 'Unreleased' });
    });
  });
});
