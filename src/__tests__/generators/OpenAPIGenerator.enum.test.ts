import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityClass } from '../../interfaces/EntityClass';

describe('OpenAPIGenerator Enum Support', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('Enumerable type handling', () => {
    it('should generate proper enum values for enumerable attributes', () => {
      const entities: EntityClass[] = [
        {
          name: 'TestEntity',
          description: 'Test entity with enumerable field',
          attributes: [
            {
              name: 'status',
              type: 'String (Enumerable oneOf)',
              description: 'Status of the entity',
              enumValues: ['active', 'inactive', 'pending'],
            },
            {
              name: 'visibility',
              type: 'String (Enumerable oneOf)',
              description: 'Visibility setting',
              enumValues: ['public', 'unlisted', 'private', 'direct'],
            },
            {
              name: 'regularField',
              type: 'String',
              description: 'Regular string field without enum',
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, []);

      // Check that the entity was created
      expect(spec.components?.schemas?.['TestEntity']).toBeDefined();
      const entitySchema = spec.components!.schemas!['TestEntity'];

      // Check that status field has proper enum
      expect(entitySchema.properties?.['status']).toBeDefined();
      const statusProperty = entitySchema.properties!['status'];
      expect(statusProperty.type).toBe('string');
      expect(statusProperty.enum).toEqual(['active', 'inactive', 'pending']);
      expect(statusProperty.description).toBe('Status of the entity');

      // Check that visibility field has proper enum
      expect(entitySchema.properties?.['visibility']).toBeDefined();
      const visibilityProperty = entitySchema.properties!['visibility'];
      expect(visibilityProperty.type).toBe('string');
      expect(visibilityProperty.enum).toEqual([
        'public',
        'unlisted',
        'private',
        'direct',
      ]);
      expect(visibilityProperty.description).toBe('Visibility setting');

      // Check that regular field doesn't have enum
      expect(entitySchema.properties?.['regularField']).toBeDefined();
      const regularProperty = entitySchema.properties!['regularField'];
      expect(regularProperty.type).toBe('string');
      expect(regularProperty.enum).toBeUndefined();
      expect(regularProperty.description).toBe(
        'Regular string field without enum'
      );
    });

    it('should handle attributes without enum values gracefully', () => {
      const entities: EntityClass[] = [
        {
          name: 'TestEntity',
          description: 'Test entity',
          attributes: [
            {
              name: 'oldEnumField',
              type: 'String (Enumerable oneOf)',
              description: 'Field with enumerable type but no values',
              // No enumValues property
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, []);

      // Check that the field still works without enum values
      expect(spec.components?.schemas?.['TestEntity']).toBeDefined();
      const entitySchema = spec.components!.schemas!['TestEntity'];
      expect(entitySchema.properties?.['oldEnumField']).toBeDefined();
      const fieldProperty = entitySchema.properties!['oldEnumField'];
      expect(fieldProperty.type).toBe('string');
      expect(fieldProperty.enum).toBeUndefined(); // Should not have enum if no values
    });
  });
});
