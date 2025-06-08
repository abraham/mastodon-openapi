import { MethodParser } from '../../parsers/MethodParser';

describe('MethodParser Type Inference', () => {
  let parser: MethodParser;

  beforeEach(() => {
    parser = new MethodParser();
  });

  describe('inferTypeFromDescription', () => {
    it('should correctly infer object type for Hash descriptions', () => {
      const descriptions = [
        'Hash. The profile fields to be set.',
        'Hash. Some other hash parameter.',
        'Hash containing multiple values.',
      ];

      descriptions.forEach((description) => {
        const type = (parser as any).inferTypeFromDescription(description);
        expect(type).toBe('object');
      });
    });

    it('should prioritize hash over integer when both are present', () => {
      const description =
        'Hash. The profile fields to be set. Inside this hash, the key is an integer cast to a string...';
      const type = (parser as any).inferTypeFromDescription(description);
      expect(type).toBe('object');
    });

    it('should still correctly infer other types', () => {
      const testCases = [
        { description: 'String. Some string parameter', expected: 'string' },
        { description: 'Boolean. Some boolean parameter', expected: 'boolean' },
        { description: 'Integer. Some integer parameter', expected: 'integer' },
        {
          description: 'Array of String. Some array parameter',
          expected: 'string',
        },
      ];

      testCases.forEach(({ description, expected }) => {
        const type = (parser as any).inferTypeFromDescription(description);
        expect(type).toBe(expected);
      });
    });
  });
});
