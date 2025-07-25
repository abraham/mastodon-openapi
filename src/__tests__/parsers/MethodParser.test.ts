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

  test('should use filename for method file names instead of frontmatter title', () => {
    const methodFiles = methodParser.parseAllMethods();

    // Find accounts method file
    const accountsMethodFile = methodFiles.find((f) => f.name === 'accounts');
    expect(accountsMethodFile).toBeDefined();

    // Find apps method file
    const appsMethodFile = methodFiles.find((f) => f.name === 'apps');
    expect(appsMethodFile).toBeDefined();

    // Find statuses method file
    const statusesMethodFile = methodFiles.find((f) => f.name === 'statuses');
    expect(statusesMethodFile).toBeDefined();

    // Verify names are exactly the filename (not frontmatter titles like "accounts API methods")
    if (accountsMethodFile) {
      expect(accountsMethodFile.name).toBe('accounts');
      expect(accountsMethodFile.name).not.toContain('API methods');
    }

    if (appsMethodFile) {
      expect(appsMethodFile.name).toBe('apps');
      expect(appsMethodFile.name).not.toContain('API methods');
    }

    if (statusesMethodFile) {
      expect(statusesMethodFile.name).toBe('statuses');
      expect(statusesMethodFile.name).not.toContain('API methods');
    }
  });

  test('should parse query parameters correctly', () => {
    const methodFiles = methodParser.parseAllMethods();

    // Find timelines method file which should have query parameters
    const timelinesMethodFile = methodFiles.find((f) => f.name === 'timelines');
    expect(timelinesMethodFile).toBeDefined();

    if (timelinesMethodFile) {
      // Find the public timeline method which has query parameters
      const publicTimelineMethod = timelinesMethodFile.methods.find(
        (method) => method.endpoint === '/api/v1/timelines/public'
      );
      expect(publicTimelineMethod).toBeDefined();

      if (publicTimelineMethod && publicTimelineMethod.parameters) {
        // Should have query parameters like 'local', 'remote', 'only_media', etc.
        const queryParams = publicTimelineMethod.parameters.filter(
          (p) => p.in === 'query'
        );
        expect(queryParams.length).toBeGreaterThan(0);

        // Check for specific known query parameters
        const localParam = queryParams.find((p) => p.name === 'local');
        expect(localParam).toBeDefined();
        expect(localParam?.description).toContain('Show only local statuses');

        const limitParam = queryParams.find((p) => p.name === 'limit');
        expect(limitParam).toBeDefined();
        expect(limitParam?.description).toContain('Maximum number of results');
      }
    }
  });

  test('should parse both query and form data parameters', () => {
    const methodFiles = methodParser.parseAllMethods();

    let foundQueryParam = false;
    let foundFormParam = false;

    for (const methodFile of methodFiles) {
      for (const method of methodFile.methods) {
        if (method.parameters) {
          for (const param of method.parameters) {
            if (param.in === 'query') {
              foundQueryParam = true;
            }
            if (param.in === 'formData') {
              foundFormParam = true;
            }
          }
        }
      }
    }

    expect(foundQueryParam).toBe(true);
    expect(foundFormParam).toBe(true);
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

  test('should skip methods marked with {{%removed%}}', () => {
    const methodFiles = methodParser.parseAllMethods();

    // Look for the specific removed method in notifications
    const notificationsFile = methodFiles.find(
      (f) => f.name === 'notifications'
    );
    expect(notificationsFile).toBeDefined();

    if (notificationsFile) {
      // Should not find the removed POST /api/v1/notifications/dismiss method
      const removedMethod = notificationsFile.methods.find(
        (method) =>
          method.endpoint === '/api/v1/notifications/dismiss' &&
          method.httpMethod === 'POST'
      );
      expect(removedMethod).toBeUndefined();

      // Should still find the non-removed POST /api/v1/notifications/:id/dismiss method
      const validMethod = notificationsFile.methods.find(
        (method) =>
          method.endpoint === '/api/v1/notifications/:id/dismiss' &&
          method.httpMethod === 'POST'
      );
      expect(validMethod).toBeDefined();
    }

    // Verify no methods contain "removed" in their name (as a general check)
    for (const methodFile of methodFiles) {
      for (const method of methodFile.methods) {
        expect(method.name.toLowerCase()).not.toContain('removed');
      }
    }
  });
});
