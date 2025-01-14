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
import {
  DataSpace,
  resolveUsableDataSpaceClasses,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  DataSpaceQueryBuilderState,
  type DataSpaceInfo,
} from '@finos/legend-extension-dsl-data-space/application';
import {
  QueryBuilderActionConfig,
  QueryBuilderAdvancedWorkflowState,
} from '@finos/legend-query-builder';
import { RuntimePointer } from '@finos/legend-graph';

export const queryDataSpace = async (
  dataSpace: DataSpace,
  editorStore: EditorStore,
): Promise<void> => {
  const embeddedQueryBuilderState = editorStore.embeddedQueryBuilderState;
  await flowResult(
    embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration({
      setupQueryBuilderState: async () => {
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
          false,
          undefined,
          async (dataSpaceInfo: DataSpaceInfo) => {
            queryBuilderState.dataSpace = guaranteeType(
              queryBuilderState.graphManagerState.graph.getElement(
                dataSpaceInfo.path,
              ),
              DataSpace,
            );
            queryBuilderState.setExecutionContext(
              queryBuilderState.dataSpace.defaultExecutionContext,
            );
            await queryBuilderState.propagateExecutionContextChange();
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
        const mapping = queryBuilderState.executionContext.mapping.value;
        queryBuilderState.changeMapping(mapping);
        const mappingModelCoverageAnalysisResult =
          queryBuilderState.dataSpaceAnalysisResult?.mappingToMappingCoverageResult?.get(
            mapping.path,
          );
        if (mappingModelCoverageAnalysisResult) {
          queryBuilderState.explorerState.mappingModelCoverageAnalysisResult =
            mappingModelCoverageAnalysisResult;
        }
        queryBuilderState.changeRuntime(
          new RuntimePointer(queryBuilderState.executionContext.defaultRuntime),
        );
        const compatibleClasses = resolveUsableDataSpaceClasses(
          queryBuilderState.dataSpace,
          mapping,
          queryBuilderState.graphManagerState,
        );
        // if there is no chosen class or the chosen one is not compatible
        // with the mapping then pick a compatible class if possible
        if (
          !queryBuilderState.class ||
          !compatibleClasses.includes(queryBuilderState.class)
        ) {
          const possibleNewClass = compatibleClasses[0];
          if (possibleNewClass) {
            queryBuilderState.changeClass(possibleNewClass);
          }
        }
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
