/**
 * Test for alerts[admin.sign_up] parsing issue
 */

import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { EntityClass } from '../../interfaces/EntityClass';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('EntityConverter - Alerts Brackets Parsing', () => {
  let converter: EntityConverter;
  let spec: OpenAPISpec;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    converter = new EntityConverter(typeParser, utilityHelpers);

    spec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };
  });

  it('should correctly parse alerts[admin.sign_up] without splitting the dot', () => {
    const entity: EntityClass = {
      name: 'WebPushSubscription',
      description: 'Test entity',
      attributes: [
        {
          name: 'alerts[admin.sign_up]',
          type: 'Boolean',
          description:
            'Receive a push notification when a new user has signed up?',
          optional: false,
        },
        {
          name: 'alerts[admin.report]',
          type: 'Boolean',
          description:
            'Receive a push notification when a new report has been filed?',
          optional: false,
        },
      ],
    };

    converter.convertEntities([entity], spec);

    const schema = spec.components?.schemas?.['WebPushSubscription'];
    expect(schema).toBeDefined();
    expect(schema?.properties).toBeDefined();

    // Should have alerts property with correct nested structure
    const alertsProperty = schema?.properties?.['alerts'];
    expect(alertsProperty).toBeDefined();
    expect(alertsProperty?.type).toBe('object');
    expect(alertsProperty?.properties).toBeDefined();

    // Should have admin.sign_up property (not split)
    expect(alertsProperty?.properties?.['admin.sign_up']).toBeDefined();
    expect(alertsProperty?.properties?.['admin.report']).toBeDefined();

    // Should NOT have malformed properties
    expect(alertsProperty?.properties?.['admin']).toBeUndefined();
    expect(alertsProperty?.properties?.['sign_up]']).toBeUndefined();
    expect(alertsProperty?.properties?.['report]']).toBeUndefined();

    // Verify the properties have correct type
    expect(alertsProperty?.properties?.['admin.sign_up']?.type).toBe('boolean');
    expect(alertsProperty?.properties?.['admin.report']?.type).toBe('boolean');
  });

  it('should handle mixed alerts patterns correctly', () => {
    const entity: EntityClass = {
      name: 'WebPushSubscription',
      description: 'Test entity',
      attributes: [
        {
          name: 'alerts[mention]',
          type: 'Boolean',
          description: 'Receive push notifications for mentions',
          optional: false,
        },
        {
          name: 'alerts[admin.sign_up]',
          type: 'Boolean',
          description:
            'Receive a push notification when a new user has signed up?',
          optional: false,
        },
        {
          name: 'alerts[follow]',
          type: 'Boolean',
          description: 'Receive push notifications for follows',
          optional: false,
        },
      ],
    };

    converter.convertEntities([entity], spec);

    const schema = spec.components?.schemas?.['WebPushSubscription'];
    const alertsProperty = schema?.properties?.['alerts'];

    // Should have all properties correctly
    expect(alertsProperty?.properties?.['mention']).toBeDefined();
    expect(alertsProperty?.properties?.['admin.sign_up']).toBeDefined();
    expect(alertsProperty?.properties?.['follow']).toBeDefined();

    // Should NOT have malformed properties
    expect(alertsProperty?.properties?.['admin']).toBeUndefined();
    expect(alertsProperty?.properties?.['sign_up]']).toBeUndefined();
  });
});
