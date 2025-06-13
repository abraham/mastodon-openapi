import { MethodParser } from '../../parsers/MethodParser';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';
import { ApiMethod } from '../../interfaces/ApiMethod';

describe('Create App Method Parameters', () => {
  test('should parse all form data parameters for POST /api/v1/apps', () => {
    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();

    // Find the apps method file
    const appsMethodFile = methodFiles.find((file: ApiMethodsFile) =>
      file.name.toLowerCase().includes('apps')
    );

    expect(appsMethodFile).toBeDefined();

    // Find the create method
    const createMethod = appsMethodFile!.methods.find(
      (method: ApiMethod) =>
        method.name.toLowerCase().includes('create') &&
        method.endpoint.includes('/api/v1/apps')
    );

    expect(createMethod).toBeDefined();
    expect(createMethod!.httpMethod).toBe('POST');
    expect(createMethod!.endpoint).toBe('/api/v1/apps');

    // Verify all 4 form data parameters are present
    expect(createMethod!.parameters).toBeDefined();
    expect(createMethod!.parameters).toHaveLength(4);

    const paramNames = createMethod!.parameters!.map((p) => p.name);
    expect(paramNames).toContain('client_name');
    expect(paramNames).toContain('redirect_uris');
    expect(paramNames).toContain('scopes');
    expect(paramNames).toContain('website');

    // Verify required parameters
    const clientName = createMethod!.parameters!.find(
      (p) => p.name === 'client_name'
    );
    const redirectUris = createMethod!.parameters!.find(
      (p) => p.name === 'redirect_uris'
    );
    const scopes = createMethod!.parameters!.find((p) => p.name === 'scopes');
    const website = createMethod!.parameters!.find((p) => p.name === 'website');

    expect(clientName!.required).toBe(true);
    expect(redirectUris!.required).toBe(true);
    expect(scopes!.required).toBeUndefined(); // Optional
    expect(website!.required).toBeUndefined(); // Optional

    // Verify scopes parameter has OAuth enum values
    expect(scopes!.schema?.enum).toBeDefined();
    expect(scopes!.schema!.enum!.length).toBeGreaterThan(40);
    expect(scopes!.schema!.enum).toContain('read');
    expect(scopes!.schema!.enum).toContain('write');
    expect(scopes!.schema!.enum).toContain('profile');
    expect(scopes!.schema!.enum).toContain('admin:read');
  });
});
