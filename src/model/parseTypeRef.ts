import { TypeRef } from './TypeRef';

/**
 * Documentation link targets that look like entity references but are not,
 * e.g. `[Datetime]` in "String (ISO 8601 [Datetime])".
 */
function isDocumentationLink(refName: string): boolean {
  const lowered = refName.toLowerCase();
  return (
    lowered.includes('/') ||
    lowered === 'datetime' ||
    lowered === 'date' ||
    lowered.includes('iso8601')
  );
}

function entityRefs(typeString: string): TypeRef[] {
  const matches = typeString.match(/\[([^\]]+)\]/g);
  if (!matches) {
    return [];
  }

  const refs: TypeRef[] = [];
  for (const match of matches) {
    const refName = match.slice(1, -1);
    if (isDocumentationLink(refName)) {
      continue;
    }
    refs.push({ kind: 'entity', name: refName.replace(/[^\w:]/g, '') });
  }
  return refs;
}

function stringFormat(typeString: string, lowered: string): string | undefined {
  if (
    lowered.includes('iso8601') ||
    typeString.includes('[Datetime]') ||
    typeString.includes('[ISO8601') ||
    (lowered.includes('datetime') && !lowered.includes('datetime-format'))
  ) {
    return 'date-time';
  }

  if (
    typeString.includes('[Date]') &&
    !typeString.toLowerCase().includes('[datetime]') &&
    !typeString.toLowerCase().includes('[iso8601') &&
    !typeString.toLowerCase().includes('iso8601')
  ) {
    return 'date';
  }

  if (lowered.includes('email')) {
    return 'email';
  }

  if (lowered.includes('url')) {
    return 'uri';
  }

  if (lowered.includes('iso 639') || lowered.includes('iso639')) {
    return 'iso-639-1';
  }

  return undefined;
}

/**
 * Resolve a documented type into a `TypeRef`. The ordering of the checks is
 * load-bearing: earlier branches win, matching how the documentation is
 * written (e.g. "Array of String (URL)" is an array, not a URL).
 */
export function parseTypeRef(typeString: string): TypeRef {
  const lowered = typeString.toLowerCase().trim();

  if (lowered.includes('array of')) {
    const itemMatch = typeString.match(/array of\s+(.+)/i);
    return itemMatch
      ? { kind: 'array', items: parseTypeRef(itemMatch[1]) }
      : { kind: 'array' };
  }

  if (typeString.includes('[') && typeString.includes(']')) {
    const refs = entityRefs(typeString);
    if (refs.length > 1) {
      return { kind: 'union', options: refs };
    }
    if (refs.length === 1) {
      return refs[0];
    }
  }

  // A field documented as exactly `Null` is always null, not a nullable string
  if (lowered === 'null') {
    return { kind: 'primitive', type: 'null' };
  }

  if (lowered.includes('string')) {
    const format = stringFormat(typeString, lowered);
    if (format) {
      return { kind: 'primitive', type: 'string', format };
    }
    // HTML is only noted when no format applies, matching the original cascade
    if (lowered.includes('html')) {
      return { kind: 'primitive', type: 'string', html: true };
    }
    return { kind: 'primitive', type: 'string' };
  }

  if (lowered.includes('iso 639') || lowered.includes('iso639')) {
    return { kind: 'primitive', type: 'string', format: 'iso-639-1' };
  }

  if (lowered.includes('integer') || lowered.includes('cast from an integer')) {
    return { kind: 'primitive', type: 'integer' };
  }

  if (lowered.includes('boolean')) {
    return { kind: 'primitive', type: 'boolean' };
  }

  if (lowered.includes('number') || lowered.includes('float')) {
    return { kind: 'primitive', type: 'number' };
  }

  if (lowered.includes('hash') || lowered.includes('object')) {
    return { kind: 'primitive', type: 'object' };
  }

  if (lowered.includes('enumerable') || lowered.includes('oneof')) {
    return { kind: 'enumerable', labelled: typeString.includes('Enumerable') };
  }

  return { kind: 'unknown', raw: typeString };
}
