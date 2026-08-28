/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  type GenericLegendApplicationStore,
  APPLICATION_EVENT,
} from '@finos/legend-application';
import {
  type GraphManagerState,
  type V1_EngineServerClient,
  V1_PureGraphManager,
} from '@finos/legend-graph';
import type { DepotServerClient } from '@finos/legend-server-depot';
import type {
  LakehouseContractServerClient,
  LakehouseIngestServerClient,
  LakehousePlatformServerClient,
  PermitWorkflowServerClient,
} from '@finos/legend-server-lakehouse';
import type { ProjectGAVCoordinates } from '@finos/legend-storage';
import {
  type UserSearchService,
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  guaranteeType,
  LogEvent,
} from '@finos/legend-shared';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import {
  type DataProductConfig,
  type DataProductDataAccess_LegendApplicationPlugin_Extension,
  type DataProductDataAccessStateActions,
  type DataProductAPGState,
  DataProductDataAccessState,
  DataProductViewerState,
  resolveEntitlementsDataProductFromSDLC,
} from '@finos/legend-extension-dsl-data-product';

export type DataSpaceMappingProviderAccessConfig = {
  depotServerClient: DepotServerClient;
  engineServerClient: V1_EngineServerClient;
  lakehouseContractServerClient: LakehouseContractServerClient;
  lakehousePlatformServerClient: LakehousePlatformServerClient;
  lakehouseIngestServerClient: LakehouseIngestServerClient;
  permitWorkflowServerClient?: PermitWorkflowServerClient | undefined;
  dataAccessPlugins: DataProductDataAccess_LegendApplicationPlugin_Extension[];
  dataProductConfig?: DataProductConfig | undefined;
  userSearchService?: UserSearchService | undefined;
  dataAccessStateActions: DataProductDataAccessStateActions;
  tokenProvider: () => string | undefined;
};

/**
 * Backing state for the DataSpace viewer's "Request Access" flow on
 * mappingProvider execution contexts. Lazily resolves the referenced Lakehouse
 * DataProduct from the depot artifact generation for the DataSpace's own GAV,
 * then materializes the same viewer + data-access state stack that the LH
 * DataProduct viewer uses so that the access-request button and its dialogs
 * can be rendered as-is.
 */
export class DataSpaceMappingProviderAccessState {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly graphManagerState: GraphManagerState;
  readonly gav: ProjectGAVCoordinates;
  readonly mappingProviderPath: string;
  readonly config: DataSpaceMappingProviderAccessConfig;

  readonly initializingState = ActionState.create();

  dataProductViewerState: DataProductViewerState | undefined = undefined;
  dataAccessState: DataProductDataAccessState | undefined = undefined;
  modelAPGState: DataProductAPGState | undefined = undefined;
  errorMessage: string | undefined = undefined;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    gav: ProjectGAVCoordinates,
    mappingProviderPath: string,
    config: DataSpaceMappingProviderAccessConfig,
  ) {
    makeObservable(this, {
      dataProductViewerState: observable,
      dataAccessState: observable,
      modelAPGState: observable,
      errorMessage: observable,
      setDataProductViewerState: action,
      setDataAccessState: action,
      setModelAPGState: action,
      setErrorMessage: action,
      initialize: flow,
    });
    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;
    this.gav = gav;
    this.mappingProviderPath = mappingProviderPath;
    this.config = config;
  }

  setDataProductViewerState(val: DataProductViewerState | undefined): void {
    this.dataProductViewerState = val;
  }

  setDataAccessState(val: DataProductDataAccessState | undefined): void {
    this.dataAccessState = val;
  }

  setModelAPGState(val: DataProductAPGState | undefined): void {
    this.modelAPGState = val;
  }

  setErrorMessage(val: string | undefined): void {
    this.errorMessage = val;
  }

  *initialize(): GeneratorFn<void> {
    if (
      !this.initializingState.isInInitialState ||
      this.dataAccessState !== undefined
    ) {
      return;
    }
    this.initializingState.inProgress();
    try {
      const graphManager = guaranteeType(
        this.graphManagerState.graphManager,
        V1_PureGraphManager,
        'GraphManager must be a V1_PureGraphManager',
      );
      const resolved = (yield resolveEntitlementsDataProductFromSDLC(
        this.gav,
        this.mappingProviderPath,
        this.config.depotServerClient,
        this.config.lakehouseContractServerClient,
        graphManager,
        this.config.tokenProvider,
      )) as Awaited<ReturnType<typeof resolveEntitlementsDataProductFromSDLC>>;
      const dataProductViewerState = new DataProductViewerState(
        resolved.dataProduct,
        this.applicationStore,
        this.config.engineServerClient,
        this.config.depotServerClient,
        this.graphManagerState,
        this.config.dataProductConfig,
        this.config.userSearchService,
        this.gav,
        {},
      );
      dataProductViewerState.entitlementsDataProductDetails = resolved.details;
      this.setDataProductViewerState(dataProductViewerState);
      const dataAccessState = new DataProductDataAccessState(
        resolved.details,
        dataProductViewerState,
        this.config.lakehouseContractServerClient,
        this.config.lakehousePlatformServerClient,
        this.config.lakehouseIngestServerClient,
        this.config.dataAccessPlugins,
        this.config.dataAccessStateActions,
        this.config.permitWorkflowServerClient,
      );
      dataProductViewerState.setDataProductDataAccessState(dataAccessState);
      this.setDataAccessState(dataAccessState);
      const modelAPG = dataProductViewerState.getModelAccessPointGroup();
      if (!modelAPG) {
        this.setErrorMessage(
          `Data Product '${this.mappingProviderPath}' has no model access point group.`,
        );
      } else {
        const modelAPGState = dataProductViewerState.apgStates.find(
          (state) => state.apg === modelAPG,
        );
        this.setModelAPGState(modelAPGState);
      }
      yield flowResult(dataAccessState.init(this.config.tokenProvider));
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
        `Failed to initialize DataSpace mapping provider access for '${this.mappingProviderPath}' (${this.gav.groupId}:${this.gav.artifactId}:${this.gav.versionId}): ${error.message}`,
      );
      this.setErrorMessage(error.message);
    } finally {
      this.initializingState.complete();
    }
  }
}
