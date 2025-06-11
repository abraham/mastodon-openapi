import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator - Streaming endpoints', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  test('should generate text/event-stream content type for streaming endpoints', () => {
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'streaming',
        description: 'Streaming methods',
        methods: [
          {
            name: 'Watch your home timeline and notifications',
            httpMethod: 'GET',
            endpoint: '/api/v1/streaming/user',
            description:
              'Returns events that are relevant to the authorized user',
            returns: '`update`, `delete`, `notification`, `filters_changed`',
            isStreaming: true,
          },
          {
            name: 'Check if the server is alive',
            httpMethod: 'GET',
            endpoint: '/api/v1/streaming/health',
            description:
              'Verify that the streaming service is alive before connecting to it',
            returns: 'String',
            // isStreaming is undefined/false for health endpoint
          },
        ],
      },
    ];

    const spec = generator.generateSchema([], methodFiles);

    // Streaming endpoint should have text/event-stream content type
    const streamingOperation = spec.paths['/api/v1/streaming/user']?.get;
    expect(streamingOperation).toBeDefined();
    expect(streamingOperation?.responses['200'].content).toBeDefined();
    expect(
      streamingOperation?.responses['200'].content?.['text/event-stream']
    ).toBeDefined();
    expect(
      streamingOperation?.responses['200'].content?.['application/json']
    ).toBeUndefined();

    // Health endpoint should not have content type specified (falls back to description only)
    const healthOperation = spec.paths['/api/v1/streaming/health']?.get;
    expect(healthOperation).toBeDefined();
    expect(healthOperation?.responses['200'].content).toBeUndefined();
    expect(healthOperation?.responses['200'].description).toBe('String');
  });

  test('should generate text/event-stream for all streaming endpoints', () => {
    const streamingEndpoints = [
      '/api/v1/streaming/user',
      '/api/v1/streaming/user/notification',
      '/api/v1/streaming/public',
      '/api/v1/streaming/public/local',
      '/api/v1/streaming/public/remote',
      '/api/v1/streaming/hashtag',
      '/api/v1/streaming/hashtag/local',
      '/api/v1/streaming/list',
      '/api/v1/streaming/direct',
    ];

    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'streaming',
        description: 'Streaming methods',
        methods: streamingEndpoints.map((endpoint) => ({
          name: `Streaming endpoint ${endpoint}`,
          httpMethod: 'GET',
          endpoint,
          description: 'A streaming endpoint',
          returns: '`update`, `delete`',
          isStreaming: true,
        })),
      },
    ];

    const spec = generator.generateSchema([], methodFiles);

    // All streaming endpoints should have text/event-stream content type
    for (const endpoint of streamingEndpoints) {
      const operation = spec.paths[endpoint]?.get;
      expect(operation).toBeDefined();
      expect(
        operation?.responses['200'].content?.['text/event-stream']
      ).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json']
      ).toBeUndefined();
    }
  });
});
