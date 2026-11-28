import { ApiMethod } from '../interfaces/ApiMethod';
import {
  OpenAPIProperty,
  OpenAPISchema,
  OpenAPISpec,
} from '../interfaces/OpenAPISchema';
import { StreamEventDefinition } from '../interfaces/StreamEvent';
import { streamEventPayloadOverrideFor } from '../overrides/overrides';
import { SchemaSorting } from './SchemaSorting';

/**
 * Convert a Mastodon SSE event name (e.g. "status.update") into an OpenAPI
 * component schema name (e.g. "StreamStatusUpdateEvent").
 */
export function streamEventSchemaName(eventName: string): string {
  const pascal = eventName
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return `Stream${pascal}Event`;
}

/**
 * Emits reusable Server-Sent Event component schemas and builds the response
 * schema (`$ref` or discriminated `oneOf`) for streaming endpoints.
 */
export class StreamingSchemaEmitter {
  constructor(private readonly sorting: SchemaSorting = new SchemaSorting()) {}

  public buildResponseSchema(
    method: ApiMethod,
    eventDefinitions: ReadonlyMap<string, StreamEventDefinition>,
    spec: OpenAPISpec
  ): OpenAPIProperty | null {
    if (
      !method.isStreaming ||
      !method.streamEvents ||
      method.streamEvents.length === 0 ||
      eventDefinitions.size === 0
    ) {
      return null;
    }

    const refs = method.streamEvents.map((eventName) => {
      const schemaName = this.ensureEventSchema(
        eventName,
        eventDefinitions.get(eventName),
        spec
      );
      return {
        eventName,
        ref: `#/components/schemas/${schemaName}`,
      };
    });

    if (refs.length === 1) {
      return { $ref: refs[0].ref };
    }

    const mapping: Record<string, string> = {};
    for (const { eventName, ref } of refs) {
      mapping[eventName] = ref;
    }

    return {
      oneOf: refs.map(({ ref }) => ({ $ref: ref })),
      discriminator: {
        propertyName: 'event',
        mapping,
      },
    };
  }

  private ensureEventSchema(
    eventName: string,
    definition: StreamEventDefinition | undefined,
    spec: OpenAPISpec
  ): string {
    if (!spec.components) {
      spec.components = {};
    }
    if (!spec.components.schemas) {
      spec.components.schemas = {};
    }

    const schemaName = streamEventSchemaName(eventName);
    if (spec.components.schemas[schemaName]) {
      return schemaName;
    }

    const properties: Record<string, OpenAPIProperty> = {
      event: {
        type: 'string',
        const: eventName,
      },
    };
    const required: string[] = ['event'];

    const payload = definition?.payload;
    if (payload?.kind === 'entity') {
      const sanitizedEntity = payload.entityName.replace(/::/g, '');
      properties.data = {
        $ref: `#/components/schemas/${sanitizedEntity}`,
      };
      required.push('data');
    } else if (payload?.kind === 'string') {
      properties.data = { type: 'string' };
      required.push('data');
    } else if (payload?.kind === 'object') {
      const override = streamEventPayloadOverrideFor(eventName);
      if (override) {
        this.ensurePayloadSchema(
          override.payloadSchemaName,
          override.properties,
          override.required,
          spec
        );
        properties.data = {
          $ref: `#/components/schemas/${override.payloadSchemaName}`,
        };
      } else {
        properties.data = {
          type: 'object',
          additionalProperties: true,
        };
      }
      required.push('data');
    } else {
      // Events like filters_changed or notifications_merged may omit data or send an undefined/empty payload.
      properties.data = { type: 'string' };
    }

    const schema: OpenAPISchema = {
      type: 'object',
      ...(definition?.description
        ? { description: definition.description }
        : {}),
      properties,
      required,
    };

    this.sorting.sortSchemaProperties(schema);
    spec.components.schemas[schemaName] = schema;
    return schemaName;
  }

  private ensurePayloadSchema(
    schemaName: string,
    properties: Record<string, { type: string; description: string }>,
    required: string[],
    spec: OpenAPISpec
  ): void {
    if (spec.components!.schemas![schemaName]) {
      return;
    }

    const schema: OpenAPISchema = {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(properties).map(([key, prop]) => [
          key,
          { type: prop.type, description: prop.description },
        ])
      ),
      required: [...required],
    };

    this.sorting.sortSchemaProperties(schema);
    spec.components!.schemas![schemaName] = schema;
  }
}
