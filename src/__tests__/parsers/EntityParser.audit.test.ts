import { EntityParser } from '../../parsers/EntityParser';

describe('EntityParser - Audit for Missing Attributes', () => {
  let parser: EntityParser;

  beforeEach(() => {
    parser = new EntityParser();
  });

  test('should parse WebPushSubscription attributes including sub-attributes', () => {
    const entities = parser.parseAllEntities();
    const webPushEntity = entities.find((e) => e.name === 'WebPushSubscription');

    expect(webPushEntity).toBeDefined();
    if (webPushEntity) {
      console.log('WebPushSubscription attributes:');
      webPushEntity.attributes.forEach((attr) => {
        console.log(`  - ${attr.name}: ${attr.type}`);
      });

      // Should have the main attributes
      expect(
        webPushEntity.attributes.some((a) => a.name === 'standard')
      ).toBe(true);
      expect(
        webPushEntity.attributes.some((a) => a.name === 'server_key')
      ).toBe(true);
      expect(webPushEntity.attributes.some((a) => a.name === 'alerts')).toBe(
        true
      );

      // Should also have the sub-attributes like alerts[mention], alerts[status], etc.
      // These are currently NOT being parsed due to #### format
      const alertSubAttributes = webPushEntity.attributes.filter((a) =>
        a.name.startsWith('alerts[')
      );
      console.log(`Found ${alertSubAttributes.length} alert sub-attributes`);

      // This will likely fail initially - we want to capture sub-attributes too
      expect(alertSubAttributes.length).toBeGreaterThan(0);
    }
  });

  test('should parse Admin::Measure correctly without example sections', () => {
    const entities = parser.parseAllEntities();
    const adminMeasureEntity = entities.find((e) => e.name === 'Admin::Measure');

    expect(adminMeasureEntity).toBeDefined();
    if (adminMeasureEntity) {
      console.log('Admin::Measure attributes:');
      adminMeasureEntity.attributes.forEach((attr) => {
        console.log(`  - ${attr.name}: ${attr.type}`);
      });

      // Should have the main attributes but NOT the example section headers
      expect(
        adminMeasureEntity.attributes.some((a) => a.name === 'key')
      ).toBe(true);
      expect(
        adminMeasureEntity.attributes.some((a) => a.name === 'unit')
      ).toBe(true);

      // Should NOT have example section headers like 'active_users', 'new_users'
      const exampleHeaders = adminMeasureEntity.attributes.filter((a) =>
        ['active_users', 'new_users', 'interactions'].includes(a.name)
      );
      expect(exampleHeaders.length).toBe(0);
    }
  });

  test('should count total parsed attributes across all entities', () => {
    const entities = parser.parseAllEntities();
    const totalAttributes = entities.reduce(
      (sum, entity) => sum + entity.attributes.length,
      0
    );

    console.log(`Total entities: ${entities.length}`);
    console.log(`Total attributes parsed: ${totalAttributes}`);

    // This gives us a baseline to improve upon
    expect(totalAttributes).toBeGreaterThan(0);
  });
});