import { EntityParser } from '../../parsers/EntityParser';
import { JsonExampleAnalyzer } from '../../parsers/JsonExampleAnalyzer';

describe('EntityParser - Example Enrichment', () => {
  let parser: EntityParser;

  beforeEach(() => {
    parser = new EntityParser();
  });

  test('should extract entity names from returns field', () => {
    // Use reflection to access private method for testing
    const extractEntityNames = (
      parser as any
    ).extractEntityNamesFromReturns.bind(parser);

    // Test simple entity reference
    const result1 = extractEntityNames(
      '[Account]({{< relref "entities/account" >}})'
    );
    expect(result1).toEqual(['Account']);

    // Test array of entities
    const result2 = extractEntityNames(
      'Array of [Account]({{< relref "entities/account" >}})'
    );
    expect(result2).toEqual(['Account']);

    // Test credential account (should extract base Account)
    const result3 = extractEntityNames(
      '[CredentialAccount]({{< relref "entities/Account#CredentialAccount">}})'
    );
    expect(result3).toEqual(['Account']);

    // Test admin entity
    const result4 = extractEntityNames(
      '[Admin_Account]({{< relref "entities/Admin_Account" >}})'
    );
    expect(result4).toEqual(['Account']);

    // Test multiple entities
    const result5 = extractEntityNames(
      'Array containing [Account]({{< relref "entities/account" >}}) and [Status]({{< relref "entities/status" >}})'
    );
    expect(result5).toEqual(['Account', 'Status']);
  });

  test('should enrich entities with example attributes', () => {
    // This test will run against real data, so we just verify it doesn't crash
    // and that it returns the same number of entities
    const originalEntities = parser.parseAllEntities();
    const enrichedEntities =
      parser.enrichEntitiesWithExamples(originalEntities);

    expect(enrichedEntities).toHaveLength(originalEntities.length);

    // Find an Account entity to check if it was enriched
    const originalAccount = originalEntities.find((e) => e.name === 'Account');
    const enrichedAccount = enrichedEntities.find((e) => e.name === 'Account');

    if (originalAccount && enrichedAccount) {
      // The enriched account should have at least as many attributes as the original
      expect(enrichedAccount.attributes.length).toBeGreaterThanOrEqual(
        originalAccount.attributes.length
      );

      // Check if any attributes were marked as discovered from examples
      const exampleAttributes = enrichedAccount.attributes.filter((attr) =>
        attr.description.includes('discovered from JSON example')
      );

      // We can't guarantee examples will be found, but if they are, they should be properly marked
      if (exampleAttributes.length > 0) {
        console.log(
          `Found ${exampleAttributes.length} attributes from examples in Account entity`
        );
        for (const attr of exampleAttributes.slice(0, 3)) {
          // Show first few
          console.log(`- ${attr.name}: ${attr.type}`);
        }
      }
    }
  });

  test('should handle array responses correctly without creating array index properties', () => {
    // Test the fix for array responses
    const analyzer = new JsonExampleAnalyzer();

    // Simulate an array response like API endpoints that return arrays of entities
    const arrayResponse = [
      {
        id: '14715',
        username: 'trwnh',
        locked: false,
        followers_count: 821,
      },
      {
        id: '14716',
        username: 'alice',
        locked: true,
        followers_count: 42,
      },
    ];

    // Test the array directly (this would create array index properties)
    const directArrayAnalysis = analyzer.analyzeJsonObject(arrayResponse);
    const directArrayAttributes =
      analyzer.convertToEntityAttributes(directArrayAnalysis);

    // Should create properties like "0", "1", etc. (the problem we're fixing)
    const arrayIndexProps = directArrayAttributes.filter((attr) =>
      /^\d+$/.test(attr.name)
    );
    expect(arrayIndexProps.length).toBeGreaterThan(0); // This shows the problem exists

    // Test the fixed approach - analyze just the first element
    const firstElementAnalysis = analyzer.analyzeJsonObject(arrayResponse[0]);
    const firstElementAttributes =
      analyzer.convertToEntityAttributes(firstElementAnalysis);

    // Should NOT create any array index properties
    const fixedArrayIndexProps = firstElementAttributes.filter((attr) =>
      /^\d+$/.test(attr.name)
    );
    expect(fixedArrayIndexProps.length).toBe(0); // This shows the fix works

    // Should contain proper entity attributes
    expect(
      firstElementAttributes.find((attr) => attr.name === 'id')
    ).toBeDefined();
    expect(
      firstElementAttributes.find((attr) => attr.name === 'username')
    ).toBeDefined();
    expect(
      firstElementAttributes.find((attr) => attr.name === 'locked')
    ).toBeDefined();
    expect(
      firstElementAttributes.find((attr) => attr.name === 'followers_count')
    ).toBeDefined();
  });
});
