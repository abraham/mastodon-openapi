import { MethodConverter } from '../../generators/MethodConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { ErrorExampleRegistry } from '../../generators/ErrorExampleRegistry';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';
import { ApiMethod } from '../../interfaces/ApiMethod';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('MethodConverter - Method-Specific Response Codes', () => {
  let methodConverter: MethodConverter;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    const errorExampleRegistry = new ErrorExampleRegistry();
    methodConverter = new MethodConverter(
      typeParser,
      utilityHelpers,
      errorExampleRegistry
    );
  });

  it('should merge method-specific response codes with global codes', () => {
    const methodWithSpecificCodes: ApiMethod = {
      name: 'Upload media',
      httpMethod: 'POST',
      endpoint: '/api/v2/media',
      description: 'Upload media asynchronously',
      returns: 'MediaAttachment',
      responseCodes: [
        { code: '200', description: 'OK - Synchronously processed' },
        { code: '202', description: 'Accepted' },
        { code: '500', description: 'Server error' },
      ],
    };

    const methodFile: ApiMethodsFile = {
      name: 'media',
      description: 'Media methods',
      methods: [methodWithSpecificCodes],
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

    const postOperation = spec.paths['/api/v2/media']?.post;
    expect(postOperation).toBeDefined();

    // Verify method-specific response codes are present
    expect(postOperation?.responses['202']).toBeDefined();
    expect(postOperation?.responses['500']).toBeDefined();

    // Verify 202 has correct description from method-specific codes
    expect(postOperation?.responses['202'].description).toBe('Accepted');

    // Verify global codes are still present
    expect(postOperation?.responses['401']).toBeDefined();
    expect(postOperation?.responses['404']).toBeDefined();
    expect(postOperation?.responses['429']).toBeDefined();

    // Verify that method-specific 500 error is present (not in global codes)
    expect(postOperation?.responses['500']).toBeDefined();
    expect(postOperation?.responses['500'].description).toBe('Server error');
  });

  it('should fall back to global response codes when method has no specific codes', () => {
    const methodWithoutSpecificCodes: ApiMethod = {
      name: 'Get account',
      httpMethod: 'GET',
      endpoint: '/api/v1/accounts/:id',
      description: 'View information about a profile',
      returns: 'Account',
      // No responseCodes field - should use global codes
    };

    const methodFile: ApiMethodsFile = {
      name: 'accounts',
      description: 'Account methods',
      methods: [methodWithoutSpecificCodes],
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

    // Should have global response codes like 200, 401, 404, etc.
    expect(getOperation?.responses['200']).toBeDefined();
    expect(getOperation?.responses['401']).toBeDefined();
    expect(getOperation?.responses['404']).toBeDefined();
  });

  it('should include 206 Partial content for methods that specify it', () => {
    const methodWith206: ApiMethod = {
      name: 'Get media attachment',
      httpMethod: 'GET',
      endpoint: '/api/v1/media/:id',
      description: 'Get a media attachment',
      returns: 'MediaAttachment',
      responseCodes: [
        { code: '200', description: 'OK' },
        { code: '206', description: 'Partial content' },
        { code: '401', description: 'Unauthorized' },
        { code: '404', description: 'Not found' },
        { code: '422', description: 'Unprocessable entity' },
      ],
    };

    const methodFile: ApiMethodsFile = {
      name: 'media',
      description: 'Media methods',
      methods: [methodWith206],
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

    const getOperation = spec.paths['/api/v1/media/{id}']?.get;
    expect(getOperation).toBeDefined();

    // Verify 206 is present
    expect(getOperation?.responses['206']).toBeDefined();
    expect(getOperation?.responses['206'].description).toBe('Partial content');
  });

  it('should handle 2xx success responses with rate limit headers', () => {
    const methodWith202: ApiMethod = {
      name: 'Upload media',
      httpMethod: 'POST',
      endpoint: '/api/v2/media',
      description: 'Upload media asynchronously',
      returns: 'MediaAttachment',
      responseCodes: [
        { code: '200', description: 'OK' },
        { code: '202', description: 'Accepted' },
        { code: '401', description: 'Unauthorized' },
      ],
    };

    const methodFile: ApiMethodsFile = {
      name: 'media',
      description: 'Media methods',
      methods: [methodWith202],
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

    const postOperation = spec.paths['/api/v2/media']?.post;
    expect(postOperation).toBeDefined();

    // Both 200 and 202 should have rate limit headers since they're 2xx responses
    expect(postOperation?.responses['200'].headers).toBeDefined();
    expect(postOperation?.responses['202'].headers).toBeDefined();

    // Verify rate limit headers are present
    expect(
      postOperation?.responses['200']?.headers?.['X-RateLimit-Limit']
    ).toBeDefined();
    expect(
      postOperation?.responses['202']?.headers?.['X-RateLimit-Limit']
    ).toBeDefined();
  });

  it('should use returnType from response codes to generate schema for 2xx responses', () => {
    // First add a MediaAttachment schema to components
    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          MediaAttachment: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              url: { type: 'string' },
            },
          },
        },
      },
    };

    const methodWith202WithReturnType: ApiMethod = {
      name: 'Upload media',
      httpMethod: 'POST',
      endpoint: '/api/v2/media',
      description: 'Upload media asynchronously',
      returns: '[MediaAttachment]',
      responseCodes: [
        { code: '200', description: 'OK' },
        { code: '202', description: 'Accepted', returnType: 'MediaAttachment' },
        { code: '401', description: 'Unauthorized' },
      ],
    };

    const methodFile: ApiMethodsFile = {
      name: 'media',
      description: 'Media methods',
      methods: [methodWith202WithReturnType],
    };

    methodConverter.convertMethods([methodFile], spec);

    const postOperation = spec.paths['/api/v2/media']?.post;
    expect(postOperation).toBeDefined();

    // Verify 202 response has content with schema reference to MediaAttachment
    expect(postOperation?.responses['202']).toBeDefined();
    expect(postOperation?.responses['202'].content).toBeDefined();
    expect(
      postOperation?.responses['202'].content?.['application/json']
    ).toBeDefined();
    expect(
      postOperation?.responses['202'].content?.['application/json'].schema
    ).toBeDefined();
    expect(
      postOperation?.responses['202'].content?.['application/json'].schema.$ref
    ).toBe('#/components/schemas/MediaAttachment');

    // Verify 200 response also has schema
    expect(postOperation?.responses['200'].content).toBeDefined();
    expect(
      postOperation?.responses['200'].content?.['application/json'].schema.$ref
    ).toBe('#/components/schemas/MediaAttachment');
  });
});
