import { EntityParser } from '../../parsers/EntityParser';
import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';

describe('Entity Same Version Nullable - Integration Test', () => {
  it('should not mark AsyncRefresh attributes as nullable since all were added in 4.4.0', () => {
    const parser = new EntityParser();
    const entities = parser.parseAllEntities();

    const asyncRefreshEntity = entities.find((e) => e.name === 'AsyncRefresh');

    expect(asyncRefreshEntity).toBeDefined();

    if (asyncRefreshEntity) {
      // Check that none of the attributes are marked as nullable
      // (except for explicitly optional ones like result_count)
      const idAttr = asyncRefreshEntity.attributes.find(
        (a) => a.name === 'id'
      );
      const statusAttr = asyncRefreshEntity.attributes.find(
        (a) => a.name === 'status'
      );
      const resultCountAttr = asyncRefreshEntity.attributes.find(
        (a) => a.name === 'result_count'
      );

      expect(idAttr).toBeDefined();
      expect(idAttr?.nullable).toBeUndefined();
      expect(idAttr?.versions).toEqual(['4.4.0']);

      expect(statusAttr).toBeDefined();
      expect(statusAttr?.nullable).toBeUndefined();
      expect(statusAttr?.versions).toEqual(['4.4.0']);

      expect(resultCountAttr).toBeDefined();
      expect(resultCountAttr?.nullable).toBeUndefined();
      // result_count is optional but not nullable
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

      // Check result_count property - should be integer, not ["integer", "null"]
      const resultCountProp = asyncRefreshSchema.properties?.result_count;
      expect(resultCountProp).toBeDefined();
      if (resultCountProp && 'type' in resultCountProp) {
        expect(resultCountProp.type).toBe('integer');
        expect(resultCountProp.type).not.toEqual(['integer', 'null']);
      }

      // Check required array - should include id and status, but not result_count
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
});
