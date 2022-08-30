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

import type { QueryBuilderState } from '@finos/legend-application-query';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  type EditorStore,
  EditorExtensionState,
} from '@finos/legend-application-studio';
import { flow, flowResult, makeObservable, observable } from 'mobx';

type EmbeddedQueryBuilderActionConfiguration = {
  key: string;
  renderer: (queryBuilderState: QueryBuilderState) => React.ReactNode;
};

type EmbeddedQueryBuilderConfiguration = {
  setupQueryBuilderState: () => QueryBuilderState;
  disableCompile?: boolean | undefined;
  actionConfigs: EmbeddedQueryBuilderActionConfiguration[];
};

export class QueryBuilder_EditorExtensionState extends EditorExtensionState {
  editorStore: EditorStore;
  queryBuilderState?: QueryBuilderState | undefined;
  actionConfigs: EmbeddedQueryBuilderActionConfiguration[] = [];

  constructor(editorStore: EditorStore) {
    super();

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
    if (!this.editorStore.isInFormMode) {
      return;
    }
    if (config) {
      if (!config.disableCompile) {
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
        this.queryBuilderState = config.setupQueryBuilderState();
        this.actionConfigs = config.actionConfigs;
      }
      this.editorStore.setBlockGlobalHotkeys(true);
      this.editorStore.setHotkeys([]);
    } else {
      this.queryBuilderState = undefined;
      this.actionConfigs = [];
      this.editorStore.setBlockGlobalHotkeys(false);
      this.editorStore.resetHotkeys();
    }
  }
}
