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

import type { Mapping, RawLambda, Runtime } from '@finos/legend-graph';
import { QueryBuilderState } from '@finos/legend-query';
import type { GeneratorFn } from '@finos/legend-shared';
import type { EditorStore } from '@finos/legend-studio';
import { EditorExtensionState } from '@finos/legend-studio';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';

export class QueryBuilder_EditorExtensionState extends EditorExtensionState {
  editorStore: EditorStore;
  queryBuilderState: QueryBuilderState;
  openQueryBuilder = false;

  constructor(editorStore: EditorStore) {
    super();

    makeObservable(this, {
      queryBuilderState: observable,
      openQueryBuilder: observable,
      reset: action,
      setOpenQueryBuilder: flow,
      setup: flow,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = new QueryBuilderState(
      editorStore.applicationStore,
      editorStore.graphManagerState,
    );
  }

  reset(): void {
    this.queryBuilderState = new QueryBuilderState(
      this.editorStore.applicationStore,
      this.editorStore.graphManagerState,
    );
  }

  /**
   * When opening query builder, we ensure the graph compiles successfully
   */
  *setOpenQueryBuilder(
    val: boolean,
    options?: { disableCompile: boolean },
  ): GeneratorFn<void> {
    if (!this.editorStore.isInFormMode) {
      return;
    }
    if (val === this.openQueryBuilder) {
      return;
    }
    if (val) {
      if (!options?.disableCompile) {
        this.editorStore.setBlockingAlert({
          message: 'Compiling graph before building query...',
          showLoading: true,
        });
        yield flowResult(
          this.editorStore.graphState.globalCompileInFormMode({
            disableNotificationOnSuccess: true,
          }),
        );
        this.editorStore.setBlockingAlert(undefined);
      }
      if (!this.editorStore.graphState.hasCompilationError) {
        this.openQueryBuilder = val;
      }
      this.editorStore.setBlockGlobalHotkeys(true);
      this.editorStore.setHotkeys([]);
    } else {
      this.openQueryBuilder = val;
      this.editorStore.setBlockGlobalHotkeys(false);
      this.editorStore.resetHotkeys();
    }
  }

  *setup(
    func: RawLambda,
    mapping: Mapping | undefined,
    runtime: Runtime,
    onSave: (lambda: RawLambda) => Promise<void>,
    disableCompile: boolean,
  ): GeneratorFn<void> {
    this.queryBuilderState.querySetupState.setMapping(mapping);
    this.queryBuilderState.querySetupState.setRuntime(runtime);
    this.queryBuilderState.initialize(func);
    this.queryBuilderState.querySetupState.setOnSaveQuery(onSave);
    yield flowResult(
      this.setOpenQueryBuilder(true, {
        disableCompile: disableCompile,
      }),
    );
    this.queryBuilderState.querySetupState.setMappingIsReadOnly(true);
    this.queryBuilderState.querySetupState.setRuntimeIsReadOnly(true);
  }
}
