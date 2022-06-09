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

import type { Auditing } from './DSLPersistence_Auditing.js';
import type { MergeStrategy } from './DSLPersistence_MergeStrategy.js';
import type {
  TransactionMilestoning,
  ValidityMilestoning,
} from './DSLPersistence_Milestoning.js';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSLPersistence_ModelUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';

export abstract class IngestMode implements Hashable {
  abstract get hashCode(): string;
}

// snapshot

export class NontemporalSnapshot extends IngestMode implements Hashable {
  auditing!: Auditing;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NONTEMPORAL_SNAPSHOT,
      this.auditing,
    ]);
  }
}

export class UnitemporalSnapshot extends IngestMode implements Hashable {
  transactionMilestoning!: TransactionMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNITEMPORAL_SNAPSHOT,
      this.transactionMilestoning,
    ]);
  }
}

export class BitemporalSnapshot extends IngestMode implements Hashable {
  transactionMilestoning!: TransactionMilestoning;
  validityMilestoning!: ValidityMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BITEMPORAL_SNAPSHOT,
      this.transactionMilestoning,
      this.validityMilestoning,
    ]);
  }
}

// delta

export class NontemporalDelta extends IngestMode implements Hashable {
  mergeStrategy!: MergeStrategy;
  auditing!: Auditing;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NONTEMPORAL_DELTA,
      this.mergeStrategy,
      this.auditing,
    ]);
  }
}

export class UnitemporalDelta extends IngestMode implements Hashable {
  mergeStrategy!: MergeStrategy;
  transactionMilestoning!: TransactionMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNITEMPORAL_DELTA,
      this.mergeStrategy,
      this.transactionMilestoning,
    ]);
  }
}

export class BitemporalDelta extends IngestMode implements Hashable {
  mergeStrategy!: MergeStrategy;
  transactionMilestoning!: TransactionMilestoning;
  validityMilestoning!: ValidityMilestoning;

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

export class AppendOnly extends IngestMode implements Hashable {
  auditing!: Auditing;
  filterDuplicates!: boolean;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.APPEND_ONLY,
      this.auditing,
      this.filterDuplicates.toString(),
    ]);
  }
}
