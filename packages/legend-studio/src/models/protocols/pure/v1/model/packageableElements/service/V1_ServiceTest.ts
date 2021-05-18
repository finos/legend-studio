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

import { hashArray } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../MetaModelConst';
import type { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda';

export abstract class V1_ServiceTest implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_ServiceTest';

  abstract get hashCode(): string;
}

export class V1_TestContainer implements Hashable {
  parameterValues: unknown[] = []; // ValueSpecification?
  assert!: V1_RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_TEST_CONTAINER,
      // this.parameterValues,
      this.assert,
    ]);
  }
}

export class V1_SingleExecutionTest extends V1_ServiceTest implements Hashable {
  data!: string;
  asserts: V1_TestContainer[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_SINGLE_EXECUTION_TEST,
      this.data,
      hashArray(this.asserts),
    ]);
  }
}

export class V1_KeyedSingleExecutionTest implements Hashable {
  key!: string;
  data!: string;
  asserts: V1_TestContainer[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_KEYED_SINGLE_EXECUTION_TEST,
      this.key,
      this.data,
      hashArray(this.asserts),
    ]);
  }
}

export class V1_MultiExecutionTest extends V1_ServiceTest implements Hashable {
  tests: V1_KeyedSingleExecutionTest[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_MULTI_EXECUTION_TEST,
      hashArray(this.tests),
    ]);
  }
}
