import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator OperationId Generation', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('operationId generation', () => {
    it('should generate natural operationId names for the examples in issue #58', () => {
      const testMethods: ApiMethodsFile[] = [
        {
          name: 'statuses',
          description: 'Status methods',
          methods: [
            {
              name: 'Create status',
              httpMethod: 'POST',
              endpoint: '/api/v1/statuses',
              description: 'Create status',
            },
          ],
        },
        {
          name: 'profile',
          description: 'Profile methods',
          methods: [
            {
              name: 'Delete avatar',
              httpMethod: 'DELETE',
              endpoint: '/api/v1/profile/avatar',
              description: 'Delete avatar',
            },
          ],
        },
        {
          name: 'lists',
          description: 'List methods',
          methods: [
            {
              name: 'Get lists',
              httpMethod: 'GET',
              endpoint: '/api/v1/lists',
              description: 'Get lists',
            },
            {
              name: 'Get list',
              httpMethod: 'GET',
              endpoint: '/api/v1/lists/:id',
              description: 'Get list',
            },
            {
              name: 'Update list',
              httpMethod: 'PUT',
              endpoint: '/api/v1/lists/:id',
              description: 'Update list',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], testMethods);

      // Examples from issue #58
      expect(spec.paths['/api/v1/statuses']?.post?.operationId).toBe(
        'createStatus'
      );
      expect(spec.paths['/api/v1/profile/avatar']?.delete?.operationId).toBe(
        'deleteProfileAvatar'
      );
      expect(spec.paths['/api/v1/lists']?.get?.operationId).toBe('getLists');
      expect(spec.paths['/api/v1/lists/{id}']?.get?.operationId).toBe(
        'getList'
      );
      expect(spec.paths['/api/v1/lists/{id}']?.put?.operationId).toBe(
        'updateList'
      );
    });

    it('should generate correct operationId for various endpoint patterns', () => {
      const testMethods: ApiMethodsFile[] = [
        {
          name: 'test',
          description: 'Test methods',
          methods: [
            {
              name: 'Get familiar followers',
              httpMethod: 'GET',
              endpoint: '/api/v1/accounts/familiar_followers',
              description: 'Get familiar followers',
            },
            {
              name: 'Get account by ID',
              httpMethod: 'GET',
              endpoint: '/api/v1/accounts/:id',
              description: 'Get account by ID',
            },
            {
              name: 'Create account',
              httpMethod: 'POST',
              endpoint: '/api/v1/accounts',
              description: 'Create account',
            },
            {
              name: 'Follow account',
              httpMethod: 'POST',
              endpoint: '/api/v1/accounts/:id/follow',
              description: 'Follow account',
            },
            {
              name: 'Update credentials',
              httpMethod: 'PATCH',
              endpoint: '/api/v1/accounts/update_credentials',
              description: 'Update credentials',
            },
            {
              name: 'Delete status',
              httpMethod: 'DELETE',
              endpoint: '/api/v1/statuses/:id',
              description: 'Delete status',
            },
            {
              name: 'Get account endorsements',
              httpMethod: 'GET',
              endpoint: '/api/v1/accounts/:id/endorsements',
              description: 'Get account endorsements',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], testMethods);

      // Check path parameter handling
      expect(spec.paths['/api/v1/accounts/{id}']?.get?.operationId).toBe(
        'getAccount'
      );

      // Check basic endpoints
      expect(spec.paths['/api/v1/accounts']?.post?.operationId).toBe(
        'createAccount'
      );

      // Check nested path with parameter (this is the issue being fixed)
      expect(
        spec.paths['/api/v1/accounts/{id}/follow']?.post?.operationId
      ).toBe('postAccountFollow');

      // Check snake_case handling
      expect(
        spec.paths['/api/v1/accounts/update_credentials']?.patch?.operationId
      ).toBe('patchAccountUpdateCredentials');

      // Check other HTTP methods
      expect(spec.paths['/api/v1/statuses/{id}']?.delete?.operationId).toBe(
        'deleteStatus'
      );

      // Check the specific issue pattern: /resource/{id}/sub-resource -> getResourceSubResource
      expect(
        spec.paths['/api/v1/accounts/{id}/endorsements']?.get?.operationId
      ).toBe('getAccountEndorsements');
    });

    it('should handle different HTTP methods correctly', () => {
      const testMethods: ApiMethodsFile[] = [
        {
          name: 'test',
          description: 'Test methods',
          methods: [
            {
              name: 'Get test',
              httpMethod: 'GET',
              endpoint: '/api/v1/test',
              description: 'Get test',
            },
            {
              name: 'Post test',
              httpMethod: 'POST',
              endpoint: '/api/v1/test',
              description: 'Post test',
            },
            {
              name: 'Put test',
              httpMethod: 'PUT',
              endpoint: '/api/v1/test',
              description: 'Put test',
            },
            {
              name: 'Patch test',
              httpMethod: 'PATCH',
              endpoint: '/api/v1/test',
              description: 'Patch test',
            },
            {
              name: 'Delete test',
              httpMethod: 'DELETE',
              endpoint: '/api/v1/test',
              description: 'Delete test',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], testMethods);

      expect(spec.paths['/api/v1/test']?.get?.operationId).toBe('getTest');
      expect(spec.paths['/api/v1/test']?.post?.operationId).toBe('createTest');
      expect(spec.paths['/api/v1/test']?.put?.operationId).toBe('putTest');
      expect(spec.paths['/api/v1/test']?.patch?.operationId).toBe('patchTest');
      expect(spec.paths['/api/v1/test']?.delete?.operationId).toBe(
        'deleteTest'
      );
    });

    it('should generate semantic operationIds for nested resource operations', () => {
      const testMethods: ApiMethodsFile[] = [
        {
          name: 'announcements',
          description: 'Announcement methods',
          methods: [
            {
              name: 'Add reaction to announcement',
              httpMethod: 'PUT',
              endpoint: '/api/v1/announcements/:id/reactions/:name',
              description: 'Add reaction to announcement',
            },
            {
              name: 'Remove reaction from announcement',
              httpMethod: 'DELETE',
              endpoint: '/api/v1/announcements/:id/reactions/:name',
              description: 'Remove reaction from announcement',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], testMethods);

      expect(
        spec.paths['/api/v1/announcements/{id}/reactions/{name}']?.put
          ?.operationId
      ).toBe('updateAnnouncementReaction');
      expect(
        spec.paths['/api/v1/announcements/{id}/reactions/{name}']?.delete
          ?.operationId
      ).toBe('deleteAnnouncementReaction');
    });

    it('should ensure all operations have unique operationIds', () => {
      const testMethods: ApiMethodsFile[] = [
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
            {
              name: 'Get account',
              httpMethod: 'GET',
              endpoint: '/api/v1/accounts/:id',
              description: 'Get account',
            },
          ],
        },
        {
          name: 'statuses',
          description: 'Status methods',
          methods: [
            {
              name: 'Get status',
              httpMethod: 'GET',
              endpoint: '/api/v1/statuses/:id',
              description: 'Get status',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], testMethods);

      const accountsOpId =
        spec.paths['/api/v1/accounts/{id}']?.get?.operationId;
      const statusesOpId =
        spec.paths['/api/v1/statuses/{id}']?.get?.operationId;

      expect(accountsOpId).toBe('getAccount');
      expect(statusesOpId).toBe('getStatus');
      expect(accountsOpId).not.toBe(statusesOpId);
    });

    it('should generate combined operationIds by default for 2-segment paths', () => {
      const testMethods: ApiMethodsFile[] = [
        {
          name: 'featured_tags',
          description: 'Featured tags methods',
          methods: [
            {
              name: 'Get featured tag suggestions',
              httpMethod: 'GET',
              endpoint: '/api/v1/featured_tags/suggestions',
              description: 'Get featured tag suggestions',
            },
          ],
        },
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
            {
              name: 'Search accounts',
              httpMethod: 'GET',
              endpoint: '/api/v1/accounts/search',
              description: 'Search for accounts',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], testMethods);

      // By default, 2-segment paths should combine segments for better context
      expect(
        spec.paths['/api/v1/featured_tags/suggestions']?.get?.operationId
      ).toBe('getFeaturedTagSuggestions');
      expect(spec.paths['/api/v1/accounts/search']?.get?.operationId).toBe(
        'getAccountSearch'
      );
    });

    it('should name a sub-collection and one of its items consistently', () => {
      const testMethods: ApiMethodsFile[] = [
        {
          name: 'filters',
          description: 'Filter methods',
          methods: [
            {
              name: 'List keywords',
              httpMethod: 'GET',
              endpoint: '/api/v2/filters/:filter_id/keywords',
              description: 'List the keywords of a filter',
            },
            {
              name: 'View keyword',
              httpMethod: 'GET',
              endpoint: '/api/v2/filters/keywords/:id',
              description: 'View one keyword',
            },
            {
              name: 'Delete keyword',
              httpMethod: 'DELETE',
              endpoint: '/api/v2/filters/keywords/:id',
              description: 'Delete one keyword',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], testMethods);

      // Plural names the collection, singular names one item. Neither form
      // leaks a `ById` suffix.
      expect(
        spec.paths['/api/v2/filters/{filter_id}/keywords']?.get?.operationId
      ).toBe('getFilterKeywordsV2');
      expect(
        spec.paths['/api/v2/filters/keywords/{id}']?.get?.operationId
      ).toBe('getFilterKeywordV2');
      expect(
        spec.paths['/api/v2/filters/keywords/{id}']?.delete?.operationId
      ).toBe('deleteFilterKeywordV2');
    });

    it('should name an action the same way whether or not it targets one item', () => {
      const testMethods: ApiMethodsFile[] = [
        {
          name: 'notifications',
          description: 'Notification methods',
          methods: [
            {
              name: 'Accept one request',
              httpMethod: 'POST',
              endpoint: '/api/v1/notifications/requests/:id/accept',
              description: 'Accept a single notification request',
            },
            {
              name: 'Accept multiple requests',
              httpMethod: 'POST',
              endpoint: '/api/v1/notifications/requests/accept',
              description: 'Accept multiple notification requests',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], testMethods);

      expect(
        spec.paths['/api/v1/notifications/requests/{id}/accept']?.post
          ?.operationId
      ).toBe('postNotificationRequestAccept');
      expect(
        spec.paths['/api/v1/notifications/requests/accept']?.post?.operationId
      ).toBe('createNotificationRequestAccept');
    });

    it('should keep naming a path parameter that does not select one item', () => {
      const testMethods: ApiMethodsFile[] = [
        {
          name: 'instance',
          description: 'Instance methods',
          methods: [
            {
              name: 'View terms of service',
              httpMethod: 'GET',
              endpoint: '/api/v1/instance/terms_of_service',
              description: 'View the current terms of service',
            },
            {
              name: 'View dated terms of service',
              httpMethod: 'GET',
              endpoint: '/api/v1/instance/terms_of_service/:date',
              description: 'View a specific version of the terms of service',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], testMethods);

      // `terms_of_service` has no distinct singular, so dropping `{date}`
      // would collide with the parent path.
      expect(
        spec.paths['/api/v1/instance/terms_of_service']?.get?.operationId
      ).toBe('getInstanceTermsOfService');
      expect(
        spec.paths['/api/v1/instance/terms_of_service/{date}']?.get?.operationId
      ).toBe('getInstanceTermsOfServiceByDate');
    });
  });
});
