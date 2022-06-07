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

import type { LambdaParameterState } from '@finos/legend-application';
import { addUniqueEntry, deleteEntry } from '@finos/legend-shared';
import { observable, makeObservable, action } from 'mobx';
import type { QueryBuilderState } from './QueryBuilderState.js';

export enum QUERY_BUILDER_PARAMETER_TREE_DND_TYPE {
  VARIABLE = 'VARIABLE',
}

export interface QueryBuilderParameterDragSource {
  variable: LambdaParameterState;
}
export enum PARAMETER_SUBMIT_ACTION {
  EXECUTE = 'EXECUTE',
  EXPORT = 'EXPORT',
}

export class ParameterInstanceValuesEditorState {
  showModal = false;
  submitAction:
    | {
        handler: () => Promise<void>;
        label: PARAMETER_SUBMIT_ACTION;
      }
    | undefined;

  constructor() {
    makeObservable(this, {
      showModal: observable,
      submitAction: observable,
      setShowModal: action,
      open: action,
      setSubmitAction: action,
    });
  }

  setShowModal(val: boolean): void {
    this.showModal = val;
  }

  setSubmitAction(
    val:
      | {
          handler: () => Promise<void>;
          label: PARAMETER_SUBMIT_ACTION;
        }
      | undefined,
  ): void {
    this.submitAction = val;
  }

  open(handler: () => Promise<void>, label: PARAMETER_SUBMIT_ACTION): void {
    this.setSubmitAction({ handler, label });
    this.setShowModal(true);
  }

  close(): void {
    this.setSubmitAction(undefined);
    this.setShowModal(false);
  }
}

export class QueryParametersState {
  selectedParameter: LambdaParameterState | undefined;
  queryBuilderState: QueryBuilderState;
  parameters: LambdaParameterState[] = [];
  parameterValuesEditorState = new ParameterInstanceValuesEditorState();

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      parameterValuesEditorState: observable,
      parameters: observable,
      selectedParameter: observable,
      setSelectedParameter: action,
      addParameter: action,
      removeParameter: action,
    });

    this.queryBuilderState = queryBuilderState;
  }

  setSelectedParameter(val: LambdaParameterState | undefined): void {
    this.selectedParameter = val;
  }

  addParameter(val: LambdaParameterState): void {
    addUniqueEntry(this.parameters, val);
  }

  removeParameter(val: LambdaParameterState): void {
    deleteEntry(this.parameters, val);
  }
}
