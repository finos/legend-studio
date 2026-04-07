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

import type { IngestDefinition, Database } from '@finos/legend-graph';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';
import { flowResult } from 'mobx';
import {
  AccessorQueryBuilderState,
  QueryBuilderActionConfig,
  QueryBuilderAdvancedWorkflowState,
  getCompatibleRuntimesFromAccessorOwner,
} from '@finos/legend-query-builder';
import { assertErrorThrown, guaranteeNonNullable } from '@finos/legend-shared';

export const queryAccessorSource = async (
  element: IngestDefinition | Database,
  editorStore: EditorStore,
): Promise<void> => {
  try {
    const embeddedQueryBuilderState = editorStore.embeddedQueryBuilderState;
    await flowResult(
      embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration({
        setupQueryBuilderState: async () => {
          const queryBuilderState = new AccessorQueryBuilderState(
            editorStore.applicationStore,
            undefined,
            editorStore.graphManagerState,
            QueryBuilderAdvancedWorkflowState.INSTANCE,
            QueryBuilderActionConfig.INSTANCE,
            editorStore.applicationStore.config.options.queryBuilderConfig,
            editorStore.editorMode.getSourceInfo(),
          );
          queryBuilderState.changeAccessorOwner(element);
          const compatibleRuntimes = getCompatibleRuntimesFromAccessorOwner(
            element,
            editorStore.graphManagerState,
          );
          if (compatibleRuntimes.length > 0) {
            queryBuilderState.changeSelectedRuntime(
              guaranteeNonNullable(compatibleRuntimes[0]),
            );
          }
          return queryBuilderState;
        },
        disableCompile: true,
        actionConfigs: [],
      }),
    );
  } catch (error) {
    assertErrorThrown(error);
    editorStore.applicationStore.notificationService.notifyError(
      `Failed to open query builder: ${error.message}`,
    );
  }
};
