import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator Rate Limit Headers', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('rate limit headers', () => {
    it('should include rate limit headers in 200 responses', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
            {
              name: 'Test method',
              httpMethod: 'GET',
              endpoint: '/api/v1/accounts/test',
              description: 'Test method.',
              returns: 'Account',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/accounts/test']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses).toBeDefined();

      // Should include 200 response with headers
      const response200 = operation?.responses['200'];
      expect(response200).toBeDefined();
      if (response200) {
        expect(response200.headers).toBeDefined();

        // Should include rate limit headers
        expect(response200.headers?.['X-RateLimit-Limit']).toBeDefined();
        expect(response200.headers?.['X-RateLimit-Limit'].description).toContain('Number of requests permitted');
        expect(response200.headers?.['X-RateLimit-Limit'].schema.type).toBe('integer');

        expect(response200.headers?.['X-RateLimit-Remaining']).toBeDefined();
        expect(response200.headers?.['X-RateLimit-Remaining'].description).toContain('Number of requests you can still make');
        expect(response200.headers?.['X-RateLimit-Remaining'].schema.type).toBe('integer');

        expect(response200.headers?.['X-RateLimit-Reset']).toBeDefined();
        expect(response200.headers?.['X-RateLimit-Reset'].description).toContain('Timestamp when your rate limit will reset');
        expect(response200.headers?.['X-RateLimit-Reset'].schema.type).toBe('integer');
        expect(response200.headers?.['X-RateLimit-Reset'].schema.format).toBe('int64');
      }
    });

    it('should include rate limit headers in streaming 200 responses', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'streaming',
          description: 'Streaming methods',
          methods: [
            {
              name: 'Streaming timeline',
              httpMethod: 'GET',
              endpoint: '/api/v1/streaming/public',
              description: 'Stream public timeline.',
              isStreaming: true,
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/streaming/public']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses).toBeDefined();

      // Should include 200 response with headers for streaming endpoints
      const response200 = operation?.responses['200'];
      expect(response200).toBeDefined();
      if (response200) {
        expect(response200.headers).toBeDefined();

        // Should include rate limit headers
        expect(response200.headers?.['X-RateLimit-Limit']).toBeDefined();
        expect(response200.headers?.['X-RateLimit-Remaining']).toBeDefined();
        expect(response200.headers?.['X-RateLimit-Reset']).toBeDefined();
      }
    });

    it('should not include rate limit headers in error responses', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
            {
              name: 'Test method',
              httpMethod: 'GET',
              endpoint: '/api/v1/accounts/test',
              description: 'Test method.',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/accounts/test']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses).toBeDefined();

      // Error responses should not have rate limit headers
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

      const response429 = operation?.responses['429'];
      expect(response429).toBeDefined();
      if (response429) {
        expect(response429.headers).toBeUndefined();
      }
    });
  });
});