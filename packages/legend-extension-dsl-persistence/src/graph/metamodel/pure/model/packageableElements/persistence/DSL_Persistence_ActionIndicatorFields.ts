import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';

export abstract class ActionIndicatorFields implements Hashable {
  abstract get hashCode(): string;
}

export class NoActionIndicator implements ActionIndicatorFields {
  get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_ACTION_INDICATOR]);
  }
}

export abstract class DeleteIndicator extends ActionIndicatorFields {
  deleteValues: string[] = [];
}

export class DeleteIndicatorForGraphFetch extends DeleteIndicator {
  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DELETE_INDICATOR_FOR_GRAPH_FETCH,
    ]);
  }
}

export class DeleteIndicatorForTds extends DeleteIndicator {
  deleteField!: string;

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DELETE_INDICATOR_FOR_TDS,
      this.deleteField,
    ]);
  }
}
