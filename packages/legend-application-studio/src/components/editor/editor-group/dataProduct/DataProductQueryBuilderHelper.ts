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
  type DataProduct,
  resolveUsableDataProductClasses,
  RuntimePointer,
} from '@finos/legend-graph';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';
import { flowResult } from 'mobx';
import {
  DataProductQueryBuilderState,
  QueryBuilderActionConfig,
  QueryBuilderAdvancedWorkflowState,
} from '@finos/legend-query-builder';
import type { DepotEntityWithOrigin } from '@finos/legend-storage';
import {
  assertErrorThrown,
  assertTrue,
  guaranteeNonNullable,
} from '@finos/legend-shared';

const isQueryableDataProduct = (dataProduct: DataProduct): boolean => {
  return Boolean(
    dataProduct.nativeModelAccess?.nativeModelExecutionContexts.length,
  );
};

export const queryDataProduct = async (
  dataProduct: DataProduct,
  editorStore: EditorStore,
): Promise<void> => {
  try {
    assertTrue(
      isQueryableDataProduct(dataProduct),
      'Data Product is not queryable. Must have either native model execution contexts or model access point groups defined to be queryable.',
    );
    const embeddedQueryBuilderState = editorStore.embeddedQueryBuilderState;
    const nativeModelAccess = guaranteeNonNullable(
      dataProduct.nativeModelAccess,
    );
    await flowResult(
      embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration({
        setupQueryBuilderState: async () => {
          const sourceInfo = Object.assign(
            {},
            editorStore.editorMode.getSourceInfo(),
            {
              dataSpace: dataProduct.path,
            },
          );
          const queryBuilderState = new DataProductQueryBuilderState(
            editorStore.applicationStore,
            editorStore.graphManagerState,
            QueryBuilderAdvancedWorkflowState.INSTANCE,
            dataProduct,
            undefined,
            QueryBuilderActionConfig.INSTANCE,
            nativeModelAccess,
            guaranteeNonNullable(
              dataProduct.nativeModelAccess?.defaultExecutionContext,
            ),
            async (val: DepotEntityWithOrigin) => {},
            undefined,
            undefined,
            editorStore.applicationStore.config.options.queryBuilderConfig,
            sourceInfo,
          );
          const mapping = queryBuilderState.selectedExecContext.mapping.value;
          const runtime = guaranteeNonNullable(
            queryBuilderState.selectedExecContext.runtime,
            'runtime unable to be resolved',
          );
          queryBuilderState.changeMapping(mapping);
          // const mappingModelCoverageAnalysisResult =
          //   queryBuilderState.dataProductArtifact?.mappingToMappingCoverageResult?.get(
          //     mapping.path,
          //   );
          queryBuilderState.changeRuntime(new RuntimePointer(runtime));
          const compatibleClasses = resolveUsableDataProductClasses(
            queryBuilderState.dataProduct.nativeModelAccess?.featuredElements ??
              [],
            mapping,
            queryBuilderState.graphManagerState,
            undefined,
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
        disableCompile: true,
        actionConfigs: [],
      }),
    );
  } catch (error) {
    assertErrorThrown(error);
    editorStore.applicationStore.notificationService.notifyError(
      `Failed to open Data Product query builder: ${error.message}`,
    );
  }
};
