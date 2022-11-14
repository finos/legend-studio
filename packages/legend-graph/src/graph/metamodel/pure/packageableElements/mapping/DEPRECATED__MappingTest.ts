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

import { uuid, hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../Core_HashUtils.js';
import type { MappingTestAssert } from './MappingTestAssert.js';
import type { InputData } from './InputData.js';
import type { RawLambda } from '../../rawValueSpecification/RawLambda.js';

/**
 * TODO: Remove once migration from `MappingTest_Legacy` to `MappingTest` is complete
 * @deprecated
 */
export class DEPRECATED__MappingTest implements Hashable {
  readonly _UUID = uuid();

  name: string;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  query: RawLambda;
  inputData: InputData[] = [];
  assert: MappingTestAssert;

  constructor(
    name: string,
    query: RawLambda,
    inputData: InputData[],
    assert: MappingTestAssert,
  ) {
    this.name = name;
    this.query = query;
    this.inputData = inputData;
    this.assert = assert;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING_TEST_LEGACY,
      this.name,
      this.query,
      hashArray(this.inputData),
      this.assert,
    ]);
  }
}
