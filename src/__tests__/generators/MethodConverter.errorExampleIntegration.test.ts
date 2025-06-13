import { MethodConverter } from '../../generators/MethodConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { ErrorExampleRegistry } from '../../generators/ErrorExampleRegistry';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';
import { ApiMethod } from '../../interfaces/ApiMethod';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('MethodConverter Error Example Integration', () => {
  let methodConverter: MethodConverter;
  let typeParser: TypeParser;
  let utilityHelpers: UtilityHelpers;
  let errorExampleRegistry: ErrorExampleRegistry;

  beforeEach(() => {
    utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
    errorExampleRegistry = new ErrorExampleRegistry();
    methodConverter = new MethodConverter(
      typeParser,
      utilityHelpers,
      errorExampleRegistry
    );
  });

  it('should use common error examples when method-specific examples are not available', () => {
    // First, collect error examples from a method that has them
    const methodFilesWithExamples: ApiMethodsFile[] = [
      {
        name: 'accounts',
        description: 'Account methods',
        methods: [
          {
            name: 'Register an account',
            httpMethod: 'POST',
            endpoint: '/api/v1/accounts',
            description: 'Creates a user and account records',
            responseExamples: {
              '401': { error: 'The access token is invalid' },
              '429': { error: 'Too many requests' },
            },
          },
        ],
      },
    ];

    // Collect the examples
    errorExampleRegistry.collectErrorExamples(methodFilesWithExamples);

    // Create a method without specific error examples
    const methodWithoutExamples: ApiMethod = {
      name: 'Get account',
      httpMethod: 'GET',
      endpoint: '/api/v1/accounts/:id',
      description: 'View information about a profile.',
      returns: 'Account',
      // No responseExamples - should use common ones
    };

    const methodFile: ApiMethodsFile = {
      name: 'accounts',
      description: 'Account methods',
      methods: [methodWithoutExamples],
    };

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {},
      },
    };

    methodConverter.convertMethods([methodFile], spec);

    const getOperation = spec.paths['/api/v1/accounts/{id}']?.get;
    expect(getOperation).toBeDefined();
    expect(getOperation?.responses).toBeDefined();

    // Check that common error examples are used via shared components
    const response401 = getOperation?.responses['401'];
    expect(response401).toBeDefined();
    expect(
      response401?.content?.['application/json']?.examples?.Error401Example
    ).toBeDefined();
    expect(
      (
        response401?.content?.['application/json']?.examples
          ?.Error401Example as any
      )?.$ref
    ).toBe('#/components/examples/Error401Example');

    const response429 = getOperation?.responses['429'];
    expect(response429).toBeDefined();
    expect(
      response429?.content?.['application/json']?.examples?.Error429Example
    ).toBeDefined();
    expect(
      (
        response429?.content?.['application/json']?.examples
          ?.Error429Example as any
      )?.$ref
    ).toBe('#/components/examples/Error429Example');

    // Check that the shared component examples contain the correct values
    expect(spec.components?.examples?.Error401Example?.value).toEqual({
      error: 'The access token is invalid',
    });
    expect(spec.components?.examples?.Error429Example?.value).toEqual({
      error: 'Too many requests',
    });
  });

  it('should prioritize method-specific examples over common ones', () => {
    // First, collect common error examples
    const methodFilesWithExamples: ApiMethodsFile[] = [
      {
        name: 'accounts',
        description: 'Account methods',
        methods: [
          {
            name: 'Register an account',
            httpMethod: 'POST',
            endpoint: '/api/v1/accounts',
            description: 'Creates a user and account records',
            responseExamples: {
              '401': { error: 'Common 401 error' },
            },
          },
        ],
      },
    ];

    errorExampleRegistry.collectErrorExamples(methodFilesWithExamples);

    // Create a method with its own specific error example
    const methodWithSpecificExample: ApiMethod = {
      name: 'Post status',
      httpMethod: 'POST',
      endpoint: '/api/v1/statuses',
      description: 'Publish a status',
      returns: 'Status',
      responseExamples: {
        '401': { error: 'Specific 401 error for this method' },
      },
    };

    const methodFile: ApiMethodsFile = {
      name: 'statuses',
      description: 'Status methods',
      methods: [methodWithSpecificExample],
    };

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {},
      },
    };

    methodConverter.convertMethods([methodFile], spec);

    const postOperation = spec.paths['/api/v1/statuses']?.post;
    expect(postOperation).toBeDefined();

    // Should use method-specific example over common one
    const response401 = postOperation?.responses['401'];
    expect(response401).toBeDefined();
    expect(
      response401?.content?.['application/json']?.examples?.Error401Example
    ).toBeDefined();
    expect(
      (
        response401?.content?.['application/json']?.examples
          ?.Error401Example as any
      )?.$ref
    ).toBe('#/components/examples/Error401Example');

    // Check that the component example contains the method-specific value
    expect(spec.components?.examples?.Error401Example?.value).toEqual({
      error: 'Specific 401 error for this method',
    });
  });

  it('should not use common examples for success responses', () => {
    // Create a method file with both success and error examples
    const methodFilesWithExamples: ApiMethodsFile[] = [
      {
        name: 'test',
        description: 'Test methods',
        methods: [
          {
            name: 'Test method',
            httpMethod: 'GET',
            endpoint: '/api/v1/test',
            description: 'Test method',
            responseExamples: {
              '200': { success: true },
              '201': { created: true },
              '401': { error: 'Unauthorized' },
            },
          },
        ],
      },
    ];

    errorExampleRegistry.collectErrorExamples(methodFilesWithExamples);

    // Create a method without any examples
    const methodWithoutExamples: ApiMethod = {
      name: 'Another test method',
      httpMethod: 'POST',
      endpoint: '/api/v1/another-test',
      description: 'Another test method',
      returns: 'TestResult',
    };

    const methodFile: ApiMethodsFile = {
      name: 'test',
      description: 'Test methods',
      methods: [methodWithoutExamples],
    };

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {},
      },
    };

    methodConverter.convertMethods([methodFile], spec);

    const postOperation = spec.paths['/api/v1/another-test']?.post;
    expect(postOperation).toBeDefined();

    // Success responses should not use common examples (they don't exist as common examples)
    const response200 = postOperation?.responses['200'];
    expect(response200).toBeDefined();
    // 200 response should not have any examples since we don't collect success examples as common ones
    expect(
      response200?.content?.['application/json']?.examples
    ).toBeUndefined();

    // Error responses should use common examples
    const response401 = postOperation?.responses['401'];
    expect(response401).toBeDefined();
    expect(
      response401?.content?.['application/json']?.examples?.Error401Example
    ).toBeDefined();
    expect(
      (
        response401?.content?.['application/json']?.examples
          ?.Error401Example as any
      )?.$ref
    ).toBe('#/components/examples/Error401Example');

    // Check that the shared component example contains the common error value
    expect(spec.components?.examples?.Error401Example?.value).toEqual({
      error: 'Unauthorized',
    });
  });
});
