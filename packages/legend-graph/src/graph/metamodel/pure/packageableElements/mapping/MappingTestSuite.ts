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
import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import { TestSuite } from '../../test/Test.js';
import type { StoreTestData } from './MappingStoreTestData.js';
import type { RawLambda } from '../../rawValueSpecification/RawLambda.js';

export abstract class MappingTestSuite extends TestSuite implements Hashable {}

export class MappingDataTestSuite extends MappingTestSuite implements Hashable {
  storeTestData: StoreTestData[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING_TEST_DATA_SUITE,
      this.id,
      this.doc ?? '',
      hashArray(this.storeTestData),
      hashArray(this.tests),
    ]);
  }
}

export class MappingQueryTestSuite
  extends MappingTestSuite
  implements Hashable
{
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  func!: RawLambda;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING_TEST_QUERY_SUITE,
      this.id,
      this.doc ?? '',
      this.func,
      hashArray(this.tests),
    ]);
  }
}
