import { ApiMethod } from './ApiMethod';
import { StreamEventDefinition } from './StreamEvent';

interface ApiMethodsFile {
  name: string;
  description: string;
  methods: ApiMethod[];
  streamEvents?: StreamEventDefinition[];
}

export { ApiMethodsFile };
