import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator - x-badges extension', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should generate x-badges for deprecated methods in the schema', () => {
    const testMethods: ApiMethodsFile[] = [
      {
        name: 'test',
        description: 'Test methods',
        methods: [
          {
            name: 'Deprecated method',
            httpMethod: 'GET',
            endpoint: '/api/v1/test/deprecated',
            description: 'A deprecated method',
            deprecated: true,
          },
        ],
      },
    ];

    const spec = generator.generateSchema([], testMethods);

    const operation = spec.paths['/api/v1/test/deprecated']?.get;
    expect(operation).toBeDefined();
    expect(operation?.deprecated).toBe(true);
    expect(operation?.['x-badges']).toBeDefined();
    expect(operation?.['x-badges']).toHaveLength(1);
    expect(operation?.['x-badges']?.[0]).toEqual({
      name: 'Deprecated',
      color: 'yellow',
    });
  });

  it('should not generate x-badges for normal methods', () => {
    const testMethods: ApiMethodsFile[] = [
      {
        name: 'test',
        description: 'Test methods',
        methods: [
          {
            name: 'Normal method',
            httpMethod: 'GET',
            endpoint: '/api/v1/test/normal',
            description: 'A normal method',
          },
        ],
      },
    ];

    const spec = generator.generateSchema([], testMethods);

    const operation = spec.paths['/api/v1/test/normal']?.get;
    expect(operation).toBeDefined();
    expect(operation?.deprecated).toBeUndefined();
    expect(operation?.['x-badges']).toBeUndefined();
  });

  it('should generate correct JSON output with x-badges', () => {
    const testMethods: ApiMethodsFile[] = [
      {
        name: 'test',
        description: 'Test methods',
        methods: [
          {
            name: 'Deprecated method',
            httpMethod: 'GET',
            endpoint: '/api/v1/test/deprecated',
            description: 'A deprecated method',
            deprecated: true,
          },
        ],
      },
    ];

    generator.generateSchema([], testMethods);
    const json = generator.toJSON();

    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);

    const operation = parsed.paths['/api/v1/test/deprecated']?.get;
    expect(operation).toBeDefined();
    expect(operation['x-badges']).toBeDefined();
    expect(operation['x-badges']).toHaveLength(1);
    expect(operation['x-badges'][0]).toEqual({
      name: 'Deprecated',
      color: 'yellow',
    });
  });
});
