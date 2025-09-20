import { EntityParser } from '../../parsers/EntityParser';
import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';

describe('StatusEdit Quote Attribute Fix', () => {
  it('should parse StatusEdit quote attribute after syntax fix', () => {
    // Test that StatusEdit.quote is now being parsed correctly
    const parser = new EntityParser();
    const entities = parser.parseAllEntities();
    const statusEditEntity = entities.find((e: any) => e.name === 'StatusEdit');

    expect(statusEditEntity).toBeDefined();

    if (statusEditEntity) {
      const quoteAttribute = statusEditEntity.attributes.find(
        (a: any) => a.name === 'quote'
      );

      expect(quoteAttribute).toBeDefined();

      if (quoteAttribute) {
        console.log('StatusEdit quote attribute type:', quoteAttribute.type);

        // This should include both Quote and ShallowQuote types
        expect(quoteAttribute.type).toContain('Quote');
        expect(quoteAttribute.type).toContain('ShallowQuote');
        expect(quoteAttribute.nullable).toBe(true);
      }
    }
  });

  it('should generate StatusEdit.quote schema with oneOf for both Quote and ShallowQuote', () => {
    const generator = new OpenAPIGenerator();
    const entityParser = new EntityParser();

    const entities = entityParser.parseAllEntities();
    const methodFiles: any[] = [];
    const spec = generator.generateSchema(entities, methodFiles);

    // Verify that StatusEdit.quote exists and has oneOf structure
    expect(
      spec.components?.schemas?.StatusEdit?.properties?.quote
    ).toBeDefined();

    const quoteProperty =
      spec.components?.schemas?.StatusEdit?.properties?.quote;

    if (quoteProperty) {
      console.log(
        'StatusEdit.quote schema:',
        JSON.stringify(quoteProperty, null, 2)
      );

      // Check that it has a oneOf structure with both Quote and ShallowQuote plus null
      expect(quoteProperty.oneOf).toBeDefined();
      expect(quoteProperty.oneOf).toHaveLength(3);

      if (quoteProperty.oneOf) {
        const refs = quoteProperty.oneOf
          .filter((item: any) => item.$ref)
          .map((item: any) => item.$ref);

        const hasQuote = refs.includes('#/components/schemas/Quote');
        const hasShallowQuote = refs.includes(
          '#/components/schemas/ShallowQuote'
        );
        const hasNull = quoteProperty.oneOf.some(
          (item: any) => item.type === 'null'
        );

        expect(hasQuote).toBe(true);
        expect(hasShallowQuote).toBe(true);
        expect(hasNull).toBe(true);

        console.log(
          '✓ StatusEdit.quote correctly references both Quote and ShallowQuote plus null'
        );
      }
    }
  });
});
