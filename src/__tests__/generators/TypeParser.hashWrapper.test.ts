import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('TypeParser - Hash wrapper pattern handling', () => {
  let typeParser: TypeParser;
  let spec: OpenAPISpec;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);

    // Create a minimal spec with some test entities
    spec = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          AsyncRefresh: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
            },
          },
        },
      },
    };
  });

  describe('Hash with a single key of `key_name`', () => {
    it('should handle simple hash wrapper with count', () => {
      const result = typeParser.parseResponseSchema(
        'Hash with a single key of `count`',
        spec
      );

      // Should create a named response component
      expect(result).toEqual({
        $ref: '#/components/schemas/CountResponse',
      });

      // Should add the component to the spec
      expect(spec.components?.schemas?.['CountResponse']).toEqual({
        type: 'object',
        description: 'Response containing a count value',
        properties: {
          count: {
            type: 'integer',
          },
        },
        required: ['count'],
      });
    });

    it('should handle simple hash wrapper with different key name', () => {
      const result = typeParser.parseResponseSchema(
        'Hash with a single key of `merged`',
        spec
      );

      // Should create a named response component
      expect(result).toEqual({
        $ref: '#/components/schemas/MergedResponse',
      });

      // Should add the component to the spec
      expect(spec.components?.schemas?.['MergedResponse']).toEqual({
        type: 'object',
        description: 'Response containing a merged value',
        properties: {
          merged: {
            type: 'integer',
          },
        },
        required: ['merged'],
      });
    });
  });

  describe('Hash with a single key of `key_name` with value of [Entity]', () => {
    it('should handle hash wrapper with entity reference', () => {
      const result = typeParser.parseResponseSchema(
        'Hash with a single key of `async_refresh` with value of [AsyncRefresh]',
        spec
      );

      // Should create a named response component based on entity name
      expect(result).toEqual({
        $ref: '#/components/schemas/AsyncRefreshResponse',
      });

      // Should add the response wrapper component to the spec
      expect(spec.components?.schemas?.['AsyncRefreshResponse']).toEqual({
        type: 'object',
        description: 'Response containing an AsyncRefresh object',
        properties: {
          async_refresh: {
            $ref: '#/components/schemas/AsyncRefresh',
          },
        },
        required: ['async_refresh'],
      });
    });

    it('should handle hash wrapper with different key and entity', () => {
      // Add another entity to the spec
      spec.components!.schemas!['Status'] = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          content: { type: 'string' },
        },
      };

      const result = typeParser.parseResponseSchema(
        'Hash with a single key of `status` with value of [Status]',
        spec
      );

      // Should create a named response component based on entity name
      expect(result).toEqual({
        $ref: '#/components/schemas/StatusResponse',
      });

      // Should add the response wrapper component to the spec
      expect(spec.components?.schemas?.['StatusResponse']).toEqual({
        type: 'object',
        description: 'Response containing an Status object',
        properties: {
          status: {
            $ref: '#/components/schemas/Status',
          },
        },
        required: ['status'],
      });
    });

    it('should return null if entity does not exist in schema', () => {
      const result = typeParser.parseResponseSchema(
        'Hash with a single key of `nonexistent` with value of [NonexistentEntity]',
        spec
      );

      // Should fall through to later patterns or return null
      expect(result).toBeNull();
    });
  });

  describe('Hash with a single [type] attribute `key_name`', () => {
    it('should handle boolean attribute', () => {
      const result = typeParser.parseResponseSchema(
        'Hash with a single boolean attribute `merged`',
        spec
      );

      // Should create a named response component
      expect(result).toEqual({
        $ref: '#/components/schemas/MergedResponse',
      });

      // Should add the component to the spec
      expect(spec.components?.schemas?.['MergedResponse']).toEqual({
        type: 'object',
        description: 'Response containing a merged value',
        properties: {
          merged: {
            type: 'boolean',
          },
        },
        required: ['merged'],
      });
    });

    it('should handle integer attribute', () => {
      const result = typeParser.parseResponseSchema(
        'Hash with a single integer attribute `total`',
        spec
      );

      // Should create a named response component
      expect(result).toEqual({
        $ref: '#/components/schemas/TotalResponse',
      });

      // Should add the component to the spec
      expect(spec.components?.schemas?.['TotalResponse']).toEqual({
        type: 'object',
        description: 'Response containing a total value',
        properties: {
          total: {
            type: 'integer',
          },
        },
        required: ['total'],
      });
    });

    it('should handle string attribute', () => {
      const result = typeParser.parseResponseSchema(
        'Hash with a single string attribute `name`',
        spec
      );

      // Should create a named response component
      expect(result).toEqual({
        $ref: '#/components/schemas/NameResponse',
      });

      // Should add the component to the spec
      expect(spec.components?.schemas?.['NameResponse']).toEqual({
        type: 'object',
        description: 'Response containing a name value',
        properties: {
          name: {
            type: 'string',
          },
        },
        required: ['name'],
      });
    });
  });

  describe('Case insensitivity', () => {
    it('should handle case variations in hash pattern', () => {
      const result = typeParser.parseResponseSchema(
        'hash with a single key of `count`',
        spec
      );

      // Should create a named response component
      expect(result).toEqual({
        $ref: '#/components/schemas/CountResponse',
      });

      // Should add the component to the spec
      expect(spec.components?.schemas?.['CountResponse']).toEqual({
        type: 'object',
        description: 'Response containing a count value',
        properties: {
          count: {
            type: 'integer',
          },
        },
        required: ['count'],
      });
    });

    it('should handle case variations in entity pattern', () => {
      const result = typeParser.parseResponseSchema(
        'HASH WITH A SINGLE KEY OF `async_refresh` WITH VALUE OF [AsyncRefresh]',
        spec
      );

      // Should create a named response component based on entity name
      expect(result).toEqual({
        $ref: '#/components/schemas/AsyncRefreshResponse',
      });

      // Should add the response wrapper component to the spec
      expect(spec.components?.schemas?.['AsyncRefreshResponse']).toEqual({
        type: 'object',
        description: 'Response containing an AsyncRefresh object',
        properties: {
          async_refresh: {
            $ref: '#/components/schemas/AsyncRefresh',
          },
        },
        required: ['async_refresh'],
      });
    });

    it('should handle case variations in attribute pattern', () => {
      const result = typeParser.parseResponseSchema(
        'HASH WITH A SINGLE BOOLEAN ATTRIBUTE `enabled`',
        spec
      );

      // Should create a named response component
      expect(result).toEqual({
        $ref: '#/components/schemas/EnabledResponse',
      });

      // Should add the component to the spec
      expect(spec.components?.schemas?.['EnabledResponse']).toEqual({
        type: 'object',
        description: 'Response containing a enabled value',
        properties: {
          enabled: {
            type: 'boolean',
          },
        },
        required: ['enabled'],
      });
    });
  });
});
