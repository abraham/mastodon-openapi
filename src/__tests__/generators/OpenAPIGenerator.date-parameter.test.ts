import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator - Date Parameter Handling', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should handle date_of_birth parameter as date-time type', () => {
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'accounts',
        description: 'Account related methods',
        methods: [
          {
            name: 'Register an account',
            httpMethod: 'POST',
            endpoint: '/api/v1/accounts',
            description: 'Create account',
            parameters: [
              {
                name: 'date_of_birth',
                description:
                  'String ([Date](/api/datetime-format#date)), required if the server has a minimum age requirement.',
                required: false,
                in: 'formData',
              },
            ],
          },
        ],
      },
    ];

    const spec = generator.generateSchema([], methodFiles);

    const operation = spec.paths['/api/v1/accounts']?.post;
    expect(operation).toBeDefined();
    expect(operation?.requestBody).toBeDefined();
    expect(operation?.requestBody?.content?.['application/json']).toBeDefined();

    const schema = operation?.requestBody?.content?.['application/json']
      .schema as any;
    expect(schema?.properties?.['date_of_birth']).toBeDefined();

    const dateOfBirthProperty = schema?.properties?.['date_of_birth'];
    expect(dateOfBirthProperty?.type).toBe('string');
    expect(dateOfBirthProperty?.format).toBe('date-time');
  });

  it('should handle various date and datetime formats in parameter descriptions', () => {
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'test',
        description: 'Test methods',
        methods: [
          {
            name: 'Test date params',
            httpMethod: 'POST',
            endpoint: '/api/v1/test',
            description: 'Test date parameters',
            parameters: [
              {
                name: 'simple_date',
                description: 'String ([Date](/api/datetime-format#date))',
                required: false,
                in: 'formData',
              },
              {
                name: 'datetime_param',
                description:
                  'String ([ISO8601 Datetime](https://en.wikipedia.org/wiki/ISO_8601))',
                required: false,
                in: 'formData',
              },
              {
                name: 'regular_string',
                description: 'Just a regular string parameter',
                required: false,
                in: 'formData',
              },
            ],
          },
        ],
      },
    ];

    const spec = generator.generateSchema([], methodFiles);

    const operation = spec.paths['/api/v1/test']?.post;
    const schema = operation?.requestBody?.content?.['application/json']
      .schema as any;

    // Date parameter should have date-time format
    expect(schema?.properties?.['simple_date']?.type).toBe('string');
    expect(schema?.properties?.['simple_date']?.format).toBe('date-time');

    // Datetime parameter should have date-time format
    expect(schema?.properties?.['datetime_param']?.type).toBe('string');
    expect(schema?.properties?.['datetime_param']?.format).toBe('date-time');

    // Regular string should remain as string without format
    expect(schema?.properties?.['regular_string']?.type).toBe('string');
    expect(schema?.properties?.['regular_string']?.format).toBeUndefined();
  });
});
