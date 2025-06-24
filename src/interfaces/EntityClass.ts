import { EntityAttribute } from './EntityAttribute';

interface EntityClass {
  name: string;
  description: string;
  attributes: EntityAttribute[];
  versions?: string[]; // New field for parsed version numbers
  example?: any; // Example JSON object for the entity
  sourceFile?: string; // Source file name (without path and extension) for external docs
}

export { EntityClass };
