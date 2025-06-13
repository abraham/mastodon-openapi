import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';

describe('TypeParser - Date Format Debug', () => {
  let typeParser: TypeParser;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
  });

  it('should parse Date format correctly', () => {
    const result = typeParser.parseType(
      'String ([Date](/api/datetime-format#date))'
    );
    expect(result.type).toBe('string');
    expect(result.format).toBe('date');
  });

  it('should parse DateTime format correctly', () => {
    const result = typeParser.parseType(
      'String ([Datetime](/api/datetime-format#datetime))'
    );
    expect(result.type).toBe('string');
    expect(result.format).toBe('date-time');
  });

  it('should convert parameter to schema correctly', () => {
    const param = {
      name: 'date_of_birth',
      description:
        'String ([Date](/api/datetime-format#date)), required if the server has a minimum age requirement.',
      required: false,
      in: 'formData',
    };

    const result = typeParser.convertParameterToSchema(param);
    expect(result.type).toBe('string');
    expect(result.format).toBe('date');
  });
});
