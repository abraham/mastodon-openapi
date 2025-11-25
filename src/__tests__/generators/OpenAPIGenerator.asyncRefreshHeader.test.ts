import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator - Mastodon-Async-Refresh Header', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should add Mastodon-Async-Refresh header to status context endpoint', () => {
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'statuses',
        description: 'Status methods',
        methods: [
          {
            name: 'Get parent and child statuses in context',
            httpMethod: 'GET',
            endpoint: '/api/v1/statuses/:id/context',
            description:
              'View statuses above and below this status in the thread.',
            returns: 'Context',
          },
        ],
      },
    ];

    const spec = generator.generateSchema([], methodFiles);

    // Find the status context endpoint
    const contextPath = '/api/v1/statuses/{id}/context';
    expect(spec.paths[contextPath]).toBeDefined();

    const getOperation = spec.paths[contextPath]?.get;
    expect(getOperation).toBeDefined();
    expect(getOperation?.operationId).toBe('getStatusContext');

    // Check that 200 response has headers
    const response200 = getOperation?.responses['200'];
    expect(response200).toBeDefined();
    expect(response200?.headers).toBeDefined();

    // Verify rate limit headers are present
    expect(response200?.headers?.['X-RateLimit-Limit']).toBeDefined();
    expect(response200?.headers?.['X-RateLimit-Remaining']).toBeDefined();
    expect(response200?.headers?.['X-RateLimit-Reset']).toBeDefined();

    // Verify Mastodon-Async-Refresh header is present
    expect(response200?.headers?.['Mastodon-Async-Refresh']).toBeDefined();
    expect(response200?.headers?.['Mastodon-Async-Refresh']?.$ref).toBe(
      '#/components/headers/Mastodon-Async-Refresh'
    );
  });

  it('should not add Mastodon-Async-Refresh header to other status endpoints', () => {
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'statuses',
        description: 'Status methods',
        methods: [
          {
            name: 'View specific status',
            httpMethod: 'GET',
            endpoint: '/api/v1/statuses/:id',
            description: 'View information about a status.',
            returns: 'Status',
          },
          {
            name: 'Favourite status',
            httpMethod: 'POST',
            endpoint: '/api/v1/statuses/:id/favourite',
            description: 'Add a status to your favourites list.',
            returns: 'Status',
          },
          {
            name: 'Reblog status',
            httpMethod: 'POST',
            endpoint: '/api/v1/statuses/:id/reblog',
            description: 'Reshare a status.',
            returns: 'Status',
          },
          {
            name: 'Bookmark status',
            httpMethod: 'POST',
            endpoint: '/api/v1/statuses/:id/bookmark',
            description: 'Bookmark a status.',
            returns: 'Status',
          },
        ],
      },
    ];

    const spec = generator.generateSchema([], methodFiles);

    // Check that other status endpoints don't have the header
    const otherEndpoints = [
      '/api/v1/statuses/{id}',
      '/api/v1/statuses/{id}/favourite',
      '/api/v1/statuses/{id}/reblog',
      '/api/v1/statuses/{id}/bookmark',
    ];

    for (const endpoint of otherEndpoints) {
      if (spec.paths[endpoint]) {
        const operations = spec.paths[endpoint];
        for (const operation of Object.values(operations)) {
          if (
            operation &&
            typeof operation === 'object' &&
            'responses' in operation
          ) {
            const op = operation as {
              responses: Record<string, { headers?: Record<string, unknown> }>;
            };
            if (op.responses?.['200']?.headers) {
              expect(
                op.responses['200'].headers['Mastodon-Async-Refresh']
              ).toBeUndefined();
            }
          }
        }
      }
    }
  });

  it('should include correct format description in Mastodon-Async-Refresh header', () => {
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'statuses',
        description: 'Status methods',
        methods: [
          {
            name: 'Get parent and child statuses in context',
            httpMethod: 'GET',
            endpoint: '/api/v1/statuses/:id/context',
            description:
              'View statuses above and below this status in the thread.',
            returns: 'Context',
          },
        ],
      },
    ];

    const spec = generator.generateSchema([], methodFiles);

    const contextPath = '/api/v1/statuses/{id}/context';
    const getOperation = spec.paths[contextPath]?.get;
    const asyncRefreshHeader =
      getOperation?.responses['200']?.headers?.['Mastodon-Async-Refresh'];

    // Should reference the shared component
    expect(asyncRefreshHeader?.$ref).toBe(
      '#/components/headers/Mastodon-Async-Refresh'
    );

    // Check the component definition has the correct format description
    const componentHeader =
      spec.components?.headers?.['Mastodon-Async-Refresh'];
    expect(componentHeader?.description).toContain('id=');
    expect(componentHeader?.description).toContain('retry=');
    expect(componentHeader?.description).toContain('result_count=');
    expect(componentHeader?.description).toContain('<string>');
    expect(componentHeader?.description).toContain('<int>');
  });
});
