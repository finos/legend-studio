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

import type { PlainObject } from '@finos/legend-shared';

// A page of the marketplace's Lakehouse Access search, and the same product
// as a page of the lakehouse's lite list, for Cube's tests. The search rows
// and page are copied from legend-server-marketplace's
// DataProductSearchResult.test.ts and legend-application-marketplace's
// TEST_DATA__LakehouseSearchResultData.ts (createMockPaginatedResult,
// mockLakehouseAccessSearchResultResponse); the lite page from
// legend-server-lakehouse's LakehouseContractServerClient.test.ts. Nothing is
// imported from another package's test utils

const ORDERS_SEARCH_ORIGIN: PlainObject = {
  _type: 'SdlcDeployment',
  groupId: 'com.example.sales',
  artifactId: 'orders-products',
  versionId: '1.4.0',
  path: 'sales::products::OrdersProduct',
};

/** A lakehouse search row; its details as given, over the orders product's, an undefined one left out */
const searchRow = (details: Record<string, unknown>): PlainObject => {
  const fields: Record<string, unknown> = {
    _type: 'lakehouse',
    deploymentId: 1234,
    producerEnvironmentName: 'sales-producer',
    producerEnvironmentType: 'PRODUCTION',
    origin: ORDERS_SEARCH_ORIGIN,
    ...details,
  };
  return {
    dataProductTitle: `${String(details.dataProductId)} title`,
    dataProductDescription: `About ${String(details.dataProductId)}`,
    tags1: [],
    tags2: [],
    tag_score: 0,
    similarity: 0.9,
    dataProductSource: 'Internal',
    dataProductDetails: Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    ),
  };
};

/** The orders product deployed to Production, as a search row: no description */
export const V1_TEST__SEARCH_ROW_ORDERS: PlainObject = {
  ...searchRow({ dataProductId: 'ORDERS_PRODUCT' }),
  dataProductTitle: 'Orders Product',
  dataProductDescription: null,
};

/** A product whose class comes in 'Production' casing, as some deployments send it */
export const V1_TEST__SEARCH_ROW_CASED: PlainObject = searchRow({
  dataProductId: 'CASED_PRODUCT',
  producerEnvironmentType: 'Production',
});

/** Rows the search's serializer reads, but Cube doesn't list: one of each kind */
export const V1_TEST__UNLISTED_SEARCH_ROWS: readonly PlainObject[] = [
  searchRow({
    dataProductId: 'ADHOC_PRODUCT',
    origin: { _type: 'AdHocDeployment' },
  }),
  searchRow({ dataProductId: 'NULL_ORIGIN_PRODUCT', origin: null }),
  searchRow({ dataProductId: 'NO_ORIGIN_PRODUCT', origin: undefined }),
  searchRow({
    dataProductId: 'NO_GROUP_PRODUCT',
    origin: { ...ORDERS_SEARCH_ORIGIN, groupId: null },
  }),
  searchRow({
    dataProductId: 'NO_PATH_PRODUCT',
    origin: { ...ORDERS_SEARCH_ORIGIN, path: '' },
  }),
  searchRow({
    dataProductId: 'NO_DEPLOYMENT_PRODUCT',
    deploymentId: undefined,
  }),
  searchRow({ dataProductId: '' }),
  searchRow({
    dataProductId: 'PARALLEL_PRODUCT',
    producerEnvironmentType: 'PRODUCTION_PARALLEL',
  }),
  searchRow({
    dataProductId: 'NO_CLASS_PRODUCT',
    producerEnvironmentType: undefined,
  }),
  {
    dataProductTitle: 'Legacy Data Product',
    dataProductDescription: 'This is a legacy Data Product',
    tags1: [],
    tags2: [],
    tag_score: 0,
    similarity: 0,
    dataProductDetails: {
      _type: 'legacy',
      groupId: 'com.example.legacy',
      artifactId: 'legacy-data-product',
      versionId: '2.0.0',
      path: 'test::Legacy_Data_Product',
    },
  },
  {
    dataProductTitle: null,
    dataProductDescription: null,
    tags1: [],
    tags2: [],
    tag_score: 0,
    similarity: 0,
    dataProductDetails: {
      _type: 'error',
      message: 'Could not resolve data product',
    },
  },
];

/** Rows of a type the search's serializer doesn't know, on which it throws */
export const V1_TEST__UNREADABLE_SEARCH_ROWS: readonly PlainObject[] = [
  searchRow({
    dataProductId: 'UNKNOWN_ORIGIN_PRODUCT',
    origin: { _type: 'FutureDeployment' },
  }),
  {
    ...searchRow({ dataProductId: 'UNKNOWN_DETAILS_PRODUCT' }),
    dataProductDetails: { _type: 'future', dataProductId: 'FUTURE' },
  },
];

/** A Lakehouse Access answer: one page of the rows given */
export const V1_TEST__searchPage = (
  rows: readonly PlainObject[],
  totalCount = rows.length,
): PlainObject => ({
  results: rows,
  metadata: {
    total_count: totalCount,
    num_pages: 1,
    page_size: 100,
    page_number: 1,
    next_page_number: null,
    prev_page_number: null,
    lakehouse_count: rows.length,
    legacy_count: 0,
  },
  as_of_time: '2026-01-27T00:00:00.000Z',
});

/** Every kind of row, the ones Cube can't read among the ones it lists */
export const V1_TEST__SEARCH_PAGE: PlainObject = V1_TEST__searchPage([
  V1_TEST__SEARCH_ROW_ORDERS,
  ...V1_TEST__UNREADABLE_SEARCH_ROWS,
  ...V1_TEST__UNLISTED_SEARCH_ROWS,
  V1_TEST__SEARCH_ROW_CASED,
]);

/** The rows whose types the search's serializer knows, which it reads as a whole page */
export const V1_TEST__SEARCH_PAGE_KNOWN_SHAPES: PlainObject =
  V1_TEST__searchPage([
    V1_TEST__SEARCH_ROW_ORDERS,
    ...V1_TEST__UNLISTED_SEARCH_ROWS,
    V1_TEST__SEARCH_ROW_CASED,
  ]);

/** The orders product deployed to Production, as the lakehouse's lite list gives it: no description */
export const V1_TEST__LITE_PAGE_ORDERS: PlainObject = {
  liteDataProductsResponse: {
    dataProducts: [
      {
        id: 'ORDERS_PRODUCT',
        deploymentId: 1234,
        title: 'Orders Product',
        description: null,
        origin: {
          type: 'SdlcDeployment',
          group: 'com.example.sales',
          artifact: 'orders-products',
          version: '1.4.0',
        },
        fullPath: 'sales::products::OrdersProduct',
        lakehouseEnvironment: {
          producerEnvironmentName: 'sales-producer',
          type: 'PRODUCTION',
        },
      },
    ],
  },
  paginationMetadataRecord: {
    hasNextPage: false,
    size: 1000,
    lastValuesMap: { id: 'ORDERS_PRODUCT', deployment_id: 1234 },
  },
};
