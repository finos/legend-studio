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

import { type Hashable, uuid, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { RawLambda } from '../../rawValueSpecification/RawLambda';
import type { Service } from './Service';

export abstract class ServiceTest implements Hashable {
  owner: Service;

  constructor(owner: Service) {
    this.owner = owner;
  }

  abstract get hashCode(): string;
}

export class TestContainer implements Hashable {
  readonly uuid = uuid();

  parametersValues: unknown[] = []; // Any[*]; // ValueSpecification?
  assert: RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda
  singleExecutionTestParent: SingleExecutionTest;

  constructor(assert: RawLambda, parent: SingleExecutionTest) {
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

export class SingleExecutionTest extends ServiceTest implements Hashable {
  data: string;
  asserts: TestContainer[] = [];

  constructor(owner: Service, data: string) {
    super(owner);
    this.data = data;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_SINGLE_EXECUTION_TEST,
      this.data,
      hashArray(this.asserts),
    ]);
  }
}

export class KeyedSingleExecutionTest
  extends SingleExecutionTest
  implements Hashable
{
  key: string;

  constructor(key: string, parentService: Service, data: string) {
    super(parentService, data);
    this.key = key;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_KEYED_SINGLE_EXECUTION_TEST,
      this.key,
      this.data,
      hashArray(this.asserts),
    ]);
  }
}

export class MultiExecutionTest extends ServiceTest implements Hashable {
  tests: KeyedSingleExecutionTest[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_MULTI_EXECUTION_TEST,
      hashArray(this.tests),
    ]);
  }
}
