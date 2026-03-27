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

import { describe, test, expect, beforeEach } from '@jest/globals';
import { unitTest, createSpy } from '@finos/legend-shared/test';
import { LakehouseContractServerClient } from '../LakehouseContractServerClient.js';
import { V1_EntitlementsLakehouseEnvironmentType } from '@finos/legend-graph';

describe('LakehouseContractServerClient', () => {
  let client: LakehouseContractServerClient;

  beforeEach(() => {
    client = new LakehouseContractServerClient({
      baseUrl: 'http://test-server',
    });
  });

  describe(unitTest('getAllLiteDataProducts'), () => {
    test(unitTest('returns all products from a single page'), async () => {
      const mockProducts = [{ id: 'dp1' }, { id: 'dp2' }];
      createSpy(client, 'getDataProductsLitePaginated').mockResolvedValue({
        liteDataProductsResponse: { dataProducts: mockProducts },
        paginationMetadataRecord: {
          hasNextPage: false,
          size: 1000,
          lastValuesMap: { id: 'dp2', deployment_id: 2 },
        },
      });

      const result = await client.getAllLiteDataProducts(
        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        1000,
        'test-token',
      );

      expect(result.dataProducts).toEqual(mockProducts);
      expect(client.getDataProductsLitePaginated).toHaveBeenCalledTimes(1);
      expect(client.getDataProductsLitePaginated).toHaveBeenCalledWith(
        1000,
        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        undefined,
        undefined,
        'test-token',
      );
    });

    test(
      unitTest('iterates multiple pages and aggregates results'),
      async () => {
        const page1Products = [{ id: 'dp1' }, { id: 'dp2' }];
        const page2Products = [{ id: 'dp3' }, { id: 'dp4' }];
        const page3Products = [{ id: 'dp5' }];

        createSpy(client, 'getDataProductsLitePaginated')
          .mockResolvedValueOnce({
            liteDataProductsResponse: { dataProducts: page1Products },
            paginationMetadataRecord: {
              hasNextPage: true,
              size: 1,
              lastValuesMap: { id: 'dp2', deployment_id: 20 },
            },
          })
          .mockResolvedValueOnce({
            liteDataProductsResponse: { dataProducts: page2Products },
            paginationMetadataRecord: {
              hasNextPage: true,
              size: 1,
              lastValuesMap: { id: 'dp4', deployment_id: 40 },
            },
          })
          .mockResolvedValueOnce({
            liteDataProductsResponse: { dataProducts: page3Products },
            paginationMetadataRecord: {
              hasNextPage: false,
              size: 1,
              lastValuesMap: { id: 'dp5', deployment_id: 50 },
            },
          });

        const result = await client.getAllLiteDataProducts(
          V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
          2,
          'test-token',
        );

        expect(result.dataProducts).toEqual([
          ...page1Products,
          ...page2Products,
          ...page3Products,
        ]);
        expect(client.getDataProductsLitePaginated).toHaveBeenCalledTimes(3);

        // First call has no cursor
        expect(client.getDataProductsLitePaginated).toHaveBeenNthCalledWith(
          1,
          2,
          V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
          undefined,
          undefined,
          'test-token',
        );

        // Second call uses cursor from page 1
        expect(client.getDataProductsLitePaginated).toHaveBeenNthCalledWith(
          2,
          2,
          V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
          'dp2',
          20,
          'test-token',
        );

        // Third call uses cursor from page 2
        expect(client.getDataProductsLitePaginated).toHaveBeenNthCalledWith(
          3,
          2,
          V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
          'dp4',
          40,
          'test-token',
        );
      },
    );

    test(unitTest('handles empty response'), async () => {
      createSpy(client, 'getDataProductsLitePaginated').mockResolvedValue({
        liteDataProductsResponse: { dataProducts: [] },
        paginationMetadataRecord: {
          hasNextPage: false,
          size: 1000,
          lastValuesMap: undefined,
        },
      });

      const result = await client.getAllLiteDataProducts(
        V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT,
        1000,
        undefined,
      );

      expect(result.dataProducts).toEqual([]);
      expect(client.getDataProductsLitePaginated).toHaveBeenCalledTimes(1);
    });

    test(unitTest('handles missing dataProducts in response'), async () => {
      createSpy(client, 'getDataProductsLitePaginated').mockResolvedValue({
        liteDataProductsResponse: {},
        paginationMetadataRecord: {
          hasNextPage: false,
          size: 1000,
        },
      });

      const result = await client.getAllLiteDataProducts(
        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        1000,
        'test-token',
      );

      expect(result.dataProducts).toEqual([]);
    });
  });
});
