import { ParameterParser } from '../../parsers/ParameterParser';

describe('ParameterParser nested object parameters', () => {
  it('should parse subscription[keys][auth] as nested objects', () => {
    const mockSection = `
## Subscribe to push notifications {#create}

\`\`\`http
POST /api/v1/push/subscription HTTP/1.1
\`\`\`

Add a Web Push API subscription to receive notifications.

##### Form data parameters

subscription[endpoint]
: String. The endpoint URL that is called when a notification event occurs.

subscription[keys][p256dh]
: String. User agent public key. Base64 encoded string of a public key from a ECDH keypair using the prime256v1 curve.

subscription[keys][auth]
: String. Auth secret. Base64 encoded string of 16 bytes of random data.

data[alerts][mention]
: Boolean. Receive mention notifications? Defaults to false.

data[alerts][status]
: Boolean. Receive new subscribed account notifications? Defaults to false.

data[policy]
: String. Specify whether to receive push notifications from all, followed, follower, or none users.
`;

    const parameters = ParameterParser.parseParametersByType(
      mockSection,
      'Form data parameters',
      'formData'
    );

    expect(parameters).toHaveLength(2);

    // Check subscription parameter (nested object)
    const subscriptionParam = parameters.find(
      (p: any) => p.name === 'subscription'
    );
    expect(subscriptionParam).toBeDefined();
    expect(subscriptionParam!.schema).toBeDefined();
    expect(subscriptionParam!.schema!.type).toBe('object');
    expect(subscriptionParam!.schema!.properties).toBeDefined();

    const subscriptionProperties = subscriptionParam!.schema!.properties!;

    // Should have endpoint property
    expect(subscriptionProperties.endpoint).toEqual({
      type: 'string',
      description:
        'The endpoint URL that is called when a notification event occurs.',
    });

    // Should have nested keys object
    expect(subscriptionProperties.keys).toBeDefined();
    expect(subscriptionProperties.keys.type).toBe('object');
    expect(subscriptionProperties.keys.properties).toBeDefined();

    const keysProperties = subscriptionProperties.keys.properties!;
    expect(keysProperties.p256dh).toEqual({
      type: 'string',
      description:
        'User agent public key. Base64 encoded string of a public key from a ECDH keypair using the prime256v1 curve.',
    });
    expect(keysProperties.auth).toEqual({
      type: 'string',
      description:
        'Auth secret. Base64 encoded string of 16 bytes of random data.',
    });

    // Check data parameter (nested object)
    const dataParam = parameters.find((p: any) => p.name === 'data');
    expect(dataParam).toBeDefined();
    expect(dataParam!.schema).toBeDefined();
    expect(dataParam!.schema!.type).toBe('object');
    expect(dataParam!.schema!.properties).toBeDefined();

    const dataProperties = dataParam!.schema!.properties!;

    // Should have policy property
    expect(dataProperties.policy).toEqual({
      type: 'string',
      description:
        'Specify whether to receive push notifications from all, followed, follower, or none users.',
    });

    // Should have nested alerts object
    expect(dataProperties.alerts).toBeDefined();
    expect(dataProperties.alerts.type).toBe('object');
    expect(dataProperties.alerts.properties).toBeDefined();

    const alertsProperties = dataProperties.alerts.properties!;
    expect(alertsProperties.mention).toEqual({
      type: 'boolean',
      description: 'Receive mention notifications? Defaults to false.',
    });
    expect(alertsProperties.status).toEqual({
      type: 'boolean',
      description:
        'Receive new subscribed account notifications? Defaults to false.',
    });
  });

  it('should handle mixed simple and nested object parameters', () => {
    const mockSection = `
## Test endpoint

##### Form data parameters

simple_param
: String. A simple parameter.

object[simple_prop]
: String. A simple object property.

object[nested][deep]
: Boolean. A deeply nested property.

object[nested][other]
: Integer. Another deeply nested property.
`;

    const parameters = ParameterParser.parseParametersByType(
      mockSection,
      'Form data parameters',
      'formData'
    );

    expect(parameters).toHaveLength(2);

    // Check simple parameter
    const simpleParam = parameters.find((p: any) => p.name === 'simple_param');
    expect(simpleParam).toBeDefined();
    expect(simpleParam!.schema).toBeDefined();
    expect(simpleParam!.schema!.type).toBe('string');

    // Check object parameter with nested structure
    const objectParam = parameters.find((p: any) => p.name === 'object');
    expect(objectParam).toBeDefined();
    expect(objectParam!.schema).toBeDefined();
    expect(objectParam!.schema!.type).toBe('object');
    expect(objectParam!.schema!.properties).toBeDefined();

    const objectProperties = objectParam!.schema!.properties!;

    // Should have simple_prop property
    expect(objectProperties.simple_prop).toEqual({
      type: 'string',
      description: 'A simple object property.',
    });

    // Should have nested object
    expect(objectProperties.nested).toBeDefined();
    expect(objectProperties.nested.type).toBe('object');
    expect(objectProperties.nested.properties).toBeDefined();

    const nestedProperties = objectProperties.nested.properties!;
    expect(nestedProperties.deep).toEqual({
      type: 'boolean',
      description: 'A deeply nested property.',
    });
    expect(nestedProperties.other).toEqual({
      type: 'integer',
      description: 'Another deeply nested property.',
    });
  });
});
