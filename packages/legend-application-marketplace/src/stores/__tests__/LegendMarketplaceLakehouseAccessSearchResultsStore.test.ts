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

import { describe, expect, test } from '@jest/globals';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { LegendMarketplaceLakehouseAccessSearchResultsStore } from '../lakehouse/LegendMarketplaceLakehouseAccessSearchResultsStore.js';
import {
  DataProductSourceFilter,
  SearchResultsViewMode,
} from '../lakehouse/LegendMarketplaceSearchResultsStore.js';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';

const setupStore = async (): Promise<{
  store: LegendMarketplaceLakehouseAccessSearchResultsStore;
  baseStore: LegendMarketplaceBaseStore;
}> => {
  const baseStore = await TEST__provideMockLegendMarketplaceBaseStore({
    dataProductEnv: 'prod',
  });
  const store = new LegendMarketplaceLakehouseAccessSearchResultsStore(
    baseStore,
  );
  return { store, baseStore };
};

describe('LegendMarketplaceLakehouseAccessSearchResultsStore - search filters', () => {
  test('emits no filters when nothing is selected', async () => {
    const { store } = await setupStore();

    expect(store.buildSearchFilters()).toEqual([]);
  });

  test('emits data_product_source for selected sources', async () => {
    const { store } = await setupStore();

    store.toggleSource(DataProductSourceFilter.EXTERNAL);

    expect(store.buildSearchFilters()).toEqual([
      'data_product_source=External',
    ]);
  });

  test('emits deployment_id for applied deployment IDs', async () => {
    const { store } = await setupStore();

    store.addDeploymentId('12345');

    expect(store.buildSearchFilters()).toEqual(['deployment_id=12345']);
  });

  test('emits source and deployment filters together', async () => {
    const { store } = await setupStore();

    store.toggleSource(DataProductSourceFilter.INTERNAL);
    store.addDeploymentId('12345');

    expect(store.buildSearchFilters()).toEqual([
      'data_product_source=Internal',
      'deployment_id=12345',
    ]);
  });

  test('never emits data_product_type or taxonomy', async () => {
    const { store } = await setupStore();

    store.toggleSource(DataProductSourceFilter.INTERNAL);
    store.addDeploymentId('12345');

    const filters = store.buildSearchFilters();
    expect(
      filters.some((filter) => filter.startsWith('data_product_type=')),
    ).toBe(false);
    expect(filters.some((filter) => filter.startsWith('taxonomy='))).toBe(
      false,
    );
  });

  test('does not expose product-type, producer-search, or taxonomy state', async () => {
    const { store } = await setupStore();

    // All three are meaningless on a lakehouse-only tab; their absence is intentional.
    // Taxonomy in particular is built server-side unscoped by product type, so its
    // nodes would describe the DataSpace corpus rather than what this tab shows.
    expect('selectedDataProductTypes' in store).toBe(false);
    expect('useProducerSearch' in store).toBe(false);
    expect('taxonomyTree' in store).toBe(false);
    expect('selectedTaxonomyNodeIds' in store).toBe(false);
  });
});

describe('LegendMarketplaceLakehouseAccessSearchResultsStore - deployment IDs', () => {
  test('splits a comma-separated entry into individual IDs', async () => {
    const { store } = await setupStore();

    store.addDeploymentId('12345, 67890 ,  ');

    expect(Array.from(store.selectedDeploymentIds)).toEqual(['12345', '67890']);
    expect(store.buildSearchFilters()).toEqual(['deployment_id=12345,67890']);
  });

  test('ignores duplicates and blank entries', async () => {
    const { store } = await setupStore();

    store.addDeploymentId('12345');
    store.addDeploymentId(' 12345 ');
    store.addDeploymentId('   ');

    expect(store.selectedDeploymentIds.size).toBe(1);
  });

  test('removeDeploymentId drops a single ID', async () => {
    const { store } = await setupStore();
    store.addDeploymentId('12345,67890');

    store.removeDeploymentId('12345');

    expect(Array.from(store.selectedDeploymentIds)).toEqual(['67890']);
  });
});

describe('LegendMarketplaceLakehouseAccessSearchResultsStore - filters', () => {
  test('toggleSource adds then removes a source', async () => {
    const { store } = await setupStore();

    store.toggleSource(DataProductSourceFilter.EXTERNAL);
    expect(store.selectedSources.has(DataProductSourceFilter.EXTERNAL)).toBe(
      true,
    );
    expect(store.hasActiveFilters).toBe(true);

    store.toggleSource(DataProductSourceFilter.EXTERNAL);
    expect(store.selectedSources.has(DataProductSourceFilter.EXTERNAL)).toBe(
      false,
    );
    expect(store.hasActiveFilters).toBe(false);
  });

  test('a deployment ID alone counts as an active filter', async () => {
    const { store } = await setupStore();

    expect(store.hasActiveFilters).toBe(false);
    store.addDeploymentId('12345');
    expect(store.hasActiveFilters).toBe(true);
  });

  test('clearAllFilters clears sources and deployment IDs', async () => {
    const { store } = await setupStore();
    store.toggleSource(DataProductSourceFilter.EXTERNAL);
    store.addDeploymentId('12345');
    expect(store.hasActiveFilters).toBe(true);

    store.clearAllFilters();

    expect(store.selectedSources.size).toBe(0);
    expect(store.selectedDeploymentIds.size).toBe(0);
    expect(store.hasActiveFilters).toBe(false);
  });
});

describe('LegendMarketplaceLakehouseAccessSearchResultsStore - pagination and view', () => {
  test('isOnLastPage is false when there are no results', async () => {
    const { store } = await setupStore();

    expect(store.isOnLastPage).toBe(false);
  });

  test('isOnLastPage reflects the current page', async () => {
    const { store } = await setupStore();
    store.setTotalItems(25);
    store.setItemsPerPage(12);

    store.setPage(2);
    expect(store.isOnLastPage).toBe(false);

    store.setPage(3);
    expect(store.isOnLastPage).toBe(true);
  });

  test('setItemsPerPage resets to the first page', async () => {
    const { store } = await setupStore();
    store.setPage(4);

    store.setItemsPerPage(24);

    expect(store.itemsPerPage).toBe(24);
    expect(store.page).toBe(1);
  });

  test('view mode defaults to tile and persists when changed', async () => {
    const { store, baseStore } = await setupStore();

    expect(store.viewMode).toBe(SearchResultsViewMode.TILE);

    store.setViewMode(SearchResultsViewMode.LIST);

    expect(store.viewMode).toBe(SearchResultsViewMode.LIST);
    expect(
      baseStore.applicationStore.settingService.getStringValue(
        'marketplace.search-results.viewMode',
      ),
    ).toBe(SearchResultsViewMode.LIST);
  });
});
