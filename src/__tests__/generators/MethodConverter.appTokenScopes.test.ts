import { MethodConverter } from '../../generators/MethodConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { ErrorExampleRegistry } from '../../generators/ErrorExampleRegistry';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('MethodConverter collectAppTokenScopes', () => {
  let methodConverter: MethodConverter;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    const errorExampleRegistry = new ErrorExampleRegistry();
    methodConverter = new MethodConverter(
      typeParser,
      utilityHelpers,
      errorExampleRegistry
    );
  });

  test('should extract scope from "App token + `write:accounts`"', () => {
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

    const scopes = methodConverter.collectAppTokenScopes(methodFiles);

    expect(scopes.has('write:accounts')).toBe(true);
    expect(scopes.size).toBe(1);
  });

  test('should default to "read" when App token has no explicit scope', () => {
    const methodFiles: ApiMethodsFile[] = [
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

    const scopes = methodConverter.collectAppTokenScopes(methodFiles);

    expect(scopes.has('read')).toBe(true);
    expect(scopes.size).toBe(1);
  });

  test('should extract scope from "App token + `read:statuses`"', () => {
    const methodFiles: ApiMethodsFile[] = [
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

    const scopes = methodConverter.collectAppTokenScopes(methodFiles);

    expect(scopes.has('read:statuses')).toBe(true);
    expect(scopes.size).toBe(1);
  });

  test('should not include scopes from User token methods', () => {
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

    const scopes = methodConverter.collectAppTokenScopes(methodFiles);

    expect(scopes.size).toBe(0);
  });

  test('should collect scopes from multiple files', () => {
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

    const scopes = methodConverter.collectAppTokenScopes(methodFiles);

    expect(scopes.has('write:accounts')).toBe(true);
    expect(scopes.has('read')).toBe(true);
    expect(scopes.has('read:statuses')).toBe(true);
    expect(scopes.size).toBe(3);
  });

  test('should deduplicate scopes across multiple methods', () => {
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'statuses',
        description: 'Statuses API',
        methods: [
          {
            name: 'View status source 1',
            httpMethod: 'GET',
            endpoint: '/api/v1/statuses/{id}/source',
            description: 'View status source',
            oauth: 'App token + `read:statuses`',
          },
          {
            name: 'View status source 2',
            httpMethod: 'GET',
            endpoint: '/api/v1/statuses/{id}/context',
            description: 'View status context',
            oauth: 'App token + `read:statuses`',
          },
        ],
      },
    ];

    const scopes = methodConverter.collectAppTokenScopes(methodFiles);

    expect(scopes.has('read:statuses')).toBe(true);
    expect(scopes.size).toBe(1);
  });

  test('should handle methods with no oauth field', () => {
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'test',
        description: 'Test API',
        methods: [
          {
            name: 'Test method',
            httpMethod: 'GET',
            endpoint: '/api/v1/test',
            description: 'Test method',
          },
        ],
      },
    ];

    const scopes = methodConverter.collectAppTokenScopes(methodFiles);

    expect(scopes.size).toBe(0);
  });

  test('should handle mixed User token and App token methods', () => {
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'mixed',
        description: 'Mixed API',
        methods: [
          {
            name: 'User method',
            httpMethod: 'POST',
            endpoint: '/api/v1/user',
            description: 'User method',
            oauth: 'User token + `write:accounts`',
          },
          {
            name: 'App method',
            httpMethod: 'GET',
            endpoint: '/api/v1/app',
            description: 'App method',
            oauth: 'App token + `read:accounts`',
          },
          {
            name: 'Mixed method',
            httpMethod: 'GET',
            endpoint: '/api/v1/mixed',
            description: 'Mixed method',
            oauth: 'User token + `read` or App token + `read`',
          },
        ],
      },
    ];

    const scopes = methodConverter.collectAppTokenScopes(methodFiles);

    expect(scopes.has('read:accounts')).toBe(true);
    expect(scopes.has('read')).toBe(true);
    // write:accounts should NOT be included as it's User token only
    expect(scopes.has('write:accounts')).toBe(false);
    expect(scopes.size).toBe(2);
  });

  test('should handle empty method files array', () => {
    const scopes = methodConverter.collectAppTokenScopes([]);

    expect(scopes.size).toBe(0);
  });

  test('should handle Public oauth methods', () => {
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'public',
        description: 'Public API',
        methods: [
          {
            name: 'Public method',
            httpMethod: 'GET',
            endpoint: '/api/v1/public',
            description: 'Public method',
            oauth: 'Public',
          },
        ],
      },
    ];

    const scopes = methodConverter.collectAppTokenScopes(methodFiles);

    expect(scopes.size).toBe(0);
  });
});
