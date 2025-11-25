import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityClass } from '../../interfaces/EntityClass';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator clientCredentials scopes', () => {
  test('should set clientCredentials scopes based on App token methods', () => {
    const generator = new OpenAPIGenerator();

    const entities: EntityClass[] = [];
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'accounts',
        description: 'Accounts API',
        methods: [
          {
            name: 'Register an account',
            httpMethod: 'POST',
            endpoint: '/api/v1/accounts',
            description: 'Creates a user and account records',
            oauth: 'App token + `write:accounts`',
          },
        ],
      },
      {
        name: 'apps',
        description: 'Apps API',
        methods: [
          {
            name: 'Verify app credentials',
            httpMethod: 'GET',
            endpoint: '/api/v1/apps/verify_credentials',
            description: 'Verify app credentials',
            oauth: 'App token',
          },
        ],
      },
      {
        name: 'statuses',
        description: 'Statuses API',
        methods: [
          {
            name: 'View status source',
            httpMethod: 'GET',
            endpoint: '/api/v1/statuses/{id}/source',
            description: 'View status source',
            oauth: 'App token + `read:statuses`',
          },
        ],
      },
    ];

    const schema = generator.generateSchema(entities, methodFiles);

    const clientCredentialsScopes =
      schema.components?.securitySchemes?.OAuth2?.flows?.clientCredentials
        ?.scopes;

    expect(clientCredentialsScopes).toBeDefined();
    expect(Object.keys(clientCredentialsScopes!)).toContain('write:accounts');
    expect(Object.keys(clientCredentialsScopes!)).toContain('read');
    expect(Object.keys(clientCredentialsScopes!)).toContain('read:statuses');
    expect(Object.keys(clientCredentialsScopes!).length).toBe(3);
  });

  test('should not include User token scopes in clientCredentials', () => {
    const generator = new OpenAPIGenerator();

    const entities: EntityClass[] = [];
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'blocks',
        description: 'Blocks API',
        methods: [
          {
            name: 'Block account',
            httpMethod: 'POST',
            endpoint: '/api/v1/accounts/{id}/block',
            description: 'Block an account',
            oauth: 'User token + `write:blocks`',
          },
        ],
      },
      {
        name: 'apps',
        description: 'Apps API',
        methods: [
          {
            name: 'Verify app credentials',
            httpMethod: 'GET',
            endpoint: '/api/v1/apps/verify_credentials',
            description: 'Verify app credentials',
            oauth: 'App token',
          },
        ],
      },
    ];

    const schema = generator.generateSchema(entities, methodFiles);

    const clientCredentialsScopes =
      schema.components?.securitySchemes?.OAuth2?.flows?.clientCredentials
        ?.scopes;

    expect(clientCredentialsScopes).toBeDefined();
    // write:blocks should NOT be in clientCredentials (it's User token only)
    expect(Object.keys(clientCredentialsScopes!)).not.toContain('write:blocks');
    // read should be in clientCredentials (App token default)
    expect(Object.keys(clientCredentialsScopes!)).toContain('read');
    expect(Object.keys(clientCredentialsScopes!).length).toBe(1);
  });

  test('should have descriptions for clientCredentials scopes', () => {
    const generator = new OpenAPIGenerator();

    const entities: EntityClass[] = [];
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'accounts',
        description: 'Accounts API',
        methods: [
          {
            name: 'Register an account',
            httpMethod: 'POST',
            endpoint: '/api/v1/accounts',
            description: 'Creates a user and account records',
            oauth: 'App token + `write:accounts`',
          },
        ],
      },
    ];

    const schema = generator.generateSchema(entities, methodFiles);

    const clientCredentialsScopes =
      schema.components?.securitySchemes?.OAuth2?.flows?.clientCredentials
        ?.scopes;

    expect(clientCredentialsScopes).toBeDefined();
    expect(clientCredentialsScopes!['write:accounts']).toBe(
      'Write access to accounts'
    );
  });

  test('should handle empty clientCredentials scopes when no App token methods exist', () => {
    const generator = new OpenAPIGenerator();

    const entities: EntityClass[] = [];
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'blocks',
        description: 'Blocks API',
        methods: [
          {
            name: 'Block account',
            httpMethod: 'POST',
            endpoint: '/api/v1/accounts/{id}/block',
            description: 'Block an account',
            oauth: 'User token + `write:blocks`',
          },
        ],
      },
    ];

    const schema = generator.generateSchema(entities, methodFiles);

    const clientCredentialsScopes =
      schema.components?.securitySchemes?.OAuth2?.flows?.clientCredentials
        ?.scopes;

    expect(clientCredentialsScopes).toBeDefined();
    expect(Object.keys(clientCredentialsScopes!).length).toBe(0);
  });
});
