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

import { V1_TestBatch } from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import type { V1_PersistenceTestData } from './V1_DSL_Persistence_PersistenceTestData.js';

export class V1_PersistenceTestBatch extends V1_TestBatch implements Hashable {
  testData!: V1_PersistenceTestData;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.PERSISTENCE_TEST_BATCH,
      this.id,
      this.testData,
      hashArray(this.assertions),
    ]);
  }
}
