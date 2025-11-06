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
import { fireEvent, screen } from '@testing-library/react';
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
  useIndexSearch?: boolean,
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
      `http://localhost/dataProduct/results?query=${query}${useIndexSearch ? '&useIndexSearch=true' : ''}`,
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
      } else if (
        lakehouseEnv === V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT
      ) {
        return mockDevSearchResultResponse;
      }
      throw new Error(`Unknown lakehouseEnv: ${lakehouseEnv}`);
    },
  );

  // Spies for index search
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
    `/dataProduct/results?query=${query ?? 'data'}${useIndexSearch ? '&useIndexSearch=true' : ''}`,
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

  test('Sort dropdown is rendered', async () => {
    await setupTestComponent('data', 'prod');

    // Check sort option displays
    const sortDropdown = screen.getByText('Sort');
    fireEvent.mouseDown(sortDropdown);
    screen.getByText('Default');
    screen.getByText('Name A-Z');
    screen.getByText('Name Z-A');
  });

  describe('Semantic search', () => {});

  describe('Index search', () => {
    test('Index search only calls lakehouse and metadata endpoints', async () => {
      const { MOCK__baseStore } = await setupTestComponent(
        'data',
        'prod',
        true,
      );

      await screen.findByText('2 Products');

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

    test('Prod data product environment only displays production data products', async () => {
      await setupTestComponent('data', 'prod', true);

      await screen.findByText('2 Products');

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

    test('Development environment displays development data products', async () => {
      await setupTestComponent('data', 'dev', true);

      expect(await screen.findByText('1 Products'));

      // Shows title
      expect(screen.getAllByText('SDLC Development Data Product')).toHaveLength(
        2,
      );
      // Shows version
      screen.getByText('master-SNAPSHOT');

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

      // Toggle on legacy data products
      screen.getByText('Filters');
      const modeledDataProductsFilterButton = screen.getByText(
        'Include Modeled Data Products',
      );
      fireEvent.click(modeledDataProductsFilterButton);

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

    test('Filter Panel shows up for prod data product env and filters modeled data products', async () => {
      await setupTestComponent('data', 'prod', true);

      expect(await screen.findByText('2 Products'));

      // Check filter panel is present
      screen.getByText('Filters');
      const modeledDataProductsFilterButton = screen.getByText(
        'Include Modeled Data Products',
      );

      // Check legacy data product is not present
      expect(screen.queryByText('LegacyDataProduct')).toBeNull();

      // Toggle on filter
      fireEvent.click(modeledDataProductsFilterButton);

      screen.getByText('3 Products');

      // Check that legacy data products are included
      expect(await screen.findAllByText('LegacyDataProduct')).toHaveLength(2);
    });

    test("Filter Panel doesn't show up for prod-par data product env", async () => {
      await setupTestComponent('data', 'prod-par', true);

      // Check filter is not present
      expect(screen.queryByText('Filters')).toBeNull();
      expect(screen.queryByText('Include Modeled Data Products')).toBeNull();

      // Check that legacy data products are not included
      expect(screen.queryByText('LegacyDataProduct')).toBeNull();
    });

    test('Lakehouse data products show Lakehouse chip', async () => {
      await setupTestComponent('data', 'prod', true);

      expect(await screen.findByText('2 Products'));

      // Check for 2 lakehouse chips
      expect(screen.getAllByText('Lakehouse')).toHaveLength(2);

      // Toggle on modeled data products
      screen.getByText('Filters');
      const modeledDataProductsFilterButton = screen.getByText(
        'Include Modeled Data Products',
      );
      fireEvent.click(modeledDataProductsFilterButton);

      await screen.findByText('3 Products');

      // Check that legacy data product is rendered
      expect(await screen.findAllByText('LegacyDataProduct')).toHaveLength(2);

      // Check for still 2 lakehouse chips
      expect(screen.getAllByText('Lakehouse')).toHaveLength(2);
    });
  });
});
