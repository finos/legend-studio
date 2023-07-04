import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';
import { DatasetType } from './DSL_Persistence_DatasetType.js';
import { Deduplication } from './DSL_Persistence_Deduplication.js';

export abstract class ServiceOutput implements Hashable {
  deduplication!: Deduplication;
  datasetType!: DatasetType;

  abstract get hashCode(): string;
}

export class GraphFetchServiceOutput extends ServiceOutput {
  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.GRAPH_FETCH_SERVICE_OUTPUT,
      this.deduplication,
      this.datasetType,
    ]);
  }
}

export class TdsServiceOutput extends ServiceOutput {
  keys: string[] = [];
  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.TDS_SERVICE_OUTPUT,
      this.deduplication,
      this.datasetType,
      hashArray(this.keys),
    ]);
  }
}
