import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { EntityAttribute } from '../../interfaces/EntityAttribute';

describe('EntityConverter - ISO 639 format detection', () => {
  let entityConverter: EntityConverter;
  let typeParser: TypeParser;
  let utilityHelpers: UtilityHelpers;

  beforeEach(() => {
    utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
    entityConverter = new EntityConverter(typeParser, utilityHelpers);
  });

  test('should apply iso-639-1 format when attribute type contains "ISO 639-1"', () => {
    const attribute: EntityAttribute = {
      name: 'language',
      type: 'String (ISO 639-1 language two-letter code)',
      description: 'The default posting language',
      optional: false,
      nullable: false,
      deprecated: false,
      enumValues: [],
      versions: ['2.4.2'],
    };

    const result = entityConverter.convertAttribute(attribute);
    expect(result.type).toBe('string');
    expect(result.format).toBe('iso-639-1');
  });

  test('should apply iso-639-1 format when attribute type contains "ISO 639 Part 1"', () => {
    const attribute: EntityAttribute = {
      name: 'language',
      type: 'String (ISO 639 Part 1 two-letter language code)',
      description: 'The default posting language',
      optional: false,
      nullable: false,
      deprecated: false,
      enumValues: [],
      versions: ['2.4.2'],
    };

    const result = entityConverter.convertAttribute(attribute);
    expect(result.type).toBe('string');
    expect(result.format).toBe('iso-639-1');
  });

  test('should apply iso-639-1 format to array items when type indicates ISO 639-1', () => {
    const attribute: EntityAttribute = {
      name: 'languages',
      type: 'Array of String (ISO 639-1 language two-letter code)',
      description: 'Which languages are you following from this user?',
      optional: false,
      nullable: false,
      deprecated: false,
      enumValues: [],
      versions: ['4.0.0'],
    };

    const result = entityConverter.convertAttribute(attribute);
    expect(result.type).toBe('array');
    expect(result.items).toEqual({
      type: 'string',
      format: 'iso-639-1',
    });
  });

  test('should apply iso-639-1 format with nullable attribute', () => {
    const attribute: EntityAttribute = {
      name: 'language',
      type: 'String (ISO 639-1 language two-letter code)',
      description: 'The default posting language',
      optional: true,
      nullable: true,
      deprecated: false,
      enumValues: [],
      versions: ['2.4.2'],
    };

    const result = entityConverter.convertAttribute(attribute);
    expect(result.type).toEqual(['string', 'null']);
    expect(result.format).toBe('iso-639-1');
  });

  test('should apply iso-639-1 format with enum values', () => {
    const attribute: EntityAttribute = {
      name: 'language',
      type: 'String (ISO 639-1 language two-letter code)',
      description: 'The default posting language',
      optional: false,
      nullable: false,
      deprecated: false,
      enumValues: ['en', 'es', 'fr'],
      versions: ['2.4.2'],
    };

    const result = entityConverter.convertAttribute(attribute);
    expect(result.type).toBe('string');
    expect(result.format).toBe('iso-639-1');
    expect(result.enum).toEqual(['en', 'es', 'fr']);
  });

  test('should apply iso-639-1 format with case-insensitive detection', () => {
    const attribute: EntityAttribute = {
      name: 'language',
      type: 'String (iso 639-1 language code)',
      description: 'The default posting language',
      optional: false,
      nullable: false,
      deprecated: false,
      enumValues: [],
      versions: ['2.4.2'],
    };

    const result = entityConverter.convertAttribute(attribute);
    expect(result.type).toBe('string');
    expect(result.format).toBe('iso-639-1');
  });

  test('should not apply iso-639-1 format to regular string attributes', () => {
    const attribute: EntityAttribute = {
      name: 'content',
      type: 'String',
      description: 'The content of the status',
      optional: false,
      nullable: false,
      deprecated: false,
      enumValues: [],
      versions: ['1.0.0'],
    };

    const result = entityConverter.convertAttribute(attribute);
    expect(result.type).toBe('string');
    expect(result.format).toBeUndefined();
  });

  test('should not apply iso-639-1 format when type does not contain ISO 639', () => {
    const attribute: EntityAttribute = {
      name: 'language',
      type: 'String (language code)',
      description: 'The default posting language',
      optional: false,
      nullable: false,
      deprecated: false,
      enumValues: [],
      versions: ['2.4.2'],
    };

    const result = entityConverter.convertAttribute(attribute);
    expect(result.type).toBe('string');
    expect(result.format).toBeUndefined();
  });

  test('should preserve other formats and not apply iso-639-1 when datetime format is detected', () => {
    const attribute: EntityAttribute = {
      name: 'created_at',
      type: 'String (ISO8601 datetime)',
      description: 'When the account was created',
      optional: false,
      nullable: false,
      deprecated: false,
      enumValues: [],
      versions: ['1.0.0'],
    };

    const result = entityConverter.convertAttribute(attribute);
    expect(result.type).toBe('string');
    expect(result.format).toBe('date-time');
  });

  test('should apply iso-639-1 format with "or empty string" variation', () => {
    const attribute: EntityAttribute = {
      name: 'language',
      type: 'String (ISO 639-1 language two-letter code) or empty string',
      description: 'The default posting language',
      optional: true,
      nullable: true,
      deprecated: false,
      enumValues: [],
      versions: ['2.4.2'],
    };

    const result = entityConverter.convertAttribute(attribute);
    expect(result.type).toEqual(['string', 'null']);
    expect(result.format).toBe('iso-639-1');
  });
});
