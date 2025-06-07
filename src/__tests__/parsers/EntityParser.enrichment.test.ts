import { EntityParser } from '../../parsers/EntityParser';

describe('EntityParser - Example Enrichment', () => {
  let parser: EntityParser;

  beforeEach(() => {
    parser = new EntityParser();
  });

  test('should extract entity names from returns field', () => {
    // Use reflection to access private method for testing
    const extractEntityNames = (parser as any).extractEntityNamesFromReturns.bind(parser);

    // Test simple entity reference
    const result1 = extractEntityNames('[Account]({{< relref "entities/account" >}})');
    expect(result1).toEqual(['Account']);

    // Test array of entities
    const result2 = extractEntityNames('Array of [Account]({{< relref "entities/account" >}})');
    expect(result2).toEqual(['Account']);

    // Test credential account (should extract base Account)
    const result3 = extractEntityNames('[CredentialAccount]({{< relref "entities/Account#CredentialAccount">}})');
    expect(result3).toEqual(['Account']);

    // Test admin entity
    const result4 = extractEntityNames('[Admin_Account]({{< relref "entities/Admin_Account" >}})');
    expect(result4).toEqual(['Account']);

    // Test multiple entities
    const result5 = extractEntityNames('Array containing [Account]({{< relref "entities/account" >}}) and [Status]({{< relref "entities/status" >}})');
    expect(result5).toEqual(['Account', 'Status']);
  });

  test('should enrich entities with example attributes', () => {
    // This test will run against real data, so we just verify it doesn't crash
    // and that it returns the same number of entities
    const originalEntities = parser.parseAllEntities();
    const enrichedEntities = parser.enrichEntitiesWithExamples(originalEntities);

    expect(enrichedEntities).toHaveLength(originalEntities.length);
    
    // Find an Account entity to check if it was enriched
    const originalAccount = originalEntities.find(e => e.name === 'Account');
    const enrichedAccount = enrichedEntities.find(e => e.name === 'Account');

    if (originalAccount && enrichedAccount) {
      // The enriched account should have at least as many attributes as the original
      expect(enrichedAccount.attributes.length).toBeGreaterThanOrEqual(originalAccount.attributes.length);
      
      // Check if any attributes were marked as discovered from examples
      const exampleAttributes = enrichedAccount.attributes.filter(
        attr => attr.description.includes('discovered from JSON example')
      );
      
      // We can't guarantee examples will be found, but if they are, they should be properly marked
      if (exampleAttributes.length > 0) {
        console.log(`Found ${exampleAttributes.length} attributes from examples in Account entity`);
        for (const attr of exampleAttributes.slice(0, 3)) { // Show first few
          console.log(`- ${attr.name}: ${attr.type}`);
        }
      }
    }
  });
});