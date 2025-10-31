import { EntityParser } from '../../parsers/EntityParser';
import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';

describe('Entity Same Version Nullable - Integration Test', () => {
  it('should not mark AsyncRefresh attributes as nullable since all were added in 4.4.0', () => {
    const parser = new EntityParser();
    const entities = parser.parseAllEntities();

    const asyncRefreshEntity = entities.find((e) => e.name === 'AsyncRefresh');

    expect(asyncRefreshEntity).toBeDefined();

    if (asyncRefreshEntity) {
      // Check that attributes are marked correctly
      const idAttr = asyncRefreshEntity.attributes.find((a) => a.name === 'id');
      const statusAttr = asyncRefreshEntity.attributes.find(
        (a) => a.name === 'status'
      );
      const resultCountAttr = asyncRefreshEntity.attributes.find(
        (a) => a.name === 'result_count'
      );

      // id and status should NOT be nullable (no explicit nullable marker)
      expect(idAttr).toBeDefined();
      expect(idAttr?.nullable).toBeUndefined();
      expect(idAttr?.versions).toEqual(['4.4.0']);

      expect(statusAttr).toBeDefined();
      expect(statusAttr?.nullable).toBeUndefined();
      expect(statusAttr?.versions).toEqual(['4.4.0']);

      // result_count should remain nullable (explicitly marked with {{<nullable>}})
      expect(resultCountAttr).toBeDefined();
      expect(resultCountAttr?.nullable).toBe(true);
      expect(resultCountAttr?.explicitlyNullable).toBe(true);
      expect(resultCountAttr?.optional).toBe(true);
      expect(resultCountAttr?.versions).toEqual(['4.4.0']);
    }
  });

  it('should generate correct OpenAPI schema for AsyncRefresh without nullable types', () => {
    const parser = new EntityParser();
    const entities = parser.parseAllEntities();
    const generator = new OpenAPIGenerator();

    const spec = generator.generateSchema(entities, []);

    const asyncRefreshSchema = spec.components?.schemas?.AsyncRefresh;

    expect(asyncRefreshSchema).toBeDefined();

    if (asyncRefreshSchema && 'properties' in asyncRefreshSchema) {
      // Check id property - should be string, not ["string", "null"]
      const idProp = asyncRefreshSchema.properties?.id;
      expect(idProp).toBeDefined();
      if (idProp && 'type' in idProp) {
        expect(idProp.type).toBe('string');
        expect(idProp.type).not.toEqual(['string', 'null']);
      }

      // Check status property - should be string, not ["string", "null"]
      const statusProp = asyncRefreshSchema.properties?.status;
      expect(statusProp).toBeDefined();
      if (statusProp && 'type' in statusProp) {
        expect(statusProp.type).toBe('string');
        expect(statusProp.type).not.toEqual(['string', 'null']);
      }

      // Check result_count property - should be nullable (explicitly marked)
      const resultCountProp = asyncRefreshSchema.properties?.result_count;
      expect(resultCountProp).toBeDefined();
      if (resultCountProp && 'type' in resultCountProp) {
        // result_count is explicitly nullable, so it should be ["integer", "null"]
        expect(resultCountProp.type).toEqual(['integer', 'null']);
      }

      // Check required array - should include id and status, but not result_count (optional)
      expect(asyncRefreshSchema.required).toContain('id');
      expect(asyncRefreshSchema.required).toContain('status');
      expect(asyncRefreshSchema.required).not.toContain('result_count');
    }
  });

  it('should still mark attributes as nullable when added in different versions', () => {
    const parser = new EntityParser();
    const entities = parser.parseAllEntities();

    // Account entity has attributes added in different versions
    const accountEntity = entities.find((e) => e.name === 'Account');

    expect(accountEntity).toBeDefined();

    if (accountEntity) {
      // Some newer attributes should still be nullable
      const hideCollectionsAttr = accountEntity.attributes.find(
        (a) => a.name === 'hide_collections'
      );

      // This was added in 4.3.0, so it should be nullable for backwards compatibility
      if (hideCollectionsAttr) {
        expect(hideCollectionsAttr.versions).toContain('4.3.0');
        expect(hideCollectionsAttr.nullable).toBe(true);
      }
    }
  });

  it('should handle Admin::Dimension correctly (all attributes added in 3.5.0)', () => {
    const parser = new EntityParser();
    const entities = parser.parseAllEntities();

    const dimensionEntity = entities.find((e) => e.name === 'Admin::Dimension');

    expect(dimensionEntity).toBeDefined();

    if (dimensionEntity) {
      // All attributes were added in 3.5.0, so none should be nullable
      for (const attr of dimensionEntity.attributes) {
        if (attr.versions && attr.versions.includes('3.5.0')) {
          expect(attr.nullable).toBeUndefined();
        }
      }
    }
  });

  it('should preserve optional flag for explicitly optional attributes', () => {
    const parser = new EntityParser();
    const entities = parser.parseAllEntities();

    // Admin::DimensionData has some explicitly optional attributes
    const dimensionDataEntity = entities.find(
      (e) => e.name === 'Admin::DimensionData'
    );

    expect(dimensionDataEntity).toBeDefined();

    if (dimensionDataEntity) {
      const unitAttr = dimensionDataEntity.attributes.find(
        (a) => a.name === 'unit'
      );
      const humanValueAttr = dimensionDataEntity.attributes.find(
        (a) => a.name === 'human_value'
      );

      // These were explicitly marked as optional in the docs
      expect(unitAttr?.optional).toBe(true);
      expect(unitAttr?.nullable).toBeUndefined();

      expect(humanValueAttr?.optional).toBe(true);
      expect(humanValueAttr?.nullable).toBeUndefined();
    }
  });

  it('should preserve explicitly nullable attributes (Conversation#last_status)', () => {
    const parser = new EntityParser();
    const entities = parser.parseAllEntities();

    const conversationEntity = entities.find((e) => e.name === 'Conversation');

    expect(conversationEntity).toBeDefined();

    if (conversationEntity) {
      // All attributes were added in 2.6.0
      const idAttr = conversationEntity.attributes.find((a) => a.name === 'id');
      const unreadAttr = conversationEntity.attributes.find(
        (a) => a.name === 'unread'
      );
      const lastStatusAttr = conversationEntity.attributes.find(
        (a) => a.name === 'last_status'
      );

      // id and unread should NOT be nullable (version-based nullable removed)
      expect(idAttr?.nullable).toBeUndefined();
      expect(idAttr?.versions).toEqual(['2.6.0']);

      expect(unreadAttr?.nullable).toBeUndefined();
      expect(unreadAttr?.versions).toEqual(['2.6.0']);

      // last_status should remain nullable because it's explicitly marked as nullable
      expect(lastStatusAttr?.nullable).toBe(true);
      expect(lastStatusAttr?.explicitlyNullable).toBe(true);
      expect(lastStatusAttr?.versions).toEqual(['2.6.0']);
    }
  });
});
