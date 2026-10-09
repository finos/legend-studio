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
import { V1_entitlementsDataProductLiteResponseToDataProductLite } from '@finos/legend-graph';
import { DepotServerClient } from '@finos/legend-server-depot';
import { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import {
  DataProductSearchResponse,
  DataProductSearchResult,
  MarketplaceServerClient,
} from '@finos/legend-server-marketplace';
import {
  guaranteeNonNullable,
  type PlainObject,
  TracerService,
} from '@finos/legend-shared';
import { CubeDataProductEnvironmentType } from '../../../../CubeDataProduct.js';
import { CubeEngineError } from '../../../../CubeEngine.js';
import {
  V1_TEST__LITE_PAGE_ORDERS,
  V1_TEST__SEARCH_PAGE,
  V1_TEST__SEARCH_PAGE_KNOWN_SHAPES,
  V1_TEST__SEARCH_ROW_ORDERS,
  V1_TEST__searchPage,
  V1_TEST__UNREADABLE_SEARCH_ROWS,
} from '../__test-utils__/V1_CubeDataProductSearchFixtures.js';
import {
  V1_CUBE_DATA_PRODUCT_SEARCH_ERROR,
  V1_LegendCubeDataProductCatalog,
} from '../V1_LegendCubeDataProductCatalog.js';

const { PRODUCTION, PRODUCTION_PARALLEL } = CubeDataProductEnvironmentType;

const setUp = (): {
  catalog: V1_LegendCubeDataProductCatalog;
  liteCatalog: V1_LegendCubeDataProductCatalog;
  marketplace: MarketplaceServerClient;
  lite: jest.Mock;
} => {
  const contract = new LakehouseContractServerClient({
    baseUrl: 'http://lakehouse.test',
  });
  const depot = new DepotServerClient({ serverUrl: 'http://depot.test' });
  const marketplace = new MarketplaceServerClient({
    serverUrl: 'http://marketplace.test',
    subscriptionUrl: '',
  });
  // as the host's, traced
  marketplace.setTracerService(new TracerService());
  const lite = jest
    .spyOn(contract, 'getDataProductsLitePaginated')
    .mockImplementation((async () => V1_TEST__LITE_PAGE_ORDERS) as never);
  return {
    catalog: new V1_LegendCubeDataProductCatalog(
      contract,
      depot,
      () => 'token',
      marketplace,
    ),
    liteCatalog: new V1_LegendCubeDataProductCatalog(
      contract,
      depot,
      () => 'token',
    ),
    marketplace,
    lite: lite as unknown as jest.Mock,
  };
};

/** The marketplace's search, answering with the page given */
const answerSearch = (
  marketplace: MarketplaceServerClient,
  answer: () => Promise<unknown>,
): jest.Mock =>
  jest
    .spyOn(marketplace, 'lakehouseAccessSearch')
    .mockImplementation(answer as never) as unknown as jest.Mock;

const searchFailure = async (
  catalog: V1_LegendCubeDataProductCatalog,
): Promise<CubeEngineError> => {
  const failure = await catalog
    .search({ text: 'orders', environmentType: PRODUCTION })
    .catch((error: unknown) => error);
  expect(failure).toBeInstanceOf(CubeEngineError);
  return failure as CubeEngineError;
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Data product catalog, searching the marketplace', () => {
  test("Searches the marketplace for the text in the class, a page of full text matches, and never reads the lakehouse's list", async () => {
    const { catalog, liteCatalog, marketplace, lite } = setUp();
    const search = answerSearch(marketplace, async () => V1_TEST__SEARCH_PAGE);
    expect(catalog.searchesOnServer).toBe(true);
    expect(catalog.searchLimit).toBe(100);
    expect(liteCatalog.searchesOnServer).toBe(false);
    expect(liteCatalog.searchLimit).toBeUndefined();
    const abort = new AbortController();
    await catalog.search(
      { text: '  orders ', environmentType: PRODUCTION },
      abort.signal,
    );
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('orders', 'PRODUCTION', {
      searchType: 'full_text',
      pageSize: 100,
      pageNumber: 1,
      showAll: true,
      signal: abort.signal,
    });
    expect(lite).not.toHaveBeenCalled();
  });

  test('Sends the class as the path, with no data product type and no credentials', async () => {
    const { catalog } = setUp();
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        Promise.reject(new Error('No marketplace in tests')),
      );
    await expect(
      catalog.search({ text: 'orders', environmentType: PRODUCTION_PARALLEL }),
    ).rejects.toThrow("Cube couldn't search the data products");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [input, init] = guaranteeNonNullable(fetchSpy.mock.calls[0]);
    const url = new URL(String(input));
    expect(`${url.origin}${url.pathname}`).toBe(
      'http://marketplace.test/v1/search/lakehouseAccess/PRODUCTION_PARALLEL',
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      query: 'orders',
      search_type: 'full_text',
      page_size: '100',
      page_number: '1',
      include_filter_metadata: 'true',
      show_all: 'true',
    });
    expect(init?.credentials).toBe('omit');
  });

  test('Gives the same product the same candidate from a search as from the lite list', async () => {
    const { catalog, liteCatalog, marketplace } = setUp();
    answerSearch(marketplace, async () =>
      V1_TEST__searchPage([V1_TEST__SEARCH_ROW_ORDERS]),
    );
    const [searched] = await catalog.search({
      text: 'orders',
      environmentType: PRODUCTION,
    });
    const [listed] = await liteCatalog.search({
      text: '',
      environmentType: PRODUCTION,
    });
    expect(searched).toEqual(listed);
    expect(searched).toMatchObject({
      id: 'ORDERS_PRODUCT',
      deploymentId: '1234',
      dataProductPath: 'sales::products::OrdersProduct',
      title: 'Orders Product',
      producerEnvironmentName: 'sales-producer',
    });
    expect(searched?.description).toBeUndefined();
  });

  test('Titles a product with no title by its id, as the lite list does', async () => {
    const { catalog, marketplace } = setUp();
    answerSearch(marketplace, async () =>
      V1_TEST__searchPage([
        { ...V1_TEST__SEARCH_ROW_ORDERS, dataProductTitle: null },
      ]),
    );
    const [searched] = await catalog.search({
      text: 'orders',
      environmentType: PRODUCTION,
    });
    expect(searched?.title).toBe('ORDERS_PRODUCT');
  });

  test("Lists only the class's SDLC deployed products, reading each row on its own, so a row it can't read fails none of the others", async () => {
    const { catalog, marketplace } = setUp();
    answerSearch(marketplace, async () => V1_TEST__SEARCH_PAGE);
    expect(
      (
        await catalog.search({ text: 'orders', environmentType: PRODUCTION })
      ).map((product) => product.id),
    ).toEqual(['ORDERS_PRODUCT', 'CASED_PRODUCT']);
  });

  test("Takes an answer that is no page as an error, and a failed search as one, never falling back to the lakehouse's list", async () => {
    const { catalog, marketplace, lite } = setUp();
    const search = answerSearch(marketplace, async () => ({
      errorMessage: 'Search unavailable',
    }));
    const unreadable = await searchFailure(catalog);
    expect(unreadable.firstLine).toBe("Cube couldn't search the data products");
    expect(unreadable.detail).toContain(
      V1_CUBE_DATA_PRODUCT_SEARCH_ERROR.UNREADABLE_PAGE,
    );
    search.mockImplementation(async () => {
      throw new Error('Marketplace unavailable');
    });
    const failed = await searchFailure(catalog);
    expect(failed.firstLine).toBe("Cube couldn't search the data products");
    expect(failed.detail).toContain('Marketplace unavailable');
    expect(lite).not.toHaveBeenCalled();
  });

  test('Gives a stopped search its own error, not a failure to show', async () => {
    const { catalog, marketplace } = setUp();
    const stopped = new DOMException('The search was stopped', 'AbortError');
    const search = answerSearch(marketplace, async () => {
      throw stopped;
    });
    const abort = new AbortController();
    abort.abort();
    const failure = await catalog
      .search({ text: 'orders', environmentType: PRODUCTION }, abort.signal)
      .catch((error: unknown) => error);
    expect(failure).toBe(stopped);
    expect(
      (search.mock.calls[0]?.[2] as { signal?: AbortSignal } | undefined)
        ?.signal,
    ).toBe(abort.signal);
  });
});

describe("Cube's search fixtures", () => {
  test("Read as legend-server-marketplace's serializers read them", () => {
    expect(
      DataProductSearchResponse.serialization.fromJson(
        V1_TEST__SEARCH_PAGE_KNOWN_SHAPES,
      ).results,
    ).toHaveLength(
      (V1_TEST__SEARCH_PAGE_KNOWN_SHAPES.results as PlainObject[]).length,
    );
    const unreadable = (V1_TEST__SEARCH_PAGE.results as PlainObject[]).filter(
      (row) => {
        try {
          DataProductSearchResult.serialization.fromJson(row);
          return false;
        } catch {
          return true;
        }
      },
    );
    expect(unreadable).toEqual(V1_TEST__UNREADABLE_SEARCH_ROWS);
    expect(() =>
      DataProductSearchResponse.serialization.fromJson(V1_TEST__SEARCH_PAGE),
    ).toThrow();
  });

  test("Read as legend-graph's lite list helper reads them", () => {
    expect(
      V1_entitlementsDataProductLiteResponseToDataProductLite(
        V1_TEST__LITE_PAGE_ORDERS.liteDataProductsResponse as PlainObject,
      ).map((row) => row.id),
    ).toEqual(['ORDERS_PRODUCT']);
  });
});
