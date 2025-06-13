import { ErrorExampleRegistry } from '../../generators/ErrorExampleRegistry';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('ErrorExampleRegistry', () => {
  let registry: ErrorExampleRegistry;

  beforeEach(() => {
    registry = new ErrorExampleRegistry();
  });

  describe('collectErrorExamples', () => {
    it('should collect error examples from method files', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
            {
              name: 'Register an account',
              httpMethod: 'POST',
              endpoint: '/api/v1/accounts',
              description: 'Creates a user and account records',
              responseExamples: {
                '200': { access_token: 'token123' },
                '401': { error: 'The access token is invalid' },
                '422': { error: 'Validation failed', details: {} },
                '429': { error: 'Too many requests' },
              },
            },
          ],
        },
        {
          name: 'statuses',
          description: 'Status methods',
          methods: [
            {
              name: 'Post a status',
              httpMethod: 'POST',
              endpoint: '/api/v1/statuses',
              description: 'Publish a status',
              responseExamples: {
                '200': { id: '12345', content: 'Hello world' },
                '401': { error: 'Unauthorized access' }, // Different 401 message
                '403': { error: 'Forbidden action' },
              },
            },
          ],
        },
      ];

      registry.collectErrorExamples(methodFiles);

      // Should collect error examples (4xx, 5xx) but not success examples (2xx)
      expect(registry.getErrorExample('200')).toBeNull();
      expect(registry.getErrorExample('401')).toEqual({
        error: 'The access token is invalid',
      });
      expect(registry.getErrorExample('422')).toEqual({
        error: 'Validation failed',
        details: {},
      });
      expect(registry.getErrorExample('429')).toEqual({
        error: 'Too many requests',
      });
      expect(registry.getErrorExample('403')).toEqual({
        error: 'Forbidden action',
      });
    });

    it('should prioritize first example found for each status code', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
            {
              name: 'Register an account',
              httpMethod: 'POST',
              endpoint: '/api/v1/accounts',
              description: 'Creates a user and account records',
              responseExamples: {
                '401': { error: 'The access token is invalid' },
              },
            },
          ],
        },
        {
          name: 'statuses',
          description: 'Status methods',
          methods: [
            {
              name: 'Post a status',
              httpMethod: 'POST',
              endpoint: '/api/v1/statuses',
              description: 'Publish a status',
              responseExamples: {
                '401': { error: 'Different 401 message' }, // Should be ignored
              },
            },
          ],
        },
      ];

      registry.collectErrorExamples(methodFiles);

      // Should use the first example found
      expect(registry.getErrorExample('401')).toEqual({
        error: 'The access token is invalid',
      });
    });

    it('should handle methods without responseExamples', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
            {
              name: 'Get account',
              httpMethod: 'GET',
              endpoint: '/api/v1/accounts/:id',
              description: 'View information about a profile.',
              // No responseExamples
            },
            {
              name: 'Register an account',
              httpMethod: 'POST',
              endpoint: '/api/v1/accounts',
              description: 'Creates a user and account records',
              responseExamples: {
                '429': { error: 'Too many requests' },
              },
            },
          ],
        },
      ];

      registry.collectErrorExamples(methodFiles);

      expect(registry.getErrorExample('429')).toEqual({
        error: 'Too many requests',
      });
      expect(registry.getErrorExample('404')).toBeNull();
    });

    it('should only collect error status codes (4xx, 5xx)', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'test',
          description: 'Test methods',
          methods: [
            {
              name: 'Test method',
              httpMethod: 'GET',
              endpoint: '/api/v1/test',
              description: 'Test method',
              responseExamples: {
                '200': { success: true },
                '201': { created: true },
                '301': { redirect: 'somewhere' },
                '400': { error: 'Bad request' },
                '401': { error: 'Unauthorized' },
                '500': { error: 'Internal server error' },
              },
            },
          ],
        },
      ];

      registry.collectErrorExamples(methodFiles);

      // Should not collect 2xx or 3xx responses
      expect(registry.getErrorExample('200')).toBeNull();
      expect(registry.getErrorExample('201')).toBeNull();
      expect(registry.getErrorExample('301')).toBeNull();

      // Should collect 4xx and 5xx responses
      expect(registry.getErrorExample('400')).toEqual({ error: 'Bad request' });
      expect(registry.getErrorExample('401')).toEqual({
        error: 'Unauthorized',
      });
      expect(registry.getErrorExample('500')).toEqual({
        error: 'Internal server error',
      });
    });
  });

  describe('getAllErrorExamples', () => {
    it('should return all collected error examples', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'test',
          description: 'Test methods',
          methods: [
            {
              name: 'Test method',
              httpMethod: 'GET',
              endpoint: '/api/v1/test',
              description: 'Test method',
              responseExamples: {
                '401': { error: 'Unauthorized' },
                '429': { error: 'Rate limited' },
              },
            },
          ],
        },
      ];

      registry.collectErrorExamples(methodFiles);

      const allExamples = registry.getAllErrorExamples();
      expect(allExamples).toEqual({
        '401': { error: 'Unauthorized' },
        '429': { error: 'Rate limited' },
      });
    });

    it('should return empty object when no examples collected', () => {
      const allExamples = registry.getAllErrorExamples();
      expect(allExamples).toEqual({});
    });
  });

  describe('clear', () => {
    it('should clear all collected examples', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'test',
          description: 'Test methods',
          methods: [
            {
              name: 'Test method',
              httpMethod: 'GET',
              endpoint: '/api/v1/test',
              description: 'Test method',
              responseExamples: {
                '401': { error: 'Unauthorized' },
              },
            },
          ],
        },
      ];

      registry.collectErrorExamples(methodFiles);
      expect(registry.getErrorExample('401')).not.toBeNull();

      registry.clear();
      expect(registry.getErrorExample('401')).toBeNull();
      expect(registry.getAllErrorExamples()).toEqual({});
    });
  });
});
