import { EntityParser, EntityClass, EntityAttribute } from '../generate';
import * as fs from 'fs';
import * as path from 'path';

describe('EntityParser', () => {
  let parser: EntityParser;

  beforeEach(() => {
    parser = new EntityParser();
  });

  test('should parse all entities without throwing errors', () => {
    expect(() => {
      const entities = parser.parseAllEntities();
      expect(entities).toBeInstanceOf(Array);
      expect(entities.length).toBeGreaterThan(0);
    }).not.toThrow();
  });

  test('should parse entities and extract basic structure', () => {
    const entities = parser.parseAllEntities();
    
    // Verify we found entities
    expect(entities.length).toBeGreaterThan(50); // Should be around 64 entities
    
    // Find a specific entity to test
    const accountEntity = entities.find(e => e.name === 'Account');
    expect(accountEntity).toBeDefined();
    
    if (accountEntity) {
      expect(accountEntity.name).toBe('Account');
      expect(accountEntity.description).toContain('user of Mastodon');
      expect(accountEntity.attributes.length).toBeGreaterThan(20); // Account has many attributes
      
      // Check some specific attributes exist
      const idAttribute = accountEntity.attributes.find(attr => attr.name === 'id');
      expect(idAttribute).toBeDefined();
      expect(idAttribute?.type).toContain('String');
      
      const usernameAttribute = accountEntity.attributes.find(attr => attr.name === 'username');
      expect(usernameAttribute).toBeDefined();
      expect(usernameAttribute?.type).toBe('String');
    }
  });

  test('should correctly identify optional and deprecated attributes', () => {
    const entities = parser.parseAllEntities();
    
    // Find entities with optional/deprecated attributes
    let foundOptional = false;
    let foundDeprecated = false;
    
    for (const entity of entities) {
      for (const attr of entity.attributes) {
        if (attr.optional) foundOptional = true;
        if (attr.deprecated) foundDeprecated = true;
      }
    }
    
    expect(foundOptional).toBe(true);
    expect(foundDeprecated).toBe(true);
  });

  test('should parse entity with simple structure', () => {
    const entities = parser.parseAllEntities();
    
    // Find Application entity which has a simpler structure
    const applicationEntity = entities.find(e => e.name === 'Application');
    expect(applicationEntity).toBeDefined();
    
    if (applicationEntity) {
      expect(applicationEntity.name).toBe('Application');
      expect(applicationEntity.description).toContain('interfaces with the REST API');
      expect(applicationEntity.attributes.length).toBeGreaterThan(0);
      
      // Check that name attribute exists
      const nameAttribute = applicationEntity.attributes.find(attr => attr.name === 'name');
      expect(nameAttribute).toBeDefined();
      expect(nameAttribute?.type).toBe('String');
    }
  });
});