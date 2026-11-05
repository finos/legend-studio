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

import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { autorun, flowResult } from 'mobx';
import { ServiceDetail } from '@finos/legend-graph';
import { createSpy } from '@finos/legend-shared/test';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { mockServices } from '../../../components/__test-utils__/TEST_DATA__DataAPIs.js';
import { LegendMarketplaceDataAPIsStore } from '../LegendMarketplaceDataAPIsStore.js';

const setup = async () => {
  const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
  createSpy(baseStore.engineServerClient, 'getServicesInfo').mockResolvedValue(
    mockServices.map((s) => ServiceDetail.fromJson(s)),
  );
  const store = new LegendMarketplaceDataAPIsStore(baseStore);
  await flowResult(store.fetchAllServices());
  const stopObserving = autorun(() => store.filteredSortedServices);
  return { store, stopObserving };
};

afterEach(() => {
  jest.useRealTimers();
});

describe('LegendMarketplaceDataAPIsStore service tree', () => {
  test('reuses the built tree until the services or the scope change', async () => {
    const { store, stopObserving } = await setup();
    const tree = store.serviceTree;
    expect(store.serviceTree).toBe(tree);

    store.setSearchQuery('service1');
    const filtered = store.serviceTree;
    expect(filtered).not.toBe(tree);
    expect(store.serviceTree).toBe(filtered);

    store.setSearchQuery('');
    store.setTreeScopePath('test/alloy');
    const scoped = store.serviceTree;
    expect(scoped).not.toBe(tree);
    expect(scoped.roots.map((n) => n.path)).toEqual(['test/alloy']);
    expect(store.serviceTree).toBe(scoped);
    stopObserving();
  });

  test('builds the tree in the background after the services are fetched', async () => {
    jest.useFakeTimers();
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    createSpy(
      baseStore.engineServerClient,
      'getServicesInfo',
    ).mockResolvedValue(mockServices.map((s) => ServiceDetail.fromJson(s)));
    const store = new LegendMarketplaceDataAPIsStore(baseStore);
    const stopObserving = autorun(() => store.filteredSortedServices);
    await flowResult(store.fetchAllServices());
    const buildSpy = jest.spyOn(
      store as unknown as { buildServiceTree: () => unknown },
      'buildServiceTree',
    );
    expect(buildSpy).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(buildSpy).toHaveBeenCalledTimes(1);
    stopObserving();
  });
});
