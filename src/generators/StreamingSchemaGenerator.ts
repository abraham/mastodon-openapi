import { OpenAPISpec, OpenAPIProperty } from '../interfaces/OpenAPISchema';

/**
 * Streaming event type definitions based on Mastodon documentation
 * https://docs.joinmastodon.org/methods/streaming/#events
 */
interface StreamingEventDefinition {
  eventName: string;
  payloadType:
    | 'status'
    | 'notification'
    | 'conversation'
    | 'announcement'
    | 'string'
    | 'reaction'
    | 'none';
  description: string;
}

/**
 * Streaming endpoint event mapping
 * Maps streaming endpoint paths to the events they support
 */
const STREAMING_ENDPOINT_EVENTS: Record<string, string[]> = {
  '/api/v1/streaming/user': [
    'update',
    'delete',
    'notification',
    'filters_changed',
    'announcement',
    'announcement.reaction',
    'announcement.delete',
    'status.update',
  ],
  '/api/v1/streaming/user/notification': ['notification'],
  '/api/v1/streaming/public': ['update', 'delete', 'status.update'],
  '/api/v1/streaming/public/local': ['update', 'delete', 'status.update'],
  '/api/v1/streaming/public/remote': ['update', 'delete', 'status.update'],
  '/api/v1/streaming/hashtag': ['update', 'delete', 'status.update'],
  '/api/v1/streaming/hashtag/local': ['update', 'delete', 'status.update'],
  '/api/v1/streaming/list': ['update', 'delete', 'status.update'],
  '/api/v1/streaming/direct': ['conversation'],
};

/**
 * Event type definitions with payload information
 */
const STREAMING_EVENTS: StreamingEventDefinition[] = [
  {
    eventName: 'update',
    payloadType: 'status',
    description:
      'A new Status has appeared. Payload contains a Status cast to a string.',
  },
  {
    eventName: 'delete',
    payloadType: 'string',
    description:
      'A status has been deleted. Payload contains the String ID of the deleted Status.',
  },
  {
    eventName: 'notification',
    payloadType: 'notification',
    description:
      'A new notification has appeared. Payload contains a Notification cast to a string.',
  },
  {
    eventName: 'filters_changed',
    payloadType: 'none',
    description:
      'Keyword filters have been changed. Does not contain a payload for WebSocket connections.',
  },
  {
    eventName: 'conversation',
    payloadType: 'conversation',
    description:
      'A direct conversation has been updated. Payload contains a Conversation cast to a string.',
  },
  {
    eventName: 'announcement',
    payloadType: 'announcement',
    description:
      'An announcement has been published. Payload contains an Announcement cast to a string.',
  },
  {
    eventName: 'announcement.reaction',
    payloadType: 'reaction',
    description:
      'An announcement has received an emoji reaction. Payload contains a Hash with name, count, and announcement_id.',
  },
  {
    eventName: 'announcement.delete',
    payloadType: 'string',
    description:
      'An announcement has been deleted. Payload contains the String ID of the deleted Announcement.',
  },
  {
    eventName: 'status.update',
    payloadType: 'status',
    description:
      'A Status has been edited. Payload contains a Status cast to a string.',
  },
];

/**
 * Generator for streaming SSE event schemas
 */
class StreamingSchemaGenerator {
  /**
   * Create all streaming-related schemas and add them to the spec
   */
  public createStreamingSchemas(spec: OpenAPISpec): void {
    if (!spec.components) {
      spec.components = {};
    }
    if (!spec.components.schemas) {
      spec.components.schemas = {};
    }

    // Create the announcement reaction payload schema
    this.createAnnouncementReactionPayloadSchema(spec);

    // Create individual event schemas
    for (const eventDef of STREAMING_EVENTS) {
      this.createEventSchema(spec, eventDef);
    }

    // Create combined event schemas for each endpoint type
    this.createEndpointEventSchemas(spec);
  }

  /**
   * Create the AnnouncementReactionPayload schema for announcement.reaction events
   */
  private createAnnouncementReactionPayloadSchema(spec: OpenAPISpec): void {
    spec.components!.schemas!['AnnouncementReactionPayload'] = {
      type: 'object',
      description: 'Payload for announcement.reaction streaming events',
      properties: {
        name: {
          type: 'string',
          description: 'The emoji used for the reaction',
        },
        count: {
          type: 'integer',
          description: 'The total number of reactions with this emoji',
        },
        announcement_id: {
          type: 'string',
          description: 'The ID of the announcement being reacted to',
        },
      },
      required: ['name', 'count', 'announcement_id'],
    } as any;
  }

  /**
   * Create a schema for a single streaming event type
   */
  private createEventSchema(
    spec: OpenAPISpec,
    eventDef: StreamingEventDefinition
  ): void {
    const schemaName = this.getEventSchemaName(eventDef.eventName);
    const properties: Record<string, OpenAPIProperty> = {
      event: {
        type: 'string',
        enum: [eventDef.eventName],
        description: 'The type of event',
      },
    };

    const required: string[] = ['event'];

    // Add payload based on event type
    const payloadSchema = this.getPayloadSchema(eventDef, spec);
    if (payloadSchema) {
      properties['payload'] = payloadSchema;
      // payload is not required for filters_changed and notifications_merged
      if (eventDef.payloadType !== 'none') {
        required.push('payload');
      }
    }

    spec.components!.schemas![schemaName] = {
      type: 'object',
      description: eventDef.description,
      properties,
      required,
    } as any;
  }

  /**
   * Get the payload schema for an event type
   */
  private getPayloadSchema(
    eventDef: StreamingEventDefinition,
    spec: OpenAPISpec
  ): OpenAPIProperty | null {
    switch (eventDef.payloadType) {
      case 'status':
        // Reference to Status entity if it exists
        if (spec.components?.schemas?.['Status']) {
          return {
            description:
              'JSON-encoded Status object. For SSE, this is a string that must be parsed.',
            oneOf: [
              { $ref: '#/components/schemas/Status' },
              { type: 'string', description: 'JSON-encoded Status string' },
            ],
          };
        }
        return { type: 'string', description: 'JSON-encoded Status' };

      case 'notification':
        // Reference to Notification entity if it exists
        if (spec.components?.schemas?.['Notification']) {
          return {
            description:
              'JSON-encoded Notification object. For SSE, this is a string that must be parsed.',
            oneOf: [
              { $ref: '#/components/schemas/Notification' },
              {
                type: 'string',
                description: 'JSON-encoded Notification string',
              },
            ],
          };
        }
        return { type: 'string', description: 'JSON-encoded Notification' };

      case 'conversation':
        // Reference to Conversation entity if it exists
        if (spec.components?.schemas?.['Conversation']) {
          return {
            description:
              'JSON-encoded Conversation object. For SSE, this is a string that must be parsed.',
            oneOf: [
              { $ref: '#/components/schemas/Conversation' },
              {
                type: 'string',
                description: 'JSON-encoded Conversation string',
              },
            ],
          };
        }
        return { type: 'string', description: 'JSON-encoded Conversation' };

      case 'announcement':
        // Reference to Announcement entity if it exists
        if (spec.components?.schemas?.['Announcement']) {
          return {
            description:
              'JSON-encoded Announcement object. For SSE, this is a string that must be parsed.',
            oneOf: [
              { $ref: '#/components/schemas/Announcement' },
              {
                type: 'string',
                description: 'JSON-encoded Announcement string',
              },
            ],
          };
        }
        return { type: 'string', description: 'JSON-encoded Announcement' };

      case 'reaction':
        return {
          description:
            'JSON-encoded reaction data. For SSE, this is a string that must be parsed.',
          oneOf: [
            { $ref: '#/components/schemas/AnnouncementReactionPayload' },
            {
              type: 'string',
              description: 'JSON-encoded reaction data string',
            },
          ],
        };

      case 'string':
        return {
          type: 'string',
          description: 'String ID of the deleted resource',
        };

      case 'none':
        // No payload for this event type
        return null;

      default:
        return { type: 'string' };
    }
  }

  /**
   * Create combined schemas for each streaming endpoint's event types
   */
  private createEndpointEventSchemas(spec: OpenAPISpec): void {
    // Create a general StreamingEvent schema using oneOf for all event types
    const allEventRefs = STREAMING_EVENTS.map((eventDef) => ({
      $ref: `#/components/schemas/${this.getEventSchemaName(eventDef.eventName)}`,
    }));

    spec.components!.schemas!['StreamingEvent'] = {
      description:
        'Server-Sent Event from the Mastodon streaming API. The event field determines the type of payload.',
      oneOf: allEventRefs,
    } as any;

    // Create specific schemas for each endpoint type
    for (const [endpoint, events] of Object.entries(
      STREAMING_ENDPOINT_EVENTS
    )) {
      const schemaName = this.getEndpointSchemaName(endpoint);
      const eventRefs = events.map((eventName) => ({
        $ref: `#/components/schemas/${this.getEventSchemaName(eventName)}`,
      }));

      spec.components!.schemas![schemaName] = {
        description: `Server-Sent Events for the ${endpoint} streaming endpoint`,
        oneOf: eventRefs,
      } as any;
    }
  }

  /**
   * Get the schema name for an endpoint's combined events
   */
  private getEndpointSchemaName(endpoint: string): string {
    // Convert endpoint path to PascalCase schema name
    // e.g., "/api/v1/streaming/user" -> "StreamingUserEvent"
    const path = endpoint.replace('/api/v1/streaming/', '').replace(/\//g, '_');
    const parts = path.split('_');
    const pascalCase = parts
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
    return `Streaming${pascalCase}Event`;
  }

  /**
   * Get the schema name for an event type
   */
  private getEventSchemaName(eventName: string): string {
    // Convert event name to PascalCase
    // e.g., "status.update" -> "StatusUpdateEvent", "announcement.reaction" -> "AnnouncementReactionEvent"
    const parts = eventName.split('.');
    const pascalCase = parts
      .map((part) => {
        // Handle underscore_case within parts
        return part
          .split('_')
          .map((subPart) => subPart.charAt(0).toUpperCase() + subPart.slice(1))
          .join('');
      })
      .join('');
    return `${pascalCase}Event`;
  }

  /**
   * Get the schema reference for a streaming endpoint
   */
  public getStreamingSchemaRef(endpoint: string): OpenAPIProperty | null {
    const normalizedEndpoint = endpoint.replace(/\{[^}]+\}/g, '');

    // Check if this endpoint has specific events defined
    if (STREAMING_ENDPOINT_EVENTS[normalizedEndpoint]) {
      const schemaName = this.getEndpointSchemaName(normalizedEndpoint);
      return { $ref: `#/components/schemas/${schemaName}` };
    }

    // Fall back to generic streaming event
    return { $ref: '#/components/schemas/StreamingEvent' };
  }
}

export { StreamingSchemaGenerator, STREAMING_ENDPOINT_EVENTS };
