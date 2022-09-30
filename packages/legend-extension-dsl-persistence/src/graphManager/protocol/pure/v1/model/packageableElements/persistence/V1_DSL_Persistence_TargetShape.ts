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

import type { V1_DeduplicationStrategy } from './V1_DSL_Persistence_DeduplicationStrategy.js';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';

export abstract class V1_TargetShape implements Hashable {
  abstract get hashCode(): string;
}

export class V1_FlatTarget extends V1_TargetShape implements Hashable {
  modelClass?: string | undefined;
  targetName!: string;
  partitionFields: string[] = [];
  deduplicationStrategy!: V1_DeduplicationStrategy;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.FLAT_TARGET,
      this.modelClass ?? '',
      this.targetName,
      hashArray(this.partitionFields),
      this.deduplicationStrategy,
    ]);
  }
}

export class V1_MultiFlatTarget extends V1_TargetShape implements Hashable {
  modelClass!: string;
  transactionScope!: V1_TransactionScope;
  parts: V1_MultiFlatTargetPart[] = [];

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.MULTI_FLAT_TARGET,
      this.modelClass,
      this.transactionScope,
      hashArray(this.parts),
    ]);
  }
}

export class V1_MultiFlatTargetPart implements Hashable {
  modelProperty!: string;
  targetName!: string;
  partitionFields: string[] = [];
  deduplicationStrategy!: V1_DeduplicationStrategy;

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.MULTI_FLAT_TARGET_PART,
      this.modelProperty,
      this.targetName,
      hashArray(this.partitionFields),
      this.deduplicationStrategy,
    ]);
  }
}

export enum V1_TransactionScope {
  SINGLE_TARGET = 'SINGLE_TARGET',
  ALL_TARGETS = 'ALL_TARGETS',
}
