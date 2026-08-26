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
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import {
  DataSpace,
  resolveExecutionContextMapping,
  resolveUsableDataSpaceClasses,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  DataSpaceQueryBuilderState,
  type ResolvedDataSpaceEntityWithOrigin,
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
  const initialDefaultExecutionContext = guaranteeNonNullable(
    dataSpace.defaultExecutionContext,
    `Can't query data product '${dataSpace.path}': no default execution context defined`,
  );
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
          initialDefaultExecutionContext,
          false,
          undefined,
          async (dataSpaceInfo: ResolvedDataSpaceEntityWithOrigin) => {
            queryBuilderState.dataSpace = guaranteeType(
              queryBuilderState.graphManagerState.graph.getElement(
                dataSpaceInfo.path,
              ),
              DataSpace,
            );
            const targetDefault = guaranteeNonNullable(
              queryBuilderState.dataSpace.defaultExecutionContext,
              `Can't query data product '${queryBuilderState.dataSpace.path}': no default execution context defined`,
            );
            queryBuilderState.setExecutionContext(targetDefault);
            await queryBuilderState.propagateExecutionContextChange();
          },
          undefined,
          undefined,
          undefined,
          undefined,
          editorStore.applicationStore.config.options.queryBuilderConfig,
          sourceInfo,
        );
        queryBuilderState.setExecutionContext(initialDefaultExecutionContext);
        const mapping = guaranteeNonNullable(
          resolveExecutionContextMapping(queryBuilderState.executionContext),
          `Can't query execution context '${queryBuilderState.executionContext.name}': no resolvable mapping configured`,
        );
        queryBuilderState.changeMapping(mapping);
        const mappingModelCoverageAnalysisResult =
          queryBuilderState.dataSpaceAnalysisResult?.mappingToMappingCoverageResult?.get(
            mapping.path,
          );
        if (mappingModelCoverageAnalysisResult) {
          queryBuilderState.explorerState.mappingModelCoverageAnalysisResult =
            mappingModelCoverageAnalysisResult;
        }
        const defaultRuntime =
          queryBuilderState.executionContext.defaultRuntime;
        if (defaultRuntime) {
          queryBuilderState.changeRuntime(new RuntimePointer(defaultRuntime));
        }
        const compatibleClasses = resolveUsableDataSpaceClasses(
          queryBuilderState.dataSpace,
          mapping,
          queryBuilderState.graphManagerState,
        );
        if (
          !queryBuilderState.sourceClass ||
          !compatibleClasses.includes(queryBuilderState.sourceClass)
        ) {
          const possibleNewClass = compatibleClasses[0];
          if (possibleNewClass) {
            queryBuilderState.changeSourceElement(possibleNewClass);
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
