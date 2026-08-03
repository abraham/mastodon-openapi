import { StreamingSchemaGenerator } from '../../generators/StreamingSchemaGenerator';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('StreamingSchemaGenerator', () => {
  let generator: StreamingSchemaGenerator;
  let spec: OpenAPISpec;

  beforeEach(() => {
    generator = new StreamingSchemaGenerator();
    // Create a minimal spec with required entities
    spec = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          Status: {
            type: 'object',
            properties: { id: { type: 'string' } },
          },
          Notification: {
            type: 'object',
            properties: { id: { type: 'string' } },
          },
          Conversation: {
            type: 'object',
            properties: { id: { type: 'string' } },
          },
          Announcement: {
            type: 'object',
            properties: { id: { type: 'string' } },
          },
        },
      },
    };
  });

  describe('createStreamingSchemas', () => {
    it('should create all event type schemas', () => {
      generator.createStreamingSchemas(spec);

      // Check individual event schemas exist
      expect(spec.components?.schemas).toHaveProperty('UpdateEvent');
      expect(spec.components?.schemas).toHaveProperty('DeleteEvent');
      expect(spec.components?.schemas).toHaveProperty('NotificationEvent');
      expect(spec.components?.schemas).toHaveProperty('FiltersChangedEvent');
      expect(spec.components?.schemas).toHaveProperty('ConversationEvent');
      expect(spec.components?.schemas).toHaveProperty('AnnouncementEvent');
      expect(spec.components?.schemas).toHaveProperty(
        'AnnouncementReactionEvent'
      );
      expect(spec.components?.schemas).toHaveProperty(
        'AnnouncementDeleteEvent'
      );
      expect(spec.components?.schemas).toHaveProperty('StatusUpdateEvent');
      expect(spec.components?.schemas).toHaveProperty(
        'NotificationsMergedEvent'
      );
    });

    it('should create combined streaming event schema', () => {
      generator.createStreamingSchemas(spec);

      expect(spec.components?.schemas).toHaveProperty('StreamingEvent');
      const streamingEvent = spec.components?.schemas?.[
        'StreamingEvent'
      ] as any;
      expect(streamingEvent.oneOf).toBeDefined();
      expect(streamingEvent.oneOf.length).toBe(10); // All event types including notifications_merged
    });

    it('should create endpoint-specific event schemas', () => {
      generator.createStreamingSchemas(spec);

      expect(spec.components?.schemas).toHaveProperty('StreamingUserEvent');
      expect(spec.components?.schemas).toHaveProperty(
        'StreamingUserNotificationEvent'
      );
      expect(spec.components?.schemas).toHaveProperty('StreamingPublicEvent');
      expect(spec.components?.schemas).toHaveProperty(
        'StreamingPublicLocalEvent'
      );
      expect(spec.components?.schemas).toHaveProperty(
        'StreamingPublicRemoteEvent'
      );
      expect(spec.components?.schemas).toHaveProperty('StreamingHashtagEvent');
      expect(spec.components?.schemas).toHaveProperty(
        'StreamingHashtagLocalEvent'
      );
      expect(spec.components?.schemas).toHaveProperty('StreamingListEvent');
      expect(spec.components?.schemas).toHaveProperty('StreamingDirectEvent');
    });

    it('should create AnnouncementReactionPayload schema', () => {
      generator.createStreamingSchemas(spec);

      expect(spec.components?.schemas).toHaveProperty(
        'AnnouncementReactionPayload'
      );
      const schema = spec.components?.schemas?.[
        'AnnouncementReactionPayload'
      ] as any;
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('name');
      expect(schema.properties).toHaveProperty('count');
      expect(schema.properties).toHaveProperty('announcement_id');
      expect(schema.required).toContain('name');
      expect(schema.required).toContain('count');
      expect(schema.required).toContain('announcement_id');
    });

    it('should create UpdateEvent with correct structure', () => {
      generator.createStreamingSchemas(spec);

      const updateEvent = spec.components?.schemas?.['UpdateEvent'] as any;
      expect(updateEvent.type).toBe('object');
      expect(updateEvent.properties.event).toBeDefined();
      expect(updateEvent.properties.event.enum).toContain('update');
      expect(updateEvent.properties.payload).toBeDefined();
      expect(updateEvent.properties.payload.oneOf).toBeDefined();
      expect(updateEvent.required).toContain('event');
      expect(updateEvent.required).toContain('payload');
    });

    it('should create DeleteEvent with string payload', () => {
      generator.createStreamingSchemas(spec);

      const deleteEvent = spec.components?.schemas?.['DeleteEvent'] as any;
      expect(deleteEvent.type).toBe('object');
      expect(deleteEvent.properties.event.enum).toContain('delete');
      expect(deleteEvent.properties.payload.type).toBe('string');
      expect(deleteEvent.required).toContain('event');
      expect(deleteEvent.required).toContain('payload');
    });

    it('should create FiltersChangedEvent without payload requirement', () => {
      generator.createStreamingSchemas(spec);

      const filtersEvent = spec.components?.schemas?.[
        'FiltersChangedEvent'
      ] as any;
      expect(filtersEvent.type).toBe('object');
      expect(filtersEvent.properties.event.enum).toContain('filters_changed');
      // payload is not required for filters_changed
      expect(filtersEvent.required).not.toContain('payload');
    });

    it('should create StreamingUserEvent with all expected event types', () => {
      generator.createStreamingSchemas(spec);

      const userEvent = spec.components?.schemas?.['StreamingUserEvent'] as any;
      expect(userEvent.oneOf).toBeDefined();
      expect(userEvent.oneOf.length).toBe(9); // All user events including notifications_merged

      // Check all expected event types are referenced
      const refs = userEvent.oneOf.map((ref: any) => ref.$ref);
      expect(refs).toContain('#/components/schemas/UpdateEvent');
      expect(refs).toContain('#/components/schemas/DeleteEvent');
      expect(refs).toContain('#/components/schemas/NotificationEvent');
      expect(refs).toContain('#/components/schemas/FiltersChangedEvent');
      expect(refs).toContain('#/components/schemas/AnnouncementEvent');
      expect(refs).toContain('#/components/schemas/AnnouncementReactionEvent');
      expect(refs).toContain('#/components/schemas/AnnouncementDeleteEvent');
      expect(refs).toContain('#/components/schemas/StatusUpdateEvent');
      expect(refs).toContain('#/components/schemas/NotificationsMergedEvent');
    });

    it('should create StreamingDirectEvent with only conversation event', () => {
      generator.createStreamingSchemas(spec);

      const directEvent = spec.components?.schemas?.[
        'StreamingDirectEvent'
      ] as any;
      expect(directEvent.oneOf).toBeDefined();
      expect(directEvent.oneOf.length).toBe(1);
      expect(directEvent.oneOf[0].$ref).toBe(
        '#/components/schemas/ConversationEvent'
      );
    });
  });

  describe('getStreamingSchemaRef', () => {
    beforeEach(() => {
      generator.createStreamingSchemas(spec);
    });

    it('should return correct schema ref for /api/v1/streaming/user', () => {
      const ref = generator.getStreamingSchemaRef('/api/v1/streaming/user');
      expect(ref?.$ref).toBe('#/components/schemas/StreamingUserEvent');
    });

    it('should return correct schema ref for /api/v1/streaming/public', () => {
      const ref = generator.getStreamingSchemaRef('/api/v1/streaming/public');
      expect(ref?.$ref).toBe('#/components/schemas/StreamingPublicEvent');
    });

    it('should return correct schema ref for /api/v1/streaming/direct', () => {
      const ref = generator.getStreamingSchemaRef('/api/v1/streaming/direct');
      expect(ref?.$ref).toBe('#/components/schemas/StreamingDirectEvent');
    });

    it('should return generic StreamingEvent for unknown endpoints', () => {
      const ref = generator.getStreamingSchemaRef('/api/v1/streaming/unknown');
      expect(ref?.$ref).toBe('#/components/schemas/StreamingEvent');
    });
  });
});
