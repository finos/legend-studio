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
  LogEvent,
  assertErrorThrown,
} from '@finos/legend-shared';
import {
  type ApplicationStore,
  LegendApplicationTelemetryHelper,
  APPLICATION_EVENT,
} from '@finos/legend-application';
import { flow, makeObservable } from 'mobx';
import { DepotServerClient } from '@finos/legend-server-depot';
import { MarketplaceServerClient } from '@finos/legend-server-marketplace';
import { getCurrentUserIDFromEngineServer } from '@finos/legend-graph';
import type { LegendMarketplaceApplicationConfig } from '../application/LegendMarketplaceApplicationConfig.js';
import type { LegendMarketplacePluginManager } from '../application/LegendMarketplacePluginManager.js';
import { LegendMarketplaceEventHelper } from '../__lib__/LegendMarketplaceEventHelper.js';
import { LakehouseContractServerClient } from './LakehouseContractServerClient.js';
import { LegendMarketPlaceVendorDataState } from './LegendMarketPlaceVendorDataState.js';

export type LegendMarketplaceApplicationStore = ApplicationStore<
  LegendMarketplaceApplicationConfig,
  LegendMarketplacePluginManager
>;

export class LegendMarketplaceBaseStore {
  readonly applicationStore: LegendMarketplaceApplicationStore;
  readonly marketplaceServerClient: MarketplaceServerClient;
  readonly depotServerClient: DepotServerClient;
  readonly lakehouseServerClient: LakehouseContractServerClient | undefined;
  readonly pluginManager: LegendMarketplacePluginManager;

  readonly initState = ActionState.create();

  marketplaceVendorDataState: LegendMarketPlaceVendorDataState;

  constructor(applicationStore: LegendMarketplaceApplicationStore) {
    makeObservable<LegendMarketplaceBaseStore>(this, {
      initialize: flow,
    });

    this.applicationStore = applicationStore;
    this.pluginManager = applicationStore.pluginManager;

    // marketplace
    this.marketplaceServerClient = new MarketplaceServerClient({
      serverUrl: this.applicationStore.config.marketplaceServerUrl,
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

    if (this.applicationStore.config.lakehouseServerUrl) {
      // lakehouse server
      this.lakehouseServerClient = new LakehouseContractServerClient({
        baseUrl: this.applicationStore.config.lakehouseServerUrl,
      });
      this.lakehouseServerClient.setTracerService(
        this.applicationStore.tracerService,
      );
    }

    this.marketplaceVendorDataState = new LegendMarketPlaceVendorDataState(
      this.applicationStore,
      this,
    );
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
