import { MethodConverter } from '../../generators/MethodConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { ErrorExampleRegistry } from '../../generators/ErrorExampleRegistry';
import { ApiMethod } from '../../interfaces/ApiMethod';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

// Mock the config.json to return mastodon version 4.3.0
jest.mock('fs', () => ({
  readFileSync: jest.fn((filePath: string) => {
    if (filePath === 'config.json') {
      return JSON.stringify({
        mastodonDocsCommit: 'mock-commit',
        mastodonVersion: '4.3.0',
      });
    }
    return '';
  }),
}));

describe('MethodConverter Version History in Description', () => {
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

    spec = {
      openapi: '3.1.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {},
      },
    };
  });

  describe('Methods with version history', () => {
    test('should include version history in operation description', () => {
      const method: ApiMethod = {
        name: 'Post a new status',
        httpMethod: 'POST',
        endpoint: '/api/v1/statuses',
        description: 'Publish a status with the given parameters.',
        version:
          '0.0.0 - added\\n2.7.0 - `scheduled_at` added\\n2.8.0 - `poll` added',
        versions: ['0.0.0', '2.7.0', '2.8.0'],
      };

      methodConverter.convertMethod(method, 'statuses', spec);

      const operation = spec.paths['/api/v1/statuses']?.post;
      expect(operation).toBeDefined();
      expect(operation?.description).toContain(
        'Publish a status with the given parameters.'
      );
      expect(operation?.description).toContain('Version history:');
      expect(operation?.description).toContain('0.0.0 - added');
      expect(operation?.description).toContain('2.7.0 - `scheduled_at` added');
      expect(operation?.description).toContain('2.8.0 - `poll` added');
    });

    test('should include version history with complex changes', () => {
      const method: ApiMethod = {
        name: 'Delete a status',
        httpMethod: 'DELETE',
        endpoint: '/api/v1/statuses/:id',
        description: 'Delete one of your own statuses.',
        version:
          '0.0.0 - added\\n2.9.0 - return source properties, for use with delete and redraft\\n4.4.0 - added `delete_media` optional parameter',
        versions: ['0.0.0', '2.9.0', '4.4.0'],
      };

      methodConverter.convertMethod(method, 'statuses', spec);

      const operation = spec.paths['/api/v1/statuses/{id}']?.delete;
      expect(operation).toBeDefined();
      expect(operation?.description).toContain(
        'Delete one of your own statuses.'
      );
      expect(operation?.description).toContain('Version history:');
      expect(operation?.description).toContain('0.0.0 - added');
      expect(operation?.description).toContain(
        '2.9.0 - return source properties, for use with delete and redraft'
      );
      expect(operation?.description).toContain(
        '4.4.0 - added `delete_media` optional parameter'
      );
    });

    test('should handle single version entry', () => {
      const method: ApiMethod = {
        name: 'Simple method',
        httpMethod: 'GET',
        endpoint: '/api/v1/simple',
        description: 'A simple endpoint.',
        version: '2.0.0 - added',
        versions: ['2.0.0'],
      };

      methodConverter.convertMethod(method, 'simple', spec);

      const operation = spec.paths['/api/v1/simple']?.get;
      expect(operation).toBeDefined();
      expect(operation?.description).toContain('A simple endpoint.');
      expect(operation?.description).toContain('Version history:');
      expect(operation?.description).toContain('2.0.0 - added');
    });

    test('should work with empty basic description', () => {
      const method: ApiMethod = {
        name: 'No description method',
        httpMethod: 'GET',
        endpoint: '/api/v1/no-desc',
        description: '',
        version: '1.0.0 - added\\n2.0.0 - updated',
        versions: ['1.0.0', '2.0.0'],
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/no-desc']?.get;
      expect(operation).toBeDefined();
      expect(operation?.description).toContain('Version history:');
      expect(operation?.description).toContain('1.0.0 - added');
      expect(operation?.description).toContain('2.0.0 - updated');
    });
  });

  describe('Methods without version history', () => {
    test('should not include version history when none exists', () => {
      const method: ApiMethod = {
        name: 'No versions method',
        httpMethod: 'GET',
        endpoint: '/api/v1/no-versions',
        description: 'Endpoint without versions.',
        // No version property
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/no-versions']?.get;
      expect(operation).toBeDefined();
      expect(operation?.description).toBe('Endpoint without versions.');
      expect(operation?.description).not.toContain('Version history:');
    });

    test('should not include version history when empty', () => {
      const method: ApiMethod = {
        name: 'Empty versions method',
        httpMethod: 'GET',
        endpoint: '/api/v1/empty-versions',
        description: 'Endpoint with empty versions.',
        version: '', // Empty string
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/empty-versions']?.get;
      expect(operation).toBeDefined();
      expect(operation?.description).toBe('Endpoint with empty versions.');
      expect(operation?.description).not.toContain('Version history:');
    });
  });
});
