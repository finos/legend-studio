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
import { V1_TestSuite } from '../../test/V1_TestSuite.js';
import type { V1_MappingStoreTestData } from './V1_MappingStoreTestData.js';
import type { V1_RawLambda } from '../../rawValueSpecification/V1_RawLambda.js';

export abstract class V1_MappingTestSuite
  extends V1_TestSuite
  implements Hashable {}

export class V1_MappingDataTestSuite
  extends V1_MappingTestSuite
  implements Hashable
{
  storeTestData: V1_MappingStoreTestData[] = [];

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

export class V1_MappingQueryTestSuite
  extends V1_MappingTestSuite
  implements Hashable
{
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  func!: V1_RawLambda;

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
