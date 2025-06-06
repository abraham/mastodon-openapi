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
  OpenAPIPath
} from '../interfaces/OpenAPISchema';

class OpenAPIGenerator {
  private spec: OpenAPISpec;

  constructor() {
    this.spec = {
      openapi: '3.0.3',
      info: {
        title: 'Mastodon API',
        version: '4.2.0',
        description: 'Documentation for the Mastodon API'
      },
      servers: [
        {
          url: 'https://mastodon.example',
          description: 'Production server'
        }
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          OAuth2: {
            type: 'oauth2',
            description: 'OAuth 2.0 authentication'
          },
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Bearer token authentication'
          }
        }
      }
    };
  }

  public generateSchema(entities: EntityClass[], methodFiles: ApiMethodsFile[]): OpenAPISpec {
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
        required: []
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
        this.spec.components.schemas[entity.name] = schema;
      }
    }
  }

  private convertAttribute(attribute: EntityAttribute): OpenAPIProperty {
    const property: OpenAPIProperty = {
      description: attribute.description
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
    if (type.enum) {
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
          items: itemType
        };
      }
      return { type: 'array' };
    }

    // Handle references to other entities
    if (typeString.includes('[') && typeString.includes(']')) {
      const refMatch = typeString.match(/\[([^\]]+)\]/);
      if (refMatch) {
        const refName = refMatch[1];
        // Clean up reference name
        const cleanRefName = refName.replace(/[^\w:]/g, '');
        return {
          $ref: `#/components/schemas/${cleanRefName}`
        };
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

    if (cleanType.includes('integer') || cleanType.includes('cast from an integer')) {
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
        description: (typeString.includes('Enumerable') ? 'Enumerable value' : '') 
      };
    }

    // Default to string for unknown types
    return { 
      type: 'string',
      description: `Original type: ${typeString}`
    };
  }

  private convertMethods(methodFiles: ApiMethodsFile[]): void {
    for (const methodFile of methodFiles) {
      for (const method of methodFile.methods) {
        this.convertMethod(method, methodFile.name);
      }
    }
  }

  private convertMethod(method: ApiMethod, category: string): void {
    const path = this.normalizePath(method.endpoint);
    const httpMethod = method.httpMethod.toLowerCase() as keyof OpenAPIPath;

    if (!this.spec.paths[path]) {
      this.spec.paths[path] = {};
    }

    const operation: OpenAPIOperation = {
      summary: method.name,
      description: method.description,
      tags: [category],
      responses: {
        '200': {
          description: method.returns || 'Success'
        }
      }
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
            schema: { type: 'string' }
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
            description: param.description
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
                required: required.length > 0 ? required : undefined
              } as OpenAPIProperty
            }
          }
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
          schema: { type: 'string' }
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
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  }

  public toJSON(): string {
    return JSON.stringify(this.spec, null, 2);
  }
}

export { OpenAPIGenerator };