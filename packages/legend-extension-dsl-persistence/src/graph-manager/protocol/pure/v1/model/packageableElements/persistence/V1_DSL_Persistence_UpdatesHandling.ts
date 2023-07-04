import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import { V1_AppendStrategy } from './V1_DSL_Persistence_AppendStrategy.js';

export abstract class V1_UpdatesHandling implements Hashable {
  abstract get hashCode(): string;
}

export class V1_AppendOnlyUpdatesHandling
  extends V1_UpdatesHandling
  implements Hashable
{
  appendStrategy!: V1_AppendStrategy;

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.APPEND_ONLY_UPDATES,
      this.appendStrategy,
    ]);
  }
}

export class V1_OverwriteUpdatesHandling
  extends V1_UpdatesHandling
  implements Hashable
{
  get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.OVERWRITE_UPDATES]);
  }
}
