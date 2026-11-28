export type StreamEventPayload =
  | { kind: 'entity'; entityName: string }
  | { kind: 'string' }
  | { kind: 'object' }
  | { kind: 'empty' };

export interface StreamEventDefinition {
  /** Event name as emitted in the SSE `event:` field, e.g. "update" or "status.update". */
  name: string;
  /** Human-readable description from streaming.md. */
  description: string;
  /** Parsed payload shape. */
  payload: StreamEventPayload;
}
