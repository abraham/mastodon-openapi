import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator OperationId Generation', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('operationId generation', () => {
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
          ],
        },
      ];

      const spec = generator.generateSchema([], testMethods);

      // Check familiar_followers example from issue
      expect(
        spec.paths['/api/v1/accounts/familiar_followers']?.get?.operationId
      ).toBe('getFamiliarFollowers');

      // Check path parameter handling
      expect(spec.paths['/api/v1/accounts/{id}']?.get?.operationId).toBe(
        'getAccountById'
      );

      // Check basic endpoints
      expect(spec.paths['/api/v1/accounts']?.post?.operationId).toBe(
        'postAccounts'
      );

      // Check nested path with parameter
      expect(
        spec.paths['/api/v1/accounts/{id}/follow']?.post?.operationId
      ).toBe('postAccountsByIdFollow');

      // Check snake_case handling
      expect(
        spec.paths['/api/v1/accounts/update_credentials']?.patch?.operationId
      ).toBe('patchAccountsUpdateCredentials');

      // Check other HTTP methods
      expect(spec.paths['/api/v1/statuses/{id}']?.delete?.operationId).toBe(
        'deleteStatusById'
      );
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
      expect(spec.paths['/api/v1/test']?.post?.operationId).toBe('postTest');
      expect(spec.paths['/api/v1/test']?.put?.operationId).toBe('putTest');
      expect(spec.paths['/api/v1/test']?.patch?.operationId).toBe('patchTest');
      expect(spec.paths['/api/v1/test']?.delete?.operationId).toBe(
        'deleteTest'
      );
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

      expect(accountsOpId).toBe('getAccountById');
      expect(statusesOpId).toBe('getStatusById');
      expect(accountsOpId).not.toBe(statusesOpId);
    });
  });
});
