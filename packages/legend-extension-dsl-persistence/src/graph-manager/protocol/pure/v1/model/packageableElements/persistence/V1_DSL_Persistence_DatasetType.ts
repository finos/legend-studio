import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import { V1_ActionIndicatorFields } from './V1_DSL_Persistence_ActionIndicatorFields.js';
import { V1_Partitioning } from './V1_DSL_Persistence_Partitioning.js';

export abstract class V1_DatasetType implements Hashable {
  abstract get hashCode(): string;
}

export class V1_Snapshot extends V1_DatasetType {
  partitioning!: V1_Partitioning;

  override get hashCode(): string {
    console.log('SHOW SOME MESSAGE');
    return hashArray([PERSISTENCE_HASH_STRUCTURE.SNAPSHOT, this.partitioning]);
  }
}

export class V1_Delta extends V1_DatasetType {
  actionIndicator!: V1_ActionIndicatorFields;

  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.DELTA, this.actionIndicator]);
  }
}
