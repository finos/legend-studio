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

import { test, describe, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  DataProductSearchResponse,
  DataProductSearchResult,
  DataProductSearchResultMetadata,
  ErrorDataProductSearchResultDetails,
  LakehouseDataProductSearchResultDetails,
  LakehouseSDLCDataProductSearchResultOrigin,
  LegacyDataProductSearchResultDetails,
} from '../DataProductSearchResult.js';

describe(unitTest('DataProductSearchResultMetadata'), () => {
  test(unitTest('deserializes internal_source_count when present'), () => {
    const metadata = DataProductSearchResultMetadata.serialization.fromJson({
      next_page_number: null,
      num_pages: 1,
      page_number: 1,
      page_size: 12,
      prev_page_number: null,
      total_count: 4,
      external_source_count: 2,
      internal_source_count: 3,
    });

    expect(metadata.internal_source_count).toBe(3);
    expect(metadata.external_source_count).toBe(2);
  });

  test(
    unitTest('tolerates internal_source_count being absent (older responses)'),
    () => {
      const metadata = DataProductSearchResultMetadata.serialization.fromJson({
        next_page_number: null,
        num_pages: 1,
        page_number: 1,
        page_size: 12,
        prev_page_number: null,
        total_count: 4,
      });

      expect(metadata.internal_source_count).toBeUndefined();
    },
  );
});

describe(unitTest('DataProductSearchResult'), () => {
  test(
    unitTest(
      'deserializes a lakehouse result without embedding_type or vendor_name',
    ),
    () => {
      // Neither field is a declared class property; a response that omits them
      // (the common case, and the only case going forward once Stage 3 removes
      // embeddings from the Data Product pipeline) must deserialize cleanly.
      const result = DataProductSearchResult.serialization.fromJson({
        dataProductTitle: 'Lakehouse SDLC Data Product',
        dataProductDescription: 'A lakehouse data product',
        tags1: ['finance'],
        tags2: ['referenceData'],
        tag_score: 0.5,
        similarity: 0.9,
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
      });

      expect(result.dataProductTitle).toBe('Lakehouse SDLC Data Product');
      expect(result.dataProductDetails).toBeInstanceOf(
        LakehouseDataProductSearchResultDetails,
      );
      const details =
        result.dataProductDetails as LakehouseDataProductSearchResultDetails;
      expect(details.dataProductId).toBe('LAKEHOUSE_SDLC_DATA_PRODUCT');
      expect(details.origin).toBeInstanceOf(
        LakehouseSDLCDataProductSearchResultOrigin,
      );
    },
  );

  test(unitTest('deserializes a legacy (DataSpace) result'), () => {
    const result = DataProductSearchResult.serialization.fromJson({
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
    });

    expect(result.dataProductDetails).toBeInstanceOf(
      LegacyDataProductSearchResultDetails,
    );
  });

  test(unitTest('deserializes an error result'), () => {
    const result = DataProductSearchResult.serialization.fromJson({
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
    });

    expect(result.dataProductDetails).toBeInstanceOf(
      ErrorDataProductSearchResultDetails,
    );
    expect(
      (result.dataProductDetails as ErrorDataProductSearchResultDetails)
        .message,
    ).toBe('Could not resolve data product');
  });
});

describe(unitTest('DataProductSearchResponse'), () => {
  test(
    unitTest('deserializes a full response including filters_metadata'),
    () => {
      const response = DataProductSearchResponse.serialization.fromJson({
        results: [
          {
            dataProductTitle: 'Legacy Data Product',
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
              path: 'test::Legacy_Data_Product',
            },
          },
        ],
        as_of_time: '2026-01-27T00:00:00.000Z',
        metadata: {
          next_page_number: null,
          num_pages: 1,
          page_number: 1,
          page_size: 12,
          prev_page_number: null,
          total_count: 1,
          lakehouse_count: 0,
          legacy_count: 1,
          external_source_count: 0,
          internal_source_count: 1,
        },
        filters_metadata: {
          taxonomy_tree: [
            {
              id: 'referenceData',
              label: 'Reference Data',
              count: 1,
              children: [],
            },
          ],
        },
      });

      expect(response.results).toHaveLength(1);
      expect(response.metadata.internal_source_count).toBe(1);
      expect(response.filters_metadata?.taxonomy_tree).toHaveLength(1);
    },
  );

  test(unitTest('deserializes a response with no filters_metadata'), () => {
    const response = DataProductSearchResponse.serialization.fromJson({
      results: [],
      as_of_time: '2026-01-27T00:00:00.000Z',
      metadata: {
        next_page_number: null,
        num_pages: 0,
        page_number: 1,
        page_size: 12,
        prev_page_number: null,
        total_count: 0,
      },
    });

    expect(response.results).toHaveLength(0);
    expect(response.filters_metadata).toBeUndefined();
  });
});
