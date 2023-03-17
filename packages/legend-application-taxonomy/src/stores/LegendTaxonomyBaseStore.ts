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
  type ApplicationStore,
  LegendApplicationTelemetryHelper,
  APPLICATION_EVENT,
} from '@finos/legend-application';
import type { DepotServerClient } from '@finos/legend-server-depot';
import {
  ActionState,
  assertErrorThrown,
  LogEvent,
  NetworkClient,
  type GeneratorFn,
} from '@finos/legend-shared';
import { flow, makeObservable } from 'mobx';
import type { LegendTaxonomyApplicationConfig } from '../application/LegendTaxonomyApplicationConfig.js';
import type { LegendTaxonomyPluginManager } from '../application/LegendTaxonomyPluginManager.js';
import type { TaxonomyServerClient } from './TaxonomyServerClient.js';

export type LegendTaxonomyApplicationStore = ApplicationStore<
  LegendTaxonomyApplicationConfig,
  LegendTaxonomyPluginManager
>;

export class LegendTaxonomyBaseStore {
  readonly applicationStore: LegendTaxonomyApplicationStore;
  readonly depotServerClient: DepotServerClient;
  readonly taxonomyServerClient: TaxonomyServerClient;
  readonly pluginManager: LegendTaxonomyPluginManager;

  readonly initState = ActionState.create();

  constructor(
    applicationStore: LegendTaxonomyApplicationStore,
    taxonomyServerClient: TaxonomyServerClient,
    depotServerClient: DepotServerClient,
  ) {
    makeObservable(this, {
      initialize: flow,
    });

    this.applicationStore = applicationStore;
    this.taxonomyServerClient = taxonomyServerClient;
    this.depotServerClient = depotServerClient;
    this.pluginManager = applicationStore.pluginManager;

    // Register plugins
    this.taxonomyServerClient.setTracerService(
      this.applicationStore.tracerService,
    );
    this.depotServerClient.setTracerService(
      this.applicationStore.tracerService,
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

    try {
      this.applicationStore.identityService.setCurrentUser(
        (yield new NetworkClient().get(
          `${this.applicationStore.config.engineServerUrl}/server/v1/currentUser`,
        )) as string,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(
          APPLICATION_EVENT.APPLICATION_IDENTITY_AUTO_FETCH__FAILURE,
        ),
        error,
      );
      this.applicationStore.notificationService.notifyWarning(error.message);
    }

    // setup telemetry service
    this.applicationStore.telemetryService.setup();

    LegendApplicationTelemetryHelper.logEvent_ApplicationInitializationSucceeded(
      this.applicationStore.telemetryService,
      this.applicationStore,
    );

    this.initState.complete();
  }
}
