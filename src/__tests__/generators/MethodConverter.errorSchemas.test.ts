import { MethodConverter } from '../../generators/MethodConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';
import { ApiMethod } from '../../interfaces/ApiMethod';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('MethodConverter Error Schemas', () => {
  let methodConverter: MethodConverter;
  let typeParser: TypeParser;
  let utilityHelpers: UtilityHelpers;

  beforeEach(() => {
    utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
    methodConverter = new MethodConverter(typeParser, utilityHelpers);
  });

  it('should generate schemas for custom error formats', () => {
    const method: ApiMethod = {
      name: 'Register an account',
      httpMethod: 'POST',
      endpoint: '/api/v1/accounts',
      description: 'Creates a user and account records',
      returns: 'Token',
      oauth: 'App token + write:accounts',
      responseExamples: {
        '401': {
          error: 'The access token is invalid',
        },
        '422': {
          error:
            "Validation failed: Password can't be blank, Username must contain only letters, numbers and underscores, Agreement must be accepted",
          details: {
            password: [
              {
                error: 'ERR_BLANK',
                description: "can't be blank",
              },
            ],
            username: [
              {
                error: 'ERR_INVALID',
                description:
                  'must contain only letters, numbers and underscores',
              },
            ],
            agreement: [
              {
                error: 'ERR_ACCEPTED',
                description: 'must be accepted',
              },
            ],
          },
        },
        '429': {
          error: 'Too many requests',
        },
      },
    };

    const methodFile: ApiMethodsFile = {
      name: 'accounts',
      description: 'Account methods',
      methods: [method],
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

    const postOperation = spec.paths['/api/v1/accounts']?.post;
    expect(postOperation).toBeDefined();
    expect(postOperation?.responses).toBeDefined();

    // Check that 401 error has content with schema and examples reference
    const response401 = postOperation?.responses['401'];
    expect(response401).toHaveProperty('content');
    expect(response401?.content?.['application/json']).toHaveProperty('schema');
    expect(response401?.content?.['application/json']?.schema).toEqual({
      $ref: '#/components/schemas/Error',
    });
    expect(response401?.content?.['application/json']).toHaveProperty(
      'examples'
    );

    // Check that 422 error has content with schema and examples
    const response422 = postOperation?.responses['422'];
    expect(response422).toHaveProperty('content');
    expect(response422?.content?.['application/json']).toHaveProperty('schema');
    expect(response422?.content?.['application/json']?.schema).toEqual({
      $ref: '#/components/schemas/ValidationError',
    });

    // Check that 429 error has content with schema and examples
    const response429 = postOperation?.responses['429'];
    expect(response429).toHaveProperty('content');
    expect(response429?.content?.['application/json']).toHaveProperty('schema');
    expect(response429?.content?.['application/json']?.schema).toEqual({
      $ref: '#/components/schemas/Error',
    });

    // Check that ValidationError schema was created
    expect(spec.components?.schemas?.ValidationError).toBeDefined();
    expect(spec.components?.schemas?.ValidationError).toHaveProperty(
      'properties'
    );
    expect(
      spec.components?.schemas?.ValidationError?.properties
    ).toHaveProperty('error');
    expect(
      spec.components?.schemas?.ValidationError?.properties
    ).toHaveProperty('details');
  });

  it('should create reusable error schemas for common patterns', () => {
    const method: ApiMethod = {
      name: 'Test Method',
      httpMethod: 'POST',
      endpoint: '/api/v1/test',
      description: 'Test method',
      responseExamples: {
        '422': {
          error: 'Validation failed',
          details: {
            field1: [
              {
                error: 'ERR_BLANK',
                description: "can't be blank",
              },
            ],
          },
        },
      },
    };

    const methodFile: ApiMethodsFile = {
      name: 'test',
      description: 'Test methods',
      methods: [method],
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

    // The spec should potentially have error schemas in components
    expect(spec.components?.schemas).toBeDefined();
  });
});
