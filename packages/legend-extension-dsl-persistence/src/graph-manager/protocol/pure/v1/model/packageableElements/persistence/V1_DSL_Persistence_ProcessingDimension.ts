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

export abstract class V1_ProcessingDimension implements Hashable {
  abstract get hashCode(): string;
}

export class V1_BatchId extends V1_ProcessingDimension implements Hashable {
  batchIdIn!: string;
  batchIdOut!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_ID,
      this.batchIdIn,
      this.batchIdOut,
    ]);
  }
}

export class V1_ProcessingDateTime extends V1_ProcessingDimension {
  timeIn!: string;
  timeOut!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.PROCESSING_DATE_TIME,
      this.timeIn,
      this.timeOut,
    ]);
  }
}

export class V1_BatchIdAndDateTime extends V1_ProcessingDimension {
  batchIdIn!: string;
  batchIdOut!: string;
  timeIn!: string;
  timeOut!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_ID_AND_DATE_TIME,
      this.batchIdIn,
      this.batchIdOut,
      this.timeIn,
      this.timeOut,
    ]);
  }
}
