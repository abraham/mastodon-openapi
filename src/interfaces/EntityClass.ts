import { EntityAttribute } from './EntityAttribute';

interface EntityClass {
  name: string;
  description: string;
  attributes: EntityAttribute[];
}

export { EntityClass };
