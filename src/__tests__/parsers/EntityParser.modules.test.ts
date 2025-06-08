import { EntityParser } from '../../parsers/EntityParser';
import { EntityFileParser } from '../../parsers/EntityFileParser';
import { MethodEntityParser } from '../../parsers/MethodEntityParser';
import { AttributeParser } from '../../parsers/AttributeParser';
import { EntityParsingUtils } from '../../parsers/EntityParsingUtils';

describe('EntityParser Modules', () => {
  test('should be able to import all refactored modules', () => {
    expect(EntityParser).toBeDefined();
    expect(EntityFileParser).toBeDefined();
    expect(MethodEntityParser).toBeDefined();
    expect(AttributeParser).toBeDefined();
    expect(EntityParsingUtils).toBeDefined();
  });

  test('EntityParser should still work as before', () => {
    const parser = new EntityParser();
    expect(parser).toBeDefined();
    expect(typeof parser.parseAllEntities).toBe('function');
  });

  test('utility functions should work', () => {
    const cleanedType = EntityParsingUtils.cleanType('**String** {{<test>}} \\');
    expect(cleanedType).toBe('String');

    const cleanedDesc = EntityParsingUtils.cleanDescription('**Bold text** \\');
    expect(cleanedDesc).toBe('Bold text');

    const enumValues = EntityParsingUtils.extractEnumValues('`value1` = description1\n`value2` = description2');
    expect(enumValues).toEqual(['value1', 'value2']);
  });
});