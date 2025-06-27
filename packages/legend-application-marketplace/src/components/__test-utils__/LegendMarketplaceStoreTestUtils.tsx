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
import { jest } from '@jest/globals';
import {
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import { AuthProvider } from 'react-oidc-context';
import { type IngestDeploymentServerConfig } from '@finos/legend-server-lakehouse';
import {
  type V1_AWSSnowflakeIngestEnvironment,
  type V1_SandboxDataProductDeploymentResponse,
  CORE_PURE_PATH,
} from '@finos/legend-graph';

jest.mock('@finos/legend-graph', () => {
  const actual = jest.requireActual('@finos/legend-graph') as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    getCurrentUserIDFromEngineServer: jest.fn(() =>
      Promise.resolve('test-user-id'),
    ),
  };
});

jest.mock('../../pages/Lakehouse/MarketplaceLakehouseStoreProvider.js', () => {
  const actual = jest.requireActual(
    '../../pages/Lakehouse/MarketplaceLakehouseStoreProvider.js',
  ) as Record<string, unknown>;
  return {
    ...actual,
    useMarketplaceLakehouseStore: jest.fn(),
    MarketplaceLakehouseStoreProvider: ({
      children,
    }: {
      children: React.ReactNode;
    }) => children,
  };
});

import { MarketplaceLakehouseStore } from '../../stores/lakehouse/MarketplaceLakehouseStore.js';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import {
  type LegendMarketplaceApplicationStore,
  LegendMarketplaceBaseStore,
} from '../../stores/LegendMarketplaceBaseStore.js';
import { useMarketplaceLakehouseStore } from '../../pages/Lakehouse/MarketplaceLakehouseStoreProvider.js';
import { LEGEND_MARKETPLACE_TEST_ID } from '../../__lib__/LegendMarketplaceTesting.js';
import { LegendMarketplacePluginManager } from '../../application/LegendMarketplacePluginManager.js';
import { Core_LegendMarketplaceApplicationPlugin } from '../../application/extensions/Core_LegendMarketplaceApplicationPlugin.js';
import { TEST__getTestLegendMarketplaceApplicationConfig } from '../../application/__test-utils__/LegendMarketplaceApplicationTestUtils.js';
import { LegendMarketplaceFrameworkProvider } from '../../application/LegendMarketplaceFrameworkProvider.js';
import searchResults from './TEST_DATA__SearchResults.json' with { type: 'json' };
import { LegendMarketplaceWebApplicationRouter } from '../../application/LegendMarketplaceWebApplication.js';

export const TEST__provideMockedLegendMarketplaceBaseStore =
  async (customization?: {
    mock?: LegendMarketplaceBaseStore;
    applicationStore?: LegendMarketplaceApplicationStore;
    pluginManager?: LegendMarketplacePluginManager;
    extraPlugins?: AbstractPlugin[];
    extraPresets?: AbstractPreset[];
  }): Promise<LegendMarketplaceBaseStore> => {
    const pluginManager =
      customization?.pluginManager ?? LegendMarketplacePluginManager.create();
    pluginManager
      .usePlugins([
        new Core_LegendMarketplaceApplicationPlugin(),
        ...(customization?.extraPlugins ?? []),
      ])
      .usePresets([...(customization?.extraPresets ?? [])])
      .install();
    const applicationStore =
      customization?.applicationStore ??
      new ApplicationStore(
        TEST__getTestLegendMarketplaceApplicationConfig(),
        pluginManager,
      );
    const value =
      customization?.mock ?? new LegendMarketplaceBaseStore(applicationStore);
    const MOCK__LegendMarketplaceBaseStoreProvider = require('../../application/LegendMarketplaceFrameworkProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
    MOCK__LegendMarketplaceBaseStoreProvider.useLegendMarketplaceBaseStore =
      createMock();
    MOCK__LegendMarketplaceBaseStoreProvider.useLegendMarketplaceBaseStore.mockReturnValue(
      value,
    );
    return value;
  };

export const TEST__setUpMarketplace = async (
  MOCK__store: LegendMarketplaceBaseStore,
  route?: string,
): Promise<{
  renderResult: RenderResult;
}> => {
  createSpy(
    MOCK__store.marketplaceServerClient,
    'semanticSearch',
  ).mockResolvedValue(searchResults);

  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__store.applicationStore}>
      <TEST__BrowserEnvironmentProvider initialEntries={[route ?? '/']}>
        <LegendMarketplaceFrameworkProvider>
          <LegendMarketplaceWebApplicationRouter />
        </LegendMarketplaceFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );
  await waitFor(() =>
    renderResult.getByTestId(LEGEND_MARKETPLACE_TEST_ID.HEADER),
  );

  return {
    renderResult,
  };
};

const mockSDLCDataProductSummaries = [
  {
    groupId: 'com.example',
    artifactId: 'test-sdlc-data-product',
    versionId: '1.0.0',
    path: 'test::dataproduct::TestDataProduct',
    classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
  },
  {
    groupId: 'com.example',
    artifactId: 'test-sdlc-data-product',
    versionId: 'master-SNAPSHOT',
    path: 'test::dataproduct::TestDataProduct',
    classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
  },
  {
    groupId: 'com.example',
    artifactId: 'another-sdlc-data-product',
    versionId: '2.0.0',
    path: 'test::dataproduct::AnotherDataProduct',
    classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
  },
];

const mockSDLCDataProduct = {
  _type: 'dataProduct',
  name: 'TestDataProduct',
  package: 'test::dataproduct',
  title: 'Test Data Product',
  description: 'A test data product for testing purposes',
  accessPointGroups: [
    {
      id: 'testSDLCAccessPointGroup',
      description: 'A test access point group',
      accessPoints: [
        {
          _type: 'lakehouseAccessPoint',
          id: 'testSDLCAccessPoint',
          targetEnvironment: 'Snowflake',
          reproducible: false,
          func: {
            _type: 'lambda',
            parameters: [],
            body: [
              {
                _type: 'classInstance',
                type: 'I',
                value: {
                  metadata: false,
                  path: ['my::sandboxIngestDefinition', 'TESTTABLE'],
                },
              },
            ],
          },
        },
      ],
    },
  ],
  icon: undefined,
  imageUrl: undefined,
};

const mockSDLCDataProductWithoutTitle = {
  _type: 'dataProduct',
  name: 'AnotherDataProduct',
  package: 'test::dataproduct',
  title: undefined,
  description: undefined,
  accessPointGroups: [],
  icon: undefined,
  imageUrl: undefined,
};

const mockDevIngestEnvironmentSummaryResponse: PlainObject<IngestDeploymentServerConfig> =
  {
    ingestEnvironmentUrn: 'test-dev-urn',
    environmentClassification: 'dev',
    ingestServerUrl: 'https://test-dev-ingest-server.com',
  };

const mockProdParallelIngestEnvironmentSummaryResponse: PlainObject<IngestDeploymentServerConfig> =
  {
    ingestEnvironmentUrn: 'test-prod-parallel-urn',
    environmentClassification: 'prod-parallel',
    ingestServerUrl: 'https://test-prod-parallel-ingest-server.com',
  };

const mockProdIngestEnvironmentSummaryResponse: PlainObject<IngestDeploymentServerConfig> =
  {
    ingestEnvironmentUrn: 'test-prod-urn',
    environmentClassification: 'prod',
    ingestServerUrl: 'https://test-prod-ingest-server.com',
  };

const mockDevSandboxDataProductResponse: PlainObject<V1_SandboxDataProductDeploymentResponse> =
  {
    deployedDataProducts: [
      {
        definition:
          `###Lakehouse\n` +
          `Ingest my::sandboxIngestDefinition owner=AppDir(production='123', prodParallel='456')[TESTTABLE(id: Double, name: Varchar(100))\npk=[id]]\n` +
          `###DataProduct\n` +
          `DataProduct sandbox::dataproduct::SandboxDataProduct\n` +
          `{\naccessPoints: [group[testAccessPointGroup: LH(Snowflake, |#I{my::sandboxIngestDefinition.TESTTABLE}#->select(id, name))]]}`,
        artifact: {
          dataProduct: {
            title: 'Dev Sandbox Data Product',
            description: 'A dev sandbox data product',
            path: 'sandbox::dataproduct::DevSandboxDataProduct',
            deploymentId: '123',
          },
          accessPointGroups: [
            {
              id: 'testAccessPointGroup',
              accessPointImplementations: [
                {
                  id: 'testAccessPointImplementation',
                  resourceBuilder: {
                    _type: 'databaseDDL',
                    targetEnvironment: 'Snowflake',
                    reproducible: false,
                    script: 'CREATE TABLE test_table (id INT, name STRING);',
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };

const mockProdParallelSandboxDataProductResponse: PlainObject<V1_SandboxDataProductDeploymentResponse> =
  {
    deployedDataProducts: [
      {
        definition:
          `###Lakehouse\n` +
          `Ingest my::sandboxIngestDefinition owner=AppDir(production='123', prodParallel='456')[TESTTABLE(id: Double, name: Varchar(100))\npk=[id]]\n` +
          `###DataProduct\n` +
          `DataProduct sandbox::dataproduct::SandboxDataProduct\n` +
          `{\naccessPoints: [group[testAccessPointGroup: LH(Snowflake, |#I{my::sandboxIngestDefinition.TESTTABLE}#->select(id, name))]]}`,
        artifact: {
          dataProduct: {
            title: 'Prod-Parallel Sandbox Data Product',
            description: 'A prod-parallel sandbox data product',
            path: 'sandbox::dataproduct::ProdParallelSandboxDataProduct',
            deploymentId: '456',
          },
          accessPointGroups: [
            {
              id: 'testAccessPointGroup',
              accessPointImplementations: [
                {
                  id: 'testAccessPointImplementation',
                  resourceBuilder: {
                    _type: 'databaseDDL',
                    targetEnvironment: 'Snowflake',
                    reproducible: false,
                    script: 'CREATE TABLE test_table (id INT, name STRING);',
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };

const mockProdSandboxDataProductResponse: PlainObject<V1_SandboxDataProductDeploymentResponse> =
  {
    deployedDataProducts: [
      {
        definition:
          `###Lakehouse\n` +
          `Ingest my::sandboxIngestDefinition owner=AppDir(production='123', prodParallel='456')[TESTTABLE(id: Double, name: Varchar(100))\npk=[id]]\n` +
          `###DataProduct\n` +
          `DataProduct sandbox::dataproduct::SandboxDataProduct\n` +
          `{\naccessPoints: [group[testAccessPointGroup: LH(Snowflake, |#I{my::sandboxIngestDefinition.TESTTABLE}#->select(id, name))]]}`,
        artifact: {
          dataProduct: {
            title: 'Prod Sandbox Data Product',
            description: 'A prod sandbox data product',
            path: 'sandbox::dataproduct::ProdSandboxDataProduct',
            deploymentId: '789',
          },
          accessPointGroups: [
            {
              id: 'testAccessPointGroup',
              accessPointImplementations: [
                {
                  id: 'testAccessPointImplementation',
                  resourceBuilder: {
                    _type: 'databaseDDL',
                    targetEnvironment: 'Snowflake',
                    reproducible: false,
                    script: 'CREATE TABLE test_table (id INT, name STRING);',
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };

const mockDevIngestEnvironmentResponse: PlainObject<V1_AWSSnowflakeIngestEnvironment> =
  {
    _type: 'AWSSnowflake',
    urn: 'test-dev-urn',
    version: '1.0.0',
    environmentClassification: 'dev',
    producers: [],
    awsRegion: 'us-east-1',
    awsAccountId: 'test-dev-account-id',
    ingestStepFunctionsAvtivityArn:
      'arn:aws:states:us-east-1:123456789:activity:test',
    ingestStateMachineArn:
      'arn:aws:states:us-east-1:123456789:stateMachine:test',
    ingestSystemAccount: 'test-dev-system-account',
    snowflakeAccount: 'test-dev-snowflake-account',
    snowflakeHost: 'test.dev.snowflakecomputing.com',
    s3StagingBucketName: 'test-dev-staging-bucket',
    storageIntegrationName: 'test-dev-storage-integration',
  };

const mockProdParallelIngestEnvironmentResponse: PlainObject<V1_AWSSnowflakeIngestEnvironment> =
  {
    _type: 'AWSSnowflake',
    urn: 'test-prod-parallel-urn',
    version: '1.0.0',
    environmentClassification: 'prod-parallel',
    producers: [],
    awsRegion: 'us-east-1',
    awsAccountId: 'test-prod-parallel-account-id',
    ingestStepFunctionsAvtivityArn:
      'arn:aws:states:us-east-1:123456789:activity:test',
    ingestStateMachineArn:
      'arn:aws:states:us-east-1:123456789:stateMachine:test',
    ingestSystemAccount: 'test-prod-parallel-system-account',
    snowflakeAccount: 'test-prod-parallel-snowflake-account',
    snowflakeHost: 'test.prod-parallel.snowflakecomputing.com',
    s3StagingBucketName: 'test-prod-parallel-staging-bucket',
    storageIntegrationName: 'test-prod-parallel-storage-integration',
  };

const mocProdIngestEnvironmentResponse: PlainObject<V1_AWSSnowflakeIngestEnvironment> =
  {
    _type: 'AWSSnowflake',
    urn: 'test-prod-urn',
    version: '1.0.0',
    environmentClassification: 'prod',
    producers: [],
    awsRegion: 'us-east-1',
    awsAccountId: 'test-prod-account-id',
    ingestStepFunctionsAvtivityArn:
      'arn:aws:states:us-east-1:123456789:activity:test',
    ingestStateMachineArn:
      'arn:aws:states:us-east-1:123456789:stateMachine:test',
    ingestSystemAccount: 'test-prod-system-account',
    snowflakeAccount: 'test-prod-snowflake-account',
    snowflakeHost: 'test.prod.snowflakecomputing.com',
    s3StagingBucketName: 'test-prod-staging-bucket',
    storageIntegrationName: 'test-prod-storage-integration',
  };

export const TEST__setUpMarketplaceLakehouse = async (
  MOCK__store: LegendMarketplaceBaseStore,
  route?: string,
) => {
  createSpy(
    MOCK__store.depotServerClient,
    'getEntitiesSummaryByClassifier',
  ).mockImplementation(async (classifier: string) => {
    if (classifier === CORE_PURE_PATH.DATA_PRODUCT) {
      return mockSDLCDataProductSummaries;
    }
    return [];
  });

  createSpy(
    MOCK__store.depotServerClient,
    'getVersionEntity',
  ).mockImplementation(
    async (
      groupId: string,
      artifactId: string,
      versionId: string,
      path: string,
    ) => {
      if (path === 'test::dataproduct::TestDataProduct') {
        return {
          classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
          content: mockSDLCDataProduct,
          path: 'test::dataproduct::TestDataProduct',
        };
      } else if (path === 'test::dataproduct::AnotherDataProduct') {
        return {
          classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
          content: mockSDLCDataProductWithoutTitle,
          path: 'test::dataproduct::AnotherDataProduct',
        };
      }
      return { content: mockSDLCDataProduct };
    },
  );

  createSpy(
    MOCK__store.lakehousePlatformServerClient,
    'getIngestEnvironmentSummaries',
  ).mockResolvedValue([mockDevIngestEnvironmentSummaryResponse]);
  createSpy(
    MOCK__store.lakehousePlatformServerClient,
    'findProducerServer',
  ).mockImplementation(
    async (did: number, level: string, token?: string | undefined) => {
      if (did === 123) {
        return mockDevIngestEnvironmentSummaryResponse;
      } else if (did === 456) {
        return mockProdParallelIngestEnvironmentSummaryResponse;
      } else if (did === 789) {
        return mockProdIngestEnvironmentSummaryResponse;
      }
      throw new Error(`Unable to find environment with deployment ID: ${did}`);
    },
  );
  createSpy(
    MOCK__store.lakehouseIngestServerClient,
    'getDeployedIngestDefinitions',
  ).mockImplementation(
    async (ingestServerUrl: string | undefined, token: string | undefined) => {
      if (ingestServerUrl === 'https://test-dev-ingest-server.com') {
        return mockDevSandboxDataProductResponse;
      } else if (
        ingestServerUrl === 'https://test-prod-parallel-ingest-server.com'
      ) {
        return mockProdParallelSandboxDataProductResponse;
      } else if (ingestServerUrl === 'https://test-prod-ingest-server.com') {
        return mockProdSandboxDataProductResponse;
      }

      throw new Error(
        `Unable to find deployed definitions for URL: ${ingestServerUrl}`,
      );
    },
  );
  createSpy(
    MOCK__store.lakehouseIngestServerClient,
    'getIngestEnvironment',
  ).mockImplementation(
    async (ingestServerUrl: string | undefined, token: string | undefined) => {
      if (ingestServerUrl === 'https://test-dev-ingest-server.com') {
        return mockDevIngestEnvironmentResponse;
      } else if (
        ingestServerUrl === 'https://test-prod-parallel-ingest-server.com'
      ) {
        return mockProdParallelIngestEnvironmentResponse;
      } else if (ingestServerUrl === 'https://test-prod-ingest-server.com') {
        return mocProdIngestEnvironmentResponse;
      }

      throw new Error(
        `Unable to find deployed definitions for URL: ${ingestServerUrl}`,
      );
    },
  );

  const MOCK__lakehouseStore = new MarketplaceLakehouseStore(
    MOCK__store,
    MOCK__store.lakehouseContractServerClient,
    MOCK__store.lakehousePlatformServerClient,
    MOCK__store.lakehouseIngestServerClient,
    MOCK__store.depotServerClient,
  );

  // const mockAuth = {
  //   isLoading: false,
  //   isAuthenticated: true,
  //   user: {
  //     profile: {
  //       name: 'Test User',
  //       sub: 'test-user-id',
  //       email: 'test@example.com',
  //     },
  //     access_token: 'mock-access-token',
  //   },
  //   signinRedirect: jest.fn(),
  //   signoutRedirect: jest.fn(),
  //   removeUser: jest.fn(),
  //   error: null,
  //   activeNavigator: 'window',
  //   settings: {},
  // } as any;

  (useMarketplaceLakehouseStore as jest.Mock).mockReturnValue(
    MOCK__lakehouseStore,
  );

  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__store.applicationStore}>
      <AuthProvider>
        <TEST__BrowserEnvironmentProvider
          initialEntries={['/lakehouse']}
          baseUrl="/lakehouse"
        >
          <LegendMarketplaceFrameworkProvider>
            <LegendMarketplaceWebApplicationRouter />
          </LegendMarketplaceFrameworkProvider>
        </TEST__BrowserEnvironmentProvider>
      </AuthProvider>
    </ApplicationStoreProvider>,
  );

  await waitFor(() =>
    renderResult.getByTestId(LEGEND_MARKETPLACE_TEST_ID.HEADER),
  );

  return {
    renderResult,
    MOCK__store,
    MOCK__lakehouseStore,
  };
};
