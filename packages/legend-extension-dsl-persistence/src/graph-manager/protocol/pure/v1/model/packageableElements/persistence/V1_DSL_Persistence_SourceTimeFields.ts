import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';

export abstract class V1_SourceTimeFields implements Hashable {
  abstract get hashCode(): string;
}

export class V1_SourceTimeStart extends V1_SourceTimeFields {
  startField!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_TIME_START,
      this.startField,
    ]);
  }
}

export class V1_SourceTimeStartAndEnd extends V1_SourceTimeFields {
  startField!: string;
  endField!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_TIME_START_AND_END,
      this.startField,
      this.endField,
    ]);
  }
}
