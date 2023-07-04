import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';
import { AppendStrategy } from './DSL_Persistence_AppendStrategy.js';

export abstract class UpdatesHandling implements Hashable {
  abstract get hashCode(): string;
}

export class AppendOnlyUpdatesHandling
  extends UpdatesHandling
  implements Hashable
{
  appendStrategy!: AppendStrategy;

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.APPEND_ONLY_UPDATES,
      this.appendStrategy,
    ]);
  }
}

export class OverwriteUpdatesHandling
  extends UpdatesHandling
  implements Hashable
{
  get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.OVERWRITE_UPDATES]);
  }
}
