import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityClass } from '../../interfaces/EntityClass';

describe('OpenAPIGenerator enum refactoring', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should use EntityAttributeEnum naming pattern', () => {
    const entities: EntityClass[] = [
      {
        name: 'Account',
        description: 'An account',
        attributes: [
          {
            name: 'visibility',
            type: 'String (Enumerable oneOf)',
            description: 'Account visibility',
            enumValues: ['public', 'unlisted', 'private'],
          },
        ],
      },
    ];

    const spec = generator.generateSchema(entities, []);

    // Should use EntityAttributeEnum pattern
    expect(spec.components?.schemas?.AccountVisibilityEnum).toBeDefined();

    // Should not use hardcoded names
    expect(spec.components?.schemas?.VisibilityEnum).toBeUndefined();

    const accountSchema = spec.components!.schemas!.Account;
    expect(accountSchema.properties!.visibility.$ref).toBe(
      '#/components/schemas/AccountVisibilityEnum'
    );
  });

  it('should handle compound entity names with proper case', () => {
    const entities: EntityClass[] = [
      {
        name: 'AccountWarning',
        description: 'An account warning',
        attributes: [
          {
            name: 'action',
            type: 'String (Enumerable oneOf)',
            description: 'The action taken',
            enumValues: ['none', 'disable', 'suspend'],
          },
        ],
      },
    ];

    const spec = generator.generateSchema(entities, []);

    // Should be AccountWarningActionEnum, not AccountwarningActionEnum
    expect(spec.components?.schemas?.AccountWarningActionEnum).toBeDefined();
    expect(spec.components?.schemas?.AccountwarningActionEnum).toBeUndefined();

    const warningSchema = spec.components!.schemas!.AccountWarning;
    expect(warningSchema.properties!.action.$ref).toBe(
      '#/components/schemas/AccountWarningActionEnum'
    );
  });

  it('should handle underscore entity names correctly', () => {
    const entities: EntityClass[] = [
      {
        name: 'Account_Setting',
        description: 'Account settings',
        attributes: [
          {
            name: 'privacy_level',
            type: 'String (Enumerable oneOf)',
            description: 'Privacy level',
            enumValues: ['public', 'private'],
          },
        ],
      },
    ];

    const spec = generator.generateSchema(entities, []);

    // Should convert underscores to PascalCase
    expect(
      spec.components?.schemas?.AccountSettingPrivacyLevelEnum
    ).toBeDefined();

    const settingSchema = spec.components!.schemas!['Account_Setting'];
    expect(settingSchema.properties!.privacy_level.$ref).toBe(
      '#/components/schemas/AccountSettingPrivacyLevelEnum'
    );
  });

  it('should share enums with same values using first entity name', () => {
    const entities: EntityClass[] = [
      {
        name: 'Status',
        description: 'A status',
        attributes: [
          {
            name: 'visibility',
            type: 'String (Enumerable oneOf)',
            description: 'Status visibility',
            enumValues: ['public', 'unlisted', 'private', 'direct'],
          },
        ],
      },
      {
        name: 'Poll',
        description: 'A poll',
        attributes: [
          {
            name: 'visibility',
            type: 'String (Enumerable oneOf)',
            description: 'Poll visibility',
            enumValues: ['public', 'unlisted', 'private', 'direct'],
          },
        ],
      },
    ];

    const spec = generator.generateSchema(entities, []);

    // Should create only one enum component named after first entity
    expect(spec.components?.schemas?.StatusVisibilityEnum).toBeDefined();
    expect(spec.components?.schemas?.PollVisibilityEnum).toBeUndefined();

    // Both entities should reference the same shared enum
    const statusSchema = spec.components!.schemas!.Status;
    const pollSchema = spec.components!.schemas!.Poll;

    expect(statusSchema.properties!.visibility.$ref).toBe(
      '#/components/schemas/StatusVisibilityEnum'
    );
    expect(pollSchema.properties!.visibility.$ref).toBe(
      '#/components/schemas/StatusVisibilityEnum'
    );
  });

  it('should not create shared enums for different values', () => {
    const entities: EntityClass[] = [
      {
        name: 'Status',
        description: 'A status',
        attributes: [
          {
            name: 'visibility',
            type: 'String (Enumerable oneOf)',
            description: 'Status visibility',
            enumValues: ['public', 'unlisted', 'private', 'direct'],
          },
        ],
      },
      {
        name: 'Media',
        description: 'Media attachment',
        attributes: [
          {
            name: 'visibility',
            type: 'String (Enumerable oneOf)',
            description: 'Media visibility',
            enumValues: ['public', 'private'], // Different values
          },
        ],
      },
    ];

    const spec = generator.generateSchema(entities, []);

    // Should create separate enums for different values
    expect(spec.components?.schemas?.StatusVisibilityEnum).toBeDefined();
    expect(spec.components?.schemas?.MediaVisibilityEnum).toBeDefined();

    const statusSchema = spec.components!.schemas!.Status;
    const mediaSchema = spec.components!.schemas!.Media;

    expect(statusSchema.properties!.visibility.$ref).toBe(
      '#/components/schemas/StatusVisibilityEnum'
    );
    expect(mediaSchema.properties!.visibility.$ref).toBe(
      '#/components/schemas/MediaVisibilityEnum'
    );
  });
});
