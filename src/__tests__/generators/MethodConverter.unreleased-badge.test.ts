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

  describe('Methods with unreleased versions', () => {
    test('should add x-badge for method with version newer than supported (4.4.0)', () => {
      const method: ApiMethod = {
        name: 'Get userinfo',
        httpMethod: 'GET',
        endpoint: '/oauth/userinfo',
        description: 'Get userinfo',
        versions: ['4.4.0'], // 4.4.0 is newer than supported 4.3.0
      };

      methodConverter.convertMethod(method, 'oauth', spec);

      const operation = spec.paths['/oauth/userinfo']?.get;
      expect(operation).toBeDefined();
      expect((operation as any)['x-badge']).toEqual({ name: 'Unreleased' });
    });

    test('should add x-badge for method with multiple versions including newer ones', () => {
      const method: ApiMethod = {
        name: 'Test method',
        httpMethod: 'POST',
        endpoint: '/api/v1/test',
        description: 'Test endpoint',
        versions: ['3.0.0', '4.3.0', '4.5.0'], // 4.5.0 is newer than supported 4.3.0
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/test']?.post;
      expect(operation).toBeDefined();
      expect((operation as any)['x-badge']).toEqual({ name: 'Unreleased' });
    });

    test('should add x-badge for method with only newer versions', () => {
      const method: ApiMethod = {
        name: 'Future method',
        httpMethod: 'PUT',
        endpoint: '/api/v1/future',
        description: 'Future endpoint',
        versions: ['4.4.0', '4.5.0'], // All newer than supported 4.3.0
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/future']?.put;
      expect(operation).toBeDefined();
      expect((operation as any)['x-badge']).toEqual({ name: 'Unreleased' });
    });
  });

  describe('Methods without unreleased versions', () => {
    test('should not add x-badge for method with current supported version (4.3.0)', () => {
      const method: ApiMethod = {
        name: 'Current method',
        httpMethod: 'GET',
        endpoint: '/api/v1/current',
        description: 'Current endpoint',
        versions: ['4.3.0'], // Same as supported version
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/current']?.get;
      expect(operation).toBeDefined();
      expect((operation as any)['x-badge']).toBeUndefined();
    });

    test('should not add x-badge for method with older versions', () => {
      const method: ApiMethod = {
        name: 'Old method',
        httpMethod: 'GET',
        endpoint: '/api/v1/old',
        description: 'Old endpoint',
        versions: ['2.0.0', '3.0.0', '4.2.0'], // All older than or equal to supported 4.3.0
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/old']?.get;
      expect(operation).toBeDefined();
      expect((operation as any)['x-badge']).toBeUndefined();
    });

    test('should not add x-badge for method with mixed older and current versions', () => {
      const method: ApiMethod = {
        name: 'Mixed method',
        httpMethod: 'GET',
        endpoint: '/api/v1/mixed',
        description: 'Mixed endpoint',
        versions: ['1.0.0', '4.3.0'], // 4.3.0 is the current supported version
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/mixed']?.get;
      expect(operation).toBeDefined();
      expect((operation as any)['x-badge']).toBeUndefined();
    });

    test('should not add x-badge for method without versions', () => {
      const method: ApiMethod = {
        name: 'No versions method',
        httpMethod: 'GET',
        endpoint: '/api/v1/no-versions',
        description: 'Endpoint without versions',
        // No versions property
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/no-versions']?.get;
      expect(operation).toBeDefined();
      expect((operation as any)['x-badge']).toBeUndefined();
    });

    test('should not add x-badge for method with empty versions array', () => {
      const method: ApiMethod = {
        name: 'Empty versions method',
        httpMethod: 'GET',
        endpoint: '/api/v1/empty-versions',
        description: 'Endpoint with empty versions',
        versions: [], // Empty array
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
        versions: ['4.4.0'],
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
        versions: ['4.4.0'],
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
