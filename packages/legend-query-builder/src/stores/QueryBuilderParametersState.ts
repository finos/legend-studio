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
import { observable, makeObservable, action, override } from 'mobx';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from './QueryBuilderStateHashUtils.js';
import type { QueryBuilderState } from './QueryBuilderState.js';
import {
  type LambdaParameterState,
  LambdaParametersState,
} from './shared/LambdaParameterState.js';
import type {
  ValueSpecification,
  VariableExpression,
} from '@finos/legend-graph';

export interface QueryBuilderParameterValue {
  variable: string | VariableExpression;
  value: ValueSpecification | undefined;
}

export class QueryBuilderParametersState
  extends LambdaParametersState
  implements Hashable
{
  readonly queryBuilderState: QueryBuilderState;

  selectedParameter: LambdaParameterState | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    super();

    makeObservable(this, {
      parameterValuesEditorState: observable,
      parameterStates: observable,
      addParameter: action,
      removeParameter: action,
      setParameters: action,
      selectedParameter: observable,
      setSelectedParameter: action,
      hashCode: override,
    });

    this.queryBuilderState = queryBuilderState;
  }

  override get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.PARAMETERS_STATE,
      hashArray(this.parameterStates),
    ]);
  }

  setSelectedParameter(val: LambdaParameterState | undefined): void {
    this.selectedParameter = val;
  }
}
