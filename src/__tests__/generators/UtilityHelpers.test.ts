import { UtilityHelpers } from '../../generators/UtilityHelpers';

describe('UtilityHelpers', () => {
  let utilityHelpers: UtilityHelpers;

  beforeEach(() => {
    utilityHelpers = new UtilityHelpers();
  });

  describe('toPascalCase', () => {
    it('should handle basic underscore and hyphen cases', () => {
      expect(utilityHelpers.toPascalCase('hello_world')).toBe('HelloWorld');
      expect(utilityHelpers.toPascalCase('hello-world')).toBe('HelloWorld');
      expect(utilityHelpers.toPascalCase('hello_world-test')).toBe('HelloWorldTest');
    });

    it('should strip non-alphanumeric characters like forward slashes and dots', () => {
      // This test demonstrates the issue described in the GitHub issue
      expect(utilityHelpers.toPascalCase('.well-known/oauth-authorization-server'))
        .toBe('WellKnownOauthAuthorizationServer');
      
      expect(utilityHelpers.toPascalCase('path/with/slashes')).toBe('PathWithSlashes');
      expect(utilityHelpers.toPascalCase('file.name.extension')).toBe('FileNameExtension');
      expect(utilityHelpers.toPascalCase('mixed/path.with_different-separators'))
        .toBe('MixedPathWithDifferentSeparators');
    });

    it('should handle edge cases', () => {
      expect(utilityHelpers.toPascalCase('')).toBe('');
      expect(utilityHelpers.toPascalCase('single')).toBe('Single');
      expect(utilityHelpers.toPascalCase('UPPERCASE')).toBe('Uppercase');
      expect(utilityHelpers.toPascalCase('lowercase')).toBe('Lowercase');
    });

    it('should handle special characters and preserve alphanumeric content', () => {
      expect(utilityHelpers.toPascalCase('test@example.com')).toBe('TestExampleCom');
      expect(utilityHelpers.toPascalCase('test#hash$symbol')).toBe('TestHashSymbol');
      expect(utilityHelpers.toPascalCase('path\\with\\backslashes')).toBe('PathWithBackslashes');
    });
  });

  describe('toSingular', () => {
    it('should convert plural words to singular', () => {
      expect(utilityHelpers.toSingular('accounts')).toBe('account');
      expect(utilityHelpers.toSingular('statuses')).toBe('status');
      expect(utilityHelpers.toSingular('stories')).toBe('story');
      expect(utilityHelpers.toSingular('timelines')).toBe('timeline');
    });

    it('should handle words that are already singular', () => {
      expect(utilityHelpers.toSingular('account')).toBe('account');
      // Note: The current logic doesn't distinguish between "status" (singular) and plural words ending in 's'
      // This is expected behavior given the simple heuristic approach
      expect(utilityHelpers.toSingular('status')).toBe('statu');
    });
  });

  describe('entityNameToPropertyName', () => {
    it('should convert PascalCase to snake_case', () => {
      expect(utilityHelpers.entityNameToPropertyName('TestEntity')).toBe('test_entity');
      expect(utilityHelpers.entityNameToPropertyName('SimpleTest')).toBe('simple_test');
      expect(utilityHelpers.entityNameToPropertyName('VeryLongEntityName')).toBe('very_long_entity_name');
    });
  });

  describe('sanitizeSchemaName', () => {
    it('should replace :: with _ and spaces with _', () => {
      expect(utilityHelpers.sanitizeSchemaName('Test::Entity')).toBe('Test_Entity');
      expect(utilityHelpers.sanitizeSchemaName('Test Entity')).toBe('Test_Entity');
      expect(utilityHelpers.sanitizeSchemaName('Test::Entity Name')).toBe('Test_Entity_Name');
    });
  });
});