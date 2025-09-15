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
  type PlainObject,
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
} from '@finos/legend-application';
import { action, flow, makeObservable, observable } from 'mobx';
import { DepotServerClient } from '@finos/legend-server-depot';
import { MarketplaceServerClient } from '@finos/legend-server-marketplace';
import {
  type V1_EngineServerClient,
  type V1_IngestEnvironment,
  getCurrentUserIDFromEngineServer,
  V1_deserializeIngestEnvironment,
  V1_RemoteEngine,
} from '@finos/legend-graph';
import type { LegendMarketplaceApplicationConfig } from '../application/LegendMarketplaceApplicationConfig.js';
import type { LegendMarketplacePluginManager } from '../application/LegendMarketplacePluginManager.js';
import { LegendMarketplaceEventHelper } from '../__lib__/LegendMarketplaceEventHelper.js';
import {
  IngestDeploymentServerConfig,
  LakehouseContractServerClient,
  LakehouseIngestServerClient,
  LakehousePlatformServerClient,
} from '@finos/legend-server-lakehouse';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../__lib__/LegendMarketplaceAppEvent.js';

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

  lakehouseIngestEnvironmentSummaries: IngestDeploymentServerConfig[] = [];
  lakehouseIngestEnvironmentDetails: V1_IngestEnvironment[] = [];

  readonly initState = ActionState.create();
  readonly ingestEnvironmentFetchState = ActionState.create();

  constructor(applicationStore: LegendMarketplaceApplicationStore) {
    makeObservable<LegendMarketplaceBaseStore>(this, {
      lakehouseIngestEnvironmentSummaries: observable,
      lakehouseIngestEnvironmentDetails: observable,
      setLakehouseIngestEnvironmentSummaries: action,
      setLakehouseIngestEnvironmentDetails: action,
      initialize: flow,
      initializeIngestEnvironmentDetails: flow,
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
      this.userSearchService = new UserSearchService();
      this.userSearchService.registerPlugins(
        this.pluginManager.getUserPlugins(),
      );
    }
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

  *initializeIngestEnvironmentDetails(
    token: string | undefined,
  ): GeneratorFn<void> {
    if (!this.ingestEnvironmentFetchState.isInInitialState) {
      this.applicationStore.notificationService.notifyIllegalState(
        'Base store ingest environment details are re-initialized',
      );
      return;
    }

    this.ingestEnvironmentFetchState.inProgress();
    yield this.fetchLakehouseIngestEnvironmentSummaries(token);
    yield this.fetchLakehouseIngestEnvironmentDetails(token);
    this.ingestEnvironmentFetchState.complete();
  }

  setLakehouseIngestEnvironmentSummaries(
    summaries: IngestDeploymentServerConfig[],
  ): void {
    this.lakehouseIngestEnvironmentSummaries = summaries;
  }

  setLakehouseIngestEnvironmentDetails(details: V1_IngestEnvironment[]): void {
    this.lakehouseIngestEnvironmentDetails = details;
  }

  async fetchLakehouseIngestEnvironmentSummaries(
    token: string | undefined,
  ): Promise<void> {
    try {
      const discoveryEnvironments = (
        await this.lakehousePlatformServerClient.getIngestEnvironmentSummaries(
          token,
        )
      ).map((e: PlainObject<IngestDeploymentServerConfig>) =>
        IngestDeploymentServerConfig.serialization.fromJson(e),
      );
      this.setLakehouseIngestEnvironmentSummaries(discoveryEnvironments);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.warn(
        LogEvent.create(LEGEND_MARKETPLACE_APP_EVENT.FETCH_INGEST_ENV_FAILURE),
        `Unable to load lakehouse environment summaries: ${error.message}`,
      );
    }
  }

  async fetchLakehouseIngestEnvironmentDetails(
    token: string | undefined,
  ): Promise<void> {
    try {
      const ingestEnvironments: V1_IngestEnvironment[] = (
        await Promise.all(
          this.lakehouseIngestEnvironmentSummaries.map(async (discoveryEnv) => {
            try {
              const env =
                await this.lakehouseIngestServerClient.getIngestEnvironment(
                  discoveryEnv.ingestServerUrl,
                  token,
                );
              return V1_deserializeIngestEnvironment(env);
            } catch (error) {
              assertErrorThrown(error);
              this.applicationStore.logService.warn(
                LogEvent.create(
                  LEGEND_MARKETPLACE_APP_EVENT.FETCH_INGEST_ENV_FAILURE,
                ),
                `Unable to load lakehouse environment details for ${discoveryEnv.ingestEnvironmentUrn}: ${error.message}`,
              );
              return undefined;
            }
          }),
        )
      ).filter(isNonNullable);
      this.setLakehouseIngestEnvironmentDetails(ingestEnvironments);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.warn(
        LogEvent.create(LEGEND_MARKETPLACE_APP_EVENT.FETCH_INGEST_ENV_FAILURE),
        `Unable to load lakehouse environment details: ${error.message}`,
      );
    }
  }
}
