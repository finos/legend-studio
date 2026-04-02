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
import {
  LegendMarketplaceSearchResultsStore,
  SearchResultsViewMode,
  DataProductTypeFilter,
  DataProductSourceFilter,
} from '../lakehouse/LegendMarketplaceSearchResultsStore.js';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import { mockTaxonomyTreeResponse } from '../../components/__test-utils__/TEST_DATA__LakehouseSearchResultData.js';
import { ProductCardState } from '../lakehouse/dataProducts/ProductCardState.js';
import {
  DataProductSearchResult,
  LakehouseDataProductSearchResultDetails,
  LakehouseAdHocDataProductSearchResultOrigin,
} from '@finos/legend-server-marketplace';
import {
  V1_EntitlementsLakehouseEnvironmentType,
  type V1_PureGraphManager,
} from '@finos/legend-graph';

const setupStore = async (): Promise<{
  store: LegendMarketplaceSearchResultsStore;
  baseStore: LegendMarketplaceBaseStore;
}> => {
  const baseStore = await TEST__provideMockLegendMarketplaceBaseStore({
    dataProductEnv: 'prod',
  });
  const store = new LegendMarketplaceSearchResultsStore(baseStore);
  return { store, baseStore };
};

describe('LegendMarketplaceSearchResultsStore - Taxonomy', () => {
  describe('setTaxonomyTree', () => {
    test('sets taxonomy tree on store', async () => {
      const { store } = await setupStore();

      expect(store.taxonomyTree).toHaveLength(0);
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);
      expect(store.taxonomyTree).toHaveLength(2);
    });
  });

  describe('setSelectedTaxonomyNodeIds', () => {
    test('sets selected node IDs', async () => {
      const { store } = await setupStore();

      expect(store.selectedTaxonomyNodeIds.size).toBe(0);
      store.setSelectedTaxonomyNodeIds(['referenceData', 'derivedData']);
      expect(store.selectedTaxonomyNodeIds.size).toBe(2);
      expect(store.selectedTaxonomyNodeIds.has('referenceData')).toBe(true);
      expect(store.selectedTaxonomyNodeIds.has('derivedData')).toBe(true);
    });

    test('clears selected node IDs with empty array', async () => {
      const { store } = await setupStore();

      store.setSelectedTaxonomyNodeIds(['referenceData']);
      expect(store.selectedTaxonomyNodeIds.size).toBe(1);

      store.setSelectedTaxonomyNodeIds([]);
      expect(store.selectedTaxonomyNodeIds.size).toBe(0);
    });
  });

  describe('toggleTaxonomyNode', () => {
    test('selecting a leaf node adds it and all ancestor nodes', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleTaxonomyNode('referenceData::marketData::esg');

      expect(
        store.selectedTaxonomyNodeIds.has('referenceData::marketData::esg'),
      ).toBe(true);
      expect(
        store.selectedTaxonomyNodeIds.has('referenceData::marketData'),
      ).toBe(true);
      expect(store.selectedTaxonomyNodeIds.has('referenceData')).toBe(true);
      expect(store.selectedTaxonomyNodeIds.size).toBe(3);
    });

    test('selecting a parent node adds it, all descendants, and ancestors', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleTaxonomyNode('referenceData::marketData');

      expect(
        store.selectedTaxonomyNodeIds.has('referenceData::marketData'),
      ).toBe(true);
      expect(
        store.selectedTaxonomyNodeIds.has('referenceData::marketData::esg'),
      ).toBe(true);
      expect(
        store.selectedTaxonomyNodeIds.has('referenceData::marketData::pricing'),
      ).toBe(true);
      expect(store.selectedTaxonomyNodeIds.has('referenceData')).toBe(true);
      expect(store.selectedTaxonomyNodeIds.size).toBe(4);
    });

    test('selecting a top-level node adds it and all nested descendants', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleTaxonomyNode('referenceData');

      expect(store.selectedTaxonomyNodeIds.has('referenceData')).toBe(true);
      expect(
        store.selectedTaxonomyNodeIds.has('referenceData::marketData'),
      ).toBe(true);
      expect(
        store.selectedTaxonomyNodeIds.has('referenceData::marketData::esg'),
      ).toBe(true);
      expect(
        store.selectedTaxonomyNodeIds.has('referenceData::marketData::pricing'),
      ).toBe(true);
      expect(store.selectedTaxonomyNodeIds.has('referenceData::static')).toBe(
        true,
      );
      expect(store.selectedTaxonomyNodeIds.size).toBe(5);
    });

    test('deselecting a leaf node removes only that node', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleTaxonomyNode('referenceData::marketData::esg');
      expect(store.selectedTaxonomyNodeIds.size).toBe(3);

      store.toggleTaxonomyNode('referenceData::marketData::esg');
      expect(store.selectedTaxonomyNodeIds.size).toBe(2);
      expect(
        store.selectedTaxonomyNodeIds.has('referenceData::marketData'),
      ).toBe(true);
      expect(store.selectedTaxonomyNodeIds.has('referenceData')).toBe(true);
    });

    test('deselecting a parent node removes it and all descendants', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleTaxonomyNode('referenceData::marketData');
      expect(store.selectedTaxonomyNodeIds.size).toBe(4);

      store.toggleTaxonomyNode('referenceData::marketData');
      expect(store.selectedTaxonomyNodeIds.size).toBe(1);
      expect(store.selectedTaxonomyNodeIds.has('referenceData')).toBe(true);
    });

    test('toggling nodes from different branches works independently', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleTaxonomyNode('referenceData::marketData::esg');
      store.toggleTaxonomyNode('derivedData::analytics');

      expect(
        store.selectedTaxonomyNodeIds.has('referenceData::marketData::esg'),
      ).toBe(true);
      expect(store.selectedTaxonomyNodeIds.has('derivedData::analytics')).toBe(
        true,
      );
      expect(store.selectedTaxonomyNodeIds.size).toBe(5);
    });

    test('toggling a node not found in tree still adds/removes it', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleTaxonomyNode('nonExistentNode');
      expect(store.selectedTaxonomyNodeIds.has('nonExistentNode')).toBe(true);

      store.toggleTaxonomyNode('nonExistentNode');
      expect(store.selectedTaxonomyNodeIds.has('nonExistentNode')).toBe(false);
    });

    test('selecting top-level then deselecting clears everything', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleTaxonomyNode('referenceData');
      expect(store.selectedTaxonomyNodeIds.size).toBe(5);

      store.toggleTaxonomyNode('referenceData');
      expect(store.selectedTaxonomyNodeIds.size).toBe(0);
    });

    test('deselecting mid-level removes it and descendants but keeps ancestors', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleTaxonomyNode('referenceData::marketData::esg');
      expect(store.selectedTaxonomyNodeIds.size).toBe(3);

      store.toggleTaxonomyNode('referenceData::marketData');
      expect(store.selectedTaxonomyNodeIds.size).toBe(1);
      expect(store.selectedTaxonomyNodeIds.has('referenceData')).toBe(true);
    });
  });

  describe('simpleToggleTaxonomyNode', () => {
    test('adds a single node without ancestors or descendants', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.simpleToggleTaxonomyNode('referenceData::marketData::esg');

      expect(store.selectedTaxonomyNodeIds.size).toBe(1);
      expect(
        store.selectedTaxonomyNodeIds.has('referenceData::marketData::esg'),
      ).toBe(true);
    });

    test('removes a single node', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.simpleToggleTaxonomyNode('referenceData::marketData::esg');
      store.simpleToggleTaxonomyNode('referenceData::marketData::esg');

      expect(store.selectedTaxonomyNodeIds.size).toBe(0);
    });
  });
});

describe('LegendMarketplaceSearchResultsStore - Filters', () => {
  describe('toggleDataProductType', () => {
    test('adds a data product type when not selected', async () => {
      const { store } = await setupStore();

      store.toggleDataProductType(DataProductTypeFilter.LAKEHOUSE);

      expect(
        store.selectedDataProductTypes.has(DataProductTypeFilter.LAKEHOUSE),
      ).toBe(true);
      expect(store.selectedDataProductTypes.size).toBe(1);
    });

    test('removes a data product type when already selected', async () => {
      const { store } = await setupStore();

      store.toggleDataProductType(DataProductTypeFilter.LAKEHOUSE);
      store.toggleDataProductType(DataProductTypeFilter.LAKEHOUSE);

      expect(
        store.selectedDataProductTypes.has(DataProductTypeFilter.LAKEHOUSE),
      ).toBe(false);
      expect(store.selectedDataProductTypes.size).toBe(0);
    });

    test('can select multiple data product types', async () => {
      const { store } = await setupStore();

      store.toggleDataProductType(DataProductTypeFilter.LAKEHOUSE);
      store.toggleDataProductType(DataProductTypeFilter.LEGACY);

      expect(store.selectedDataProductTypes.size).toBe(2);
      expect(
        store.selectedDataProductTypes.has(DataProductTypeFilter.LAKEHOUSE),
      ).toBe(true);
      expect(
        store.selectedDataProductTypes.has(DataProductTypeFilter.LEGACY),
      ).toBe(true);
    });
  });

  describe('toggleSource', () => {
    test('adds a source when not selected', async () => {
      const { store } = await setupStore();

      store.toggleSource(DataProductSourceFilter.EXTERNAL);

      expect(store.selectedSources.has(DataProductSourceFilter.EXTERNAL)).toBe(
        true,
      );
      expect(store.selectedSources.size).toBe(1);
    });

    test('removes a source when already selected', async () => {
      const { store } = await setupStore();

      store.toggleSource(DataProductSourceFilter.EXTERNAL);
      store.toggleSource(DataProductSourceFilter.EXTERNAL);

      expect(store.selectedSources.has(DataProductSourceFilter.EXTERNAL)).toBe(
        false,
      );
      expect(store.selectedSources.size).toBe(0);
    });
  });

  describe('clearAllFilters', () => {
    test('clears all filter types', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleDataProductType(DataProductTypeFilter.LAKEHOUSE);
      store.toggleSource(DataProductSourceFilter.EXTERNAL);
      store.toggleTaxonomyNode('referenceData');

      expect(store.hasActiveFilters).toBe(true);

      store.clearAllFilters();

      expect(store.selectedDataProductTypes.size).toBe(0);
      expect(store.selectedSources.size).toBe(0);
      expect(store.selectedTaxonomyNodeIds.size).toBe(0);
      expect(store.hasActiveFilters).toBe(false);
    });

    test('is a no-op when no filters are active', async () => {
      const { store } = await setupStore();

      store.clearAllFilters();

      expect(store.hasActiveFilters).toBe(false);
    });
  });

  describe('hasActiveFilters', () => {
    test('returns false when no filters are active', async () => {
      const { store } = await setupStore();

      expect(store.hasActiveFilters).toBe(false);
    });

    test('returns true when data product type filter is active', async () => {
      const { store } = await setupStore();

      store.toggleDataProductType(DataProductTypeFilter.LAKEHOUSE);

      expect(store.hasActiveFilters).toBe(true);
    });

    test('returns true when source filter is active', async () => {
      const { store } = await setupStore();

      store.toggleSource(DataProductSourceFilter.EXTERNAL);

      expect(store.hasActiveFilters).toBe(true);
    });

    test('returns true when taxonomy filter is active', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleTaxonomyNode('referenceData::marketData::esg');

      expect(store.hasActiveFilters).toBe(true);
    });
  });

  describe('computeFilterNodeIds', () => {
    const callComputeFilterNodeIds = (store: object): string[] =>
      (
        store as unknown as { computeFilterNodeIds: () => string[] }
      ).computeFilterNodeIds.call(store);

    test('returns only leaf node when a single leaf is selected', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleTaxonomyNode('referenceData::marketData::esg');

      const result = callComputeFilterNodeIds(store);
      expect(result).toContain('referenceData::marketData::esg');
      expect(result).not.toContain('referenceData');
      expect(result).not.toContain('referenceData::marketData');
      expect(result).toHaveLength(1);
    });

    test('returns parent when all its children are selected', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleTaxonomyNode('referenceData::marketData');

      const result = callComputeFilterNodeIds(store);
      expect(result).toContain('referenceData::marketData');
      expect(result).not.toContain('referenceData::marketData::esg');
      expect(result).not.toContain('referenceData::marketData::pricing');
    });

    test('returns parent when all direct children happen to be selected via ancestors', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleTaxonomyNode('referenceData::marketData::esg');
      store.toggleTaxonomyNode('referenceData::static');

      const result = callComputeFilterNodeIds(store);
      expect(result).toContain('referenceData');
      expect(result).toHaveLength(1);
    });

    test('returns empty array when no taxonomy nodes are selected', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      const result = callComputeFilterNodeIds(store);
      expect(result).toHaveLength(0);
    });
  });

  describe('buildSearchFilters', () => {
    test('returns empty array when no filters are active', async () => {
      const { store } = await setupStore();

      const filters = (
        store as unknown as { buildSearchFilters: () => string[] }
      ).buildSearchFilters();
      expect(filters).toEqual([]);
    });

    test('builds correct filter string for single data product type', async () => {
      const { store } = await setupStore();

      store.toggleDataProductType(DataProductTypeFilter.LAKEHOUSE);

      const filters = (
        store as unknown as { buildSearchFilters: () => string[] }
      ).buildSearchFilters();
      expect(filters).toEqual(['data_product_type=lakehouse']);
    });

    test('builds correct filter string for multiple data product types', async () => {
      const { store } = await setupStore();

      store.toggleDataProductType(DataProductTypeFilter.LAKEHOUSE);
      store.toggleDataProductType(DataProductTypeFilter.LEGACY);

      const filters = (
        store as unknown as { buildSearchFilters: () => string[] }
      ).buildSearchFilters();
      expect(filters).toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            /^data_product_type=.*lakehouse.*legacy|data_product_type=.*legacy.*lakehouse$/,
          ),
        ]),
      );
      expect(filters).toHaveLength(1);
    });

    test('builds correct filter string for source filter', async () => {
      const { store } = await setupStore();

      store.toggleSource(DataProductSourceFilter.EXTERNAL);

      const filters = (
        store as unknown as { buildSearchFilters: () => string[] }
      ).buildSearchFilters();
      expect(filters).toEqual(['data_product_source=External']);
    });

    test('builds correct filter string for taxonomy filter', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleTaxonomyNode('referenceData::marketData::esg');

      const filters = (
        store as unknown as { buildSearchFilters: () => string[] }
      ).buildSearchFilters();
      expect(filters).toHaveLength(1);
      expect(filters[0]).toBe('taxonomy=referenceData::marketData::esg');
    });

    test('builds correct filter string for multiple filter types combined', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleDataProductType(DataProductTypeFilter.LAKEHOUSE);
      store.toggleSource(DataProductSourceFilter.EXTERNAL);
      store.toggleTaxonomyNode('referenceData::marketData::esg');

      const filters = (
        store as unknown as { buildSearchFilters: () => string[] }
      ).buildSearchFilters();
      expect(filters).toHaveLength(3);
      expect(filters).toEqual(
        expect.arrayContaining([
          'data_product_type=lakehouse',
          'data_product_source=External',
          expect.stringContaining('taxonomy='),
        ]),
      );
    });
  });

  describe('isOnLastPage', () => {
    test('returns false when totalItems is 0', async () => {
      const { store } = await setupStore();
      store.setTotalItems(0);
      store.setPage(1);
      expect(store.isOnLastPage).toBe(false);
    });

    test('returns true when on the last page', async () => {
      const { store } = await setupStore();
      store.setItemsPerPage(12);
      store.setTotalItems(20);
      store.setPage(2); // ceil(20/12) = 2
      expect(store.isOnLastPage).toBe(true);
    });

    test('returns false when not on the last page', async () => {
      const { store } = await setupStore();
      store.setItemsPerPage(12);
      store.setTotalItems(25);
      store.setPage(1); // ceil(25/12) = 3
      expect(store.isOnLastPage).toBe(false);
    });

    test('returns true when all items fit on a single page', async () => {
      const { store } = await setupStore();
      store.setItemsPerPage(12);
      store.setTotalItems(5);
      store.setPage(1);
      expect(store.isOnLastPage).toBe(true);
    });
  });

  describe('showAllProducts', () => {
    test('defaults to false', async () => {
      const { store } = await setupStore();
      expect(store.showAllProducts).toBe(false);
    });

    test('can be toggled on', async () => {
      const { store } = await setupStore();
      store.setShowAllProducts(true);
      expect(store.showAllProducts).toBe(true);
    });

    test('can be toggled back off', async () => {
      const { store } = await setupStore();
      store.setShowAllProducts(true);
      store.setShowAllProducts(false);
      expect(store.showAllProducts).toBe(false);
    });
  });
});

describe('LegendMarketplaceSearchResultsStore - ViewMode', () => {
  test('defaults to TILE view mode', async () => {
    const { store } = await setupStore();

    expect(store.viewMode).toBe(SearchResultsViewMode.TILE);
  });

  test('setViewMode changes view mode to LIST', async () => {
    const { store } = await setupStore();

    store.setViewMode(SearchResultsViewMode.LIST);
    expect(store.viewMode).toBe(SearchResultsViewMode.LIST);
  });

  test('setViewMode changes view mode back to TILE', async () => {
    const { store } = await setupStore();

    store.setViewMode(SearchResultsViewMode.LIST);
    expect(store.viewMode).toBe(SearchResultsViewMode.LIST);

    store.setViewMode(SearchResultsViewMode.TILE);
    expect(store.viewMode).toBe(SearchResultsViewMode.TILE);
  });
});

const createProductCardState = (
  baseStore: LegendMarketplaceBaseStore,
  graphManager: V1_PureGraphManager,
  overrides: {
    title: string;
    meetsHygieneThreshold?: boolean | undefined;
  },
): ProductCardState => {
  const searchResult = new DataProductSearchResult();
  searchResult.dataProductTitle = overrides.title;
  searchResult.dataProductDescription = 'test description';
  searchResult.tags1 = [];
  searchResult.tags2 = [];
  searchResult.tag_score = 0;
  searchResult.similarity = 0;
  searchResult.meets_hygiene_threshold = overrides.meetsHygieneThreshold;

  const details = new LakehouseDataProductSearchResultDetails();
  details.dataProductId = `dp-${overrides.title}`;
  details.deploymentId = 1;
  details.producerEnvironmentName = 'test-prod';
  details.producerEnvironmentType =
    V1_EntitlementsLakehouseEnvironmentType.PRODUCTION;
  details.origin = new LakehouseAdHocDataProductSearchResultOrigin();
  searchResult.dataProductDetails = details;

  return new ProductCardState(baseStore, searchResult, graphManager, new Map());
};

describe('LegendMarketplaceSearchResultsStore - Show All Products', () => {
  const setupWithGraphManager = async () => {
    const { store, baseStore } = await setupStore();
    const graphManager = {} as V1_PureGraphManager;
    return { store, baseStore, graphManager };
  };

  test('filterSortProducts hides products below hygiene threshold by default', async () => {
    const { store, baseStore, graphManager } = await setupWithGraphManager();

    const cleanProduct = createProductCardState(baseStore, graphManager, {
      title: 'Clean Product',
      meetsHygieneThreshold: true,
    });
    const dirtyProduct = createProductCardState(baseStore, graphManager, {
      title: 'Dirty Product',
      meetsHygieneThreshold: false,
    });
    const unknownProduct = createProductCardState(baseStore, graphManager, {
      title: 'Unknown Product',
      meetsHygieneThreshold: undefined,
    });

    store.setSemanticSearchProductCardStates([
      cleanProduct,
      dirtyProduct,
      unknownProduct,
    ]);
    store.setUseProducerSearch(false);

    const results = store.filterSortProducts;
    expect(results).toHaveLength(2);
    expect(results?.map((r) => r.title)).toEqual(
      expect.arrayContaining(['Clean Product', 'Unknown Product']),
    );
    expect(results?.map((r) => r.title)).not.toContain('Dirty Product');
  });

  test('filterSortProducts shows all products when showAllProducts is true', async () => {
    const { store, baseStore, graphManager } = await setupWithGraphManager();

    const cleanProduct = createProductCardState(baseStore, graphManager, {
      title: 'Clean Product',
      meetsHygieneThreshold: true,
    });
    const dirtyProduct = createProductCardState(baseStore, graphManager, {
      title: 'Dirty Product',
      meetsHygieneThreshold: false,
    });

    store.setSemanticSearchProductCardStates([cleanProduct, dirtyProduct]);
    store.setUseProducerSearch(false);
    store.setShowAllProducts(true);

    const results = store.filterSortProducts;
    expect(results).toHaveLength(2);
    expect(results?.map((r) => r.title)).toEqual(
      expect.arrayContaining(['Clean Product', 'Dirty Product']),
    );
  });

  test('toggling showAllProducts from false to true reveals hidden products', async () => {
    const { store, baseStore, graphManager } = await setupWithGraphManager();

    const product1 = createProductCardState(baseStore, graphManager, {
      title: 'Visible',
      meetsHygieneThreshold: true,
    });
    const product2 = createProductCardState(baseStore, graphManager, {
      title: 'Hidden QA Duplicate',
      meetsHygieneThreshold: false,
    });
    const product3 = createProductCardState(baseStore, graphManager, {
      title: 'Hidden DEV Copy',
      meetsHygieneThreshold: false,
    });

    store.setSemanticSearchProductCardStates([product1, product2, product3]);
    store.setUseProducerSearch(false);

    // Default: only hygiene-passing products shown
    expect(store.filterSortProducts).toHaveLength(1);
    expect(store.filterSortProducts?.[0]?.title).toBe('Visible');

    // After show all: all products visible
    store.setShowAllProducts(true);
    expect(store.filterSortProducts).toHaveLength(3);
  });

  test('isOnLastPage combined with showAllProducts reflects correct state', async () => {
    const { store } = await setupStore();

    store.setItemsPerPage(12);
    store.setTotalItems(12);
    store.setPage(1);

    // On last page, show all not toggled — "Can't find" should appear
    expect(store.isOnLastPage).toBe(true);
    expect(store.showAllProducts).toBe(false);

    // After toggling show all — "Can't find" should disappear
    store.setShowAllProducts(true);
    expect(store.isOnLastPage).toBe(true);
    expect(store.showAllProducts).toBe(true);
  });
});
