import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';

describe('TypeParser - verified_at format detection', () => {
  let typeParser: TypeParser;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
  });

  test('should apply date-time format to verified_at field with URL mentions', () => {
    // This is the actual type string for verified_at from Account entity
    const result = typeParser.parseType(
      '{{<nullable>}} String ([Datetime](/api/datetime-format#datetime)) if `value` is a verified URL. Otherwise, null.'
    );

    expect(result.type).toBe('string');
    expect(result.format).toBe('date-time');
  });

  test('should apply date-time format to simplified verified_at type', () => {
    const result = typeParser.parseType(
      'String ([Datetime](/api/datetime-format#datetime))'
    );

    expect(result.type).toBe('string');
    expect(result.format).toBe('date-time');
  });

  test('should still apply URI format for actual URL fields', () => {
    const result = typeParser.parseType('String (URL)');

    expect(result.type).toBe('string');
    expect(result.format).toBe('uri');
  });

  test('should not apply URI format when URL is mentioned in context but datetime is specified', () => {
    const result = typeParser.parseType(
      'String ([Datetime]) for URL verification'
    );

    expect(result.type).toBe('string');
    expect(result.format).toBe('date-time');
  });
});
