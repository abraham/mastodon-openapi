import { ParameterParser } from '../../parsers/ParameterParser';
import { TypeInference } from '../../parsers/TypeInference';

describe('Complex Parameter Parsing', () => {
  describe('Complex parameter parsing', () => {
    it('should parse array parameters correctly', () => {
      const mockSection = `
## Post a new status {#create}

\`\`\`http
POST /api/v1/statuses HTTP/1.1
\`\`\`

Publish a status with the given parameters.

##### Form data parameters

status
: String. The text content of the status.

media_ids[]
: Array of String. Include Attachment IDs to be attached as media.

media_attributes[]
: Array of String. Each array includes id, description, and focus.
`;

      const parameters = ParameterParser.parseParametersByType(
        mockSection,
        'Form data parameters',
        'formData'
      );

      expect(parameters).toHaveLength(3);

      // Check status parameter (simple string)
      const statusParam = parameters.find((p: any) => p.name === 'status');
      expect(statusParam).toBeDefined();
      expect(statusParam!.schema).toBeDefined();
      expect(statusParam!.schema!.type).toBe('string');

      // Check media_ids parameter (array)
      const mediaIdsParam = parameters.find((p: any) => p.name === 'media_ids');
      expect(mediaIdsParam).toBeDefined();
      expect(mediaIdsParam!.schema).toBeDefined();
      expect(mediaIdsParam!.schema!.type).toBe('array');
      expect(mediaIdsParam!.schema!.items).toEqual({ type: 'string' });

      // Check media_attributes parameter (array)
      const mediaAttributesParam = parameters.find(
        (p: any) => p.name === 'media_attributes'
      );
      expect(mediaAttributesParam).toBeDefined();
      expect(mediaAttributesParam!.schema).toBeDefined();
      expect(mediaAttributesParam!.schema!.type).toBe('array');
      expect(mediaAttributesParam!.schema!.items).toEqual({ type: 'string' });
    });

    it('should parse object parameters correctly', () => {
      const mockSection = `
## Post a new status {#create}

\`\`\`http
POST /api/v1/statuses HTTP/1.1
\`\`\`

Publish a status with the given parameters.

##### Form data parameters

status
: String. The text content of the status.

poll[options][]
: Array of String. Possible answers to the poll.

poll[expires_in]
: Integer. Duration that the poll should be open, in seconds.

poll[multiple]
: Boolean. Allow multiple choices? Defaults to false.

poll[hide_totals]
: Boolean. Hide vote counts until the poll ends? Defaults to false.
`;

      const parameters = ParameterParser.parseParametersByType(
        mockSection,
        'Form data parameters',
        'formData'
      );

      expect(parameters).toHaveLength(2);

      // Check status parameter (simple string)
      const statusParam = parameters.find((p: any) => p.name === 'status');
      expect(statusParam).toBeDefined();
      expect(statusParam!.schema).toBeDefined();
      expect(statusParam!.schema!.type).toBe('string');

      // Check poll parameter (object)
      const pollParam = parameters.find((p: any) => p.name === 'poll');
      expect(pollParam).toBeDefined();
      expect(pollParam!.schema).toBeDefined();
      expect(pollParam!.schema!.type).toBe('object');
      expect(pollParam!.schema!.properties).toBeDefined();

      // Check poll properties
      const properties = pollParam!.schema!.properties!;
      expect(properties.options).toEqual({
        type: 'array',
        description: 'Array of String. Possible answers to the poll.',
        items: { type: 'string' },
      });
      expect(properties.expires_in).toEqual({
        type: 'integer',
        description:
          'Integer. Duration that the poll should be open, in seconds.',
      });
      expect(properties.multiple).toEqual({
        type: 'boolean',
        description: 'Boolean. Allow multiple choices? Defaults to false.',
      });
      expect(properties.hide_totals).toEqual({
        type: 'boolean',
        description:
          'Boolean. Hide vote counts until the poll ends? Defaults to false.',
      });
    });

    it('should parse mixed simple and complex parameters correctly', () => {
      const mockSection = `
## Post a new status {#create}

\`\`\`http
POST /api/v1/statuses HTTP/1.1
\`\`\`

Publish a status with the given parameters.

##### Form data parameters

status
: String. The text content of the status.

media_ids[]
: Array of String. Include Attachment IDs to be attached as media.

poll[options][]
: Array of String. Possible answers to the poll.

poll[expires_in]
: Integer. Duration that the poll should be open, in seconds.

visibility
: String. Sets the visibility of the posted status to \`public\`, \`unlisted\`, \`private\`, \`direct\`.
`;

      const parameters = ParameterParser.parseParametersByType(
        mockSection,
        'Form data parameters',
        'formData'
      );

      expect(parameters).toHaveLength(4);

      // Simple parameters
      expect(parameters.find((p: any) => p.name === 'status')).toBeDefined();
      expect(
        parameters.find((p: any) => p.name === 'visibility')
      ).toBeDefined();

      // Array parameter
      const mediaIdsParam = parameters.find((p: any) => p.name === 'media_ids');
      expect(mediaIdsParam).toBeDefined();
      expect(mediaIdsParam!.schema!.type).toBe('array');

      // Object parameter
      const pollParam = parameters.find((p: any) => p.name === 'poll');
      expect(pollParam).toBeDefined();
      expect(pollParam!.schema!.type).toBe('object');
      expect(pollParam!.schema!.properties!.options).toBeDefined();
      expect(pollParam!.schema!.properties!.expires_in).toBeDefined();
    });
  });

  describe('Type inference', () => {
    it('should infer correct types from descriptions', () => {
      expect(
        TypeInference.inferTypeFromDescription(
          'Boolean. Allow multiple choices?'
        )
      ).toBe('boolean');
      expect(
        TypeInference.inferTypeFromDescription('Integer. Duration in seconds.')
      ).toBe('integer');
      expect(
        TypeInference.inferTypeFromDescription('Number. The count value.')
      ).toBe('integer');
      expect(
        TypeInference.inferTypeFromDescription('Array of String. List of IDs.')
      ).toBe('string');
      expect(TypeInference.inferTypeFromDescription('Array of values.')).toBe(
        'string'
      );
      expect(
        TypeInference.inferTypeFromDescription('String. The text content.')
      ).toBe('string');
      expect(
        TypeInference.inferTypeFromDescription('Some description without type.')
      ).toBe('string');
      expect(
        TypeInference.inferTypeFromDescription('Hash. User profile data.')
      ).toBe('object');
    });
  });
});
