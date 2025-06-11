import { EntityParser } from '../../parsers/EntityParser';
import { MethodParser } from '../../parsers/MethodParser';
import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';

describe('Instance Activity endpoint - Array of Hash fix', () => {
  test('should generate correct schema for GET /api/v1/instance/activity', () => {
    // Parse entities and methods like the main generator does
    const entityParser = new EntityParser();
    const entities = entityParser.parseAllEntities();

    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();

    // Generate the schema
    const generator = new OpenAPIGenerator();
    const schema = generator.generateSchema(entities, methodFiles);

    // Find the instance activity endpoint
    const activityPath = schema.paths['/api/v1/instance/activity'];
    expect(activityPath).toBeDefined();

    const getOperation = activityPath?.get;
    expect(getOperation).toBeDefined();
    expect(getOperation?.summary).toBe('Weekly activity');

    // Check the response schema
    const response200 = getOperation?.responses['200'];
    expect(response200).toBeDefined();
    expect(response200?.description).toBe('Array of Hash');

    // Most importantly: verify the schema is array of objects with specific properties
    const responseSchema = response200?.content?.['application/json']?.schema;
    expect(responseSchema).toEqual({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          week: {
            type: 'string',
            description: 'Midnight at the first day of the week.',
          },
          statuses: {
            type: 'string',
            description: 'The number of Statuses created since the week began.',
          },
          logins: {
            type: 'string',
            description: 'The number of user logins since the week began.',
          },
          registrations: {
            type: 'string',
            description:
              'The number of user registrations since the week began.',
          },
        },
      },
    });

    // Before the fix, this would have been:
    // {
    //   type: 'array',
    //   items: {
    //     type: 'string'
    //   }
    // }
    //
    // With the basic fix, it would have been:
    // {
    //   type: 'array',
    //   items: {
    //     type: 'object'
    //   }
    // }
    //
    // Now with hash attributes parsing, it includes the specific properties!
  });
});
