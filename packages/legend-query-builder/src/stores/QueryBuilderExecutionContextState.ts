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

import type { Mapping, Runtime } from '@finos/legend-graph';
import type { QueryBuilderState } from './QueryBuilderState.js';
import { action, makeObservable, observable } from 'mobx';

export abstract class QueryBuilderExecutionContextState {
  readonly queryBuilderState: QueryBuilderState;
  mapping: Mapping | undefined;
  runtimeValue: Runtime | undefined;
  multiExecutionParameterKey: string | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    this.queryBuilderState = queryBuilderState;
  }

  setMapping(val: Mapping | undefined): void {
    this.mapping = val;
  }

  setRuntimeValue(val: Runtime | undefined): void {
    this.runtimeValue = val;
  }

  setMultiExecutionParameterKey(val: string | undefined): void {
    this.multiExecutionParameterKey = val;
  }

  get specifiedInQuery(): boolean {
    return true;
  }
}

export class QueryBuilderEmbeddedFromExecutionContextState extends QueryBuilderExecutionContextState {
  constructor(queryBuilderState: QueryBuilderState) {
    super(queryBuilderState);
    makeObservable(this, {
      mapping: observable,
      runtimeValue: observable,
      multiExecutionParameterKey: observable,
      setMapping: action,
      setRuntimeValue: action,
      setMultiExecutionParameterKey: action,
    });
  }
}

export class QueryBuilderExternalExecutionContextState extends QueryBuilderExecutionContextState {
  constructor(queryBuilderState: QueryBuilderState) {
    super(queryBuilderState);
    makeObservable(this, {
      mapping: observable,
      runtimeValue: observable,
      multiExecutionParameterKey: observable,
      setMapping: action,
      setRuntimeValue: action,
      setMultiExecutionParameterKey: action,
    });
  }

  override get specifiedInQuery(): boolean {
    return false;
  }
}
