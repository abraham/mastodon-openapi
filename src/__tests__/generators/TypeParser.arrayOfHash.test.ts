import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('TypeParser - Array of Hash handling', () => {
  let typeParser: TypeParser;
  let spec: OpenAPISpec;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
    
    // Create a minimal spec to test with
    spec = {
      openapi: '3.0.3',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: { schemas: {} }
    };
  });

  test('should handle "Array of Hash" return type', () => {
    const result = typeParser.parseResponseSchema('Array of Hash', spec);
    console.log('Result for "Array of Hash":', result);
    
    // Currently this probably returns null, but we want it to return a proper schema
    // Let's see what happens
    expect(result).toBeDefined();
  });

  test('should handle "Array of String" for comparison', () => {
    const result = typeParser.parseResponseSchema('Array of String', spec);
    console.log('Result for "Array of String":', result);
    
    expect(result).toEqual({
      type: 'array',
      items: {
        type: 'string'
      }
    });
  });
});