import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';

export abstract class V1_EmptyDatasetHandling implements Hashable {
  abstract get hashCode(): string;
}

export class V1_NoOp extends V1_EmptyDatasetHandling {
  get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_OP_DATASET_HANDLING]);
  }
}

export class V1_DeleteTargetDataset extends V1_EmptyDatasetHandling {
  get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.DELETE_TARGET_DATASET]);
  }
}
