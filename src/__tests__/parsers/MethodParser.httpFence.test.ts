import { MethodParser } from '../../parsers/MethodParser';

describe('MethodParser - http fence shapes', () => {
  let methodParser: MethodParser;
  let parseMethodSection: (section: string) => any;

  beforeEach(() => {
    methodParser = new MethodParser();
    parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
  });

  test('should parse a fence carrying headers and a body', () => {
    const section = `## Post a status {#create}

\`\`\`http
POST /api/v1/statuses HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "hello"
}
\`\`\`

Publish a status.

**Returns:** Status\\
**OAuth:** User token + \`write:statuses\`\\
**Version history:**\\
0.0.0 - added
`;

    const result = parseMethodSection(section);

    expect(result).not.toBeNull();
    expect(result.httpMethod).toBe('POST');
    expect(result.endpoint).toBe('/api/v1/statuses');
  });

  test('should parse a fence whose request line is not the first line', () => {
    const section = `## Get an account {#get}

\`\`\`http

GET /api/v1/accounts/:id HTTP/1.1
\`\`\`

View an account.

**Returns:** Account\\
**OAuth:** Public\\
**Version history:**\\
0.0.0 - added
`;

    const result = parseMethodSection(section);

    expect(result).not.toBeNull();
    expect(result.httpMethod).toBe('GET');
    expect(result.endpoint).toBe('/api/v1/accounts/:id');
  });
});
