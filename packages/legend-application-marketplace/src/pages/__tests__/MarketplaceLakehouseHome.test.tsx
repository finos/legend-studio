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

import { beforeEach, expect, jest, test } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  TEST__provideMockedLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { TestLegendMarketplaceApplicationPlugin } from '../../application/__test-utils__/LegendMarketplaceApplicationTestUtils.js';
import { createSpy } from '@finos/legend-shared/test';
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
} from '../../components/__test-utils__/TEST_DATA__LakehouseData.js';
import { CORE_PURE_PATH } from '@finos/legend-graph';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const setupTestComponent = async () => {
  const mockedStore = await TEST__provideMockedLegendMarketplaceBaseStore({
    extraPlugins: [new TestLegendMarketplaceApplicationPlugin()],
  });

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getDataProducts',
  ).mockResolvedValue(mockDataProducts);
  createSpy(
    mockedStore.depotServerClient,
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
    mockedStore.lakehousePlatformServerClient,
    'getIngestEnvironmentSummaries',
  ).mockResolvedValue([
    mockDevIngestEnvironmentSummaryResponse,
    mockProdParallelIngestEnvironmentSummaryResponse,
    mockProdIngestEnvironmentSummaryResponse,
  ]);
  createSpy(
    mockedStore.lakehouseIngestServerClient,
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
    mockedStore.lakehouseContractServerClient,
    'getAllSubscriptions',
  ).mockResolvedValue(mockSubscriptions);
  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getDataContracts',
  ).mockResolvedValue(mockDataContracts);
  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getLiteDataContracts',
  ).mockResolvedValue(mockLiteDataContracts);

  const { renderResult, MOCK__store } =
    await TEST__setUpMarketplaceLakehouse(mockedStore);

  return { mockedStore: MOCK__store, renderResult };
};

beforeEach(() => {
  localStorage.clear();
});

test('renders header with Marketplace title and Entitlements button and Marketplace landing title', async () => {
  await setupTestComponent();

  expect(await screen.findAllByText(/^Marketplace$/)).toHaveLength(2);

  expect(screen.getByText('Entitlements')).toBeDefined();
});

test('renders search box with correct placeholder', async () => {
  await setupTestComponent();

  expect(
    screen.getByPlaceholderText('Search Legend Marketplace'),
  ).toBeDefined();
});

test('renders highlighted data products from plugin', async () => {
  await setupTestComponent();

  await screen.findByText('SDLC Release Data Product');
  await screen.findByText(
    'Comprehensive customer analytics data for business intelligence and reporting',
  );
});

test("doesn't navigate to search results page if search box is empty", async () => {
  const { mockedStore } = await setupTestComponent();
  const mockGoToLocation = jest.fn();
  mockedStore.applicationStore.navigationService.navigator.goToLocation =
    mockGoToLocation;

  const searchInput = screen.getByPlaceholderText('Search Legend Marketplace');
  fireEvent.keyPress(searchInput, {
    key: 'Enter',
    code: 'Enter',
  });

  expect(mockGoToLocation).not.toHaveBeenCalled();
});

test('navigates to search results page if search box contains text', async () => {
  const { mockedStore } = await setupTestComponent();
  const mockGoToLocation = jest.fn();
  mockedStore.applicationStore.navigationService.navigator.goToLocation =
    mockGoToLocation;

  const searchInput = screen.getByPlaceholderText('Search Legend Marketplace');
  const searchButton = screen.getByTitle('search');
  fireEvent.change(searchInput, { target: { value: 'data' } });
  fireEvent.click(searchButton);

  await waitFor(() =>
    expect(mockGoToLocation).toHaveBeenLastCalledWith(
      '/lakehouse/results?query=data',
    ),
  );
});
