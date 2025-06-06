import { EntityParser, EntityClass, EntityAttribute, MethodParser, ApiMethodsFile, ApiMethod, ApiParameter } from '../generate';
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

describe('MethodParser', () => {
  let methodParser: MethodParser;

  beforeEach(() => {
    methodParser = new MethodParser();
  });

  test('should parse all method files without throwing errors', () => {
    expect(() => {
      const methodFiles = methodParser.parseAllMethods();
      expect(methodFiles).toBeInstanceOf(Array);
      expect(methodFiles.length).toBeGreaterThan(0);
    }).not.toThrow();
  });

  test('should parse method files and extract basic structure', () => {
    const methodFiles = methodParser.parseAllMethods();
    
    // Verify we found method files
    expect(methodFiles.length).toBeGreaterThan(30); // Should be around 40 method files
    
    // Find a specific method file to test
    const appsMethodFile = methodFiles.find(f => f.name.includes('apps'));
    expect(appsMethodFile).toBeDefined();
    
    if (appsMethodFile) {
      expect(appsMethodFile.name).toContain('apps');
      expect(appsMethodFile.description).toContain('OAuth');
      expect(appsMethodFile.methods.length).toBeGreaterThan(0);
      
      // Check that create app method exists
      const createMethod = appsMethodFile.methods.find(method => 
        method.name.toLowerCase().includes('create') && method.endpoint.includes('/api/v1/apps')
      );
      expect(createMethod).toBeDefined();
      
      if (createMethod) {
        expect(createMethod.httpMethod).toBe('POST');
        expect(createMethod.endpoint).toBe('/api/v1/apps');
        expect(createMethod.description).toBeTruthy();
      }
    }
  });

  test('should parse method parameters correctly', () => {
    const methodFiles = methodParser.parseAllMethods();
    
    // Find a method with parameters
    let foundMethodWithParams = false;
    let foundRequiredParam = false;
    
    for (const methodFile of methodFiles) {
      for (const method of methodFile.methods) {
        if (method.parameters && method.parameters.length > 0) {
          foundMethodWithParams = true;
          
          for (const param of method.parameters) {
            expect(param.name).toBeTruthy();
            expect(param.description).toBeTruthy();
            
            if (param.required) {
              foundRequiredParam = true;
            }
          }
        }
      }
    }
    
    expect(foundMethodWithParams).toBe(true);
    expect(foundRequiredParam).toBe(true);
  });

  test('should extract HTTP methods and endpoints correctly', () => {
    const methodFiles = methodParser.parseAllMethods();
    
    // Find some specific methods to verify
    let foundGetMethod = false;
    let foundPostMethod = false;
    let foundDeleteMethod = false;
    
    for (const methodFile of methodFiles) {
      for (const method of methodFile.methods) {
        if (method.httpMethod === 'GET') foundGetMethod = true;
        if (method.httpMethod === 'POST') foundPostMethod = true;
        if (method.httpMethod === 'DELETE') foundDeleteMethod = true;
        
        // Verify endpoint format (all endpoints should start with /)
        expect(method.endpoint).toMatch(/^\//);
      }
    }
    
    expect(foundGetMethod).toBe(true);
    expect(foundPostMethod).toBe(true);
    expect(foundDeleteMethod).toBe(true);
  });
});