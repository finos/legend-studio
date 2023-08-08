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
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import type { V1_DatasetType } from './V1_DSL_Persistence_DatasetType.js';
import type { V1_Deduplication } from './V1_DSL_Persistence_Deduplication.js';
import { hashObjectWithoutSourceInformation } from '@finos/legend-graph';

export abstract class V1_ServiceOutput implements Hashable {
  deduplication!: V1_Deduplication;
  datasetType!: V1_DatasetType;

  abstract get hashCode(): string;
}

export class V1_GraphFetchServiceOutput extends V1_ServiceOutput {
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  keys!: object[];
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  path!: object;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.GRAPH_FETCH_SERVICE_OUTPUT,
      this.deduplication,
      this.datasetType,
      hashObjectWithoutSourceInformation(this.keys),
      hashObjectWithoutSourceInformation(this.path),
    ]);
  }
}

export class V1_TdsServiceOutput extends V1_ServiceOutput {
  keys: string[] = [];
  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.TDS_SERVICE_OUTPUT,
      this.deduplication,
      this.datasetType,
      hashArray(this.keys),
    ]);
  }
}
