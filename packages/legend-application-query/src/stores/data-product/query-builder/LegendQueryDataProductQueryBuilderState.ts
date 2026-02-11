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
  DataProductQueryBuilderState,
  type QueryBuilderActionConfig,
  type QueryBuilderConfig,
  type QueryBuilderWorkflowState,
  type ExtraOptionsConfig,
} from '@finos/legend-query-builder';
import type { LegendQueryApplicationStore } from '../../LegendQueryBaseStore.js';
import {
  resolveVersion,
  type DepotServerClient,
} from '@finos/legend-server-depot';
import type {
  DepotEntityWithOrigin,
  ProjectGAVCoordinates,
  QueryableSourceInfo,
} from '@finos/legend-storage';
import {
  LegendSDLC,
  type Class,
  type DataProduct,
  type GraphManagerState,
  type NativeModelAccess,
  type NativeModelExecutionContext,
  type V1_DataProductArtifact,
} from '@finos/legend-graph';
import {
  DATA_PRODUCT_EXECUTION_TYPE,
  generateDataProductRoute,
} from '../../../__lib__/LegendQueryNavigation.js';

export class LegendQueryDataProductQueryBuilderState extends DataProductQueryBuilderState {
  declare applicationStore: LegendQueryApplicationStore;
  depotServerClient: DepotServerClient;
  project: ProjectGAVCoordinates;
  declare extraOptionsConfig: ExtraOptionsConfig<DepotEntityWithOrigin>;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    graphManagerState: GraphManagerState,
    workflow: QueryBuilderWorkflowState,
    actionConfig: QueryBuilderActionConfig,
    dataProduct: DataProduct,
    artifact: V1_DataProductArtifact | undefined,
    nativeNativeModelAccess: NativeModelAccess,
    nativeModelExecContext: NativeModelExecutionContext,
    isLightGraphEnabled: boolean,
    depotServerClient: DepotServerClient,
    project: ProjectGAVCoordinates,
    onDataProductChange: (val: DepotEntityWithOrigin) => Promise<void>,
    onExecutionContextChange?:
      | ((val: NativeModelExecutionContext) => void)
      | undefined,
    onClassChange?: ((val: Class) => void) | undefined,
    config?: QueryBuilderConfig | undefined,
    sourceInfo?: QueryableSourceInfo | undefined,
  ) {
    super(
      applicationStore,
      graphManagerState,
      workflow,
      dataProduct,
      artifact,
      actionConfig,
      nativeNativeModelAccess,
      nativeModelExecContext,
      undefined,
      onDataProductChange,
      onExecutionContextChange,
      onClassChange,
      config,
      sourceInfo,
    );
    this.project = project;
    this.depotServerClient = depotServerClient;
  }

  get sdlc(): LegendSDLC {
    return new LegendSDLC(
      this.project.groupId,
      this.project.artifactId,
      resolveVersion(this.project.versionId),
    );
  }

  override copyDataProductLinkToClipBoard(): void {
    const dataSpace = this.dataProduct;
    const executionContext = this.selectedExecContext;
    const route =
      this.applicationStore.navigationService.navigator.generateAddress(
        generateDataProductRoute(
          this.project.groupId,
          this.project.artifactId,
          this.project.versionId,
          dataSpace.path,
          DATA_PRODUCT_EXECUTION_TYPE.NATIVE,
          executionContext.key,
        ),
      );

    navigator.clipboard
      .writeText(route)
      .catch(() =>
        this.applicationStore.notificationService.notifyError(
          'Error copying data product query set up link to clipboard',
        ),
      );

    this.applicationStore.notificationService.notifySuccess(
      'Copied data product query set up link to clipboard',
    );
  }
}
