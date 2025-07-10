import { main } from '../../index';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';
import * as fs from 'fs';
import * as path from 'path';

describe('OAuth Token scope parameter integration test', () => {
  test('postOauthToken operation has array of OAuth scope enums for scope parameter', async () => {
    // Run the main function to generate the full schema
    await main();

    // Load the generated schema
    const schemaPath = path.join(__dirname, '../../../dist/schema.json');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const schema: OpenAPISpec = JSON.parse(schemaContent);

    // Test the OAuth authorize endpoint (GET /oauth/authorize)
    const authorizeOperation = schema.paths['/oauth/authorize']?.get;
    expect(authorizeOperation).toBeDefined();
    expect(authorizeOperation?.parameters).toBeDefined();

    const authorizeScopeParam = authorizeOperation?.parameters?.find(
      (param) => param.name === 'scope'
    );
    expect(authorizeScopeParam).toBeDefined();
    expect(authorizeScopeParam?.schema?.type).toBe('array');
    expect(authorizeScopeParam?.schema?.items?.$ref).toBe(
      '#/components/schemas/OAuthScope'
    );
    expect(authorizeScopeParam?.schema?.default).toEqual(['read']);

    // Test the OAuth token endpoint (POST /oauth/token)
    const tokenOperation = schema.paths['/oauth/token']?.post;
    expect(tokenOperation).toBeDefined();
    expect(tokenOperation?.operationId).toBe('postOauthToken');

    // The token endpoint uses form data in request body
    expect(tokenOperation?.requestBody).toBeDefined();
    expect(tokenOperation?.requestBody?.content).toBeDefined();
    expect(
      tokenOperation?.requestBody?.content['application/json']
    ).toBeDefined();

    const tokenSchema =
      tokenOperation?.requestBody?.content['application/json'].schema;
    expect(tokenSchema).toBeDefined();

    // Type guard to check if schema is an OpenAPIProperty
    if (
      tokenSchema &&
      typeof tokenSchema === 'object' &&
      'type' in tokenSchema
    ) {
      expect(tokenSchema.type).toBe('object');
      expect(tokenSchema.properties).toBeDefined();
      expect(tokenSchema.properties?.scope).toBeDefined();

      // Verify the scope parameter has the correct type and description
      const scopeProperty = tokenSchema.properties?.scope;
      expect(scopeProperty?.type).toBe('array');
      expect(scopeProperty?.items?.$ref).toBe(
        '#/components/schemas/OAuthScope'
      );
      expect(scopeProperty?.default).toEqual(['read']);
    } else {
      fail(
        'Expected token schema to be an OpenAPIProperty with type and properties'
      );
    }
  });

  test('other OAuth endpoints have correct scope parameter handling', async () => {
    // Load the generated schema
    const schemaPath = path.join(__dirname, '../../../dist/schema.json');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const schema: OpenAPISpec = JSON.parse(schemaContent);

    // Check all endpoints for scope parameters
    const endpointsWithScopeParam: Array<{
      path: string;
      method: string;
      paramLocation: 'query' | 'formData';
      isArrayOfEnums: boolean;
    }> = [];

    for (const [pathName, pathObject] of Object.entries(schema.paths)) {
      for (const [methodName, operation] of Object.entries(pathObject)) {
        if (
          operation &&
          typeof operation === 'object' &&
          'parameters' in operation
        ) {
          // Check query parameters
          const queryParams = operation.parameters || [];
          for (const param of queryParams) {
            if (param.name === 'scope') {
              endpointsWithScopeParam.push({
                path: pathName,
                method: methodName,
                paramLocation: 'query',
                isArrayOfEnums:
                  param.schema?.type === 'array' &&
                  param.schema?.items?.$ref ===
                    '#/components/schemas/OAuthScope',
              });
            }
          }

          // Check form data parameters (in request body)
          if (operation.requestBody?.content) {
            for (const [contentType, content] of Object.entries(
              operation.requestBody.content
            )) {
              if (
                content &&
                typeof content === 'object' &&
                'schema' in content
              ) {
                const contentSchema = content.schema;
                if (
                  contentSchema &&
                  typeof contentSchema === 'object' &&
                  'properties' in contentSchema
                ) {
                  const properties = contentSchema.properties as Record<
                    string,
                    any
                  >;
                  if (properties && properties.scope) {
                    endpointsWithScopeParam.push({
                      path: pathName,
                      method: methodName,
                      paramLocation: 'formData',
                      isArrayOfEnums: false, // Form data doesn't use array type but we'll check the property type
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    // Verify we found the expected endpoints
    expect(endpointsWithScopeParam.length).toBeGreaterThan(0);

    // Check OAuth authorize endpoint specifically
    const authorizeEndpoint = endpointsWithScopeParam.find(
      (ep) => ep.path === '/oauth/authorize' && ep.method === 'get'
    );
    expect(authorizeEndpoint).toBeDefined();
    expect(authorizeEndpoint?.isArrayOfEnums).toBe(true);

    // Check OAuth token endpoint specifically
    const tokenEndpoint = endpointsWithScopeParam.find(
      (ep) => ep.path === '/oauth/token' && ep.method === 'post'
    );
    expect(tokenEndpoint).toBeDefined();
    expect(tokenEndpoint?.paramLocation).toBe('formData');
  });
});
