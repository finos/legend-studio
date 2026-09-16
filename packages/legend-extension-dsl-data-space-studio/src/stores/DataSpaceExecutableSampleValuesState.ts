/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  type EditorStore,
  RelationElementState,
} from '@finos/legend-application-studio';
import {
  RelationElement,
  type RelationTypeMetadata,
} from '@finos/legend-graph';
import {
  type DataSpaceExecutable,
  getQueryFromDataspaceExecutable,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { type GeneratorFn, assertErrorThrown } from '@finos/legend-shared';
import { dataSpace_setExecutableSampleValues } from './studio/DSL_DataSpace_GraphModifierHelper.js';

export class DataSpaceExecutableSampleValuesState {
  readonly editorStore: EditorStore;
  readonly executable: DataSpaceExecutable;
  isInitializingSampleValues = false;

  constructor(editorStore: EditorStore, executable: DataSpaceExecutable) {
    makeObservable(this, {
      isInitializingSampleValues: observable,
      relationElementState: computed,
      initializeSampleValues: flow,
      removeSampleValues: action,
    });
    this.editorStore = editorStore;
    this.executable = executable;
  }

  get relationElementState(): RelationElementState | undefined {
    return this.executable.sampleValues
      ? new RelationElementState(this.executable.sampleValues)
      : undefined;
  }

  *initializeSampleValues(): GeneratorFn<void> {
    if (this.executable.sampleValues) {
      return;
    }
    const sampleValues = new RelationElement();
    sampleValues.columns = [];
    sampleValues.paths = [];
    sampleValues.rows = [];
    this.isInitializingSampleValues = true;
    try {
      const query = getQueryFromDataspaceExecutable(
        this.executable,
        this.editorStore.graphManagerState,
      );
      if (query) {
        const relationType =
          (yield this.editorStore.graphManagerState.graphManager.getLambdaRelationType(
            query,
            this.editorStore.graphManagerState.graph,
          )) as RelationTypeMetadata;
        sampleValues.columns = relationType.columns.map(
          (column) => column.name,
        );
      }
    } catch (error) {
      assertErrorThrown(error);
    } finally {
      this.isInitializingSampleValues = false;
    }
    dataSpace_setExecutableSampleValues(this.executable, sampleValues);
    if (sampleValues.columns.length) {
      this.relationElementState?.addRow();
    }
  }

  addSampleValues(): Promise<void> {
    return flowResult(this.initializeSampleValues());
  }

  removeSampleValues(): void {
    dataSpace_setExecutableSampleValues(this.executable, undefined);
  }
}

export class DataSpaceExecutableSampleValuesStateCache {
  readonly editorStore: EditorStore;
  private readonly states = new Map<
    DataSpaceExecutable,
    DataSpaceExecutableSampleValuesState
  >();

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }

  getState(
    executable: DataSpaceExecutable,
  ): DataSpaceExecutableSampleValuesState {
    let state = this.states.get(executable);
    if (!state) {
      state = new DataSpaceExecutableSampleValuesState(
        this.editorStore,
        executable,
      );
      this.states.set(executable, state);
    }
    return state;
  }
}
