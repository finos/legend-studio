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
  APPLICATION_EVENT,
  DEFAULT_TAB_SIZE,
  type ApplicationStore,
} from '@finos/legend-application';
import type { LegendDataCubePluginManager } from '../application/LegendDataCubePluginManager.js';
import { DepotServerClient } from '@finos/legend-server-depot';
import type { LegendDataCubeApplicationConfig } from '../application/LegendDataCubeApplicationConfig.js';
import {
  V1_EngineServerClient,
  V1_PureGraphManager,
} from '@finos/legend-graph';
import { ActionState, LogEvent, assertErrorThrown } from '@finos/legend-shared';
import { LegendDataCubeDataCubeEngine } from './LegendDataCubeDataCubeEngine.js';
import { LayoutManagerState } from '@finos/legend-data-cube';

export type LegendDataCubeApplicationStore = ApplicationStore<
  LegendDataCubeApplicationConfig,
  LegendDataCubePluginManager
>;

declare const AG_GRID_LICENSE: string | undefined;

export class LegendDataCubeBaseStore {
  readonly application: LegendDataCubeApplicationStore;
  readonly pluginManager: LegendDataCubePluginManager;
  readonly layout = new LayoutManagerState();

  readonly depotServerClient: DepotServerClient;
  readonly graphManager: V1_PureGraphManager;
  readonly engineServerClient: V1_EngineServerClient;
  readonly engine: LegendDataCubeDataCubeEngine;

  readonly startTime = Date.now();
  readonly initState = ActionState.create();

  gridClientLicense?: string | undefined;

  constructor(application: LegendDataCubeApplicationStore) {
    this.application = application;
    this.pluginManager = application.pluginManager;
    this.depotServerClient = new DepotServerClient({
      serverUrl: this.application.config.depotServerUrl,
    });
    this.depotServerClient.setTracerService(application.tracerService);
    this.graphManager = new V1_PureGraphManager(
      this.application.pluginManager,
      this.application.logService,
    );
    this.engineServerClient = new V1_EngineServerClient({
      baseUrl: this.application.config.engineServerUrl,
      enableCompression: true,
      queryBaseUrl: this.application.config.engineQueryServerUrl,
    });
    this.engineServerClient.setTracerService(application.tracerService);
    this.engine = new LegendDataCubeDataCubeEngine(this);
  }

  async initialize() {
    this.initState.inProgress();

    try {
      this.application.identityService.setCurrentUser(
        await this.engineServerClient.getCurrentUserId(),
      );
      this.application.telemetryService.setup();
    } catch (error) {
      assertErrorThrown(error);
      this.application.logService.error(
        LogEvent.create(APPLICATION_EVENT.IDENTITY_AUTO_FETCH__FAILURE),
        error,
      );
    }

    try {
      this.gridClientLicense = AG_GRID_LICENSE;

      await this.graphManager.initialize(
        {
          env: this.application.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl: this.application.config.engineServerUrl,
            queryBaseUrl: this.application.config.engineQueryServerUrl,
            enableCompression: true,
          },
        },
        {
          tracerService: this.application.tracerService,
        },
      );
      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.application.logService.error(
        LogEvent.create(APPLICATION_EVENT.APPLICATION_LOAD__FAILURE),
        `Can't initialize Legend DataCube`,
        error,
      );
      this.initState.fail();
    }
  }
}
