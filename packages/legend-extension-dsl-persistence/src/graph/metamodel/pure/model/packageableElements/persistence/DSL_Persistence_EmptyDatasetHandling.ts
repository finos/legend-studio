import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';

export abstract class EmptyDatasetHandling implements Hashable {
  abstract get hashCode(): string;
}

export class NoOp extends EmptyDatasetHandling {
  get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_OP_DATASET_HANDLING]);
  }
}

export class DeleteTargetDataset extends EmptyDatasetHandling {
  get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.DELETE_TARGET_DATASET]);
  }
}
