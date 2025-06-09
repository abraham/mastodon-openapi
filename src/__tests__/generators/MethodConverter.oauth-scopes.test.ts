import { MethodConverter } from '../../generators/MethodConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { ApiMethod } from '../../interfaces/ApiMethod';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('MethodConverter OAuth Scopes', () => {
  let methodConverter: MethodConverter;
  let spec: OpenAPISpec;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    methodConverter = new MethodConverter(typeParser, utilityHelpers);

    spec = {
      openapi: '3.0.3',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };
  });

  test('should extract single OAuth scope from method oauth field', () => {
    const method: ApiMethod = {
      name: 'Block account',
      httpMethod: 'POST',
      endpoint: '/api/v1/accounts/{id}/block',
      description: 'Block the given account',
      oauth: 'User token + `write:blocks`',
    };

    methodConverter.convertMethod(method, 'accounts', spec);

    const operation = spec.paths['/api/v1/accounts/{id}/block']?.post;
    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([{ OAuth2: ['write:blocks'] }]);
  });

  test('should extract multiple OAuth scopes from method oauth field', () => {
    const method: ApiMethod = {
      name: 'Test method',
      httpMethod: 'POST',
      endpoint: '/api/v1/test',
      description: 'Test method with multiple scopes',
      oauth: 'User token + `read:accounts` + `write:accounts`',
    };

    methodConverter.convertMethod(method, 'test', spec);

    const operation = spec.paths['/api/v1/test']?.post;
    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([
      { OAuth2: ['read:accounts', 'write:accounts'] },
    ]);
  });

  test('should handle different OAuth text formats', () => {
    const method: ApiMethod = {
      name: 'Delete avatar',
      httpMethod: 'DELETE',
      endpoint: '/api/v1/profile/avatar',
      description: 'Delete profile avatar',
      oauth: 'User token + `write:accounts`',
    };

    methodConverter.convertMethod(method, 'profile', spec);

    const operation = spec.paths['/api/v1/profile/avatar']?.delete;
    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([{ OAuth2: ['write:accounts'] }]);
  });

  test('should handle admin scopes', () => {
    const method: ApiMethod = {
      name: 'Admin method',
      httpMethod: 'GET',
      endpoint: '/api/v1/admin/accounts',
      description: 'Admin method',
      oauth: 'User token + `admin:read:accounts`',
    };

    methodConverter.convertMethod(method, 'admin', spec);

    const operation = spec.paths['/api/v1/admin/accounts']?.get;
    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([{ OAuth2: ['admin:read:accounts'] }]);
  });

  test('should not add security for public methods', () => {
    const method: ApiMethod = {
      name: 'Public method',
      httpMethod: 'GET',
      endpoint: '/api/v1/public',
      description: 'Public method',
      oauth: 'Public',
    };

    methodConverter.convertMethod(method, 'public', spec);

    const operation = spec.paths['/api/v1/public']?.get;
    expect(operation).toBeDefined();
    expect(operation?.security).toBeUndefined();
  });

  test('should not add security for methods without oauth field', () => {
    const method: ApiMethod = {
      name: 'Method without oauth',
      httpMethod: 'GET',
      endpoint: '/api/v1/no-oauth',
      description: 'Method without oauth',
    };

    methodConverter.convertMethod(method, 'test', spec);

    const operation = spec.paths['/api/v1/no-oauth']?.get;
    expect(operation).toBeDefined();
    expect(operation?.security).toBeUndefined();
  });

  test('should handle malformed OAuth text gracefully', () => {
    const method: ApiMethod = {
      name: 'Malformed oauth method',
      httpMethod: 'POST',
      endpoint: '/api/v1/malformed',
      description: 'Method with malformed oauth text',
      oauth: 'User token without backticks',
    };

    methodConverter.convertMethod(method, 'test', spec);

    const operation = spec.paths['/api/v1/malformed']?.post;
    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([{ OAuth2: [] }]);
  });

  test('should only extract valid scope formats with colons', () => {
    const method: ApiMethod = {
      name: 'Mixed scope method',
      httpMethod: 'POST',
      endpoint: '/api/v1/mixed',
      description: 'Method with mixed scope formats',
      oauth: 'User token + `write:accounts` + `invalidscope` + `read:statuses`',
    };

    methodConverter.convertMethod(method, 'test', spec);

    const operation = spec.paths['/api/v1/mixed']?.post;
    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([
      { OAuth2: ['write:accounts', 'read:statuses'] },
    ]);
  });
});
