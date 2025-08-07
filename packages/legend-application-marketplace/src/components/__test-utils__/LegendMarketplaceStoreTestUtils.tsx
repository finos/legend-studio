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
  mockReleaseSDLCDataProduct,
  mockSnapshotSDLCDataProduct,
  mockDevIngestEnvironmentSummaryResponse,
  mockProdParallelIngestEnvironmentSummaryResponse,
  mockProdIngestEnvironmentSummaryResponse,
  mockDevIngestEnvironmentResponse,
  mockProdParallelIngestEnvironmentResponse,
  mockProdIngestEnvironmentResponse,
  mockSubscriptions,
  mockDataContracts,
  mockDataProducts,
  mockLiteDataContracts,
} from './TEST_DATA__LakehouseData.js';
import { LakehouseAdminStore } from '../../stores/lakehouse/admin/LakehouseAdminStore.js';
import { useLakehouseAdminStore } from '../../pages/Lakehouse/admin/LakehouseAdminStoreProvider.js';

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

jest.mock('../../pages/Lakehouse/admin/LakehouseAdminStoreProvider.js', () => {
  const actual: Record<string, unknown> = jest.requireActual(
    '../../pages/Lakehouse/admin/LakehouseAdminStoreProvider.js',
  );
  return {
    ...actual,
    useLakehouseAdminStore: jest.fn(),
    LakehouseAdminStoreProvider: ({
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
    MOCK__store.lakehouseContractServerClient,
    'getDataProducts',
  ).mockResolvedValue(mockDataProducts);
  createSpy(
    MOCK__store.depotServerClient,
    'getVersionEntities',
  ).mockImplementation(
    async (
      groupId: string,
      artifactId: string,
      versionId: string,
      classifierPath?: string,
    ) => {
      if (
        groupId === 'com.example.analytics' &&
        artifactId === 'customer-analytics'
      ) {
        return [
          {
            entity: {
              classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
              content: mockReleaseSDLCDataProduct,
              path: 'test::dataproduct::TestSDLCDataProduct',
            },
          },
        ];
      } else if (
        groupId === 'com.example.finance' &&
        artifactId === 'financial-reporting'
      ) {
        return [
          {
            entity: {
              classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
              content: mockSnapshotSDLCDataProduct,
              path: 'test::dataproduct::AnotherSDLCDataProduct',
            },
          },
        ];
      }
      throw new Error(
        `Unable to find entities at: ${groupId}:${artifactId}:${versionId}:${classifierPath}`,
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
        return mockProdIngestEnvironmentResponse;
      }

      throw new Error(
        `Unable to find deployed definitions for URL: ${ingestServerUrl}`,
      );
    },
  );
  createSpy(
    MOCK__store.lakehouseContractServerClient,
    'getAllSubscriptions',
  ).mockResolvedValue(mockSubscriptions);
  createSpy(
    MOCK__store.lakehouseContractServerClient,
    'getDataContracts',
  ).mockResolvedValue(mockDataContracts);
  createSpy(
    MOCK__store.lakehouseContractServerClient,
    'getLiteDataContracts',
  ).mockResolvedValue(mockLiteDataContracts);

  const MOCK__lakehouseStore = new MarketplaceLakehouseStore(
    MOCK__store,
    MOCK__store.lakehouseContractServerClient,
    MOCK__store.lakehousePlatformServerClient,
    MOCK__store.lakehouseIngestServerClient,
    MOCK__store.depotServerClient,
  );

  const MOCK__lakehouseAdminStore = new LakehouseAdminStore(
    MOCK__store.applicationStore,
    MOCK__store.lakehouseContractServerClient,
  );

  (useMarketplaceLakehouseStore as jest.Mock).mockReturnValue(
    MOCK__lakehouseStore,
  );
  (useLakehouseAdminStore as jest.Mock).mockReturnValue(
    MOCK__lakehouseAdminStore,
  );

  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__store.applicationStore}>
      <AuthProvider>
        <TEST__BrowserEnvironmentProvider
          initialEntries={[route ?? '/lakehouse']}
          baseUrl={route ?? '/lakehouse'}
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
