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

import { type RenderResult, render, waitFor } from '@testing-library/react';
import {
  type AbstractPlugin,
  type AbstractPreset,
  type PlainObject,
} from '@finos/legend-shared';
import { createMock, createSpy } from '@finos/legend-shared/test';
import {
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import { LegendDataCubePluginManager } from '../../application/LegendDataCubePluginManager.js';
import { Core_LegendDataCubeApplicationPlugin } from '../../application/Core_LegendDataCubeApplicationPlugin.js';
import { TEST__getTestLegendDataCubeApplicationConfig } from '../../application/__test-utils__/LegendDataCubeApplicationTestUtils.js';
import {
  type LegendDataCubeBuilderState,
  LegendDataCubeBuilderStore,
} from '../../stores/builder/LegendDataCubeBuilderStore.js';
import {
  type LegendDataCubeApplicationStore,
  LegendDataCubeBaseStore,
} from '../../stores/LegendDataCubeBaseStore.js';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import { LegendDataCubeFrameworkProvider } from '../LegendDataCubeFrameworkProvider.js';
import { Route, Routes } from '@finos/legend-application/browser';
import { LEGEND_DATA_CUBE_ROUTE_PATTERN } from '../../__lib__/LegendDataCubeNavigation.js';
import { LegendDataCubeBuilder } from '../builder/LegendDataCubeBuilder.js';
import { LEGEND_DATACUBE_TEST_ID } from '@finos/legend-data-cube';
import { Core_LegendDataCube_LegendApplicationPlugin } from '../../application/Core_LegendDataCube_LegendApplicationPlugin.js';
import {
  V1_EngineServerClient,
  type PersistentDataCube,
  type V1_LambdaReturnTypeInput,
  type V1_Query,
  type V1_RawLambda,
  type V1_ValueSpecification,
  V1_AppDirLevel,
  V1_entitiesToPureModelContextData,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_ExecuteInput,
  V1_PureGraphManager,
  V1_PureModelContextData,
  V1_serializePureModelContext,
  type V1_EntitlementsDataProductDetails,
  type V1_EntitlementsDataProductDetailsResponse,
} from '@finos/legend-graph';
import { DSL_DataSpace_GraphManagerPreset } from '@finos/legend-extension-dsl-data-space/graph';
import {
  ENGINE_TEST_SUPPORT__execute,
  ENGINE_TEST_SUPPORT__getLambdaRelationType,
  ENGINE_TEST_SUPPORT__getLambdaReturnType,
  ENGINE_TEST_SUPPORT__grammarToJSON_lambda,
  ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification,
  ENGINE_TEST_SUPPORT__JSONToGrammar_valueSpecification,
  ENGINE_TEST_SUPPORT__transformTdsToRelation_lambda,
} from '@finos/legend-graph/test';
import type { Entity } from '@finos/legend-storage';
import { LegendDataCubeDataCubeEngine } from '../../stores/LegendDataCubeDataCubeEngine.js';
import { LegendQueryDataCubeSourceBuilder_DataCubeApplicationPlugin } from '../builder/source/LegendQueryDataCubeSourceBuilder_DataCubeApplicationPlugin.js';
import { DepotServerClient } from '@finos/legend-server-depot';
import {
  LakehouseContractServerClient,
  LakehouseIngestServerClient,
} from '@finos/legend-server-lakehouse';

export const DEFAULT_MOCK_ADHOC_DATA_PRODUCT: PlainObject = {
  dataProducts: [
    {
      id: 'test-id',
      deploymentId: 22222,
      description: 'test description',
      origin: {
        type: 'AdHocDeployment',
        definition: 'test-definition',
      },
      lakehouseEnvironment: {
        producerEnvironmentName: 'DEVELOPMENT',
        type: 'DEVELOPMENT',
      },
      dataProduct: {
        name: 'MOCK_ADHOC_DATAPRODUCT',
        accessPoints: [
          {
            name: 'TEST_VIEW',
            groups: ['GROUP1'],
          },
        ],
        accessPointGroupStereotypeMappings: [],
        owner: {
          appDirId: 22222,
          level: V1_AppDirLevel.DEPLOYMENT,
        },
      },
    },
  ],
};

export const DEFAULT_MOCK_PMCD: PlainObject<V1_PureModelContextData> = {
  _type: 'pureModelContextData',
  elements: [
    {
      _type: 'packageableElement',
      name: 'LakehouseConsumer',
      package: 'adhoc::test',
    },
  ],
};

export const TEST__provideMockedLegendDataCubeEngine = async (customization?: {
  mock?: LegendDataCubeDataCubeEngine | undefined;
  applicationStore?: LegendDataCubeApplicationStore | undefined;
  pluginManager?: LegendDataCubePluginManager | undefined;
  extraPlugins?: AbstractPlugin[] | undefined;
  extraPresets?: AbstractPreset[] | undefined;
  depotServerClient?: DepotServerClient | undefined;
  enginerServerClient?: V1_EngineServerClient | undefined;
  lakehouseContractServerClient?: LakehouseContractServerClient | undefined;
  ingestServer?: LakehouseIngestServerClient | undefined;
  graphManager?: V1_PureGraphManager | undefined;
  mockPMCD?: PlainObject<V1_PureModelContextData>;
  mockEntitlementsAdHocDataProduct?: PlainObject<V1_EntitlementsDataProductDetailsResponse>;
}): Promise<LegendDataCubeDataCubeEngine> => {
  //create application store
  const pluginManager =
    customization?.pluginManager ?? LegendDataCubePluginManager.create();
  pluginManager
    .usePlugins([
      new Core_LegendDataCube_LegendApplicationPlugin(),
      new Core_LegendDataCubeApplicationPlugin(),
      new LegendQueryDataCubeSourceBuilder_DataCubeApplicationPlugin(),
      ...(customization?.extraPlugins ?? []),
    ])
    .usePresets([
      new DSL_DataSpace_GraphManagerPreset(),
      ...(customization?.extraPresets ?? []),
    ])
    .install();
  const applicationStore =
    customization?.applicationStore ??
    new ApplicationStore(
      TEST__getTestLegendDataCubeApplicationConfig(),
      pluginManager,
    );
  //Server Clients
  const depotServerClient =
    customization?.depotServerClient ??
    new DepotServerClient({
      serverUrl: applicationStore.config.depotServerUrl,
    });
  const engineServerClient =
    customization?.enginerServerClient ??
    new V1_EngineServerClient({
      baseUrl: applicationStore.config.engineServerUrl,
    });

  const lakehouseIngestServerClient =
    customization?.ingestServer ?? new LakehouseIngestServerClient(undefined);
  const lakehouseContractServerClient =
    customization?.lakehouseContractServerClient ??
    new LakehouseContractServerClient({
      baseUrl: applicationStore.config.lakehouseContractUrl,
    });

  if (customization?.mockPMCD) {
    createSpy(depotServerClient, 'getPureModelContextData').mockResolvedValue(
      customization.mockPMCD,
    );
  }

  if (customization?.mockEntitlementsAdHocDataProduct) {
    createSpy(
      lakehouseContractServerClient,
      'getDataProduct',
    ).mockResolvedValue(customization.mockEntitlementsAdHocDataProduct);
  }
  createSpy(
    lakehouseIngestServerClient,
    'getIngestDefinitionGrammar',
  ).mockResolvedValue('test-ingest-definition-grammar');

  const graphManager =
    customization?.graphManager ??
    new V1_PureGraphManager(
      applicationStore.pluginManager,
      applicationStore.logService,
    );
  const value =
    customization?.mock ??
    new LegendDataCubeDataCubeEngine(
      applicationStore,
      depotServerClient,
      engineServerClient,
      lakehouseContractServerClient,
      lakehouseIngestServerClient,
      graphManager,
    );
  if ('initialize' in value && typeof value.initialize === 'function') {
    await value.initialize();
  }
  return value;
};

export const mockAdhocDataProduct: V1_EntitlementsDataProductDetails = {
  id: 'test-id',
  deploymentId: 1,
  title: 'test-title',
  description: 'test description',
  origin: {
    definition: 'test definition',
    type: 'AdHocDeployment',
  },
  lakehouseEnvironment: {
    producerEnvironmentName: 'test-producer-environment',
    type: V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
  },
  dataProduct: {
    name: 'test-dataproduct-name',
    accessPoints: [
      {
        name: 'test-accesspoint-name',
        groups: ['test-group'],
      },
      {
        name: 'test-accesspoint-name-1',
        groups: ['test-group'],
      },
    ],
    accessPointGroupStereotypeMappings: [
      {
        accessPointGroup: 'MIGRATION',
        stereotypes: [],
      },
    ],
    owner: {
      appDirId: 123456,
      level: V1_AppDirLevel.DEPLOYMENT,
    },
  },
};

export const mockLakehouseConsumerAdHocDataProduct = {
  _type: 'lakehouseConsumer',
  warehouse: 'TEST_WAREHOUSE',
  environment: 'dev-testEnv',
  paths: ['dataProduct::test_DataProduct', 'test_dataset'],
  origin: {
    _type: 'AdHocDeployment',
  },
  deploymentId: 123456,
};

export const mockLakehouseProducerAdHocDataProduct = {
  _type: 'lakehouseProducer',
  ingestDefinitionUrn: 'test_ingest-definition-urn',
  warehouse: 'TEST_WAREHOUSE',
  ingestServerUrl: 'https://test-prod-ingest-server.com',
  paths: ['dataProduct::test_Data-Product', 'test_data-set'],
};

export const columns = [
  {
    name: 'testName0',
    type: 'testName0-test-type',
  },
  {
    name: 'testName1',
    type: 'testName1-test-type',
  },
  {
    name: 'testName2',
    type: 'testName2-test-type',
  },
  {
    name: 'testName3',
    type: 'testName3-test-type',
  },
  {
    name: 'testName4',
    type: 'testName4-test-type',
  },
  {
    name: 'testName5',
    type: 'testName5-test-type',
  },
];

export const mockAdHocDataProductPMCD = {
  _type: 'data',
  elements: [
    {
      _type: 'ingestDefinition',
      package: 'test',
      name: 'IngestDefinition',
      owner: {
        _type: 'ownerTestType',
        production: {
          appDirId: 22222,
          level: 'DEPLOYMENT',
        },
      },
    },
    {
      _type: 'dataProduct',
      package: 'test',
      name: 'Mock_AdHoc_DataProduct',
      title: 'Mock Ad-Hoc Data Product',
      description: 'test description',
      accessPointGroups: [
        {
          _type: 'defaultAccessPointGroup',
          id: 'GROUP1',
          description: 'Test ad-hoc access point group',
          accessPoints: [
            {
              _type: 'lakehouseAccessPoint',
              id: 'test_view',
              func: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'classInstance',
                    type: 'I',
                    value: {
                      metadata: false,
                      path: ['test', 'IngestDefinition'],
                    },
                  },
                ],
                parameters: [],
              },
            },
          ],
        },
      ],
    },
    {
      package: '__internal__',
      name: 'SectionIndex',
      sections: [
        {
          parserName: 'Pure',
          elements: [],
          imports: [],
          _type: 'importAware',
        },
        {
          parserName: 'Lakehouse',
          elements: ['migration_test::test:Product'],
          _type: 'default',
        },
        {
          parserName: 'DataProduct',
          elements: ['lakeMigration::dataProduct::test:Product'],
          imports: [],
          _type: 'importAware',
        },
      ],
      _type: 'sectionIndex',
    },
  ],
};

export const TEST__provideMockedLegendDataCubeBaseStore =
  async (customization?: {
    mock?: LegendDataCubeBaseStore | undefined;
    applicationStore?: LegendDataCubeApplicationStore | undefined;
    pluginManager?: LegendDataCubePluginManager | undefined;
    extraPlugins?: AbstractPlugin[] | undefined;
    extraPresets?: AbstractPreset[] | undefined;
  }): Promise<LegendDataCubeBaseStore> => {
    const pluginManager =
      customization?.pluginManager ?? LegendDataCubePluginManager.create();
    pluginManager
      .usePlugins([
        new Core_LegendDataCube_LegendApplicationPlugin(),
        new Core_LegendDataCubeApplicationPlugin(),
        new LegendQueryDataCubeSourceBuilder_DataCubeApplicationPlugin(),
        ...(customization?.extraPlugins ?? []),
      ])
      .usePresets([
        new DSL_DataSpace_GraphManagerPreset(),
        ...(customization?.extraPresets ?? []),
      ])
      .install();
    const applicationStore =
      customization?.applicationStore ??
      new ApplicationStore(
        TEST__getTestLegendDataCubeApplicationConfig(),
        pluginManager,
      );
    const value =
      customization?.mock ?? new LegendDataCubeBaseStore(applicationStore);
    await value.initialize();
    const MOCK__LegendDataCubeBaseStoreProvider = require('../LegendDataCubeFrameworkProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
    MOCK__LegendDataCubeBaseStoreProvider.useLegendDataCubeBaseStore =
      createMock();
    MOCK__LegendDataCubeBaseStoreProvider.useLegendDataCubeBaseStore.mockReturnValue(
      value,
    );
    return value;
  };

export const TEST__provideMockedLegendDataCubeBuilderStore =
  async (customization?: {
    mock?: LegendDataCubeBuilderStore;
    mockBaseStore?: LegendDataCubeBaseStore;
    applicationStore?: LegendDataCubeApplicationStore;
    pluginManager?: LegendDataCubePluginManager;
    extraPlugins?: AbstractPlugin[];
    extraPresets?: AbstractPreset[];
  }): Promise<LegendDataCubeBuilderStore> => {
    const value =
      customization?.mock ??
      new LegendDataCubeBuilderStore(
        await TEST__provideMockedLegendDataCubeBaseStore({
          mock: customization?.mockBaseStore,
          applicationStore: customization?.applicationStore,
          pluginManager: customization?.pluginManager,
          extraPlugins: customization?.extraPlugins,
          extraPresets: customization?.extraPresets,
        }),
      );
    const MOCK__LegendDataCubeBuilderStoreProvider = require('../builder/LegendDataCubeBuilderStoreProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
    MOCK__LegendDataCubeBuilderStoreProvider.useLegendDataCubeBuilderStore =
      createMock();
    MOCK__LegendDataCubeBuilderStoreProvider.useLegendDataCubeBuilderStore.mockReturnValue(
      value,
    );
    return value;
  };

export const TEST__setUpDataCubeBuilder = async (
  MOCK__builderStore: LegendDataCubeBuilderStore,
  mockDataCube?: PersistentDataCube,
  mockQuery?: V1_Query,
  mockEntities?: PlainObject<Entity>[],
  forceUseInputModel: boolean = false,
): Promise<{
  renderResult: RenderResult;
  legendDataCubeBuilderState: LegendDataCubeBuilderState | undefined;
}> => {
  if (mockDataCube) {
    createSpy(MOCK__builderStore.graphManager, 'getDataCube').mockResolvedValue(
      mockDataCube,
    );
  }
  if (mockQuery) {
    createSpy(
      MOCK__builderStore.graphManager.engine,
      'getQuery',
    ).mockResolvedValue(mockQuery);
  }
  if (mockEntities) {
    const pmcd = new V1_PureModelContextData();
    await V1_entitiesToPureModelContextData(
      mockEntities as unknown as Entity[],
      pmcd,
      MOCK__builderStore.application.pluginManager.getPureProtocolProcessorPlugins(),
      undefined,
      undefined,
    );
    createSpy(
      MOCK__builderStore.depotServerClient,
      'getVersionEntities',
    ).mockResolvedValue(mockEntities);
    createSpy(
      MOCK__builderStore.engineServerClient,
      'lambdaReturnType',
    ).mockImplementation(
      async (input: PlainObject<V1_LambdaReturnTypeInput>) => {
        return ENGINE_TEST_SUPPORT__getLambdaReturnType(
          input.lambda as PlainObject<V1_RawLambda>,
          forceUseInputModel
            ? (input.model as PlainObject<V1_PureModelContextData>)
            : V1_serializePureModelContext(pmcd),
        );
      },
    );
    createSpy(
      MOCK__builderStore.engineServerClient,
      'lambdaRelationType',
    ).mockImplementation(
      async (input: PlainObject<V1_LambdaReturnTypeInput>) => {
        return ENGINE_TEST_SUPPORT__getLambdaRelationType(
          input.lambda as PlainObject<V1_RawLambda>,
          forceUseInputModel
            ? (input.model as PlainObject<V1_PureModelContextData>)
            : V1_serializePureModelContext(pmcd),
        );
      },
    );
    createSpy(
      MOCK__builderStore.engineServerClient,
      'transformTdsToRelation_lambda',
    ).mockImplementation(
      async (input: PlainObject<V1_LambdaReturnTypeInput>) => {
        return ENGINE_TEST_SUPPORT__transformTdsToRelation_lambda(
          input.lambda as PlainObject<V1_RawLambda>,
          forceUseInputModel
            ? (input.model as PlainObject<V1_PureModelContextData>)
            : V1_serializePureModelContext(pmcd),
        );
      },
    );
    createSpy(
      MOCK__builderStore.engineServerClient,
      'runQuery',
    ).mockImplementation(async (input: PlainObject<V1_ExecuteInput>) => {
      const executeInput = V1_ExecuteInput.serialization.fromJson(input);
      executeInput.model = forceUseInputModel ? executeInput.model : pmcd;
      return ENGINE_TEST_SUPPORT__execute(executeInput);
    });
  }
  createSpy(
    MOCK__builderStore.engineServerClient,
    'grammarToJSON_lambda',
  ).mockImplementation(async (input: string) =>
    ENGINE_TEST_SUPPORT__grammarToJSON_lambda(input),
  );
  createSpy(
    MOCK__builderStore.engineServerClient,
    'grammarToJSON_valueSpecification',
  ).mockImplementation(async (input: string) =>
    ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification(input),
  );
  createSpy(
    MOCK__builderStore.engineServerClient,
    'JSONToGrammar_valueSpecification',
  ).mockImplementation(async (input: PlainObject<V1_ValueSpecification>) =>
    ENGINE_TEST_SUPPORT__JSONToGrammar_valueSpecification(input),
  );

  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__builderStore.application}>
      <TEST__BrowserEnvironmentProvider
        initialEntries={[mockDataCube?.id ? `/${mockDataCube.id}` : '/']}
      >
        <LegendDataCubeFrameworkProvider>
          <Routes>
            <Route
              path={LEGEND_DATA_CUBE_ROUTE_PATTERN.BUILDER}
              element={<LegendDataCubeBuilder />}
            />
          </Routes>
        </LegendDataCubeFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );
  await waitFor(() =>
    renderResult.getByTestId(LEGEND_DATACUBE_TEST_ID.PLACEHOLDER),
  );

  return {
    renderResult,
    legendDataCubeBuilderState: MOCK__builderStore.builder,
  };
};
