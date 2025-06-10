import { ParameterParser } from '../../parsers/ParameterParser';

describe('ParameterParser end-to-end nested objects', () => {
  it('should parse actual push subscription parameters correctly end-to-end', () => {
    // This test uses the actual parameter structure from the push subscription endpoint
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

subscription[standard]
: Boolean. Follow standardized webpush (RFC8030+RFC8291+RFC8292) ? Else follow legacy webpush (unpublished version, 4th draft of RFC8291 and 1st draft of RFC8292). Defaults to false.

data[alerts][mention]
: Boolean. Receive mention notifications? Defaults to false.

data[alerts][status]
: Boolean. Receive new subscribed account notifications? Defaults to false.

data[alerts][reblog]
: Boolean. Receive reblog notifications? Defaults to false.

data[alerts][follow]
: Boolean. Receive follow notifications? Defaults to false.

data[alerts][follow_request]
: Boolean. Receive follow request notifications? Defaults to false.

data[alerts][favourite]
: Boolean. Receive favourite notifications? Defaults to false.

data[alerts][poll]
: Boolean. Receive poll notifications? Defaults to false.

data[alerts][update]
: Boolean. Receive status edited notifications? Defaults to false.

data[alerts][admin.sign_up]
: Boolean. Receive new user signup notifications? Defaults to false. Must have a role with the appropriate permissions.

data[alerts][admin.report]
: Boolean. Receive new report notifications? Defaults to false. Must have a role with the appropriate permissions.

data[policy]
: String. Specify whether to receive push notifications from all, followed, follower, or none users.
`;

    const parameters = ParameterParser.parseParametersByType(
      mockSection,
      'Form data parameters',
      'formData'
    );

    expect(parameters).toHaveLength(2);

    // Verify subscription parameter structure
    const subscriptionParam = parameters.find(
      (p: any) => p.name === 'subscription'
    );
    expect(subscriptionParam).toBeDefined();
    expect(subscriptionParam!.schema!.type).toBe('object');
    expect(subscriptionParam!.schema!.properties).toBeDefined();

    const subscriptionProps = subscriptionParam!.schema!.properties!;

    // Check simple properties
    expect(subscriptionProps.endpoint.type).toBe('string');
    expect(subscriptionProps.standard.type).toBe('boolean');

    // Check nested keys object
    expect(subscriptionProps.keys.type).toBe('object');
    expect(subscriptionProps.keys.properties).toBeDefined();
    expect(subscriptionProps.keys.properties!.p256dh.type).toBe('string');
    expect(subscriptionProps.keys.properties!.auth.type).toBe('string');

    // Verify data parameter structure
    const dataParam = parameters.find((p: any) => p.name === 'data');
    expect(dataParam).toBeDefined();
    expect(dataParam!.schema!.type).toBe('object');
    expect(dataParam!.schema!.properties).toBeDefined();

    const dataProps = dataParam!.schema!.properties!;

    // Check simple property
    expect(dataProps.policy.type).toBe('string');

    // Check nested alerts object
    expect(dataProps.alerts.type).toBe('object');
    expect(dataProps.alerts.properties).toBeDefined();

    const alertsProps = dataProps.alerts.properties!;
    expect(alertsProps.mention.type).toBe('boolean');
    expect(alertsProps.status.type).toBe('boolean');
    expect(alertsProps.reblog.type).toBe('boolean');
    expect(alertsProps.follow.type).toBe('boolean');
    expect(alertsProps.follow_request.type).toBe('boolean');
    expect(alertsProps.favourite.type).toBe('boolean');
    expect(alertsProps.poll.type).toBe('boolean');
    expect(alertsProps.update.type).toBe('boolean');
    expect(alertsProps['admin.sign_up'].type).toBe('boolean');
    expect(alertsProps['admin.report'].type).toBe('boolean');

    // Verify the structure matches the expected nested object format from the issue
    expect(Object.keys(subscriptionProps)).toEqual(
      expect.arrayContaining(['endpoint', 'keys', 'standard'])
    );
    expect(Object.keys(dataProps)).toEqual(
      expect.arrayContaining(['alerts', 'policy'])
    );
    expect(Object.keys(alertsProps)).toEqual(
      expect.arrayContaining([
        'mention',
        'status',
        'reblog',
        'follow',
        'follow_request',
        'favourite',
        'poll',
        'update',
        'admin.sign_up',
        'admin.report',
      ])
    );
  });
});
