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

import { type PlainObject } from '@finos/legend-shared';
import type {
  DataProductSearchResponse,
  DataProductSearchResult,
} from '@finos/legend-server-marketplace';

const createMockPaginatedResult = (
  index: number,
): PlainObject<DataProductSearchResult> => ({
  dataProductTitle: `Paginated Data Product ${index}`,
  dataProductDescription: `Description for paginated data product ${index}`,
  tags1: [],
  tags2: [],
  tag_score: 0,
  similarity: 1 - index * 0.05,
  dataProductSource: 'Internal',
  dataProductDetails: {
    _type: 'lakehouse',
    dataProductId: `PAGINATED_DATA_PRODUCT_${index}`,
    deploymentId: 10000 + index,
    producerEnvironmentName: 'test-prod-producer-env',
    producerEnvironmentType: 'PRODUCTION',
    origin: {
      _type: 'SdlcDeployment',
      groupId: 'com.example.paginated',
      artifactId: `paginated-data-product-${index}`,
      versionId: '1.0.0',
      path: `test::Paginated_Data_Product_${index}`,
    },
  },
});

const mockProdSearchResults: PlainObject<DataProductSearchResult>[] = [
  {
    dataProductTitle: 'Lakehouse SDLC Data Product',
    dataProductDescription: 'This is a lakehouse SDLC Data Product',
    tags1: [],
    tags2: [],
    tag_score: 0,
    similarity: 0,
    dataProductSource: 'External',
    licenseTo: 'Enterprise',
    dataProductDetails: {
      _type: 'lakehouse',
      dataProductId: 'LAKEHOUSE_SDLC_DATA_PRODUCT',
      deploymentId: 12345,
      producerEnvironmentName: 'test-prod-producer-env',
      producerEnvironmentType: 'PRODUCTION',
      origin: {
        _type: 'SdlcDeployment',
        groupId: 'com.example.lakehouse',
        artifactId: 'lakehouse-sdlc-data-product',
        versionId: '1.0.0',
        path: 'test::Lakehouse_Sdlc_Data_Product',
      },
    },
  },
  {
    dataProductTitle: null,
    dataProductDescription: null,
    embedding_type: 'PRODUCT',
    vendor_name: '',
    tags1: [],
    tags2: [],
    tag_score: 0,
    similarity: 0,
    dataProductDetails: {
      _type: 'lakehouse',
      dataProductId: 'LAKEHOUSE_SDLC_DATA_PRODUCT_NO_TITLE',
      deploymentId: 12345,
      producerEnvironmentName: 'test-prod-producer-env',
      producerEnvironmentType: 'PRODUCTION',
      origin: {
        _type: 'SdlcDeployment',
        groupId: 'com.example.lakehouse',
        artifactId: 'lakehouse-sdlc-data-product',
        versionId: '1.0.0',
        path: 'test::Lakehouse_Sdlc_Data_Product_No_Title',
      },
    },
  },
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
      _type: 'legacy',
      groupId: 'com.example.legacy',
      artifactId: 'legacy-data-product',
      versionId: '2.0.0',
      path: 'test::Legacy_Data_Product_No_Title',
    },
  },
];

export const mockProdSearchResultResponse: PlainObject<DataProductSearchResponse> =
  {
    results: mockProdSearchResults,
    metadata: {
      total_count: mockProdSearchResults.length,
      num_pages: 1,
      page_size: mockProdSearchResults.length,
      page_number: 1,
      next_page_number: null,
      prev_page_number: null,
    },
    as_of_time: '2026-01-27T00:00:00.000Z',
  };

const mockProdParSearchResults: PlainObject<DataProductSearchResult>[] = [
  {
    dataProductTitle: 'Lakehouse SDLC Data Product',
    dataProductDescription: 'This is a lakehouse SDLC Data Product',
    tags1: [],
    tags2: [],
    tag_score: 0,
    similarity: 0,
    dataProductSource: 'Internal',
    licenseTo: 'GBM',
    dataProductDetails: {
      _type: 'lakehouse',
      dataProductId: 'LAKEHOUSE_SDLC_DATA_PRODUCT',
      deploymentId: 23456,
      producerEnvironmentName: 'test-prod-producer-env',
      producerEnvironmentType: 'PRODUCTION_PARALLEL',
      origin: {
        _type: 'SdlcDeployment',
        groupId: 'com.example',
        artifactId: 'lakehouse-sdlc-data-product',
        versionId: '1.0.0',
        path: 'test::Lakehouse_Sdlc_Data_Product',
      },
    },
  },
  {
    dataProductTitle: 'Lakehouse Ad-hoc Data Product',
    dataProductDescription: 'This is a lakehouse Ad-hoc Data Product',
    tags1: [],
    tags2: [],
    tag_score: 0,
    similarity: 0,
    dataProductSource: 'External',
    dataProductDetails: {
      _type: 'lakehouse',
      dataProductId: 'LAKEHOUSE_ADHOC_DATA_PRODUCT',
      deploymentId: 34567,
      producerEnvironmentName: 'test-prod-producer-env',
      producerEnvironmentType: 'PRODUCTION_PARALLEL',
      origin: {
        _type: 'AdHocDeployment',
      },
    },
  },
];

export const mockProdParSearchResultResponse: PlainObject<DataProductSearchResponse> =
  {
    results: mockProdParSearchResults,
    metadata: {
      total_count: mockProdParSearchResults.length,
      num_pages: 1,
      page_size: mockProdParSearchResults.length,
      page_number: 1,
      next_page_number: null,
      prev_page_number: null,
    },
    as_of_time: '2026-01-27T00:00:00.000Z',
  };

const mockDevSearchResults: PlainObject<DataProductSearchResult>[] = [
  {
    dataProductTitle: 'Lakehouse SDLC Data Product',
    dataProductDescription: 'This is a lakehouse SDLC Data Product',
    tags1: [],
    tags2: [],
    tag_score: 0,
    similarity: 0,
    licenseTo: 'Enterprise',
    dataProductDetails: {
      _type: 'lakehouse',
      dataProductId: 'LAKEHOUSE_SDLC_DATA_PRODUCT',
      deploymentId: 45678,
      producerEnvironmentName: 'test-prod-producer-env',
      producerEnvironmentType: 'DEVELOPMENT',
      origin: {
        _type: 'SdlcDeployment',
        groupId: 'com.example',
        artifactId: 'lakehouse-sdlc-data-product',
        versionId: 'test_branch-SNAPSHOT',
        path: 'test::Lakehouse_Sdlc_Data_Product',
      },
    },
  },
  {
    dataProductTitle: 'Lakehouse Ad-hoc Data Product',
    dataProductDescription: 'This is a lakehouse Ad-hoc Data Product',
    tags1: [],
    tags2: [],
    tag_score: 0,
    similarity: 0,
    dataProductDetails: {
      _type: 'lakehouse',
      dataProductId: 'LAKEHOUSE_ADHOC_DATA_PRODUCT',
      deploymentId: 45678,
      producerEnvironmentName: 'test-prod-producer-env',
      producerEnvironmentType: 'DEVELOPMENT',
      origin: {
        _type: 'AdHocDeployment',
      },
    },
  },
];

export const mockDevSearchResultResponse: PlainObject<DataProductSearchResponse> =
  {
    results: mockDevSearchResults,
    metadata: {
      total_count: mockDevSearchResults.length,
      num_pages: 1,
      page_size: mockDevSearchResults.length,
      page_number: 1,
      next_page_number: null,
      prev_page_number: null,
    },
    as_of_time: '2026-01-27T00:00:00.000Z',
  };

const mockPaginatedPage1Results: PlainObject<DataProductSearchResult>[] =
  Array.from({ length: 12 }, (_, i) => createMockPaginatedResult(i + 1));

const mockPaginatedPage2Results: PlainObject<DataProductSearchResult>[] =
  Array.from({ length: 3 }, (_, i) => createMockPaginatedResult(i + 13));

const TOTAL_PAGINATED_RESULTS = 15;

export const mockPaginatedSearchResultPage1Response: PlainObject<DataProductSearchResponse> =
  {
    results: mockPaginatedPage1Results,
    metadata: {
      total_count: TOTAL_PAGINATED_RESULTS,
      num_pages: 2,
      page_size: 12,
      page_number: 1,
      next_page_number: 2,
      prev_page_number: null,
    },
    as_of_time: '2026-01-27T00:00:00.000Z',
  };

export const mockPaginatedSearchResultPage2Response: PlainObject<DataProductSearchResponse> =
  {
    results: mockPaginatedPage2Results,
    metadata: {
      total_count: TOTAL_PAGINATED_RESULTS,
      num_pages: 2,
      page_size: 12,
      page_number: 2,
      next_page_number: null,
      prev_page_number: 1,
    },
    as_of_time: '2026-01-27T00:00:00.000Z',
  };
