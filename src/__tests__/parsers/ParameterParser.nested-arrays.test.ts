import { ParameterParser } from '../../parsers/ParameterParser';

describe('ParameterParser nested array parameters', () => {
  it('should parse keywords_attributes[][property] pattern correctly', () => {
    const mockSection = `
## Update filter {#update}

\`\`\`http
PUT /api/v2/filters/:id HTTP/1.1
\`\`\`

Updates the filter with the given ID.

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
    const keywordsParam = parameters.find(
      (p: any) => p.name === 'keywords_attributes'
    );
    expect(keywordsParam).toBeDefined();
    expect(keywordsParam!.schema).toBeDefined();
    expect(keywordsParam!.schema!.type).toBe('array');
    expect(keywordsParam!.schema!.items).toBeDefined();
    expect(keywordsParam!.schema!.items!.type).toBe('object');
    expect(keywordsParam!.schema!.items!.properties).toBeDefined();

    // Check properties of the array items
    const itemProperties = keywordsParam!.schema!.items!.properties!;
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
  });

  it('should handle mixed nested array and regular parameters', () => {
    const mockSection = `
## Test endpoint

##### Form data parameters

title
: String. The filter title.

keywords_attributes[][keyword]
: String. Keyword text.

keywords_attributes[][whole_word]
: Boolean. Whole word matching.

context[]
: Array of String. Filter contexts.

filter_action
: String. Action to take.
`;

    const parameters = ParameterParser.parseParametersByType(
      mockSection,
      'Form data parameters',
      'formData'
    );

    expect(parameters).toHaveLength(4);

    // Check title parameter
    const titleParam = parameters.find((p: any) => p.name === 'title');
    expect(titleParam).toBeDefined();

    // Check keywords_attributes parameter (array of objects)
    const keywordsParam = parameters.find(
      (p: any) => p.name === 'keywords_attributes'
    );
    expect(keywordsParam).toBeDefined();
    expect(keywordsParam!.schema!.type).toBe('array');
    expect(keywordsParam!.schema!.items!.type).toBe('object');

    // Check context parameter (simple array)
    const contextParam = parameters.find((p: any) => p.name === 'context');
    expect(contextParam).toBeDefined();
    expect(contextParam!.schema!.type).toBe('array');
    expect(contextParam!.schema!.items!.type).toBe('string');

    // Check filter_action parameter (simple string)
    const actionParam = parameters.find((p: any) => p.name === 'filter_action');
    expect(actionParam).toBeDefined();
    expect(actionParam!.schema).toBeUndefined();
  });
});
