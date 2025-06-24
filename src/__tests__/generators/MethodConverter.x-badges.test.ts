import { MethodConverter } from '../../generators/MethodConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { ErrorExampleRegistry } from '../../generators/ErrorExampleRegistry';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';
import { SpecBuilder } from '../../generators/SpecBuilder';
import { ApiMethod } from '../../interfaces/ApiMethod';

describe('MethodConverter - x-badges extension', () => {
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

  describe('deprecated methods', () => {
    it('should add deprecated x-badge for deprecated methods', () => {
      const deprecatedMethod: ApiMethod = {
        name: 'Deprecated method',
        httpMethod: 'GET',
        endpoint: '/api/v1/test/deprecated',
        description: 'A deprecated method',
        deprecated: true,
      };

      methodConverter.convertMethod(deprecatedMethod, 'test', spec);

      const operation = spec.paths['/api/v1/test/deprecated']?.get;
      expect(operation).toBeDefined();
      expect(operation?.deprecated).toBe(true);
      expect(operation?.['x-badges']).toBeDefined();
      expect(operation?.['x-badges']).toHaveLength(1);
      expect(operation?.['x-badges']?.[0]).toEqual({
        name: 'Deprecated',
        color: 'yellow',
      });
    });

    it('should not add x-badges for non-deprecated methods', () => {
      const normalMethod: ApiMethod = {
        name: 'Normal method',
        httpMethod: 'GET',
        endpoint: '/api/v1/test/normal',
        description: 'A normal method',
      };

      methodConverter.convertMethod(normalMethod, 'test', spec);

      const operation = spec.paths['/api/v1/test/normal']?.get;
      expect(operation).toBeDefined();
      expect(operation?.deprecated).toBeUndefined();
      expect(operation?.['x-badges']).toBeUndefined();
    });
  });

  describe('integration with different HTTP methods', () => {
    it('should add x-badges for POST methods', () => {
      const method: ApiMethod = {
        name: 'Deprecated POST method',
        httpMethod: 'POST',
        endpoint: '/api/v1/test/deprecated-post',
        description: 'A deprecated POST method',
        deprecated: true,
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/test/deprecated-post']?.post;
      expect(operation).toBeDefined();
      expect(operation?.['x-badges']).toBeDefined();
      expect(operation?.['x-badges']?.[0]).toEqual({
        name: 'Deprecated',
        color: 'yellow',
      });
    });

    it('should add x-badges for DELETE methods', () => {
      const method: ApiMethod = {
        name: 'Deprecated DELETE method',
        httpMethod: 'DELETE',
        endpoint: '/api/v1/test/deprecated-delete',
        description: 'A deprecated DELETE method',
        deprecated: true,
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/test/deprecated-delete']?.delete;
      expect(operation).toBeDefined();
      expect(operation?.['x-badges']).toBeDefined();
      expect(operation?.['x-badges']?.[0]).toEqual({
        name: 'Deprecated',
        color: 'yellow',
      });
    });
  });
});
