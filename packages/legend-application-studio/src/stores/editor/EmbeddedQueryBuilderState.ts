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
  QUERY_BUILDER_COMPONENT_ELEMENT_ID,
} from '@finos/legend-query-builder';
import type { GeneratorFn } from '@finos/legend-shared';
import { flow, flowResult, makeObservable, observable } from 'mobx';
import { GRAPH_EDITOR_MODE } from './EditorConfig.js';
import { GraphCompilationOutcome } from './EditorGraphState.js';
import type { EditorStore } from './EditorStore.js';

type EmbeddedQueryBuilderActionConfiguration = {
  key: string;
  renderer: (queryBuilderState: QueryBuilderState) => React.ReactNode;
};

type EmbeddedQueryBuilderConfiguration = {
  setupQueryBuilderState: () => Promise<QueryBuilderState>;
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
      if (this.editorStore.graphEditorMode.mode !== GRAPH_EDITOR_MODE.FORM) {
        return;
      }
      if (!config.disableCompile) {
        this.editorStore.applicationStore.alertService.setBlockingAlert({
          message: 'Compiling graph before building query...',
          showLoading: true,
        });
        yield flowResult(
          this.editorStore.graphEditorMode.globalCompile({
            // we don't want to notify about compilation success since this is just a simple check
            // in order to be able to open query builder
            disableNotificationOnSuccess: true,
          }),
        );
        switch (this.editorStore.graphState.mostRecentCompilationOutcome) {
          case GraphCompilationOutcome.SKIPPED: {
            this.editorStore.applicationStore.alertService.setBlockingAlert(
              undefined,
            );
            this.editorStore.applicationStore.notificationService.notifyWarning(
              `Can't open query builder: Can't compile at this time, please try again later`,
            );
            return;
          }
          case GraphCompilationOutcome.SUCCEEDED: {
            this.editorStore.applicationStore.alertService.setBlockingAlert(
              undefined,
            );
            break;
          }
          default: {
            this.editorStore.applicationStore.notificationService.notifyWarning(
              `Can't open query builder: Compilation failed! Please fix the compilation issue and try again`,
            );
            this.editorStore.applicationStore.alertService.setBlockingAlert(
              undefined,
            );
            return;
          }
        }
      }
      if (!this.editorStore.graphState.error) {
        this.queryBuilderState =
          (yield config.setupQueryBuilderState()) as QueryBuilderState;
        this.actionConfigs = config.actionConfigs;
        this.editorStore.applicationStore.layoutService.setBackdropContainerElementID(
          QUERY_BUILDER_COMPONENT_ELEMENT_ID.BACKDROP_CONTAINER,
        );
      }
    } else {
      this.editorStore.applicationStore.layoutService.setBackdropContainerElementID(
        undefined,
      );
      this.queryBuilderState = undefined;
      this.actionConfigs = [];
    }
  }
}
