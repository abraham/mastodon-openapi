import { EntityAttribute } from './EntityAttribute';

interface EntityClass {
  name: string;
  description: string;
  attributes: EntityAttribute[];
  versions?: string[]; // New field for parsed version numbers
}

export { EntityClass };
