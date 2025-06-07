import { MethodParser } from '../../parsers/MethodParser';

describe('MethodParser - Description Handling', () => {
  let methodParser: MethodParser;

  beforeEach(() => {
    methodParser = new MethodParser();
  });

  test('should not include markdown headers in description - reproducing the bug', () => {
    // This case reproduces the exact bug pattern that would capture a markdown header
    const mockSection = `## View accounts in a list {#accounts}

\`\`\`http
GET /api/v1/lists/:id/accounts HTTP/1.1
\`\`\`

##### 401: Unauthorized

Invalid or missing Authorization header.

**Returns:** Array of [Account]({{< relref "entities/account" >}})\\
**OAuth:** User token + \`read:lists\`\\
`;

    // Use reflection to access private method for testing
    const parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
    const result = parseMethodSection(mockSection);

    // Should successfully parse this method
    expect(result).not.toBeNull();
    expect(result?.name).toBe('View accounts in a list');
    expect(result?.httpMethod).toBe('GET');
    expect(result?.endpoint).toBe('/api/v1/lists/:id/accounts');

    // This is where the bug would manifest
    // The description should be empty, not contain the markdown header
    expect(result?.description).toBe('');
    expect(result?.description).not.toContain('##### 401: Unauthorized');
    expect(result?.description).not.toContain('401: Unauthorized');
  });

  test('should not include markdown headers in description - realistic case', () => {
    // Simulating the structure found in lists.md for GET /api/v1/lists/:id/accounts
    const mockSection = `## View accounts in a list {#accounts}

\`\`\`http
GET /api/v1/lists/:id/accounts HTTP/1.1
\`\`\`

**Returns:** Array of [Account]({{< relref "entities/account" >}})\\
**OAuth:** User token + \`read:lists\`\\
**Version history:**\\
2.1.0 - added

#### Request

##### Path parameters

:id
: {{<required>}} String. The ID of the List in the database.

#### Response
##### 200: OK

\`\`\`json
[
  {
    "id": "952529",
    "username": "alayna"
  }
]
\`\`\`

##### 401: Unauthorized

Invalid or missing Authorization header.

\`\`\`json
{
  "error": "The access token is invalid"
}
\`\`\`
`;

    // Use reflection to access private method for testing
    const parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
    const result = parseMethodSection(mockSection);

    // Should successfully parse this method
    expect(result).not.toBeNull();
    expect(result?.name).toBe('View accounts in a list');
    expect(result?.httpMethod).toBe('GET');
    expect(result?.endpoint).toBe('/api/v1/lists/:id/accounts');

    // The key issue: description should be empty, not contain markdown headers
    expect(result?.description).toBe('');
    expect(result?.description).not.toContain('##### 401: Unauthorized');
    expect(result?.description).not.toContain('401: Unauthorized');
  });

  test('should extract valid description when present', () => {
    const mockSection = `## Test method {#test}

\`\`\`http
GET /api/v1/test HTTP/1.1
\`\`\`

This is a valid description paragraph.

**Returns:** Something\\
**OAuth:** User token
`;

    // Use reflection to access private method for testing
    const parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
    const result = parseMethodSection(mockSection);

    // Should successfully parse this method with description
    expect(result).not.toBeNull();
    expect(result?.description).toBe('This is a valid description paragraph.');
  });

  test('should handle method with no content after HTTP block', () => {
    const mockSection = `## Empty method {#empty}

\`\`\`http
GET /api/v1/empty HTTP/1.1
\`\`\`

**Returns:** Nothing\\
**OAuth:** User token
`;

    // Use reflection to access private method for testing
    const parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
    const result = parseMethodSection(mockSection);

    // Should successfully parse this method
    expect(result).not.toBeNull();
    expect(result?.description).toBe('');
  });

  test('should not include any markdown headers in description', () => {
    // Test various markdown header levels
    const testCases = [
      '# 401: Unauthorized',
      '## 401: Unauthorized', 
      '### 401: Unauthorized',
      '#### 401: Unauthorized',
      '##### 401: Unauthorized',
      '###### 401: Unauthorized',
    ];

    for (const header of testCases) {
      const mockSection = `## Test method {#test}

\`\`\`http
GET /api/v1/test HTTP/1.1
\`\`\`

${header}

Invalid or missing Authorization header.

**Returns:** Something\\
**OAuth:** User token
`;

      // Use reflection to access private method for testing
      const parseMethodSection = (methodParser as any).parseMethodSection.bind(
        methodParser
      );
      const result = parseMethodSection(mockSection);

      // Should successfully parse this method
      expect(result).not.toBeNull();
      expect(result?.description).toBe('');
      expect(result?.description).not.toContain(header);
    }
  });
});
