import { ParameterParser } from '../../parsers/ParameterParser';

describe('ParameterParser - Headers parsing', () => {
  it('should parse header parameters from Headers section', () => {
    const mockSection = `
## Create status {#create}

\`\`\`http
POST /api/v1/statuses HTTP/1.1
\`\`\`

Publish a status with the given parameters.

##### Headers

Authorization
: Provide this header with \`Bearer <user_token>\` to gain authorized access to this API method.

Idempotency-Key
: Provide this header with any arbitrary string to prevent duplicate submissions of the same status. Consider using a hash or UUID generated client-side. Idempotency keys are stored for up to 1 hour.

##### Form data parameters

status
: String. The text content of the status.
`;

    const parameters = ParameterParser.parseAllParameters(mockSection);

    // Should find both header and form data parameters
    const headerParams = parameters.filter((p) => p.in === 'header');
    const formParams = parameters.filter((p) => p.in === 'formData');

    expect(headerParams).toHaveLength(2);
    expect(formParams).toHaveLength(1);

    // Check Authorization header
    const authHeader = headerParams.find((p) => p.name === 'Authorization');
    expect(authHeader).toBeDefined();
    expect(authHeader!.in).toBe('header');
    expect(authHeader!.description).toContain('Bearer');
    expect(authHeader!.description).toContain('user_token');

    // Check Idempotency-Key header
    const idempotencyHeader = headerParams.find(
      (p) => p.name === 'Idempotency-Key'
    );
    expect(idempotencyHeader).toBeDefined();
    expect(idempotencyHeader!.in).toBe('header');
    expect(idempotencyHeader!.description).toContain('arbitrary string');
    expect(idempotencyHeader!.description).toContain('duplicate submissions');

    // Check form data parameter
    const statusParam = formParams.find((p) => p.name === 'status');
    expect(statusParam).toBeDefined();
    expect(statusParam!.in).toBe('formData');
  });

  it('should parse only header parameters when only Headers section exists', () => {
    const mockSection = `
## Some method {#method}

\`\`\`http
GET /api/v1/some/endpoint HTTP/1.1
\`\`\`

##### Headers

Authorization
: Provide this header with \`Bearer <user_token>\` to gain authorized access to this API method.

Custom-Header
: Some custom header for this endpoint.
`;

    const parameters = ParameterParser.parseAllParameters(mockSection);

    expect(parameters).toHaveLength(2);
    expect(parameters[0].in).toBe('header');
    expect(parameters[1].in).toBe('header');

    const authHeader = parameters.find((p) => p.name === 'Authorization');
    expect(authHeader).toBeDefined();

    const customHeader = parameters.find((p) => p.name === 'Custom-Header');
    expect(customHeader).toBeDefined();
    expect(customHeader!.description).toBe(
      'Some custom header for this endpoint.'
    );
  });

  it('should return empty array when no Headers section exists', () => {
    const mockSection = `
## Some method {#method}

\`\`\`http
GET /api/v1/some/endpoint HTTP/1.1
\`\`\`

Just some basic endpoint with no headers described.
`;

    const headerParams = ParameterParser.parseParametersByType(
      mockSection,
      'Headers',
      'header'
    );

    expect(headerParams).toEqual([]);
  });

  it('should handle required headers with Hugo shortcodes', () => {
    const mockSection = `
## Some method {#method}

\`\`\`http
POST /api/v1/some/endpoint HTTP/1.1
\`\`\`

##### Headers

Authorization
: {{<required>}} Provide this header with \`Bearer <user_token>\` to gain authorized access to this API method.

Optional-Header
: This header is optional.
`;

    const parameters = ParameterParser.parseAllParameters(mockSection);
    const headerParams = parameters.filter((p) => p.in === 'header');

    expect(headerParams).toHaveLength(2);

    const authHeader = headerParams.find((p) => p.name === 'Authorization');
    expect(authHeader).toBeDefined();
    expect(authHeader!.required).toBe(true);
    expect(authHeader!.description).toContain('Provide this header');

    const optionalHeader = headerParams.find(
      (p) => p.name === 'Optional-Header'
    );
    expect(optionalHeader).toBeDefined();
    expect(optionalHeader!.required).toBeUndefined(); // Should be undefined, not false
  });
});
