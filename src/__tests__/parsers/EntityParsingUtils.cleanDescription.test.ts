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
});
