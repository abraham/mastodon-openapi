import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityClass } from '../../interfaces/EntityClass';

describe('OpenAPIGenerator enum tallying integration', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should track duplicate enums across entities during schema generation', () => {
    const entities: EntityClass[] = [
      {
        name: 'Filter',
        description: 'A filter',
        attributes: [
          {
            name: 'context',
            type: 'Array of String (Enumerable, anyOf)',
            description: 'The contexts.',
            enumValues: ['home', 'notifications', 'public'],
          },
        ],
      },
      {
        name: 'V1_Filter',
        description: 'A V1 filter',
        attributes: [
          {
            name: 'context',
            type: 'Array of String (Enumerable anyOf)',
            description: 'The contexts.',
            enumValues: ['home', 'notifications', 'public'],
          },
        ],
      },
    ];

    // Generate schema which should track enums
    generator.generateSchema(entities, []);

    // Get the enum tally generator and check duplicates
    const enumTally = generator.getEnumTallyGenerator();
    const duplicates = enumTally.getDuplicateEnums();

    // Should find the duplicate context enum
    expect(duplicates.length).toBeGreaterThan(0);

    // Find the specific duplicate we expect
    const contextDuplicate = duplicates.find(
      (d) =>
        JSON.stringify(d.enumValues.sort()) ===
        JSON.stringify(['home', 'notifications', 'public'])
    );

    expect(contextDuplicate).toBeDefined();
    expect(contextDuplicate!.occurrences.length).toBeGreaterThanOrEqual(2);

    // Check that entity names are tracked
    const entityNames = contextDuplicate!.occurrences.map(
      (occ) => occ.entityName
    );
    expect(entityNames).toContain('Filter');
    expect(entityNames).toContain('V1_Filter');
  });

  it('should generate markdown with duplicate enum information', () => {
    const entities: EntityClass[] = [
      {
        name: 'StatusA',
        description: 'Status A',
        attributes: [
          {
            name: 'visibility',
            type: 'String (Enumerable)',
            description: 'Visibility.',
            enumValues: ['public', 'unlisted', 'private', 'direct'],
          },
        ],
      },
      {
        name: 'StatusB',
        description: 'Status B',
        attributes: [
          {
            name: 'visibility',
            type: 'String (Enumerable)',
            description: 'Visibility.',
            enumValues: ['public', 'unlisted', 'private', 'direct'],
          },
        ],
      },
    ];

    generator.generateSchema(entities, []);
    const markdown = generator.getEnumTallyGenerator().generateEnumsMarkdown();

    expect(markdown).toContain('# Enum Duplicates');
    expect(markdown).toContain('public, unlisted, private, ... (4 values)');
    expect(markdown).toContain('StatusA');
    expect(markdown).toContain('StatusB');
    expect(markdown).toContain('visibility');
  });
});
