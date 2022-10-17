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
  type QueryBuilderState,
  QUERY_BUILDER_BACKDROP_CONTAINER_ID,
} from '@finos/legend-query-builder';
import type { GeneratorFn } from '@finos/legend-shared';
import { flow, flowResult, makeObservable, observable } from 'mobx';
import { FormModeCompilationOutcome } from './EditorGraphState.js';
import type { EditorStore } from './EditorStore.js';

type EmbeddedQueryBuilderActionConfiguration = {
  key: string;
  renderer: (queryBuilderState: QueryBuilderState) => React.ReactNode;
};

type EmbeddedQueryBuilderConfiguration = {
  setupQueryBuilderState: () => QueryBuilderState;
  disableCompile?: boolean | undefined;
  actionConfigs: EmbeddedQueryBuilderActionConfiguration[];
};

export class EmbeddedQueryBuilderState {
  editorStore: EditorStore;
  queryBuilderState?: QueryBuilderState | undefined;
  actionConfigs: EmbeddedQueryBuilderActionConfiguration[] = [];

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      queryBuilderState: observable,
      actionConfigs: observable,
      setEmbeddedQueryBuilderConfiguration: flow,
    });

    this.editorStore = editorStore;
  }

  /**
   * When opening query builder, we ensure the graph compiles successfully
   */
  *setEmbeddedQueryBuilderConfiguration(
    config: EmbeddedQueryBuilderConfiguration | undefined,
  ): GeneratorFn<void> {
    if (config) {
      if (!this.editorStore.isInFormMode) {
        return;
      }
      if (!config.disableCompile) {
        this.editorStore.applicationStore.setBlockingAlert({
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
            this.editorStore.applicationStore.setBlockingAlert(undefined);
            this.editorStore.applicationStore.notifyWarning(
              `Can't open query builder: Can't compile at this time, please try again later`,
            );
            return;
          }
          case FormModeCompilationOutcome.SUCCEEDED: {
            this.editorStore.applicationStore.setBlockingAlert(undefined);
            break;
          }
          default: {
            this.editorStore.applicationStore.notifyWarning(
              `Can't open query builder: Compilation failed! Please fix the compilation issue and try again`,
            );
            this.editorStore.applicationStore.setBlockingAlert(undefined);
            return;
          }
        }
      }
      if (!this.editorStore.graphState.hasCompilationError) {
        this.queryBuilderState = config.setupQueryBuilderState();
        this.actionConfigs = config.actionConfigs;
        this.editorStore.applicationStore.setBackdropContainerElementID(
          QUERY_BUILDER_BACKDROP_CONTAINER_ID,
        );
      }
    } else {
      this.editorStore.applicationStore.setBackdropContainerElementID(
        undefined,
      );
      this.queryBuilderState = undefined;
      this.actionConfigs = [];
    }
  }
}
