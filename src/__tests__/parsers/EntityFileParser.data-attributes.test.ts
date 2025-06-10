import { EntityParser } from '../../parsers/EntityParser';

describe('EntityFileParser - Data Attributes', () => {
  test('should extract Admin::DimensionData component schema from Data attributes section', () => {
    const parser = new EntityParser();
    const entities = parser.parseAllEntities();

    const dimensionEntity = entities.find((e) => e.name === 'Admin::Dimension');
    const dimensionDataEntity = entities.find(
      (e) => e.name === 'Admin::DimensionData'
    );

    expect(dimensionEntity).toBeDefined();

    if (dimensionEntity) {
      // Check that the data field references the component schema
      const dataAttribute = dimensionEntity.attributes.find(
        (attr) => attr.name === 'data'
      );
      expect(dataAttribute).toBeDefined();
      expect(dataAttribute?.type).toBe('Array of [Admin::DimensionData]');
    }

    // Check that the component schema exists
    expect(dimensionDataEntity).toBeDefined();
    if (dimensionDataEntity) {
      // Should have all the data attributes from the "Data attributes" section
      const expectedAttributes = [
        'key',
        'human_key',
        'value',
        'unit',
        'human_value',
      ];

      for (const expectedAttr of expectedAttributes) {
        const attr = dimensionDataEntity.attributes.find(
          (a) => a.name === expectedAttr
        );
        expect(attr).toBeDefined();
      }

      // Check specific attributes
      const keyAttr = dimensionDataEntity.attributes.find(
        (a) => a.name === 'key'
      );
      expect(keyAttr?.type).toBe('String');
      expect(keyAttr?.description).toBe(
        'The unique keystring for this data item.'
      );

      // Check optional attributes
      const unitAttr = dimensionDataEntity.attributes.find(
        (a) => a.name === 'unit'
      );
      expect(unitAttr?.optional).toBe(true);

      const humanValueAttr = dimensionDataEntity.attributes.find(
        (a) => a.name === 'human_value'
      );
      expect(humanValueAttr?.optional).toBe(true);
    }
  });
});
