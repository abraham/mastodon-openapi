import { ParameterParser } from '../../parsers/ParameterParser';

describe('ParameterParser section boundary handling', () => {
  it('should not parse query parameters as headers when there are multiple header sections', () => {
    const methodSection = `
## Get multiple accounts {#index}

\`\`\`http
GET /api/v1/accounts HTTP/1.1
\`\`\`

View information about multiple profiles.

#### Request
##### Headers

##### Query parameters

id[]
: Array of String. The IDs of the Accounts in the database.

##### Headers

Authorization
: Provide this header with \`Bearer <user_token>\` to gain authorized access to this API method.

#### Response
`;

    const headerParams = ParameterParser.parseParametersByType(
      methodSection,
      'Headers',
      'header'
    );

    const queryParams = ParameterParser.parseParametersByType(
      methodSection,
      'Query parameters',
      'query'
    );

    // Should not find id[] as a header parameter
    expect(headerParams.find((p) => p.name === 'id')).toBeUndefined();

    // Should find id[] as a query parameter
    expect(queryParams.find((p) => p.name === 'id')).toBeDefined();
    expect(queryParams.find((p) => p.name === 'id')?.in).toBe('query');
  });

  it('should correctly parse headers when there are multiple header sections', () => {
    const methodSection = `
## Test method

#### Request
##### Headers

##### Query parameters

id[]
: Array of String. The IDs of the Accounts in the database.

##### Headers

Authorization
: Provide this header with \`Bearer <user_token>\` to gain authorized access to this API method.

Idempotency-Key
: Provide this header with any arbitrary string to prevent duplicate submissions.
`;

    const headerParams = ParameterParser.parseParametersByType(
      methodSection,
      'Headers',
      'header'
    ).filter((param) => param.name !== 'Authorization'); // Exclude Authorization as it's filtered out

    const queryParams = ParameterParser.parseParametersByType(
      methodSection,
      'Query parameters',
      'query'
    );

    // Should find Idempotency-Key as a header parameter
    expect(
      headerParams.find((p) => p.name === 'Idempotency-Key')
    ).toBeDefined();
    expect(headerParams.find((p) => p.name === 'Idempotency-Key')?.in).toBe(
      'header'
    );

    // Should not find query parameters in headers
    expect(headerParams.find((p) => p.name === 'id')).toBeUndefined();

    // Should find id[] as a query parameter
    expect(queryParams.find((p) => p.name === 'id')).toBeDefined();
    expect(queryParams.find((p) => p.name === 'id')?.in).toBe('query');
  });
});
