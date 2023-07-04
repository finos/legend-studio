import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';
import { Temporality } from './DSL_Persistence_Temporality.js';

export abstract class PersistenceTarget implements Hashable {
  abstract get hashCode(): string;
}

export class RelationalPersistenceTarget
  extends PersistenceTarget
  implements Hashable
{
  table!: string;
  database!: string;
  temporality!: Temporality;

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.RELATIONAL_PERSISTENCE_TARGET,
      this.table,
      this.database,
      this.temporality,
    ]);
  }
}
