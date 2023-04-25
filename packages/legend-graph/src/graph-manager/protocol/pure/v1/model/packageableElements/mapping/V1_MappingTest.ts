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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_RawLambda } from '../../rawValueSpecification/V1_RawLambda.js';
import { V1_AtomicTest } from '../../test/V1_AtomicTest.js';
import type { V1_MappingStoreTestData } from './V1_MappingStoreTestData.js';

export abstract class V1_MappingTest
  extends V1_AtomicTest
  implements Hashable {}

export class V1_MappingQueryTest extends V1_MappingTest implements Hashable {
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  query!: V1_RawLambda;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING_QUERY_TEST,
      this.id,
      this.doc ?? '',
      this.query,
      hashArray(this.assertions),
    ]);
  }
}

export class V1_MappingDataTest extends V1_MappingTest implements Hashable {
  storeTestData: V1_MappingStoreTestData[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING_DATA_TEST,
      this.id,
      this.doc ?? '',
      hashArray(this.storeTestData),
      hashArray(this.assertions),
    ]);
  }
}
