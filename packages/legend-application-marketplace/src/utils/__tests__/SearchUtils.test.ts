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
import {
  convertTrendingEntryToSearchResult,
<<<<<<< HEAD
  getSearchResultProjectGAV,
  generatePathForDataProductSearchResult,
  convertEntitlementsDataProductDetailsToSearchResult,
  convertLegacyDataProductToSearchResult,
  convertAutosuggestResultToSearchResult,
} from '../SearchUtils.js';
import {
  type TrendingDataProductEntry,
  type AutosuggestResult,
=======
  generatePathForDataProductSearchResult,
} from '../SearchUtils.js';
import {
  type TrendingDataProductEntry,
>>>>>>> c2686bef0 (add url for native lakehouse product)
  DataProductSearchResult,
  LakehouseDataProductSearchResultDetails,
  LakehouseSDLCDataProductSearchResultOrigin,
  LakehouseAdHocDataProductSearchResultOrigin,
  LegacyDataProductSearchResultDetails,
  DataProductDetailsType,
} from '@finos/legend-server-marketplace';
import {
  V1_EntitlementsDataProductDetails,
  V1_SdlcDeploymentDataProductOrigin,
  V1_EntitlementsLakehouseEnvironment,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_EntitlementsDataProduct,
} from '@finos/legend-graph';
import { V1_DataSpace } from '@finos/legend-extension-dsl-data-space/graph';

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

describe('getSearchResultProjectGAV', () => {
  test('returns GAV for lakehouse SDLC origin', () => {
    const result = new DataProductSearchResult();
    const details = new LakehouseDataProductSearchResultDetails();
    const origin = new LakehouseSDLCDataProductSearchResultOrigin();
    origin.groupId = 'com.example';
    origin.artifactId = 'my-artifact';
    origin.versionId = '1.0.0';
    details.origin = origin;
    result.dataProductDetails = details;

    const gav = getSearchResultProjectGAV(result);
    expect(gav).toEqual({
      groupId: 'com.example',
      artifactId: 'my-artifact',
      versionId: '1.0.0',
    });
  });

  test('returns undefined for lakehouse SDLC origin with null groupId', () => {
    const result = new DataProductSearchResult();
    const details = new LakehouseDataProductSearchResultDetails();
    const origin = new LakehouseSDLCDataProductSearchResultOrigin();
    origin.groupId = null;
    origin.artifactId = 'art';
    origin.versionId = '1.0.0';
    details.origin = origin;
    result.dataProductDetails = details;

    expect(getSearchResultProjectGAV(result)).toBeUndefined();
  });

  test('returns GAV for legacy details', () => {
    const result = new DataProductSearchResult();
    const details = new LegacyDataProductSearchResultDetails();
    details.groupId = 'com.legacy';
    details.artifactId = 'legacy-art';
    details.versionId = '2.0.0';
    result.dataProductDetails = details;

    const gav = getSearchResultProjectGAV(result);
    expect(gav).toEqual({
      groupId: 'com.legacy',
      artifactId: 'legacy-art',
      versionId: '2.0.0',
    });
  });

  test('returns undefined for lakehouse ad-hoc origin', () => {
    const result = new DataProductSearchResult();
    const details = new LakehouseDataProductSearchResultDetails();
    details.origin = new LakehouseAdHocDataProductSearchResultOrigin();
    result.dataProductDetails = details;

    expect(getSearchResultProjectGAV(result)).toBeUndefined();
  });
});

describe('generatePathForDataProductSearchResult', () => {
  test('generates path for lakehouse product', () => {
    const result = new DataProductSearchResult();
    const details = new LakehouseDataProductSearchResultDetails();
    details.dataProductId = 'dp-123';
    details.deploymentId = 456;
    result.dataProductDetails = details;

    const path = generatePathForDataProductSearchResult(result);
    expect(path).toBeDefined();
    expect(path).toContain('dp-123');
  });

  test('generates path for legacy product', () => {
    const result = new DataProductSearchResult();
    const details = new LegacyDataProductSearchResultDetails();
    details.groupId = 'com.example';
    details.artifactId = 'art';
    details.versionId = '1.0.0';
    details.path = 'my::DataSpace';
    result.dataProductDetails = details;

    const path = generatePathForDataProductSearchResult(result);
    expect(path).toBeDefined();
    expect(path).toContain('my::DataSpace');
  });
});

describe('convertEntitlementsDataProductDetailsToSearchResult', () => {
  test('converts SDLC origin entitlements details', () => {
    const dp = new V1_EntitlementsDataProduct();
    dp.name = 'MyDataProduct';

    const origin = new V1_SdlcDeploymentDataProductOrigin();
    origin.group = 'com.example';
    origin.artifact = 'my-art';
    origin.version = '1.0.0';

    const env = new V1_EntitlementsLakehouseEnvironment();
    env.producerEnvironmentName = 'prod-env';
    env.type = V1_EntitlementsLakehouseEnvironmentType.PRODUCTION;

    const details = new V1_EntitlementsDataProductDetails();
    details.id = 'dp-100';
    details.deploymentId = 200;
    details.title = 'Custom Title';
    details.description = 'A description';
    details.origin = origin;
    details.lakehouseEnvironment = env;
    details.dataProduct = dp;
    details.fullPath = 'com::example::MyDataProduct';

    const result = convertEntitlementsDataProductDetailsToSearchResult(details);

    expect(result.dataProductTitle).toBe('Custom Title');
    expect(result.dataProductDescription).toBe('A description');
    expect(result.dataProductDetails).toBeInstanceOf(
      LakehouseDataProductSearchResultDetails,
    );

    const lhDetails =
      result.dataProductDetails as LakehouseDataProductSearchResultDetails;
    expect(lhDetails.dataProductId).toBe('dp-100');
    expect(lhDetails.deploymentId).toBe(200);
    expect(lhDetails.producerEnvironmentName).toBe('prod-env');
    expect(lhDetails.producerEnvironmentType).toBe(
      V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
    );
    expect(lhDetails.origin).toBeInstanceOf(
      LakehouseSDLCDataProductSearchResultOrigin,
    );
    const sdlcOrigin =
      lhDetails.origin as LakehouseSDLCDataProductSearchResultOrigin;
    expect(sdlcOrigin.groupId).toBe('com.example');
    expect(sdlcOrigin.artifactId).toBe('my-art');
    expect(sdlcOrigin.versionId).toBe('1.0.0');
    expect(sdlcOrigin.path).toBe('MyDataProduct');
  });

  test('falls back to dataProduct.name when title is undefined', () => {
    const dp = new V1_EntitlementsDataProduct();
    dp.name = 'FallbackName';

    const details = new V1_EntitlementsDataProductDetails();
    details.id = 'dp-101';
    details.deploymentId = 1;
    details.dataProduct = dp;
    details.fullPath = 'com::example::FallbackName';

    const result = convertEntitlementsDataProductDetailsToSearchResult(details);
    expect(result.dataProductTitle).toBe('FallbackName');
    expect(result.dataProductDescription).toBe('');
  });

  test('creates ad-hoc origin when origin is not SDLC', () => {
    const dp = new V1_EntitlementsDataProduct();
    dp.name = 'AdHocProduct';

    const details = new V1_EntitlementsDataProductDetails();
    details.id = 'dp-102';
    details.deploymentId = 2;
    details.origin = null;
    details.dataProduct = dp;
    details.fullPath = 'com::example::AdHocProduct';

    const result = convertEntitlementsDataProductDetailsToSearchResult(details);

    const lhDetails =
      result.dataProductDetails as LakehouseDataProductSearchResultDetails;
    expect(lhDetails.origin).toBeInstanceOf(
      LakehouseAdHocDataProductSearchResultOrigin,
    );
  });
});

describe('convertLegacyDataProductToSearchResult', () => {
  test('converts V1_DataSpace to legacy search result', () => {
    const dataSpace = new V1_DataSpace();
    dataSpace.name = 'MyDataSpace';
    dataSpace.package = 'com::example';
    dataSpace.title = 'My Title';
    dataSpace.description = 'My Description';
    dataSpace.executionContexts = [];
    dataSpace.defaultExecutionContext = 'default';

    const result = convertLegacyDataProductToSearchResult(
      dataSpace,
      'com.example',
      'my-artifact',
      '1.0.0',
    );

    expect(result.dataProductTitle).toBe('My Title');
    expect(result.dataProductDescription).toBe('My Description');
    expect(result.dataProductDetails).toBeInstanceOf(
      LegacyDataProductSearchResultDetails,
    );
    const details =
      result.dataProductDetails as LegacyDataProductSearchResultDetails;
    expect(details.groupId).toBe('com.example');
    expect(details.artifactId).toBe('my-artifact');
    expect(details.versionId).toBe('1.0.0');
    expect(details.path).toBe('com::example::MyDataSpace');
  });

  test('falls back to name when title is undefined', () => {
    const dataSpace = new V1_DataSpace();
    dataSpace.name = 'FallbackName';
    dataSpace.package = 'pkg';
    dataSpace.executionContexts = [];
    dataSpace.defaultExecutionContext = 'default';

    const result = convertLegacyDataProductToSearchResult(
      dataSpace,
      'g',
      'a',
      'v',
    );

    expect(result.dataProductTitle).toBe('FallbackName');
    expect(result.dataProductDescription).toBe('');
  });
});

describe('convertAutosuggestResultToSearchResult', () => {
  test('converts lakehouse autosuggest result with SDLC origin', () => {
    const autosuggest: AutosuggestResult = {
      dataProductName: 'Suggested Product',
      dataProductDescription: 'A suggestion',
      matchedText: 'suggest',
      dataProductDetails: {
        _type: DataProductDetailsType.LAKEHOUSE,
        groupId: 'com.suggest',
        artifactId: 'sg-art',
        versionId: '1.0.0',
        path: 'com::suggest::Product',
        dataProductId: 'dp-999',
        deploymentId: 42,
        producerEnvironmentName: 'env-1',
        producerEnvironmentType: 'PRODUCTION',
        origin: {
          _type: 'SdlcDeployment',
          groupId: 'com.suggest',
          artifactId: 'sg-art',
          versionId: '1.0.0',
          path: 'com::suggest::Product',
        },
      },
    };

    const result = convertAutosuggestResultToSearchResult(autosuggest);

    expect(result.dataProductTitle).toBe('Suggested Product');
    expect(result.dataProductDescription).toBe('A suggestion');
    expect(result.tags1).toEqual([]);
    expect(result.tags2).toEqual([]);
    expect(result.tag_score).toBe(0);
    expect(result.similarity).toBe(0);
    expect(result.dataProductDetails).toBeInstanceOf(
      LakehouseDataProductSearchResultDetails,
    );

    const details =
      result.dataProductDetails as LakehouseDataProductSearchResultDetails;
    expect(details.dataProductId).toBe('dp-999');
    expect(details.deploymentId).toBe(42);
    expect(details.producerEnvironmentName).toBe('env-1');
    expect(details.origin).toBeInstanceOf(
      LakehouseSDLCDataProductSearchResultOrigin,
    );
  });

  test('converts lakehouse autosuggest result without origin', () => {
    const autosuggest: AutosuggestResult = {
      dataProductName: 'No Origin Product',
      dataProductDescription: 'desc',
      matchedText: 'no',
      dataProductDetails: {
        _type: DataProductDetailsType.LAKEHOUSE,
        groupId: '',
        artifactId: '',
        versionId: '',
        path: '',
        dataProductId: 'dp-adhoc',
        deploymentId: 0,
      },
    };

    const result = convertAutosuggestResultToSearchResult(autosuggest);

    const details =
      result.dataProductDetails as LakehouseDataProductSearchResultDetails;
    expect(details.origin).toBeInstanceOf(
      LakehouseAdHocDataProductSearchResultOrigin,
    );
  });

  test('converts legacy autosuggest result', () => {
    const autosuggest: AutosuggestResult = {
      dataProductName: 'Legacy Suggest',
      dataProductDescription: 'legacy desc',
      matchedText: 'leg',
      dataProductDetails: {
        _type: DataProductDetailsType.LEGACY,
        groupId: 'com.legacy',
        artifactId: 'lg-art',
        versionId: '3.0.0',
        path: 'com::legacy::DataSpace',
      },
    };

    const result = convertAutosuggestResultToSearchResult(autosuggest);

    expect(result.dataProductTitle).toBe('Legacy Suggest');
    expect(result.dataProductDetails).toBeInstanceOf(
      LegacyDataProductSearchResultDetails,
    );
    const details =
      result.dataProductDetails as LegacyDataProductSearchResultDetails;
    expect(details.groupId).toBe('com.legacy');
    expect(details.artifactId).toBe('lg-art');
    expect(details.versionId).toBe('3.0.0');
    expect(details.path).toBe('com::legacy::DataSpace');
describe('generatePathForDataProductSearchResult', () => {
  const makeLegacyResult = (
    groupId: string,
    artifactId: string,
    versionId: string,
    path: string,
    dataProductLink?: string,
  ): DataProductSearchResult => {
    const result = new DataProductSearchResult();
    const details = new LegacyDataProductSearchResultDetails();
    details.groupId = groupId;
    details.artifactId = artifactId;
    details.versionId = versionId;
    details.path = path;
    result.dataProductDetails = details;
    result.data_product_link = dataProductLink;
    return result;
  };

  test('legacy result without data_product_link uses legacy path', () => {
    const result = makeLegacyResult(
      'com.example',
      'my-artifact',
      '1.0.0',
      'com::example::MyProduct',
    );
    expect(generatePathForDataProductSearchResult(result)).toBe(
      '/dataProduct/legacy/com.example:my-artifact:1.0.0/com::example::MyProduct',
    );
  });

  test('legacy result with legacy data_product_link uses legacy path', () => {
    const result = makeLegacyResult(
      'com.example',
      'my-artifact',
      '1.0.0',
      'com::example::MyProduct',
      'https://marketplace.example.com/dataProduct/legacy/com.example:my-artifact:1.0.0/com%3A%3Aexample%3A%3AMyProduct',
    );
    expect(generatePathForDataProductSearchResult(result)).toBe(
      '/dataProduct/legacy/com.example:my-artifact:1.0.0/com::example::MyProduct',
    );
  });

  test('legacy result with non-legacy data_product_link uses native LH path', () => {
    const result = makeLegacyResult(
      'com.example',
      'my-artifact',
      '1.0.0',
      'com::example::MyProduct',
      'https://marketplace.example.com/dataProduct/com.example:my-artifact:1.0.0/com%3A%3Aexample%3A%3AMyProduct',
    );
    expect(generatePathForDataProductSearchResult(result)).toBe(
      '/dataProduct/com.example:my-artifact:1.0.0/com::example::MyProduct',
    );
  });

  test('legacy result with undefined data_product_link uses legacy path', () => {
    const result = makeLegacyResult(
      'org.test',
      'artifact',
      '2.0.0',
      'org::test::Product',
      undefined,
    );
    expect(generatePathForDataProductSearchResult(result)).toBe(
      '/dataProduct/legacy/org.test:artifact:2.0.0/org::test::Product',
    );
  });

  test('legacy result with malformed data_product_link uses legacy path', () => {
    const result = makeLegacyResult(
      'org.test',
      'artifact',
      '2.0.0',
      'org::test::Product',
      'not-a-url',
    );
    expect(generatePathForDataProductSearchResult(result)).toBe(
      '/dataProduct/legacy/org.test:artifact:2.0.0/org::test::Product',
    );
  });

  test('returns undefined for result with no dataProductDetails', () => {
    const result = new DataProductSearchResult();
    expect(generatePathForDataProductSearchResult(result)).toBeUndefined();
  });
});
