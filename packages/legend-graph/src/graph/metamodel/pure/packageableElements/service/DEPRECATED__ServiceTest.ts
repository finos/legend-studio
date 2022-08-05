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

import { type Hashable, hashArray, uuid } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import type { RawLambda } from '../../rawValueSpecification/RawLambda.js';
import type { Service } from './Service.js';

/**
 * TODO: Remove once migration from `ServiceTest_Legacy` to `ServiceTest` is complete
 * @deprecated
 */
export abstract class DEPRECATED__ServiceTest implements Hashable {
  readonly _OWNER: Service;

  constructor(owner: Service) {
    this._OWNER = owner;
  }

  abstract get hashCode(): string;
}

/**
 * TODO: Remove once migration from `ServiceTest_Legacy` to `ServiceTest` is complete
 * @deprecated
 */
export class DEPRECATED__TestContainer implements Hashable {
  readonly _UUID = uuid();

  parametersValues: unknown[] = []; // Any[*]; // ValueSpecification?
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  assert: RawLambda;
  singleExecutionTestParent: DEPRECATED__SingleExecutionTest;

  constructor(assert: RawLambda, parent: DEPRECATED__SingleExecutionTest) {
    this.assert = assert;
    this.singleExecutionTestParent = parent;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_TEST_CONTAINER,
      // this.parameterValues,
      this.assert,
    ]);
  }
}

/**
 * TODO: Remove once migration from `ServiceTest_Legacy` to `ServiceTest` is complete
 * @deprecated
 */
export class DEPRECATED__SingleExecutionTest
  extends DEPRECATED__ServiceTest
  implements Hashable
{
  data: string;
  asserts: DEPRECATED__TestContainer[] = [];

  constructor(owner: Service, data: string) {
    super(owner);
    this.data = data;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_LEGACY_SINGLE_EXECUTION_TEST,
      this.data,
      hashArray(this.asserts),
    ]);
  }
}

/**
 * TODO: Remove once migration from `ServiceTest_Legacy` to `ServiceTest` is complete
 * @deprecated
 */
export class DEPRECATED__KeyedSingleExecutionTest
  extends DEPRECATED__SingleExecutionTest
  implements Hashable
{
  key: string;

  constructor(key: string, parentService: Service, data: string) {
    super(parentService, data);
    this.key = key;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_LEGACY_KEYED_SINGLE_EXECUTION_TEST,
      this.key,
      this.data,
      hashArray(this.asserts),
    ]);
  }
}

/**
 * TODO: Remove once migration from `ServiceTest_Legacy` to `ServiceTest` is complete
 * @deprecated
 */
export class DEPRECATED__MultiExecutionTest
  extends DEPRECATED__ServiceTest
  implements Hashable
{
  tests: DEPRECATED__KeyedSingleExecutionTest[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_LEGACY_MULTI_EXECUTION_TEST,
      hashArray(this.tests),
    ]);
  }
}
