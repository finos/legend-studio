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

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  TEST__provideMockLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import { createSpy } from '@finos/legend-shared/test';
import { V1_EntitlementsLakehouseEnvironmentType } from '@finos/legend-graph';
import {
  mockDataProductsResponse,
  mockLegacyDataProductSummaryEntity,
} from '../../components/__test-utils__/TEST_DATA__LakehouseData.js';
import type { StoredSummaryEntity } from '@finos/legend-server-depot';
import {
  mockDevSearchResultResponse,
  mockProdParSearchResultResponse,
  mockProdSearchResultResponse,
} from '../../components/__test-utils__/TEST_DATA__LakehouseSearchResultData.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const setupTestComponent = async (
  query: string,
  dataProductEnv: 'prod' | 'prod-par' | 'dev',
  useProducerSearch?: boolean,
) => {
  const MOCK__baseStore = await TEST__provideMockLegendMarketplaceBaseStore({
    dataProductEnv,
  });
  jest
    .spyOn(
      MOCK__baseStore.applicationStore.navigationService.navigator,
      'getCurrentAddress',
    )
    .mockReturnValue(
      `http://localhost/dataProduct/results?query=${query}${useProducerSearch ? '&useProducerSearch=true' : ''}`,
    );

  // Spies for semantic search
  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'dataProductSearch',
  ).mockImplementation(
    async (
      _: string,
      lakehouseEnv: V1_EntitlementsLakehouseEnvironmentType,
    ) => {
      if (lakehouseEnv === V1_EntitlementsLakehouseEnvironmentType.PRODUCTION) {
        return mockProdSearchResultResponse;
      } else if (
        lakehouseEnv ===
        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL
      ) {
        return mockProdParSearchResultResponse;
      } else {
        return mockDevSearchResultResponse;
      }
    },
  );

  // Spies for producer search
  createSpy(
    MOCK__baseStore.lakehouseContractServerClient,
    'getDataProducts',
  ).mockResolvedValue(mockDataProductsResponse);
  createSpy(
    MOCK__baseStore.depotServerClient,
    'getEntitiesSummaryByClassifier',
  ).mockResolvedValue([
    mockLegacyDataProductSummaryEntity,
  ] as unknown as PlainObject<StoredSummaryEntity>[]);

  const { renderResult } = await TEST__setUpMarketplaceLakehouse(
    MOCK__baseStore,
    `/dataProduct/results?query=${query}${useProducerSearch ? '&useProducerSearch=true' : ''}`,
  );

  return { MOCK__baseStore, renderResult };
};

beforeEach(() => {
  localStorage.clear();
});

describe('MarketplaceLakehouseSearchResults', () => {
  test('renders search box pre-filled based on URL query param', async () => {
    await setupTestComponent('data', 'prod');

    expect(screen.getByDisplayValue('data')).toBeDefined();
  });

  test('Sets useProducerSearch state based on param', async () => {
    const { MOCK__baseStore } = await setupTestComponent('data', 'prod', true);

    expect(MOCK__baseStore.useProducerSearch).toBe(true);
  });

  test('Sort dropdown is rendered', async () => {
    await setupTestComponent('data', 'prod');

    // Check sort option displays
    const sortDropdown = screen.getByText('Sort');
    fireEvent.mouseDown(sortDropdown);
    screen.getByText('Default');
    screen.getByText('Name A-Z');
    screen.getByText('Name Z-A');
  });

  test('Toggling useProducerSearch and updating search box value, then searching, updates URL', async () => {
    const { MOCK__baseStore } = await setupTestComponent('data', 'prod');

    const searchInput = screen.getByDisplayValue('data');

    // Update search input
    fireEvent.change(searchInput, { target: { value: 'new search' } });
    screen.getByDisplayValue('new search');

    // Turn on producer search
    const searchSettingsButton = screen.getByTitle('Search settings');
    fireEvent.click(searchSettingsButton);
    const producerSearchSwitch: HTMLInputElement = screen.getByRole('switch', {
      name: /Producer Search/,
    });
    fireEvent.click(producerSearchSwitch);
    expect(producerSearchSwitch.checked).toBe(true);

    // Click search
    const searchButton = screen.getByTitle('Search');

    const mockUpdateCurrentLocation = jest.fn();
    MOCK__baseStore.applicationStore.navigationService.navigator.updateCurrentLocation =
      mockUpdateCurrentLocation;

    fireEvent.click(searchButton);

    await waitFor(() =>
      expect(mockUpdateCurrentLocation).toHaveBeenCalledWith(
        '/dataProduct/results?query=new%20search&useProducerSearch=true',
      ),
    );
  });

  describe('Semantic search', () => {
    test('Semantic search only calls semantic search endpoint', async () => {
      const { MOCK__baseStore } = await setupTestComponent('data', 'prod');

      await screen.findByText('4 Products');

      expect(
        MOCK__baseStore.marketplaceServerClient.dataProductSearch,
      ).toHaveBeenCalledTimes(1);
      expect(
        MOCK__baseStore.lakehouseContractServerClient.getDataProducts,
      ).not.toHaveBeenCalled();
      expect(
        MOCK__baseStore.depotServerClient.getEntitiesSummaryByClassifier,
      ).not.toHaveBeenCalled();
    });

    test('Prod data product environment only displays production data products and legacy data products', async () => {
      await setupTestComponent('data', 'prod');

      await screen.findByText('4 Products');

      // Lakehouse Data Product with title shows title
      expect(screen.getAllByText('Lakehouse SDLC Data Product')).toHaveLength(
        2,
      );
      screen.getByText('This is a lakehouse SDLC Data Product');

      // Lakehouse Data Product without title shows name
      expect(
        screen.getAllByText('LAKEHOUSE_SDLC_DATA_PRODUCT_NO_TITLE'),
      ).toHaveLength(2);

      // Legacy Data Product with title shows title
      expect(screen.getAllByText('Legacy Data Product')).toHaveLength(2);

      // Legacy Data Product without title shows name
      expect(screen.getAllByText('Legacy_Data_Product_No_Title')).toHaveLength(
        2,
      );
    });

    test('Production-parallel environment displays production-parallel data products', async () => {
      await setupTestComponent('data', 'prod-par');

      expect(await screen.findByText('2 Products'));

      // Shows SDLC Data Product title
      expect(screen.getAllByText('Lakehouse SDLC Data Product')).toHaveLength(
        2,
      );

      // Shows Ad-hoc Data Product title
      expect(screen.getAllByText('Lakehouse Ad-hoc Data Product')).toHaveLength(
        2,
      );
    });

    test('Development environment displays development data products', async () => {
      await setupTestComponent('data', 'dev');

      expect(await screen.findByText('2 Products'));

      // Shows title
      expect(screen.getAllByText('Lakehouse SDLC Data Product')).toHaveLength(
        2,
      );
      expect(screen.getAllByText('Lakehouse Ad-hoc Data Product')).toHaveLength(
        2,
      );

      // Shows version if snapshot
      screen.getByText('test_branch-SNAPSHOT');
    });

    test('shows info popper for Lakehouse data products with correct details', async () => {
      await setupTestComponent('data', 'prod');

      const findDataProductTitle = await screen.findAllByText(
        'Lakehouse SDLC Data Product',
      );
      const dataProductTitle = guaranteeNonNullable(findDataProductTitle[0]);
      const dataProductCard = guaranteeNonNullable(
        dataProductTitle.parentElement?.parentElement,
      );

      fireEvent.mouseEnter(dataProductCard);

      const infoButton = screen.getByRole('button', { name: 'More Info' });

      fireEvent.click(guaranteeNonNullable(infoButton));

      await screen.findByText('Description');
      expect(
        screen.getAllByText('This is a lakehouse SDLC Data Product'),
      ).toHaveLength(2);

      screen.getByText('Deployment Details');
      screen.getByText('Data Product ID');
      screen.getByText('LAKEHOUSE_SDLC_DATA_PRODUCT');
      screen.getByText('Deployment ID');
      screen.getByText('12345');
      screen.getByText('Producer Environment Name');
      screen.getByText('test-prod-producer-env');
      screen.getByText('Producer Environment Type');
      screen.getByText('PRODUCTION');

      screen.getByText('Data Product Project');
      screen.getByText('Group');
      screen.getByText('com.example.lakehouse');
      screen.getByText('Artifact');
      screen.getByText('lakehouse-sdlc-data-product');
      screen.getByText('Version');
      screen.getByText('1.0.0');
      screen.getByText('Path');
      screen.getByText('test::Lakehouse_Sdlc_Data_Product');
    });

    test('Clicking on Lakehouse Data Product card navigates to data product viewer page', async () => {
      const { MOCK__baseStore } = await setupTestComponent('data', 'prod');

      const mockVisitAddress = jest.fn();
      MOCK__baseStore.applicationStore.navigationService.navigator.visitAddress =
        mockVisitAddress;

      const findDataProductTitle = await screen.findAllByText(
        'Lakehouse SDLC Data Product',
      );
      const dataProductTitle = guaranteeNonNullable(findDataProductTitle[0]);
      fireEvent.click(dataProductTitle);

      expect(mockVisitAddress).toHaveBeenCalledWith(
        expect.stringContaining(
          '/dataProduct/deployed/LAKEHOUSE_SDLC_DATA_PRODUCT/12345',
        ),
      );
    });

    test('Clicking on Legacy Data Product card navigates to data product viewer page', async () => {
      const { MOCK__baseStore } = await setupTestComponent('data', 'prod');

      const mockVisitAddress = jest.fn();
      MOCK__baseStore.applicationStore.navigationService.navigator.visitAddress =
        mockVisitAddress;

      const dataProductTitle = guaranteeNonNullable(
        (await screen.findAllByText('Legacy Data Product'))[0],
      );
      fireEvent.click(dataProductTitle);

      expect(mockVisitAddress).toHaveBeenCalledWith(
        expect.stringContaining(
          '/dataProduct/legacy/com.example.legacy:legacy-data-product:2.0.0/test::Legacy_Data_Product',
        ),
      );
    });

    test('Lakehouse data products show Lakehouse chip', async () => {
      await setupTestComponent('data', 'prod');

      expect(await screen.findByText('4 Products'));

      // Check for 2 lakehouse chips
      expect(screen.getAllByText('Lakehouse')).toHaveLength(2);
      // Check that legacy data product is rendered
      expect(await screen.findAllByText('Legacy Data Product')).toHaveLength(2);
    });
  });

  describe('Producer Search', () => {
    test('Producer search only calls lakehouse and metadata endpoints', async () => {
      const { MOCK__baseStore } = await setupTestComponent(
        'data',
        'prod',
        true,
      );

      await screen.findByText('3 Products');

      expect(
        MOCK__baseStore.lakehouseContractServerClient.getDataProducts,
      ).toHaveBeenCalledTimes(1);
      expect(
        MOCK__baseStore.depotServerClient.getEntitiesSummaryByClassifier,
      ).toHaveBeenCalledTimes(1);
      expect(
        MOCK__baseStore.marketplaceServerClient.dataProductSearch,
      ).not.toHaveBeenCalled();
    });

    test('Prod data product environment only displays production data products and legacy data products', async () => {
      await setupTestComponent('data', 'prod', true);

      await screen.findByText('3 Products');

      // Data product with title shows title
      expect(screen.getAllByText('SDLC Production Data Product')).toHaveLength(
        2,
      );
      screen.getByText(
        'Comprehensive customer analytics data for business intelligence and reporting',
      );

      // Data product without title shows name
      expect(
        screen.getAllByText('SDLC_PRODUCTION_DATAPRODUCT_NO_TITLE'),
      ).toHaveLength(2);

      // Legacy data product shows title
      expect(screen.getAllByText('LegacyDataProduct')).toHaveLength(2);

      // Doesn't show non-production data products
      expect(screen.queryByText('SDLC Prod-Parallel Data Product')).toBeNull();
      expect(screen.queryByText('SDLC Development Data Product')).toBeNull();
    });

    test('Production-parallel environment displays production-parallel data products', async () => {
      await setupTestComponent('data', 'prod-par', true);

      expect(await screen.findByText('1 Products'));

      // Shows title
      expect(
        screen.getAllByText('SDLC Prod-Parallel Data Product'),
      ).toHaveLength(2);
      // Shows version
      screen.getByText('master-SNAPSHOT');

      // Doesn't show production or dev data products
      expect(screen.queryByText('SDLC Production Data Product')).toBeNull();
      expect(
        screen.queryByText('SDLC_PRODUCTION_DATAPRODUCT_NO_TITLE'),
      ).toBeNull();
      expect(screen.queryByText('SDLC Development Data Product')).toBeNull();
    });

    test('Development environment displays development data products and legacy data products', async () => {
      await setupTestComponent('data', 'dev', true);

      expect(await screen.findByText('2 Products'));

      // Shows title
      expect(screen.getAllByText('SDLC Development Data Product')).toHaveLength(
        2,
      );
      // Shows version
      screen.getByText('master-SNAPSHOT');

      // Shows legacy data product
      expect(screen.getAllByText('LegacyDataProduct')).toHaveLength(2);

      // Doesn't show production or production-parallel data products
      expect(screen.queryByText('SDLC Production Data Product')).toBeNull();
      expect(
        screen.queryByText('SDLC_PRODUCTION_DATAPRODUCT_NO_TITLE'),
      ).toBeNull();
      expect(screen.queryByText('SDLC Prod-Parallel Data Product')).toBeNull();
    });

    test('filters data products by name based on query param', async () => {
      await setupTestComponent('no_title', 'prod', true);

      expect(await screen.findByText('1 Products'));

      expect(
        screen.getAllByText('SDLC_PRODUCTION_DATAPRODUCT_NO_TITLE'),
      ).toHaveLength(2);
      expect(screen.queryByText('SDLC Production Data Product')).toBeNull();
    });

    test('shows info popper for Lakehouse data products with correct details', async () => {
      await setupTestComponent('data', 'prod', true);

      const findDataProductTitle = await screen.findAllByText(
        'SDLC Production Data Product',
      );
      const dataProductTitle = guaranteeNonNullable(findDataProductTitle[0]);
      const dataProductCard = guaranteeNonNullable(
        dataProductTitle.parentElement?.parentElement,
      );

      fireEvent.mouseEnter(dataProductCard);

      const infoButton = screen.getByRole('button', { name: 'More Info' });

      fireEvent.click(guaranteeNonNullable(infoButton));

      await screen.findByText('Description');
      expect(
        screen.getAllByText(
          'Comprehensive customer analytics data for business intelligence and reporting',
        ),
      ).toHaveLength(2);

      screen.getByText('Deployment Details');
      screen.getByText('Data Product ID');
      screen.getByText('SDLC_PRODUCTION_DATAPRODUCT');
      screen.getByText('Deployment ID');
      screen.getByText('12345');
      screen.getByText('Producer Environment Name');
      screen.getByText('production-analytics');
      screen.getByText('Producer Environment Type');
      screen.getByText('PRODUCTION');

      screen.getByText('Data Product Project');
      screen.getByText('Group');
      screen.getByText('com.example.analytics');
      screen.getByText('Artifact');
      screen.getByText('customer-analytics');
      screen.getByText('Version');
      screen.getByText('1.2.0');
      screen.getByText('Path');
      screen.getByText('test::dataproduct::Sdlc_Production_DataProduct');
    });

    test('Clicking on Lakehouse Data Product card navigates to data product viewer page', async () => {
      const { MOCK__baseStore } = await setupTestComponent(
        'data',
        'prod',
        true,
      );

      const mockVisitAddress = jest.fn();
      MOCK__baseStore.applicationStore.navigationService.navigator.visitAddress =
        mockVisitAddress;

      const findDataProductTitle = await screen.findAllByText(
        'SDLC Production Data Product',
      );
      const dataProductTitle = guaranteeNonNullable(findDataProductTitle[0]);
      fireEvent.click(dataProductTitle);

      expect(mockVisitAddress).toHaveBeenCalledWith(
        expect.stringContaining(
          '/dataProduct/deployed/SDLC_PRODUCTION_DATAPRODUCT/12345',
        ),
      );
    });

    test('Clicking on Legacy Data Product card navigates to data product viewer page', async () => {
      const { MOCK__baseStore } = await setupTestComponent(
        'data',
        'prod',
        true,
      );

      const mockVisitAddress = jest.fn();
      MOCK__baseStore.applicationStore.navigationService.navigator.visitAddress =
        mockVisitAddress;

      const dataProductTitle = guaranteeNonNullable(
        (await screen.findAllByText('LegacyDataProduct'))[0],
      );
      fireEvent.click(dataProductTitle);

      expect(mockVisitAddress).toHaveBeenCalledWith(
        expect.stringContaining(
          '/dataProduct/legacy/com.example.legacy:test-legacy-data-product:1.0.0/test::dataproduct::LegacyDataProduct',
        ),
      );
    });

    test('Lakehouse data products show Lakehouse chip', async () => {
      await setupTestComponent('data', 'prod', true);

      expect(await screen.findByText('3 Products'));

      // Check for 2 lakehouse chips
      expect(screen.getAllByText('Lakehouse')).toHaveLength(2);
      // Check that legacy data product is rendered
      expect(await screen.findAllByText('LegacyDataProduct')).toHaveLength(2);
    });
  });
});
