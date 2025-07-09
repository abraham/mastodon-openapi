import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('Date Parameter Debug', () => {
  it('should debug date_of_birth parameter processing', () => {
    const generator = new OpenAPIGenerator();

    // Test with the cleaned description (as it appears in the real schema)
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
                description: 'String ([Date]), required if the server has a minimum age requirement.',
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
    const schema = operation?.requestBody?.content?.['application/json']?.schema as any;
    const dateOfBirthProperty = schema?.properties?.['date_of_birth'];

    console.log('Generated date_of_birth property:', JSON.stringify(dateOfBirthProperty, null, 2));

    // This should have format: "date" but does it?
    expect(dateOfBirthProperty?.type).toBe('string');
    expect(dateOfBirthProperty?.format).toBe('date');
  });
});