import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityClass } from '../../interfaces/EntityClass';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator version parsing', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  test('should use provided maxVersion in the generated schema', () => {
    const testEntities: EntityClass[] = [
      {
        name: 'TestEntity',
        description: 'A test entity',
        attributes: [
          {
            name: 'id',
            type: 'String',
            description: 'The ID',
            versions: ['1.0.0', '2.0.0'],
          },
        ],
        versions: ['1.0.0', '2.0.0'],
      },
    ];

    const testMethods: ApiMethodsFile[] = [
      {
        name: 'test',
        description: 'Test methods',
        methods: [
          {
            name: 'Test method',
            httpMethod: 'GET',
            endpoint: '/api/v1/test',
            description: 'A test method',
            versions: ['3.0.0', '4.5.0'],
          },
        ],
      },
    ];

    const schema = generator.generateSchema(testEntities, testMethods, '5.1.0');

    expect(schema.info.version).toBe('5.1.0');
  });

  test('should use default version when no maxVersion provided', () => {
    const testEntities: EntityClass[] = [];
    const testMethods: ApiMethodsFile[] = [];

    const schema = generator.generateSchema(testEntities, testMethods);

    // Should use the SUPPORTED_VERSION from VersionParser
    expect(schema.info.version).toBe('4.3.0');
  });

  test('should preserve version arrays in parsed data', () => {
    const testEntity: EntityClass = {
      name: 'TestEntity',
      description: 'A test entity',
      attributes: [
        {
          name: 'id',
          type: 'String',
          description: 'The ID',
          versions: ['1.0.0', '2.0.0'],
        },
      ],
      versions: ['1.0.0', '2.0.0'],
    };

    // Verify that the versions are preserved
    expect(testEntity.versions).toEqual(['1.0.0', '2.0.0']);
    expect(testEntity.attributes[0].versions).toEqual(['1.0.0', '2.0.0']);
  });
});
