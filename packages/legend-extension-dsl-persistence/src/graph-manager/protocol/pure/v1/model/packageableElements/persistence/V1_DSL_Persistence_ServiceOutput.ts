import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import { V1_DatasetType } from './V1_DSL_Persistence_DatasetType.js';
import { V1_Deduplication } from './V1_DSL_Persistence_Deduplication.js';

export abstract class V1_ServiceOutput implements Hashable {
  deduplication!: V1_Deduplication;
  datasetType!: V1_DatasetType;

  abstract get hashCode(): string;
}

export class V1_GraphFetchServiceOutput extends V1_ServiceOutput {
  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.GRAPH_FETCH_SERVICE_OUTPUT,
      this.deduplication,
      this.datasetType,
    ]);
  }
}

export class V1_TdsServiceOutput extends V1_ServiceOutput {
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
