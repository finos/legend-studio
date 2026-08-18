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

import { describe, test, expect, beforeEach, type jest } from '@jest/globals';
import { unitTest, createSpy } from '@finos/legend-shared/test';
import { V1_EntitlementsLakehouseEnvironmentType } from '@finos/legend-graph';
import { MarketplaceServerClient } from '../MarketplaceServerClient.js';
import { SearchType } from '../models/SearchType.js';

describe('MarketplaceServerClient', () => {
  let client: MarketplaceServerClient;
  // Captured once so assertions never re-read `client.get` as a bare property
  // access (which trips `@typescript-eslint/unbound-method` on a prototype method).
  let getSpy: jest.SpiedFunction<MarketplaceServerClient['get']>;

  beforeEach(() => {
    client = new MarketplaceServerClient({
      serverUrl: 'http://test-marketplace-server',
      subscriptionUrl: 'http://test-marketplace-server/subscription',
    });
    getSpy = createSpy(client, 'get');
    getSpy.mockResolvedValue({});
  });

  describe(unitTest('dataProductSearch'), () => {
    test(unitTest('defaults to hybrid search with no filters'), async () => {
      await client.dataProductSearch(
        'customer',
        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
      );

      expect(getSpy).toHaveBeenCalledWith(
        'http://test-marketplace-server/v1/search/dataProducts/PRODUCTION',
        {},
        undefined,
        {
          query: 'customer',
          search_type: SearchType.HYBRID,
          page_size: 12,
          page_number: 1,
          include_filter_metadata: true,
          show_all: false,
        },
      );
    });

    test(unitTest('omits search_filters when none are supplied'), async () => {
      await client.dataProductSearch(
        'customer',
        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        SearchType.HYBRID,
        [],
      );

      const params = getSpy.mock.calls[0]?.[3] as Record<string, unknown>;
      expect(params.search_filters).toBeUndefined();
    });

    test(unitTest('includes search_filters when supplied'), async () => {
      await client.dataProductSearch(
        'customer',
        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        SearchType.HYBRID,
        ['data_product_source=External'],
        24,
        2,
        true,
      );

      expect(getSpy).toHaveBeenCalledWith(
        'http://test-marketplace-server/v1/search/dataProducts/PRODUCTION',
        {},
        undefined,
        {
          query: 'customer',
          search_type: SearchType.HYBRID,
          search_filters: ['data_product_source=External'],
          page_size: 24,
          page_number: 2,
          include_filter_metadata: true,
          show_all: true,
        },
      );
    });
  });

  describe(unitTest('lakehouseAccessSearch'), () => {
    test(
      unitTest('defaults to full-text search against the lakehouseAccess path'),
      async () => {
        await client.lakehouseAccessSearch(
          'customer',
          V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        );

        expect(getSpy).toHaveBeenCalledWith(
          'http://test-marketplace-server/v1/search/lakehouseAccess/PRODUCTION',
          {},
          undefined,
          {
            query: 'customer',
            search_type: SearchType.FULL_TEXT,
            page_size: 12,
            page_number: 1,
            include_filter_metadata: true,
            show_all: false,
          },
        );
      },
    );

    test(
      unitTest('forwards an abort signal via the request options'),
      async () => {
        const controller = new AbortController();

        await client.lakehouseAccessSearch(
          'customer',
          V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
          { signal: controller.signal },
        );

        expect(getSpy).toHaveBeenCalledWith(
          expect.any(String),
          { signal: controller.signal },
          undefined,
          expect.anything(),
        );
      },
    );

    test(unitTest('omits search_filters when none are supplied'), async () => {
      await client.lakehouseAccessSearch(
        'customer',
        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        { searchFilters: [] },
      );

      const params = getSpy.mock.calls[0]?.[3] as Record<string, unknown>;
      expect(params.search_filters).toBeUndefined();
    });

    test(unitTest('applies every option when supplied'), async () => {
      await client.lakehouseAccessSearch(
        'customer',
        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        {
          searchType: SearchType.SEMANTIC,
          searchFilters: ['deployment_id=12345'],
          pageSize: 24,
          pageNumber: 3,
          showAll: true,
        },
      );

      expect(getSpy).toHaveBeenCalledWith(
        'http://test-marketplace-server/v1/search/lakehouseAccess/PRODUCTION',
        {},
        undefined,
        {
          query: 'customer',
          search_type: SearchType.SEMANTIC,
          search_filters: ['deployment_id=12345'],
          page_size: 24,
          page_number: 3,
          include_filter_metadata: true,
          show_all: true,
        },
      );
    });
  });

  describe(unitTest('getLakehouseAccessAutosuggestions'), () => {
    test(unitTest('hits the lakehouseAccess autosuggest path'), async () => {
      await client.getLakehouseAccessAutosuggestions('cust', 'prod', 5);

      expect(getSpy).toHaveBeenCalledWith(
        'http://test-marketplace-server/v1/autosuggest/lakehouseAccess/prod',
        {},
        undefined,
        { query: 'cust', limit: 5 },
      );
    });

    test(
      unitTest('never calls the dataProducts autosuggest path'),
      async () => {
        await client.getLakehouseAccessAutosuggestions('cust', 'prod');

        expect(getSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('/autosuggest/dataProducts/'),
          expect.anything(),
          expect.anything(),
          expect.anything(),
        );
      },
    );
  });
});
