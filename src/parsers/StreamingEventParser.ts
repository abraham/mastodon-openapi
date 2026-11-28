import { MarkdownDocument } from '../document/MarkdownDocument';
import { parseDefinitionList } from '../document/definitionList';
import {
  StreamEventDefinition,
  StreamEventPayload,
} from '../interfaces/StreamEvent';

const ENTITY_PAYLOAD =
  /Payload contains an?\s+\[([A-Za-z0-9_:]+)\](?:\([^)]*\))?/i;
const HASH_PAYLOAD = /Payload contains a Hash/i;
const STRING_PAYLOAD = /Payload contains (?:the |a )?String/i;
const EMPTY_PAYLOAD =
  /does not contain a payload|undefined payload|Payload can be ignored/i;

/**
 * Parses SSE event definitions from `methods/streaming.md` and event lists
 * from streaming method `**Returns:**` lines.
 */
export class StreamingEventParser {
  /**
   * Parse `## Event types and payloads {#events}` from a method file body.
   */
  public static parseEventDefinitions(
    content: string
  ): StreamEventDefinition[] {
    const doc = MarkdownDocument.fromBody(content);
    const section = doc
      .allSections()
      .find(
        (s) =>
          s.heading.anchor === 'events' ||
          s.heading.title.toLowerCase() === 'event types and payloads'
      );

    if (!section) {
      return [];
    }

    return parseDefinitionList(section.body).map((entry) => ({
      name: entry.term,
      description: entry.definition,
      payload: this.classifyPayload(entry.definition),
    }));
  }

  /**
   * Extract backtick-quoted event names from a streaming method's returns line,
   * preserving order and removing duplicates.
   */
  public static parseMethodStreamEvents(returns?: string): string[] {
    if (!returns) {
      return [];
    }

    const events: string[] = [];
    for (const match of returns.matchAll(/`([^`]+)`/g)) {
      const event = match[1].trim();
      if (event && !events.includes(event)) {
        events.push(event);
      }
    }
    return events;
  }

  private static classifyPayload(definition: string): StreamEventPayload {
    const entityMatch = definition.match(ENTITY_PAYLOAD);
    if (entityMatch) {
      return { kind: 'entity', entityName: entityMatch[1] };
    }

    if (HASH_PAYLOAD.test(definition)) {
      return { kind: 'object' };
    }

    if (STRING_PAYLOAD.test(definition)) {
      return { kind: 'string' };
    }

    if (EMPTY_PAYLOAD.test(definition)) {
      return { kind: 'empty' };
    }

    return { kind: 'string' };
  }
}
