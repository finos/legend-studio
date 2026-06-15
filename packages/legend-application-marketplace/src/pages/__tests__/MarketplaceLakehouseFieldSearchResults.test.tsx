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
import {
  generateFieldSearchResultsRoute,
  generateLakehouseSearchResultsRoute,
} from '../../__lib__/LegendMarketplaceNavigation.js';
import {
  FieldSearchDataProductEntry,
  FieldSearchResultState,
} from '../../stores/lakehouse/fieldSearch/FieldSearchResultState.js';
import { DataProductTypeFilter } from '../../stores/lakehouse/LegendMarketplaceSearchResultsStore.js';
import {
  DataProductSearchResultDetailsType,
  FieldSearchType,
  type FieldSearchRequest,
  GroupedFieldSearchDataProduct,
  type GroupedFieldSearchResponse as GroupedFieldSearchResponseShape,
  GroupedFieldSearchResponse,
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

const mockFieldSearchResponse: PlainObject<GroupedFieldSearchResponseShape> = {
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
          datasetDescription: 'The legacy dataset for status tracking',
          modelPath: 'test::LegacyCustomerProduct::legacyStatus',
          groupId: 'com.example.legacy',
          artifactId: 'legacy-customer-product',
          versionId: '2.1.0',
          defaultExecutionContext: 'legacyContext',
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
  response: PlainObject<GroupedFieldSearchResponseShape>,
  request?: FieldSearchRequest,
): PlainObject<GroupedFieldSearchResponseShape> => {
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
  response: PlainObject<GroupedFieldSearchResponseShape> = mockFieldSearchResponse,
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
  const fieldSearchSpy = createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'fieldSearch',
  ).mockImplementation(
    async (
      _environment,
      request?: FieldSearchRequest,
    ): Promise<PlainObject<GroupedFieldSearchResponseShape>> =>
      getFilteredFieldSearchResponse(response, request),
  );

  const { renderResult } = await TEST__setUpMarketplaceLakehouse(
    MOCK__baseStore,
    generateFieldSearchResultsRoute(query),
  );

  return { MOCK__baseStore, renderResult, fieldSearchSpy };
};

beforeEach(() => {
  localStorage.clear();
  mockUseSearchParams.mockReset();
  mockSetSearchParams.mockReset();
  HTMLElement.prototype.scrollIntoView = jest.fn();
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
    expect(within(listHeader).getByText('Datasets')).toBeDefined();

    expect(screen.getByText('customerId')).toBeDefined();
    expect(screen.getByText('STRING')).toBeDefined();
    expect(screen.getByText('Unique customer identifier')).toBeDefined();
    expect(screen.getByText('legacyStatus')).toBeDefined();

    // Each chip name appears in both the Data Products column and the Datasets column
    expect(screen.getAllByText('CustomerProfile').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CustomerOrders').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('CustomerKyc')).toHaveLength(0);
    // Both columns have a "+1 More" toggle when collapsed
    expect(screen.getAllByText('+1 More').length).toBeGreaterThan(0);
  });

  test('shows additional data product chips when clicking show more', async () => {
    await setupFieldSearchTestComponent('customer');

    // Both columns render a "+1 More" chip when collapsed; click the first one
    const showMoreButtons = await screen.findAllByText('+1 More');
    expect(showMoreButtons.length).toBeGreaterThan(0);
    fireEvent.click(guaranteeNonNullable(showMoreButtons[0]));

    expect(await screen.findByText('CustomerKyc')).toBeDefined();
    expect(screen.getByText('Show Less')).toBeDefined();
  });

  test('clicking a data product chip navigates to Legend Query for legacy or marketplace for lakehouse', async () => {
    const { MOCK__baseStore } = await setupFieldSearchTestComponent('customer');

    const mockVisitAddress = jest.fn();
    MOCK__baseStore.applicationStore.navigationService.navigator.visitAddress =
      mockVisitAddress;

    // LAKEHOUSE: no executionContextKey, falls back to marketplace product page
    // getAllByText because the name appears in both Data Products and Datasets columns;
    // index [0] is the Data Products column chip (first in DOM order)
    await screen.findAllByText('CustomerProfile');
    const lakehouseChip = guaranteeNonNullable(
      guaranteeNonNullable(screen.getAllByText('CustomerProfile')[0]).closest(
        '.MuiChip-root',
      ),
    );
    fireEvent.click(lakehouseChip);

    expect(mockVisitAddress).toHaveBeenCalledWith(
      expect.stringContaining(
        '/dataProduct/deployed/LAKEHOUSE_CUSTOMER_PROFILE/101',
      ),
    );

    // LEGACY: has executionContextKey, navigates to Legend Query DataSpace editor
    await screen.findAllByText('LegacyCustomerProduct');
    const legacyChip = guaranteeNonNullable(
      guaranteeNonNullable(
        screen.getAllByText('LegacyCustomerProduct')[0],
      ).closest('.MuiChip-root'),
    );
    fireEvent.click(legacyChip);

    expect(mockVisitAddress).toHaveBeenCalledWith(
      expect.stringContaining(
        '/extensions/dataspace/com.example.legacy:legacy-customer-product:2.1.0/test::LegacyCustomerProduct/legacyContext',
      ),
    );
  });

  test('clicking a legacy data product chip with missing execution context falls back and logs a warning', async () => {
    const { MOCK__baseStore } = await setupFieldSearchTestComponent('legacy', {
      results: [
        {
          fieldName: 'legacyField',
          fieldType: 'STRING',
          dataProducts: [
            {
              path: 'test::LegacyWithoutContext',
              productType: DataProductSearchResultDetailsType.LEGACY,
              groupId: 'com.example.legacy',
              artifactId: 'legacy-without-context',
              versionId: '1.0.0',
              // defaultExecutionContext intentionally omitted to force fallback
            },
          ],
        },
      ],
      metadata: {
        total_count: 1,
        num_pages: 1,
        page_size: 12,
        page_number: 1,
        lakehouse_count: 0,
        legacy_count: 1,
        total_field_matches: 1,
        next_page_number: null,
        prev_page_number: null,
      },
    });

    const mockVisitAddress = jest.fn();
    MOCK__baseStore.applicationStore.navigationService.navigator.visitAddress =
      mockVisitAddress;
    const logWarnSpy = createSpy(
      MOCK__baseStore.applicationStore.logService,
      'warn',
    );

    await screen.findByText('legacyField');
    const legacyChip = guaranteeNonNullable(
      guaranteeNonNullable(
        screen.getAllByText('LegacyWithoutContext')[0],
      ).closest('.MuiChip-root'),
    );
    fireEvent.click(legacyChip);

    expect(mockVisitAddress).toHaveBeenCalledWith(
      expect.stringContaining(
        '/dataProduct/legacy/com.example.legacy:legacy-without-context:1.0.0/test::LegacyWithoutContext',
      ),
    );
    expect(logWarnSpy).toHaveBeenCalled();
  });

  test('hovering over a dataset chip shows the datasetDescription tooltip', async () => {
    await setupFieldSearchTestComponent('customer');

    // The legacy dataset chip has a datasetDescription set in mock data
    await screen.findByText('legacy_dataset');
    const datasetChip = guaranteeNonNullable(
      screen.getByText('legacy_dataset').closest('.MuiChip-root'),
    );
    fireEvent.mouseOver(datasetChip);

    await waitFor(() => {
      expect(
        screen.getByText('The legacy dataset for status tracking'),
      ).toBeDefined();
    });
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
    // LegacyCustomerProduct appears in both Data Products and Datasets columns
    expect(screen.getAllByText('LegacyCustomerProduct').length).toBeGreaterThan(
      0,
    );
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

  test('clicking a dataset chip navigates to Legend Query with execution context and class path for legacy', async () => {
    const { MOCK__baseStore } = await setupFieldSearchTestComponent('customer');

    const mockVisitAddress = jest.fn();
    MOCK__baseStore.applicationStore.navigationService.navigator.visitAddress =
      mockVisitAddress;

    // The legacy_dataset text is unique to the Datasets column
    await screen.findByText('legacy_dataset');
    const datasetChip = guaranteeNonNullable(
      screen.getByText('legacy_dataset').closest('.MuiChip-root'),
    );
    fireEvent.click(datasetChip);

    expect(mockVisitAddress).toHaveBeenCalledWith(
      expect.stringContaining(
        '/extensions/dataspace/com.example.legacy:legacy-customer-product:2.1.0/test::LegacyCustomerProduct/legacyContext',
      ),
    );
    expect(mockVisitAddress).toHaveBeenCalledWith(
      expect.stringContaining(
        'class=test::LegacyCustomerProduct::legacyStatus',
      ),
    );
  });

  test('clicking a dataset chip falls back to marketplace for lakehouse products', async () => {
    const { MOCK__baseStore } = await setupFieldSearchTestComponent('customer');

    const mockVisitAddress = jest.fn();
    MOCK__baseStore.applicationStore.navigationService.navigator.visitAddress =
      mockVisitAddress;

    // customers_core is a LAKEHOUSE dataset chip — no executionContextKey so fallback applies
    await screen.findByText('customers_core');
    const datasetChip = guaranteeNonNullable(
      screen.getByText('customers_core').closest('.MuiChip-root'),
    );
    fireEvent.click(datasetChip);

    expect(mockVisitAddress).toHaveBeenCalledWith(
      expect.stringContaining(
        '/dataProduct/deployed/LAKEHOUSE_CUSTOMER_PROFILE/101',
      ),
    );
  });

  test('datasets column show-more expands to reveal additional dataset chips', async () => {
    await setupFieldSearchTestComponent('customer');

    // First +1 More = Data Products column, second = Datasets column
    const showMoreButtons = await screen.findAllByText('+1 More');
    expect(showMoreButtons.length).toBeGreaterThanOrEqual(2);
    // Click the Datasets column toggle (index 1)
    fireEvent.click(guaranteeNonNullable(showMoreButtons[1]));

    // kyc is the datasetName of the third entry; previously hidden
    expect(await screen.findByText('kyc')).toBeDefined();
    expect(screen.getAllByText('Show Less').length).toBeGreaterThan(0);
  });

  test('distinct data products column deduplicates same-path entries', async () => {
    const response = {
      results: [
        {
          fieldName: 'amount',
          fieldType: 'FLOAT',
          dataProducts: [
            {
              path: 'model::TradeProduct',
              productType: DataProductSearchResultDetailsType.LAKEHOUSE,
              datasetName: 'trades_eod',
              dataProductId: 'LAKEHOUSE_TRADE',
              deploymentId: 300,
            },
            {
              path: 'model::TradeProduct',
              productType: DataProductSearchResultDetailsType.LAKEHOUSE,
              datasetName: 'trades_intraday',
              dataProductId: 'LAKEHOUSE_TRADE',
              deploymentId: 300,
            },
          ],
        },
      ],
      metadata: {
        total_count: 1,
        num_pages: 1,
        page_size: 12,
        page_number: 1,
        lakehouse_count: 2,
        legacy_count: 0,
        total_field_matches: 2,
        next_page_number: null,
        prev_page_number: null,
      },
    };

    await setupFieldSearchTestComponent('dedup', response);

    await screen.findByText('amount');

    const resultState = new FieldSearchResultState(
      response.results[0] as never,
    );
    expect(resultState.distinctDataProducts).toHaveLength(1);
    expect(resultState.distinctDataProducts[0]?.name).toBe('TradeProduct');

    // Both dataset chips are visible in the Datasets column
    expect(screen.getByText('trades_eod')).toBeDefined();
    expect(screen.getByText('trades_intraday')).toBeDefined();
  });

  test('distinct data products do not collapse when owning path is empty', () => {
    const resultState = new FieldSearchResultState({
      fieldName: 'legacyField',
      fieldType: 'STRING',
      dataProducts: [
        GroupedFieldSearchDataProduct.serialization.fromJson({
          path: 'test::LegacyProductA',
          productType: DataProductSearchResultDetailsType.ERROR,
        }),
        GroupedFieldSearchDataProduct.serialization.fromJson({
          path: 'test::LegacyProductB',
          productType: DataProductSearchResultDetailsType.ERROR,
        }),
      ],
    } as never);

    // ERROR product type maps to legacy filter, but owning path is empty.
    // Distinct fallback key should keep these as separate products.
    expect(resultState.dataProducts[0]?.path).toBe('');
    expect(resultState.dataProducts[1]?.path).toBe('');
    expect(resultState.distinctDataProducts).toHaveLength(2);
    expect(resultState.distinctDataProducts[0]?.name).toBe('LegacyProductA');
    expect(resultState.distinctDataProducts[1]?.name).toBe('LegacyProductB');
  });

  test('clicking the Data Products tab navigates back to product search', async () => {
    const { MOCK__baseStore } = await setupFieldSearchTestComponent('customer');
    const mockGoToLocation = jest.fn();
    MOCK__baseStore.applicationStore.navigationService.navigator.goToLocation =
      mockGoToLocation;

    await screen.findByText('4 Fields');
    fireEvent.click(screen.getByRole('radio', { name: 'Data Products' }));

    expect(mockGoToLocation).toHaveBeenCalledWith(
      generateLakehouseSearchResultsRoute('customer', false),
    );
  });

  test('changing page requests the selected page from field search', async () => {
    const { MOCK__baseStore } = await setupFieldSearchTestComponent('paged', {
      results: [
        {
          fieldName: 'pageField',
          fieldType: 'STRING',
          dataProducts: [
            {
              path: 'model::PagedProduct',
              productType: DataProductSearchResultDetailsType.LAKEHOUSE,
              dataProductId: 'LAKEHOUSE_PAGED',
              deploymentId: 700,
            },
          ],
        },
      ],
      metadata: {
        total_count: 25,
        num_pages: 3,
        page_size: 12,
        page_number: 1,
        lakehouse_count: 25,
        legacy_count: 0,
        total_field_matches: 25,
        next_page_number: 2,
        prev_page_number: null,
      },
    });

    await screen.findByText('25 Fields');
    fireEvent.click(screen.getByRole('button', { name: /go to page 2/i }));

    await waitFor(() => {
      expect(
        MOCK__baseStore.marketplaceServerClient.fieldSearch,
      ).toHaveBeenLastCalledWith(
        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        expect.objectContaining({
          query: 'paged',
          pageNumber: 2,
          pageSize: 12,
        }),
        expect.anything(),
      );
    });
  });

  test('changing items per page requests the selected page size', async () => {
    const { MOCK__baseStore } = await setupFieldSearchTestComponent('sized', {
      results: [
        {
          fieldName: 'sizeField',
          fieldType: 'STRING',
          dataProducts: [
            {
              path: 'model::SizedProduct',
              productType: DataProductSearchResultDetailsType.LAKEHOUSE,
              dataProductId: 'LAKEHOUSE_SIZED',
              deploymentId: 701,
            },
          ],
        },
      ],
      metadata: {
        total_count: 25,
        num_pages: 3,
        page_size: 12,
        page_number: 1,
        lakehouse_count: 25,
        legacy_count: 0,
        total_field_matches: 25,
        next_page_number: 2,
        prev_page_number: null,
      },
    });

    await screen.findByText('25 Fields');
    const itemsPerPageContainer = guaranteeNonNullable(
      screen.getByText('Items per page:').parentElement,
    );
    fireEvent.mouseDown(within(itemsPerPageContainer).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: '24' }));

    await waitFor(() => {
      expect(
        MOCK__baseStore.marketplaceServerClient.fieldSearch,
      ).toHaveBeenLastCalledWith(
        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        expect.objectContaining({
          query: 'sized',
          pageNumber: 1,
          pageSize: 24,
        }),
        expect.anything(),
      );
    });
  });

  test('renders empty placeholder when a field result has no datasets', async () => {
    await setupFieldSearchTestComponent('empty', {
      results: [
        {
          fieldName: 'emptyField',
          fieldType: 'STRING',
          dataProducts: [],
        },
      ],
      metadata: {
        total_count: 1,
        num_pages: 1,
        page_size: 12,
        page_number: 1,
        lakehouse_count: 0,
        legacy_count: 0,
        total_field_matches: 1,
        next_page_number: null,
        prev_page_number: null,
      },
    });

    await screen.findByText('emptyField');
    // Both Data Products and Datasets columns should show the empty placeholder '-'
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2);
  });

  test('renders Unknown type and dash description when fieldType and fieldDescription are absent', async () => {
    await setupFieldSearchTestComponent('unknown', {
      results: [
        {
          fieldName: 'mysteryField',
          dataProducts: [
            {
              path: 'model::MysteryProduct',
              productType: DataProductSearchResultDetailsType.LAKEHOUSE,
              dataProductId: 'LAKEHOUSE_MYSTERY',
              deploymentId: 500,
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

    await screen.findByText('mysteryField');
    expect(screen.getByText('Unknown')).toBeDefined();
    expect(screen.getByText('-')).toBeDefined();
  });

  test('truncates long field descriptions and shows expand/collapse toggle', async () => {
    const longDesc = 'A'.repeat(200);
    await setupFieldSearchTestComponent('long', {
      results: [
        {
          fieldName: 'longField',
          fieldType: 'STRING',
          fieldDescription: longDesc,
          dataProducts: [
            {
              path: 'model::LongProduct',
              productType: DataProductSearchResultDetailsType.LAKEHOUSE,
              dataProductId: 'LAKEHOUSE_LONG',
              deploymentId: 600,
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

    await screen.findByText('longField');

    // Description is truncated, "Show more" button appears
    expect(screen.getByText('Show more')).toBeDefined();
    expect(screen.queryByText(longDesc)).toBeNull();

    // Expand the description
    fireEvent.click(screen.getByText('Show more'));
    expect(await screen.findByText(longDesc)).toBeDefined();
    expect(screen.getByText('Show less')).toBeDefined();

    // Collapse again
    fireEvent.click(screen.getByText('Show less'));
    await waitFor(() => expect(screen.queryByText(longDesc)).toBeNull());
  });

  test('submitting an empty query does not trigger another search or navigation', async () => {
    const { MOCK__baseStore, fieldSearchSpy } =
      await setupFieldSearchTestComponent('customer');
    const mockGoToLocation = jest.fn();
    MOCK__baseStore.applicationStore.navigationService.navigator.goToLocation =
      mockGoToLocation;

    await screen.findByText('4 Fields');
    const initialCallCount = fieldSearchSpy.mock.calls.length;

    fireEvent.change(screen.getByDisplayValue('customer'), {
      target: { value: '' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTitle('Search'));
    });

    expect(fieldSearchSpy.mock.calls.length).toBe(initialCallCount);
    expect(mockGoToLocation).not.toHaveBeenCalled();
  });

  test('field search serialization keeps optional dataset query fields', () => {
    const dataProduct = GroupedFieldSearchDataProduct.serialization.fromJson({
      path: 'model::SerializedProduct',
      productType: DataProductSearchResultDetailsType.LEGACY,
      datasetName: 'serialized_dataset',
      datasetDescription: 'Serialized dataset description',
      defaultExecutionContext: 'serializedContext',
      groupId: 'com.example',
      artifactId: 'serialized-artifact',
      versionId: '1.0.0',
      modelPath: 'model::SerializedProduct::field',
      dataProductId: 'dp-serialized',
      deploymentId: 88,
    });

    expect(dataProduct.datasetName).toBe('serialized_dataset');
    expect(dataProduct.datasetDescription).toBe(
      'Serialized dataset description',
    );
    expect(dataProduct.defaultExecutionContext).toBe('serializedContext');
    expect(dataProduct.modelPath).toBe('model::SerializedProduct::field');
    expect(dataProduct.dataProductId).toBe('dp-serialized');
    expect(dataProduct.deploymentId).toBe(88);
  });

  test('field search response serialization keeps nested optional fields', () => {
    const response = GroupedFieldSearchResponse.serialization.fromJson({
      results: [
        {
          fieldName: 'amount',
          fieldType: 'FLOAT',
          fieldDescription: 'Trade amount',
          dataProducts: [
            {
              path: 'trade::Dataspace',
              productType: DataProductSearchResultDetailsType.LEGACY,
              datasetDescription: 'All trade records',
              defaultExecutionContext: 'tradeContext',
              modelPath: 'trade::model::Trade',
            },
          ],
        },
      ],
      metadata: {
        total_count: 1,
        num_pages: 1,
        page_size: 12,
        page_number: 1,
        lakehouse_count: 0,
        legacy_count: 1,
        total_field_matches: 1,
        next_page_number: null,
        prev_page_number: null,
      },
    });

    expect(response.results).toHaveLength(1);
    expect(response.results[0]?.dataProducts[0]?.datasetDescription).toBe(
      'All trade records',
    );
    expect(response.results[0]?.dataProducts[0]?.defaultExecutionContext).toBe(
      'tradeContext',
    );
    expect(response.results[0]?.dataProducts[0]?.modelPath).toBe(
      'trade::model::Trade',
    );
  });

  test('field search result state defaults missing values and maps error products to legacy filter', () => {
    const resultState = new FieldSearchResultState({
      fieldName: 'mysteryField',
      dataProducts: [
        GroupedFieldSearchDataProduct.serialization.fromJson({
          path: 'model::ErrorProduct',
          productType: DataProductSearchResultDetailsType.ERROR,
          groupId: 'com.error',
          artifactId: 'error-artifact',
          versionId: '0.1.0',
        }),
      ],
    } as never);

    expect(resultState.fieldType).toBe('Unknown');
    expect(resultState.fieldDescription).toBe('-');
    expect(resultState.dataProducts[0]?.productType).toBe(
      DataProductTypeFilter.LEGACY,
    );
    expect(resultState.dataProducts[0]?.path).toBe('');
  });

  test('data product entries omit dataset secondary text when dataset name is absent', () => {
    const dataProductEntry = new FieldSearchDataProductEntry(
      GroupedFieldSearchDataProduct.serialization.fromJson({
        path: 'model::DatasetlessProduct',
        productType: DataProductSearchResultDetailsType.LAKEHOUSE,
        dataProductId: 'LAKEHOUSE_DATASETLESS',
        deploymentId: 901,
      }),
    );

    expect(dataProductEntry.name).toBe('DatasetlessProduct');
    expect(dataProductEntry.datasetName).toBeUndefined();
    expect(dataProductEntry.entityPath).toBe('model::DatasetlessProduct');
  });
});
