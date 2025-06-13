import { ParameterParser } from '../../parsers/ParameterParser';

describe('ParameterParser - Limit Parameter Type', () => {
  describe('integer parameter schema', () => {
    it('should assign integer schema type for limit parameters', () => {
      const mockSection = `
## Test endpoint

##### Query parameters

limit
: Integer. Maximum number of results to return. Defaults to 20 statuses. Max 40 statuses.

boolean_param
: Boolean. Some boolean parameter.

string_param
: String. Some string parameter.
`;

      const parameters = ParameterParser.parseParametersByType(
        mockSection,
        'Query parameters',
        'query'
      );

      expect(parameters).toHaveLength(3);

      // Check limit parameter has integer schema
      const limitParam = parameters.find((p) => p.name === 'limit');
      expect(limitParam).toBeDefined();
      expect(limitParam?.description).toContain('Maximum number');
      expect(limitParam?.schema).toBeDefined();
      expect(limitParam?.schema?.type).toBe('integer');

      // Check boolean parameter has boolean schema
      const booleanParam = parameters.find((p) => p.name === 'boolean_param');
      expect(booleanParam).toBeDefined();
      expect(booleanParam?.description).toContain('Some boolean');
      expect(booleanParam?.schema).toBeDefined();
      expect(booleanParam?.schema?.type).toBe('boolean');

      // Check string parameter has string schema
      const stringParam = parameters.find((p) => p.name === 'string_param');
      expect(stringParam).toBeDefined();
      expect(stringParam?.description).toContain('Some string');
      expect(stringParam?.schema).toBeDefined();
      expect(stringParam?.schema?.type).toBe('string');
    });

    it('should handle multiple limit-like integer parameters', () => {
      const mockSection = `
## Test endpoint

##### Query parameters

limit
: Integer. Maximum number of results to return. Defaults to 20 statuses. Max 40 statuses.

max_id
: Integer. Return results older than this ID.

min_id  
: Integer. Return results newer than this ID.
`;

      const parameters = ParameterParser.parseParametersByType(
        mockSection,
        'Query parameters',
        'query'
      );

      expect(parameters).toHaveLength(3);

      // Check all integer parameters have proper schema
      for (const param of parameters) {
        expect(param.description).toBeTruthy(); // Just ensure description exists
        expect(param.schema).toBeDefined();
        expect(param.schema?.type).toBe('integer');
      }
    });
  });
});
