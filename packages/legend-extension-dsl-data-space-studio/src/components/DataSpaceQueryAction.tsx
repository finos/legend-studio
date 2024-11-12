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

import { MenuContentItem } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  type EditorStore,
  useEditorStore,
} from '@finos/legend-application-studio';
import { flowResult } from 'mobx';
import { guaranteeType } from '@finos/legend-shared';
import { DataSpace } from '@finos/legend-extension-dsl-data-space/graph';
import {
  DataSpaceQueryBuilderState,
  type DataSpaceInfo,
} from '@finos/legend-extension-dsl-data-space/application';
import {
  QueryBuilderActionConfig,
  QueryBuilderAdvancedWorkflowState,
} from '@finos/legend-query-builder';

export const queryDataSpace = async (
  dataSpace: DataSpace,
  editorStore: EditorStore,
): Promise<void> => {
  const embeddedQueryBuilderState = editorStore.embeddedQueryBuilderState;
  await flowResult(
    embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration({
      setupQueryBuilderState: () => {
        const sourceInfo = Object.assign(
          {},
          editorStore.editorMode.getSourceInfo(),
          {
            dataSpace: dataSpace.path,
          },
        );
        const queryBuilderState = new DataSpaceQueryBuilderState(
          editorStore.applicationStore,
          editorStore.graphManagerState,
          QueryBuilderAdvancedWorkflowState.INSTANCE,
          QueryBuilderActionConfig.INSTANCE,
          dataSpace,
          dataSpace.defaultExecutionContext,
          undefined,
          (dataSpaceInfo: DataSpaceInfo) => {
            queryBuilderState.dataSpace = guaranteeType(
              queryBuilderState.graphManagerState.graph.getElement(
                dataSpaceInfo.path,
              ),
              DataSpace,
            );
            queryBuilderState.setExecutionContext(
              queryBuilderState.dataSpace.defaultExecutionContext,
            );
            queryBuilderState.propagateExecutionContextChange(
              queryBuilderState.dataSpace.defaultExecutionContext,
            );
          },
          undefined,
          undefined,
          undefined,
          undefined,
          editorStore.applicationStore.config.options.queryBuilderConfig,
          sourceInfo,
        );
        queryBuilderState.setExecutionContext(
          dataSpace.defaultExecutionContext,
        );
        queryBuilderState.propagateExecutionContextChange(
          dataSpace.defaultExecutionContext,
        );
        return queryBuilderState;
      },
      actionConfigs: [],
      disableCompile: true,
    }),
  );
};

export const DataSpaceQueryAction = observer(
  (props: { dataSpace: DataSpace }) => {
    const { dataSpace } = props;
    const editorStore = useEditorStore();
    const buildQuery = editorStore.applicationStore.guardUnhandledError(
      async () => {
        await queryDataSpace(dataSpace, editorStore);
      },
    );
    return <MenuContentItem onClick={buildQuery}>Query...</MenuContentItem>;
  },
);
