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

import {
  type Hashable,
  hashArray,
  tryToMinifyLosslessJSONString,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import { MappingTestAssert } from './MappingTestAssert.js';

export class ExpectedOutputMappingTestAssert
  extends MappingTestAssert
  implements Hashable
{
  expectedOutput: string;

  constructor(expectedOutput: string) {
    super();
    /**
     * @workaround https://github.com/finos/legend-studio/issues/68
     */
    this.expectedOutput = tryToMinifyLosslessJSONString(expectedOutput);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EXPECTED_OUTPUT_MAPPING_TEST_ASSERT,
      this.expectedOutput,
    ]);
  }
}
