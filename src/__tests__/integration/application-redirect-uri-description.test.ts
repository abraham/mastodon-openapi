import { EntityParser } from '../../parsers/EntityParser';

describe('Integration test - Application redirect_uri description', () => {
  it('should parse the full redirect_uri description from Application entity', () => {
    const entityParser = new EntityParser();
    const entities = entityParser.parseAllEntities();

    const applicationEntity = entities.find(
      (entity) => entity.name === 'Application'
    );
    expect(applicationEntity).toBeDefined();

    const redirectUriAttr = applicationEntity?.attributes.find(
      (attr) => attr.name === 'redirect_uri'
    );
    expect(redirectUriAttr).toBeDefined();

    // Verify the full description is captured including the newline reference
    expect(redirectUriAttr?.description).toContain('May contain');
    expect(redirectUriAttr?.description).toContain('\\n');
    expect(redirectUriAttr?.description).toContain(
      'characters when multiple redirect URIs are registered'
    );

    // Check that it doesn't contain any version history content
    expect(redirectUriAttr?.description).not.toContain('4.3.0');
    expect(redirectUriAttr?.description).not.toContain('deprecated in favour');
  });
});
