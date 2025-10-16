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
  type LegendApplicationPlugin,
  ApplicationStore,
  DEFAULT_TAB_SIZE,
  LegendApplicationConfig,
  LegendApplicationPluginManager,
} from '@finos/legend-application';
import { TEST__getApplicationVersionData } from '@finos/legend-application/test';
import {
  type GraphManagerPluginManager,
  type PureProtocolProcessorPlugin,
  type PureGraphManagerPlugin,
  type PureGraphPlugin,
  type V1_DataProduct,
  type V1_EntitlementsDataProductDetails,
  V1_PureGraphManager,
  V1_RemoteEngine,
} from '@finos/legend-graph';
import { DataProductViewerState } from '../../stores/DataProduct/DataProductViewerState.js';
import {
  ENGINE_TEST_SUPPORT__grammarToJSON_model,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import {
  LakehouseContractServerClient,
  LakehouseIngestServerClient,
  LakehousePlatformServerClient,
} from '@finos/legend-server-lakehouse';
import { jest } from '@jest/globals';
import { DataProductDataAccessState } from '../../stores/DataProduct/DataProductDataAccessState.js';
import { guaranteeType } from '@finos/legend-shared';
import { Core_DataProductDataAccess_LegendApplicationPlugin } from '../Core_DataProductDataAccess_LegendApplicationPlugin.js';
import { DataProductConfig } from '../../stores/DataProduct/DataProductConfig.js';
import type { ProjectGAVCoordinates } from '@finos/legend-storage';
import { DepotServerClient } from '@finos/legend-server-depot';
import { createSpy } from '@finos/legend-shared/test';

export class TEST__LegendApplicationPluginManager
  extends LegendApplicationPluginManager<LegendApplicationPlugin>
  implements GraphManagerPluginManager
{
  private pureProtocolProcessorPlugins: PureProtocolProcessorPlugin[] = [];
  private pureGraphManagerPlugins: PureGraphManagerPlugin[] = [];
  private pureGraphPlugins: PureGraphPlugin[] = [];

  private constructor() {
    super();
  }

  static create(): TEST__LegendApplicationPluginManager {
    return new TEST__LegendApplicationPluginManager();
  }

  registerPureProtocolProcessorPlugin(
    plugin: PureProtocolProcessorPlugin,
  ): void {
    this.pureProtocolProcessorPlugins.push(plugin);
  }

  registerPureGraphManagerPlugin(plugin: PureGraphManagerPlugin): void {
    this.pureGraphManagerPlugins.push(plugin);
  }

  registerPureGraphPlugin(plugin: PureGraphPlugin): void {
    this.pureGraphPlugins.push(plugin);
  }

  getPureGraphManagerPlugins(): PureGraphManagerPlugin[] {
    return [...this.pureGraphManagerPlugins];
  }

  getPureProtocolProcessorPlugins(): PureProtocolProcessorPlugin[] {
    return [...this.pureProtocolProcessorPlugins];
  }

  getPureGraphPlugins(): PureGraphPlugin[] {
    return [...this.pureGraphPlugins];
  }
}

class TEST__LegendApplicationConfig extends LegendApplicationConfig {
  override getDefaultApplicationStorageKey(): string {
    return 'test';
  }
}

export const TEST__getGenericApplicationConfig = (
  extraConfigData = {},
): LegendApplicationConfig => {
  const config = new TEST__LegendApplicationConfig({
    configData: {
      env: 'TEST',
      appName: 'TEST',
      ...extraConfigData,
    },
    versionData: TEST__getApplicationVersionData(),
    baseAddress: '/',
  });
  return config;
};

export const TEST__getDataProductViewerState = async (
  dataProduct: V1_DataProduct,
  projectGAVCoordinates?: ProjectGAVCoordinates,
): Promise<DataProductViewerState> => {
  const pluginManager = TEST__LegendApplicationPluginManager.create();
  const MOCK__applicationStore = new ApplicationStore(
    TEST__getGenericApplicationConfig(),
    pluginManager,
  );
  const remoteEngine = new V1_RemoteEngine(
    {
      baseUrl: 'http://test-engine-server-client-url',
    },
    MOCK__applicationStore.logService,
  );
  const engineServerClient = remoteEngine.getEngineServerClient();
  const depotServerClient = new DepotServerClient({
    serverUrl: 'http://testDepotServerClientUrl',
  });
  const graphManagerState = TEST__getTestGraphManagerState(
    guaranteeType(
      MOCK__applicationStore.pluginManager,
      TEST__LegendApplicationPluginManager,
    ),
  );

  createSpy(engineServerClient, 'grammarToJSON_model').mockImplementation(
    async (code) => {
      return ENGINE_TEST_SUPPORT__grammarToJSON_model(code);
    },
  );

  const graphManager = guaranteeType(
    graphManagerState.graphManager,
    V1_PureGraphManager,
    'GraphManager must be a V1_PureGraphManager',
  );
  await graphManager.initialize(
    {
      env: 'test',
      tabSize: DEFAULT_TAB_SIZE,
      clientConfig: {
        baseUrl: 'http://test-engine-server-client-url',
      },
    },
    {
      engine: remoteEngine,
    },
  );
  await graphManagerState.initializeSystem();

  return new DataProductViewerState(
    dataProduct,
    MOCK__applicationStore,
    engineServerClient,
    depotServerClient,
    graphManagerState,
    DataProductConfig.serialization.fromJson({
      publicStereotype: {
        profile: 'test::profile::EnterpriseDataProduct',
        stereotype: 'enterprise',
      },
    }),
    undefined,
    projectGAVCoordinates,
    {
      viewDataProductSource: jest.fn(),
    },
  );
};

export const TEST__getDataProductDataAccessState = (
  dataProductViewerState: DataProductViewerState,
  entitlementsDataProductDetails: V1_EntitlementsDataProductDetails,
): DataProductDataAccessState => {
  const lakehouseContractServerClient = new LakehouseContractServerClient({
    baseUrl: 'http://test-contract-server-client',
  });
  const lakehousePlatformServerClient = new LakehousePlatformServerClient(
    'http://test-platform-server-client',
  );
  const lakehouseIngestServerClient = new LakehouseIngestServerClient(
    undefined,
  );

  return new DataProductDataAccessState(
    entitlementsDataProductDetails,
    dataProductViewerState,
    lakehouseContractServerClient,
    lakehousePlatformServerClient,
    lakehouseIngestServerClient,
    [new Core_DataProductDataAccess_LegendApplicationPlugin()],
    {
      getContractTaskUrl: jest.fn(() => ''),
      getDataProductUrl: jest.fn(() => ''),
    },
  );
};
