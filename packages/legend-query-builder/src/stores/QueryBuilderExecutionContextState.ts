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

  constructor(queryBuilderState: QueryBuilderState) {
    this.queryBuilderState = queryBuilderState;
  }

  abstract setMapping(mapping: Mapping | undefined): void;
  abstract setRuntimeValue(mapping: Runtime | undefined): void;
  abstract isMappingReadOnly(): boolean;
  abstract isRuntimeReadOny(): boolean;
}

// export class QueryBuilderExecutionContextFromState extends QueryBuilderExecutionContextState {
//   override mapping: Mapping;
//   override runtime: Runtime;

//   constructor(
//     queryBuilderState: QueryBuilderState,
//     mapping: Mapping,
//     runtime: Runtime,
//   ) {
//     super(queryBuilderState);
//     this.mapping = mapping;
//     this.runtime = runtime;
//   }
// }

export class QueryBuilderLegacyExecutionContextState extends QueryBuilderExecutionContextState {
  constructor(queryBuilderState: QueryBuilderState) {
    super(queryBuilderState);
    makeObservable(this, {
      mapping: observable,
      runtimeValue: observable,

      setMapping: action,
      setRuntimeValue: action,
    });
  }

  override setMapping(val: Mapping | undefined): void {
    this.mapping = val;
  }

  override setRuntimeValue(val: Runtime | undefined): void {
    this.runtimeValue = val;
  }
  override isMappingReadOnly(): boolean {
    throw new Error('Method not implemented.');
  }
  override isRuntimeReadOny(): boolean {
    throw new Error('Method not implemented.');
  }
}
