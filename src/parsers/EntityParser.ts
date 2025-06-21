import * as fs from 'fs';
import * as path from 'path';
import { EntityClass } from '../interfaces/EntityClass';
import { EntityFileParser } from './EntityFileParser';
import { MethodEntityParser } from './MethodEntityParser';
import { EntityAttribute } from '../interfaces/EntityAttribute';

class EntityParser {
  private entitiesPath: string;
  private methodsPath: string;

  constructor() {
    this.entitiesPath = path.join(
      __dirname,
      '../../mastodon-documentation/content/en/entities'
    );
    this.methodsPath = path.join(
      __dirname,
      '../../mastodon-documentation/content/en/methods'
    );
  }

  public parseAllEntities(): EntityClass[] {
    const entities: EntityClass[] = [];

    // Parse entities from dedicated entity files
    if (fs.existsSync(this.entitiesPath)) {
      const files = fs
        .readdirSync(this.entitiesPath)
        .filter((file) => file.endsWith('.md'));

      for (const file of files) {
        try {
          const fileEntities = EntityFileParser.parseEntityFile(
            path.join(this.entitiesPath, file)
          );
          if (fileEntities) {
            entities.push(...fileEntities);
          }
        } catch (error) {
          console.error(`Error parsing entity file ${file}:`, error);
        }
      }
    } else {
      console.error(`Entities path does not exist: ${this.entitiesPath}`);
    }

    // Parse entities from method files
    if (fs.existsSync(this.methodsPath)) {
      const methodFiles = fs
        .readdirSync(this.methodsPath)
        .filter((file) => file.endsWith('.md'));

      for (const file of methodFiles) {
        try {
          const methodEntities = MethodEntityParser.parseEntitiesFromMethodFile(
            path.join(this.methodsPath, file)
          );
          if (methodEntities.length > 0) {
            entities.push(...methodEntities);
          }
        } catch (error) {
          console.error(
            `Error parsing entities from method file ${file}:`,
            error
          );
        }
      }
    } else {
      console.error(`Methods path does not exist: ${this.methodsPath}`);
    }

    // Add programmatically created entities
    entities.push(...this.createProgrammaticEntities());

    return entities;
  }

  /**
   * Create entities that are defined programmatically rather than in documentation files
   */
  private createProgrammaticEntities(): EntityClass[] {
    const entities: EntityClass[] = [];
    
    // Create OAuthServerConfiguration entity based on the JSON response in oauth.md
    entities.push(this.createOAuthServerConfigurationEntity());
    
    return entities;
  }

  /**
   * Create the OAuthServerConfiguration entity based on the OAuth server metadata specification
   */
  private createOAuthServerConfigurationEntity(): EntityClass {
    const attributes: EntityAttribute[] = [
      {
        name: 'issuer',
        type: 'String (URL)',
        optional: false,
        description: "The authorization server's issuer identifier, which is typically a HTTPS URL."
      },
      {
        name: 'service_documentation',
        type: 'String (URL)',
        optional: false,
        description: "URL of the authorization server's human-readable documentation."
      },
      {
        name: 'authorization_endpoint',
        type: 'String (URL)',
        optional: false,
        description: "URL of the authorization server's authorization endpoint."
      },
      {
        name: 'token_endpoint',
        type: 'String (URL)',
        optional: false,
        description: "URL of the authorization server's token endpoint."
      },
      {
        name: 'app_registration_endpoint',
        type: 'String (URL)',
        optional: false,
        description: "URL of the authorization server's application registration endpoint (non-standard extension)."
      },
      {
        name: 'revocation_endpoint',
        type: 'String (URL)',
        optional: false,
        description: "URL of the authorization server's token revocation endpoint."
      },
      {
        name: 'scopes_supported',
        type: 'Array of String',
        optional: false,
        description: 'Array of OAuth 2.0 scope values that this authorization server supports.'
      },
      {
        name: 'response_types_supported',
        type: 'Array of String',
        optional: false,
        description: 'Array of OAuth 2.0 response_type values that this authorization server supports.'
      },
      {
        name: 'response_modes_supported',
        type: 'Array of String',
        optional: false,
        description: 'Array of OAuth 2.0 response_mode values that this authorization server supports.'
      },
      {
        name: 'code_challenge_methods_supported',
        type: 'Array of String',
        optional: false,
        description: 'Array of PKCE code challenge methods supported by this authorization server.'
      },
      {
        name: 'grant_types_supported',
        type: 'Array of String',
        optional: false,
        description: 'Array of OAuth 2.0 grant type values that this authorization server supports.'
      },
      {
        name: 'token_endpoint_auth_methods_supported',
        type: 'Array of String',
        optional: false,
        description: 'Array of client authentication methods supported by this token endpoint.'
      }
    ];

    return {
      name: 'OAuthServerConfiguration',
      description: 'Represents OAuth 2 Authorization Server Metadata for the Mastodon server.',
      attributes,
      example: {
        "issuer": "https://social.example/",
        "service_documentation": "https://docs.joinmastodon.org/",
        "authorization_endpoint": "https://social.example/oauth/authorize",
        "token_endpoint": "https://social.example/oauth/token",
        "app_registration_endpoint": "https://social.example/api/v1/apps",
        "revocation_endpoint": "https://social.example/oauth/revoke",
        "scopes_supported": [
          "read", "write", "write:accounts", "write:blocks", "write:bookmarks",
          "write:conversations", "write:favourites", "write:filters", "write:follows",
          "write:lists", "write:media", "write:mutes", "write:notifications",
          "write:reports", "write:statuses", "read:accounts", "read:blocks",
          "read:bookmarks", "read:favourites", "read:filters", "read:follows",
          "read:lists", "read:mutes", "read:notifications", "read:search",
          "read:statuses", "follow", "push", "profile", "admin:read",
          "admin:read:accounts", "admin:read:reports", "admin:read:domain_allows",
          "admin:read:domain_blocks", "admin:read:ip_blocks", "admin:read:email_domain_blocks",
          "admin:read:canonical_email_blocks", "admin:write", "admin:write:accounts",
          "admin:write:reports", "admin:write:domain_allows", "admin:write:domain_blocks",
          "admin:write:ip_blocks", "admin:write:email_domain_blocks",
          "admin:write:canonical_email_blocks"
        ],
        "response_types_supported": ["code"],
        "response_modes_supported": ["query", "fragment", "form_post"],
        "code_challenge_methods_supported": ["S256"],
        "grant_types_supported": ["authorization_code", "client_credentials"],
        "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"]
      }
    };
  }
}

export { EntityParser };
