import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator - Issue #340 fix', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should not mark date_of_birth as required when description contains conditional "required if"', () => {
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
                required: false, // This should remain false since it's conditionally required
                in: 'formData',
              },
              {
                name: 'email',
                description: 'String. The email address to be used for login. {{<required>}}',
                required: true, // This should be true due to {{<required>}} marker
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

    // Check that date_of_birth is NOT in the required array
    if (schema?.required) {
      expect(schema.required).not.toContain('date_of_birth');
      expect(schema.required).toContain('email');
    }
    
    // Check that date_of_birth property exists but is optional
    expect(schema?.properties?.date_of_birth).toBeDefined();
    expect(schema?.properties?.date_of_birth?.type).toBe('string');
    expect(schema?.properties?.date_of_birth?.format).toBe('date');
  });
});