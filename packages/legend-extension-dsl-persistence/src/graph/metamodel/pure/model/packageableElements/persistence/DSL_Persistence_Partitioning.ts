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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';
import type { EmptyDatasetHandling } from './DSL_Persistence_EmptyDatasetHandling.js';
import { hashObjectWithoutSourceInformation } from '@finos/legend-graph';

export abstract class Partitioning implements Hashable {
  abstract get hashCode(): string;
}

export class NoPartitioning extends Partitioning {
  emptyDatasetHandling!: EmptyDatasetHandling;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NO_PARTITIONING,
      this.emptyDatasetHandling,
    ]);
  }
}

export abstract class FieldBased extends Partitioning {}

export class FieldBasedForGraphFetch extends FieldBased {
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  partitionFieldPaths!: object[];

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.FIELD_BASED_FOR_GRAPH_FETCH,
      hashObjectWithoutSourceInformation(this.partitionFieldPaths),
    ]);
  }
}

export class FieldBasedForTds extends FieldBased {
  partitionFields: string[] = [];

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.FIEDD_BASED_FOR_TDS,
      hashArray(this.partitionFields),
    ]);
  }
}
