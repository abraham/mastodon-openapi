import { ApiMethod } from '../interfaces/ApiMethod';
import { ApiParameter } from '../interfaces/ApiParameter';
import {
  OpenAPIOperation,
  OpenAPIProperty,
  OpenAPISpec,
} from '../interfaces/OpenAPISchema';
import { TypeParser } from './TypeParser';
import { SchemaSorting } from './SchemaSorting';
import { ComponentEmitter } from './ComponentEmitter';
import { requestBodyOverrideFor } from '../overrides/overrides';

/**
 * Builds the `requestBody` for an operation from its form-data parameters.
 */
export class RequestBodyEmitter {
  constructor(
    private readonly typeParser: TypeParser,
    private readonly sorting: SchemaSorting,
    private readonly components: ComponentEmitter
  ) {}

  public build(
    method: ApiMethod,
    path: string,
    bodyParams: ApiParameter[],
    spec: OpenAPISpec
  ): OpenAPIOperation['requestBody'] | undefined {
    if (bodyParams.length === 0) {
      return undefined;
    }

    const properties: Record<string, OpenAPIProperty> = {};
    const required: string[] = [];

    for (const param of bodyParams) {
      properties[param.name] = this.typeParser.convertParameterToSchema(param);
      if (param.required) {
        required.push(param.name);
      }
    }

    const { sortedProperties, sortedRequired } =
      this.sorting.sortPropertiesAndRequired(properties, required);

    const override = requestBodyOverrideFor(method.httpMethod, path);

    if (
      override === 'status-variants' &&
      sortedRequired.includes('status') &&
      sortedRequired.includes('media_ids') &&
      sortedRequired.includes('poll')
    ) {
      return this.statusVariants(sortedProperties, sortedRequired, spec);
    }

    if (override === 'create-app' && sortedProperties.redirect_uris) {
      this.applyCreateAppOverride(sortedProperties);
      return this.jsonBody(sortedProperties, sortedRequired);
    }

    if (this.isMediaUploadEndpoint(method, path) || hasFileParameters(method)) {
      return this.multipartBody(method, sortedProperties, sortedRequired);
    }

    return this.jsonBody(sortedProperties, sortedRequired);
  }

  private statusVariants(
    sortedProperties: Record<string, OpenAPIProperty>,
    sortedRequired: string[],
    spec: OpenAPISpec
  ): OpenAPIOperation['requestBody'] {
    this.components.createStatusComponents(
      sortedProperties,
      sortedRequired,
      spec
    );

    return {
      description:
        'JSON request body parameters for creating a status. Different types of statuses have different requirements.',
      required: true,
      content: {
        'application/json': {
          schema: {
            oneOf: [
              { $ref: '#/components/schemas/TextStatus' },
              { $ref: '#/components/schemas/MediaStatus' },
              { $ref: '#/components/schemas/PollStatus' },
            ],
          } as OpenAPIProperty,
        },
      },
    };
  }

  private applyCreateAppOverride(
    sortedProperties: Record<string, OpenAPIProperty>
  ): void {
    // redirect_uris is documented as "string or array"; always emit the array form
    sortedProperties.redirect_uris = {
      type: 'array',
      items: { type: 'string', format: 'uri' },
      description: sortedProperties.redirect_uris.description,
    };

    if (sortedProperties.scopes) {
      sortedProperties.scopes = {
        type: 'string',
        format: 'scopes',
        description: sortedProperties.scopes.description,
        default: 'read',
      };
    }
  }

  private multipartBody(
    method: ApiMethod,
    sortedProperties: Record<string, OpenAPIProperty>,
    sortedRequired: string[]
  ): OpenAPIOperation['requestBody'] {
    const multipartProperties: Record<string, OpenAPIProperty> = {};

    for (const [name, property] of Object.entries(sortedProperties)) {
      const param = method.parameters?.find((p) => p.name === name);
      multipartProperties[name] =
        param && isFileParameter(param)
          ? { ...property, type: 'string', format: 'binary' }
          : property;
    }

    return {
      description: 'Multipart form data parameters',
      required: sortedRequired.length > 0,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: multipartProperties,
            required: sortedRequired.length > 0 ? sortedRequired : undefined,
          } as OpenAPIProperty,
        },
      },
    };
  }

  private jsonBody(
    sortedProperties: Record<string, OpenAPIProperty>,
    sortedRequired: string[]
  ): OpenAPIOperation['requestBody'] {
    return {
      description: 'JSON request body parameters',
      required: sortedRequired.length > 0,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: sortedProperties,
            required: sortedRequired.length > 0 ? sortedRequired : undefined,
          } as OpenAPIProperty,
        },
      },
    };
  }

  private isMediaUploadEndpoint(method: ApiMethod, path: string): boolean {
    return (
      (method.httpMethod === 'POST' &&
        (path === '/api/v1/media' || path === '/api/v2/media')) ||
      (method.httpMethod === 'PUT' && path === '/api/v1/media/{id}')
    );
  }
}

/** File parameters are identified only by their prose. */
export function isFileParameter(param: ApiParameter): boolean {
  return !!(
    param.description &&
    param.description.toLowerCase().includes('multipart form data')
  );
}

export function hasFileParameters(method: ApiMethod): boolean {
  return method.parameters?.some((param) => isFileParameter(param)) || false;
}
