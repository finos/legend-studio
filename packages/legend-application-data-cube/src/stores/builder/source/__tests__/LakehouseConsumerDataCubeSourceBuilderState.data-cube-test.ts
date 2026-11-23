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

import { expect, jest, test } from '@jest/globals';
import { ApplicationStore } from '@finos/legend-application';
import {
  V1_AdHocDeploymentDataProductOrigin,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import { createSpy, unitTest } from '@finos/legend-shared/test';
import { LegendDataCubePluginManager } from '../../../../application/LegendDataCubePluginManager.js';
import { TEST__getTestLegendDataCubeApplicationConfig } from '../../../../application/__test-utils__/LegendDataCubeApplicationTestUtils.js';
import {
  TEST__provideMockedLegendDataCubeBaseStore,
  TEST__provideMockedLegendDataCubeBuilderStore,
} from '../../../../components/__test-utils__/LegendDataCubeStoreTestUtils.js';
import { LakehouseConsumerDataCubeSourceBuilderState } from '../LakehouseConsumerDataCubeSourceBuilderState.js';

jest.mock('../../../LegendDataCubeDuckDBEngine', () => ({
  LegendDataCubeDuckDBEngine: jest.fn(() => ({
    initialize: jest.fn(),
    dispose: jest.fn(),
  })),
}));

// the code editor needs Monaco, which a state test has no use for
jest.mock('../../LegendDataCubeCodeEditorState.js', () => ({
  LegendDataCubeCodeEditorState: class {},
}));

const TEST_DATA__searchRow = (id: string): PlainObject => ({
  dataProductTitle: `${id} title`,
  dataProductDescription: null,
  tags1: [],
  tags2: [],
  tag_score: 0,
  similarity: 0.9,
  dataProductDetails: {
    _type: 'lakehouse',
    dataProductId: id,
    deploymentId: 1,
    producerEnvironmentName: 'producer',
    producerEnvironmentType: 'PRODUCTION',
    origin: {
      _type: 'SdlcDeployment',
      groupId: 'g',
      artifactId: 'a',
      versionId: '1.0.0',
      path: `p::${id}`,
    },
  },
});

const TEST_DATA__legacySearchRow: PlainObject = {
  ...TEST_DATA__searchRow('LEGACY'),
  dataProductDetails: {
    _type: 'legacy',
    groupId: 'g',
    artifactId: 'a',
    versionId: '1.0.0',
    path: 'p::LEGACY',
  },
};

const TEST_DATA__searchResponse = (
  rows: PlainObject[],
  totalCount = rows.length,
): PlainObject => ({
  results: rows,
  as_of_time: '2026-01-01T00:00:00Z',
  metadata: {
    total_count: totalCount,
    page_number: 1,
    page_size: 100,
    num_pages: 1,
  },
});

const TEST_DATA__dataProductDetails = (
  origin: PlainObject,
  fullPath = 'p::ORDERS',
): PlainObject => ({
  dataProducts: [
    {
      id: 'ORDERS',
      deploymentId: 1,
      title: 'Orders',
      origin,
      lakehouseEnvironment: {
        producerEnvironmentName: 'producer',
        type: 'PRODUCTION',
      },
      dataProduct: {
        name: 'Orders',
        accessPoints: [],
        accessPointGroupStereotypeMappings: [],
        owner: { appDirId: 1, level: 'DEPLOYMENT' },
      },
      fullPath,
    },
  ],
});

const buildState = async (marketplaceUrl?: string) => {
  const pluginManager = LegendDataCubePluginManager.create();
  const applicationStore = new ApplicationStore(
    TEST__getTestLegendDataCubeApplicationConfig(
      marketplaceUrl ? { marketplace: { serverUrl: marketplaceUrl } } : {},
    ),
    pluginManager,
  );
  const baseStore = await TEST__provideMockedLegendDataCubeBaseStore({
    applicationStore,
    pluginManager,
  });
  const builderStore = await TEST__provideMockedLegendDataCubeBuilderStore({
    mockBaseStore: baseStore,
  });
  return {
    baseStore,
    state: new LakehouseConsumerDataCubeSourceBuilderState(
      baseStore.application,
      builderStore.engine,
      baseStore.depotServerClient,
      baseStore.lakehouseContractServerClient,
      baseStore.alertService,
      baseStore.marketplaceServerClient,
    ),
  };
};

const buildSearchState = async () => {
  const { baseStore, state } = await buildState('https://testMarketplaceUrl');
  const search = createSpy(
    guaranteeNonNullable(baseStore.marketplaceServerClient),
    'lakehouseAccessSearch',
  );
  return { baseStore, state, search };
};

test(
  unitTest('Searches the data products of the environment, lakehouse only'),
  async () => {
    const { state, search } = await buildSearchState();
    search.mockResolvedValue(
      TEST_DATA__searchResponse([
        TEST_DATA__searchRow('FIRST'),
        TEST_DATA__legacySearchRow,
        TEST_DATA__searchRow('SECOND'),
      ]),
    );

    await state.searchDataProducts('  orders ');

    expect(search).toHaveBeenCalledWith(
      'orders',
      V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
      expect.objectContaining({ pageSize: 100, showAll: true }),
    );
    expect(
      state.searchResults.map((result) => result.dataProductTitle),
    ).toEqual(['FIRST title', 'SECOND title']);
    expect(state.isSearchCutShort).toBe(false);
    expect(state.searchState.hasSucceeded).toBe(true);
  },
);

test(
  unitTest('Says when there are more matches than the search returned'),
  async () => {
    const { state, search } = await buildSearchState();
    search.mockResolvedValue(
      TEST_DATA__searchResponse([TEST_DATA__searchRow('FIRST')], 250),
    );

    await state.searchDataProducts('orders');

    expect(state.isSearchCutShort).toBe(true);
  },
);

test(
  unitTest('An empty search clears the results without searching'),
  async () => {
    const { state, search } = await buildSearchState();
    search.mockResolvedValue(
      TEST_DATA__searchResponse([TEST_DATA__searchRow('FIRST')]),
    );
    await state.searchDataProducts('orders');
    search.mockClear();

    await state.searchDataProducts('   ');

    expect(search).not.toHaveBeenCalled();
    expect(state.searchResults).toEqual([]);
  },
);

test(unitTest('A search superseded by a newer one is dropped'), async () => {
  const { state, search } = await buildSearchState();
  const signals: (AbortSignal | undefined)[] = [];
  const resolvers: ((response: PlainObject) => void)[] = [];
  search.mockImplementation(
    (_query, _environment, options) =>
      new Promise((resolve) => {
        signals.push(options?.signal);
        resolvers.push(resolve as (response: PlainObject) => void);
      }),
  );

  const first = state.searchDataProducts('ord');
  const second = state.searchDataProducts('orders');
  expect(signals[0]?.aborted).toBe(true);
  expect(signals[1]?.aborted).toBe(false);
  // the dropped search answers last
  resolvers[1]?.(TEST_DATA__searchResponse([TEST_DATA__searchRow('CURRENT')]));
  resolvers[0]?.(TEST_DATA__searchResponse([TEST_DATA__searchRow('STALE')]));
  await Promise.all([first, second]);

  expect(state.searchResults.map((result) => result.dataProductTitle)).toEqual([
    'CURRENT title',
  ]);
});

test(unitTest('A failed search is reported, not thrown'), async () => {
  const { baseStore, state, search } = await buildSearchState();
  const notifyError = createSpy(
    baseStore.application.notificationService,
    'notifyError',
  ).mockReturnValue(undefined);
  search.mockRejectedValue(new Error('boom'));

  await state.searchDataProducts('orders');

  expect(notifyError).toHaveBeenCalledWith(
    expect.stringContaining('unable to search data products'),
  );
  expect(state.searchState.hasFailed).toBe(true);
});

test(
  unitTest('Choosing a found SDLC data product loads its details'),
  async () => {
    const { baseStore, state, search } = await buildSearchState();
    search.mockResolvedValue(
      TEST_DATA__searchResponse([TEST_DATA__searchRow('ORDERS')]),
    );
    const getDetails = createSpy(
      baseStore.lakehouseContractServerClient,
      'getDataProductByIdAndDID',
    ).mockResolvedValue(
      TEST_DATA__dataProductDetails({
        type: 'SdlcDeployment',
        group: 'g',
        artifact: 'a',
        version: '1.0.0',
      }),
    );
    const fetchAccessPoints = createSpy(
      state,
      'fetchAccessPoints',
    ).mockResolvedValue(undefined);
    await state.searchDataProducts('orders');

    await state.selectSearchResult(
      guaranteeNonNullable(state.searchResults[0]),
      'test-access-token',
    );

    expect(getDetails).toHaveBeenCalledWith('ORDERS', 1, 'test-access-token');
    expect(state.selectedDataProduct?.fullPath).toBe('p::ORDERS');
    expect(state.selectedDataProduct?.origin).toBeInstanceOf(
      V1_SdlcDeploymentDataProductOrigin,
    );
    expect(fetchAccessPoints).toHaveBeenCalledTimes(1);
  },
);

test(
  unitTest('Choosing a found ad hoc data product keeps its definition'),
  async () => {
    const { baseStore, state, search } = await buildSearchState();
    search.mockResolvedValue(
      TEST_DATA__searchResponse([TEST_DATA__searchRow('ORDERS')]),
    );
    createSpy(
      baseStore.lakehouseContractServerClient,
      'getDataProductByIdAndDID',
    ).mockResolvedValue(
      TEST_DATA__dataProductDetails({
        type: 'AdHocDeployment',
        definition: 'DataProduct p::ORDERS {}',
      }),
    );
    createSpy(state, 'fetchAccessPoints').mockResolvedValue(undefined);
    await state.searchDataProducts('orders');

    await state.selectSearchResult(
      guaranteeNonNullable(state.searchResults[0]),
      undefined,
    );

    const origin = state.selectedDataProduct?.origin;
    expect(origin).toBeInstanceOf(V1_AdHocDeploymentDataProductOrigin);
    expect((origin as V1_AdHocDeploymentDataProductOrigin).definition).toBe(
      'DataProduct p::ORDERS {}',
    );
  },
);

test(
  unitTest('A data product that fails to load is reported, and not chosen'),
  async () => {
    const { baseStore, state, search } = await buildSearchState();
    search.mockResolvedValue(
      TEST_DATA__searchResponse([TEST_DATA__searchRow('ORDERS')]),
    );
    createSpy(
      baseStore.lakehouseContractServerClient,
      'getDataProductByIdAndDID',
    ).mockRejectedValue(new Error('boom'));
    const notifyError = createSpy(
      baseStore.application.notificationService,
      'notifyError',
    ).mockReturnValue(undefined);
    const fetchAccessPoints = createSpy(
      state,
      'fetchAccessPoints',
    ).mockResolvedValue(undefined);
    await state.searchDataProducts('orders');

    await state.selectSearchResult(
      guaranteeNonNullable(state.searchResults[0]),
      undefined,
    );

    expect(notifyError).toHaveBeenCalledWith(
      expect.stringContaining('unable to fetch data product'),
    );
    expect(state.selectedDataProduct).toBeUndefined();
    expect(fetchAccessPoints).not.toHaveBeenCalled();
  },
);

test(
  unitTest('Switching the environment drops the search and the choice'),
  async () => {
    const { state, search } = await buildSearchState();
    search.mockResolvedValue(
      TEST_DATA__searchResponse([TEST_DATA__searchRow('FIRST')]),
    );
    await state.searchDataProducts('orders');

    await state.switchEnvMode(
      V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL,
      undefined,
    );

    expect(state.envMode).toBe(
      V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL,
    );
    expect(state.searchResults).toEqual([]);
    expect(state.selectedDataProduct).toBeUndefined();
  },
);

test(
  unitTest('Without a marketplace, the data products are listed, not searched'),
  async () => {
    const { baseStore, state } = await buildState();
    const getAllLiteDataProducts = createSpy(
      baseStore.lakehouseContractServerClient,
      'getAllLiteDataProducts',
    ).mockResolvedValue({ dataProducts: [] });

    await state.switchEnvMode(
      V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL,
      'test-access-token',
    );
    await state.searchDataProducts('orders');

    expect(state.isSearchEnabled).toBe(false);
    expect(getAllLiteDataProducts).toHaveBeenCalledWith(
      V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL,
      undefined,
      'test-access-token',
    );
    expect(state.searchResults).toEqual([]);
  },
);
