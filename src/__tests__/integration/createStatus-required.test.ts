import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { MethodParser } from '../../parsers/MethodParser';

describe('createStatus requestBody required fields', () => {
  let generator: OpenAPIGenerator;
  let methodParser: MethodParser;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
    methodParser = new MethodParser();
  });

  it('should use oneOf schema with component references for different status types', () => {
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

    // Verify oneOf structure exists with component references
    expect(requestBodySchema.oneOf).toBeDefined();
    expect(requestBodySchema.oneOf).toHaveLength(3);

    // Check that oneOf contains references to components
    expect(requestBodySchema.oneOf).toEqual([
      { $ref: '#/components/schemas/TextStatus' },
      { $ref: '#/components/schemas/MediaStatus' },
      { $ref: '#/components/schemas/PollStatus' },
    ]);

    // Verify the components were created
    expect(spec.components?.schemas?.BaseStatus).toBeDefined();
    expect(spec.components?.schemas?.TextStatus).toBeDefined();
    expect(spec.components?.schemas?.MediaStatus).toBeDefined();
    expect(spec.components?.schemas?.PollStatus).toBeDefined();
  });

  it('should have proper component schemas with allOf structure and descriptions', () => {
    const methodFiles = methodParser.parseAllMethods();
    const spec = generator.generateSchema([], methodFiles);

    // Check BaseStatus component
    const baseStatus = spec.components?.schemas?.BaseStatus;
    expect(baseStatus).toBeDefined();
    expect(baseStatus!.type).toBe('object');
    expect(baseStatus!.description).toMatch(/Common fields for all status/);

    // Check TextStatus component uses allOf
    const textStatus = spec.components?.schemas?.TextStatus;
    expect(textStatus).toBeDefined();
    expect(textStatus!.allOf).toBeDefined();
    expect(textStatus!.allOf).toHaveLength(2);
    expect(textStatus!.allOf![0]).toEqual({
      $ref: '#/components/schemas/BaseStatus',
    });
    // Cast to access properties - we know the second item is an OpenAPIProperty
    const textStatusSecond = textStatus!.allOf![1] as any;
    expect(textStatusSecond.required).toContain('status');
    expect(textStatusSecond.properties.status).toBeDefined();
    expect(textStatus!.description).toMatch(/text-only status/);

    // Check MediaStatus component uses allOf
    const mediaStatus = spec.components?.schemas?.MediaStatus;
    expect(mediaStatus).toBeDefined();
    expect(mediaStatus!.allOf).toBeDefined();
    expect(mediaStatus!.allOf).toHaveLength(2);
    expect(mediaStatus!.allOf![0]).toEqual({
      $ref: '#/components/schemas/BaseStatus',
    });
    // Cast to access properties - we know the second item is an OpenAPIProperty
    const mediaStatusSecond = mediaStatus!.allOf![1] as any;
    expect(mediaStatusSecond.required).toContain('media_ids');
    expect(mediaStatusSecond.properties.media_ids).toBeDefined();
    expect(mediaStatusSecond.properties.status).toBeDefined(); // Optional for media posts
    expect(mediaStatus!.description).toMatch(/media attachments/);

    // Check PollStatus component uses allOf
    const pollStatus = spec.components?.schemas?.PollStatus;
    expect(pollStatus).toBeDefined();
    expect(pollStatus!.allOf).toBeDefined();
    expect(pollStatus!.allOf).toHaveLength(2);
    expect(pollStatus!.allOf![0]).toEqual({
      $ref: '#/components/schemas/BaseStatus',
    });
    // Cast to access properties - we know the second item is an OpenAPIProperty
    const pollStatusSecond = pollStatus!.allOf![1] as any;
    expect(pollStatusSecond.required).toContain('poll');
    expect(pollStatusSecond.properties.poll).toBeDefined();
    expect(pollStatusSecond.properties.status).toBeDefined(); // Optional for poll posts
    expect(pollStatus!.description).toMatch(
      /poll.*Cannot be combined with media/
    );
  });
});
