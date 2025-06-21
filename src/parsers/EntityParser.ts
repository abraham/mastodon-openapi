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
    const attributes = this.parseOAuthServerConfigurationFromDoc();

    const example = this.parseOAuthServerConfigurationExample();

    return {
      name: 'OAuthServerConfiguration',
      description: 'Represents OAuth 2 Authorization Server Metadata for the Mastodon server.',
      attributes,
      example,
    };
  }

  /**
   * Parse OAuth Server Configuration attributes from the oauth.md file
   */
  private parseOAuthServerConfigurationFromDoc(): EntityAttribute[] {
    const oauthFilePath = path.join(this.methodsPath, 'oauth.md');
    
    if (!fs.existsSync(oauthFilePath)) {
      console.warn('oauth.md file not found, falling back to default attributes');
      return this.getDefaultOAuthServerConfigurationAttributes();
    }

    try {
      const content = fs.readFileSync(oauthFilePath, 'utf-8');
      
      // Find the JSON response example in the oauth.md file
      // Look for the JSON block after "##### 200: OK" in the OAuth authorization server metadata section
      const jsonMatch = content.match(/## Discover OAuth Server Configuration[\s\S]*?##### 200: OK[\s\S]*?```json\s*([\s\S]*?)\s*```/);
      
      if (!jsonMatch) {
        console.warn('Could not find OAuth Server Configuration JSON example, falling back to default attributes');
        return this.getDefaultOAuthServerConfigurationAttributes();
      }

      const jsonString = jsonMatch[1].trim();
      const jsonData = JSON.parse(jsonString);
      
      return this.generateAttributesFromJson(jsonData);
      
    } catch (error) {
      console.error('Error parsing OAuth Server Configuration from oauth.md:', error);
      return this.getDefaultOAuthServerConfigurationAttributes();
    }
  }

  /**
   * Parse OAuth Server Configuration example from the oauth.md file
   */
  private parseOAuthServerConfigurationExample(): any | undefined {
    const oauthFilePath = path.join(this.methodsPath, 'oauth.md');
    
    if (!fs.existsSync(oauthFilePath)) {
      return undefined;
    }

    try {
      const content = fs.readFileSync(oauthFilePath, 'utf-8');
      
      // Find the JSON response example
      const jsonMatch = content.match(/## Discover OAuth Server Configuration[\s\S]*?##### 200: OK[\s\S]*?```json\s*([\s\S]*?)\s*```/);
      
      if (!jsonMatch) {
        return undefined;
      }

      const jsonString = jsonMatch[1].trim();
      return JSON.parse(jsonString);
      
    } catch (error) {
      console.error('Error parsing OAuth Server Configuration example from oauth.md:', error);
      return undefined;
    }
  }

  /**
   * Generate EntityAttribute array from parsed JSON data
   */
  private generateAttributesFromJson(jsonData: any): EntityAttribute[] {
    const attributes: EntityAttribute[] = [];
    
    for (const [key, value] of Object.entries(jsonData)) {
      let type: string;
      let description: string;
      
      if (Array.isArray(value)) {
        type = 'Array of String';
        description = this.generateDescriptionForProperty(key, 'array');
      } else if (typeof value === 'string') {
        // Check if the value looks like a URL
        if (key.includes('endpoint') || key.includes('uri') || key === 'issuer' || key.includes('documentation')) {
          type = 'String (URL)';
          description = this.generateDescriptionForProperty(key, 'url');
        } else {
          type = 'String';
          description = this.generateDescriptionForProperty(key, 'string');
        }
      } else {
        type = 'String';
        description = this.generateDescriptionForProperty(key, 'string');
      }
      
      attributes.push({
        name: key,
        type,
        optional: false,
        description,
      });
    }
    
    return attributes;
  }

  /**
   * Generate appropriate description for OAuth server configuration properties
   */
  private generateDescriptionForProperty(propertyName: string, type: 'array' | 'url' | 'string'): string {
    const descriptions: Record<string, string> = {
      'issuer': "The authorization server's issuer identifier, which is typically a HTTPS URL.",
      'service_documentation': "URL of the authorization server's human-readable documentation.",
      'authorization_endpoint': "URL of the authorization server's authorization endpoint.",
      'token_endpoint': "URL of the authorization server's token endpoint.",
      'app_registration_endpoint': "URL of the authorization server's application registration endpoint (non-standard extension).",
      'revocation_endpoint': "URL of the authorization server's token revocation endpoint.",
      'scopes_supported': 'Array of OAuth 2.0 scope values that this authorization server supports.',
      'response_types_supported': 'Array of OAuth 2.0 response_type values that this authorization server supports.',
      'response_modes_supported': 'Array of OAuth 2.0 response_mode values that this authorization server supports.',
      'code_challenge_methods_supported': 'Array of PKCE code challenge methods supported by this authorization server.',
      'grant_types_supported': 'Array of OAuth 2.0 grant type values that this authorization server supports.',
      'token_endpoint_auth_methods_supported': 'Array of client authentication methods supported by this token endpoint.',
    };

    if (descriptions[propertyName]) {
      return descriptions[propertyName];
    }

    // Generate a generic description based on the property name and type
    if (type === 'array') {
      return `Array of values for ${propertyName.replace(/_/g, ' ')}.`;
    } else if (type === 'url') {
      return `URL for ${propertyName.replace(/_/g, ' ')}.`;
    } else {
      return `Value for ${propertyName.replace(/_/g, ' ')}.`;
    }
  }

  /**
   * Fallback attributes in case parsing from documentation fails
   */
  private getDefaultOAuthServerConfigurationAttributes(): EntityAttribute[] {
    return [
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
  }
}

export { EntityParser };
