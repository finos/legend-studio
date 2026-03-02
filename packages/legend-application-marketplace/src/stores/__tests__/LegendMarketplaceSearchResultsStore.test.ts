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
import { flowResult } from 'mobx';
import { createSpy } from '@finos/legend-shared/test';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { LegendMarketplaceSearchResultsStore } from '../lakehouse/LegendMarketplaceSearchResultsStore.js';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import {
  mockTaxonomyTreeResponse,
  mockEmptyTaxonomyTreeResponse,
} from '../../components/__test-utils__/TEST_DATA__LakehouseSearchResultData.js';

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
  describe('fetchTaxonomyTree', () => {
    test('fetches taxonomy tree from API and sets tree on store', async () => {
      const { store, baseStore } = await setupStore();

      createSpy(
        baseStore.marketplaceServerClient,
        'getTaxonomyTree',
      ).mockResolvedValue(mockTaxonomyTreeResponse);

      await flowResult(store.fetchTaxonomyTree('test query'));

      expect(
        baseStore.marketplaceServerClient.getTaxonomyTree,
      ).toHaveBeenCalledWith(
        baseStore.envState.lakehouseEnvironment,
        'test query',
      );
      expect(store.taxonomyTree).toHaveLength(2);
      expect(store.taxonomyTree[0]?.id).toBe('referenceData');
      expect(store.taxonomyTree[1]?.id).toBe('derivedData');
      expect(store.fetchingTaxonomyTreeState.hasCompleted).toBe(true);
    });

    test('fetches taxonomy tree without search query', async () => {
      const { store, baseStore } = await setupStore();

      createSpy(
        baseStore.marketplaceServerClient,
        'getTaxonomyTree',
      ).mockResolvedValue(mockTaxonomyTreeResponse);

      await flowResult(store.fetchTaxonomyTree());

      expect(
        baseStore.marketplaceServerClient.getTaxonomyTree,
      ).toHaveBeenCalledWith(
        baseStore.envState.lakehouseEnvironment,
        undefined,
      );
      expect(store.taxonomyTree).toHaveLength(2);
    });

    test('sets empty tree when API returns empty response', async () => {
      const { store, baseStore } = await setupStore();

      createSpy(
        baseStore.marketplaceServerClient,
        'getTaxonomyTree',
      ).mockResolvedValue(mockEmptyTaxonomyTreeResponse);

      await flowResult(store.fetchTaxonomyTree('test'));

      expect(store.taxonomyTree).toHaveLength(0);
      expect(store.fetchingTaxonomyTreeState.hasCompleted).toBe(true);
    });

    test('sets empty tree and completes state on API error', async () => {
      const { store, baseStore } = await setupStore();

      createSpy(
        baseStore.marketplaceServerClient,
        'getTaxonomyTree',
      ).mockRejectedValue(new Error('Network error'));

      await flowResult(store.fetchTaxonomyTree('test'));

      expect(store.taxonomyTree).toHaveLength(0);
      expect(store.fetchingTaxonomyTreeState.hasCompleted).toBe(true);
    });
  });

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
    test('selecting a leaf node adds only that node', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleTaxonomyNode('referenceData::marketData::esg');

      expect(store.selectedTaxonomyNodeIds.size).toBe(1);
      expect(
        store.selectedTaxonomyNodeIds.has('referenceData::marketData::esg'),
      ).toBe(true);
    });

    test('selecting a parent node adds the node and all descendants', async () => {
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
      expect(store.selectedTaxonomyNodeIds.size).toBe(3);
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

      // Select two leaf nodes
      store.toggleTaxonomyNode('referenceData::marketData::esg');
      store.toggleTaxonomyNode('referenceData::marketData::pricing');
      expect(store.selectedTaxonomyNodeIds.size).toBe(2);

      // Deselect one
      store.toggleTaxonomyNode('referenceData::marketData::esg');
      expect(store.selectedTaxonomyNodeIds.size).toBe(1);
      expect(
        store.selectedTaxonomyNodeIds.has('referenceData::marketData::pricing'),
      ).toBe(true);
    });

    test('deselecting a parent node removes it and all descendants', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      // Select parent (adds parent + children)
      store.toggleTaxonomyNode('referenceData::marketData');
      expect(store.selectedTaxonomyNodeIds.size).toBe(3);

      // Deselect parent (removes parent + children)
      store.toggleTaxonomyNode('referenceData::marketData');
      expect(store.selectedTaxonomyNodeIds.size).toBe(0);
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
      expect(store.selectedTaxonomyNodeIds.size).toBe(2);
    });

    test('toggling a node not found in tree still adds/removes it', async () => {
      const { store } = await setupStore();
      store.setTaxonomyTree(mockTaxonomyTreeResponse.taxonomy_tree);

      store.toggleTaxonomyNode('nonExistentNode');
      expect(store.selectedTaxonomyNodeIds.has('nonExistentNode')).toBe(true);

      store.toggleTaxonomyNode('nonExistentNode');
      expect(store.selectedTaxonomyNodeIds.has('nonExistentNode')).toBe(false);
    });
  });
});
