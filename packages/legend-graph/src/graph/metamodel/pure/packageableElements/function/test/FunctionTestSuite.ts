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

import { hashArray } from '@finos/legend-shared';
import { TestSuite } from '../../../test/Test.js';
import type { FunctionTestData } from './FunctionTestData.js';
import { CORE_HASH_STRUCTURE } from '../../../../../Core_HashUtils.js';

export class FunctionTestSuite extends TestSuite {
  testData: FunctionTestData[] | undefined;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FUNCTION_TEST_SUITE,
      this.id,
      this.doc ?? '',
      this.testData?.length ? hashArray(this.testData) : '',
      hashArray(this.tests),
    ]);
  }
}
