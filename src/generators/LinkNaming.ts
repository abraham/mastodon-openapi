/**
 * Names and descriptions for generated operation links.
 *
 * Everything here is derived from the target operation and the parameters
 * bound to it. Nothing enumerates individual endpoints, so new documentation
 * is picked up without edits here.
 */

/** Name of the shared component under `components.links`. */
export function linkComponentName(
  targetOperationId: string,
  parameters: Record<string, string>
): string {
  const bound = Object.keys(parameters);
  if (bound.length === 0) {
    return targetOperationId;
  }

  const suffix = bound
    .map((name) =>
      name
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('')
    )
    .join('And');

  return `${targetOperationId}By${suffix}`;
}

/**
 * Describes following the link, reusing the target's own documented summary so
 * the wording tracks the documentation.
 */
export function linkDescription(
  targetSummary: string | undefined,
  targetOperationId: string,
  parameters: Record<string, string>
): string {
  const action = targetSummary?.trim() || targetOperationId;
  const bound = Object.keys(parameters);

  if (bound.length === 0) {
    return action;
  }

  const list = bound.map((name) => `\`${name}\``).join(', ');
  return `${action}, using ${list} from this response`;
}

/** Normalize endpoint path for OpenAPI spec format */
export function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/:(\w+)/g, '{$1}');
}
