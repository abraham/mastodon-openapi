import { MethodParser } from '../../parsers/MethodParser';
import { ApiResponse } from '../../interfaces/ApiResponse';

describe('MethodParser - JSON Examples', () => {
  let methodParser: MethodParser;

  beforeEach(() => {
    methodParser = new MethodParser();
  });

  test('should extract JSON examples from response sections', () => {
    const mockSection = `## Verify account credentials {#verify_credentials}

\`\`\`http
GET /api/v1/accounts/verify_credentials HTTP/1.1
\`\`\`

Test to make sure that the user token works.

**Returns:** [CredentialAccount]({{< relref "entities/Account#CredentialAccount">}})\
**OAuth:** User token + \`profile\` or \`read:accounts\`\
**Version history:**\
0.0.0 - added

#### Request

##### Headers

Authorization
: {{<required>}} Provide this header with \`Bearer <user_token>\` to gain authorized access to this API method.

#### Response

##### 200: OK

Note the extra \`source\` property, which is not visible on accounts other than your own.

\`\`\`json
{
  "id": "14715",
  "username": "trwnh",
  "acct": "trwnh",
  "display_name": "infinite love ⴳ",
  "locked": false,
  "bot": false,
  "created_at": "2016-11-24T10:02:12.085Z",
  "note": "<p>i have approximate knowledge of many things.</p>",
  "url": "https://mastodon.social/@trwnh",
  "followers_count": 821,
  "following_count": 178,
  "statuses_count": 33120
}
\`\`\`

##### 401: Unauthorized

Your credential verification will fail if the token is invalid or incorrect.

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

    // Should successfully parse this method with responses
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Verify account credentials');
    expect(result?.responses).toBeDefined();
    expect(result?.responses?.length).toBe(2);

    // Check 200 response
    const response200 = result?.responses?.find((r: ApiResponse) => r.statusCode === '200');
    expect(response200).toBeDefined();
    expect(response200?.example).toContain('"id": "14715"');
    expect(response200?.parsedExample).toBeDefined();
    expect(response200?.parsedExample.id).toBe('14715');
    expect(response200?.parsedExample.username).toBe('trwnh');

    // Check 401 response
    const response401 = result?.responses?.find((r: ApiResponse) => r.statusCode === '401');
    expect(response401).toBeDefined();
    expect(response401?.example).toContain('"error": "The access token is invalid"');
    expect(response401?.parsedExample?.error).toBe('The access token is invalid');
  });

  test('should handle methods without examples', () => {
    const mockSection = `## Test method {#test}

\`\`\`http
GET /api/v1/test HTTP/1.1
\`\`\`

This is a test method.

**Returns:** Something\
**OAuth:** User token

#### Response

##### 200: OK

No example provided.
`;

    // Use reflection to access private method for testing
    const parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
    const result = parseMethodSection(mockSection);

    // Should successfully parse this method
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Test method');
    expect(result?.responses).toBeUndefined();
  });
});