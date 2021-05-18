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

import { observable, computed, action, makeObservable } from 'mobx';
import { hashArray, uuid, addUniqueEntry } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { Mapping } from '../../../model/packageableElements/mapping/Mapping';
import type { RawLambda } from '../../../model/rawValueSpecification/RawLambda';
import type { Service } from '../../../model/packageableElements/service/Service';
import type { Runtime } from '../../../model/packageableElements/runtime/Runtime';
import type { ValidationIssue } from '../../../action/validator/ValidationResult';
import { createValidationError } from '../../../action/validator/ValidationResult';
import type { PackageableElementReference } from '../../../model/packageableElements/PackageableElementReference';

export abstract class ServiceExecution implements Hashable {
  private readonly _$nominalTypeBrand!: 'ServiceExecution';

  abstract get hashCode(): string;
}

export class PureExecution extends ServiceExecution implements Hashable {
  owner: Service;
  func: RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda

  constructor(func: RawLambda, owner: Service) {
    super();

    makeObservable(this, {
      func: observable,
      queryValidationResult: computed,
      setFunction: action,
      lambdaId: computed,
    });

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

  setFunction(value: RawLambda): void {
    this.func = value;
  }

  get lambdaId(): string {
    // NOTE: Added the index here just in case but the order needs to be checked carefully as bugs may result from inaccurate orderings
    return `${this.owner.path}-execution`;
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

    makeObservable(this, {
      runtime: observable,
      setMapping: action,
      setRuntime: action,
      mappingValidationResult: computed,
      hashCode: computed,
    });

    this.mapping = mapping;
    this.runtime = runtime;
  }

  setMapping(value: Mapping): void {
    this.mapping.setValue(value);
  }
  setRuntime(value: Runtime): void {
    this.runtime = value;
  }

  get mappingValidationResult(): ValidationIssue | undefined {
    return this.mapping.value.isStub
      ? createValidationError(['Service execution mapping cannot be empty'])
      : undefined;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_PURE_SINGLE_EXECUTION,
      super.hashCode,
      this.mapping.valueForSerialization,
      this.runtime,
    ]);
  }
}

export class KeyedExecutionParameter implements Hashable {
  uuid = uuid();
  key: string;
  mapping: PackageableElementReference<Mapping>;
  runtime: Runtime;

  constructor(
    key: string,
    mapping: PackageableElementReference<Mapping>,
    runtime: Runtime,
  ) {
    makeObservable(this, {
      key: observable,
      runtime: observable,
      mappingValidationResult: computed,
      setKey: action,
      setMapping: action,
      setRuntime: action,
      hashCode: computed,
    });

    this.key = key;
    this.mapping = mapping;
    this.runtime = runtime;
  }

  get mappingValidationResult(): ValidationIssue | undefined {
    return this.mapping.value.isStub
      ? createValidationError(['Service execution mapping cannot be empty'])
      : undefined;
  }

  setKey(value: string): void {
    this.key = value;
  }
  setMapping(value: Mapping): void {
    this.mapping.setValue(value);
  }
  setRuntime(value: Runtime): void {
    this.runtime = value;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_KEYED_EXECUTION_PARAMETER,
      this.key,
      this.mapping.valueForSerialization,
      this.runtime,
    ]);
  }
}

export class PureMultiExecution extends PureExecution implements Hashable {
  executionKey: string;
  executionParameters: KeyedExecutionParameter[] = [];

  constructor(executionKey: string, func: RawLambda, parentService: Service) {
    super(func, parentService);

    makeObservable(this, {
      executionKey: observable,
      executionParameters: observable,
      setExecutionKey: action,
      addExecutionParameter: action,
      hashCode: computed,
    });

    this.executionKey = executionKey;
  }

  setExecutionKey(value: string): void {
    this.executionKey = value;
  }
  addExecutionParameter(value: KeyedExecutionParameter): void {
    addUniqueEntry(this.executionParameters, value);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_PURE_MULTI_EXECUTION,
      super.hashCode,
      this.executionKey,
      hashArray(this.executionParameters),
    ]);
  }
}
