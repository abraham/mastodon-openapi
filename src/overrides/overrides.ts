/**
 * Mastodon-specific quirks that cannot be recovered from the documentation.
 *
 * Every entry records why it exists so it can be deleted once the upstream
 * documentation expresses the same fact. `overrides.test.ts` asserts that each
 * one still matches something in the current documentation, so a stale
 * override fails the build instead of quietly doing nothing.
 */

import { reportOverride } from './report';

export interface EntityOverride {
  /** Entity name exactly as it appears in the documentation. */
  entity: string;
  /** Entity whose attributes are prepended to this one's. */
  extendsEntity?: string;
  /** Attributes to drop from the parsed entity. */
  excludeAttributes?: string[];
  reason: string;
}

export const entityOverrides: EntityOverride[] = [
  {
    entity: 'CredentialApplication',
    extendsEntity: 'Application',
    reason:
      'Documented as an extension of Application; only the extra attributes are listed.',
  },
  {
    entity: 'CredentialAccount',
    extendsEntity: 'Account',
    reason:
      'Documented as an extension of Account; only the extra attributes are listed.',
  },
  {
    entity: 'MutedAccount',
    extendsEntity: 'Account',
    reason:
      'Documented as an extension of Account; only the extra attributes are listed.',
  },
  {
    entity: 'Trends::Link',
    extendsEntity: 'PreviewCard',
    reason:
      'Documented as an extension of PreviewCard; only the extra attributes are listed.',
  },
  {
    entity: 'Suggestion',
    excludeAttributes: ['source'],
    reason:
      'The deprecated `source` attribute is superseded by `sources` and is not emitted.',
  },
];

const byEntity = new Map(entityOverrides.map((o) => [o.entity, o]));

/** Entity whose attributes `name` inherits, if any. */
export function parentEntityOf(name: string): string | undefined {
  const override = byEntity.get(name);
  if (!override?.extendsEntity) {
    return undefined;
  }

  reportOverride(
    'entity-inheritance',
    `${name} inherits from ${override.extendsEntity}`,
    override.reason
  );
  return override.extendsEntity;
}

/** Whether `attribute` should be dropped from `entity`. */
export function isExcludedAttribute(
  entity: string | undefined,
  attribute: string
): boolean {
  if (!entity) {
    return false;
  }

  const override = byEntity.get(entity);
  if (!override?.excludeAttributes?.includes(attribute)) {
    return false;
  }

  reportOverride(
    'excluded-attribute',
    `${entity}.${attribute} omitted`,
    override.reason
  );
  return true;
}

export interface ResponseEntityNameOverride {
  /** Lowercased substring of the method heading. */
  methodNameIncludes: string;
  name: string;
  reason: string;
}

export const responseEntityNameOverrides: ResponseEntityNameOverride[] = [
  {
    methodNameIncludes: 'oembed',
    name: 'OEmbedResponse',
    reason:
      'The derived name would be GetOembedInfoAsJsonResponse, which is not how the format is known.',
  },
];

/** Replacement name for an inline response entity, if one is configured. */
export function responseEntityNameFor(methodName: string): string | undefined {
  const lowered = methodName.toLowerCase();
  const override = responseEntityNameOverrides.find((o) =>
    lowered.includes(o.methodNameIncludes)
  );

  if (!override) {
    return undefined;
  }

  reportOverride(
    'response-entity-name',
    `"${methodName}" named ${override.name}`,
    override.reason
  );
  return override.name;
}

/**
 * Path families served by more than one API version. Operations under these
 * get a version suffix even at v1, so that v1 and v2 operationIds stay unique.
 */
export const versionConflictPathSegments = [
  'notifications',
  'filters',
  'accounts',
  'statuses',
];

export function hasVersionConflict(firstSegment: string): boolean {
  if (!versionConflictPathSegments.includes(firstSegment)) {
    return false;
  }

  reportOverride(
    'version-conflict',
    `/${firstSegment} operations carry a version suffix`
  );
  return true;
}

export type RequestBodyOverrideKind = 'status-variants' | 'create-app';

export interface EndpointOverride {
  httpMethod: string;
  /** Normalized path, with `{param}` placeholders. */
  path: string;
  requestBody?: RequestBodyOverrideKind;
  /** Response headers added on top of the documented ones. */
  extraResponseHeaders?: string[];
  reason: string;
}

export const endpointOverrides: EndpointOverride[] = [
  {
    httpMethod: 'POST',
    path: '/api/v1/statuses',
    requestBody: 'status-variants',
    reason:
      'Exactly one of status, media_ids or poll is required; expressed as a oneOf the docs cannot state.',
  },
  {
    httpMethod: 'POST',
    path: '/api/v1/apps',
    requestBody: 'create-app',
    reason:
      'redirect_uris accepts a string or an array, and scopes is a space-separated list rather than an enum.',
  },
  {
    httpMethod: 'GET',
    path: '/api/v1/statuses/{id}/context',
    extraResponseHeaders: ['Mastodon-Async-Refresh'],
    reason:
      'Context may still be loading; the header is documented separately from the endpoint.',
  },
];

function findEndpointOverride(
  httpMethod: string,
  path: string
): EndpointOverride | undefined {
  return endpointOverrides.find(
    (o) => o.httpMethod === httpMethod.toUpperCase() && o.path === path
  );
}

export function requestBodyOverrideFor(
  httpMethod: string,
  path: string
): RequestBodyOverrideKind | undefined {
  const override = findEndpointOverride(httpMethod, path);
  if (!override?.requestBody) {
    return undefined;
  }

  reportOverride(
    'request-body',
    `${override.httpMethod} ${path} uses ${override.requestBody}`,
    override.reason
  );
  return override.requestBody;
}

export function extraResponseHeadersFor(
  httpMethod: string,
  path: string
): string[] {
  const override = findEndpointOverride(httpMethod, path);
  const headers = override?.extraResponseHeaders ?? [];

  if (headers.length > 0) {
    reportOverride(
      'response-headers',
      `${override!.httpMethod} ${path} adds ${headers.join(', ')}`,
      override!.reason
    );
  }

  return headers;
}
