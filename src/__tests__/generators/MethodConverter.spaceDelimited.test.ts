import { ApiMethod } from '../../interfaces/ApiMethod';
import { MethodConverter } from '../../generators/MethodConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { ErrorExampleRegistry } from '../../generators/ErrorExampleRegistry';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('MethodConverter spaceDelimited parameter handling', () => {
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
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {},
      components: {
        schemas: {},
        examples: {},
      },
    };
  });

  test('should add spaceDelimited style to scope query parameter', () => {
    const method: ApiMethod = {
      name: 'Authorize a user',
      httpMethod: 'GET',
      endpoint: '/oauth/authorize',
      description: 'Displays an authorization form to the user',
      parameters: [
        {
          name: 'scope',
          description:
            'List of requested OAuth scopes, separated by spaces (or by pluses, if using query parameters). Must be a subset of `scopes` declared during app registration. If not provided, defaults to `read`.',
          in: 'query',
          required: false,
          defaultValue: 'read',
          schema: {
            type: 'string',
          },
        },
        {
          name: 'client_id',
          description: 'The client ID, obtained during app registration.',
          in: 'query',
          required: true,
          schema: {
            type: 'string',
          },
        },
      ],
    };

    methodConverter.convertMethod(method, 'oauth', spec);

    const operation = spec.paths['/oauth/authorize']?.get;
    expect(operation).toBeDefined();
    expect(operation?.parameters).toBeDefined();
    expect(operation?.parameters?.length).toBe(2);

    // Find the scope parameter
    const scopeParam = operation?.parameters?.find((p) => p.name === 'scope');
    expect(scopeParam).toBeDefined();
    expect(scopeParam?.style).toBe('spaceDelimited');

    // Verify client_id parameter does not have spaceDelimited style
    const clientIdParam = operation?.parameters?.find(
      (p) => p.name === 'client_id'
    );
    expect(clientIdParam).toBeDefined();
    expect(clientIdParam?.style).toBeUndefined();
  });

  test('should identify spaceDelimited parameters based on description', () => {
    const method: ApiMethod = {
      name: 'Test endpoint',
      httpMethod: 'GET',
      endpoint: '/test',
      description: 'Test endpoint',
      parameters: [
        {
          name: 'scope',
          description: 'OAuth scopes separated by spaces',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
          },
        },
        {
          name: 'scope',
          description: 'Space-separated list of scopes',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
          },
        },
        {
          name: 'other_param',
          description: 'Some other parameter',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
          },
        },
      ],
    };

    methodConverter.convertMethod(method, 'test', spec);

    const operation = spec.paths['/test']?.get;
    expect(operation).toBeDefined();
    expect(operation?.parameters).toBeDefined();
    expect(operation?.parameters?.length).toBe(3);

    // Both scope parameters should have spaceDelimited style
    const scopeParams = operation?.parameters?.filter(
      (p) => p.name === 'scope'
    );
    expect(scopeParams).toHaveLength(2);
    scopeParams?.forEach((param) => {
      expect(param.style).toBe('spaceDelimited');
    });

    // Other parameter should not have spaceDelimited style
    const otherParam = operation?.parameters?.find(
      (p) => p.name === 'other_param'
    );
    expect(otherParam).toBeDefined();
    expect(otherParam?.style).toBeUndefined();
  });

  test('should not add spaceDelimited style to non-scope parameters', () => {
    const method: ApiMethod = {
      name: 'Test endpoint',
      httpMethod: 'GET',
      endpoint: '/test',
      description: 'Test endpoint',
      parameters: [
        {
          name: 'not_scope',
          description: 'Some parameter separated by spaces',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
          },
        },
      ],
    };

    methodConverter.convertMethod(method, 'test', spec);

    const operation = spec.paths['/test']?.get;
    expect(operation).toBeDefined();
    expect(operation?.parameters).toBeDefined();
    expect(operation?.parameters?.length).toBe(1);

    const param = operation?.parameters?.[0];
    expect(param).toBeDefined();
    expect(param?.style).toBeUndefined();
  });

  test('should handle scope parameter without space-related description', () => {
    const method: ApiMethod = {
      name: 'Test endpoint',
      httpMethod: 'GET',
      endpoint: '/test',
      description: 'Test endpoint',
      parameters: [
        {
          name: 'scope',
          description: 'The scope parameter',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
          },
        },
      ],
    };

    methodConverter.convertMethod(method, 'test', spec);

    const operation = spec.paths['/test']?.get;
    expect(operation).toBeDefined();
    expect(operation?.parameters).toBeDefined();
    expect(operation?.parameters?.length).toBe(1);

    const param = operation?.parameters?.[0];
    expect(param).toBeDefined();
    expect(param?.style).toBeUndefined();
  });
});
