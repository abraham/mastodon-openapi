import { EntityParser } from '../../parsers/EntityParser';

describe('EntityParser - Invalid Entities Fix', () => {
  let parser: EntityParser;

  beforeEach(() => {
    parser = new EntityParser();
  });

  test('should not generate entities with " entity" suffix', () => {
    const entities = parser.parseAllEntities();

    // Find any entities that end with " entity" - these should not exist
    const invalidEntities = entities.filter((entity) =>
      entity.name.endsWith(' entity')
    );

    // Debug: show invalid entities if any
    if (invalidEntities.length > 0) {
      console.log(
        'Found invalid entities:',
        invalidEntities.map((e) => e.name)
      );
    }

    expect(invalidEntities).toHaveLength(0);
  });

  test('should still generate legitimate additional entities', () => {
    const entities = parser.parseAllEntities();

    // These are legitimate additional entities that should exist
    const legitimateEntities = [
      'CredentialAccount',
      'MutedAccount',
      'Field',
      'CohortData',
    ];

    for (const entityName of legitimateEntities) {
      const entity = entities.find((e) => e.name === entityName);
      expect(entity).toBeDefined();
      expect(entity?.attributes.length).toBeGreaterThan(0);
    }
  });

  test('should not generate both EntityName and EntityName entity variants', () => {
    const entities = parser.parseAllEntities();
    const entityNames = entities.map((e) => e.name);

    // Check for problematic patterns where we have both "EntityName" and "EntityName entity"
    const problematicPairs = [
      ['CredentialAccount', 'CredentialAccount entity'],
      ['MutedAccount', 'MutedAccount entity'],
      ['Field', 'Field entity'],
      ['CohortData', 'CohortData entity'],
      ['Trends::Link', 'Trends::Link entity'],
    ];

    for (const [mainEntity, invalidEntity] of problematicPairs) {
      const hasMain = entityNames.includes(mainEntity);
      const hasInvalid = entityNames.includes(invalidEntity);

      if (hasMain && hasInvalid) {
        throw new Error(
          `Found both ${mainEntity} and ${invalidEntity} - should only have ${mainEntity}`
        );
      }

      // We should have the main entity but not the invalid one
      expect(hasMain).toBe(true);
      expect(hasInvalid).toBe(false);
    }
  });
});
