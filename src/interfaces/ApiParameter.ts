interface ApiProperty {
  type: string;
  description?: string;
  items?: { type: string } | ApiProperty;
  enum?: string[];
  properties?: Record<string, ApiProperty>;
  /** Shape of values under an arbitrary key, e.g. `field[:index][name]`. */
  additionalProperties?: ApiProperty;
}

interface ApiParameter {
  name: string;
  description: string;
  required?: boolean;
  type?: string;
  in?: string; // Location of parameter: 'query', 'formData', 'path', 'header'
  enumValues?: string[];
  defaultValue?: string;
  schema?: {
    type: 'array' | 'object' | 'string' | 'integer' | 'boolean' | 'number';
    items?: ApiProperty;
    properties?: Record<string, ApiProperty>;
    additionalProperties?: ApiProperty;
    enum?: string[];
    format?: string;
  };
}

export { ApiParameter, ApiProperty };
