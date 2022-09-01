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

import {
  LambdaParametersState,
  type LambdaParameterState,
} from '@finos/legend-application';
import { observable, makeObservable, action } from 'mobx';
import type { QueryBuilderState } from './QueryBuilderState.js';

export const QUERY_BUILDER_PARAMETER_DND_TYPE = 'PARAMETER';

export interface QueryBuilderParameterDragSource {
  variable: LambdaParameterState;
}

export class QueryBuilderParametersState extends LambdaParametersState {
  selectedParameter: LambdaParameterState | undefined;
  queryBuilderState: QueryBuilderState;

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
    });

    this.queryBuilderState = queryBuilderState;
  }

  setSelectedParameter(val: LambdaParameterState | undefined): void {
    this.selectedParameter = val;
  }
}
