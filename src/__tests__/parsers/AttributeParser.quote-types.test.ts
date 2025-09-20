import { AttributeParser } from '../../parsers/AttributeParser';

describe('AttributeParser - Quote Types Issue', () => {
  it('should parse quote attribute with multiple types (Quote, ShallowQuote, null)', () => {
    // Mock content representing the Status entity quote attribute
    // This reproduces the exact content from Status.md
    const content = `
### \`quote\` {#quote}

**Description:** Information about the status being quoted, if any\\
**Type:** {{<nullable>}} [Quote]({{< relref "entities/quote" >}}), [ShallowQuote]({{< relref "entities/ShallowQuote" >}}) or null\\
**Version history:**\\
4.4.0 - added
`;

    const attributes = AttributeParser.parseAttributesFromSection(
      content,
      'Status'
    );

    expect(attributes).toHaveLength(1);
    const quoteAttribute = attributes[0];

    expect(quoteAttribute.name).toBe('quote');
    expect(quoteAttribute.nullable).toBe(true);
    
    // The key issue: the type should capture both Quote and ShallowQuote
    // Currently it likely only captures Quote
    console.log('Parsed quote attribute type:', quoteAttribute.type);
    console.log('Full quote attribute:', JSON.stringify(quoteAttribute, null, 2));

    // This test will initially fail, showing us the current behavior
    // The type should ideally be something that includes both Quote and ShallowQuote
    expect(quoteAttribute.type).toContain('Quote');
    expect(quoteAttribute.type).toContain('ShallowQuote');
  });

  it('should parse quote attribute from actual Status entity file', () => {
    // Parse actual Status entity to check the real behavior
    const { EntityParser } = require('../../parsers/EntityParser');
    const parser = new EntityParser();
    const entities = parser.parseAllEntities();
    const statusEntity = entities.find((e: any) => e.name === 'Status');

    expect(statusEntity).toBeDefined();
    
    if (statusEntity) {
      const quoteAttribute = statusEntity.attributes.find(
        (a: any) => a.name === 'quote'
      );
      
      expect(quoteAttribute).toBeDefined();
      
      if (quoteAttribute) {
        console.log('Real Status quote attribute type:', quoteAttribute.type);
        console.log('Real Status quote attribute:', JSON.stringify(quoteAttribute, null, 2));
        
        // This should include both Quote and ShallowQuote types
        expect(quoteAttribute.type).toContain('Quote');
        // This will likely fail, showing the current issue
        expect(quoteAttribute.type).toContain('ShallowQuote');
      }
    }
  });
});