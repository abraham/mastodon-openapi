import { ApiParameter } from './ApiParameter';

interface ApiMethod {
  name: string;
  httpMethod: string;
  endpoint: string;
  description: string;
  parameters?: ApiParameter[];
  returns?: string;
  oauth?: string;
  version?: string;
}

export { ApiMethod };
