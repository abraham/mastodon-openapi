import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { MethodParser } from '../../parsers/MethodParser';

describe('createStatus requestBody required fields', () => {
  let generator: OpenAPIGenerator;
  let methodParser: MethodParser;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
    methodParser = new MethodParser();
  });

  it('should not require all of status, media_ids, and poll simultaneously', () => {
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
    expect(requestBodySchema.type).toBe('object');
    expect(requestBodySchema.properties).toBeDefined();

    // Verify the properties exist
    expect(requestBodySchema.properties.status).toBeDefined();
    expect(requestBodySchema.properties.media_ids).toBeDefined();
    expect(requestBodySchema.properties.poll).toBeDefined();

    // The key issue: these should NOT all be required simultaneously
    // According to the API docs, these are conditionally required
    const required = requestBodySchema.required || [];

    // This is the problem: currently ALL are required
    // After the fix, none of these should be in the required array
    // because they are conditionally required
    expect(required).not.toContain('status');
    expect(required).not.toContain('media_ids');
    expect(required).not.toContain('poll');
  });

  it('should have proper descriptions explaining conditional requirements', () => {
    const methodFiles = methodParser.parseAllMethods();
    const spec = generator.generateSchema([], methodFiles);

    const operation = spec.paths['/api/v1/statuses']?.post;
    const requestBodySchema = operation!.requestBody!.content![
      'application/json'
    ]!.schema as any;

    // Check that descriptions explain the conditional logic
    expect(requestBodySchema.properties.status.description).toMatch(
      /If.*media_ids.*provided.*becomes optional/
    );
    expect(requestBodySchema.properties.media_ids.description).toMatch(
      /If provided.*status.*becomes optional/
    );
    expect(requestBodySchema.properties.poll.description).toBeDefined();
  });
});
