import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator Link Headers', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('Link headers for pagination', () => {
    it('should include Link header in 200 responses for methods with max_id parameter', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'bookmarks',
          description: 'Bookmark methods',
          methods: [
            {
              name: 'View bookmarked statuses',
              httpMethod: 'GET',
              endpoint: '/api/v1/bookmarks',
              description: 'Statuses the user has bookmarked.',
              returns: 'Array of Status',
              parameters: [
                {
                  name: 'max_id',
                  description:
                    'Internal parameter. Use HTTP Link header for pagination.',
                  in: 'query',
                  type: 'string',
                },
                {
                  name: 'limit',
                  description: 'Maximum number of results to return.',
                  in: 'query',
                  type: 'integer',
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/bookmarks']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses).toBeDefined();

      // Should include 200 response with Link header
      const response200 = operation?.responses['200'];
      expect(response200).toBeDefined();
      if (response200) {
        expect(response200.headers).toBeDefined();

        // Should include Link header
        expect(response200.headers?.['Link']).toBeDefined();
        expect(response200.headers?.['Link'].$ref).toBe(
          '#/components/headers/Link'
        );

        // Should also include rate limit headers
        expect(response200.headers?.['X-RateLimit-Limit']).toBeDefined();
        expect(response200.headers?.['X-RateLimit-Remaining']).toBeDefined();
        expect(response200.headers?.['X-RateLimit-Reset']).toBeDefined();
      }
    });

    it('should include Link header in 200 responses for methods with since_id parameter', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'domain_blocks',
          description: 'Domain block methods',
          methods: [
            {
              name: 'View blocked domains',
              httpMethod: 'GET',
              endpoint: '/api/v1/domain_blocks',
              description: 'View domains the user has blocked.',
              returns: 'Array of String',
              parameters: [
                {
                  name: 'since_id',
                  description:
                    'Internal parameter. Use HTTP Link header for pagination.',
                  in: 'query',
                  type: 'string',
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/domain_blocks']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses).toBeDefined();

      const response200 = operation?.responses['200'];
      expect(response200).toBeDefined();
      if (response200) {
        expect(response200.headers).toBeDefined();
        expect(response200.headers?.['Link']).toBeDefined();
        expect(response200.headers?.['Link'].$ref).toBe(
          '#/components/headers/Link'
        );
      }
    });

    it('should include Link header in 200 responses for methods with min_id parameter', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'statuses',
          description: 'Status methods',
          methods: [
            {
              name: 'View account statuses',
              httpMethod: 'GET',
              endpoint: '/api/v1/accounts/:id/statuses',
              description: 'Statuses posted by the account.',
              returns: 'Array of Status',
              parameters: [
                {
                  name: 'min_id',
                  description:
                    'Internal parameter. Use HTTP Link header for pagination.',
                  in: 'query',
                  type: 'string',
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/accounts/{id}/statuses']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses).toBeDefined();

      const response200 = operation?.responses['200'];
      expect(response200).toBeDefined();
      if (response200) {
        expect(response200.headers).toBeDefined();
        expect(response200.headers?.['Link']).toBeDefined();
        expect(response200.headers?.['Link'].$ref).toBe(
          '#/components/headers/Link'
        );
      }
    });

    it('should NOT include Link header for methods without pagination parameters', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
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

      const operation = spec.paths['/api/v1/accounts/{id}']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses).toBeDefined();

      const response200 = operation?.responses['200'];
      expect(response200).toBeDefined();
      if (response200) {
        expect(response200.headers).toBeDefined();

        // Should NOT include Link header
        expect(response200.headers?.['Link']).toBeUndefined();

        // Should still include rate limit headers
        expect(response200.headers?.['X-RateLimit-Limit']).toBeDefined();
        expect(response200.headers?.['X-RateLimit-Remaining']).toBeDefined();
        expect(response200.headers?.['X-RateLimit-Reset']).toBeDefined();
      }
    });

    it('should include Link header in other 2xx responses for methods with pagination parameters', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'bookmarks',
          description: 'Bookmark methods',
          methods: [
            {
              name: 'View bookmarked statuses',
              httpMethod: 'GET',
              endpoint: '/api/v1/bookmarks',
              description: 'Statuses the user has bookmarked.',
              returns: 'Array of Status',
              parameters: [
                {
                  name: 'max_id',
                  description:
                    'Internal parameter. Use HTTP Link header for pagination.',
                  in: 'query',
                  type: 'string',
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/bookmarks']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses).toBeDefined();

      // Check other 2xx responses also have the Link header
      const response206 = operation?.responses['206'];
      if (response206) {
        expect(response206.headers).toBeDefined();
        expect(response206.headers?.['Link']).toBeDefined();
      }
    });

    it('should NOT include Link header in error responses', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'bookmarks',
          description: 'Bookmark methods',
          methods: [
            {
              name: 'View bookmarked statuses',
              httpMethod: 'GET',
              endpoint: '/api/v1/bookmarks',
              description: 'Statuses the user has bookmarked.',
              returns: 'Array of Status',
              parameters: [
                {
                  name: 'max_id',
                  description:
                    'Internal parameter. Use HTTP Link header for pagination.',
                  in: 'query',
                  type: 'string',
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/bookmarks']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses).toBeDefined();

      // Error responses should not have Link headers
      const response401 = operation?.responses['401'];
      expect(response401).toBeDefined();
      if (response401) {
        expect(response401.headers).toBeUndefined();
      }

      const response404 = operation?.responses['404'];
      expect(response404).toBeDefined();
      if (response404) {
        expect(response404.headers).toBeUndefined();
      }
    });
  });
});
