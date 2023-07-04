import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';

export abstract class AppendStrategy implements Hashable {
  abstract get hashCode(): string;
}

export class AllowDuplicates extends AppendStrategy implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.ALLOW_DUPLICATES]);
  }
}

export class FailOnDuplicates extends AppendStrategy implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.FAIL_ON_DUPLICATES]);
  }
}

export class FilterDuplicates extends AppendStrategy implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.FAIL_ON_DUPLICATES]);
  }
}
