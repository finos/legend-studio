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

import { hashArray, uuid, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import type { Mapping } from '../mapping/Mapping.js';
import type { RawLambda } from '../../rawValueSpecification/RawLambda.js';
import type { Service } from './Service.js';
import type { Runtime } from '../runtime/Runtime.js';
import type { PackageableElementReference } from '../PackageableElementReference.js';

export abstract class ServiceExecution implements Hashable {
  abstract get hashCode(): string;
}

export class PureExecution extends ServiceExecution implements Hashable {
  readonly _OWNER: Service;

  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  func: RawLambda;

  constructor(func: RawLambda, owner: Service) {
    super();
    this.func = func;
    this._OWNER = owner;
  }

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.SERVICE_PURE_EXECUTION, this.func]);
  }
}

export class PureSingleExecution extends PureExecution implements Hashable {
  mapping: PackageableElementReference<Mapping> | undefined;
  runtime: Runtime | undefined;

  constructor(
    func: RawLambda,
    owner: Service,
    mapping: PackageableElementReference<Mapping> | undefined,
    runtime: Runtime | undefined,
  ) {
    super(func, owner);
    this.mapping = mapping;
    this.runtime = runtime;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_PURE_SINGLE_EXECUTION,
      super.hashCode,
      this.mapping?.valueForSerialization ?? '',
      this.runtime ?? '',
    ]);
  }
}

export class KeyedExecutionParameter implements Hashable {
  readonly _UUID = uuid();

  key: string;
  mapping: PackageableElementReference<Mapping>;
  runtime: Runtime;

  constructor(
    key: string,
    mapping: PackageableElementReference<Mapping>,
    runtime: Runtime,
  ) {
    this.key = key;
    this.mapping = mapping;
    this.runtime = runtime;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_KEYED_EXECUTION_PARAMETER,
      this.key,
      this.mapping.valueForSerialization ?? '',
      this.runtime,
    ]);
  }
}

export class PureMultiExecution extends PureExecution implements Hashable {
  executionKey: string | undefined;
  executionParameters: KeyedExecutionParameter[] | undefined;

  constructor(
    executionKey: string | undefined,
    func: RawLambda,
    parentService: Service,
  ) {
    super(func, parentService);
    this.executionKey = executionKey;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_PURE_MULTI_EXECUTION,
      super.hashCode,
      this.executionKey,
      hashArray(this.executionParameters ?? []),
    ]);
  }
}
