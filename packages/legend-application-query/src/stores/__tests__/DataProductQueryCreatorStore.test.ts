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

import { describe, test, expect, beforeEach } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  ApplicationStore,
  type UserDataService,
} from '@finos/legend-application';
import { DepotServerClient } from '@finos/legend-server-depot';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { Core_LegendQueryApplicationPlugin } from '../../components/Core_LegendQueryApplicationPlugin.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../__test-utils__/LegendQueryApplicationTestUtils.js';
import {
  DataProductQueryCreatorStore,
  QueryableDataProduct,
  QueryableLegacyDataProduct,
} from '../data-space/DataProductQueryCreatorStore.js';
import { LegendQueryUserDataHelper } from '../../__lib__/LegendQueryUserDataHelper.js';
import {
  createSimpleVisitedDataProduct,
  createSimpleVisitedDataspace,
} from '../../__lib__/LegendQueryUserDataSpaceHelper.js';
import { LegendQueryBareQueryBuilderState } from '../data-space/LegendQueryBareQueryBuilderState.js';

// ---------------------------------------------------------------------------
// Mock UserDataService backed by a plain object
// ---------------------------------------------------------------------------

class MockUserDataService {
  private store: Record<string, object | undefined> = {};

  getObjectValue(key: string): object | undefined {
    return this.store[key];
  }

  persistValue(key: string, data: object | undefined): void {
    this.store[key] = data;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildStore = (
  userDataService: UserDataService,
): DataProductQueryCreatorStore => {
  const pluginManager = LegendQueryPluginManager.create();
  pluginManager
    .usePlugins([new Core_LegendQueryApplicationPlugin()])
    .usePresets([])
    .install();
  const applicationStore = new ApplicationStore(
    TEST__getTestLegendQueryApplicationConfig(),
    pluginManager,
  );
  // Swap in our mock user data service
  (
    applicationStore as unknown as { userDataService: UserDataService }
  ).userDataService = userDataService;

  const depotServerClient = new DepotServerClient({
    serverUrl: applicationStore.config.depotServerUrl,
  });

  return new DataProductQueryCreatorStore(
    applicationStore,
    depotServerClient,
    undefined, // no initial queryableElement
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe(unitTest('DataProductQueryCreatorStore'), () => {
  let userDataService: UserDataService;
  let store: DataProductQueryCreatorStore;

  beforeEach(() => {
    userDataService = new MockUserDataService() as unknown as UserDataService;
    store = buildStore(userDataService);
  });

  // -----------------------------------------------------------------------
  // getMostRecentlyVisited
  // -----------------------------------------------------------------------

  describe('getMostRecentlyVisited', () => {
    test(unitTest('returns undefined when no visited entries exist'), () => {
      expect(store.getMostRecentlyVisited()).toBeUndefined();
    });

    test(unitTest('returns the only visited data product'), () => {
      LegendQueryUserDataHelper.addVisitedDataProduct(
        userDataService,
        createSimpleVisitedDataProduct(
          'org.finos',
          'my-product',
          '1.0.0',
          'model::MyDP',
          'ap1',
          'MODEL',
          'My Product',
          'A description',
          undefined,
        ),
      );

      const result = store.getMostRecentlyVisited();
      expect(result).toBeDefined();
      expect((result as NonNullable<typeof result>).visited.path).toBe(
        'model::MyDP',
      );
    });

    test(unitTest('returns the only visited data space'), () => {
      LegendQueryUserDataHelper.addVisitedDatspace(
        userDataService,
        createSimpleVisitedDataspace(
          'org.finos',
          'my-artifact',
          '1.0.0',
          'model::MyDS',
          'default',
        ),
      );

      const result = store.getMostRecentlyVisited();
      expect(result).toBeDefined();
      expect((result as NonNullable<typeof result>).visited.path).toBe(
        'model::MyDS',
      );
    });

    test(
      unitTest(
        'returns data product over data space when data product has a more recent lastViewedAt',
      ),
      () => {
        // Add dataspace first
        LegendQueryUserDataHelper.addVisitedDatspace(
          userDataService,
          createSimpleVisitedDataspace(
            'org.finos',
            'my-artifact',
            '1.0.0',
            'model::MyDS',
            'default',
          ),
        );

        // Add data product second
        LegendQueryUserDataHelper.addVisitedDataProduct(
          userDataService,
          createSimpleVisitedDataProduct(
            'org.finos',
            'my-product',
            '1.0.0',
            'model::MyDP',
            'ap1',
            'MODEL',
            undefined,
            undefined,
            undefined,
          ),
        );

        // Override timestamps after persistence (persist stamps Date.now())
        const dataspaces =
          LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
            userDataService,
          );
        (dataspaces[0] as NonNullable<(typeof dataspaces)[0]>).lastViewedAt =
          1000;
        userDataService.persistValue(
          'query-editor.recent-dataSpaces',
          dataspaces,
        );
        const products =
          LegendQueryUserDataHelper.getRecentlyVisitedDataProducts(
            userDataService,
          );
        (products[0] as NonNullable<(typeof products)[0]>).lastViewedAt = 2000;
        userDataService.persistValue(
          'query-editor.recent-dataProducts',
          products,
        );

        const result = store.getMostRecentlyVisited();
        expect(result).toBeDefined();
        expect((result as NonNullable<typeof result>).visited.path).toBe(
          'model::MyDP',
        );
      },
    );

    test(
      unitTest(
        'returns data space over data product when data space has a more recent lastViewedAt',
      ),
      () => {
        // Add data product first
        LegendQueryUserDataHelper.addVisitedDataProduct(
          userDataService,
          createSimpleVisitedDataProduct(
            'org.finos',
            'my-product',
            '1.0.0',
            'model::MyDP',
            'ap1',
            'MODEL',
            undefined,
            undefined,
            undefined,
          ),
        );

        // Add data space second
        LegendQueryUserDataHelper.addVisitedDatspace(
          userDataService,
          createSimpleVisitedDataspace(
            'org.finos',
            'my-artifact',
            '1.0.0',
            'model::MyDS',
            'default',
          ),
        );

        // Override timestamps after persistence
        const products =
          LegendQueryUserDataHelper.getRecentlyVisitedDataProducts(
            userDataService,
          );
        (products[0] as NonNullable<(typeof products)[0]>).lastViewedAt = 1000;
        userDataService.persistValue(
          'query-editor.recent-dataProducts',
          products,
        );
        const dataspaces =
          LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
            userDataService,
          );
        (dataspaces[0] as NonNullable<(typeof dataspaces)[0]>).lastViewedAt =
          2000;
        userDataService.persistValue(
          'query-editor.recent-dataSpaces',
          dataspaces,
        );

        const result = store.getMostRecentlyVisited();
        expect(result).toBeDefined();
        expect((result as NonNullable<typeof result>).visited.path).toBe(
          'model::MyDS',
        );
      },
    );

    test(unitTest('entries without lastViewedAt are treated as oldest'), () => {
      // Add dataspace
      LegendQueryUserDataHelper.addVisitedDatspace(
        userDataService,
        createSimpleVisitedDataspace(
          'org.finos',
          'my-artifact',
          '1.0.0',
          'model::MyDS',
          'default',
        ),
      );

      // Add data product
      LegendQueryUserDataHelper.addVisitedDataProduct(
        userDataService,
        createSimpleVisitedDataProduct(
          'org.finos',
          'my-product',
          '1.0.0',
          'model::MyDP',
          'ap1',
          'MODEL',
          undefined,
          undefined,
          undefined,
        ),
      );

      // Remove timestamp from dataspace, keep a small one on product
      const dataspaces =
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(userDataService);
      (dataspaces[0] as NonNullable<(typeof dataspaces)[0]>).lastViewedAt =
        undefined;
      userDataService.persistValue(
        'query-editor.recent-dataSpaces',
        dataspaces,
      );
      const products =
        LegendQueryUserDataHelper.getRecentlyVisitedDataProducts(
          userDataService,
        );
      (products[0] as NonNullable<(typeof products)[0]>).lastViewedAt = 100;
      userDataService.persistValue(
        'query-editor.recent-dataProducts',
        products,
      );

      const result = store.getMostRecentlyVisited();
      expect(result).toBeDefined();
      expect((result as NonNullable<typeof result>).visited.path).toBe(
        'model::MyDP',
      );
    });

    test(
      unitTest(
        'when both entries lack lastViewedAt, returns whichever appears first after merge',
      ),
      () => {
        // Both have no timestamp — they both map to 0, so stable sort keeps
        // data spaces first (they are spread first in the merge array)
        LegendQueryUserDataHelper.addVisitedDatspace(
          userDataService,
          createSimpleVisitedDataspace(
            'org.finos',
            'my-artifact',
            '1.0.0',
            'model::MyDS',
            'default',
          ),
        );

        LegendQueryUserDataHelper.addVisitedDataProduct(
          userDataService,
          createSimpleVisitedDataProduct(
            'org.finos',
            'my-product',
            '1.0.0',
            'model::MyDP',
            'ap1',
            'MODEL',
            undefined,
            undefined,
            undefined,
          ),
        );

        // Clear timestamps on both
        const dataspaces =
          LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
            userDataService,
          );
        (dataspaces[0] as NonNullable<(typeof dataspaces)[0]>).lastViewedAt =
          undefined;
        userDataService.persistValue(
          'query-editor.recent-dataSpaces',
          dataspaces,
        );
        const products =
          LegendQueryUserDataHelper.getRecentlyVisitedDataProducts(
            userDataService,
          );
        (products[0] as NonNullable<(typeof products)[0]>).lastViewedAt =
          undefined;
        userDataService.persistValue(
          'query-editor.recent-dataProducts',
          products,
        );

        // With both at timestamp 0, the data space appears first because
        // dataspaces are spread before data products in the merge array and
        // Array.sort is stable.
        const result = store.getMostRecentlyVisited();
        expect(result).toBeDefined();
        expect((result as NonNullable<typeof result>).visited.path).toBe(
          'model::MyDS',
        );
      },
    );

    test(
      unitTest(
        'returns the most recent among multiple entries of the same type',
      ),
      () => {
        LegendQueryUserDataHelper.addVisitedDatspace(
          userDataService,
          createSimpleVisitedDataspace(
            'org.finos',
            'artifact-a',
            '1.0.0',
            'model::DS1',
            'default',
          ),
        );
        LegendQueryUserDataHelper.addVisitedDatspace(
          userDataService,
          createSimpleVisitedDataspace(
            'org.finos',
            'artifact-b',
            '1.0.0',
            'model::DS2',
            'ctx',
          ),
        );
        LegendQueryUserDataHelper.addVisitedDataProduct(
          userDataService,
          createSimpleVisitedDataProduct(
            'org.finos',
            'prod-a',
            '1.0.0',
            'model::DP1',
            'ap1',
            'NATIVE',
            undefined,
            undefined,
            undefined,
          ),
        );

        // Set specific timestamps
        const dataspaces =
          LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
            userDataService,
          );
        // dataspaces are in MRU order: [DS2, DS1]
        (dataspaces[0] as NonNullable<(typeof dataspaces)[0]>).lastViewedAt =
          300; // DS2
        (dataspaces[1] as NonNullable<(typeof dataspaces)[0]>).lastViewedAt =
          100; // DS1
        userDataService.persistValue(
          'query-editor.recent-dataSpaces',
          dataspaces,
        );
        const products =
          LegendQueryUserDataHelper.getRecentlyVisitedDataProducts(
            userDataService,
          );
        (products[0] as NonNullable<(typeof products)[0]>).lastViewedAt = 200; // DP1
        userDataService.persistValue(
          'query-editor.recent-dataProducts',
          products,
        );

        const result = store.getMostRecentlyVisited();
        expect(result).toBeDefined();
        // ds2 has the highest timestamp (300)
        expect((result as NonNullable<typeof result>).visited.path).toBe(
          'model::DS2',
        );
      },
    );
  });

  // -----------------------------------------------------------------------
  // onInitializeFailure
  // -----------------------------------------------------------------------

  describe('onInitializeFailure', () => {
    test(
      unitTest(
        'removes stale data product from visited list and falls back to bare state',
      ),
      () => {
        // Populate a visited data product
        LegendQueryUserDataHelper.addVisitedDataProduct(
          userDataService,
          createSimpleVisitedDataProduct(
            'org.finos',
            'my-product',
            '1.0.0',
            'model::MyDP',
            'ap1',
            'MODEL',
            undefined,
            undefined,
            undefined,
          ),
        );
        expect(
          LegendQueryUserDataHelper.getRecentlyVisitedDataProducts(
            userDataService,
          ),
        ).toHaveLength(1);

        // Set the queryable element as if redirect picked it
        store.setQueryableElement(
          new QueryableDataProduct(
            'org.finos',
            'my-product',
            '1.0.0',
            'model::MyDP',
            'MODEL',
            'ap1',
          ),
        );

        // Simulate initialize failure
        store.onInitializeFailure();

        // Stale entry should be removed
        expect(
          LegendQueryUserDataHelper.getRecentlyVisitedDataProducts(
            userDataService,
          ),
        ).toHaveLength(0);

        // queryableElement should be cleared
        expect(store.queryableElement).toBeUndefined();

        // A bare query builder state should be created
        expect(store.queryBuilderState).toBeInstanceOf(
          LegendQueryBareQueryBuilderState,
        );

        // initState should be passed (so UI renders the query builder)
        expect(store.initState.hasSucceeded).toBe(true);
      },
    );

    test(
      unitTest(
        'removes stale data space from visited list and falls back to bare state',
      ),
      () => {
        // Populate a visited dataspace
        LegendQueryUserDataHelper.addVisitedDatspace(
          userDataService,
          createSimpleVisitedDataspace(
            'org.finos',
            'my-artifact',
            '1.0.0',
            'model::MyDS',
            'default',
          ),
        );
        expect(
          LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
            userDataService,
          ),
        ).toHaveLength(1);

        // Set the queryable element as if redirect picked it
        store.setQueryableElement(
          new QueryableLegacyDataProduct(
            'org.finos',
            'my-artifact',
            '1.0.0',
            'model::MyDS',
            'default',
          ),
        );

        // Simulate initialize failure
        store.onInitializeFailure();

        // Stale entry should be removed
        expect(
          LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
            userDataService,
          ),
        ).toHaveLength(0);

        // queryableElement should be cleared
        expect(store.queryableElement).toBeUndefined();

        // A bare query builder state should be created
        expect(store.queryBuilderState).toBeInstanceOf(
          LegendQueryBareQueryBuilderState,
        );

        // initState should be passed
        expect(store.initState.hasSucceeded).toBe(true);
      },
    );

    test(
      unitTest(
        'does not remove other entries when only the stale one is removed',
      ),
      () => {
        // Add two data products
        LegendQueryUserDataHelper.addVisitedDataProduct(
          userDataService,
          createSimpleVisitedDataProduct(
            'org.finos',
            'product-a',
            '1.0.0',
            'model::DP_A',
            'ap1',
            'MODEL',
            undefined,
            undefined,
            undefined,
          ),
        );
        LegendQueryUserDataHelper.addVisitedDataProduct(
          userDataService,
          createSimpleVisitedDataProduct(
            'org.finos',
            'product-b',
            '1.0.0',
            'model::DP_B',
            'ap2',
            'NATIVE',
            undefined,
            undefined,
            undefined,
          ),
        );

        // Also add a data space
        LegendQueryUserDataHelper.addVisitedDatspace(
          userDataService,
          createSimpleVisitedDataspace(
            'org.finos',
            'my-artifact',
            '1.0.0',
            'model::MyDS',
            'default',
          ),
        );

        expect(
          LegendQueryUserDataHelper.getRecentlyVisitedDataProducts(
            userDataService,
          ),
        ).toHaveLength(2);
        expect(
          LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
            userDataService,
          ),
        ).toHaveLength(1);

        // Simulate failure for product-a only
        store.setQueryableElement(
          new QueryableDataProduct(
            'org.finos',
            'product-a',
            '1.0.0',
            'model::DP_A',
            'MODEL',
            'ap1',
          ),
        );
        store.onInitializeFailure();

        // product-a removed, product-b still there
        const remainingProducts =
          LegendQueryUserDataHelper.getRecentlyVisitedDataProducts(
            userDataService,
          );
        expect(remainingProducts).toHaveLength(1);
        expect(
          (remainingProducts[0] as NonNullable<(typeof remainingProducts)[0]>)
            .path,
        ).toBe('model::DP_B');

        // data spaces untouched
        expect(
          LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
            userDataService,
          ),
        ).toHaveLength(1);
      },
    );

    test(
      unitTest('handles failure gracefully when no queryableElement is set'),
      () => {
        // No queryableElement set — this happens when a fresh user
        // has no visited entries and initialization still fails
        expect(store.queryableElement).toBeUndefined();

        store.onInitializeFailure();

        // Should still fall back to bare state
        expect(store.queryableElement).toBeUndefined();
        expect(store.queryBuilderState).toBeInstanceOf(
          LegendQueryBareQueryBuilderState,
        );
        expect(store.initState.hasSucceeded).toBe(true);
      },
    );
  });
});
