import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';
import { EntityClass } from '../../interfaces/EntityClass';

describe('OpenAPIGenerator - Web Push callback', () => {
  const pushMethodFiles: ApiMethodsFile[] = [
    {
      name: 'push',
      description: 'Web Push subscription methods',
      methods: [
        {
          name: 'Subscribe to push notifications',
          httpMethod: 'POST',
          endpoint: '/api/v1/push/subscription',
          description: 'Add a Web Push API subscription',
          returns: '[WebPushSubscription]',
        },
        {
          name: 'Change types of notifications',
          httpMethod: 'PUT',
          endpoint: '/api/v1/push/subscription',
          description: 'Updates the current push subscription',
          returns: '[WebPushSubscription]',
        },
      ],
    },
  ];

  const notificationEntity: EntityClass = {
    name: 'Notification',
    description: 'A notification.',
    attributes: [
      {
        name: 'type',
        type: 'String (Enumerable oneOf)',
        description: 'Notification type.',
        enumValues: ['mention', 'follow', 'favourite'],
      },
    ],
  };

  it('attaches the onNotification callback with Web Push headers and payload schema to POST /api/v1/push/subscription', () => {
    const generator = new OpenAPIGenerator();
    const spec = generator.generateSchema(
      [notificationEntity],
      pushMethodFiles
    );

    const postOp = spec.paths['/api/v1/push/subscription']?.post;
    const putOp = spec.paths['/api/v1/push/subscription']?.put;

    expect(putOp?.callbacks).toBeUndefined();

    const callbackOp =
      postOp?.callbacks?.onNotification?.[
        '{$request.body#/subscription/endpoint}'
      ]?.post;
    expect(callbackOp).toBeDefined();
    expect(
      callbackOp?.requestBody?.content?.['application/json']?.schema
    ).toEqual({
      $ref: '#/components/schemas/WebPushNotification',
    });

    const headerNames = callbackOp?.parameters
      ?.filter((p) => p.in === 'header')
      .map((p) => ({ name: p.name, required: p.required }));
    expect(headerNames).toEqual([
      { name: 'Content-Encoding', required: true },
      { name: 'Ttl', required: true },
      { name: 'Unsubscribe-URL', required: true },
      { name: 'Urgency', required: true },
      { name: 'Crypto-Key', required: false },
      { name: 'Encryption', required: false },
    ]);

    expect(callbackOp?.responses?.['201']).toBeDefined();
    expect(callbackOp?.responses?.['410']).toBeDefined();

    const payloadSchema = spec.components?.schemas?.WebPushNotification;
    expect(payloadSchema).toEqual({
      type: 'object',
      description: expect.stringContaining('Web::NotificationSerializer'),
      properties: {
        access_token: expect.objectContaining({ type: 'string' }),
        body: expect.objectContaining({ type: 'string' }),
        icon: expect.objectContaining({ type: 'string', format: 'uri' }),
        notification_id: expect.objectContaining({ type: 'integer' }),
        notification_type: {
          $ref: '#/components/schemas/NotificationTypeEnum',
          description: 'The type of event that resulted in the notification.',
        },
        preferred_locale: expect.objectContaining({ type: 'string' }),
        title: expect.objectContaining({ type: 'string' }),
      },
      required: [
        'access_token',
        'body',
        'icon',
        'notification_id',
        'notification_type',
        'preferred_locale',
        'title',
      ],
    });
  });

  it('falls back to a string notification_type when Notification entity is absent', () => {
    const generator = new OpenAPIGenerator();
    const spec = generator.generateSchema([], pushMethodFiles);

    expect(
      spec.components?.schemas?.WebPushNotification?.properties
        ?.notification_type
    ).toEqual({
      type: 'string',
      description: 'The type of event that resulted in the notification.',
    });
  });
});
