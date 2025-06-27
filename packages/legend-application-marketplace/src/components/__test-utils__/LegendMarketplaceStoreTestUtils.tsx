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
import { type AbstractPlugin, type AbstractPreset } from '@finos/legend-shared';
import { createMock, createSpy } from '@finos/legend-shared/test';
import { jest } from '@jest/globals';
import {
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import { AuthProvider } from 'react-oidc-context';
import { CORE_PURE_PATH } from '@finos/legend-graph';
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
import {
  mockSDLCDataProductSummaries,
  mockReleaseSDLCDataProduct,
  mockSnapshotSDLCDataProduct,
  mockSDLCDataProductWithoutTitle,
  mockDevIngestEnvironmentSummaryResponse,
  mockProdParallelIngestEnvironmentSummaryResponse,
  mockProdIngestEnvironmentSummaryResponse,
  mockDevSandboxDataProductResponse,
  mockProdParallelSandboxDataProductResponse,
  mockProdSandboxDataProductResponse,
  mockDevIngestEnvironmentResponse,
  mockProdParallelIngestEnvironmentResponse,
  mocProdIngestEnvironmentResponse,
} from './TEST_DATA__LakehouseData.js';

jest.mock('@finos/legend-graph', () => {
  const actual: Record<string, unknown> = jest.requireActual(
    '@finos/legend-graph',
  );
  return {
    ...actual,
    getCurrentUserIDFromEngineServer: jest.fn(() =>
      Promise.resolve('test-user-id'),
    ),
  };
});

jest.mock('../../pages/Lakehouse/MarketplaceLakehouseStoreProvider.js', () => {
  const actual: Record<string, unknown> = jest.requireActual(
    '../../pages/Lakehouse/MarketplaceLakehouseStoreProvider.js',
  );
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
      if (path === 'test::dataproduct::TestSDLCDataProduct') {
        if (versionId === '1.0.0') {
          return {
            classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
            content: mockReleaseSDLCDataProduct,
            path: 'test::dataproduct::TestSDLCDataProduct',
          };
        } else if (versionId === 'master-SNAPSHOT') {
          return {
            classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
            content: mockSnapshotSDLCDataProduct,
            path: 'test::dataproduct::TestSDLCDataProduct',
          };
        }
        throw new Error(
          `Unable to find SDLC data product: ${groupId}:${artifactId}:${versionId}:${path}`,
        );
      } else if (path === 'test::dataproduct::AnotherSDLCDataProduct') {
        return {
          classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
          content: mockSDLCDataProductWithoutTitle,
          path: 'test::dataproduct::AnotherSDLCDataProduct',
        };
      }
      throw new Error(
        `Unable to find SDLC data product: ${groupId}:${artifactId}:${versionId}:${path}`,
      );
    },
  );

  createSpy(
    MOCK__store.lakehousePlatformServerClient,
    'getIngestEnvironmentSummaries',
  ).mockResolvedValue([
    mockDevIngestEnvironmentSummaryResponse,
    mockProdParallelIngestEnvironmentSummaryResponse,
    mockProdIngestEnvironmentSummaryResponse,
  ]);
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
