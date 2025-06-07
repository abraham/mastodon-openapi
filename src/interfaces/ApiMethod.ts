import { ApiParameter } from './ApiParameter';
import { ApiResponse } from './ApiResponse';

interface ApiMethod {
  name: string;
  httpMethod: string;
  endpoint: string;
  description: string;
  parameters?: ApiParameter[];
  returns?: string;
  oauth?: string;
  version?: string;
  deprecated?: boolean;
  responses?: ApiResponse[];
}

export { ApiMethod };
