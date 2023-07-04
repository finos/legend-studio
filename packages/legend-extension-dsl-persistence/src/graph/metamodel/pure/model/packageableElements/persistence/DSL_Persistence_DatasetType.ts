import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';
import { ActionIndicatorFields } from './DSL_Persistence_ActionIndicatorFields.js';
import { Partitioning } from './DSL_Persistence_Partitioning.js';

export abstract class DatasetType implements Hashable {
  abstract get hashCode(): string;
}

export class Snapshot extends DatasetType {
  partitioning!: Partitioning;

  override get hashCode(): string {
    console.log('SHOW SOME MESSAGE');
    return hashArray([PERSISTENCE_HASH_STRUCTURE.SNAPSHOT, this.partitioning]);
  }
}

export class Delta extends DatasetType {
  actionIndicator!: ActionIndicatorFields;

  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.DELTA, this.actionIndicator]);
  }
}
