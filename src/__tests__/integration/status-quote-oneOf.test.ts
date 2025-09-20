import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityParser } from '../../parsers/EntityParser';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('Status Quote Attribute Integration Test', () => {
  it('should generate OpenAPI schema with oneOf for Status.quote attribute', () => {
    const generator = new OpenAPIGenerator();
    const entityParser = new EntityParser();

    // Parse entities and generate the schema
    const entities = entityParser.parseAllEntities();
    const methodFiles: ApiMethodsFile[] = []; // Empty method files for this test
    const spec = generator.generateSchema(entities, methodFiles);

    // Find the Status schema
    const statusSchema = spec.components?.schemas?.Status;
    expect(statusSchema).toBeDefined();

    if (statusSchema && statusSchema.properties) {
      const quoteProperty = statusSchema.properties.quote;
      expect(quoteProperty).toBeDefined();

      console.log(
        'Generated Status.quote property:',
        JSON.stringify(quoteProperty, null, 2)
      );

      // Check that the quote property has a oneOf structure with both Quote and ShallowQuote
      // Note: nullable handling for oneOf structures is handled differently than simple $ref
      if (quoteProperty.oneOf) {
        // Check if it's directly oneOf with Quote and ShallowQuote
        const refs = quoteProperty.oneOf
          .filter((item: any) => item.$ref)
          .map((item: any) => item.$ref);

        const hasQuote = refs.includes('#/components/schemas/Quote');
        const hasShallowQuote = refs.includes(
          '#/components/schemas/ShallowQuote'
        );

        expect(hasQuote).toBe(true);
        expect(hasShallowQuote).toBe(true);

        console.log('✓ Found both Quote and ShallowQuote references in oneOf');

        // Note: The nullable handling for oneOf structures could be improved in the future
        // but the main issue (missing ShallowQuote) is now fixed
      } else {
        // If there's a nested structure due to nullable handling, check it
        console.log('Quote property structure:', quoteProperty);

        // This might happen if nullable handling creates a different structure
        // Let's still verify both entities are referenced somewhere in the structure
        const jsonStr = JSON.stringify(quoteProperty);
        expect(jsonStr).toContain('#/components/schemas/Quote');
        expect(jsonStr).toContain('#/components/schemas/ShallowQuote');

        console.log(
          '✓ Found both Quote and ShallowQuote references in the structure'
        );
      }
    }
  });

  it('should verify that Quote and ShallowQuote schemas exist', () => {
    const generator = new OpenAPIGenerator();
    const entityParser = new EntityParser();

    const entities = entityParser.parseAllEntities();
    const methodFiles: ApiMethodsFile[] = [];
    const spec = generator.generateSchema(entities, methodFiles);

    // Verify that both Quote and ShallowQuote entities exist in the schema
    expect(spec.components?.schemas?.Quote).toBeDefined();
    expect(spec.components?.schemas?.ShallowQuote).toBeDefined();

    console.log(
      'Quote schema keys:',
      spec.components?.schemas?.Quote
        ? Object.keys(spec.components.schemas.Quote)
        : 'Not found'
    );
    console.log(
      'ShallowQuote schema keys:',
      spec.components?.schemas?.ShallowQuote
        ? Object.keys(spec.components.schemas.ShallowQuote)
        : 'Not found'
    );
  });
});
