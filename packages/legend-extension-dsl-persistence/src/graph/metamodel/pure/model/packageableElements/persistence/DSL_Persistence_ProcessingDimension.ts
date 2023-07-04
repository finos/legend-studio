import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';

export abstract class ProcessingDimension implements Hashable {
  abstract get hashCode(): string;
}

export class BatchId extends ProcessingDimension implements Hashable {
  batchIdIn!: string;
  batchIdOut!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_ID,
      this.batchIdIn,
      this.batchIdOut,
    ]);
  }
}

export class ProcessingDateTime extends ProcessingDimension {
  timeIn!: string;
  timeOut!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.PROCESSING_DATE_TIME,
      this.timeIn,
      this.timeOut,
    ]);
  }
}

export class BatchIdAndDateTime extends ProcessingDimension {
  batchIdIn!: string;
  batchIdOut!: string;
  timeIn!: string;
  timeOut!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_ID_AND_DATE_TIME,
      this.batchIdIn,
      this.batchIdOut,
      this.timeIn,
      this.timeOut,
    ]);
  }
}
