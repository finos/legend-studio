import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';

export abstract class V1_AppendStrategy implements Hashable {
  abstract get hashCode(): string;
}

export class V1_AllowDuplicates extends V1_AppendStrategy implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.ALLOW_DUPLICATES]);
  }
}

export class V1_FailOnDuplicates extends V1_AppendStrategy implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.FAIL_ON_DUPLICATES]);
  }
}

export class V1_FilterDuplicates extends V1_AppendStrategy implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.FAIL_ON_DUPLICATES]);
  }
}
