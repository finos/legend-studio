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
import { action, makeObservable, observable } from 'mobx';
import type { DataSpaceEditorState } from './DataSpaceEditorState.js';
import {
  DataSpaceExecutionContext,
  type DataSpace,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  dataSpace_addExecutionContext,
  dataSpace_removeExecutionContext,
  dataSpace_setExecutionContextDefaultRuntime,
  dataSpace_setExecutionContextName,
} from './studio/DSL_DataSpace_GraphModifierHelper.js';
import {
  PackageableElementExplicitReference,
  stub_Mapping,
  stub_PackageableRuntime,
  type Mapping,
  type PackageableRuntime,
} from '@finos/legend-graph';

export class DataSpaceExecutionContextState {
  readonly dataSpaceEditorState: DataSpaceEditorState;
  readonly editorStore: EditorStore;
  executionContexts: DataSpaceExecutionContext[];
  selectedExecutionContext: DataSpaceExecutionContext | undefined;
  newExecutionContextModal = false;
  executionContextToRename: DataSpaceExecutionContext | undefined;

  constructor(dataSpaceEditorState: DataSpaceEditorState) {
    makeObservable(this, {
      executionContexts: observable,
      selectedExecutionContext: observable,
      executionContextToRename: observable,
      newExecutionContextModal: observable,
      addExecutionContext: action,
      removeExecutionContext: action,
      renameExecutionContext: action,
      setSelectedExecutionContext: action,
      setExecutionContextToRename: action,
      setNewExecutionContextModal: action,
    });
    this.executionContexts = dataSpaceEditorState.dataSpace.executionContexts;
    this.selectedExecutionContext =
      dataSpaceEditorState.dataSpace.executionContexts[0];
    this.dataSpaceEditorState = dataSpaceEditorState;
    this.editorStore = dataSpaceEditorState.editorStore;
  }

  get dataSpace(): DataSpace {
    return this.dataSpaceEditorState.dataSpace;
  }

  addExecutionContext(name: string): void {
    const val = new DataSpaceExecutionContext();
    val.name = name;
    const mapping = this.editorStore.graphManagerState.usableMappings[0];
    const runtime = mapping
      ? this.editorStore.graphManagerState.graph.ownRuntimes.filter(
          (_runtime) =>
            _runtime.runtimeValue.mappings
              .map((m) => m.value)
              .includes(mapping),
        )[0]
      : undefined;
    val.mapping = PackageableElementExplicitReference.create(
      mapping ?? stub_Mapping(),
    );
    val.defaultRuntime = PackageableElementExplicitReference.create(
      runtime ?? stub_PackageableRuntime(),
    );
    dataSpace_addExecutionContext(this.dataSpace, val);
    this.selectedExecutionContext = val;
  }

  removeExecutionContext(
    dataSpaceExecutionContext: DataSpaceExecutionContext,
  ): void {
    dataSpace_removeExecutionContext(this.dataSpace, dataSpaceExecutionContext);
  }

  renameExecutionContext(
    dataSpaceExecutionContext: DataSpaceExecutionContext,
    newName: string,
  ): void {
    dataSpace_setExecutionContextName(dataSpaceExecutionContext, newName);
  }

  setSelectedExecutionContext(val: DataSpaceExecutionContext): void {
    this.selectedExecutionContext = val;
  }

  setExecutionContextToRename(
    val: DataSpaceExecutionContext | undefined,
  ): void {
    this.executionContextToRename = val;
  }

  setNewExecutionContextModal(val: boolean): void {
    this.newExecutionContextModal = val;
  }

  autoSelectRuntimeOnMappingChange(mapping: Mapping): void {
    if (this.selectedExecutionContext) {
      const runtimes =
        this.editorStore.graphManagerState.graph.ownRuntimes.filter((runtime) =>
          runtime.runtimeValue.mappings.map((m) => m.value).includes(mapping),
        );
      if (runtimes.length) {
        dataSpace_setExecutionContextDefaultRuntime(
          this.selectedExecutionContext,
          PackageableElementExplicitReference.create(
            runtimes[0] as PackageableRuntime,
          ),
        );
      }
    }
  }
}
