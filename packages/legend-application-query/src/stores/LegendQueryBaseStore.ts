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

import type { DepotServerClient } from '@finos/legend-server-depot';
import {
  type ApplicationStore,
  ApplicationTelemetry,
  APPLICATION_EVENT,
} from '@finos/legend-application';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';
import type { LegendQueryApplicationConfig } from '../application/LegendQueryApplicationConfig.js';
import {
  ActionState,
  assertErrorThrown,
  LogEvent,
  NetworkClient,
  type GeneratorFn,
} from '@finos/legend-shared';
import { flow, makeObservable } from 'mobx';

export type LegendQueryApplicationStore = ApplicationStore<
  LegendQueryApplicationConfig,
  LegendQueryPluginManager
>;

export class LegendQueryBaseStore {
  readonly applicationStore: LegendQueryApplicationStore;
  readonly depotServerClient: DepotServerClient;
  readonly pluginManager: LegendQueryPluginManager;

  readonly initState = ActionState.create();

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    makeObservable(this, {
      initialize: flow,
    });

    this.applicationStore = applicationStore;
    this.depotServerClient = depotServerClient;
    this.pluginManager = applicationStore.pluginManager;

    // Register plugins
    this.depotServerClient.setTracerService(
      this.applicationStore.tracerService,
    );
  }

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      this.applicationStore.notifyIllegalState('Base store is re-initialized');
      return;
    }
    this.initState.inProgress();

    try {
      this.applicationStore.setCurrentUser(
        (yield new NetworkClient().get(
          `${this.applicationStore.config.engineServerUrl}/server/v1/currentUser`,
        )) as string,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(
          APPLICATION_EVENT.APPLICATION_IDENTITY_AUTO_FETCH_FAILURE,
        ),
        error,
      );
      this.applicationStore.notifyWarning(error.message);
    }

    // setup telemetry service
    this.applicationStore.telemetryService.setUserId(
      this.applicationStore.currentUser,
    );

    ApplicationTelemetry.logEvent_ApplicationInitialized(
      this.applicationStore.telemetryService,
      {
        application: {
          name: this.applicationStore.config.appName,
          version: this.applicationStore.config.appVersion,
          env: this.applicationStore.config.env,
        },
        browser: {
          userAgent: navigator.userAgent,
        },
        screen: {
          height: window.screen.height,
          width: window.screen.width,
        },
      },
    );

    this.initState.complete();
  }
}
