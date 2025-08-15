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

import { expect, jest, test } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  TEST__provideMockedLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
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

const setupLakehouseAdminTest = async () => {
  const mockedStore = await TEST__provideMockedLegendMarketplaceBaseStore();

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

  const { renderResult } = await TEST__setUpMarketplaceLakehouse(
    mockedStore,
    '/lakehouse/admin',
  );

  return { mockedStore, renderResult };
};

test('renders LakehouseAdmin component with All Contracts and All Subscriptions tabs', async () => {
  await setupLakehouseAdminTest();

  expect(screen.getByText('ALL CONTRACTS')).toBeDefined();
  expect(screen.getByText('ALL SUBSCRIPTIONS')).toBeDefined();
});

test('displays contracts table with correct column headers and data', async () => {
  await setupLakehouseAdminTest();

  await waitFor(() => {
    expect(screen.getByText('Contract Id')).toBeDefined();
    expect(screen.getByText('Contract Description')).toBeDefined();
    expect(screen.getByText('Version')).toBeDefined();
    expect(screen.getByText('State')).toBeDefined();
    expect(screen.getByText('Created By')).toBeDefined();

    expect(screen.getByText('contract-123')).toBeDefined();
    expect(screen.getByText('Test Contract Description 1')).toBeDefined();
    expect(screen.getByText('COMPLETED')).toBeDefined();
    expect(screen.getByText('admin.user')).toBeDefined();
  });
});

test('switches to All Subscriptions tab and displays subscriptions table with correct column headers and data', async () => {
  await setupLakehouseAdminTest();

  const subscriptionsTab = screen.getByText('ALL SUBSCRIPTIONS');
  fireEvent.click(subscriptionsTab);

  await waitFor(() => {
    expect(screen.getByText('Subscription Id')).toBeDefined();
    expect(screen.getByText('Contract ID')).toBeDefined();
    expect(screen.getByText('Target Type')).toBeDefined();
    expect(screen.getByText('Snowflake Account ID')).toBeDefined();
    expect(screen.getByText('Snowflake Region')).toBeDefined();
    expect(screen.getByText('Snowflake Network')).toBeDefined();
    expect(screen.getByText('Created By')).toBeDefined();

    expect(screen.getByText('subscription-789')).toBeDefined();
    expect(screen.getByText('contract-123')).toBeDefined();
    expect(screen.getAllByText('Snowflake')).toHaveLength(2);
    expect(screen.getByText('account-123')).toBeDefined();
    expect(screen.getByText('subscriber.user')).toBeDefined();
  });
});
