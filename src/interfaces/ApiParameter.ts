interface ApiParameter {
  name: string;
  description: string;
  required?: boolean;
  type?: string;
  in?: string; // Location of parameter: 'query', 'formData', 'path', 'header'
  enumValues?: string[];
  schema?: {
    type: 'array' | 'object';
    items?: {
      type: string;
    };
    properties?: Record<
      string,
      {
        type: string;
        description?: string;
        items?: { type: string };
      }
    >;
  };
}

export { ApiParameter };
