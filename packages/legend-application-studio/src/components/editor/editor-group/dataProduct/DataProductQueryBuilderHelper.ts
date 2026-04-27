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
  type DataProductAccessor,
  type NativeModelExecutionContext,
  LakehouseAccessPoint,
  ModelAccessPointGroup,
} from '@finos/legend-graph';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';
import { flowResult } from 'mobx';
import {
  DataProductQueryBuilderState,
  QueryBuilderActionConfig,
  QueryBuilderAdvancedWorkflowState,
  resolveDataProductAccessor,
} from '@finos/legend-query-builder';
import type { DepotEntityWithOrigin } from '@finos/legend-storage';
import {
  assertErrorThrown,
  assertTrue,
  filterByType,
  guaranteeNonNullable,
} from '@finos/legend-shared';

const isQueryableDataProduct = (dataProduct: DataProduct): boolean => {
  return (
    Boolean(
      dataProduct.nativeModelAccess?.nativeModelExecutionContexts.length,
    ) ||
    dataProduct.accessPointGroups.filter(filterByType(ModelAccessPointGroup))
      .length > 0 ||
    dataProduct.accessPointGroups
      .map((group) => group.accessPoints)
      .flat()
      .filter(filterByType(LakehouseAccessPoint)).length > 0
  );
};

const resolveDefaultExecState = (
  dataProduct: DataProduct,
):
  | ModelAccessPointGroup
  | LakehouseAccessPoint
  | NativeModelExecutionContext
  | undefined => {
  const nativeAccessPoints =
    dataProduct.nativeModelAccess?.defaultExecutionContext;
  const modeled = dataProduct.accessPointGroups.filter(
    filterByType(ModelAccessPointGroup),
  )[0];
  const lakehouseAccessPoints = dataProduct.accessPointGroups
    .map((group) => group.accessPoints)
    .flat()
    .filter(filterByType(LakehouseAccessPoint))[0];
  return modeled ?? lakehouseAccessPoints ?? nativeAccessPoints;
};

export const queryDataProduct = async (
  dataProduct: DataProduct,
  editorStore: EditorStore,
): Promise<void> => {
  try {
    assertTrue(
      isQueryableDataProduct(dataProduct),
      'Data Product is not queryable. Data Product must have either a lakehouse, model or native access point',
    );
    const embeddedQueryBuilderState = editorStore.embeddedQueryBuilderState;
    const defaultExecutionContext = guaranteeNonNullable(
      resolveDefaultExecState(dataProduct),
      'No execution context found for Data Product',
    );
    let accessor: DataProductAccessor | undefined;
    if (defaultExecutionContext instanceof LakehouseAccessPoint) {
      const relationMetadata =
        await editorStore.graphManagerState.graphManager.getLambdaRelationType(
          defaultExecutionContext.func,
          editorStore.graphManagerState.graph,
        );
      accessor = resolveDataProductAccessor(
        dataProduct,
        defaultExecutionContext,
        editorStore.graphManagerState.graph,
        undefined,
        relationMetadata,
      );
    }
    await flowResult(
      embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration({
        setupQueryBuilderState: async () => {
          const sourceInfo = Object.assign(
            {},
            editorStore.editorMode.getSourceInfo(),
            {
              dataProduct: dataProduct.path,
            },
          );
          const queryBuilderState = new DataProductQueryBuilderState(
            editorStore.applicationStore,
            editorStore.graphManagerState,
            QueryBuilderAdvancedWorkflowState.INSTANCE,
            dataProduct,
            undefined,
            QueryBuilderActionConfig.INSTANCE,
            defaultExecutionContext,
            undefined,
            async (val: DepotEntityWithOrigin) => {},
            undefined,
            editorStore.applicationStore.config.options.queryBuilderConfig,
            sourceInfo,
          );

          queryBuilderState.initWithDataProduct(
            dataProduct,
            accessor,
            defaultExecutionContext,
          );
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
