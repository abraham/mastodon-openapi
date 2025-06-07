interface OAuthScope {
  name: string;
  description: string;
  deprecated?: boolean;
}

interface OAuthScopeCollection {
  scopes: OAuthScope[];
}

export { OAuthScope, OAuthScopeCollection };
