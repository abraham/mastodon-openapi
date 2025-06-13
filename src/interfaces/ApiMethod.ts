import { ApiParameter } from './ApiParameter';

interface HashAttribute {
  name: string;
  type: string;
  description: string;
}

interface ApiMethod {
  name: string;
  httpMethod: string;
  endpoint: string;
  description: string;
  parameters?: ApiParameter[];
  returns?: string;
  hashAttributes?: HashAttribute[];
  oauth?: string;
  version?: string;
  versions?: string[]; // New field for parsed version numbers
  deprecated?: boolean;
  isStreaming?: boolean;
  responseExamples?: Record<string, any>; // Response examples by status code
}

export { ApiMethod, HashAttribute };
