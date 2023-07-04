import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import { V1_SourceTimeFields } from './V1_DSL_Persistence_SourceTimeFields.js';

export abstract class V1_SourceDerivedDimension implements Hashable {
  abstract get hashCode(): string;
}

export class V1_SourceDerivedTime extends V1_SourceDerivedDimension {
  timeStart!: string;
  timeEnd!: string;
  sourceTimeFields!: V1_SourceTimeFields;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_DERIVED_TIME,
      this.timeStart,
      this.timeEnd,
    ]);
  }
}
