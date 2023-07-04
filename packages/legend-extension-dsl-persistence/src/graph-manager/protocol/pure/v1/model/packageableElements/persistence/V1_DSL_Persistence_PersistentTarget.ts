import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import { V1_Temporality } from './V1_DSL_Persistence_Temporality.js';

export abstract class V1_PersistenceTarget implements Hashable {
  abstract get hashCode(): string;
}

export class V1_RelationalPersistenceTarget
  extends V1_PersistenceTarget
  implements Hashable
{
  table!: string;
  database!: string;
  temporality!: V1_Temporality;

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.RELATIONAL_PERSISTENCE_TARGET,
      this.table,
      this.database,
      this.temporality,
    ]);
  }
}
