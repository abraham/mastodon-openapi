import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';

describe('TypeParser - ISO 639 format detection', () => {
  let typeParser: TypeParser;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
  });

  test('should apply iso-639-1 format to single string with ISO 639-1 indicator', () => {
    const result = typeParser.parseType('String (ISO 639-1 language two-letter code)');

    expect(result).toEqual({
      type: 'string',
      format: 'iso-639-1',
    });
  });

  test('should apply iso-639-1 format to single string with ISO 639 Part 1 indicator', () => {
    const result = typeParser.parseType('String (ISO 639 Part 1 two-letter language code)');

    expect(result).toEqual({
      type: 'string',
      format: 'iso-639-1',
    });
  });

  test('should apply iso-639-1 format to array items when type indicates ISO 639-1', () => {
    const result = typeParser.parseType('Array of String (ISO 639-1 language two-letter code)');

    expect(result).toEqual({
      type: 'array',
      items: {
        type: 'string',
        format: 'iso-639-1',
      },
    });
  });

  test('should apply iso-639-1 format to array items with ISO 639 Part 1 indicator', () => {
    const result = typeParser.parseType('Array of String (ISO 639 Part 1 two-letter language code)');

    expect(result).toEqual({
      type: 'array',
      items: {
        type: 'string',
        format: 'iso-639-1',
      },
    });
  });

  test('should apply iso-639-1 format with case-insensitive detection', () => {
    const result = typeParser.parseType('String (iso 639-1 language code)');

    expect(result).toEqual({
      type: 'string',
      format: 'iso-639-1',
    });
  });

  test('should apply iso-639-1 format with variations in spacing', () => {
    const result = typeParser.parseType('String (ISO639-1 language code)');

    expect(result).toEqual({
      type: 'string',
      format: 'iso-639-1',
    });
  });

  test('should not apply iso-639-1 format to regular strings', () => {
    const result = typeParser.parseType('String');

    expect(result).toEqual({
      type: 'string',
    });
  });

  test('should not apply iso-639-1 format to non-ISO 639 strings', () => {
    const result = typeParser.parseType('String (language code)');

    expect(result).toEqual({
      type: 'string',
    });
  });

  test('should prioritize datetime format over ISO 639 format', () => {
    const result = typeParser.parseType('String (ISO8601 datetime format)');

    expect(result).toEqual({
      type: 'string',
      format: 'date-time',
    });
  });

  test('should apply iso-639-1 format with "or empty string" variation', () => {
    const result = typeParser.parseType('String (ISO 639-1 language two-letter code) or empty string');

    expect(result).toEqual({
      type: 'string',
      format: 'iso-639-1',
    });
  });

  test('should apply iso-639-1 format to parameters with ISO 639 in description', () => {
    const parameter = {
      name: 'lang',
      description: 'The ISO 639-1 two-letter language code to use while rendering the authorization form.',
      enumValues: [],
    };

    const result = typeParser.convertParameterToSchema(parameter);

    expect(result).toEqual({
      type: 'string',
      format: 'iso-639-1',
      description: 'The ISO 639-1 two-letter language code to use while rendering the authorization form.',
    });
  });

  test('should apply iso-639-1 format to parameters with ISO 639 language code description', () => {
    const parameter = {
      name: 'language',
      description: 'ISO 639 language code for this status.',
      enumValues: [],
    };

    const result = typeParser.convertParameterToSchema(parameter);

    expect(result).toEqual({
      type: 'string',
      format: 'iso-639-1',
      description: 'ISO 639 language code for this status.',
    });
  });
});