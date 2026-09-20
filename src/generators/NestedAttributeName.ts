export interface NestedAttributeName {
  parentName: string;
  /** Segments from the root down, with array notation stripped. */
  fullPath: string[];
  /** Indices into `fullPath` whose segment is an array. */
  arrayPositions: number[];
}

/**
 * Splits a documented attribute name into its path.
 *
 * Two notations are in use and they overlap: dotted paths like
 * `poll.options[].title`, and bracketed paths like `alerts[admin.sign_up]`.
 * A name containing both is bracketed, because a dot inside brackets is part
 * of the segment rather than a separator.
 */
export function parseNestedAttributeName(
  name: string
): NestedAttributeName | null {
  const bracketed = name.match(/^([^[]+)(\[.+\])$/);

  if (name.includes('.') && !bracketed) {
    const parts = name.split('.');
    if (parts.length >= 2) {
      const parentName = parts[0];
      const fullPath = [parentName];
      const arrayPositions: number[] = [];

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (part.endsWith('[]')) {
          fullPath.push(part.slice(0, -2));
          arrayPositions.push(fullPath.length - 1);
        } else {
          fullPath.push(part);
        }
      }

      return { parentName, fullPath, arrayPositions };
    }
  }

  if (!bracketed) {
    return null;
  }

  const parentName = bracketed[1];
  const bracketPart = bracketed[2];

  const fullPath = [parentName];
  const arrayPositions: number[] = [];
  let i = 0;

  while (i < bracketPart.length) {
    if (bracketPart[i] !== '[') {
      i++;
      continue;
    }

    // Scan to the matching close bracket, tracking depth so that a nested
    // `[]` inside a segment does not terminate it early.
    let depth = 0;
    let j = i + 1;
    let segmentContent = '';

    while (j < bracketPart.length) {
      const char = bracketPart[j];
      if (char === '[') {
        depth++;
        segmentContent += char;
      } else if (char === ']') {
        if (depth === 0) {
          break;
        }
        depth--;
        segmentContent += char;
      } else {
        segmentContent += char;
      }
      j++;
    }

    if (segmentContent === '') {
      // Empty brackets mark the preceding segment as an array.
      if (fullPath.length > 0) {
        arrayPositions.push(fullPath.length - 1);
      }
    } else if (segmentContent.endsWith('[]')) {
      fullPath.push(segmentContent.slice(0, -2));
      arrayPositions.push(fullPath.length - 1);
    } else {
      fullPath.push(segmentContent);
    }

    i = j + 1;
  }

  return { parentName, fullPath, arrayPositions };
}
