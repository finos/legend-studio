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
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useSearchParams } from '@finos/legend-application/browser';
import {
  TEST__provideMockLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import { createSpy } from '@finos/legend-shared/test';
import { V1_EntitlementsLakehouseEnvironmentType } from '@finos/legend-graph';
import { generateFieldSearchResultsRoute } from '../../__lib__/LegendMarketplaceNavigation.js';
import {
  DataProductSearchResultDetailsType,
  FieldSearchType,
  type FieldSearchRequest,
  type GroupedFieldSearchResponse,
} from '@finos/legend-server-marketplace';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

jest.mock('@finos/legend-application/browser', () => {
  const actualModule = jest.requireActual<Record<string, unknown>>(
    '@finos/legend-application/browser',
  );
  return {
    ...actualModule,
    useSearchParams: jest.fn(),
  };
});

const mockUseSearchParams = useSearchParams as jest.Mock;
const mockSetSearchParams = jest.fn();

const mockFieldSearchResponse: PlainObject<GroupedFieldSearchResponse> = {
  results: [
    {
      fieldName: 'customerId',
      fieldDescription: 'Unique customer identifier',
      fieldType: 'STRING',
      dataProducts: [
        {
          path: 'model::CustomerProfile',
          productType: DataProductSearchResultDetailsType.LAKEHOUSE,
          datasetName: 'customers_core',
          modelPath: 'model::CustomerProfile::customerId',
          dataProductId: 'LAKEHOUSE_CUSTOMER_PROFILE',
          deploymentId: 101,
        },
        {
          path: 'model::CustomerOrders',
          productType: DataProductSearchResultDetailsType.LAKEHOUSE,
          datasetName: 'orders',
          modelPath: 'model::CustomerOrders::customerId',
          dataProductId: 'LAKEHOUSE_CUSTOMER_ORDERS',
          deploymentId: 102,
        },
        {
          path: 'model::CustomerKyc',
          productType: DataProductSearchResultDetailsType.LAKEHOUSE,
          datasetName: 'kyc',
          modelPath: 'model::CustomerKyc::customerId',
          dataProductId: 'LAKEHOUSE_CUSTOMER_KYC',
          deploymentId: 103,
        },
      ],
    },
    {
      fieldName: 'legacyStatus',
      fieldDescription: 'Legacy lifecycle status',
      fieldType: 'BOOLEAN',
      dataProducts: [
        {
          path: 'test::LegacyCustomerProduct',
          productType: DataProductSearchResultDetailsType.LEGACY,
          datasetName: 'legacy_dataset',
          modelPath: 'test::LegacyCustomerProduct::legacyStatus',
          groupId: 'com.example.legacy',
          artifactId: 'legacy-customer-product',
          versionId: '2.1.0',
        },
      ],
    },
  ],
  metadata: {
    total_count: 2,
    num_pages: 1,
    page_size: 12,
    page_number: 1,
    lakehouse_count: 3,
    legacy_count: 1,
    total_field_matches: 4,
    next_page_number: null,
    prev_page_number: null,
  },
};

const getFilteredFieldSearchResponse = (
  response: PlainObject<GroupedFieldSearchResponse>,
  request?: FieldSearchRequest,
): PlainObject<GroupedFieldSearchResponse> => {
  const requestedTypes = request?.dataProductTypes;
  if (!requestedTypes || requestedTypes.length === 0) {
    return response;
  }

  const normalizedRequestedTypes = requestedTypes.map((t) => t.toLowerCase());
  const results = response.results as PlainObject[];
  const filteredResults = results
    .map((result) => {
      const dataProducts = result.dataProducts as PlainObject[];
      const filteredDataProducts = dataProducts.filter((dp) => {
        const productType = (dp.productType as string).toLowerCase();
        return normalizedRequestedTypes.includes(productType);
      });
      if (filteredDataProducts.length === 0) {
        return null;
      }
      return {
        ...result,
        dataProducts: filteredDataProducts,
      };
    })
    .filter((result) => result !== null);

  return {
    ...response,
    results: filteredResults,
    metadata: {
      ...(response.metadata as PlainObject),
      total_count: filteredResults.length,
      num_pages: 1,
      page_number: 1,
      next_page_number: null,
      prev_page_number: null,
    },
  };
};

const setupFieldSearchTestComponent = async (
  query: string,
  response: PlainObject<GroupedFieldSearchResponse> = mockFieldSearchResponse,
) => {
  const MOCK__baseStore = await TEST__provideMockLegendMarketplaceBaseStore({
    dataProductEnv: 'prod',
  });
  mockUseSearchParams.mockReturnValue([
    new URLSearchParams({ query }),
    mockSetSearchParams,
  ]);

  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'dataProductSearch',
  ).mockResolvedValue({} as never);
  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'fieldSearch',
  ).mockImplementation(
    async (
      _environment,
      request?: FieldSearchRequest,
    ): Promise<PlainObject<GroupedFieldSearchResponse>> =>
      getFilteredFieldSearchResponse(response, request),
  );

  const { renderResult } = await TEST__setUpMarketplaceLakehouse(
    MOCK__baseStore,
    generateFieldSearchResultsRoute(query),
  );

  return { MOCK__baseStore, renderResult };
};

beforeEach(() => {
  localStorage.clear();
  mockUseSearchParams.mockReset();
  mockSetSearchParams.mockReset();
});

describe('MarketplaceLakehouseFieldSearchResults', () => {
  test('renders grouped field results in shared list-item layout and calls field search endpoint', async () => {
    const { MOCK__baseStore } = await setupFieldSearchTestComponent('customer');

    expect(await screen.findByText('4 Fields')).toBeDefined();
    expect(
      MOCK__baseStore.marketplaceServerClient.fieldSearch,
    ).toHaveBeenCalledWith(
      V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
      expect.objectContaining({
        query: 'customer',
        searchType: FieldSearchType.HYBRID,
        pageSize: 12,
        pageNumber: 1,
      }),
      expect.anything(),
    );
    expect(
      MOCK__baseStore.marketplaceServerClient.dataProductSearch,
    ).not.toHaveBeenCalled();

    expect(screen.queryByRole('table')).toBeNull();
    const listHeader = guaranteeNonNullable(
      screen.getByText('Field Name').parentElement,
    );
    expect(within(listHeader).getByText('Field Name')).toBeDefined();
    expect(within(listHeader).getByText('Type')).toBeDefined();
    expect(within(listHeader).getByText('Description')).toBeDefined();
    expect(within(listHeader).getByText('Data Products')).toBeDefined();

    expect(screen.getByText('customerId')).toBeDefined();
    expect(screen.getByText('STRING')).toBeDefined();
    expect(screen.getByText('Unique customer identifier')).toBeDefined();
    expect(screen.getByText('legacyStatus')).toBeDefined();

    expect(screen.getByText('CustomerProfile')).toBeDefined();
    expect(screen.getByText('CustomerOrders')).toBeDefined();
    expect(screen.queryByText('CustomerKyc')).toBeNull();
    expect(screen.getByText('+1 More')).toBeDefined();
  });

  test('shows additional data product chips when clicking show more', async () => {
    await setupFieldSearchTestComponent('customer');

    expect(await screen.findByText('+1 More')).toBeDefined();
    fireEvent.click(screen.getByText('+1 More'));

    expect(await screen.findByText('CustomerKyc')).toBeDefined();
    expect(screen.getByText('Show Less')).toBeDefined();
  });

  test('clicking a data product chip navigates to the owning data product', async () => {
    const { MOCK__baseStore } = await setupFieldSearchTestComponent('customer');

    const mockVisitAddress = jest.fn();
    MOCK__baseStore.applicationStore.navigationService.navigator.visitAddress =
      mockVisitAddress;

    await screen.findByText('CustomerProfile');
    const lakehouseChip = guaranteeNonNullable(
      screen.getByText('CustomerProfile').closest('.MuiChip-root'),
    );
    fireEvent.click(lakehouseChip);

    expect(mockVisitAddress).toHaveBeenCalledWith(
      expect.stringContaining(
        '/dataProduct/deployed/LAKEHOUSE_CUSTOMER_PROFILE/101',
      ),
    );

    await screen.findByText('LegacyCustomerProduct');
    const legacyChip = guaranteeNonNullable(
      screen.getByText('LegacyCustomerProduct').closest('.MuiChip-root'),
    );
    fireEvent.click(legacyChip);

    expect(mockVisitAddress).toHaveBeenCalledWith(
      expect.stringContaining(
        '/dataProduct/legacy/com.example.legacy:legacy-customer-product:2.1.0/test::LegacyCustomerProduct',
      ),
    );
  });

  test('filters field results by selected product type', async () => {
    await setupFieldSearchTestComponent('customer');

    expect(await screen.findByText('customerId')).toBeDefined();
    fireEvent.click(screen.getByText('Legacy'));

    await waitFor(() => {
      expect(screen.queryByText('customerId')).toBeNull();
    });
    expect(screen.getByText('legacyStatus')).toBeDefined();
    expect(screen.queryByText('CustomerProfile')).toBeNull();
    expect(screen.getByText('LegacyCustomerProduct')).toBeDefined();
  });

  test('shows empty state when field search returns no results', async () => {
    await setupFieldSearchTestComponent('nothing', {
      results: [],
      metadata: {
        total_count: 0,
        num_pages: 1,
        page_size: 12,
        page_number: 1,
        lakehouse_count: 0,
        legacy_count: 0,
        total_field_matches: 0,
        next_page_number: null,
        prev_page_number: null,
      },
    });

    await screen.findByText('No fields found');
    expect(
      screen.getByText(/Try a broader query or switch back to product search/i),
    ).toBeDefined();
  });

  test('shows error state when field search API throws', async () => {
    const MOCK__baseStore = await TEST__provideMockLegendMarketplaceBaseStore({
      dataProductEnv: 'prod',
    });
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams({ query: 'customer' }),
      mockSetSearchParams,
    ]);
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'dataProductSearch',
    ).mockResolvedValue({} as never);
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'fieldSearch',
    ).mockRejectedValue(new Error('API unavailable'));

    await TEST__setUpMarketplaceLakehouse(
      MOCK__baseStore,
      generateFieldSearchResultsRoute('customer'),
    );

    await screen.findByText('Field search failed');
    expect(screen.getByText('API unavailable')).toBeDefined();
  });

  test('shows no-match empty state when active filter excludes all rows', async () => {
    // Use a lakehouse-only response; applying the Legacy filter leaves nothing visible
    await setupFieldSearchTestComponent('price', {
      results: [
        {
          fieldName: 'price',
          fieldDescription: 'The price value',
          fieldType: 'DOUBLE',
          dataProducts: [
            {
              path: 'model::Pricing',
              productType: DataProductSearchResultDetailsType.LAKEHOUSE,
              datasetName: 'pricing',
              modelPath: 'model::Pricing::price',
              dataProductId: 'LAKEHOUSE_PRICING',
              deploymentId: 200,
            },
          ],
        },
      ],
      metadata: {
        total_count: 1,
        num_pages: 1,
        page_size: 12,
        page_number: 1,
        lakehouse_count: 1,
        legacy_count: 0,
        total_field_matches: 1,
        next_page_number: null,
        prev_page_number: null,
      },
    });

    await screen.findByText('price');
    fireEvent.click(screen.getByText('Legacy'));

    await waitFor(() => {
      expect(screen.queryByText('price')).toBeNull();
    });
    expect(
      screen.getByText('No fields match the current filters'),
    ).toBeDefined();
  });

  test('clears all active filters when "Clear all" is clicked', async () => {
    await setupFieldSearchTestComponent('customer');

    await screen.findByText('customerId');
    fireEvent.click(screen.getByText('Legacy'));
    await waitFor(() => expect(screen.queryByText('customerId')).toBeNull());

    fireEvent.click(screen.getByText('Clear all'));
    await screen.findByText('customerId');
    expect(screen.getByText('legacyStatus')).toBeDefined();
  });

  test('submitting a new query from the field page re-runs field search', async () => {
    const { MOCK__baseStore } = await setupFieldSearchTestComponent('customer');

    await screen.findByText('4 Fields');

    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'fieldSearch',
    ).mockResolvedValue({
      results: [],
      metadata: {
        total_count: 0,
        num_pages: 1,
        page_size: 12,
        page_number: 1,
        lakehouse_count: 0,
        legacy_count: 0,
        total_field_matches: 0,
        next_page_number: null,
        prev_page_number: null,
      },
    });

    const searchInput = screen.getByDisplayValue('customer');
    fireEvent.change(searchInput, { target: { value: 'price' } });

    await act(async () => {
      fireEvent.click(screen.getByTitle('Search'));
    });

    await screen.findByText('No fields found');
    expect(
      MOCK__baseStore.marketplaceServerClient.fieldSearch,
    ).toHaveBeenCalledWith(
      V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
      expect.objectContaining({
        query: 'price',
        searchType: FieldSearchType.HYBRID,
        pageSize: expect.any(Number),
        pageNumber: expect.any(Number),
      }),
      expect.anything(),
    );
  });

  test('turning off field search from the field page navigates to data product search', async () => {
    const { MOCK__baseStore } = await setupFieldSearchTestComponent('customer');
    const mockGoToLocation = jest.fn();
    MOCK__baseStore.applicationStore.navigationService.navigator.goToLocation =
      mockGoToLocation;

    await screen.findByText('4 Fields');

    fireEvent.click(screen.getByTitle('Search settings'));
    fireEvent.click(screen.getByRole('switch', { name: /Field Search/ }));

    await act(async () => {
      fireEvent.click(screen.getByTitle('Search'));
    });

    expect(mockGoToLocation).toHaveBeenCalledWith(
      expect.stringContaining('/dataProduct/results'),
    );
  });
});
