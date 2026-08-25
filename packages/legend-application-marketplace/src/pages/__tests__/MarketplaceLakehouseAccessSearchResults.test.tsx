/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import { act, fireEvent, screen, within } from '@testing-library/react';
import { useSearchParams } from '@finos/legend-application/browser';
import {
  TEST__provideMockLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { type PlainObject } from '@finos/legend-shared';
import { createSpy } from '@finos/legend-shared/test';
import {
  mockLakehouseAccessFilteredSearchResultResponse,
  mockLakehouseAccessSearchResultResponse,
} from '../../components/__test-utils__/TEST_DATA__LakehouseSearchResultData.js';
import type { IngestDeploymentServerConfig } from '@finos/legend-server-lakehouse';
import type { DataProductSearchResponse } from '@finos/legend-server-marketplace';
import {
  generateLakehouseAccessSearchResultsRoute,
  LEGEND_MARKETPLACE_ROUTE_PATTERN,
} from '../../__lib__/LegendMarketplaceNavigation.js';

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

const flushMicrotasks = (): Promise<void> =>
  new Promise((resolve) => queueMicrotask(resolve));

const setupTestComponent = async (
  // `undefined` means the route carries no `query` param at all, which is how the
  // header tab links to this page.
  query: string | undefined,
  dataProductEnv: 'prod' | 'prod-par' | 'dev' = 'prod',
  searchResponse: PlainObject<DataProductSearchResponse> = mockLakehouseAccessSearchResultResponse,
) => {
  const MOCK__baseStore = await TEST__provideMockLegendMarketplaceBaseStore({
    dataProductEnv,
  });
  mockUseSearchParams.mockReturnValue([
    new URLSearchParams(query === undefined ? {} : { query }),
    mockSetSearchParams,
  ]);

  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'lakehouseAccessSearch',
  ).mockResolvedValue(searchResponse);

  // The unified endpoint must never be hit from this page.
  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'dataProductSearch',
  ).mockResolvedValue(mockLakehouseAccessSearchResultResponse);

  const mockEnvironment: PlainObject<IngestDeploymentServerConfig> = {
    ingestEnvironmentUrn: 'production-analytics',
    environmentClassification: 'prod',
    ingestServerUrl: 'https://test-prod-ingest-server.com',
    environmentName: 'production-analytics',
  };
  createSpy(
    MOCK__baseStore.lakehousePlatformServerClient,
    'findProducerServer',
  ).mockResolvedValue(mockEnvironment);
  createSpy(
    MOCK__baseStore.lakehouseContractServerClient,
    'getOwnersForDid',
  ).mockResolvedValue({ owners: [] });

  const { renderResult } = await TEST__setUpMarketplaceLakehouse(
    MOCK__baseStore,
    query === undefined
      ? LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ACCESS_SEARCH_RESULTS
      : generateLakehouseAccessSearchResultsRoute(query),
  );

  return { MOCK__baseStore, renderResult };
};

beforeEach(() => {
  localStorage.clear();
  mockUseSearchParams.mockReset();
  mockSetSearchParams.mockReset();
});

describe('MarketplaceLakehouseAccessSearchResults', () => {
  test('renders search box pre-filled from the URL query param', async () => {
    await setupTestComponent('data');

    expect(screen.getByDisplayValue('data')).toBeDefined();
  });

  test('submitting a new query updates the store and re-searches', async () => {
    const { MOCK__baseStore } = await setupTestComponent('data');

    await screen.findByText('2 Products');
    (
      MOCK__baseStore.marketplaceServerClient.lakehouseAccessSearch as jest.Mock
    ).mockClear();

    const searchInput = screen.getByDisplayValue('data');
    fireEvent.change(searchInput, { target: { value: 'orders' } });
    await act(async () => {
      fireEvent.submit(searchInput.closest('form') as HTMLFormElement);
      await flushMicrotasks();
    });

    expect(
      MOCK__baseStore.marketplaceServerClient.lakehouseAccessSearch,
    ).toHaveBeenCalledWith(
      'orders',
      expect.anything(),
      expect.objectContaining({ searchType: 'full_text' }),
    );
  });

  test('searches with an empty query when the route carries no query param', async () => {
    // Reaching this page from the header tab yields a bare `/lakehouseAccess/results`.
    // The page must still run a search; otherwise the search action never leaves its
    // initial state and the page spins forever with no network call.
    const { MOCK__baseStore } = await setupTestComponent(undefined);

    await screen.findByText('2 Products');

    expect(
      MOCK__baseStore.marketplaceServerClient.lakehouseAccessSearch,
    ).toHaveBeenCalledTimes(1);
    expect(
      MOCK__baseStore.marketplaceServerClient.lakehouseAccessSearch,
    ).toHaveBeenCalledWith(
      '',
      expect.anything(),
      expect.objectContaining({
        searchType: 'full_text',
        searchFilters: [],
        pageSize: 12,
        pageNumber: 1,
        showAll: false,
      }),
    );
  });

  test('does not render the loading indicator once the search resolves', async () => {
    await setupTestComponent(undefined);

    await screen.findByText('2 Products');

    expect(
      document.querySelector(
        '.marketplace-lakehouse-search-results__loading-data-products-indicator',
      ),
    ).toBeNull();
  });

  test('searches via lakehouseAccessSearch and never the unified endpoint', async () => {
    const { MOCK__baseStore } = await setupTestComponent('data');

    await screen.findByText('2 Products');

    expect(
      MOCK__baseStore.marketplaceServerClient.lakehouseAccessSearch,
    ).toHaveBeenCalledTimes(1);
    expect(
      MOCK__baseStore.marketplaceServerClient.dataProductSearch,
    ).not.toHaveBeenCalled();
  });

  test('uses the full-text search path with no filters by default', async () => {
    const { MOCK__baseStore } = await setupTestComponent('data');

    await screen.findByText('2 Products');

    expect(
      MOCK__baseStore.marketplaceServerClient.lakehouseAccessSearch,
    ).toHaveBeenCalledWith(
      'data',
      expect.anything(),
      expect.objectContaining({
        searchType: 'full_text',
        searchFilters: [],
        pageSize: 12,
        pageNumber: 1,
        showAll: false,
      }),
    );
  });

  test('renders only lakehouse data products', async () => {
    await setupTestComponent('data');

    expect(
      await screen.findByText('Lakehouse SDLC Data Product'),
    ).toBeDefined();
    // The prod fixture's legacy (DataSpace) entries must not appear here.
    expect(screen.queryByText('Legacy Data Product')).toBeNull();
  });

  test('shows an intro banner explaining the rename from Data Product', async () => {
    await setupTestComponent('data');

    expect(
      await screen.findByText(
        /This is the new home for what was previously called Data Product/,
      ),
    ).toBeDefined();
  });

  test('does not offer producer search or field search settings', async () => {
    await setupTestComponent('data');

    await screen.findByText('2 Products');

    expect(screen.queryByTitle('Search settings')).toBeNull();
  });

  test('does not render the Data Products / Data Fields selector', async () => {
    await setupTestComponent('data');

    await screen.findByText('2 Products');

    expect(screen.queryByLabelText('Search result type')).toBeNull();
  });

  describe('Filters', () => {
    test('renders Source and Deployment ID sections but no Taxonomy', async () => {
      await setupTestComponent('data');

      await screen.findByText('2 Products');

      const filterPanel = document.querySelector(
        '.marketplace-search-filters-panel',
      ) as HTMLElement;
      const panel = within(filterPanel);

      expect(panel.getByText('Filters')).toBeDefined();
      expect(panel.getByText('Source')).toBeDefined();
      expect(panel.getByText('External')).toBeDefined();
      expect(panel.getByText('Internal')).toBeDefined();
      expect(panel.getByText('Deployment ID')).toBeDefined();
      // Taxonomy is built server-side unscoped by product type, so it would
      // describe the DataSpace corpus rather than this tab's results.
      expect(panel.queryByText('Taxonomy')).toBeNull();
    });

    test('applying a deployment ID re-searches with a deployment_id filter', async () => {
      const { MOCK__baseStore } = await setupTestComponent('data');

      await screen.findByText('2 Products');
      (
        MOCK__baseStore.marketplaceServerClient
          .lakehouseAccessSearch as jest.Mock
      ).mockClear();

      const deploymentInput = screen.getByLabelText('Deployment ID');
      await act(async () => {
        fireEvent.change(deploymentInput, { target: { value: '12345' } });
        fireEvent.keyDown(deploymentInput, { key: 'Enter' });
        await flushMicrotasks();
      });

      expect(
        MOCK__baseStore.marketplaceServerClient.lakehouseAccessSearch,
      ).toHaveBeenCalledWith(
        'data',
        expect.anything(),
        expect.objectContaining({
          searchType: 'full_text',
          searchFilters: ['deployment_id=12345'],
          pageSize: 12,
          pageNumber: 1,
          showAll: false,
        }),
      );
    });

    test('applying a deployment ID on blur re-searches with a deployment_id filter', async () => {
      const { MOCK__baseStore } = await setupTestComponent('data');

      await screen.findByText('2 Products');
      (
        MOCK__baseStore.marketplaceServerClient
          .lakehouseAccessSearch as jest.Mock
      ).mockClear();

      const deploymentInput = screen.getByLabelText('Deployment ID');
      await act(async () => {
        fireEvent.change(deploymentInput, { target: { value: '12345' } });
        fireEvent.blur(deploymentInput);
        await flushMicrotasks();
      });

      expect(
        MOCK__baseStore.marketplaceServerClient.lakehouseAccessSearch,
      ).toHaveBeenCalledWith(
        'data',
        expect.anything(),
        expect.objectContaining({
          searchFilters: ['deployment_id=12345'],
        }),
      );
    });

    test('an applied deployment ID renders as a chip', async () => {
      await setupTestComponent('data');

      await screen.findByText('2 Products');

      const deploymentInput = screen.getByLabelText('Deployment ID');
      await act(async () => {
        fireEvent.change(deploymentInput, { target: { value: '12345' } });
        fireEvent.keyDown(deploymentInput, { key: 'Enter' });
        await flushMicrotasks();
      });

      const filterPanel = document.querySelector(
        '.marketplace-search-filters-panel',
      ) as HTMLElement;
      expect(within(filterPanel).getByText('12345')).toBeDefined();
      // The input clears so the next ID can be typed straight in.
      expect((deploymentInput as HTMLInputElement).value).toBe('');
    });

    test('clicking a source filter re-searches with that filter', async () => {
      const { MOCK__baseStore } = await setupTestComponent('data');

      await screen.findByText('2 Products');
      (
        MOCK__baseStore.marketplaceServerClient
          .lakehouseAccessSearch as jest.Mock
      ).mockClear();

      const filterPanel = document.querySelector(
        '.marketplace-search-filters-panel',
      ) as HTMLElement;
      await act(async () => {
        fireEvent.click(within(filterPanel).getByText('External'));
        await flushMicrotasks();
      });

      expect(
        MOCK__baseStore.marketplaceServerClient.lakehouseAccessSearch,
      ).toHaveBeenCalledWith(
        'data',
        expect.anything(),
        expect.objectContaining({
          searchType: 'full_text',
          searchFilters: ['data_product_source=External'],
          pageSize: 12,
          pageNumber: 1,
          showAll: false,
        }),
      );
    });

    test('Internal count reads internal_source_count rather than deriving it from the total', async () => {
      // total_count (1) is below external_source_count (2), so the old
      // `total_count - external_source_count` formula yields -1 and — because the
      // count only renders when > 0 — would silently show no count at all.
      await setupTestComponent(
        'data',
        'prod',
        mockLakehouseAccessFilteredSearchResultResponse,
      );

      await screen.findByText('1 Products');

      const filterPanel = document.querySelector(
        '.marketplace-search-filters-panel',
      ) as HTMLElement;

      const internalRow = within(filterPanel)
        .getByText('Internal')
        .closest('.marketplace-search-filters-panel__section__option');
      const externalRow = within(filterPanel)
        .getByText('External')
        .closest('.marketplace-search-filters-panel__section__option');

      expect(within(internalRow as HTMLElement).getByText('3')).toBeDefined();
      expect(within(externalRow as HTMLElement).getByText('2')).toBeDefined();
    });
  });

  describe('Product cards', () => {
    test('clicking a product card navigates to the data product viewer', async () => {
      const { MOCK__baseStore } = await setupTestComponent('data');

      const mockVisitAddress = jest.fn();
      MOCK__baseStore.applicationStore.navigationService.navigator.visitAddress =
        mockVisitAddress;

      const title = (
        await screen.findAllByText('Lakehouse SDLC Data Product')
      )[0] as HTMLElement;
      fireEvent.click(title);

      expect(mockVisitAddress).toHaveBeenCalledWith(
        expect.stringContaining(
          '/dataProduct/deployed/LAKEHOUSE_SDLC_DATA_PRODUCT/12345',
        ),
      );
    });
  });

  describe('View toggle', () => {
    test('tile view is active by default', async () => {
      await setupTestComponent('data');

      await screen.findByText('2 Products');

      expect(screen.getByTitle('Tile View').className).toContain(
        'legend-marketplace-search-results__view-toggle__btn--active',
      );
    });

    test('clicking List View switches the store to list mode', async () => {
      await setupTestComponent('data');

      await screen.findByText('2 Products');

      await act(async () => {
        fireEvent.click(screen.getByTitle('List View'));
      });

      expect(screen.getByTitle('List View').className).toContain(
        'legend-marketplace-search-results__view-toggle__btn--active',
      );
      expect(screen.getByTitle('Tile View').className).not.toContain(
        'legend-marketplace-search-results__view-toggle__btn--active',
      );
      expect(
        document.querySelector(
          '.marketplace-lakehouse-search-results__list-view',
        ),
      ).not.toBeNull();
    });

    test('clicking Tile View switches back to tile mode', async () => {
      await setupTestComponent('data');

      await screen.findByText('2 Products');
      await act(async () => {
        fireEvent.click(screen.getByTitle('List View'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Tile View'));
      });

      expect(screen.getByTitle('Tile View').className).toContain(
        'legend-marketplace-search-results__view-toggle__btn--active',
      );
      expect(screen.getByTitle('List View').className).not.toContain(
        'legend-marketplace-search-results__view-toggle__btn--active',
      );
    });
  });

  describe('Sort', () => {
    test('selecting a sort option re-sorts the results client-side', async () => {
      const { MOCK__baseStore } = await setupTestComponent('data');

      await screen.findByText('2 Products');
      (
        MOCK__baseStore.marketplaceServerClient
          .lakehouseAccessSearch as jest.Mock
      ).mockClear();

      fireEvent.mouseDown(screen.getByText('Sort'));
      fireEvent.click(screen.getByText('Name Z-A'));

      // Sorting is client-side: it must not trigger another network search.
      expect(
        MOCK__baseStore.marketplaceServerClient.lakehouseAccessSearch,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Empty state', () => {
    test('shows a no-results message when the search returns nothing', async () => {
      await setupTestComponent('data', 'prod', {
        results: [],
        as_of_time: '2026-01-27T00:00:00.000Z',
        metadata: {
          next_page_number: null,
          num_pages: 0,
          page_number: 1,
          page_size: 12,
          prev_page_number: null,
          total_count: 0,
        },
      });

      expect(await screen.findByText('No results found')).toBeDefined();
    });
  });

  describe('Pagination', () => {
    test('changing page re-searches with the new page number', async () => {
      const { MOCK__baseStore } = await setupTestComponent(
        'data',
        'prod',
        // 25 items over 12 per page gives more than one page
        {
          ...mockLakehouseAccessSearchResultResponse,
          metadata: {
            ...(mockLakehouseAccessSearchResultResponse.metadata as Record<
              string,
              unknown
            >),
            total_count: 25,
            num_pages: 3,
            page_size: 12,
            next_page_number: 2,
          },
        },
      );

      await screen.findByText('25 Products');
      (
        MOCK__baseStore.marketplaceServerClient
          .lakehouseAccessSearch as jest.Mock
      ).mockClear();

      await act(async () => {
        fireEvent.click(screen.getByLabelText('Go to next page'));
        await flushMicrotasks();
      });

      expect(
        MOCK__baseStore.marketplaceServerClient.lakehouseAccessSearch,
      ).toHaveBeenCalledWith(
        'data',
        expect.anything(),
        expect.objectContaining({
          searchType: 'full_text',
          searchFilters: [],
          pageSize: 12,
          pageNumber: 2,
          showAll: false,
        }),
      );
    });

    test('changing items per page re-searches with the new page size', async () => {
      const { MOCK__baseStore } = await setupTestComponent('data', 'prod', {
        ...mockLakehouseAccessSearchResultResponse,
        metadata: {
          ...(mockLakehouseAccessSearchResultResponse.metadata as Record<
            string,
            unknown
          >),
          total_count: 25,
          num_pages: 3,
        },
      });

      await screen.findByText('25 Products');
      (
        MOCK__baseStore.marketplaceServerClient
          .lakehouseAccessSearch as jest.Mock
      ).mockClear();

      const paginationContainer = screen
        .getByText('Items per page:')
        .closest('.legend-marketplace-pagination-page-size');
      const itemsPerPageSelect = (
        paginationContainer as HTMLElement
      ).querySelector('[role="combobox"]') as HTMLElement;
      fireEvent.mouseDown(itemsPerPageSelect);

      await act(async () => {
        fireEvent.click(screen.getByRole('option', { name: '48' }));
        await flushMicrotasks();
      });

      expect(
        MOCK__baseStore.marketplaceServerClient.lakehouseAccessSearch,
      ).toHaveBeenCalledWith(
        'data',
        expect.anything(),
        expect.objectContaining({ pageSize: 48, pageNumber: 1 }),
      );
    });
  });

  describe('Show all', () => {
    test('clicking show all re-searches with show_all=true', async () => {
      const { MOCK__baseStore } = await setupTestComponent('data', 'prod', {
        ...mockLakehouseAccessSearchResultResponse,
        metadata: {
          ...(mockLakehouseAccessSearchResultResponse.metadata as Record<
            string,
            unknown
          >),
          has_filtered_products: true,
        },
      });

      await screen.findByText('Show all data products');
      (
        MOCK__baseStore.marketplaceServerClient
          .lakehouseAccessSearch as jest.Mock
      ).mockClear();

      await act(async () => {
        fireEvent.click(screen.getByText('Show all data products'));
        await flushMicrotasks();
      });

      expect(
        MOCK__baseStore.marketplaceServerClient.lakehouseAccessSearch,
      ).toHaveBeenCalledWith(
        'data',
        expect.anything(),
        expect.objectContaining({ showAll: true }),
      );
    });
  });
});
