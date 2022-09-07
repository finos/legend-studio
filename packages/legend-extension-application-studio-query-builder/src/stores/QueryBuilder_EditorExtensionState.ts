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
  type QueryBuilderMode,
  StandardQueryBuilderMode,
  QueryBuilderState,
} from '@finos/legend-application-query';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  type EditorStore,
  EditorExtensionState,
  FormModeCompilationOutcome,
} from '@finos/legend-application-studio';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';

interface EmbeddedQueryBuilderMode {
  queryBuilderMode: QueryBuilderMode;
  disableCompile?: boolean | undefined;
  actionConfigs: {
    key: string;
    renderer: () => React.ReactNode;
  }[];
}

export class QueryBuilder_EditorExtensionState extends EditorExtensionState {
  editorStore: EditorStore;
  queryBuilderState: QueryBuilderState;
  mode?: EmbeddedQueryBuilderMode | undefined;

  constructor(editorStore: EditorStore) {
    super();

    makeObservable(this, {
      queryBuilderState: observable,
      mode: observable.ref,
      reset: action,
      setEmbeddedQueryBuilderMode: flow,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = new QueryBuilderState(
      editorStore.applicationStore,
      editorStore.graphManagerState,
      new StandardQueryBuilderMode(),
    );
  }

  reset(): void {
    this.queryBuilderState = new QueryBuilderState(
      this.editorStore.applicationStore,
      this.editorStore.graphManagerState,
      this.queryBuilderState.mode,
    );
  }

  /**
   * When opening query builder, we ensure the graph compiles successfully
   */
  *setEmbeddedQueryBuilderMode(
    mode: EmbeddedQueryBuilderMode | undefined,
  ): GeneratorFn<void> {
    if (mode) {
      if (!this.editorStore.isInFormMode) {
        return;
      }
      this.queryBuilderState.setMode(mode.queryBuilderMode);
      if (!mode.disableCompile) {
        this.editorStore.setBlockingAlert({
          message: 'Compiling graph before building query...',
          showLoading: true,
        });
        const compilationOutcome = (yield flowResult(
          this.editorStore.graphState.globalCompileInFormMode({
            // we don't want to notify about compilation success since this is just a simple check
            // in order to be able to open query builder
            disableNotificationOnSuccess: true,
          }),
        )) as FormModeCompilationOutcome;
        switch (compilationOutcome) {
          case FormModeCompilationOutcome.SKIPPED: {
            this.editorStore.setBlockingAlert(undefined);
            this.editorStore.applicationStore.notifyWarning(
              `Can't open query builder: Can't compile at this time, please try again later`,
            );
            return;
          }
          case FormModeCompilationOutcome.SUCCEEDED: {
            this.editorStore.setBlockingAlert(undefined);
            break;
          }
          default: {
            this.editorStore.applicationStore.notifyWarning(
              `Can't open query builder: Compilation failed! Please fix the compilation issue and try again`,
            );
            this.editorStore.setBlockingAlert(undefined);
            return;
          }
        }
      }
      if (!this.editorStore.graphState.hasCompilationError) {
        this.mode = mode;
      }
      this.editorStore.setBlockGlobalHotkeys(true);
      this.editorStore.setHotkeys([]);
    } else {
      this.mode = undefined;
      this.editorStore.setBlockGlobalHotkeys(false);
      this.editorStore.resetHotkeys();
    }
  }
}
