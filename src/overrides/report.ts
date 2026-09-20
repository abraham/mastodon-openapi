/**
 * Every override and preserved-bug workaround announces itself when it fires,
 * so the amount of hand-maintained special-casing is visible in build output
 * instead of hiding in the code.
 *
 * Messages are deduplicated: a rule that applies to the same target on every
 * pass is interesting once, not a hundred times.
 */

const reported = new Set<string>();

export type OverrideCategory =
  | 'entity-inheritance'
  | 'excluded-attribute'
  | 'response-entity-name'
  | 'version-conflict'
  | 'request-body'
  | 'response-headers'
  | 'workaround';

export function reportOverride(
  category: OverrideCategory,
  detail: string,
  reason?: string
): void {
  const message = reason
    ? `[override:${category}] ${detail} — ${reason}`
    : `[override:${category}] ${detail}`;

  if (reported.has(message)) {
    return;
  }

  reported.add(message);
  console.warn(message);
}

/** Distinct overrides applied since the last reset, in first-use order. */
export function appliedOverrides(): string[] {
  return [...reported];
}

/** Test seam, and used between pipeline runs in the same process. */
export function resetOverrideReports(): void {
  reported.clear();
}
