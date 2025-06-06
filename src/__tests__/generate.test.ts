// Test backward compatibility of the main generate file exports
import { EntityParser, EntityClass, EntityAttribute, MethodParser, ApiMethodsFile, ApiMethod, ApiParameter } from '../generate';

describe('Generate module backward compatibility', () => {
  test('should export all interfaces and classes', () => {
    // Test that all exports are available from the main module
    expect(EntityParser).toBeDefined();
    expect(MethodParser).toBeDefined();
    
    // Test that interfaces can be used (they should be defined types)
    const parser = new EntityParser();
    expect(parser).toBeInstanceOf(EntityParser);
    
    const methodParser = new MethodParser();
    expect(methodParser).toBeInstanceOf(MethodParser);
  });

  test('should maintain existing API surface', () => {
    // Ensure backward compatibility by testing that existing imports still work
    const parser = new EntityParser();
    const entities = parser.parseAllEntities();
    expect(entities).toBeInstanceOf(Array);
    
    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();
    expect(methodFiles).toBeInstanceOf(Array);
  });
});