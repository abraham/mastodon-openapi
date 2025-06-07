import { MethodParser } from '../../parsers/MethodParser';

describe('MethodParser', () => {
  let methodParser: MethodParser;

  beforeEach(() => {
    methodParser = new MethodParser();
  });

  test('should parse all method files without throwing errors', () => {
    expect(() => {
      const methodFiles = methodParser.parseAllMethods();
      expect(methodFiles).toBeInstanceOf(Array);
      expect(methodFiles.length).toBeGreaterThan(0);
    }).not.toThrow();
  });

  test('should parse method files and extract basic structure', () => {
    const methodFiles = methodParser.parseAllMethods();

    // Verify we found method files
    expect(methodFiles.length).toBeGreaterThan(30); // Should be around 40 method files

    // Find a specific method file to test
    const appsMethodFile = methodFiles.find((f) => f.name.includes('apps'));
    expect(appsMethodFile).toBeDefined();

    if (appsMethodFile) {
      expect(appsMethodFile.name).toContain('apps');
      expect(appsMethodFile.description).toContain('OAuth');
      expect(appsMethodFile.methods.length).toBeGreaterThan(0);

      // Check that create app method exists
      const createMethod = appsMethodFile.methods.find(
        (method) =>
          method.name.toLowerCase().includes('create') &&
          method.endpoint.includes('/api/v1/apps')
      );
      expect(createMethod).toBeDefined();

      if (createMethod) {
        expect(createMethod.httpMethod).toBe('POST');
        expect(createMethod.endpoint).toBe('/api/v1/apps');
        expect(createMethod.description).toBeTruthy();
      }
    }
  });

  test('should parse method parameters correctly', () => {
    const methodFiles = methodParser.parseAllMethods();

    // Find a method with parameters
    let foundMethodWithParams = false;
    let foundRequiredParam = false;

    for (const methodFile of methodFiles) {
      for (const method of methodFile.methods) {
        if (method.parameters && method.parameters.length > 0) {
          foundMethodWithParams = true;

          for (const param of method.parameters) {
            expect(param.name).toBeTruthy();
            expect(param.description).toBeTruthy();

            if (param.required) {
              foundRequiredParam = true;
            }
          }
        }
      }
    }

    expect(foundMethodWithParams).toBe(true);
    expect(foundRequiredParam).toBe(true);
  });

  test('should extract HTTP methods and endpoints correctly', () => {
    const methodFiles = methodParser.parseAllMethods();

    // Find some specific methods to verify
    let foundGetMethod = false;
    let foundPostMethod = false;
    let foundDeleteMethod = false;

    for (const methodFile of methodFiles) {
      for (const method of methodFile.methods) {
        if (method.httpMethod === 'GET') foundGetMethod = true;
        if (method.httpMethod === 'POST') foundPostMethod = true;
        if (method.httpMethod === 'DELETE') foundDeleteMethod = true;

        // Verify endpoint format (all endpoints should start with /)
        expect(method.endpoint).toMatch(/^\//);
      }
    }

    expect(foundGetMethod).toBe(true);
    expect(foundPostMethod).toBe(true);
    expect(foundDeleteMethod).toBe(true);
  });
});
