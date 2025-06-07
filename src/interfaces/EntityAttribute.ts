interface EntityAttribute {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
  deprecated?: boolean;
  enumValues?: string[];
}

export { EntityAttribute };
