import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';
import { SourceTimeFields } from './DSL_Persistence_SourceTimeFields.js';

export abstract class SourceDerivedDimension implements Hashable {
  abstract get hashCode(): string;
}

export class SourceDerivedTime extends SourceDerivedDimension {
  timeStart!: string;
  timeEnd!: string;
  sourceTimeFields!: SourceTimeFields;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_DERIVED_TIME,
      this.timeStart,
      this.timeEnd,
    ]);
  }
}
