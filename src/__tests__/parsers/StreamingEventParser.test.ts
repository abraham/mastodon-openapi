import { StreamingEventParser } from '../../parsers/StreamingEventParser';

describe('StreamingEventParser', () => {
  describe('parseEventDefinitions', () => {
    it('parses entity, string, hash, and empty event payloads', () => {
      const markdown = `
## Event types and payloads {#events}

\`update\`
: A new Status has appeared. Payload contains a [Status](https://docs.joinmastodon.org/entities/Status/) cast to a string. Available since v1.0.0

\`delete\`
: A status has been deleted. Payload contains the String ID of the deleted Status. Available since v1.0.0

\`filters_changed\`
: Keyword filters have been changed. Either does not contain a payload (for WebSocket connections), or contains an undefined payload (for HTTP connections). Available since v2.4.3

\`announcement.reaction\`
: An announcement has received an emoji reaction. Payload contains a Hash (with \`name\`, \`count\`, and \`announcement_id\`) cast to a string. Available since v3.1.0

\`notifications_merged\`
: Accepted notification requests have finished merging, and the notifications list should be refreshed. Payload can be ignored. Available since v4.3.0

## Streaming timelines/categories {#streams}

\`public\`
: All public posts known to the server.
`;

      expect(StreamingEventParser.parseEventDefinitions(markdown)).toEqual([
        {
          name: 'update',
          description:
            'A new Status has appeared. Payload contains a [Status](https://docs.joinmastodon.org/entities/Status/) cast to a string. Available since v1.0.0',
          payload: { kind: 'entity', entityName: 'Status' },
        },
        {
          name: 'delete',
          description:
            'A status has been deleted. Payload contains the String ID of the deleted Status. Available since v1.0.0',
          payload: { kind: 'string' },
        },
        {
          name: 'filters_changed',
          description:
            'Keyword filters have been changed. Either does not contain a payload (for WebSocket connections), or contains an undefined payload (for HTTP connections). Available since v2.4.3',
          payload: { kind: 'empty' },
        },
        {
          name: 'announcement.reaction',
          description:
            'An announcement has received an emoji reaction. Payload contains a Hash (with `name`, `count`, and `announcement_id`) cast to a string. Available since v3.1.0',
          payload: { kind: 'object' },
        },
        {
          name: 'notifications_merged',
          description:
            'Accepted notification requests have finished merging, and the notifications list should be refreshed. Payload can be ignored. Available since v4.3.0',
          payload: { kind: 'empty' },
        },
      ]);
    });

    it('returns an empty array when the events section is absent', () => {
      expect(
        StreamingEventParser.parseEventDefinitions('## Other section\n\nText')
      ).toEqual([]);
    });
  });

  describe('parseMethodStreamEvents', () => {
    it('extracts deduplicated backticked event names in order', () => {
      expect(
        StreamingEventParser.parseMethodStreamEvents(
          '`update`, `delete`, `status.update`, `update`'
        )
      ).toEqual(['update', 'delete', 'status.update']);
    });

    it('returns an empty array for missing or non-backticked returns', () => {
      expect(StreamingEventParser.parseMethodStreamEvents(undefined)).toEqual(
        []
      );
      expect(StreamingEventParser.parseMethodStreamEvents('String')).toEqual(
        []
      );
    });
  });
});
