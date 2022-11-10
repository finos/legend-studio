/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { V1_Auditing } from './V1_DSL_Persistence_Auditing.js';
import type { V1_MergeStrategy } from './V1_DSL_Persistence_MergeStrategy.js';
import type {
  V1_TransactionMilestoning,
  V1_ValidityMilestoning,
} from './V1_DSL_Persistence_Milestoning.js';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';

export abstract class V1_IngestMode implements Hashable {
  abstract get hashCode(): string;
}

// snapshot

export class V1_NontemporalSnapshot extends V1_IngestMode implements Hashable {
  auditing!: V1_Auditing;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NONTEMPORAL_SNAPSHOT,
      this.auditing,
    ]);
  }
}

export class V1_UnitemporalSnapshot extends V1_IngestMode implements Hashable {
  transactionMilestoning!: V1_TransactionMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNITEMPORAL_SNAPSHOT,
      this.transactionMilestoning,
    ]);
  }
}

export class V1_BitemporalSnapshot extends V1_IngestMode implements Hashable {
  transactionMilestoning!: V1_TransactionMilestoning;
  validityMilestoning!: V1_ValidityMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BITEMPORAL_SNAPSHOT,
      this.transactionMilestoning,
      this.validityMilestoning,
    ]);
  }
}

// delta

export class V1_NontemporalDelta extends V1_IngestMode implements Hashable {
  mergeStrategy!: V1_MergeStrategy;
  auditing!: V1_Auditing;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NONTEMPORAL_DELTA,
      this.mergeStrategy,
      this.auditing,
    ]);
  }
}

export class V1_UnitemporalDelta extends V1_IngestMode implements Hashable {
  mergeStrategy!: V1_MergeStrategy;
  transactionMilestoning!: V1_TransactionMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNITEMPORAL_DELTA,
      this.mergeStrategy,
      this.transactionMilestoning,
    ]);
  }
}

export class V1_BitemporalDelta extends V1_IngestMode implements Hashable {
  mergeStrategy!: V1_MergeStrategy;
  transactionMilestoning!: V1_TransactionMilestoning;
  validityMilestoning!: V1_ValidityMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BITEMPORAL_DELTA,
      this.mergeStrategy,
      this.transactionMilestoning,
      this.validityMilestoning,
    ]);
  }
}

// append only

export class V1_AppendOnly extends V1_IngestMode implements Hashable {
  auditing!: V1_Auditing;
  filterDuplicates!: boolean;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.APPEND_ONLY,
      this.auditing,
      this.filterDuplicates.toString(),
    ]);
  }
}
