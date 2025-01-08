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

import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm';
import duckdb_wasm_next from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm';

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
// See https://duckdb.org/docs/sql/data_types/overview
const getType = (type: string) => {
  const typeLower = type.toLowerCase();
  switch (typeLower) {
    case 'bigint':
    case 'int8':
    case 'long':
      return 'bigint';

    case 'double':
    case 'float8':
    case 'numeric':
    case 'decimal':
    case 'decimal(s, p)':
    case 'real':
    case 'float4':
    case 'float':
    case 'float32':
    case 'float64':
      return 'number';

    case 'hugeint':
    case 'integer':
    case 'smallint':
    case 'tinyint':
    case 'ubigint':
    case 'uinteger':
    case 'usmallint':
    case 'utinyint':
    case 'smallint':
    case 'tinyint':
    case 'ubigint':
    case 'uinteger':
    case 'usmallint':
    case 'utinyint':
    case 'int4':
    case 'int':
    case 'signed':
    case 'int2':
    case 'short':
    case 'int1':
    case 'int64':
    case 'int32':
      return 'integer';

    case 'boolean':
    case 'bool':
    case 'logical':
      return 'boolean';

    case 'date':
    case 'interval': // date or time delta
    case 'time':
    case 'timestamp':
    case 'timestamp with time zone':
    case 'datetime':
    case 'timestamptz':
      return 'date';

    case 'uuid':
    case 'varchar':
    case 'char':
    case 'bpchar':
    case 'text':
    case 'string':
    case 'utf8': // this type is unlisted in the `types`, but is returned by the db as `column_type`...
      return 'string';
    default:
      return 'other';
  }
};

export class LegendDataCubeBaseStore {
  readonly application: LegendDataCubeApplicationStore;
  readonly pluginManager: LegendDataCubePluginManager;
  readonly depotServerClient: DepotServerClient;
  readonly graphManager: V1_PureGraphManager;
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

    this.engineServerClient = new V1_EngineServerClient({
      baseUrl: this.getEngineServerBaseUrlSettingValue(),
      queryBaseUrl: this.application.config.engineQueryServerUrl,
      enableCompression: this.getEngineEnableCompressionSettingValue(),
    });
    this.engineServerClient.setTracerService(application.tracerService);

    this.engine = new LegendDataCubeDataCubeEngine(
      this.application,
      this.depotServerClient,
      this.engineServerClient,
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

    const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
      mvp: {
        mainModule: duckdb_wasm,
        mainWorker: new URL(
          '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js',
          import.meta.url,
        ).toString(),
      },
      eh: {
        mainModule: duckdb_wasm_next,
        mainWorker: new URL(
          '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js',
          import.meta.url,
        ).toString(),
      },
    };
    // Select a bundle based on browser checks
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
    // Instantiate the asynchronus version of DuckDB-wasm
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    const conn = await db.connect();
    // const a = await conn.query(`SELECT * FROM generate_series(0, 100) t(v)`);
    // console.log(a.toArray().map((row) => row.toJSON()));

    // Execute a query and get a RecordBatchStreamReader
    const result = await conn.query(
      `SELECT * FROM generate_series(1, 10) t(v)`,
    );

    // console.log(result.tableToJSON());
    console.table(result.toString());

    // // Iterate over the result chunks
    // for await (const batch of reader) {
    //   const values = batch.toArray().map((row) => row.v);
    //   console.log(values);
    // }

    const schema = result.schema.fields.map(({ name, type }) => ({
      name,
      type: getType(type),
      databaseType: type,
    }));

    console.log('schema', {
      schema,
      // rows: result.toArray().map((row) => row.toJSON()),
      // rows: result.toArray().map((r) => Object.fromEntries(r)),
    });

    await conn.close();
    await db.terminate();
    worker.terminate();

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
      this.initializeState.pass();
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
