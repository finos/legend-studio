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
  type GenericLegendApplicationStore,
  type LegendApplicationPlugin,
  ApplicationStore,
  DEFAULT_TAB_SIZE,
  LegendApplicationConfig,
  LegendApplicationPluginManager,
} from '@finos/legend-application';
import { TEST__getApplicationVersionData } from '@finos/legend-application/test';
import { type PlainObject, guaranteeType } from '@finos/legend-shared';
import {
  type GraphData,
  type GraphManagerPluginManager,
  type PureGraphManagerPlugin,
  type PureGraphPlugin,
  type PureProtocolProcessorPlugin,
  V1_PureGraphManager,
  V1_RemoteEngine,
} from '@finos/legend-graph';
import { TEST__getTestGraphManagerState } from '@finos/legend-graph/test';
import {
  type V1_DataSpaceAnalysisResult,
  DSL_DataSpace_GraphManagerPreset,
  DSL_DataSpace_getGraphManagerExtension,
} from '../../graph-manager/index.js';
import { DataSpaceViewerState } from '../../stores/DataSpaceViewerState.js';

class TEST__LegendApplicationPluginManager
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

const TEST__getGenericApplicationConfig = (): LegendApplicationConfig =>
  new TEST__LegendApplicationConfig({
    configData: {
      env: 'TEST',
      appName: 'TEST',
    },
    versionData: TEST__getApplicationVersionData(),
    baseAddress: '/',
  });

export const TEST_DATA_SPACE_GROUP_ID = 'test.group';
export const TEST_DATA_SPACE_ARTIFACT_ID = 'test-artifact';
export const TEST_DATA_SPACE_VERSION_ID = '0.0.0';

export type TEST__DataSpaceViewerActionOverrides = {
  viewDataProduct?:
    | ((
        groupId: string,
        artifactId: string,
        versionId: string,
        dataProductPath: string,
      ) => void)
    | undefined;
};

/**
 * Build a real `DataSpaceViewerState` from a V1 analytics-result JSON payload.
 *
 * Mirrors the shape used across the app (`buildDataSpaceAnalytics` from a
 * plain V1 JSON), so tests can drive the viewer with realistic analytics data
 * loaded from fixture files.
 */
export const TEST__getDataSpaceViewerState = async (
  V1_analysisResult: PlainObject<V1_DataSpaceAnalysisResult>,
  overrides?: TEST__DataSpaceViewerActionOverrides,
): Promise<{
  viewerState: DataSpaceViewerState;
  applicationStore: GenericLegendApplicationStore;
}> => {
  const pluginManager = TEST__LegendApplicationPluginManager.create();
  pluginManager.usePresets([new DSL_DataSpace_GraphManagerPreset()]).install();

  const applicationStore = new ApplicationStore(
    TEST__getGenericApplicationConfig(),
    pluginManager,
  );

  const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
  const graphManager = guaranteeType(
    graphManagerState.graphManager,
    V1_PureGraphManager,
    'GraphManager must be a V1_PureGraphManager',
  );
  const remoteEngine = new V1_RemoteEngine(
    { baseUrl: 'http://test-engine-server-client-url' },
    applicationStore.logService,
  );
  await graphManager.initialize(
    {
      env: 'test',
      tabSize: DEFAULT_TAB_SIZE,
      clientConfig: {
        baseUrl: 'http://test-engine-server-client-url',
      },
    },
    { engine: remoteEngine },
  );
  await graphManagerState.initializeSystem();

  const graphManagerExtension =
    DSL_DataSpace_getGraphManagerExtension(graphManager);
  const dataSpaceAnalysisResult =
    await graphManagerExtension.buildDataSpaceAnalytics(
      V1_analysisResult,
      pluginManager.getPureProtocolProcessorPlugins(),
    );

  const viewerState = new DataSpaceViewerState(
    applicationStore,
    graphManagerState,
    TEST_DATA_SPACE_GROUP_ID,
    TEST_DATA_SPACE_ARTIFACT_ID,
    TEST_DATA_SPACE_VERSION_ID,
    dataSpaceAnalysisResult,
    {
      retrieveGraphData: (): GraphData => ({}) as unknown as GraphData,
      queryDataSpace: () => undefined,
      viewProject: () => undefined,
      viewSDLCProject: async () => undefined,
      queryClass: () => undefined,
      openServiceQuery: () => undefined,
      viewDataProduct: overrides?.viewDataProduct,
    },
  );
  return { viewerState, applicationStore };
};
