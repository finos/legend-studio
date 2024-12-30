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
import {
  ActionState,
  LogEvent,
  assertErrorThrown,
  guaranteeIsBoolean,
  guaranteeIsString,
} from '@finos/legend-shared';
import { LegendDataCubeDataCubeEngine } from './LegendDataCubeDataCubeEngine.js';
import {
  DataCubeSettingGroup,
  DataCubeSettingType,
  LayoutManagerState,
  type DataCubeSetting,
  type DataCubeSettingValues,
} from '@finos/legend-data-cube';
import {
  LegendDataCubeSettingKey,
  LegendDataCubeSettingStorageKey,
} from '../__lib__/LegendDataCubeSetting.js';

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
  readonly initState = ActionState.create();

  readonly dataCubeSettings: DataCubeSetting[];

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

    this.dataCubeSettings = [
      {
        key: LegendDataCubeSettingKey.DEBUGGER__ENGINE_SERVER_CLIENT__ENABLE_COMPRESSION,
        title: `Engine Client Request Payload Compression: Enabled`,
        description: `Specifies if request payload should be compressed for better performance.`,
        group: DataCubeSettingGroup.DEBUG,
        type: DataCubeSettingType.BOOLEAN,
        defaultValue: true,
        action: (newValue) => {
          this.engineServerClient.setCompression(newValue);
          this.graphManager
            .TEMPORARY__getEngineConfig()
            .setUseClientRequestPayloadCompression(newValue);
        },
      } satisfies DataCubeSetting<boolean>,
      {
        key: LegendDataCubeSettingKey.DEBUGGER__ENGINE_SERVER_CLIENT__BASE_URL,
        title: `Engine Server Base URL`,
        description: `Specifies another base URL to be used for engine server.`,
        group: DataCubeSettingGroup.DEBUG,
        type: DataCubeSettingType.STRING,
        defaultValue: application.config.engineServerUrl,
        action: (newValue) => {
          this.engineServerClient.setBaseUrl(newValue);
          this.graphManager.TEMPORARY__getEngineConfig().setBaseUrl(newValue);
        },
      } satisfies DataCubeSetting<string>,
    ];

    this.engineServerClient = new V1_EngineServerClient({
      baseUrl: this.getEngineServerBaseUrlSettingValue(),
      queryBaseUrl: this.application.config.engineQueryServerUrl,
      enableCompression: this.getEngineEnableCompressionSettingValue(),
    });
    this.engineServerClient.setTracerService(application.tracerService);
    this.engine = new LegendDataCubeDataCubeEngine(this);
  }

  private getEngineEnableCompressionSettingValue() {
    const persistedValues = this.application.settingService.getObjectValue(
      LegendDataCubeSettingStorageKey.DATA_CUBE,
    ) as DataCubeSettingValues | undefined;
    return guaranteeIsBoolean(
      persistedValues?.[
        LegendDataCubeSettingKey
          .DEBUGGER__ENGINE_SERVER_CLIENT__ENABLE_COMPRESSION
      ] ??
        this.dataCubeSettings.find(
          (configuration) =>
            configuration.key ===
            LegendDataCubeSettingKey.DEBUGGER__ENGINE_SERVER_CLIENT__ENABLE_COMPRESSION,
        )?.defaultValue,
    );
  }

  private getEngineServerBaseUrlSettingValue() {
    const persistedValues = this.application.settingService.getObjectValue(
      LegendDataCubeSettingStorageKey.DATA_CUBE,
    ) as DataCubeSettingValues | undefined;
    return guaranteeIsString(
      persistedValues?.[
        LegendDataCubeSettingKey.DEBUGGER__ENGINE_SERVER_CLIENT__BASE_URL
      ] ??
        this.dataCubeSettings.find(
          (configuration) =>
            configuration.key ===
            LegendDataCubeSettingKey.DEBUGGER__ENGINE_SERVER_CLIENT__BASE_URL,
        )?.defaultValue,
    );
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
            baseUrl: this.getEngineServerBaseUrlSettingValue(),
            queryBaseUrl: this.application.config.engineQueryServerUrl,
            enableCompression: this.getEngineEnableCompressionSettingValue(),
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
