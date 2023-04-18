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
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_RawLambda } from '../../rawValueSpecification/V1_RawLambda.js';

/**
 * TODO: Remove once migration from `V1_ServiceTest_Legacy` to `V1_ServiceTest` is complete
 * @deprecated
 */
export abstract class V1_DEPRECATED__ServiceTest implements Hashable {
  abstract get hashCode(): string;
}

/**
 * TODO: Remove once migration from `V1_ServiceTest_Legacy` to `V1_ServiceTest` is complete
 * @deprecated
 */
export class V1_DEPRECATED__TestContainer implements Hashable {
  parametersValues: unknown[] = []; // ValueSpecification?
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  assert!: V1_RawLambda;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_TEST_CONTAINER,
      // this.parameterValues,
      this.assert,
    ]);
  }
}

/**
 * TODO: Remove once migration from `V1_ServiceTest_Legacy` to `V1_ServiceTest` is complete
 * @deprecated
 */
export class V1_DEPRECATED__SingleExecutionTest
  extends V1_DEPRECATED__ServiceTest
  implements Hashable
{
  data!: string;
  asserts: V1_DEPRECATED__TestContainer[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_LEGACY_SINGLE_EXECUTION_TEST,
      this.data,
      hashArray(this.asserts),
    ]);
  }
}

/**
 * TODO: Remove once migration from `V1_ServiceTest_Legacy` to `V1_ServiceTest` is complete
 * @deprecated
 */
export class V1_DEPRECATED__KeyedSingleExecutionTest implements Hashable {
  key!: string;
  data!: string;
  asserts: V1_DEPRECATED__TestContainer[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_LEGACY_KEYED_SINGLE_EXECUTION_TEST,
      this.key,
      this.data,
      hashArray(this.asserts),
    ]);
  }
}

/**
 * TODO: Remove once migration from `V1_ServiceTest_Legacy` to `V1_ServiceTest` is complete
 * @deprecated
 */
export class V1_DEPRECATED__MultiExecutionTest
  extends V1_DEPRECATED__ServiceTest
  implements Hashable
{
  tests: V1_DEPRECATED__KeyedSingleExecutionTest[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_LEGACY_MULTI_EXECUTION_TEST,
      hashArray(this.tests),
    ]);
  }
}
