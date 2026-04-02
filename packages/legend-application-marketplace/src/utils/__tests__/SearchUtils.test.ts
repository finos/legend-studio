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

import { describe, expect, test } from '@jest/globals';
import { convertTrendingEntryToSearchResult } from '../SearchUtils.js';
import {
  type TrendingDataProductEntry,
  LakehouseDataProductSearchResultDetails,
  LakehouseSDLCDataProductSearchResultOrigin,
  LakehouseAdHocDataProductSearchResultOrigin,
  LegacyDataProductSearchResultDetails,
} from '@finos/legend-server-marketplace';

describe('convertTrendingEntryToSearchResult', () => {
  test('converts a lakehouse SDLC trending entry to search result', () => {
    const entry: TrendingDataProductEntry = {
      dataProductId: 'dp-123',
      deploymentId: '456',
      dataProductType: 'lakehouse',
      productName: 'My Product',
      dataProductName: 'My Data Product Name',
      productDescription: 'A description',
      dataProductSource: 'sourceA',
      licenseTo: 'teamB',
      groupId: 'com.example',
      artifactId: 'my-artifact',
      versionId: '1.0.0',
      dataProductPath: 'com::example::MyDataProduct',
      originType: 'SdlcDeployment',
      producerEnvironmentName: 'production-analytics',
      producerEnvironmentType: 'prod',
    };

    const result = convertTrendingEntryToSearchResult(entry);

    // Uses dataProductName over productName when available
    expect(result.dataProductTitle).toBe('My Data Product Name');
    expect(result.dataProductDescription).toBe('A description');
    expect(result.dataProductSource).toBe('sourceA');
    expect(result.licenseTo).toBe('teamB');
    expect(result.tag_score).toBe(0);
    expect(result.similarity).toBe(0);

    // Should create lakehouse details with SDLC origin
    expect(result.dataProductDetails).toBeInstanceOf(
      LakehouseDataProductSearchResultDetails,
    );
    const details =
      result.dataProductDetails as LakehouseDataProductSearchResultDetails;
    expect(details.dataProductId).toBe('dp-123');
    expect(details.deploymentId).toBe(456);
    expect(details.producerEnvironmentName).toBe('production-analytics');
    expect(details.origin).toBeInstanceOf(
      LakehouseSDLCDataProductSearchResultOrigin,
    );
    const origin = details.origin as LakehouseSDLCDataProductSearchResultOrigin;
    expect(origin.groupId).toBe('com.example');
    expect(origin.artifactId).toBe('my-artifact');
    expect(origin.versionId).toBe('1.0.0');
    expect(origin.path).toBe('com::example::MyDataProduct');
  });

  test('converts a lakehouse ad-hoc trending entry to search result', () => {
    const entry: TrendingDataProductEntry = {
      dataProductId: 'dp-789',
      deploymentId: '101',
      dataProductType: 'lakehouse',
      productName: 'Ad Hoc Product',
      productDescription: 'Ad hoc description',
      originType: 'AdHocDeployment',
    };

    const result = convertTrendingEntryToSearchResult(entry);

    expect(result.dataProductTitle).toBe('Ad Hoc Product');
    expect(result.dataProductDescription).toBe('Ad hoc description');

    const details =
      result.dataProductDetails as LakehouseDataProductSearchResultDetails;
    expect(details.dataProductId).toBe('dp-789');
    expect(details.deploymentId).toBe(101);
    expect(details.origin).toBeInstanceOf(
      LakehouseAdHocDataProductSearchResultOrigin,
    );
  });

  test('converts a legacy trending entry to search result', () => {
    const entry: TrendingDataProductEntry = {
      dataProductType: 'legacy',
      productName: 'Legacy Product',
      productDescription: 'Legacy description',
      groupId: 'com.legacy',
      artifactId: 'legacy-artifact',
      versionId: '2.0.0',
      dataProductPath: 'com::legacy::DataProduct',
    };

    const result = convertTrendingEntryToSearchResult(entry);

    expect(result.dataProductTitle).toBe('Legacy Product');
    expect(result.dataProductDescription).toBe('Legacy description');

    expect(result.dataProductDetails).toBeInstanceOf(
      LegacyDataProductSearchResultDetails,
    );
    const details =
      result.dataProductDetails as LegacyDataProductSearchResultDetails;
    expect(details.groupId).toBe('com.legacy');
    expect(details.artifactId).toBe('legacy-artifact');
    expect(details.versionId).toBe('2.0.0');
    expect(details.path).toBe('com::legacy::DataProduct');
  });

  test('falls back to productName when dataProductName is undefined', () => {
    const entry: TrendingDataProductEntry = {
      dataProductType: 'lakehouse',
      productName: 'Fallback Name',
      originType: 'AdHocDeployment',
    };

    const result = convertTrendingEntryToSearchResult(entry);
    expect(result.dataProductTitle).toBe('Fallback Name');
  });

  test('defaults to empty strings for missing optional fields', () => {
    const entry: TrendingDataProductEntry = {
      dataProductType: 'lakehouse',
      productName: 'Minimal Entry',
      originType: 'SdlcDeployment',
    };

    const result = convertTrendingEntryToSearchResult(entry);

    expect(result.dataProductDescription).toBe('');
    expect(result.dataProductSource).toBeUndefined();
    expect(result.licenseTo).toBeUndefined();

    const details =
      result.dataProductDetails as LakehouseDataProductSearchResultDetails;
    expect(details.dataProductId).toBe('');
    expect(details.deploymentId).toBe(0);
    expect(details.producerEnvironmentName).toBe('');

    const origin = details.origin as LakehouseSDLCDataProductSearchResultOrigin;
    expect(origin.groupId).toBe('');
    expect(origin.artifactId).toBe('');
    expect(origin.versionId).toBe('');
    expect(origin.path).toBe('');
  });
});
