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

import type { DeduplicationStrategy } from './DSL_Persistence_DeduplicationStrategy.js';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import type { Class, PackageableElementReference } from '@finos/legend-graph';

export abstract class TargetShape implements Hashable {
  abstract get hashCode(): string;
}

export class FlatTarget extends TargetShape implements Hashable {
  modelClass?: PackageableElementReference<Class> | undefined;
  targetName!: string;
  partitionFields: string[] = [];
  deduplicationStrategy!: DeduplicationStrategy;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.FLAT_TARGET,
      this.modelClass?.valueForSerialization ?? '',
      this.targetName,
      hashArray(this.partitionFields),
      this.deduplicationStrategy,
    ]);
  }
}

export class MultiFlatTarget extends TargetShape implements Hashable {
  modelClass!: PackageableElementReference<Class>;
  transactionScope!: TransactionScope;
  parts: MultiFlatTargetPart[] = [];

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.MULTI_FLAT_TARGET,
      this.modelClass.valueForSerialization ?? '',
      this.transactionScope,
      hashArray(this.parts),
    ]);
  }
}

export class MultiFlatTargetPart implements Hashable {
  modelProperty!: string;
  targetName!: string;
  partitionFields: string[] = [];
  deduplicationStrategy!: DeduplicationStrategy;

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

export enum TransactionScope {
  SINGLE_TARGET = 'SINGLE_TARGET',
  ALL_TARGETS = 'ALL_TARGETS',
}
