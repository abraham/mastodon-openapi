interface EntityAttribute {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
  deprecated?: boolean;
  nullable?: boolean;
  explicitlyNullable?: boolean; // Set when nullable is explicitly marked in docs (e.g., {{<nullable>}})
  enumValues?: string[];
  versions?: string[]; // New field for parsed version numbers
}

export { EntityAttribute };
