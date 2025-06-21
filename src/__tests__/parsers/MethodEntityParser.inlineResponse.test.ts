import { MethodEntityParser } from '../../parsers/MethodEntityParser';
import * as fs from 'fs';
import * as path from 'path';

describe('MethodEntityParser - Inline Response Entity Parsing', () => {
  const testMarkdown = `---
title: Test OAuth API methods
description: Test OAuth methods.
---

## Discover OAuth Server Configuration {#authorization-server-metadata}

\`\`\`http
GET /.well-known/oauth-authorization-server HTTP/1.1
\`\`\`

Returns the OAuth 2 Authorization Server Metadata for the Mastodon server.

**Returns:** JSON as per the above description\\
**OAuth:** Public\\
**Version history:**\\
4.3.0 - added

#### Response

##### 200: OK

\`\`\`json
{
  "issuer": "https://social.example/",
  "service_documentation": "https://docs.joinmastodon.org/",
  "authorization_endpoint": "https://social.example/oauth/authorize",
  "token_endpoint": "https://social.example/oauth/token",
  "scopes_supported": [
    "read",
    "write",
    "profile"
  ],
  "response_types_supported": ["code"],
  "grant_types_supported": [
    "authorization_code",
    "client_credentials"
  ]
}
\`\`\`

## Regular Method {#regular}

\`\`\`http
GET /api/v1/test HTTP/1.1
\`\`\`

A regular method that returns an entity reference.

**Returns:** [Account]\\
**OAuth:** User

##### 200: OK

Returns an Account entity.
`;

  let tempFilePath: string;

  beforeEach(() => {
    // Create a temporary test file
    tempFilePath = path.join(__dirname, 'test-oauth-methods.md');
    fs.writeFileSync(tempFilePath, testMarkdown);
  });

  afterEach(() => {
    // Clean up the temporary file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  test('should parse inline JSON response entities', () => {
    const entities =
      MethodEntityParser.parseEntitiesFromMethodFile(tempFilePath);

    // Should find one entity from the inline JSON response
    expect(entities).toHaveLength(1);

    const entity = entities[0];
    expect(entity.name).toBe('DiscoverOauthServerConfigurationResponse');
    expect(entity.description).toBe(
      'Response schema for Discover OAuth Server Configuration'
    );
    expect(entity.example).toBeDefined();
  });

  test('should correctly parse JSON structure to attributes', () => {
    const entities =
      MethodEntityParser.parseEntitiesFromMethodFile(tempFilePath);
    const entity = entities[0];

    // Check that basic string properties are parsed correctly
    const issuerAttr = entity.attributes.find((attr) => attr.name === 'issuer');
    expect(issuerAttr).toBeDefined();
    expect(issuerAttr?.type).toBe('String (URL)');

    // Check that array properties are parsed correctly
    const scopesAttr = entity.attributes.find(
      (attr) => attr.name === 'scopes_supported'
    );
    expect(scopesAttr).toBeDefined();
    expect(scopesAttr?.type).toBe('Array of String');
    expect(scopesAttr?.description).toBe('Array of scopes_supported');
  });

  test('should include example JSON in the entity', () => {
    const entities =
      MethodEntityParser.parseEntitiesFromMethodFile(tempFilePath);
    const entity = entities[0];

    expect(entity.example).toEqual({
      issuer: 'https://social.example/',
      service_documentation: 'https://docs.joinmastodon.org/',
      authorization_endpoint: 'https://social.example/oauth/authorize',
      token_endpoint: 'https://social.example/oauth/token',
      scopes_supported: ['read', 'write', 'profile'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'client_credentials'],
    });
  });

  test('should not create entities for regular entity references', () => {
    // Test markdown with only entity references (no inline JSON)
    const regularMarkdown = `---
title: Regular methods
---

## Get Account {#account}

\`\`\`http
GET /api/v1/accounts/:id HTTP/1.1
\`\`\`

**Returns:** [Account]

##### 200: OK

Returns an Account.
`;

    const regularTempPath = path.join(__dirname, 'test-regular-methods.md');
    fs.writeFileSync(regularTempPath, regularMarkdown);

    try {
      const entities =
        MethodEntityParser.parseEntitiesFromMethodFile(regularTempPath);

      // Should not find any inline response entities since this uses [Account] reference
      expect(entities).toHaveLength(0);
    } finally {
      if (fs.existsSync(regularTempPath)) {
        fs.unlinkSync(regularTempPath);
      }
    }
  });

  test('should handle methods without response examples', () => {
    const noExampleMarkdown = `---
title: No example methods
---

## Method Without Example {#no-example}

\`\`\`http
GET /api/v1/test HTTP/1.1
\`\`\`

**Returns:** JSON as per the above description

##### 200: OK

No JSON example provided here.
`;

    const noExampleTempPath = path.join(
      __dirname,
      'test-no-example-methods.md'
    );
    fs.writeFileSync(noExampleTempPath, noExampleMarkdown);

    try {
      const entities =
        MethodEntityParser.parseEntitiesFromMethodFile(noExampleTempPath);

      // Should not create an entity since there's no JSON example to parse
      expect(entities).toHaveLength(0);
    } finally {
      if (fs.existsSync(noExampleTempPath)) {
        fs.unlinkSync(noExampleTempPath);
      }
    }
  });
});
