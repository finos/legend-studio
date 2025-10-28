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

import type { DataProductSearchResult } from '@finos/legend-server-marketplace';

export const mockSearchResult: DataProductSearchResult = {
  data_product_name: 'SDLC Release Data Product',
  data_product_description:
    'Comprehensive customer analytics data for business intelligence and reporting',
  chunk_id: 'test-chunk-id',
  data_product_link: 'https://test-data-product-link',
  embedding_type: 'test-embedding-type',
  vendor_name: 'Example Vendor',
  tags1: [],
  tags2: [],
  tag_score: 0,
  dataProductDetails: {
    group: 'com.example.analytics',
    artifact: 'customer-analytics',
    version: '1.2.0',
    path: 'test::SDLC_RELEASE_DATAPRODUCT',
  },
  similarity: 0.95,
  id: '123e4567-e89b-12d3-a456-426614174000',
};
