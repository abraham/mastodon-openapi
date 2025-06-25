import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator Link Generation Tests', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('Status operations links', () => {
    it('should generate links from POST /api/v1/statuses to related operations', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'statuses',
          description: 'Status methods',
          methods: [
            {
              name: 'Post a new status',
              httpMethod: 'POST',
              endpoint: '/api/v1/statuses',
              description: 'Publish a status with the given parameters.',
              returns: 'Status',
            },
            {
              name: 'View a single status',
              httpMethod: 'GET',
              endpoint: '/api/v1/statuses/:id',
              description: 'Obtain information about a status.',
              returns: 'Status',
            },
            {
              name: 'Delete a status',
              httpMethod: 'DELETE',
              endpoint: '/api/v1/statuses/:id',
              description: 'Delete one of your own statuses.',
            },
            {
              name: 'See who boosted a status',
              httpMethod: 'GET',
              endpoint: '/api/v1/statuses/:id/reblogged_by',
              description: 'See who boosted a given status.',
              returns: 'Array of Account',
            },
            {
              name: 'See who favourited a status',
              httpMethod: 'GET',
              endpoint: '/api/v1/statuses/:id/favourited_by',
              description: 'See who favourited a given status.',
              returns: 'Array of Account',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      // Check that the createStatus operation exists
      const createStatusOp = spec.paths['/api/v1/statuses']?.post;
      expect(createStatusOp).toBeDefined();
      expect(createStatusOp?.operationId).toBe('createStatus');

      // Check that links are generated in components
      expect(spec.components?.links).toBeDefined();

      // Check specific links exist
      const links = spec.components?.links || {};
      const linkNames = Object.keys(links);

      // Should have consolidated links by operation ID
      expect(linkNames.some((name) => name.includes('ById'))).toBe(true);

      // Check that the 200 response has links
      const response200 = createStatusOp?.responses['200'];
      expect(response200).toBeDefined();

      if (
        response200 &&
        typeof response200 === 'object' &&
        'links' in response200
      ) {
        const responseLinks = response200.links as Record<string, any>;
        expect(responseLinks).toBeDefined();

        // Should have links to get, delete, and related operations
        expect(Object.keys(responseLinks).length).toBeGreaterThan(0);
      }
    });

    it('should generate correct link parameters using runtime expressions', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'statuses',
          description: 'Status methods',
          methods: [
            {
              name: 'Post a new status',
              httpMethod: 'POST',
              endpoint: '/api/v1/statuses',
              description: 'Publish a status with the given parameters.',
              returns: 'Status',
            },
            {
              name: 'View a single status',
              httpMethod: 'GET',
              endpoint: '/api/v1/statuses/:id',
              description: 'Obtain information about a status.',
              returns: 'Status',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const links = spec.components?.links || {};

      // Find a link from createStatus to getStatus
      const createToGetLink = Object.values(links).find(
        (link: any) =>
          link.operationId === 'getStatus' &&
          link.parameters?.id === '$response.body#/id'
      );

      expect(createToGetLink).toBeDefined();
      expect(createToGetLink?.parameters?.id).toBe('$response.body#/id');
    });

    it('should implement the exact examples from issue #309', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'statuses',
          description: 'Status methods',
          methods: [
            {
              name: 'Post a new status',
              httpMethod: 'POST',
              endpoint: '/api/v1/statuses',
              description: 'Publish a status with the given parameters.',
              returns: 'Status',
            },
            {
              name: 'Delete a status',
              httpMethod: 'DELETE',
              endpoint: '/api/v1/statuses/:id',
              description: 'Delete one of your own statuses.',
            },
            {
              name: 'See who boosted a status',
              httpMethod: 'GET',
              endpoint: '/api/v1/statuses/:id/reblogged_by',
              description: 'See who boosted a given status.',
              returns: 'Array of Account',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      // Verify the createStatus operation exists
      const createStatusOp = spec.paths['/api/v1/statuses']?.post;
      expect(createStatusOp).toBeDefined();
      expect(createStatusOp?.operationId).toBe('createStatus');

      // Verify the deleteStatus operation exists
      const deleteStatusOp = spec.paths['/api/v1/statuses/{id}']?.delete;
      expect(deleteStatusOp).toBeDefined();
      expect(deleteStatusOp?.operationId).toBe('deleteStatus');

      // Verify the getRebloggedBy operation exists
      const getRebloggedByOp =
        spec.paths['/api/v1/statuses/{id}/reblogged_by']?.get;
      expect(getRebloggedByOp).toBeDefined();
      expect(getRebloggedByOp?.operationId).toBe('getStatusRebloggedBy');

      // Check that the response has links
      const response200 = createStatusOp?.responses['200'];
      expect(response200).toBeDefined();

      if (
        response200 &&
        typeof response200 === 'object' &&
        'links' in response200
      ) {
        const responseLinks = response200.links as Record<string, any>;
        expect(responseLinks).toBeDefined();

        // Should have specific links mentioned in the issue
        expect(responseLinks.deleteStatus).toBeDefined();
        expect(responseLinks.getRebloggedBy).toBeDefined();

        // Verify the links reference the correct consolidated components
        expect(responseLinks.deleteStatus.$ref).toContain('deleteStatusById');
        expect(responseLinks.getRebloggedBy.$ref).toContain(
          'getStatusRebloggedByById'
        );
      }

      // Verify the component links exist and have correct structure
      const links = spec.components?.links || {};

      const deleteLink = Object.entries(links).find(([name]) =>
        name.includes('deleteStatusById')
      );
      expect(deleteLink).toBeDefined();
      expect(deleteLink?.[1].operationId).toBe('deleteStatus');
      expect(deleteLink?.[1].parameters?.id).toBe('$response.body#/id');

      const rebloggedByLink = Object.entries(links).find(([name]) =>
        name.includes('getStatusRebloggedByById')
      );
      expect(rebloggedByLink).toBeDefined();
      expect(rebloggedByLink?.[1].operationId).toBe('getStatusRebloggedBy');
      expect(rebloggedByLink?.[1].parameters?.id).toBe('$response.body#/id');
    });

    it('should not generate links for operations that do not return entities with IDs', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'timelines',
          description: 'Timeline methods',
          methods: [
            {
              name: 'View public timeline',
              httpMethod: 'GET',
              endpoint: '/api/v1/timelines/public',
              description: 'View public statuses.',
              returns: 'Array of Status',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      // Should not generate any links for GET operations
      const links = spec.components?.links || {};
      expect(Object.keys(links).length).toBe(0);

      const timelineOp = spec.paths['/api/v1/timelines/public']?.get;
      const response200 = timelineOp?.responses['200'];

      if (
        response200 &&
        typeof response200 === 'object' &&
        'links' in response200
      ) {
        expect(response200.links).toBeUndefined();
      }
    });
  });

  describe('Account operations links', () => {
    it('should generate links from account creation to account operations', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
            {
              name: 'Register an account',
              httpMethod: 'POST',
              endpoint: '/api/v1/accounts',
              description: 'Creates a user and account records.',
              returns: 'Account',
            },
            {
              name: 'Get account',
              httpMethod: 'GET',
              endpoint: '/api/v1/accounts/:id',
              description: 'Get account information.',
              returns: 'Account',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      // Check that links are generated for account operations
      const links = spec.components?.links || {};
      expect(Object.keys(links).length).toBeGreaterThan(0);

      // Should have a consolidated link from createAccount to getAccount
      const linkNames = Object.keys(links);
      expect(linkNames.some((name) => name.includes('getAccountById'))).toBe(
        true
      );
    });
  });
});
