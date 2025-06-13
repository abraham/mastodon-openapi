import { EntityParsingUtils } from '../../parsers/EntityParsingUtils';

describe('EntityParsingUtils.cleanDescription - Type Stripping', () => {
  test('should remove type prefixes from descriptions', () => {
    // Test various type prefixes that should be stripped
    const testCases = [
      {
        input:
          'String. A keyword to be added to the newly-created filter group.',
        expected: 'A keyword to be added to the newly-created filter group.',
      },
      {
        input: 'Boolean. Whether the keyword should consider word boundaries.',
        expected: 'Whether the keyword should consider word boundaries.',
      },
      {
        input: 'Integer. The maximum number of items to return.',
        expected: 'The maximum number of items to return.',
      },
      {
        input: 'Number. The score of the item.',
        expected: 'The score of the item.',
      },
      {
        input: 'Array. List of available options.',
        expected: 'List of available options.',
      },
      {
        input: 'Object. Configuration settings.',
        expected: 'Configuration settings.',
      },
      {
        input: 'Hash. Collection of key-value pairs.',
        expected: 'Collection of key-value pairs.',
      },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = EntityParsingUtils.cleanDescription(input);
      expect(result).toBe(expected);
    });
  });

  test('should handle case insensitive type prefixes', () => {
    const testCases = [
      {
        input: 'string. A keyword to be added.',
        expected: 'A keyword to be added.',
      },
      {
        input: 'boolean. Whether the option is enabled.',
        expected: 'Whether the option is enabled.',
      },
      {
        input: 'INTEGER. The count value.',
        expected: 'The count value.',
      },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = EntityParsingUtils.cleanDescription(input);
      expect(result).toBe(expected);
    });
  });

  test('should not strip type words that are not prefixes', () => {
    const testCases = [
      {
        input: 'This is a string that contains the word string.',
        expected: 'This is a string that contains the word string.',
      },
      {
        input: 'Boolean logic is complex.',
        expected: 'Boolean logic is complex.',
      },
      {
        input: 'The string. has a period after it.',
        expected: 'The string. has a period after it.',
      },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = EntityParsingUtils.cleanDescription(input);
      expect(result).toBe(expected);
    });
  });

  test('should preserve existing markdown and backslash cleaning', () => {
    const testCases = [
      {
        input: 'String. **Bold text** in description\\',
        expected: 'Bold text in description',
      },
      {
        input: 'Boolean. Some **important** info\\',
        expected: 'Some important info',
      },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = EntityParsingUtils.cleanDescription(input);
      expect(result).toBe(expected);
    });
  });

  test('should handle empty or invalid inputs gracefully', () => {
    expect(EntityParsingUtils.cleanDescription('')).toBe('');
    expect(EntityParsingUtils.cleanDescription('String.')).toBe('');
    expect(EntityParsingUtils.cleanDescription('Boolean.')).toBe('');
    expect(EntityParsingUtils.cleanDescription('String. ')).toBe('');
  });

  test('should handle descriptions without type prefixes', () => {
    const testCases = [
      {
        input: 'A simple description without type prefix.',
        expected: 'A simple description without type prefix.',
      },
      {
        input: 'Another description here.',
        expected: 'Another description here.',
      },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = EntityParsingUtils.cleanDescription(input);
      expect(result).toBe(expected);
    });
  });

  test('should remove complex type prefixes from descriptions', () => {
    // Test complex type prefixes like "Array of String." that should be stripped
    const testCases = [
      {
        input:
          'Array of String. Include Attachment IDs to be attached as media.',
        expected: 'Include Attachment IDs to be attached as media.',
      },
      {
        input: 'Array of Integer. List of numeric values.',
        expected: 'List of numeric values.',
      },
      {
        input: 'Array of Boolean. List of boolean flags.',
        expected: 'List of boolean flags.',
      },
      {
        input: 'Array of Number. Collection of numeric data.',
        expected: 'Collection of numeric data.',
      },
      {
        input: 'Array of Object. Collection of configuration objects.',
        expected: 'Collection of configuration objects.',
      },
      {
        input: 'Array of Hash. Collection of hash objects.',
        expected: 'Collection of hash objects.',
      },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = EntityParsingUtils.cleanDescription(input);
      expect(result).toBe(expected);
    });
  });

  test('should handle case insensitive complex type prefixes', () => {
    const testCases = [
      {
        input: 'array of string. Include attachment IDs.',
        expected: 'Include attachment IDs.',
      },
      {
        input: 'ARRAY OF INTEGER. List of numbers.',
        expected: 'List of numbers.',
      },
      {
        input: 'Array Of Boolean. Collection of flags.',
        expected: 'Collection of flags.',
      },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = EntityParsingUtils.cleanDescription(input);
      expect(result).toBe(expected);
    });
  });

  test('should not strip complex type words that are not prefixes', () => {
    const testCases = [
      {
        input: 'This description mentions Array of String but not as a prefix.',
        expected:
          'This description mentions Array of String but not as a prefix.',
      },
      {
        input: 'The Array of Integer data structure is useful.',
        expected: 'The Array of Integer data structure is useful.',
      },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = EntityParsingUtils.cleanDescription(input);
      expect(result).toBe(expected);
    });
  });
});
