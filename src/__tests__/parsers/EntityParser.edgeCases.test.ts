import { EntityParser } from '../../parsers/EntityParser';
import * as fs from 'fs';
import * as path from 'path';

describe('EntityParser - Edge Cases and Error Handling', () => {
  let parser: EntityParser;

  beforeEach(() => {
    parser = new EntityParser();
  });

  test('should identify potential edge cases in entity parsing', () => {
    const entities = parser.parseAllEntities();
    
    // Check for entities with very few attributes (potential parsing issues)
    const sparseEntities = entities.filter(e => e.attributes.length <= 1);
    console.log('Entities with 1 or fewer attributes:');
    sparseEntities.forEach(entity => {
      console.log(`  - ${entity.name}: ${entity.attributes.length} attributes`);
      if (entity.attributes.length === 1) {
        console.log(`    Attribute: ${entity.attributes[0].name} (${entity.attributes[0].type})`);
      }
    });

    // Check for entities with duplicate attribute names (parsing bug indicator)
    const entitiesWithDuplicates = entities.filter(entity => {
      const names = entity.attributes.map(a => a.name);
      const uniqueNames = new Set(names);
      return names.length !== uniqueNames.size;
    });

    if (entitiesWithDuplicates.length > 0) {
      console.log('\nEntities with duplicate attributes:');
      entitiesWithDuplicates.forEach(entity => {
        const names = entity.attributes.map(a => a.name);
        const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
        console.log(`  - ${entity.name}: ${duplicates.join(', ')}`);
      });
    } else {
      console.log('\nNo entities with duplicate attributes found.');
    }

    // Check for entities with unusual attribute names (might indicate parsing errors)
    const suspiciousAttributes: string[] = [];
    entities.forEach(entity => {
      entity.attributes.forEach(attr => {
        // Look for attributes that might be malformed
        if (attr.name.includes('**') || attr.name.includes('Description') || attr.name.includes('Type')) {
          suspiciousAttributes.push(`${entity.name}.${attr.name}`);
        }
      });
    });

    if (suspiciousAttributes.length > 0) {
      console.log('\nSuspicious attribute names:');
      suspiciousAttributes.forEach(attr => console.log(`  - ${attr}`));
    } else {
      console.log('\nNo suspicious attribute names found.');
    }

    expect(entities.length).toBeGreaterThan(90);
  });

  test('should check for missing enum values in enumerable types', () => {
    const entities = parser.parseAllEntities();
    
    const enumerableWithoutValues: string[] = [];
    entities.forEach(entity => {
      entity.attributes.forEach(attr => {
        if (attr.type.toLowerCase().includes('enumerable') && (!attr.enumValues || attr.enumValues.length === 0)) {
          enumerableWithoutValues.push(`${entity.name}.${attr.name}`);
        }
      });
    });

    console.log('Enumerable attributes without enum values:');
    enumerableWithoutValues.forEach(attr => console.log(`  - ${attr}`));

    // This is informational - some enumerable types might not have explicit values in the docs
  });

  test('should identify any formatting inconsistencies that might affect parsing', () => {
    const entitiesPath = path.join(
      __dirname,
      '../../../mastodon-documentation/content/en/entities'
    );

    let totalIssues = 0;
    const files = fs.readdirSync(entitiesPath).filter(file => file.endsWith('.md')).slice(0, 10);

    for (const file of files) {
      const filePath = path.join(entitiesPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Look for attribute patterns that might not be parsed
      const attributeHeaders = content.match(/^### `[^`]+`/gm) || [];
      const subAttributeHeaders = content.match(/^#### `[^`]+`/gm) || [];
      
      // Look for malformed headers
      const malformedHeaders = content.match(/^### [^`].*$/gm) || [];
      
      if (malformedHeaders.length > 0) {
        console.log(`${file}: Found ${malformedHeaders.length} potentially malformed headers`);
        malformedHeaders.slice(0, 3).forEach(header => console.log(`  - ${header}`));
        totalIssues += malformedHeaders.length;
      }
    }

    console.log(`Total formatting issues found: ${totalIssues}`);
  });
});