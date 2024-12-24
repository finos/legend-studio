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
  getCurrentUserIDFromEngineServer,
  GraphManagerState,
} from '@finos/legend-graph';
import {
  ActionState,
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { LegendDataCubeDataCubeEngine } from './LegendDataCubeDataCubeEngine.js';

export type LegendDataCubeApplicationStore = ApplicationStore<
  LegendDataCubeApplicationConfig,
  LegendDataCubePluginManager
>;

declare const AG_GRID_LICENSE: string | undefined;

export class LegendDataCubeBaseStore {
  readonly application: LegendDataCubeApplicationStore;
  readonly pluginManager: LegendDataCubePluginManager;
  readonly depotServerClient: DepotServerClient;
  readonly graphManagerState: GraphManagerState;

  readonly startTime = Date.now();
  readonly initState = ActionState.create();

  private _engine?: LegendDataCubeDataCubeEngine | undefined;
  gridClientLicense?: string | undefined;

  constructor(application: LegendDataCubeApplicationStore) {
    this.application = application;
    this.pluginManager = application.pluginManager;
    this.depotServerClient = new DepotServerClient({
      serverUrl: this.application.config.depotServerUrl,
    });
    this.depotServerClient.setTracerService(application.tracerService);
    this.graphManagerState = new GraphManagerState(
      this.application.pluginManager,
      this.application.logService,
    );
  }

  get engine(): LegendDataCubeDataCubeEngine {
    return guaranteeNonNullable(
      this._engine,
      'Engine has not been initialized',
    );
  }

  async initialize() {
    this.initState.inProgress();
    try {
      this.application.identityService.setCurrentUser(
        await getCurrentUserIDFromEngineServer(
          this.application.config.engineServerUrl,
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.application.logService.error(
        LogEvent.create(APPLICATION_EVENT.IDENTITY_AUTO_FETCH__FAILURE),
        error,
      );
    }

    this._engine = new LegendDataCubeDataCubeEngine(
      this.application,
      this.graphManagerState,
    );

    try {
      this.gridClientLicense = AG_GRID_LICENSE;

      await this.graphManagerState.graphManager.initialize(
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
