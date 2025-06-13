import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { MethodParser } from '../../parsers/MethodParser';

describe('createStatus requestBody required fields', () => {
  let generator: OpenAPIGenerator;
  let methodParser: MethodParser;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
    methodParser = new MethodParser();
  });

  it('should use oneOf schema to handle different status types', () => {
    // Parse the actual statuses.md file to get the real parameters
    const methodFiles = methodParser.parseAllMethods();
    const statusesFile = methodFiles.find((file) => file.name === 'statuses');

    expect(statusesFile).toBeDefined();

    const createMethod = statusesFile!.methods.find(
      (method) =>
        method.httpMethod === 'POST' && method.endpoint === '/api/v1/statuses'
    );

    expect(createMethod).toBeDefined();
    expect(createMethod!.parameters).toBeDefined();

    // Generate the schema
    const spec = generator.generateSchema([], methodFiles);

    // Check the POST /api/v1/statuses operation
    const operation = spec.paths['/api/v1/statuses']?.post;
    expect(operation).toBeDefined();
    expect(operation!.requestBody).toBeDefined();

    const requestBodySchema = operation!.requestBody!.content![
      'application/json'
    ]!.schema as any;
    expect(requestBodySchema).toBeDefined();

    // Verify oneOf structure exists
    expect(requestBodySchema.oneOf).toBeDefined();
    expect(requestBodySchema.oneOf).toHaveLength(3);

    // Check Text Status schema
    const textStatus = requestBodySchema.oneOf.find(
      (schema: any) => schema.title === 'Text Status'
    );
    expect(textStatus).toBeDefined();
    expect(textStatus.required).toContain('status');
    expect(textStatus.properties.status).toBeDefined();

    // Check Media Status schema
    const mediaStatus = requestBodySchema.oneOf.find(
      (schema: any) => schema.title === 'Media Status'
    );
    expect(mediaStatus).toBeDefined();
    expect(mediaStatus.required).toContain('media_ids');
    expect(mediaStatus.properties.media_ids).toBeDefined();
    expect(mediaStatus.properties.status).toBeDefined(); // Optional for media posts

    // Check Poll Status schema
    const pollStatus = requestBodySchema.oneOf.find(
      (schema: any) => schema.title === 'Poll Status'
    );
    expect(pollStatus).toBeDefined();
    expect(pollStatus.required).toContain('poll');
    expect(pollStatus.properties.poll).toBeDefined();
    expect(pollStatus.properties.status).toBeDefined(); // Optional for poll posts
  });

  it('should have proper titles and descriptions for different status types', () => {
    const methodFiles = methodParser.parseAllMethods();
    const spec = generator.generateSchema([], methodFiles);

    const operation = spec.paths['/api/v1/statuses']?.post;
    const requestBodySchema = operation!.requestBody!.content![
      'application/json'
    ]!.schema as any;

    // Check that each oneOf schema has proper titles and descriptions
    const textStatus = requestBodySchema.oneOf.find(
      (schema: any) => schema.title === 'Text Status'
    );
    expect(textStatus.title).toBe('Text Status');
    expect(textStatus.description).toMatch(/text-only status/);

    const mediaStatus = requestBodySchema.oneOf.find(
      (schema: any) => schema.title === 'Media Status'
    );
    expect(mediaStatus.title).toBe('Media Status');
    expect(mediaStatus.description).toMatch(/media attachments/);

    const pollStatus = requestBodySchema.oneOf.find(
      (schema: any) => schema.title === 'Poll Status'
    );
    expect(pollStatus.title).toBe('Poll Status');
    expect(pollStatus.description).toMatch(
      /poll.*Cannot be combined with media/
    );
  });
});
