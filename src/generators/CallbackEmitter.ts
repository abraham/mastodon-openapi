import { ApiMethod } from '../interfaces/ApiMethod';
import {
  OpenAPICallback,
  OpenAPIProperty,
  OpenAPISchema,
  OpenAPISpec,
} from '../interfaces/OpenAPISchema';
import { callbackOverrideFor } from '../overrides/overrides';
import { SchemaSorting } from './SchemaSorting';

const WEB_PUSH_SCHEMA_NAME = 'WebPushNotification';

/**
 * Emits OpenAPI `callbacks` objects and their backing component schemas for
 * operations that trigger asynchronous outbound HTTP requests (e.g. Web Push).
 */
export class CallbackEmitter {
  constructor(private readonly sorting: SchemaSorting = new SchemaSorting()) {}

  public build(
    method: ApiMethod,
    normalizedPath: string,
    spec: OpenAPISpec
  ): Record<string, OpenAPICallback> | undefined {
    const override = callbackOverrideFor(method.httpMethod, normalizedPath);
    if (!override) {
      return undefined;
    }

    if (override === 'web-push-notification') {
      return this.buildWebPushCallback(spec);
    }

    return undefined;
  }

  private buildWebPushCallback(
    spec: OpenAPISpec
  ): Record<string, OpenAPICallback> {
    this.ensureWebPushNotificationSchema(spec);

    return {
      onNotification: {
        '{$request.body#/subscription/endpoint}': {
          post: {
            summary: 'Receive a Web Push notification',
            description:
              'Sent by Mastodon when a subscribed notification occurs. On the wire the request carries a VAPID `Authorization` header and an RFC 8291 encrypted body (`Content-Type: application/octet-stream`), which decrypts to the documented JSON payload.',
            parameters: this.sorting.sortParameters([
              {
                name: 'Content-Encoding',
                in: 'header',
                required: true,
                description:
                  'Content encryption scheme (`aes128gcm` for standardized RFC 8291 when `subscription[standard]` is true, or `aesgcm` for legacy draft-04).',
                schema: {
                  type: 'string',
                  enum: ['aes128gcm', 'aesgcm'],
                },
              },
              {
                name: 'Ttl',
                in: 'header',
                required: true,
                description:
                  'Time-to-live in seconds for the push message (Mastodon sends `172800`, i.e. 48 hours).',
                schema: {
                  type: 'integer',
                },
              },
              {
                name: 'Urgency',
                in: 'header',
                required: true,
                description:
                  'Push message urgency per RFC 8030 (Mastodon sends `normal`).',
                schema: {
                  type: 'string',
                  enum: ['very-low', 'low', 'normal', 'high'],
                },
              },
              {
                name: 'Unsubscribe-URL',
                in: 'header',
                required: true,
                description:
                  'Tokenized URL that can be used to unsubscribe this push subscription.',
                schema: {
                  type: 'string',
                  format: 'uri',
                },
              },
              {
                name: 'Encryption',
                in: 'header',
                required: false,
                description:
                  'Salt parameter (`salt=...`) for legacy `aesgcm` encryption. Omitted when `subscription[standard]` is true.',
                schema: {
                  type: 'string',
                },
              },
              {
                name: 'Crypto-Key',
                in: 'header',
                required: false,
                description:
                  'DH server public key and VAPID `p256ecdsa` key (`dh=...;p256ecdsa=...`) for legacy `aesgcm` encryption. Omitted when `subscription[standard]` is true.',
                schema: {
                  type: 'string',
                },
              },
            ]),
            requestBody: {
              description:
                'Decrypted JSON Web Push notification payload (encrypted on the wire per RFC 8291).',
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: `#/components/schemas/${WEB_PUSH_SCHEMA_NAME}`,
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'Push message accepted by the push service.',
              },
              '410': {
                description:
                  'Subscription expired or invalid. Mastodon removes the subscription on any 4xx response other than 408 or 429.',
              },
            },
          },
        },
      },
    };
  }

  private ensureWebPushNotificationSchema(spec: OpenAPISpec): void {
    if (!spec.components) {
      spec.components = {};
    }
    if (!spec.components.schemas) {
      spec.components.schemas = {};
    }
    if (spec.components.schemas[WEB_PUSH_SCHEMA_NAME]) {
      return;
    }

    // Notification.type is promoted to NotificationTypeEnum by ExtractEnumsPass
    // when the Notification entity is present; fall back to plain string otherwise.
    const hasNotificationTypeEnum = Boolean(
      spec.components.schemas.Notification?.properties?.type?.enum ||
      spec.components.schemas.NotificationTypeEnum
    );
    const notificationTypeProperty: OpenAPIProperty = hasNotificationTypeEnum
      ? {
          $ref: '#/components/schemas/NotificationTypeEnum',
          description: 'The type of event that resulted in the notification.',
        }
      : {
          type: 'string',
          description: 'The type of event that resulted in the notification.',
        };

    const schema: OpenAPISchema = {
      type: 'object',
      description:
        'Decrypted JSON payload delivered to a Web Push subscription endpoint (serialized by `Web::NotificationSerializer` and encrypted on the wire per RFC 8291).',
      properties: {
        access_token: {
          type: 'string',
          description:
            'OAuth access token associated with the push subscription.',
        },
        body: {
          type: 'string',
          description:
            'Plain-text body of the notification, truncated to 140 characters.',
        },
        icon: {
          type: 'string',
          format: 'uri',
          description:
            'URL to the static avatar of the account that triggered the notification.',
        },
        notification_id: {
          type: 'integer',
          description: 'Database ID of the notification.',
        },
        notification_type: notificationTypeProperty,
        preferred_locale: {
          type: 'string',
          description: "The user's preferred locale.",
        },
        title: {
          type: 'string',
          description: 'Localized title of the notification.',
        },
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
    };

    this.sorting.sortSchemaProperties(schema);
    spec.components.schemas[WEB_PUSH_SCHEMA_NAME] = schema;
  }
}
