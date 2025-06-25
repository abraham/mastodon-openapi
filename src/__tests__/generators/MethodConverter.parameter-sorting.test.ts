import { MethodConverter } from '../../generators/MethodConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { ErrorExampleRegistry } from '../../generators/ErrorExampleRegistry';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';
import { SpecBuilder } from '../../generators/SpecBuilder';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('MethodConverter - Parameter Sorting', () => {
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

    const specBuilder = new SpecBuilder();
    spec = specBuilder.buildInitialSpec();
  });

  it('should sort query parameters by required first then alphabetically', () => {
    const testMethods: ApiMethodsFile[] = [
      {
        name: 'test',
        description: 'Test methods',
        methods: [
          {
            name: 'Test endpoint',
            httpMethod: 'GET',
            endpoint: '/api/v1/test',
            description: 'Test endpoint with mixed parameters',
            parameters: [
              {
                name: 'zebra',
                description: 'Optional zebra parameter',
                in: 'query',
                required: false,
                schema: { type: 'string' },
              },
              {
                name: 'apple',
                description: 'Required apple parameter',
                in: 'query',
                required: true,
                schema: { type: 'string' },
              },
              {
                name: 'dog',
                description: 'Optional dog parameter',
                in: 'query',
                required: false,
                schema: { type: 'string' },
              },
              {
                name: 'banana',
                description: 'Required banana parameter',
                in: 'query',
                required: true,
                schema: { type: 'string' },
              },
            ],
          },
        ],
      },
    ];

    methodConverter.convertMethods(testMethods, spec);

    const operation = spec.paths['/api/v1/test']?.get;
    expect(operation).toBeDefined();
    expect(operation!.parameters).toBeDefined();
    expect(operation!.parameters).toHaveLength(4);

    // Extract parameter names in order
    const parameterNames = operation!.parameters!.map((p: any) => p.name);

    // Should be: required parameters first (apple, banana), then optional (dog, zebra)
    const expectedOrder = ['apple', 'banana', 'dog', 'zebra'];
    expect(parameterNames).toEqual(expectedOrder);
  });

  it('should sort request body properties by required first then alphabetically', () => {
    const testMethods: ApiMethodsFile[] = [
      {
        name: 'test',
        description: 'Test methods',
        methods: [
          {
            name: 'Test create endpoint',
            httpMethod: 'POST',
            endpoint: '/api/v1/test',
            description: 'Test endpoint with form data parameters',
            parameters: [
              {
                name: 'zebra',
                description: 'Optional zebra field',
                in: 'formData',
                required: false,
                schema: { type: 'string' },
              },
              {
                name: 'apple',
                description: 'Required apple field',
                in: 'formData',
                required: true,
                schema: { type: 'string' },
              },
              {
                name: 'dog',
                description: 'Optional dog field',
                in: 'formData',
                required: false,
                schema: { type: 'string' },
              },
              {
                name: 'banana',
                description: 'Required banana field',
                in: 'formData',
                required: true,
                schema: { type: 'string' },
              },
            ],
          },
        ],
      },
    ];

    methodConverter.convertMethods(testMethods, spec);

    const operation = spec.paths['/api/v1/test']?.post;
    expect(operation).toBeDefined();
    expect(operation!.requestBody).toBeDefined();

    const requestBodySchema = operation!.requestBody!.content![
      'application/json'
    ]!.schema as any;
    expect(requestBodySchema.properties).toBeDefined();

    // Extract property names in order
    const propertyNames = Object.keys(requestBodySchema.properties);

    // Should be: required properties first (apple, banana), then optional (dog, zebra)
    const expectedOrder = ['apple', 'banana', 'dog', 'zebra'];
    expect(propertyNames).toEqual(expectedOrder);

    // Verify required array also follows the same order
    expect(requestBodySchema.required).toEqual(['apple', 'banana']);
  });

  it('should sort mixed parameter types correctly', () => {
    const testMethods: ApiMethodsFile[] = [
      {
        name: 'test',
        description: 'Test methods',
        methods: [
          {
            name: 'Test mixed endpoint',
            httpMethod: 'POST',
            endpoint: '/api/v1/test/{id}',
            description: 'Test endpoint with mixed parameter types',
            parameters: [
              {
                name: 'zebra_header',
                description: 'Optional header',
                in: 'header',
                required: false,
                schema: { type: 'string' },
              },
              {
                name: 'apple_query',
                description: 'Required query parameter',
                in: 'query',
                required: true,
                schema: { type: 'string' },
              },
              {
                name: 'dog_query',
                description: 'Optional query parameter',
                in: 'query',
                required: false,
                schema: { type: 'string' },
              },
              {
                name: 'banana_header',
                description: 'Required header',
                in: 'header',
                required: true,
                schema: { type: 'string' },
              },
            ],
          },
        ],
      },
    ];

    methodConverter.convertMethods(testMethods, spec);

    const operation = spec.paths['/api/v1/test/{id}']?.post;
    expect(operation).toBeDefined();
    expect(operation!.parameters).toBeDefined();
    expect(operation!.parameters).toHaveLength(5); // 4 explicit + 1 auto-generated path param

    // Extract parameter names in order
    const parameterNames = operation!.parameters!.map((p: any) => p.name);

    // Should be: required parameters first (alphabetically), then optional (alphabetically)
    // Required: apple_query, banana_header, id (auto-generated)
    // Optional: dog_query, zebra_header
    const expectedOrder = [
      'apple_query',
      'banana_header',
      'id',
      'dog_query',
      'zebra_header',
    ];
    expect(parameterNames).toEqual(expectedOrder);
  });
});
