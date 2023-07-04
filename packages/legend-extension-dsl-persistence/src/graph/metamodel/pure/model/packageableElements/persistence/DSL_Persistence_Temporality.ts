import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';
import { UpdatesHandling } from './DSL_Persistence_UpdatesHandling.js';
import { ProcessingDimension } from './DSL_Persistence_ProcessingDimension.js';
import { SourceDerivedDimension } from './DSL_Persistence_SourceDerivedDimension.js';
import { AuditingV2 } from './DSL_Persistence_AuditingV2.js';

export abstract class Temporality implements Hashable {
  abstract get hashCode(): string;
}

export class NonTemporal extends Temporality {
  auditing!: AuditingV2;
  updatesHandling!: UpdatesHandling;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NON_TEMPORAL,
      this.auditing,
      this.updatesHandling,
    ]);
  }
}

export class UniTemporal extends Temporality {
  processingDimension!: ProcessingDimension;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNI_TEMPORAL,
      this.processingDimension,
    ]);
  }
}

export class BiTemporal extends Temporality {
  processingDimension!: ProcessingDimension;
  sourceDerivedDimension!: SourceDerivedDimension;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNI_TEMPORAL,
      this.processingDimension,
      this.sourceDerivedDimension,
    ]);
  }
}
