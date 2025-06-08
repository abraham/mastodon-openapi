import { ParameterParser } from '../../parsers/ParameterParser';

describe('ParameterParser source[privacy] parameter', () => {
  it('should parse source[privacy] parameter with correct enum values in update_credentials', () => {
    const mockSection = `
## Update account credentials {#update_credentials}

\`\`\`http
PATCH /api/v1/accounts/update_credentials HTTP/1.1
\`\`\`

Update the user's display and preferences.

##### Form data parameters

display_name
: String. The display name to use for the profile.

source[privacy]
: String. Default post privacy for authored statuses. Can be \`public\`, \`unlisted\`, or \`private\`.

source[sensitive]
: Boolean. Whether to mark authored statuses as sensitive by default.
`;

    const parameters = ParameterParser.parseParametersByType(
      mockSection,
      'Form data parameters',
      'formData'
    );

    // Find the source object parameter
    const sourceParam = parameters.find((p: any) => p.name === 'source');
    expect(sourceParam).toBeDefined();
    expect(sourceParam!.schema!.type).toBe('object');
    expect(sourceParam!.schema!.properties).toBeDefined();

    // Check that privacy property has the correct enum values
    const privacyProperty = sourceParam!.schema!.properties!.privacy;
    expect(privacyProperty).toBeDefined();
    expect(privacyProperty.type).toBe('string');
    expect(privacyProperty.enum).toEqual(['public', 'unlisted', 'private']);
  });
});
