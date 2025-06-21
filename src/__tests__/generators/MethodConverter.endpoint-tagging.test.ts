import { MethodConverter } from '../../generators/MethodConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { ErrorExampleRegistry } from '../../generators/ErrorExampleRegistry';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';
import { SpecBuilder } from '../../generators/SpecBuilder';

describe('MethodConverter - Endpoint-based Tagging', () => {
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

  describe('extractTagFromEndpoint', () => {
    it('should extract correct tags from various endpoint patterns', () => {
      const testCases = [
        {
          endpoint: '/api/v1/accounts',
          expected: 'accounts',
          description: 'basic endpoint',
        },
        {
          endpoint: '/api/v1/accounts/:id',
          expected: 'accounts',
          description: 'endpoint with parameter',
        },
        {
          endpoint: '/api/v1/accounts/:id/statuses',
          expected: 'accounts',
          description: 'nested endpoint with parameter',
        },
        {
          endpoint: '/api/v1/statuses/:id',
          expected: 'statuses',
          description: 'different resource',
        },
        {
          endpoint: '/api/v2/search',
          expected: 'search',
          description: 'v2 API endpoint',
        },
        {
          endpoint: '/api/v1/featured_tags/suggestions',
          expected: 'featured_tags',
          description: 'underscore in segment',
        },
        {
          endpoint: '/api/v1/accounts/familiar_followers',
          expected: 'accounts',
          description: 'accounts subfolder',
        },
        {
          endpoint: '/api/v1/timelines/public',
          expected: 'timelines',
          description: 'timelines endpoint',
        },
      ];

      testCases.forEach(({ endpoint, expected, description }) => {
        const method = {
          name: `Test ${description}`,
          httpMethod: 'GET',
          endpoint,
          description: `Test for ${description}`,
        };

        methodConverter.convertMethod(method, 'ignored-category', spec);

        const normalizedPath = endpoint.replace(/:([^/]+)/g, '{$1}');
        const operation = spec.paths[normalizedPath]?.get;

        expect(operation).toBeDefined();
        expect(operation?.tags).toEqual([expected]);
      });
    });

    it('should handle edge cases correctly', () => {
      const testCases = [
        {
          endpoint: '/api/v1',
          expected: 'unknown',
          description: 'no segment after version',
        },
        {
          endpoint: '/api',
          expected: 'unknown',
          description: 'no version or segment',
        },
        {
          endpoint: '/other/path',
          expected: 'other',
          description: 'non-API path',
        },
      ];

      testCases.forEach(({ endpoint, expected, description }) => {
        const method = {
          name: `Test ${description}`,
          httpMethod: 'GET',
          endpoint,
          description: `Test for ${description}`,
        };

        methodConverter.convertMethod(method, 'ignored-category', spec);

        const operation = spec.paths[endpoint]?.get;

        expect(operation).toBeDefined();
        expect(operation?.tags).toEqual([expected]);
      });
    });
  });

  describe('real-world endpoint examples', () => {
    it('should correctly tag the examples mentioned in the issue', () => {
      const testCases = [
        {
          method: {
            name: 'Create account',
            httpMethod: 'POST',
            endpoint: '/api/v1/accounts',
            description: 'Create account',
          },
          expectedTag: 'accounts',
        },
        {
          method: {
            name: 'Get account statuses',
            httpMethod: 'GET',
            endpoint: '/api/v1/accounts/:id/statuses',
            description: 'Get account statuses',
          },
          expectedTag: 'accounts',
        },
      ];

      testCases.forEach(({ method, expectedTag }) => {
        methodConverter.convertMethod(method, 'old-filename-tag', spec);

        const normalizedPath = method.endpoint.replace(/:([^/]+)/g, '{$1}');
        const httpMethod = method.httpMethod.toLowerCase() as 'get' | 'post';
        const operation = spec.paths[normalizedPath]?.[httpMethod];

        expect(operation).toBeDefined();
        expect(operation?.tags).toEqual([expectedTag]);
      });
    });
  });
});
