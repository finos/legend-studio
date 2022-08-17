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

import { type GeneratorFn, ActionState } from '@finos/legend-shared';
import {
  type ApplicationStore,
  ApplicationTelemetry,
  LegendApplicationSDLCSetupState,
} from '@finos/legend-application';
import { flow, flowResult, makeObservable } from 'mobx';
import type { SDLCServerClient } from '@finos/legend-server-sdlc';
import type { DepotServerClient } from '@finos/legend-server-depot';
import type { LegendStudioPluginManager } from '../application/LegendStudioPluginManager.js';
import type { LegendStudioApplicationConfig } from '../application/LegendStudioApplicationConfig.js';
import { LegendStudioEventService } from './LegendStudioEventService.js';
import type { LegendStudioApplicationPlugin } from './LegendStudioApplicationPlugin.js';

const UNKNOWN_USER_ID = '(unknown)';

export type LegendStudioApplicationStore = ApplicationStore<
  LegendStudioApplicationConfig,
  LegendStudioApplicationPlugin
>;

export class LegendStudioBaseStore {
  applicationStore: LegendStudioApplicationStore;
  depotServerClient: DepotServerClient;
  pluginManager: LegendStudioPluginManager;

  initState = ActionState.create();
  applicationSDLCSetupState: LegendApplicationSDLCSetupState;

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
    depotServerClient: DepotServerClient,
    pluginManager: LegendStudioPluginManager,
  ) {
    makeObservable(this, {
      initialize: flow,
    });

    this.applicationStore = applicationStore;
    this.applicationSDLCSetupState = new LegendApplicationSDLCSetupState(
      applicationStore,
      sdlcServerClient,
    );
    this.depotServerClient = depotServerClient;

    this.pluginManager = pluginManager;

    // Register plugins
    this.applicationSDLCSetupState.sdlcServerClient.setTracerService(
      this.applicationStore.tracerService,
    );
    this.depotServerClient.setTracerService(
      this.applicationStore.tracerService,
    );
  }

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      this.applicationStore.notifyIllegalState(
        'Studio store is re-initialized',
      );
      return;
    }
    this.initState.inProgress();

    // setup SDLC server client
    yield flowResult(
      this.applicationSDLCSetupState.initializeSDLCServerClient(),
    );

    // setup telemetry service
    this.applicationStore.telemetryService.setUserId(
      this.applicationSDLCSetupState.sdlcServerClient.currentUser?.userId ??
        UNKNOWN_USER_ID,
    );

    ApplicationTelemetry.logEvent_ApplicationInitialized(
      this.applicationStore.telemetryService,
      {
        browser: {
          userAgent: navigator.userAgent,
        },
        screen: {
          height: window.screen.height,
          width: window.screen.width,
        },
      },
    );
    LegendStudioEventService.create(
      this.applicationStore.eventService,
    ).notify_ApplicationLoaded();

    this.initState.complete();
  }
}
