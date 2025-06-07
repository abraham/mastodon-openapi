interface ApiParameter {
  name: string;
  description: string;
  required?: boolean;
  type?: string;
  in?: string; // Location of parameter: 'query', 'formData', 'path', 'header'
  enumValues?: string[];
}

export { ApiParameter };
