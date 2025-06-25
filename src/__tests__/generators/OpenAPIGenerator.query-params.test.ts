import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator Query Parameter Handling', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('operationId generation for paths with query parameters', () => {
    it('should strip query parameters from operationId', () => {
      const testMethods: ApiMethodsFile[] = [
        {
          name: 'timelines',
          description: 'Timeline methods',
          methods: [
            {
              name: 'View link timeline',
              httpMethod: 'GET',
              endpoint: '/api/v1/timelines/link?url={url}',
              description:
                'View public statuses containing a link to the specified currently-trending article.',
            },
            {
              name: 'Search with query params',
              httpMethod: 'GET',
              endpoint: '/api/v1/search?q={query}&type={type}',
              description: 'Search for content with multiple query parameters',
            },
            {
              name: 'Filter with complex query',
              httpMethod: 'GET',
              endpoint:
                '/api/v1/filters?context={context}&limit={limit}&min_id={min_id}',
              description: 'Filter content with multiple query parameters',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], testMethods);

      // Test the specific case mentioned in the comment
      expect(spec.paths['/api/v1/timelines/link']?.get?.operationId).toBe(
        'getTimelineLink'
      );

      // Test other query parameter cases
      expect(spec.paths['/api/v1/search']?.get?.operationId).toBe('getSearch');

      expect(spec.paths['/api/v1/filters']?.get?.operationId).toBe(
        'getFilters'
      );
    });

    it('should handle query parameters with mixed separators', () => {
      const testMethods: ApiMethodsFile[] = [
        {
          name: 'mixed',
          description: 'Mixed query parameter methods',
          methods: [
            {
              name: 'Complex endpoint with dots and query params',
              httpMethod: 'GET',
              endpoint:
                '/.well-known/oauth-authorization-server?format={format}',
              description: 'OAuth server metadata with query parameters',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], testMethods);

      // Should strip query params and handle non-alphanumeric characters
      expect(
        spec.paths['/.well-known/oauth-authorization-server']?.get?.operationId
      ).toBe('getWellKnownOauthAuthorizationServer');
    });
  });
});
