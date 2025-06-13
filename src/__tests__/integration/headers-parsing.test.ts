import { MethodParser } from '../../parsers/MethodParser';

describe('MethodParser - Headers integration', () => {
  it('should parse headers from actual method documentation', () => {
    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();

    // Find the statuses method file
    const statusesMethodFile = methodFiles.find((f) => f.name === 'statuses');
    expect(statusesMethodFile).toBeDefined();

    if (statusesMethodFile) {
      // Find the POST /api/v1/statuses method
      const createStatusMethod = statusesMethodFile.methods.find(
        (method) =>
          method.endpoint === '/api/v1/statuses' && method.httpMethod === 'POST'
      );
      expect(createStatusMethod).toBeDefined();

      if (createStatusMethod && createStatusMethod.parameters) {
        // Should have header parameters
        const headerParams = createStatusMethod.parameters.filter(
          (p) => p.in === 'header'
        );
        expect(headerParams.length).toBeGreaterThan(0);

        // Should have Authorization header
        const authHeader = headerParams.find((p) => p.name === 'Authorization');
        expect(authHeader).toBeDefined();
        expect(authHeader!.required).toBe(true);

        // Should have Idempotency-Key header
        const idempotencyHeader = headerParams.find(
          (p) => p.name === 'Idempotency-Key'
        );
        expect(idempotencyHeader).toBeDefined();
        expect(idempotencyHeader!.description).toContain('arbitrary string');
      }
    }
  });

  it('should parse headers across different method files', () => {
    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();

    let totalHeadersFound = 0;
    let methodsWithHeaders = 0;

    for (const methodFile of methodFiles) {
      for (const method of methodFile.methods) {
        if (method.parameters) {
          const headerParams = method.parameters.filter(
            (p) => p.in === 'header'
          );
          if (headerParams.length > 0) {
            methodsWithHeaders++;
            totalHeadersFound += headerParams.length;
          }
        }
      }
    }

    // Should have found some headers across the API
    expect(totalHeadersFound).toBeGreaterThan(0);
    expect(methodsWithHeaders).toBeGreaterThan(0);

    console.log(
      `Found ${totalHeadersFound} headers across ${methodsWithHeaders} methods`
    );
  });
});
