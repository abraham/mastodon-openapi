import { MethodConverter } from '../../generators/MethodConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { ErrorExampleRegistry } from '../../generators/ErrorExampleRegistry';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';
import { SpecBuilder } from '../../generators/SpecBuilder';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('MethodConverter - Path Sorting by Tags', () => {
  let methodConverter: MethodConverter;
  let spec: OpenAPISpec;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    const errorExampleRegistry = new ErrorExampleRegistry();

    methodConverter = new MethodConverter(
      typeParser,
      utilityHelpers,
      errorExampleRegistry
    );

    const specBuilder = new SpecBuilder();
    spec = specBuilder.buildInitialSpec();
  });

  it('should sort paths alphabetically by their tags', () => {
    // Create test methods with different tags that would be in different order if not sorted
    const testMethods: ApiMethodsFile[] = [
      {
        name: 'statuses',
        description: 'Status methods',
        methods: [
          {
            name: 'Create status',
            httpMethod: 'POST',
            endpoint: '/api/v1/statuses',
            description: 'Create a status',
          },
          {
            name: 'Get status',
            httpMethod: 'GET',
            endpoint: '/api/v1/statuses/{id}',
            description: 'Get status by ID',
          },
        ],
      },
      {
        name: 'accounts',
        description: 'Account methods',
        methods: [
          {
            name: 'Get account',
            httpMethod: 'GET',
            endpoint: '/api/v1/accounts/{id}',
            description: 'Get account by ID',
          },
          {
            name: 'Create account',
            httpMethod: 'POST',
            endpoint: '/api/v1/accounts',
            description: 'Register an account',
          },
        ],
      },
      {
        name: 'notifications',
        description: 'Notification methods',
        methods: [
          {
            name: 'Get notifications',
            httpMethod: 'GET',
            endpoint: '/api/v1/notifications',
            description: 'Get notifications',
          },
        ],
      },
    ];

    // Convert methods to paths
    methodConverter.convertMethods(testMethods, spec);

    // Get the paths in order
    const pathKeys = Object.keys(spec.paths);

    // Paths should be sorted by tags: accounts, notifications, statuses
    // Within each tag, paths should be sorted alphabetically
    const expectedOrder = [
      '/api/v1/accounts', // accounts tag
      '/api/v1/accounts/{id}', // accounts tag
      '/api/v1/notifications', // notifications tag
      '/api/v1/statuses', // statuses tag
      '/api/v1/statuses/{id}', // statuses tag
    ];

    expect(pathKeys).toEqual(expectedOrder);

    // Verify that the tags are correctly assigned and in the expected order
    const pathsWithTags = pathKeys.map((path) => {
      const operation = Object.values(spec.paths[path])[0] as any;
      return {
        path,
        tag: operation.tags[0],
      };
    });

    expect(pathsWithTags).toEqual([
      { path: '/api/v1/accounts', tag: 'accounts' },
      { path: '/api/v1/accounts/{id}', tag: 'accounts' },
      { path: '/api/v1/notifications', tag: 'notifications' },
      { path: '/api/v1/statuses', tag: 'statuses' },
      { path: '/api/v1/statuses/{id}', tag: 'statuses' },
    ]);
  });

  it('should sort paths with the same tag alphabetically by path', () => {
    const testMethods: ApiMethodsFile[] = [
      {
        name: 'accounts',
        description: 'Account methods',
        methods: [
          // Add these in non-alphabetical order to test sorting
          {
            name: 'Update account',
            httpMethod: 'PATCH',
            endpoint: '/api/v1/accounts/{id}',
            description: 'Update account',
          },
          {
            name: 'Follow account',
            httpMethod: 'POST',
            endpoint: '/api/v1/accounts/{id}/follow',
            description: 'Follow account',
          },
          {
            name: 'Create account',
            httpMethod: 'POST',
            endpoint: '/api/v1/accounts',
            description: 'Create account',
          },
          {
            name: 'Block account',
            httpMethod: 'POST',
            endpoint: '/api/v1/accounts/{id}/block',
            description: 'Block account',
          },
        ],
      },
    ];

    methodConverter.convertMethods(testMethods, spec);

    const pathKeys = Object.keys(spec.paths);

    // All paths have 'accounts' tag, so they should be sorted alphabetically by path
    const expectedOrder = [
      '/api/v1/accounts',
      '/api/v1/accounts/{id}',
      '/api/v1/accounts/{id}/block',
      '/api/v1/accounts/{id}/follow',
    ];

    expect(pathKeys).toEqual(expectedOrder);
  });

  it('should handle mixed tag types correctly', () => {
    const testMethods: ApiMethodsFile[] = [
      {
        name: 'mixed',
        description: 'Mixed methods',
        methods: [
          // Mix of different tags to test comprehensive sorting
          {
            name: 'Get timeline',
            httpMethod: 'GET',
            endpoint: '/api/v1/timelines/public',
            description: 'Get public timeline',
          },
          {
            name: 'Get account',
            httpMethod: 'GET',
            endpoint: '/api/v1/accounts/{id}',
            description: 'Get account',
          },
          {
            name: 'Search',
            httpMethod: 'GET',
            endpoint: '/api/v2/search',
            description: 'Search',
          },
          {
            name: 'Create app',
            httpMethod: 'POST',
            endpoint: '/api/v1/apps',
            description: 'Create app',
          },
        ],
      },
    ];

    methodConverter.convertMethods(testMethods, spec);

    const pathsWithTags = Object.keys(spec.paths).map((path) => {
      const operation = Object.values(spec.paths[path])[0] as any;
      return {
        path,
        tag: operation.tags[0],
      };
    });

    // Should be sorted by tag: accounts, apps, search, timelines
    expect(pathsWithTags).toEqual([
      { path: '/api/v1/accounts/{id}', tag: 'accounts' },
      { path: '/api/v1/apps', tag: 'apps' },
      { path: '/api/v2/search', tag: 'search' },
      { path: '/api/v1/timelines/public', tag: 'timelines' },
    ]);
  });
});
