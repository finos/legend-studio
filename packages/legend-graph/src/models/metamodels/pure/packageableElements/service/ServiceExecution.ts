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
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { Mapping } from '../mapping/Mapping';
import type { RawLambda } from '../../rawValueSpecification/RawLambda';
import type { Service } from './Service';
import type { Runtime } from '../runtime/Runtime';
import {
  type ValidationIssue,
  createValidationError,
} from '../../../../../helpers/ValidationHelper';
import type { PackageableElementReference } from '../PackageableElementReference';

export abstract class ServiceExecution implements Hashable {
  abstract get hashCode(): string;
}

export class PureExecution extends ServiceExecution implements Hashable {
  owner: Service;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  func: RawLambda;

  constructor(func: RawLambda, owner: Service) {
    super();
    this.func = func;
    this.owner = owner;
  }

  get queryValidationResult(): ValidationIssue | undefined {
    if (this.func.isStub) {
      return createValidationError([
        'Service execution function cannot be empty',
      ]);
    }
    // TODO: put this logic back when we properly process lambda - we can't pass the graph manager here to check this
    // else if (isGetAllLambda(this.func)) {
    //   return createValidationError(['Non-empty graph fetch tree is required']);
    // }
    return undefined;
  }

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.SERVICE_PURE_EXECUTION, this.func]);
  }
}

export class PureSingleExecution extends PureExecution implements Hashable {
  mapping: PackageableElementReference<Mapping>;
  runtime: Runtime;

  constructor(
    func: RawLambda,
    owner: Service,
    mapping: PackageableElementReference<Mapping>,
    runtime: Runtime,
  ) {
    super(func, owner);
    this.mapping = mapping;
    this.runtime = runtime;
  }

  get mappingValidationResult(): ValidationIssue | undefined {
    return this.mapping.value.isStub
      ? createValidationError(['Service execution mapping cannot be empty'])
      : undefined;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_PURE_SINGLE_EXECUTION,
      super.hashCode,
      this.mapping.hashValue,
      this.runtime,
    ]);
  }
}

export class KeyedExecutionParameter implements Hashable {
  readonly uuid = uuid();

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

  get mappingValidationResult(): ValidationIssue | undefined {
    return this.mapping.value.isStub
      ? createValidationError(['Service execution mapping cannot be empty'])
      : undefined;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_KEYED_EXECUTION_PARAMETER,
      this.key,
      this.mapping.hashValue,
      this.runtime,
    ]);
  }
}

export class PureMultiExecution extends PureExecution implements Hashable {
  executionKey: string;
  executionParameters: KeyedExecutionParameter[] = [];

  constructor(executionKey: string, func: RawLambda, parentService: Service) {
    super(func, parentService);
    this.executionKey = executionKey;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_PURE_MULTI_EXECUTION,
      super.hashCode,
      this.executionKey,
      hashArray(this.executionParameters),
    ]);
  }
}
