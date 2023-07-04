import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';

export abstract class V1_ActionIndicatorFields implements Hashable {
  abstract get hashCode(): string;
}

export class V1_NoActionIndicator implements V1_ActionIndicatorFields {
  get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_ACTION_INDICATOR]);
  }
}

export abstract class V1_DeleteIndicator extends V1_ActionIndicatorFields {
  deleteValues: string[] = [];
}

export class V1_DeleteIndicatorForGraphFetch extends V1_DeleteIndicator {
  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DELETE_INDICATOR_FOR_GRAPH_FETCH,
    ]);
  }
}

export class V1_DeleteIndicatorForTds extends V1_DeleteIndicator {
  deleteField!: string;

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DELETE_INDICATOR_FOR_TDS,
      this.deleteField,
    ]);
  }
}
