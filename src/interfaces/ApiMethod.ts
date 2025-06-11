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
  deprecated?: boolean;
}

export { ApiMethod, HashAttribute };
