import { ParameterParser } from '../../parsers/ParameterParser';

describe('ParameterParser dotted bracket properties', () => {
  it('should parse alerts[admin.sign_up] without splitting on dots', () => {
    const mockSection = `
## Update push subscription {#update}

\`\`\`http
PUT /api/v1/push/subscription HTTP/1.1
\`\`\`

Updates the current push subscription.

##### Form data parameters

endpoint
: String. Where push alerts will be sent to.

alerts[admin.sign_up]
: Boolean. Receive new user registration alerts?

alerts[admin.report]
: Boolean. Receive new report alerts?

alerts[mention]
: Boolean. Receive mention alerts?
`;

    const parameters = ParameterParser.parseParametersByType(
      mockSection,
      'Form data parameters',
      'formData'
    );

    expect(parameters).toHaveLength(2);

    // Check endpoint parameter (simple string)
    const endpointParam = parameters.find((p: any) => p.name === 'endpoint');
    expect(endpointParam).toBeDefined();
    expect(endpointParam!.schema).toBeUndefined();

    // Check alerts parameter (object)
    const alertsParam = parameters.find((p: any) => p.name === 'alerts');
    expect(alertsParam).toBeDefined();
    expect(alertsParam!.schema).toBeDefined();
    expect(alertsParam!.schema!.type).toBe('object');
    expect(alertsParam!.schema!.properties).toBeDefined();

    // Check alerts properties - they should keep their dotted names intact
    const properties = alertsParam!.schema!.properties!;
    expect(properties['admin.sign_up']).toEqual({
      type: 'boolean',
      description: 'Boolean. Receive new user registration alerts?',
    });
    expect(properties['admin.report']).toEqual({
      type: 'boolean',
      description: 'Boolean. Receive new report alerts?',
    });
    expect(properties.mention).toEqual({
      type: 'boolean',
      description: 'Boolean. Receive mention alerts?',
    });
  });

  it('should handle mixed dotted and non-dotted bracket properties', () => {
    const mockSection = `
## Test endpoint

##### Form data parameters

alerts[admin.sign_up]
: Boolean. Admin signup alerts.

alerts[mention]
: Boolean. Mention alerts.

alerts[follow.request]
: Boolean. Follow request alerts.

poll[expires_in]
: Integer. Poll expiration time.

poll[options][]
: Array of String. Poll options.
`;

    const parameters = ParameterParser.parseParametersByType(
      mockSection,
      'Form data parameters',
      'formData'
    );

    expect(parameters).toHaveLength(2);

    // Check alerts parameter
    const alertsParam = parameters.find((p: any) => p.name === 'alerts');
    expect(alertsParam).toBeDefined();
    expect(alertsParam!.schema!.properties).toBeDefined();

    const alertsProperties = alertsParam!.schema!.properties!;
    expect(alertsProperties['admin.sign_up']).toBeDefined();
    expect(alertsProperties.mention).toBeDefined();
    expect(alertsProperties['follow.request']).toBeDefined();

    // Check poll parameter
    const pollParam = parameters.find((p: any) => p.name === 'poll');
    expect(pollParam).toBeDefined();
    expect(pollParam!.schema!.properties).toBeDefined();

    const pollProperties = pollParam!.schema!.properties!;
    expect(pollProperties.expires_in).toBeDefined();
    expect(pollProperties.options).toBeDefined();
    expect(pollProperties.options.type).toBe('array');
  });
});
