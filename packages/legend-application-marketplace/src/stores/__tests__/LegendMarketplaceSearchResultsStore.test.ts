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
  DataProductTypeFilter,
  DataProductSourceFilter,
} from '../lakehouse/LegendMarketplaceSearchResultsStore.js';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import { mockTaxonomyTreeResponse } from '../../components/__test-utils__/TEST_DATA__LakehouseSearchResultData.js';

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
});
