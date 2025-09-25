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

import { describe, jest, test } from '@jest/globals';
import { screen } from '@testing-library/react';
import {
  TEST__provideMockLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { type PlainObject } from '@finos/legend-shared';
import { type V1_EntitlementsDataProductDetailsResponse } from '@finos/legend-graph';
import {
  mockAdHocDataProductPMCD,
  mockEntitlementsAdHocDataProduct,
  mockEntitlementsSDLCDataProduct,
  mockSDLCDataProductEntitiesResponse,
} from '../__test-utils__/TEST_DATA__LakehouseDataProducts.js';
import { createSpy } from '@finos/legend-shared/test';
import { ENGINE_TEST_SUPPORT__getClassifierPathMapping } from '@finos/legend-graph/test';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: Record<PropertyKey, unknown>;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

enum MOCK_DataProductId {
  MOCK_SDLC_DATAPRODUCT = 'MOCK_SDLC_DATAPRODUCT',
  MOCK_ADHOC_DATAPRODUCT = 'MOCK_ADHOC_DATAPRODUCT',
}

const setupLakehouseDataProductTest = async (
  dataProductId: MOCK_DataProductId,
  deploymentId: number,
) => {
  const mockedStore = await TEST__provideMockLegendMarketplaceBaseStore();

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getDataProductByIdAndDID',
  ).mockImplementation(async (_dataProductId: string) => {
    if (_dataProductId === MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT) {
      return mockEntitlementsSDLCDataProduct as unknown as PlainObject<V1_EntitlementsDataProductDetailsResponse>;
    } else if (_dataProductId === MOCK_DataProductId.MOCK_ADHOC_DATAPRODUCT) {
      return mockEntitlementsAdHocDataProduct as unknown as PlainObject<V1_EntitlementsDataProductDetailsResponse>;
    } else {
      return {} as PlainObject<V1_EntitlementsDataProductDetailsResponse>;
    }
  });

  createSpy(
    mockedStore.depotServerClient,
    'getVersionEntities',
  ).mockImplementation(
    async (groupId: string, artifactId: string, version: string) => {
      if (
        groupId === 'com.example.analytics' &&
        artifactId === 'customer-analytics' &&
        version === '1.2.0'
      ) {
        return mockSDLCDataProductEntitiesResponse;
      }
      return [];
    },
  );

  createSpy(
    mockedStore.engineServerClient,
    'grammarToJSON_model',
  ).mockResolvedValue(mockAdHocDataProductPMCD);

  createSpy(
    mockedStore.engineServerClient,
    'getClassifierPathMap',
  ).mockImplementation(async () => {
    const result = await ENGINE_TEST_SUPPORT__getClassifierPathMapping();
    return [
      ...result,
      {
        type: 'ingestDefinition',
        classifierPath:
          'meta::external::ingest::specification::metamodel::IngestDefinition',
      },
    ];
  });

  const { renderResult } = await TEST__setUpMarketplaceLakehouse(
    mockedStore,
    `/dataProduct/deployed/${dataProductId}/${deploymentId}`,
  );

  return { mockedStore, renderResult };
};

describe('LakehouseDataProduct', () => {
  describe('Basic rendering', () => {
    test('Loads LakehouseDataProduct with SDLC Data Product and displays title, description, and access point groups', async () => {
      await setupLakehouseDataProductTest(
        MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
        11111,
      );

      await screen.findByText('Mock SDLC Data Product');
      screen.getByText(
        'Comprehensive customer analytics data for business intelligence and reporting',
      );
      screen.getByText('GROUP1');
      screen.getByText('Test access point group');
      await screen.findByText('customer_demographics');
      await screen.findByText('Customer demographics data access point');
    });

    test('Loads LakehouseDataProduct with Ad-Hoc Data Product and displays title, description, and access point groups', async () => {
      await setupLakehouseDataProductTest(
        MOCK_DataProductId.MOCK_ADHOC_DATAPRODUCT,
        2222,
      );

      await screen.findByText('Mock Ad-Hoc Data Product');
      screen.getByText(
        'Flexible and dynamic data product for ad hoc analysis and reporting',
      );
      screen.getByText('GROUP1');
      screen.getByText('Test ad-hoc access point group');
      await screen.findByText('test_view');
      await screen.findByText('No description to provide');
    });
  });
});
