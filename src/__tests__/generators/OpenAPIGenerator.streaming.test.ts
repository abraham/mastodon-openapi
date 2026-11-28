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

  test('should emit discriminated oneOf and single-event schemas for streaming endpoints', () => {
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'streaming',
        description: 'Streaming methods',
        streamEvents: [
          {
            name: 'update',
            description: 'A new Status has appeared.',
            payload: { kind: 'entity', entityName: 'Status' },
          },
          {
            name: 'delete',
            description: 'A status has been deleted.',
            payload: { kind: 'string' },
          },
          {
            name: 'filters_changed',
            description: 'Keyword filters have been changed.',
            payload: { kind: 'empty' },
          },
          {
            name: 'announcement.reaction',
            description: 'An announcement has received an emoji reaction.',
            payload: { kind: 'object' },
          },
          {
            name: 'conversation',
            description: 'A direct conversation has been updated.',
            payload: { kind: 'entity', entityName: 'Conversation' },
          },
          {
            name: 'notifications_merged',
            description: 'Unused event should not be emitted.',
            payload: { kind: 'empty' },
          },
        ],
        methods: [
          {
            name: 'Watch your home timeline and notifications',
            httpMethod: 'GET',
            endpoint: '/api/v1/streaming/user',
            description: 'Returns user events',
            returns:
              '`update`, `delete`, `filters_changed`, `announcement.reaction`',
            isStreaming: true,
            streamEvents: [
              'update',
              'delete',
              'filters_changed',
              'announcement.reaction',
            ],
          },
          {
            name: 'Watch for direct messages',
            httpMethod: 'GET',
            endpoint: '/api/v1/streaming/direct',
            description: 'Returns direct message events',
            returns: '`conversation`',
            isStreaming: true,
            streamEvents: ['conversation'],
          },
        ],
      },
    ];

    const spec = generator.generateSchema([], methodFiles);

    // Multi-event endpoint emits discriminated oneOf
    const userSchema =
      spec.paths['/api/v1/streaming/user']?.get?.responses['200'].content?.[
        'text/event-stream'
      ]?.schema;
    expect(userSchema).toEqual({
      oneOf: [
        { $ref: '#/components/schemas/StreamUpdateEvent' },
        { $ref: '#/components/schemas/StreamDeleteEvent' },
        { $ref: '#/components/schemas/StreamFiltersChangedEvent' },
        { $ref: '#/components/schemas/StreamAnnouncementReactionEvent' },
      ],
      discriminator: {
        propertyName: 'event',
        mapping: {
          update: '#/components/schemas/StreamUpdateEvent',
          delete: '#/components/schemas/StreamDeleteEvent',
          filters_changed: '#/components/schemas/StreamFiltersChangedEvent',
          'announcement.reaction':
            '#/components/schemas/StreamAnnouncementReactionEvent',
        },
      },
    });

    // Single-event endpoint emits a direct $ref without a redundant oneOf
    const directSchema =
      spec.paths['/api/v1/streaming/direct']?.get?.responses['200'].content?.[
        'text/event-stream'
      ]?.schema;
    expect(directSchema).toEqual({
      $ref: '#/components/schemas/StreamConversationEvent',
    });

    // Component schemas match each payload kind
    const schemas = spec.components?.schemas ?? {};
    expect(schemas.StreamUpdateEvent).toEqual({
      type: 'object',
      description: 'A new Status has appeared.',
      properties: {
        data: { $ref: '#/components/schemas/Status' },
        event: { type: 'string', const: 'update' },
      },
      required: ['data', 'event'],
    });
    expect(schemas.StreamDeleteEvent).toEqual({
      type: 'object',
      description: 'A status has been deleted.',
      properties: {
        data: { type: 'string' },
        event: { type: 'string', const: 'delete' },
      },
      required: ['data', 'event'],
    });
    expect(schemas.StreamFiltersChangedEvent).toEqual({
      type: 'object',
      description: 'Keyword filters have been changed.',
      properties: {
        event: { type: 'string', const: 'filters_changed' },
        data: { type: 'string' },
      },
      required: ['event'],
    });
    expect(schemas.StreamAnnouncementReactionEvent).toEqual({
      type: 'object',
      description: 'An announcement has received an emoji reaction.',
      properties: {
        data: {
          $ref: '#/components/schemas/StreamAnnouncementReactionPayload',
        },
        event: { type: 'string', const: 'announcement.reaction' },
      },
      required: ['data', 'event'],
    });
    expect(schemas.StreamAnnouncementReactionPayload).toEqual({
      type: 'object',
      properties: {
        announcement_id: {
          type: 'string',
          description: 'The ID of the Announcement in the database.',
        },
        count: {
          type: 'integer',
          description:
            'The total number of users who have added this reaction.',
        },
        name: {
          type: 'string',
          description:
            'The emoji used for the reaction. Either a unicode emoji, or a custom emoji shortcode.',
        },
      },
      required: ['announcement_id', 'count', 'name'],
    });

    // Unreferenced events are not emitted to avoid unused component warnings
    expect(schemas.StreamNotificationsMergedEvent).toBeUndefined();
  });
});
