interface OpenAPILicense {
  name: string;
  url?: string;
}

interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
  license?: OpenAPILicense;
  'x-logo'?: {
    url: string;
    altText?: string;
  };
}

interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<
    string,
    {
      default: string;
      description?: string;
      enum?: string[];
    }
  >;
}

interface OpenAPIExternalDocs {
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
  type?: string | string[];
  format?: string;
  description?: string;
  items?: OpenAPIProperty;
  $ref?: string;
  oneOf?: OpenAPIProperty[];
  allOf?: (OpenAPIProperty | { $ref: string })[];
  enum?: string[];
  default?: string;
  deprecated?: boolean;
  nullable?: boolean;
  properties?: Record<string, OpenAPIProperty>;
  required?: string[];
  example?: any;
  additionalProperties?: OpenAPIProperty | boolean;
}

interface OpenAPISchema {
  type?: string;
  properties?: Record<string, OpenAPIProperty>;
  required?: string[];
  description?: string;
  oneOf?: OpenAPIProperty[];
  allOf?: (OpenAPIProperty | { $ref: string })[];
  example?: any;
  additionalProperties?: OpenAPIProperty | boolean;
  externalDocs?: OpenAPIExternalDocs;
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
  headers?: Record<string, OpenAPIHeader>;
  content?: Record<
    string,
    {
      schema: OpenAPIProperty | { $ref: string };
      example?: any;
      examples?: Record<string, OpenAPIExample | { $ref: string }>;
    }
  >;
  links?: Record<string, OpenAPILink | { $ref: string }>;
}

interface OpenAPIHeader {
  description: string;
  schema: {
    type: string;
    format?: string;
  };
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
  externalDocs?: OpenAPIExternalDocs;
}

interface OpenAPIPath {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  patch?: OpenAPIOperation;
}

interface OpenAPIExample {
  summary?: string;
  description?: string;
  value: any;
}

interface OpenAPILink {
  operationRef?: string;
  operationId?: string;
  parameters?: Record<string, any>;
  requestBody?: any;
  description?: string;
  server?: OpenAPIServer;
}

interface OpenAPISpec {
  openapi: string;
  info: OpenAPIInfo;
  externalDocs?: OpenAPIExternalDocs;
  servers?: OpenAPIServer[];
  security?: Array<Record<string, string[]>>;
  paths: Record<string, OpenAPIPath>;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
    examples?: Record<string, OpenAPIExample>;
    securitySchemes?: Record<string, OpenAPISecurityScheme>;
    links?: Record<string, OpenAPILink>;
  };
}

export {
  OpenAPILicense,
  OpenAPIInfo,
  OpenAPIServer,
  OpenAPIExternalDocs,
  OpenAPISecurityScheme,
  OAuthFlow,
  OpenAPIProperty,
  OpenAPISchema,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPIResponse,
  OpenAPIHeader,
  OpenAPIOperation,
  OpenAPIPath,
  OpenAPIExample,
  OpenAPILink,
  OpenAPISpec,
};
