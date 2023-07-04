import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';

export abstract class V1_Deduplication implements Hashable {
  abstract get hashCode(): string;
}

export class V1_NoDeduplication extends V1_Deduplication {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_DEDUPLICATION]);
  }
}

export class V1_AnyVersion extends V1_Deduplication {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.ANY_VERSION]);
  }
}

export abstract class V1_MaxVersion extends V1_Deduplication {}

export class V1_MaxVersionForGraphFetch extends V1_MaxVersion {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.MAX_VERSION_FOR_GRAPH_FETCH]);
  }
}

export class V1_MaxVersionForTds extends V1_MaxVersion {
  versionField!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.MAX_VERSION_FOR_TDS,
      this.versionField,
    ]);
  }
}
