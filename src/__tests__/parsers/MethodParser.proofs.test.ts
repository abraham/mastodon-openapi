import { MethodParser } from '../../parsers/MethodParser';

describe('MethodParser - Proofs API', () => {
  let methodParser: MethodParser;

  beforeEach(() => {
    methodParser = new MethodParser();
  });

  test('should NOT include the removed proofs API endpoint', () => {
    const methodFiles = methodParser.parseAllMethods();

    // Look for the proofs method file
    const proofsFile = methodFiles.find((f) => f.name === 'proofs');
    expect(proofsFile).toBeDefined();

    if (proofsFile) {
      // Should not find the removed GET /api/proofs method
      const removedProofsMethod = proofsFile.methods.find(
        (method) =>
          method.endpoint === '/api/proofs' && method.httpMethod === 'GET'
      );
      expect(removedProofsMethod).toBeUndefined();

      // Verify no methods contain the removed endpoint
      for (const method of proofsFile.methods) {
        expect(method.endpoint).not.toBe('/api/proofs');
      }
    }
  });

  test('should properly parse the proofs.md file header with {{%removed%}} marker', () => {
    const mockSection = `## View identity proofs {{%removed%}} {#get}

\`\`\`http
GET /api/proofs HTTP/1.1
\`\`\`

**Returns:** custom response defined by provider\\
**OAuth:** Public\\
**Version history:**\\
2.8.0 - added

#### Request
##### Query parameters

provider
: String. The identity provider to be looked up. Currently only supports \`keybase\` (case-sensitive).

username
: String. The username on the selected identity provider.
`;

    // Use reflection to access private method for testing
    const parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
    const result = parseMethodSection(mockSection);

    // Should return null due to {{%removed%}} marker
    expect(result).toBeNull();
  });
});
