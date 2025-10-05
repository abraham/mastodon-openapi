import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { EntityClass } from '../../interfaces/EntityClass';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('EntityConverter - most_recent_notification_id type', () => {
  let entityConverter: EntityConverter;
  let utilityHelpers: UtilityHelpers;
  let typeParser: TypeParser;

  beforeEach(() => {
    utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
    entityConverter = new EntityConverter(typeParser, utilityHelpers);
  });

  test('should convert most_recent_notification_id as integer type', () => {
    const entities: EntityClass[] = [
      {
        name: 'NotificationGroup',
        description: 'A notification group',
        attributes: [
          {
            name: 'most_recent_notification_id',
            type: 'Integer', // Special case overrides from String to Integer
            description: 'ID of the most recent notification in the group.',
            optional: false,
            nullable: true,
            deprecated: false,
            enumValues: [],
            versions: ['4.3.0'],
          },
        ],
      },
    ];

    const spec: OpenAPISpec = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    entityConverter.convertEntities(entities, spec);

    const notificationGroupSchema = spec.components?.schemas?.NotificationGroup;
    expect(notificationGroupSchema).toBeDefined();
    if (!notificationGroupSchema) return;

    // Check that most_recent_notification_id is an integer
    const mostRecentNotificationIdProperty =
      notificationGroupSchema.properties?.most_recent_notification_id;
    expect(mostRecentNotificationIdProperty).toBeDefined();
    if (!mostRecentNotificationIdProperty) return;

    // The property should be a nullable integer (type: ["integer", "null"])
    expect(mostRecentNotificationIdProperty.type).toEqual(['integer', 'null']);
    expect(mostRecentNotificationIdProperty.description).toBe(
      'ID of the most recent notification in the group.'
    );
  });

  test('should convert most_recent_notification_id as non-nullable integer if not marked nullable', () => {
    const entities: EntityClass[] = [
      {
        name: 'TestEntity',
        description: 'A test entity',
        attributes: [
          {
            name: 'most_recent_notification_id',
            type: 'Integer',
            description: 'ID of the most recent notification.',
            optional: false,
            nullable: false,
            deprecated: false,
            enumValues: [],
            versions: ['1.0.0'],
          },
        ],
      },
    ];

    const spec: OpenAPISpec = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    entityConverter.convertEntities(entities, spec);

    const testEntitySchema = spec.components?.schemas?.TestEntity;
    expect(testEntitySchema).toBeDefined();
    if (!testEntitySchema) return;

    // Check that most_recent_notification_id is an integer
    const mostRecentNotificationIdProperty =
      testEntitySchema.properties?.most_recent_notification_id;
    expect(mostRecentNotificationIdProperty).toBeDefined();
    if (!mostRecentNotificationIdProperty) return;

    // The property should be a non-nullable integer (type: "integer")
    expect(mostRecentNotificationIdProperty.type).toBe('integer');
    expect(mostRecentNotificationIdProperty.description).toBe(
      'ID of the most recent notification.'
    );
  });
});
