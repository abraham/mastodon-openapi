import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { EntityClass } from '../../interfaces/EntityClass';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('EntityConverter - GroupedNotificationsResults', () => {
  let entityConverter: EntityConverter;
  let utilityHelpers: UtilityHelpers;
  let typeParser: TypeParser;

  beforeEach(() => {
    utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
    entityConverter = new EntityConverter(typeParser, utilityHelpers);
  });

  test('should convert notification_groups to array of NotificationGroup', () => {
    const entities: EntityClass[] = [
      {
        name: 'NotificationGroup',
        description: 'A notification group',
        attributes: [
          {
            name: 'group_key',
            type: 'String',
            description: 'The group key',
            optional: false,
            nullable: false,
            deprecated: false,
            enumValues: [],
            versions: ['4.3.0'],
          },
        ],
      },
      {
        name: 'GroupedNotificationsResults',
        description: 'Grouped notifications results',
        attributes: [
          {
            name: 'notification_groups',
            type: 'Array of [NotificationGroup]',
            description: 'The grouped notifications themselves.',
            optional: false,
            nullable: true,
            deprecated: false,
            enumValues: [],
            versions: ['4.3.0'],
          },
          {
            name: 'accounts',
            type: 'Array of [Account]',
            description: 'Accounts referenced by grouped notifications.',
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

    const groupedNotificationsSchema =
      spec.components?.schemas?.GroupedNotificationsResults;
    expect(groupedNotificationsSchema).toBeDefined();
    if (!groupedNotificationsSchema) return;

    // Check that notification_groups is an array
    const notificationGroupsProperty =
      groupedNotificationsSchema.properties?.notification_groups;
    expect(notificationGroupsProperty).toBeDefined();
    if (!notificationGroupsProperty) return;

    // The property should be a nullable array (type: ["array", "null"])
    expect(notificationGroupsProperty.type).toEqual(['array', 'null']);
    expect(notificationGroupsProperty.items).toBeDefined();
    if (!notificationGroupsProperty.items) return;
    expect(notificationGroupsProperty.items.$ref).toBe(
      '#/components/schemas/NotificationGroup'
    );
  });

  test('should handle non-nullable notification_groups as array', () => {
    const entities: EntityClass[] = [
      {
        name: 'NotificationGroup',
        description: 'A notification group',
        attributes: [
          {
            name: 'group_key',
            type: 'String',
            description: 'The group key',
            optional: false,
            nullable: false,
            deprecated: false,
            enumValues: [],
            versions: ['4.3.0'],
          },
        ],
      },
      {
        name: 'GroupedNotificationsResults',
        description: 'Grouped notifications results',
        attributes: [
          {
            name: 'notification_groups',
            type: 'Array of [NotificationGroup]',
            description: 'The grouped notifications themselves.',
            optional: false,
            nullable: false,
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

    const groupedNotificationsSchema =
      spec.components?.schemas?.GroupedNotificationsResults;
    expect(groupedNotificationsSchema).toBeDefined();
    if (!groupedNotificationsSchema) return;

    // Check that notification_groups is an array
    const notificationGroupsProperty =
      groupedNotificationsSchema.properties?.notification_groups;
    expect(notificationGroupsProperty).toBeDefined();
    if (!notificationGroupsProperty) return;

    // Should be a direct array (not nullable)
    expect(notificationGroupsProperty.type).toBe('array');
    if (!notificationGroupsProperty.items) return;
    expect(notificationGroupsProperty.items).toBeDefined();
    expect(notificationGroupsProperty.items.$ref).toBe(
      '#/components/schemas/NotificationGroup'
    );
  });

  test('should not affect other attributes in GroupedNotificationsResults', () => {
    const entities: EntityClass[] = [
      {
        name: 'Account',
        description: 'An account',
        attributes: [
          {
            name: 'id',
            type: 'String',
            description: 'The account ID',
            optional: false,
            nullable: false,
            deprecated: false,
            enumValues: [],
            versions: ['1.0.0'],
          },
        ],
      },
      {
        name: 'GroupedNotificationsResults',
        description: 'Grouped notifications results',
        attributes: [
          {
            name: 'accounts',
            type: 'Array of [Account]',
            description: 'Accounts referenced by grouped notifications.',
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

    const groupedNotificationsSchema =
      spec.components?.schemas?.GroupedNotificationsResults;
    expect(groupedNotificationsSchema).toBeDefined();
    if (!groupedNotificationsSchema) return;

    // Check that accounts is still properly handled as array
    const accountsProperty = groupedNotificationsSchema.properties?.accounts;
    expect(accountsProperty).toBeDefined();
    if (!accountsProperty) return;

    // Should be a nullable array (type: ["array", "null"])
    expect(accountsProperty.type).toEqual(['array', 'null']);
    expect(accountsProperty.items).toBeDefined();
    if (!accountsProperty.items) return;
    expect(accountsProperty.items.$ref).toBe('#/components/schemas/Account');
  });
});
