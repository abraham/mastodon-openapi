import { ParameterParser } from '../../parsers/ParameterParser';

describe('ParameterParser nested array parameters', () => {
  it('should parse keywords_attributes[][property] as nested array of objects', () => {
    const mockSection = `
## Update a filter

\`\`\`http
PUT /api/v2/filters/:id HTTP/1.1
\`\`\`

Update a filter group with the given parameters.

##### Form data parameters

title
: String. The name of the filter group.

keywords_attributes[][keyword]
: String. A keyword to be added to the newly-created filter group.

keywords_attributes[][whole_word]
: Boolean. Whether the keyword should consider word boundaries.

keywords_attributes[][id]
: String. Provide the ID of an existing keyword to modify it, instead of creating a new keyword.

keywords_attributes[][_destroy]
: Boolean. If true, will remove the keyword with the given ID.
`;

    const parameters = ParameterParser.parseParametersByType(
      mockSection,
      'Form data parameters',
      'formData'
    );

    expect(parameters).toHaveLength(2);

    // Check title parameter (simple string)
    const titleParam = parameters.find((p: any) => p.name === 'title');
    expect(titleParam).toBeDefined();
    expect(titleParam!.schema).toBeUndefined();

    // Check keywords_attributes parameter (array of objects)
    const keywordsAttributesParam = parameters.find(
      (p: any) => p.name === 'keywords_attributes'
    );
    expect(keywordsAttributesParam).toBeDefined();
    expect(keywordsAttributesParam!.schema).toBeDefined();
    expect(keywordsAttributesParam!.schema!.type).toBe('array');
    expect(keywordsAttributesParam!.schema!.items).toBeDefined();
    expect(keywordsAttributesParam!.schema!.items!.type).toBe('object');
    expect(keywordsAttributesParam!.schema!.items!.properties).toBeDefined();

    // Check properties of the object in the array
    const itemProperties = keywordsAttributesParam!.schema!.items!.properties!;
    expect(itemProperties.keyword).toEqual({
      type: 'string',
      description:
        'String. A keyword to be added to the newly-created filter group.',
    });
    expect(itemProperties.whole_word).toEqual({
      type: 'boolean',
      description:
        'Boolean. Whether the keyword should consider word boundaries.',
    });
    expect(itemProperties.id).toEqual({
      type: 'string',
      description:
        'String. Provide the ID of an existing keyword to modify it, instead of creating a new keyword.',
    });
    expect(itemProperties._destroy).toEqual({
      type: 'boolean',
      description:
        'Boolean. If true, will remove the keyword with the given ID.',
    });

    // Ensure flat properties with brackets don't exist
    expect(
      parameters.find((p: any) => p.name === 'keywords_attributes[][keyword]')
    ).toBeUndefined();
    expect(
      parameters.find(
        (p: any) => p.name === 'keywords_attributes[][whole_word]'
      )
    ).toBeUndefined();
    expect(
      parameters.find((p: any) => p.name === 'keywords_attributes[][id]')
    ).toBeUndefined();
    expect(
      parameters.find((p: any) => p.name === 'keywords_attributes[][_destroy]')
    ).toBeUndefined();
  });

  it('should handle mixed simple and nested array parameters', () => {
    const mockSection = `
## Test endpoint

##### Form data parameters

simple_param
: String. A simple parameter.

array_param[]
: String. A simple array parameter.

nested_attrs[][name]
: String. Name in nested object.

nested_attrs[][value]
: Integer. Value in nested object.

other_object[property]
: String. Regular object property.
`;

    const parameters = ParameterParser.parseParametersByType(
      mockSection,
      'Form data parameters',
      'formData'
    );

    expect(parameters).toHaveLength(4);

    // Check simple parameter
    const simpleParam = parameters.find((p: any) => p.name === 'simple_param');
    expect(simpleParam).toBeDefined();
    expect(simpleParam!.schema).toBeUndefined();

    // Check simple array parameter
    const arrayParam = parameters.find((p: any) => p.name === 'array_param');
    expect(arrayParam).toBeDefined();
    expect(arrayParam!.schema!.type).toBe('array');
    expect(arrayParam!.schema!.items!.type).toBe('string');

    // Check nested array of objects
    const nestedAttrsParam = parameters.find(
      (p: any) => p.name === 'nested_attrs'
    );
    expect(nestedAttrsParam).toBeDefined();
    expect(nestedAttrsParam!.schema!.type).toBe('array');
    expect(nestedAttrsParam!.schema!.items!.type).toBe('object');
    expect(nestedAttrsParam!.schema!.items!.properties!.name).toEqual({
      type: 'string',
      description: 'String. Name in nested object.',
    });
    expect(nestedAttrsParam!.schema!.items!.properties!.value).toEqual({
      type: 'integer',
      description: 'Integer. Value in nested object.',
    });

    // Check regular object parameter
    const otherObjectParam = parameters.find(
      (p: any) => p.name === 'other_object'
    );
    expect(otherObjectParam).toBeDefined();
    expect(otherObjectParam!.schema!.type).toBe('object');
    expect(otherObjectParam!.schema!.properties!.property).toEqual({
      type: 'string',
      description: 'String. Regular object property.',
    });
  });
});
