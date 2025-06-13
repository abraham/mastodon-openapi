import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';

describe('TypeParser - URI format detection', () => {
  let typeParser: TypeParser;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
  });

  test('should apply URI format to single string with URL indicator', () => {
    const result = typeParser.parseType('String (URL)');

    expect(result).toEqual({
      type: 'string',
      format: 'uri',
    });
  });

  test('should apply URI format to array items when type indicates URLs', () => {
    const result = typeParser.parseType('Array of String (URLs)');

    expect(result).toEqual({
      type: 'array',
      items: {
        type: 'string',
        format: 'uri',
      },
    });
  });

  test('should apply URI format to array items with complex URL description', () => {
    const result = typeParser.parseType('Array of String (URLs or "urn:ietf:wg:oauth:2.0:oob" as values)');

    expect(result).toEqual({
      type: 'array',
      items: {
        type: 'string',
        format: 'uri',
      },
    });
  });

  test('should not apply URI format to regular array of strings', () => {
    const result = typeParser.parseType('Array of String');

    expect(result).toEqual({
      type: 'array',
      items: {
        type: 'string',
      },
    });
  });

  test('should apply URI format to array items with URL in different case', () => {
    const result = typeParser.parseType('Array of String (url)');

    expect(result).toEqual({
      type: 'array',
      items: {
        type: 'string',
        format: 'uri',
      },
    });
  });
});