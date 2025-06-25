import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { EntityClass } from '../../interfaces/EntityClass';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('EntityConverter - hide_collections nullable issue', () => {
  let entityConverter: EntityConverter;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    entityConverter = new EntityConverter(typeParser, utilityHelpers);
  });

  test('hide_collections should be nullable and not in required array', () => {
    // Simulating Account entity with hide_collections field
    const mockEntity: EntityClass = {
      name: 'Account',
      description: 'Account entity',
      attributes: [
        {
          name: 'id',
          type: 'String',
          description: 'The account id',
        },
        {
          name: 'username',
          type: 'String',
          description: 'The username',
        },
        {
          name: 'hide_collections',
          type: 'Boolean',
          description:
            'Whether the user hides the contents of their follows and followers collections',
          nullable: true, // This should make it not required
        },
      ],
    };

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    entityConverter.convertEntities([mockEntity], spec);

    const schema = spec.components?.schemas?.Account;
    expect(schema).toBeDefined();

    // hide_collections should be present and nullable
    expect(schema?.properties?.hide_collections).toBeDefined();
    expect(schema?.properties?.hide_collections?.type).toEqual(['boolean', 'null']);

    // CRITICAL: hide_collections should NOT be in the required array
    expect(schema?.required).not.toContain('hide_collections');

    // Other non-nullable fields should be in required array
    expect(schema?.required).toContain('id');
    expect(schema?.required).toContain('username');
  });

  test('nullable field without optional flag should still not be required', () => {
    const mockEntity: EntityClass = {
      name: 'TestEntity',
      description: 'Test entity',
      attributes: [
        {
          name: 'required_field',
          type: 'String',
          description: 'A required field',
        },
        {
          name: 'nullable_field',
          type: 'String',
          description: 'A nullable field',
          nullable: true, // nullable but not explicitly optional
        },
      ],
    };

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    entityConverter.convertEntities([mockEntity], spec);

    const schema = spec.components?.schemas?.TestEntity;

    // nullable field should not be in required even if not marked as optional
    expect(schema?.required).toContain('required_field');
    expect(schema?.required).not.toContain('nullable_field');
  });
});
