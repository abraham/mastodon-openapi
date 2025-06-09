import { ParameterParser } from '../../parsers/ParameterParser';

describe('ParameterParser - Poll Parsing Issues', () => {
  describe('StatusEdit entity poll parsing', () => {
    it('should handle dotted property names correctly', () => {
      // This simulates how entity attributes like poll.options[] and poll.options[].title
      // should be parsed when they appear as parameter-like structures
      const mockSection = `
##### Form data parameters

poll.options[]
: Array of Hash. The poll options at this revision.

poll.options[].title
: String. The text for a poll option.
`;

      const parameters = ParameterParser.parseParametersByType(
        mockSection,
        'Form data parameters',
        'formData'
      );

      // Should successfully parse dotted properties without errors
      expect(parameters.length).toBe(2);

      // First parameter: poll object with options array property
      const pollParam = parameters.find((p: any) => p.name === 'poll');
      expect(pollParam).toBeDefined();
      expect(pollParam!.schema).toBeDefined();
      expect(pollParam!.schema!.type).toBe('object');
      expect(pollParam!.schema!.properties).toBeDefined();
      expect(pollParam!.schema!.properties!.options).toEqual({
        type: 'array',
        description: 'Array of Hash. The poll options at this revision.',
        items: { type: 'object' },
      });

      // Second parameter: poll.options[] object with title property
      const pollOptionsParam = parameters.find(
        (p: any) => p.name === 'poll.options[]'
      );
      expect(pollOptionsParam).toBeDefined();
      expect(pollOptionsParam!.schema).toBeDefined();
      expect(pollOptionsParam!.schema!.type).toBe('object');
      expect(pollOptionsParam!.schema!.properties).toBeDefined();
      expect(pollOptionsParam!.schema!.properties!.title).toEqual({
        type: 'string',
        description: 'String. The text for a poll option.',
      });
    });
  });

  describe('ScheduledStatus entity poll parsing', () => {
    it('should handle nested bracket structures correctly', () => {
      const mockSection = `
##### Form data parameters

params[poll][options[]]
: Array of String. The poll options to be used.

params[poll][expires_in]
: String. How many seconds the poll should last.
`;

      const parameters = ParameterParser.parseParametersByType(
        mockSection,
        'Form data parameters',
        'formData'
      );

      // Should correctly parse nested bracket structures
      expect(parameters.length).toBe(1);

      // Should create a params[poll] object with options and expires_in properties
      const paramsParam = parameters.find(
        (p: any) => p.name === 'params[poll]'
      );
      expect(paramsParam).toBeDefined();
      expect(paramsParam!.schema).toBeDefined();
      expect(paramsParam!.schema!.type).toBe('object');
      expect(paramsParam!.schema!.properties).toBeDefined();

      // Should have options as an array property (normalized from options[])
      expect(paramsParam!.schema!.properties!.options).toEqual({
        type: 'array',
        description: 'Array of String. The poll options to be used.',
        items: { type: 'string' },
      });

      // Should have expires_in as a string property
      expect(paramsParam!.schema!.properties!.expires_in).toEqual({
        type: 'string',
        description: 'String. How many seconds the poll should last.',
      });
    });
  });

  describe('Expected correct behavior', () => {
    it('should create proper nested structure for complex poll parameters', () => {
      const mockSection = `
##### Form data parameters

poll[options][]
: Array of String. Possible answers to the poll.

poll[expires_in]
: Integer. Duration that the poll should be open, in seconds.
`;

      const parameters = ParameterParser.parseParametersByType(
        mockSection,
        'Form data parameters',
        'formData'
      );

      expect(parameters).toHaveLength(1);

      const pollParam = parameters.find((p: any) => p.name === 'poll');
      expect(pollParam).toBeDefined();
      expect(pollParam!.schema).toBeDefined();
      expect(pollParam!.schema!.type).toBe('object');
      expect(pollParam!.schema!.properties).toBeDefined();
      expect(pollParam!.schema!.properties!.options).toBeDefined();
      expect(pollParam!.schema!.properties!.expires_in).toBeDefined();
    });
  });
});
