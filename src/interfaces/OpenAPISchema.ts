interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
}

interface OpenAPIServer {
  url: string;
  description?: string;
}

interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

interface OpenAPISecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
  description?: string;
  flows?: {
    implicit?: OAuthFlow;
    password?: OAuthFlow;
    clientCredentials?: OAuthFlow;
    authorizationCode?: OAuthFlow;
  };
}

interface OpenAPIProperty {
  type?: string;
  format?: string;
  description?: string;
  items?: OpenAPIProperty;
  $ref?: string;
  oneOf?: OpenAPIProperty[];
  enum?: string[];
  deprecated?: boolean;
  properties?: Record<string, OpenAPIProperty>;
}

interface OpenAPISchema {
  type?: string;
  properties?: Record<string, OpenAPIProperty>;
  required?: string[];
  description?: string;
  oneOf?: OpenAPIProperty[];
}

interface OpenAPIParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: OpenAPIProperty;
}

interface OpenAPIRequestBody {
  description?: string;
  required?: boolean;
  content: Record<
    string,
    {
      schema: OpenAPIProperty | { $ref: string };
    }
  >;
}

interface OpenAPIResponse {
  description: string;
  content?: Record<
    string,
    {
      schema: OpenAPIProperty | { $ref: string };
    }
  >;
}

interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  security?: Array<Record<string, string[]>>;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  deprecated?: boolean;
}

interface OpenAPIPath {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  patch?: OpenAPIOperation;
}

interface OpenAPISpec {
  openapi: string;
  info: OpenAPIInfo;
  servers?: OpenAPIServer[];
  paths: Record<string, OpenAPIPath>;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
    securitySchemes?: Record<string, OpenAPISecurityScheme>;
  };
}

export {
  OpenAPIInfo,
  OpenAPIServer,
  OpenAPISecurityScheme,
  OAuthFlow,
  OpenAPIProperty,
  OpenAPISchema,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPIResponse,
  OpenAPIOperation,
  OpenAPIPath,
  OpenAPISpec,
};
