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

  describe('unreleased methods', () => {
    it('should add unreleased x-badge for unreleased methods', () => {
      const unreleasedMethod: ApiMethod = {
        name: 'Unreleased method',
        httpMethod: 'GET',
        endpoint: '/api/v1/test/unreleased',
        description: 'An unreleased method',
        unreleased: true,
      };

      methodConverter.convertMethod(unreleasedMethod, 'test', spec);

      const operation = spec.paths['/api/v1/test/unreleased']?.get;
      expect(operation).toBeDefined();
      expect(operation?.['x-badges']).toBeDefined();
      expect(operation?.['x-badges']).toHaveLength(1);
      expect(operation?.['x-badges']?.[0]).toEqual({
        name: 'Unreleased',
        color: 'gray',
      });
    });

    it('should not add x-badges for normal methods without unreleased flag', () => {
      const normalMethod: ApiMethod = {
        name: 'Normal method',
        httpMethod: 'GET',
        endpoint: '/api/v1/test/normal',
        description: 'A normal method',
      };

      methodConverter.convertMethod(normalMethod, 'test', spec);

      const operation = spec.paths['/api/v1/test/normal']?.get;
      expect(operation).toBeDefined();
      expect(operation?.['x-badges']).toBeUndefined();
    });
  });

  describe('methods with both deprecated and unreleased flags', () => {
    it('should add both badges when method is both deprecated and unreleased', () => {
      const method: ApiMethod = {
        name: 'Deprecated and unreleased method',
        httpMethod: 'GET',
        endpoint: '/api/v1/test/both',
        description: 'A method that is both deprecated and unreleased',
        deprecated: true,
        unreleased: true,
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/test/both']?.get;
      expect(operation).toBeDefined();
      expect(operation?.deprecated).toBe(true);
      expect(operation?.['x-badges']).toBeDefined();
      expect(operation?.['x-badges']).toHaveLength(2);

      // Check that both badges are present
      const badges = operation?.['x-badges'];
      expect(badges).toContainEqual({
        name: 'Deprecated',
        color: 'yellow',
      });
      expect(badges).toContainEqual({
        name: 'Unreleased',
        color: 'gray',
      });
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
        name: 'Unreleased DELETE method',
        httpMethod: 'DELETE',
        endpoint: '/api/v1/test/unreleased-delete',
        description: 'An unreleased DELETE method',
        unreleased: true,
      };

      methodConverter.convertMethod(method, 'test', spec);

      const operation = spec.paths['/api/v1/test/unreleased-delete']?.delete;
      expect(operation).toBeDefined();
      expect(operation?.['x-badges']).toBeDefined();
      expect(operation?.['x-badges']?.[0]).toEqual({
        name: 'Unreleased',
        color: 'gray',
      });
    });
  });
});
