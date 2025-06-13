interface EntityAttribute {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
  deprecated?: boolean;
  nullable?: boolean;
  enumValues?: string[];
  versions?: string[]; // New field for parsed version numbers
}

export { EntityAttribute };
