interface EntityAttribute {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
  deprecated?: boolean;
  nullable?: boolean;
  enumValues?: string[];
}

export { EntityAttribute };
