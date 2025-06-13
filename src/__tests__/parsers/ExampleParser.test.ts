import { ExampleParser } from '../../parsers/ExampleParser';

describe('ExampleParser', () => {
  describe('parseEntityExample', () => {
    it('should parse valid JSON from ## Example section', () => {
      const content = `
## Example

\`\`\`json
{
  "id": "23634",
  "username": "noiob",
  "display_name": "ikea shark fan account",
  "locked": false
}
\`\`\`

## Attributes
      `;

      const result = ExampleParser.parseEntityExample(content);

      expect(result).toEqual({
        id: '23634',
        username: 'noiob',
        display_name: 'ikea shark fan account',
        locked: false,
      });
    });

    it('should return null for malformed JSON', () => {
      const content = `
## Example

\`\`\`json
{
  "id": "23634",
  "username": "noiob",
  "display_name": ikea shark fan account", // missing quotes
  "locked": false
}
\`\`\`

## Attributes
      `;

      const result = ExampleParser.parseEntityExample(content);
      expect(result).toBeNull();
    });

    it('should return null when no Example section exists', () => {
      const content = `
## Attributes

### id
The ID of the account.
      `;

      const result = ExampleParser.parseEntityExample(content);
      expect(result).toBeNull();
    });

    it('should return null when Example section has no JSON', () => {
      const content = `
## Example

This is an example but no JSON is provided.

## Attributes
      `;

      const result = ExampleParser.parseEntityExample(content);
      expect(result).toBeNull();
    });
  });

  describe('parseMethodResponseExamples', () => {
    it('should parse response examples from method content', () => {
      const content = `
## Register an account

\`\`\`http
POST /api/v1/accounts HTTP/1.1
\`\`\`

### Response

##### 200: OK

\`\`\`json
{
  "id": "12345",
  "access_token": "token123"
}
\`\`\`

##### 401: Unauthorized

\`\`\`json
{
  "error": "The access token is invalid"
}
\`\`\`

##### 422: Unprocessable entity

\`\`\`json
{
  "error": "Validation failed",
  "details": {}
}
\`\`\`
      `;

      const result = ExampleParser.parseMethodResponseExamples(content);

      expect(result).toEqual({
        '200': {
          id: '12345',
          access_token: 'token123',
        },
        '401': {
          error: 'The access token is invalid',
        },
        '422': {
          error: 'Validation failed',
          details: {},
        },
      });
    });

    it('should handle malformed JSON gracefully', () => {
      const content = `
##### 200: OK

\`\`\`json
{
  "id": "12345",
  "access_token": token123" // missing quote
}
\`\`\`

##### 401: Unauthorized

\`\`\`json
{
  "error": "The access token is invalid"
}
\`\`\`
      `;

      const result = ExampleParser.parseMethodResponseExamples(content);

      // Should only include the valid JSON
      expect(result).toEqual({
        '401': {
          error: 'The access token is invalid',
        },
      });
    });

    it('should return empty object when no response examples found', () => {
      const content = `
## Register an account

\`\`\`http
POST /api/v1/accounts HTTP/1.1
\`\`\`

No response examples provided.
      `;

      const result = ExampleParser.parseMethodResponseExamples(content);
      expect(result).toEqual({});
    });
  });
});
