interface ApiProperty {
  type: string;
  description?: string;
  items?: { type: string } | ApiProperty;
  enum?: string[];
  properties?: Record<string, ApiProperty>;
}

interface ApiParameter {
  name: string;
  description: string;
  required?: boolean;
  type?: string;
  in?: string; // Location of parameter: 'query', 'formData', 'path', 'header'
  enumValues?: string[];
  schema?: {
    type: 'array' | 'object' | 'string' | 'integer' | 'boolean' | 'number';
    items?: ApiProperty;
    properties?: Record<string, ApiProperty>;
  };
}

export { ApiParameter, ApiProperty };
