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
  LegendApplicationTelemetryHelper,
  type ApplicationStore,
} from '@finos/legend-application';
import type { LegendDataCubePluginManager } from '../application/LegendDataCubePluginManager.js';
import { DepotServerClient } from '@finos/legend-server-depot';
import type { LegendDataCubeApplicationConfig } from '../application/LegendDataCubeApplicationConfig.js';
import {
  type V1_EngineServerClient,
  V1_PureGraphManager,
  V1_RemoteEngine,
} from '@finos/legend-graph';
import {
  ActionState,
  LogEvent,
  assertErrorThrown,
  guaranteeIsBoolean,
  guaranteeIsString,
} from '@finos/legend-shared';
import {
  LakehouseContractServerClient,
  LakehouseIngestServerClient,
  LakehousePlatformServerClient,
} from '@finos/legend-server-lakehouse';
import { LegendDataCubeDataCubeEngine } from './LegendDataCubeDataCubeEngine.js';
import {
  DataCubeSettingGroup,
  DataCubeSettingType,
  DataCubeLayoutService,
  type DataCubeSetting,
  type DataCubeSettingValues,
  DataCubeAlertService,
  DataCubeLogService,
  DataCubeTaskService,
} from '@finos/legend-data-cube';
import {
  LegendDataCubeSettingKey,
  LegendDataCubeSettingStorageKey,
} from '../__lib__/LegendDataCubeSetting.js';

declare const AG_GRID_LICENSE: string | undefined;

export type LegendDataCubeApplicationStore = ApplicationStore<
  LegendDataCubeApplicationConfig,
  LegendDataCubePluginManager
>;

export class LegendDataCubeBaseStore {
  readonly application: LegendDataCubeApplicationStore;
  readonly pluginManager: LegendDataCubePluginManager;
  readonly depotServerClient: DepotServerClient;
  readonly lakehousePlatformServerClient: LakehousePlatformServerClient;
  readonly lakehouseIngestServerClient: LakehouseIngestServerClient;
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  readonly graphManager: V1_PureGraphManager;
  readonly remoteEngine: V1_RemoteEngine;
  readonly engineServerClient: V1_EngineServerClient;

  readonly engine: LegendDataCubeDataCubeEngine;
  readonly taskService: DataCubeTaskService;
  readonly layoutService: DataCubeLayoutService;
  readonly alertService: DataCubeAlertService;
  readonly settings: DataCubeSetting[];

  readonly initializeState = ActionState.create();

  gridClientLicense?: string | undefined;

  constructor(application: LegendDataCubeApplicationStore) {
    this.application = application;
    this.pluginManager = application.pluginManager;
    this.depotServerClient = new DepotServerClient({
      serverUrl: this.application.config.depotServerUrl,
    });
    this.depotServerClient.setTracerService(application.tracerService);

    this.lakehousePlatformServerClient = new LakehousePlatformServerClient(
      this.application.config.lakehousePlatformUrl,
    );
    this.lakehousePlatformServerClient.setTracerService(
      application.tracerService,
    );
    this.lakehouseIngestServerClient = new LakehouseIngestServerClient(
      undefined,
    );
    this.lakehouseIngestServerClient.setTracerService(
      application.tracerService,
    );
    this.lakehouseContractServerClient = new LakehouseContractServerClient({
      baseUrl: this.application.config.lakehouseContractUrl,
    });
    this.lakehouseContractServerClient.setTracerService(
      application.tracerService,
    );

    this.graphManager = new V1_PureGraphManager(
      this.application.pluginManager,
      this.application.logService,
    );

    // initialize early so that subsequent steps can refer to these settings below
    // for default configuration values
    this.settings = [
      {
        key: LegendDataCubeSettingKey.DEBUGGER__ENGINE_SERVER_CLIENT__ENABLE_COMPRESSION,
        title: `Engine Client Request Payload Compression: Enabled`,
        description: `Specifies if request payload should be compressed for better performance.`,
        group: DataCubeSettingGroup.DEBUG,
        type: DataCubeSettingType.BOOLEAN,
        defaultValue: true,
        action: (api, newValue) => {
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
        action: (api, newValue) => {
          this.engineServerClient.setBaseUrl(newValue);
          this.graphManager.TEMPORARY__getEngineConfig().setBaseUrl(newValue);
        },
      } satisfies DataCubeSetting<string>,
    ];

    this.remoteEngine = new V1_RemoteEngine(
      {
        baseUrl: this.getEngineServerBaseUrlSettingValue(),
        queryBaseUrl: this.application.config.engineQueryServerUrl,
        enableCompression: this.getEngineEnableCompressionSettingValue(),
      },
      application.logService,
    );
    this.engineServerClient = this.remoteEngine.getEngineServerClient();
    this.engineServerClient.setTracerService(application.tracerService);

    this.engine = new LegendDataCubeDataCubeEngine(
      this.application,
      this.depotServerClient,
      this.engineServerClient,
      this.lakehouseContractServerClient,
      this.lakehouseIngestServerClient,
      this.graphManager,
    );
    this.taskService = new DataCubeTaskService();
    this.layoutService = new DataCubeLayoutService();
    this.alertService = new DataCubeAlertService(
      new DataCubeLogService(this.engine),
      this.layoutService,
    );
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
        this.settings.find(
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
        this.settings.find(
          (configuration) =>
            configuration.key ===
            LegendDataCubeSettingKey.DEBUGGER__ENGINE_SERVER_CLIENT__BASE_URL,
        )?.defaultValue,
    );
  }

  async initialize() {
    this.initializeState.inProgress();

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
          engine: this.remoteEngine,
          tracerService: this.application.tracerService,
        },
      );
      this.initializeState.pass();
      LegendApplicationTelemetryHelper.logEvent_ApplicationInitializationSucceeded(
        this.application.telemetryService,
        this.application,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.application.logService.error(
        LogEvent.create(APPLICATION_EVENT.APPLICATION_LOAD__FAILURE),
        `Can't initialize Legend DataCube`,
        error,
      );
      this.initializeState.fail();
    }
  }
}
