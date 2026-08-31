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

import type { EditorStore } from '@finos/legend-application-studio';
import { action, computed, makeObservable, observable } from 'mobx';
import type { DataSpaceEditorState } from './DataSpaceEditorState.js';
import type {
  DataSpace,
  DataSpaceExecutionContext,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  dataSpace_addExecutionContext,
  dataSpace_removeExecutionContext,
} from './studio/DSL_DataSpace_GraphModifierHelper.js';

export class DataSpaceExecutionContextState {
  readonly dataSpaceEditorState: DataSpaceEditorState;
  readonly editorStore: EditorStore;
  selectedExecutionContext: DataSpaceExecutionContext | undefined;
  newExecutionContextModal = false;

  constructor(dataSpaceEditorState: DataSpaceEditorState) {
    makeObservable(this, {
      selectedExecutionContext: observable,
      newExecutionContextModal: observable,
      executionContexts: computed,
      addExecutionContext: action,
      removeExecutionContext: action,
      setSelectedExecutionContext: action,
      setNewExecutionContextModal: action,
    });
    this.selectedExecutionContext =
      dataSpaceEditorState.dataSpace.executionContexts?.[0];
    this.dataSpaceEditorState = dataSpaceEditorState;
    this.editorStore = dataSpaceEditorState.editorStore;
  }

  get dataSpace(): DataSpace {
    return this.dataSpaceEditorState.dataSpace;
  }

  get executionContexts(): DataSpaceExecutionContext[] {
    return this.dataSpace.executionContexts ?? [];
  }

  addExecutionContext(executionContext: DataSpaceExecutionContext): void {
    dataSpace_addExecutionContext(this.dataSpace, executionContext);
    this.selectedExecutionContext = executionContext;
  }

  removeExecutionContext(
    dataSpaceExecutionContext: DataSpaceExecutionContext,
  ): void {
    dataSpace_removeExecutionContext(this.dataSpace, dataSpaceExecutionContext);
    if (this.selectedExecutionContext === dataSpaceExecutionContext) {
      this.selectedExecutionContext = this.executionContexts[0];
    }
  }

  setSelectedExecutionContext(
    val: DataSpaceExecutionContext | undefined,
  ): void {
    this.selectedExecutionContext = val;
  }

  setNewExecutionContextModal(val: boolean): void {
    this.newExecutionContextModal = val;
  }
}
