import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';

export abstract class SourceTimeFields implements Hashable {
  abstract get hashCode(): string;
}

export class SourceTimeStart extends SourceTimeFields {
  startField!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_TIME_START,
      this.startField,
    ]);
  }
}

export class SourceTimeStartAndEnd extends SourceTimeFields {
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
