import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';

export abstract class Deduplication implements Hashable {
  abstract get hashCode(): string;
}

export class NoDeduplication extends Deduplication {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_DEDUPLICATION]);
  }
}

export class AnyVersion extends Deduplication {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.ANY_VERSION]);
  }
}

export abstract class MaxVersion extends Deduplication {}

export class MaxVersionForGraphFetch extends MaxVersion {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.MAX_VERSION_FOR_GRAPH_FETCH]);
  }
}

export class MaxVersionForTds extends MaxVersion {
  versionField!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.MAX_VERSION_FOR_TDS,
      this.versionField,
    ]);
  }
}
