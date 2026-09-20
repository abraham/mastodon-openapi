/**
 * A resolved type, parsed once from documentation prose instead of being
 * re-interpreted at emit time.
 */
export type TypeRef =
  | ArrayType
  | EntityType
  | UnionType
  | PrimitiveType
  | EnumerableType
  | UnknownType;

export interface ArrayType {
  kind: 'array';
  /** Absent when the documentation says "array" without naming an item type. */
  items?: TypeRef;
}

export interface EntityType {
  kind: 'entity';
  /** Entity name as written, before schema-name sanitization. */
  name: string;
}

export interface UnionType {
  kind: 'union';
  options: TypeRef[];
}

export type PrimitiveName =
  'string' | 'integer' | 'number' | 'boolean' | 'object';

export interface PrimitiveType {
  kind: 'primitive';
  type: PrimitiveName;
  format?: string;
  /** Set when the documentation describes the value as HTML. */
  html?: boolean;
}

export interface EnumerableType {
  kind: 'enumerable';
  /** Whether the prose used the word "Enumerable" rather than "oneOf". */
  labelled: boolean;
}

/**
 * The prose could not be resolved. Counted in CI so the number cannot grow
 * without someone noticing.
 */
export interface UnknownType {
  kind: 'unknown';
  raw: string;
}

/** Every `unknown` leaf in a type, for reporting. */
export function unknownLeaves(ref: TypeRef): UnknownType[] {
  switch (ref.kind) {
    case 'unknown':
      return [ref];
    case 'array':
      return ref.items ? unknownLeaves(ref.items) : [];
    case 'union':
      return ref.options.flatMap(unknownLeaves);
    default:
      return [];
  }
}
