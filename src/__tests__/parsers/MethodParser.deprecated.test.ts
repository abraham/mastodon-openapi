import { MethodParser } from '../../parsers/MethodParser';

describe('MethodParser - Deprecated Methods', () => {
  let methodParser: MethodParser;

  beforeEach(() => {
    methodParser = new MethodParser();
  });

  test('should properly parse header with {{%deprecated%}} marker', () => {
    const mockSection = `## Fetch preview card {{%deprecated%}} {#card}

\`\`\`http
GET /api/v1/statuses/:id/card HTTP/1.1
\`\`\`

**Returns:** [PreviewCard]({{< relref "entities/PreviewCard" >}})\\
**OAuth:** Public for public statuses, user token + \`read:statuses\` for private statuses\\
**Version history:**\\
0.0.0 - added\\
2.6.0 - deprecated in favor of card property inlined on Status entity\\
3.0.0 - removed
`;

    // Use reflection to access private method for testing
    const parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
    const result = parseMethodSection(mockSection);

    // Should successfully parse this method and mark it as deprecated
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Fetch preview card');
    expect(result?.httpMethod).toBe('GET');
    expect(result?.endpoint).toBe('/api/v1/statuses/:id/card');
    expect(result?.deprecated).toBe(true);
  });

  test('should parse normal headers without {{%deprecated%}} marker', () => {
    const mockSection = `## Get account {#view}

\`\`\`http
GET /api/v1/accounts/:id HTTP/1.1
\`\`\`

View information about a profile.

**Returns:** [Account]({{< relref "entities/account" >}})\\
**OAuth:** Public (for public statuses and accounts)\\
**Version history:**\\
0.0.0 - added
`;

    // Use reflection to access private method for testing
    const parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
    const result = parseMethodSection(mockSection);

    // Should successfully parse this method without deprecated flag
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Get account');
    expect(result?.httpMethod).toBe('GET');
    expect(result?.endpoint).toBe('/api/v1/accounts/:id');
    expect(result?.deprecated).toBeUndefined();
  });

  test('should find deprecated methods in actual statuses file', () => {
    const methodFiles = methodParser.parseAllMethods();

    // Find the statuses file
    const statusesFile = methodFiles.find((f) => f.name === 'statuses');
    expect(statusesFile).toBeDefined();

    if (statusesFile) {
      // Look for deprecated methods
      const deprecatedMethods = statusesFile.methods.filter(
        (method) => method.deprecated === true
      );

      // We should find at least one deprecated method
      expect(deprecatedMethods.length).toBeGreaterThan(0);

      // We should specifically find the card method
      const cardMethod = deprecatedMethods.find(
        (m) => m.endpoint === '/api/v1/statuses/:id/card'
      );
      expect(cardMethod).toBeDefined();
      expect(cardMethod?.name).toBe('Fetch preview card');
      expect(cardMethod?.deprecated).toBe(true);
    }
  });

  test('should generate OpenAPI operations with deprecated flag', () => {
    const testMethods: import('../../interfaces/ApiMethodsFile').ApiMethodsFile[] =
      [
        {
          name: 'test',
          description: 'Test methods',
          methods: [
            {
              name: 'Normal method',
              httpMethod: 'GET',
              endpoint: '/api/v1/test/normal',
              description: 'A normal method',
            },
            {
              name: 'Deprecated method',
              httpMethod: 'GET',
              endpoint: '/api/v1/test/deprecated',
              description: 'A deprecated method',
              deprecated: true,
            },
          ],
        },
      ];

    const openAPIGenerator =
      new (require('../../generators/OpenAPIGenerator').OpenAPIGenerator)();
    const spec = openAPIGenerator.generateSchema([], testMethods);

    // Check normal method - should not have deprecated flag
    const normalOperation = spec.paths['/api/v1/test/normal']?.get;
    expect(normalOperation).toBeDefined();
    expect(normalOperation?.deprecated).toBeUndefined();

    // Check deprecated method - should have deprecated flag
    const deprecatedOperation = spec.paths['/api/v1/test/deprecated']?.get;
    expect(deprecatedOperation).toBeDefined();
    expect(deprecatedOperation?.deprecated).toBe(true);
  });
});
