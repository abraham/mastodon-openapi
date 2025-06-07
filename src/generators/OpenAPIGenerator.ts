import { EntityClass } from '../interfaces/EntityClass';
import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';
import { ApiMethod } from '../interfaces/ApiMethod';
import { EntityAttribute } from '../interfaces/EntityAttribute';
import { ApiParameter } from '../interfaces/ApiParameter';
import {
  OpenAPISpec,
  OpenAPISchema,
  OpenAPIProperty,
  OpenAPIOperation,
  OpenAPIPath,
} from '../interfaces/OpenAPISchema';

class OpenAPIGenerator {
  private spec: OpenAPISpec;

  constructor() {
    this.spec = {
      openapi: '3.0.3',
      info: {
        title: 'Mastodon API',
        version: '4.2.0',
        description: 'Documentation for the Mastodon API',
      },
      servers: [
        {
          url: 'https://mastodon.example',
          description: 'Production server',
        },
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          OAuth2: {
            type: 'oauth2',
            description: 'OAuth 2.0 authentication',
            flows: {
              authorizationCode: {
                authorizationUrl: 'https://mastodon.example/oauth/authorize',
                tokenUrl: 'https://mastodon.example/oauth/token',
                scopes: {
                  read: 'Read access',
                  write: 'Write access',
                  follow: 'Follow/unfollow accounts',
                  push: 'Push notifications',
                },
              },
              clientCredentials: {
                tokenUrl: 'https://mastodon.example/oauth/token',
                scopes: {
                  read: 'Read access',
                  write: 'Write access',
                },
              },
            },
          },
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Bearer token authentication',
          },
        },
      },
    };
  }

  public generateSchema(
    entities: EntityClass[],
    methodFiles: ApiMethodsFile[]
  ): OpenAPISpec {
    // Convert entities to OpenAPI schemas
    this.convertEntities(entities);

    // Convert methods to OpenAPI paths
    this.convertMethods(methodFiles);

    return this.spec;
  }

  private convertEntities(entities: EntityClass[]): void {
    if (!this.spec.components?.schemas) {
      this.spec.components = { schemas: {} };
    }

    for (const entity of entities) {
      const schema: OpenAPISchema = {
        type: 'object',
        description: entity.description,
        properties: {},
        required: [],
      };

      for (const attribute of entity.attributes) {
        const property = this.convertAttribute(attribute);
        if (schema.properties) {
          schema.properties[attribute.name] = property;
        }

        // Add to required array if not optional
        if (!attribute.optional && schema.required) {
          schema.required.push(attribute.name);
        }
      }

      // Remove empty required array
      if (schema.required && schema.required.length === 0) {
        delete schema.required;
      }

      if (this.spec.components?.schemas) {
        const sanitizedName = this.sanitizeSchemaName(entity.name);
        this.spec.components.schemas[sanitizedName] = schema;
      }
    }
  }

  private sanitizeSchemaName(name: string): string {
    // Replace :: with _ and spaces with _ to make schema names OpenAPI compliant
    // OpenAPI schema names must match ^[a-zA-Z0-9\.\-_]+$
    return name.replace(/::/g, '_').replace(/\s+/g, '_');
  }

  private convertAttribute(attribute: EntityAttribute): OpenAPIProperty {
    const property: OpenAPIProperty = {
      description: attribute.description,
    };

    if (attribute.deprecated) {
      property.deprecated = true;
    }

    // Parse type information to determine OpenAPI type
    const type = this.parseType(attribute.type);

    if (type.type) {
      property.type = type.type;
    }
    if (type.format) {
      property.format = type.format;
    }
    if (type.items) {
      property.items = type.items;
    }
    if (type.$ref) {
      property.$ref = type.$ref;
    }

    // Use enum values from attribute if available, otherwise from type parsing
    if (attribute.enumValues && attribute.enumValues.length > 0) {
      property.enum = attribute.enumValues;
    } else if (type.enum) {
      property.enum = type.enum;
    }

    return property;
  }

  private parseType(typeString: string): OpenAPIProperty {
    const cleanType = typeString.toLowerCase().trim();

    // Handle arrays
    if (cleanType.includes('array of')) {
      const itemTypeMatch = typeString.match(/array of\s+(.+?)(?:\s|$)/i);
      if (itemTypeMatch) {
        const itemType = this.parseType(itemTypeMatch[1]);
        return {
          type: 'array',
          items: itemType,
        };
      }
      return { type: 'array' };
    }

    // Handle references to other entities (only for actual entity names, not documentation links)
    if (typeString.includes('[') && typeString.includes(']')) {
      const refMatch = typeString.match(/\[([^\]]+)\]/);
      if (refMatch) {
        const refName = refMatch[1];

        // Only treat as entity reference if it's an actual entity name
        // Skip documentation references like "Datetime", "Date", etc.
        const isDocumentationLink =
          refName.toLowerCase().includes('/') ||
          refName.toLowerCase() === 'datetime' ||
          refName.toLowerCase() === 'date';

        if (!isDocumentationLink) {
          // Clean up reference name and sanitize for OpenAPI compliance
          const cleanRefName = refName.replace(/[^\w:]/g, '');
          const sanitizedRefName = this.sanitizeSchemaName(cleanRefName);
          return {
            $ref: `#/components/schemas/${sanitizedRefName}`,
          };
        }
      }
    }

    // Handle basic types
    if (cleanType.includes('string')) {
      const property: OpenAPIProperty = { type: 'string' };

      if (cleanType.includes('url')) {
        property.format = 'uri';
      } else if (cleanType.includes('datetime')) {
        property.format = 'date-time';
      } else if (cleanType.includes('date')) {
        property.format = 'date';
      } else if (cleanType.includes('email')) {
        property.format = 'email';
      } else if (cleanType.includes('html')) {
        property.description = (property.description || '') + ' (HTML content)';
      }

      return property;
    }

    if (
      cleanType.includes('integer') ||
      cleanType.includes('cast from an integer')
    ) {
      return { type: 'integer' };
    }

    if (cleanType.includes('boolean')) {
      return { type: 'boolean' };
    }

    if (cleanType.includes('number') || cleanType.includes('float')) {
      return { type: 'number' };
    }

    if (cleanType.includes('hash') || cleanType.includes('object')) {
      return { type: 'object' };
    }

    // Handle enums
    if (cleanType.includes('enumerable') || cleanType.includes('oneof')) {
      return {
        type: 'string',
        description: typeString.includes('Enumerable')
          ? 'Enumerable value'
          : '',
      };
    }

    // Default to string for unknown types
    return {
      type: 'string',
      description: `Original type: ${typeString}`,
    };
  }

  private convertMethods(methodFiles: ApiMethodsFile[]): void {
    for (const methodFile of methodFiles) {
      for (const method of methodFile.methods) {
        this.convertMethod(method, methodFile.name);
      }
    }
  }

  private generateOperationId(httpMethod: string, endpoint: string): string {
    // Convert HTTP method to lowercase
    const method = httpMethod.toLowerCase();

    // Extract API version and path
    const versionMatch = endpoint.match(
      /^\/api\/(v\d+(?:\.\d+)?(?:_alpha)?)\/(.*)$/
    );
    if (!versionMatch) {
      // Fallback if no version found
      const path = endpoint.replace(/^\/api\//, '');
      return method + this.toPascalCase(path);
    }

    const [, version, pathAfterVersion] = versionMatch;
    const segments = pathAfterVersion
      .split('/')
      .filter((segment) => segment.length > 0);

    if (segments.length === 0) {
      return method;
    }

    // Generate base operation name
    let baseOperationId = this.generateBaseOperationId(method, segments);

    // Add version suffix if it's not v1 or if there might be conflicts
    if (version !== 'v1' || this.hasVersionConflicts(pathAfterVersion)) {
      const versionSuffix = this.normalizeVersion(version);
      baseOperationId += versionSuffix;
    }

    return baseOperationId;
  }

  private generateBaseOperationId(method: string, segments: string[]): string {
    // Handle different patterns
    if (segments.length === 1) {
      // Simple resource: /accounts -> getAccounts
      return method + this.toPascalCase(segments[0]);
    }

    // Check for path parameters
    const hasPathParams = segments.some(
      (segment) => segment.startsWith('{') && segment.endsWith('}')
    );

    if (hasPathParams) {
      // Handle path parameters
      if (segments.length === 2 && segments[1] === '{id}') {
        // Pattern like /accounts/{id} -> getAccountById
        const resource = segments[0];
        let singular = resource;

        // Handle common plural forms
        if (resource.endsWith('ies')) {
          singular = resource.slice(0, -3) + 'y'; // stories -> story
        } else if (resource.endsWith('es')) {
          singular = resource.slice(0, -2); // statuses -> status
        } else if (resource.endsWith('s')) {
          singular = resource.slice(0, -1); // accounts -> account
        }

        return method + this.toPascalCase(singular) + 'ById';
      } else {
        // More complex path with parameters
        const pathParts: string[] = [];
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          if (segment.startsWith('{') && segment.endsWith('}')) {
            const paramName = segment.slice(1, -1);
            pathParts.push('By' + this.toPascalCase(paramName));
          } else {
            pathParts.push(this.toPascalCase(segment));
          }
        }
        return method + pathParts.join('');
      }
    } else {
      // No path parameters
      const lastSegment = segments[segments.length - 1];

      // For specific actions like familiar_followers, check if we need context to avoid conflicts
      if (segments.length >= 2 && lastSegment.includes('_')) {
        const action = this.toPascalCase(lastSegment);

        // Special case for familiar_followers since it's unique and the issue specifically requested it
        if (lastSegment === 'familiar_followers') {
          return method + action;
        }

        // Always include context for other actions to avoid conflicts
        const context = segments
          .slice(0, -1)
          .map((s) => this.toPascalCase(s))
          .join('');
        return method + context + action;
      }

      // For other multi-segment paths
      if (segments.length === 2) {
        const [resource, action] = segments;
        return method + this.toPascalCase(resource) + this.toPascalCase(action);
      }

      // Default: combine all segments
      return method + segments.map((s) => this.toPascalCase(s)).join('');
    }
  }

  private normalizeVersion(version: string): string {
    // Convert version string to PascalCase suffix
    if (version === 'v1') return '';
    if (version === 'v2') return 'V2';
    if (version === 'v2_alpha') return 'V2Alpha';
    // Handle other versions generically
    return this.toPascalCase(version);
  }

  private hasVersionConflicts(pathAfterVersion: string): boolean {
    // Common paths that appear in multiple API versions
    const conflictingPaths = [
      'notifications',
      'filters',
      'accounts',
      'statuses',
    ];

    const firstSegment = pathAfterVersion.split('/')[0];
    return conflictingPaths.includes(firstSegment);
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[_-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private parseResponseSchema(returns?: string): OpenAPIProperty | null {
    if (!returns) {
      return null;
    }

    // Handle array responses: "Array of [EntityName]"
    const arrayMatch = returns.match(/Array of \[([^\]]+)\]/i);
    if (arrayMatch) {
      const entityName = arrayMatch[1];
      const sanitizedEntityName = this.sanitizeSchemaName(entityName);
      return {
        type: 'array',
        items: {
          $ref: `#/components/schemas/${sanitizedEntityName}`,
        },
      };
    }

    // Handle single entity responses: "[EntityName]"
    const entityMatch = returns.match(/\[([^\]]+)\]/);
    if (entityMatch) {
      const entityName = entityMatch[1];
      const sanitizedEntityName = this.sanitizeSchemaName(entityName);
      return {
        $ref: `#/components/schemas/${sanitizedEntityName}`,
      };
    }

    // If no entity reference found, return null to fallback to description-only
    return null;
  }

  private convertMethod(method: ApiMethod, category: string): void {
    const path = this.normalizePath(method.endpoint);
    const httpMethod = method.httpMethod.toLowerCase() as keyof OpenAPIPath;

    if (!this.spec.paths[path]) {
      this.spec.paths[path] = {};
    }

    // Parse response schema from returns field
    const responseSchema = this.parseResponseSchema(method.returns);
    const response200 = responseSchema
      ? {
          description: method.returns || 'Success',
          content: {
            'application/json': {
              schema: responseSchema,
            },
          },
        }
      : {
          description: method.returns || 'Success',
        };

    const operation: OpenAPIOperation = {
      operationId: this.generateOperationId(method.httpMethod, path),
      summary: method.name,
      description: method.description,
      tags: [category],
      responses: {
        '200': response200,
      },
    };

    // Add security if OAuth is required
    if (method.oauth && method.oauth !== 'Public') {
      operation.security = [{ OAuth2: [] }];
    }

    // Add parameters
    if (method.parameters && method.parameters.length > 0) {
      operation.parameters = [];
      const bodyParams: ApiParameter[] = [];

      for (const param of method.parameters) {
        // For GET requests, parameters are usually query parameters
        // For POST/PUT/PATCH, they are usually form data (request body)
        if (httpMethod === 'get') {
          operation.parameters.push({
            name: param.name,
            in: 'query',
            required: param.required,
            description: param.description,
            schema: { type: 'string' },
          });
        } else {
          bodyParams.push(param);
        }
      }

      // Add request body for non-GET methods with parameters
      if (bodyParams.length > 0 && httpMethod !== 'get') {
        const properties: Record<string, OpenAPIProperty> = {};
        const required: string[] = [];

        for (const param of bodyParams) {
          properties[param.name] = {
            type: 'string',
            description: param.description,
          };
          if (param.required) {
            required.push(param.name);
          }
        }

        operation.requestBody = {
          description: 'Form data parameters',
          required: required.length > 0,
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                properties,
                required: required.length > 0 ? required : undefined,
              } as OpenAPIProperty,
            },
          },
        };
      }
    }

    // Extract path parameters
    const pathParams = this.extractPathParameters(path);
    if (pathParams.length > 0) {
      if (!operation.parameters) {
        operation.parameters = [];
      }
      for (const pathParam of pathParams) {
        operation.parameters.push({
          name: pathParam,
          in: 'path',
          required: true,
          description: `${pathParam} parameter`,
          schema: { type: 'string' },
        });
      }
    }

    this.spec.paths[path][httpMethod] = operation;
  }

  private normalizePath(endpoint: string): string {
    // Convert :param to {param} format for OpenAPI
    return endpoint.replace(/:([^/]+)/g, '{$1}');
  }

  private extractPathParameters(path: string): string[] {
    const matches = path.match(/\{([^}]+)\}/g);
    return matches ? matches.map((match) => match.slice(1, -1)) : [];
  }

  public toJSON(): string {
    return JSON.stringify(this.spec, null, 2);
  }
}

export { OpenAPIGenerator };
