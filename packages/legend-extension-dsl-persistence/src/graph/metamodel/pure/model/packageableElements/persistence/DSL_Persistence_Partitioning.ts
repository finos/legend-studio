import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';
import { EmptyDatasetHandling } from './DSL_Persistence_EmptyDatasetHandling.js';

export abstract class Partitioning implements Hashable {
  abstract get hashCode(): string;
}

export class NoPartitioning extends Partitioning {
  emptyDatasetHandling!: EmptyDatasetHandling;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NO_PARTITIONING,
      this.emptyDatasetHandling,
    ]);
  }
}

export abstract class FieldBased extends Partitioning {}

export class FieldBasedForGraphFetch extends FieldBased {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.FIELD_BASED_FOR_GRAPH_FETCH]);
  }
}

export class FieldBasedForTds extends FieldBased {
  partitionFields: string[] = [];

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.FIEDD_BASED_FOR_TDS,
      hashArray(this.partitionFields),
    ]);
  }
}
