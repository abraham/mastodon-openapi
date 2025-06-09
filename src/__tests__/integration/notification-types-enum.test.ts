import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { MethodParser } from '../../parsers/MethodParser';
import { EntityParser } from '../../parsers/EntityParser';

describe('Notification Type Parameter Enum', () => {
  it('should have enum constraints on notification types parameters', () => {
    const methodParser = new MethodParser();
    const entityParser = new EntityParser();
    const generator = new OpenAPIGenerator();

    // Parse all methods and entities
    const methodFiles = methodParser.parseAllMethods();
    const entities = entityParser.parseAllEntities();

    // Generate the OpenAPI schema
    const schema = generator.generateSchema(entities, methodFiles);

    // Check that the notifications endpoint exists
    expect(schema.paths['/api/v1/notifications']).toBeDefined();
    expect(schema.paths['/api/v1/notifications'].get).toBeDefined();

    const operation = schema.paths['/api/v1/notifications'].get!;
    expect(operation.parameters).toBeDefined();

    // Find the types parameter
    const typesParam = operation.parameters?.find(p => p.name === 'types');
    expect(typesParam).toBeDefined();
    
    // Check if it has enum constraints (this will currently fail)
    expect(typesParam?.schema?.items).toBeDefined();
    
    // This is what we want to achieve - the parameter should have enum values
    // matching the Notification entity's type field
    const expectedEnumValues = [
      'mention',
      'status',
      'reblog', 
      'follow',
      'follow_request',
      'favourite',
      'poll',
      'update',
      'admin.sign_up',
      'admin.report',
      'severed_relationships',
      'moderation_warning'
    ];
    
    // This test will initially fail, showing the issue
    expect(typesParam?.schema?.items?.enum).toEqual(expectedEnumValues);
  });

  it('should have enum constraints on exclude_types parameter', () => {
    const methodParser = new MethodParser();
    const entityParser = new EntityParser();
    const generator = new OpenAPIGenerator();

    // Parse all methods and entities
    const methodFiles = methodParser.parseAllMethods();
    const entities = entityParser.parseAllEntities();

    // Generate the OpenAPI schema
    const schema = generator.generateSchema(entities, methodFiles);

    const operation = schema.paths['/api/v1/notifications'].get!;
    
    // Find the exclude_types parameter
    const excludeTypesParam = operation.parameters?.find(p => p.name === 'exclude_types');
    expect(excludeTypesParam).toBeDefined();
    
    // Check if it has enum constraints (this will currently fail)
    expect(excludeTypesParam?.schema?.items).toBeDefined();
    
    const expectedEnumValues = [
      'mention',
      'status',
      'reblog', 
      'follow',
      'follow_request',
      'favourite',
      'poll',
      'update',
      'admin.sign_up',
      'admin.report',
      'severed_relationships',
      'moderation_warning'
    ];
    
    // This test will initially fail, showing the issue
    expect(excludeTypesParam?.schema?.items?.enum).toEqual(expectedEnumValues);
  });
});