import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import { V1_UpdatesHandling } from './V1_DSL_Persistence_UpdatesHandling.js';
import { V1_ProcessingDimension } from './V1_DSL_Persistence_ProcessingDimension.js';
import { V1_SourceDerivedDimension } from './V1_DSL_Persistence_SourceDerivedDimension.js';
import { V1_AuditingV2 } from './V1_DSL_Persistence_AuditingV2.js';

export abstract class V1_Temporality implements Hashable {
  abstract get hashCode(): string;
}

export class V1_NonTemporal extends V1_Temporality {
  auditing!: V1_AuditingV2;
  updatesHandling!: V1_UpdatesHandling;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NON_TEMPORAL,
      this.auditing,
      this.updatesHandling,
    ]);
  }
}

export class V1_UniTemporal extends V1_Temporality {
  processingDimension!: V1_ProcessingDimension;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNI_TEMPORAL,
      this.processingDimension,
    ]);
  }
}

export class V1_BiTemporal extends V1_Temporality {
  processingDimension!: V1_ProcessingDimension;
  sourceDerivedDimension!: V1_SourceDerivedDimension;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNI_TEMPORAL,
      this.processingDimension,
      this.sourceDerivedDimension,
    ]);
  }
}
