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
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  isNonNullable,
  LogEvent,
  UserSearchService,
} from '@finos/legend-shared';
import {
  type ApplicationStore,
  LegendApplicationTelemetryHelper,
  APPLICATION_EVENT,
  DEFAULT_TAB_SIZE,
} from '@finos/legend-application';
import { action, flow, makeObservable, observable } from 'mobx';
import {
  DepotServerClient,
  StoreProjectData,
} from '@finos/legend-server-depot';
import { MarketplaceServerClient } from '@finos/legend-server-marketplace';
import {
  type V1_EngineServerClient,
  getCurrentUserIDFromEngineServer,
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_PureGraphManager,
  V1_RemoteEngine,
} from '@finos/legend-graph';
import type { LegendMarketplaceApplicationConfig } from '../application/LegendMarketplaceApplicationConfig.js';
import type { LegendMarketplacePluginManager } from '../application/LegendMarketplacePluginManager.js';
import { LegendMarketplaceEventHelper } from '../__lib__/LegendMarketplaceEventHelper.js';
import {
  LakehouseContractServerClient,
  LakehouseIngestServerClient,
  LakehousePlatformServerClient,
} from '@finos/legend-server-lakehouse';
import { DataProductCardState } from './lakehouse/dataProducts/DataProductCardState.js';
import type { BaseProductCardState } from './lakehouse/dataProducts/BaseProductCardState.js';
import { parseGAVCoordinates, type Entity } from '@finos/legend-storage';
import { V1_deserializeDataSpace } from '@finos/legend-extension-dsl-data-space/graph';
import { LegacyDataProductCardState } from './lakehouse/dataProducts/LegacyDataProductCardState.js';

export type LegendMarketplaceApplicationStore = ApplicationStore<
  LegendMarketplaceApplicationConfig,
  LegendMarketplacePluginManager
>;

export class LegendMarketplaceBaseStore {
  readonly applicationStore: LegendMarketplaceApplicationStore;
  readonly marketplaceServerClient: MarketplaceServerClient;
  readonly depotServerClient: DepotServerClient;
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  readonly lakehousePlatformServerClient: LakehousePlatformServerClient;
  readonly lakehouseIngestServerClient: LakehouseIngestServerClient;
  readonly engineServerClient: V1_EngineServerClient;
  readonly pluginManager: LegendMarketplacePluginManager;
  readonly remoteEngine: V1_RemoteEngine;
  readonly userSearchService: UserSearchService | undefined;

  readonly initState = ActionState.create();
  showDemoModal = false;

  constructor(applicationStore: LegendMarketplaceApplicationStore) {
    makeObservable<LegendMarketplaceBaseStore>(this, {
      showDemoModal: observable,
      setDemoModal: action,
      initialize: flow,
    });

    this.applicationStore = applicationStore;
    this.pluginManager = applicationStore.pluginManager;

    // marketplace
    this.marketplaceServerClient = new MarketplaceServerClient({
      serverUrl: this.applicationStore.config.marketplaceServerUrl,
      subscriptionUrl: this.applicationStore.config.marketplaceSubscriptionUrl,
    });
    this.marketplaceServerClient.setTracerService(
      this.applicationStore.tracerService,
    );

    // depot
    this.depotServerClient = new DepotServerClient({
      serverUrl: this.applicationStore.config.depotServerUrl,
    });
    this.depotServerClient.setTracerService(
      this.applicationStore.tracerService,
    );

    // lakehouse contract
    this.lakehouseContractServerClient = new LakehouseContractServerClient({
      baseUrl: this.applicationStore.config.lakehouseServerUrl,
    });
    this.lakehouseContractServerClient.setTracerService(
      this.applicationStore.tracerService,
    );

    // lakehouse platform
    this.lakehousePlatformServerClient = new LakehousePlatformServerClient(
      this.applicationStore.config.lakehousePlatformUrl,
    );
    this.lakehousePlatformServerClient.setTracerService(
      this.applicationStore.tracerService,
    );

    // lakehouse ingest
    this.lakehouseIngestServerClient = new LakehouseIngestServerClient(
      undefined,
    );
    this.lakehouseIngestServerClient.setTracerService(
      this.applicationStore.tracerService,
    );

    this.remoteEngine = new V1_RemoteEngine(
      {
        baseUrl: this.applicationStore.config.engineServerUrl,
      },
      applicationStore.logService,
    );
    this.engineServerClient = this.remoteEngine.getEngineServerClient();
    this.engineServerClient.setTracerService(applicationStore.tracerService);

    // User search
    if (this.pluginManager.getUserPlugins().length > 0) {
      this.pluginManager
        .getUserPlugins()
        .forEach((plugin) =>
          plugin.setup(this.applicationStore.config.marketplaceUserSearchUrl),
        );
      this.userSearchService = new UserSearchService({
        userProfileImageUrl:
          this.applicationStore.config.marketplaceUserProfileImageUrl,
        applicationDirectoryUrl:
          this.applicationStore.config.lakehouseEntitlementsConfig
            ?.applicationDirectoryUrl,
      });
      this.userSearchService.registerPlugins(
        this.pluginManager.getUserPlugins(),
      );
    }
  }

  async initHighlightedDataProducts(
    token: string | undefined,
  ): Promise<BaseProductCardState[] | undefined> {
    const highlightedDataProducts =
      this.applicationStore.config.options.highlightedDataProducts
        ?.split(',')
        .map((entry) => {
          const vals = entry.split('/');
          if (vals[0] === undefined || vals[1] === undefined) {
            return undefined;
          }
          const id = vals[0];
          const secondPart = vals[1];
          if (Number.isInteger(Number(secondPart))) {
            return {
              dataProductId: id,
              deploymentId: parseInt(secondPart),
            };
          } else {
            return { dataProductId: id, gav: secondPart };
          }
        })
        .filter(isNonNullable);

    if (highlightedDataProducts?.length) {
      const getDataProductState = async (
        dataProductId: string,
        deploymentId: number,
        graphManager: V1_PureGraphManager,
      ) => {
        const rawResponse =
          await this.lakehouseContractServerClient.getDataProductByIdAndDID(
            dataProductId,
            deploymentId,
            token,
          );
        const dataProductDetail =
          V1_entitlementsDataProductDetailsResponseToDataProductDetails(
            rawResponse,
          )[0];
        return dataProductDetail
          ? new DataProductCardState(
              this,
              graphManager,
              dataProductDetail,
              new Map(),
            )
          : undefined;
      };

      const getLegacyDataProductState = async (
        dataProductId: string,
        gave: string,
      ) => {
        const coordinates = parseGAVCoordinates(gave);
        const storeProject = new StoreProjectData();
        storeProject.groupId = coordinates.groupId;
        storeProject.artifactId = coordinates.artifactId;
        const legacyDataProuct = await this.depotServerClient.getEntity(
          storeProject,
          coordinates.versionId,
          dataProductId,
        );
        const dataSpace = V1_deserializeDataSpace(
          (legacyDataProuct as unknown as Entity).content,
        );
        return new LegacyDataProductCardState(
          this,
          dataSpace,
          coordinates.groupId,
          coordinates.artifactId,
          coordinates.versionId,
          new Map(),
        );
      };

      const graphManager = new V1_PureGraphManager(
        this.applicationStore.pluginManager,
        this.applicationStore.logService,
        this.remoteEngine,
      );
      await graphManager.initialize(
        {
          env: this.applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl: this.applicationStore.config.engineServerUrl,
          },
        },
        { engine: this.remoteEngine },
      );

      const dataProductStates = (
        await Promise.all(
          highlightedDataProducts.map(async (dataProduct) =>
            'deploymentId' in dataProduct
              ? getDataProductState(
                  dataProduct.dataProductId,
                  dataProduct.deploymentId,
                  graphManager,
                )
              : getLegacyDataProductState(
                  dataProduct.dataProductId,
                  dataProduct.gav,
                ),
          ),
        )
      ).filter(isNonNullable);
      dataProductStates.forEach((dataProductState) => dataProductState.init());
      return dataProductStates;
    }
    return undefined;
  }

  setDemoModal(val: boolean): void {
    this.showDemoModal = val;
  }

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      this.applicationStore.notificationService.notifyIllegalState(
        'Base store is re-initialized',
      );
      return;
    }
    this.initState.inProgress();

    // retrieved the user identity is not already configured
    if (this.applicationStore.identityService.isAnonymous) {
      try {
        this.applicationStore.identityService.setCurrentUser(
          (yield getCurrentUserIDFromEngineServer(
            this.applicationStore.config.engineServerUrl,
          )) as string,
        );
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.error(
          LogEvent.create(APPLICATION_EVENT.IDENTITY_AUTO_FETCH__FAILURE),
          error,
        );
        this.applicationStore.notificationService.notifyWarning(error.message);
      }
    }

    // setup telemetry service
    this.applicationStore.telemetryService.setup();

    LegendApplicationTelemetryHelper.logEvent_ApplicationInitializationSucceeded(
      this.applicationStore.telemetryService,
      this.applicationStore,
    );

    LegendMarketplaceEventHelper.notify_ApplicationLoadSucceeded(
      this.applicationStore.eventService,
    );

    this.initState.complete();
  }
}
