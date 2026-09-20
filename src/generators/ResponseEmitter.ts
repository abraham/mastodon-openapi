import { ApiMethod } from '../interfaces/ApiMethod';
import { OpenAPISpec } from '../interfaces/OpenAPISchema';
import { TypeParser } from './TypeParser';
import { ErrorExampleRegistry } from './ErrorExampleRegistry';
import { ComponentEmitter } from './ComponentEmitter';
import { HttpHeader } from '../parsers/HeaderParser';
import { extraResponseHeadersFor } from '../overrides/overrides';

interface ResponseCode {
  code: string;
  description: string;
  returnType?: string;
}

/**
 * Builds the `responses` object for an operation, including the headers that
 * every 2xx response carries.
 */
export class ResponseEmitter {
  constructor(
    private readonly typeParser: TypeParser,
    private readonly errorExampleRegistry: ErrorExampleRegistry,
    private readonly components: ComponentEmitter,
    private readonly globalResponseCodes: ResponseCode[],
    private readonly rateLimitHeaders: HttpHeader[]
  ) {}

  public build(
    method: ApiMethod,
    normalizedPath: string,
    spec: OpenAPISpec
  ): Record<string, any> {
    const responseSchema = this.typeParser.parseResponseSchema(
      method.returns,
      spec,
      method.hashAttributes,
      method.name
    );

    const responses: Record<string, any> = {};
    const responseHeaders = this.responseHeaders(method, normalizedPath);
    const responseCodesToUse = this.mergeResponseCodes(
      this.globalResponseCodes,
      method.responseCodes
    );

    for (const responseCode of responseCodesToUse) {
      const isSuccessResponse = responseCode.code.startsWith('2');

      let responseExample = method.responseExamples?.[responseCode.code];
      if (!responseExample && !isSuccessResponse) {
        responseExample = this.errorExampleRegistry.getErrorExample(
          responseCode.code
        );
      }

      if (responseCode.code === '200') {
        responses[responseCode.code] = this.buildPrimaryResponse(
          method,
          responseCode,
          responseSchema,
          responseExample,
          responseHeaders
        );
      } else if (isSuccessResponse) {
        responses[responseCode.code] = this.buildSecondarySuccessResponse(
          method,
          responseCode,
          responseExample,
          responseHeaders,
          spec
        );
      } else {
        responses[responseCode.code] = this.buildErrorResponse(
          responseCode,
          responseExample,
          spec
        );
      }
    }

    return responses;
  }

  private buildPrimaryResponse(
    method: ApiMethod,
    responseCode: ResponseCode,
    responseSchema: any,
    responseExample: any,
    responseHeaders: Record<string, any>
  ): any {
    const contentType = method.isStreaming
      ? 'text/event-stream'
      : 'application/json';

    // A streaming endpoint always advertises content, even when the returns
    // field yields no schema.
    if (!method.isStreaming && !responseSchema) {
      return {
        description: method.returns || responseCode.description,
        headers: responseHeaders,
      };
    }

    const content: any = responseSchema ? { schema: responseSchema } : {};
    if (responseExample) {
      content.example = responseExample;
    }

    return {
      description: method.returns || responseCode.description,
      headers: responseHeaders,
      content: { [contentType]: content },
    };
  }

  private buildSecondarySuccessResponse(
    method: ApiMethod,
    responseCode: ResponseCode,
    responseExample: any,
    responseHeaders: Record<string, any>,
    spec: OpenAPISpec
  ): any {
    const response: any = {
      description: responseCode.description,
      headers: responseHeaders,
    };

    const schema = responseCode.returnType
      ? this.typeParser.parseResponseSchema(
          `[${responseCode.returnType}]`,
          spec,
          undefined,
          method.name
        )
      : null;

    if (schema || responseExample) {
      const content: any = {};
      if (schema) {
        content.schema = schema;
      }
      if (responseExample) {
        content.example = responseExample;
      }
      response.content = { 'application/json': content };
    }

    return response;
  }

  private buildErrorResponse(
    responseCode: ResponseCode,
    responseExample: any,
    spec: OpenAPISpec
  ): any {
    const response: any = { description: responseCode.description };

    if (responseExample) {
      const errorSchema = this.components.generateErrorSchema(
        responseExample,
        responseCode.code,
        spec
      );
      const content: any = { example: responseExample };

      if (errorSchema) {
        content.schema = errorSchema;
      }

      response.content = { 'application/json': content };
    }

    return response;
  }

  /**
   * Method-specific codes take precedence over global ones, but global
   * ordering is preserved.
   */
  private mergeResponseCodes(
    globalCodes: Array<{ code: string; description: string }>,
    methodCodes?: ResponseCode[]
  ): ResponseCode[] {
    if (!methodCodes || methodCodes.length === 0) {
      return globalCodes.map((code) => ({ ...code, returnType: undefined }));
    }

    const methodCodesMap = new Map<
      string,
      { description: string; returnType?: string }
    >();
    for (const methodCode of methodCodes) {
      methodCodesMap.set(methodCode.code, {
        description: methodCode.description,
        returnType: methodCode.returnType,
      });
    }

    const mergedCodes: ResponseCode[] = [];
    const addedCodes = new Set<string>();

    for (const globalCode of globalCodes) {
      const methodCodeInfo = methodCodesMap.get(globalCode.code);
      if (methodCodeInfo) {
        mergedCodes.push({
          code: globalCode.code,
          description: methodCodeInfo.description,
          returnType: methodCodeInfo.returnType,
        });
      } else {
        mergedCodes.push({ ...globalCode, returnType: undefined });
      }
      addedCodes.add(globalCode.code);
    }

    for (const methodCode of methodCodes) {
      if (!addedCodes.has(methodCode.code)) {
        mergedCodes.push(methodCode);
      }
    }

    return mergedCodes;
  }

  public responseHeaders(
    method: ApiMethod,
    normalizedPath: string
  ): Record<string, any> {
    const headers: Record<string, any> = {};

    for (const header of this.rateLimitHeaders) {
      headers[header.name] = {
        $ref: `#/components/headers/${header.name}`,
      };
    }

    if (this.hasPaginationParameters(method)) {
      headers['Link'] = { $ref: '#/components/headers/Link' };
    }

    for (const name of extraResponseHeadersFor(
      method.httpMethod,
      normalizedPath
    )) {
      headers[name] = { $ref: `#/components/headers/${name}` };
    }

    return headers;
  }

  private hasPaginationParameters(method: ApiMethod): boolean {
    if (!method.parameters) {
      return false;
    }

    const paginationParams = ['max_id', 'since_id', 'min_id'];
    return method.parameters.some((param) =>
      paginationParams.includes(param.name)
    );
  }
}
