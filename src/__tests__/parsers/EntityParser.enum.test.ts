import { EntityParser } from '../../parsers/EntityParser';

describe('EntityParser Enum Support', () => {
  let parser: EntityParser;

  beforeEach(() => {
    parser = new EntityParser();
  });

  describe('Enum value extraction', () => {
    it('should extract enum values from Status entity visibility field', () => {
      const entities = parser.parseAllEntities();
      const statusEntity = entities.find(e => e.name === 'Status');
      
      expect(statusEntity).toBeDefined();
      if (statusEntity) {
        const visibilityAttr = statusEntity.attributes.find(a => a.name === 'visibility');
        
        expect(visibilityAttr).toBeDefined();
        if (visibilityAttr) {
          expect(visibilityAttr.type).toBe('String (Enumerable oneOf)');
          expect(visibilityAttr.description).toBe('Visibility of this status.');
          expect(visibilityAttr.enumValues).toEqual(['public', 'unlisted', 'private', 'direct']);
        }
      }
    });

    it('should not extract enum values for non-enumerable fields', () => {
      const entities = parser.parseAllEntities();
      const statusEntity = entities.find(e => e.name === 'Status');
      
      expect(statusEntity).toBeDefined();
      if (statusEntity) {
        const contentAttr = statusEntity.attributes.find(a => a.name === 'content');
        
        expect(contentAttr).toBeDefined();
        if (contentAttr) {
          expect(contentAttr.type).toBe('String (HTML)');
          expect(contentAttr.enumValues).toBeUndefined();
        }
      }
    });
  });
});