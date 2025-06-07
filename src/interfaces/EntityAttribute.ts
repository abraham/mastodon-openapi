interface EntityAttribute {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
  deprecated?: boolean;
  enumValues?: string[];
  properties?: Record<string, EntityAttribute>; // For nested object properties
}

export { EntityAttribute };
