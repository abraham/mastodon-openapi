import { MethodParser } from '../../parsers/MethodParser';

describe('MethodParser - Removed Methods', () => {
  let methodParser: MethodParser;

  beforeEach(() => {
    methodParser = new MethodParser();
  });

  test('should properly parse header with {{%removed%}} marker', () => {
    // Test the regex improvement can handle headers with {{%removed%}}
    const mockSection = `## Dismiss a single notification {{%removed%}} {#dismiss-deprecated}

\`\`\`http
POST /api/v1/notifications/dismiss HTTP/1.1
\`\`\`

Dismiss a single notification from the server.

**Returns:** Empty\\
**OAuth:** User token + \`write:notifications\`\\
**Version history:**\\
0.0.0 - available\\
1.3.0 - deprecated in favor of [notifications/:id/dismiss](#dismiss)
3.0.0 - removed
`;

    // Use reflection to access private method for testing
    const parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
    const result = parseMethodSection(mockSection);

    // Should return null due to {{%removed%}} marker
    expect(result).toBeNull();
  });

  test('should parse normal headers without {{%removed%}} marker', () => {
    const mockSection = `## Dismiss a single notification {#dismiss}

\`\`\`http
POST /api/v1/notifications/:id/dismiss HTTP/1.1
\`\`\`

Dismiss a single notification from the server.

**Returns:** Empty\\
**OAuth:** User token + \`write:notifications\`\\
**Version history:**\\
1.3.0 - added
`;

    // Use reflection to access private method for testing
    const parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
    const result = parseMethodSection(mockSection);

    // Should successfully parse this method
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Dismiss a single notification');
    expect(result?.httpMethod).toBe('POST');
    expect(result?.endpoint).toBe('/api/v1/notifications/:id/dismiss');
  });
});
