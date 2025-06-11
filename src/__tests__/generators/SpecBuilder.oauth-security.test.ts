import { SpecBuilder } from '../../generators/SpecBuilder';

describe('SpecBuilder OAuth Security Descriptions', () => {
  let specBuilder: SpecBuilder;

  beforeEach(() => {
    specBuilder = new SpecBuilder();
  });

  test('should include comprehensive OAuth2 security scheme description', () => {
    const spec = specBuilder.buildInitialSpec();
    
    expect(spec.components?.securitySchemes?.OAuth2).toBeDefined();
    
    const oauthScheme = spec.components?.securitySchemes?.OAuth2;
    expect(oauthScheme?.type).toBe('oauth2');
    expect(oauthScheme?.description).toContain('OAuth 2.0 authentication flows for Mastodon API');
    expect(oauthScheme?.description).toContain('authorization code flow for user tokens');
    expect(oauthScheme?.description).toContain('client credentials flow for application tokens');
    expect(oauthScheme?.description).toContain('Doorkeeper');
    expect(oauthScheme?.description).toContain('RFC 6749');
    expect(oauthScheme?.description).toContain('PKCE');
    expect(oauthScheme?.description).toContain('RFC 7636');
  });

  test('should include comprehensive BearerAuth security scheme description', () => {
    const spec = specBuilder.buildInitialSpec();
    
    expect(spec.components?.securitySchemes?.BearerAuth).toBeDefined();
    
    const bearerScheme = spec.components?.securitySchemes?.BearerAuth;
    expect(bearerScheme?.type).toBe('http');
    expect(bearerScheme?.scheme).toBe('bearer');
    expect(bearerScheme?.description).toContain('Bearer token authentication using OAuth access tokens');
    expect(bearerScheme?.description).toContain('User tokens (obtained via authorization code flow)');
    expect(bearerScheme?.description).toContain('App tokens (obtained via client credentials flow)');
    expect(bearerScheme?.description).toContain('Authorization header');
    expect(bearerScheme?.description).toContain('Bearer <access_token>');
  });

  test('should not include bearerFormat for BearerAuth since Mastodon tokens are not JWTs', () => {
    const spec = specBuilder.buildInitialSpec();
    
    const bearerScheme = spec.components?.securitySchemes?.BearerAuth as any;
    expect(bearerScheme?.bearerFormat).toBeUndefined();
  });

  test('should include both authorizationCode and clientCredentials flows', () => {
    const spec = specBuilder.buildInitialSpec();
    
    const oauthScheme = spec.components?.securitySchemes?.OAuth2 as any;
    expect(oauthScheme?.flows?.authorizationCode).toBeDefined();
    expect(oauthScheme?.flows?.clientCredentials).toBeDefined();
    
    expect(oauthScheme?.flows?.authorizationCode?.authorizationUrl).toBe('https://mastodon.example/oauth/authorize');
    expect(oauthScheme?.flows?.authorizationCode?.tokenUrl).toBe('https://mastodon.example/oauth/token');
    expect(oauthScheme?.flows?.clientCredentials?.tokenUrl).toBe('https://mastodon.example/oauth/token');
  });

  test('should have different scopes for authorizationCode vs clientCredentials flows', () => {
    const spec = specBuilder.buildInitialSpec();
    
    const oauthScheme = spec.components?.securitySchemes?.OAuth2 as any;
    const authCodeScopes = oauthScheme?.flows?.authorizationCode?.scopes;
    const clientCredScopes = oauthScheme?.flows?.clientCredentials?.scopes;
    
    // Authorization code flow should have more scopes including user-specific ones  
    expect(Object.keys(authCodeScopes).length).toBeGreaterThan(Object.keys(clientCredScopes).length);
    
    // Both should have basic read/write scopes
    expect(authCodeScopes?.read).toBeDefined();
    expect(authCodeScopes?.write).toBeDefined();
    expect(clientCredScopes?.read).toBeDefined();
    expect(clientCredScopes?.write).toBeDefined();
    
    // Client credentials flow should not have notification scopes (user-specific)
    expect(clientCredScopes?.['read:notifications']).toBeUndefined();
    expect(clientCredScopes?.['write:notifications']).toBeUndefined();
  });
});