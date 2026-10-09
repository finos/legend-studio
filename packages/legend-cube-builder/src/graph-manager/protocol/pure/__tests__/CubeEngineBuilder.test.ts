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
import { DepotServerClient } from '@finos/legend-server-depot';
import { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import { MarketplaceServerClient } from '@finos/legend-server-marketplace';
import { CubeDataProductEnvironmentType } from '../../../CubeDataProduct.js';
import {
  buildCubeDataProductCatalog,
  type CubeLakehouseServices,
} from '../CubeEngineBuilder.js';

/** A host's lakehouse services, with the marketplace client given, if any */
const setUp = (
  marketplaceServerClient?: MarketplaceServerClient,
): {
  services: CubeLakehouseServices;
  lite: jest.Mock;
} => {
  const contractServerClient = new LakehouseContractServerClient({
    baseUrl: 'http://lakehouse.test',
  });
  const lite = jest
    .spyOn(contractServerClient, 'getDataProductsLitePaginated')
    .mockImplementation((async () => ({
      liteDataProductsResponse: { dataProducts: [] },
    })) as never) as unknown as jest.Mock;
  return {
    services: {
      contractServerClient,
      depotServerClient: new DepotServerClient({
        serverUrl: 'http://depot.test',
      }),
      getAccessToken: () => 'token',
      getCurrentUser: () => 'viewer',
      ...(marketplaceServerClient ? { marketplaceServerClient } : {}),
    },
    lite,
  };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("A host's data product catalog", () => {
  test("Searches the host's marketplace, one page of matches at a time, when the host gives its client", async () => {
    const marketplace = new MarketplaceServerClient({
      serverUrl: 'http://marketplace.test',
      subscriptionUrl: '',
    });
    const search = jest
      .spyOn(marketplace, 'lakehouseAccessSearch')
      .mockImplementation((async () => ({ results: [] })) as never);
    const { services, lite } = setUp(marketplace);
    const catalog = buildCubeDataProductCatalog(services);
    expect(catalog.searchesOnServer).toBe(true);
    expect(catalog.searchLimit).toBe(100);
    await catalog.search({
      text: 'orders',
      environmentType: CubeDataProductEnvironmentType.PRODUCTION,
    });
    expect(search).toHaveBeenCalledTimes(1);
    expect(lite).not.toHaveBeenCalled();
  });

  test("Lists the lakehouse's data products, matching the text itself, when the host gives no marketplace", async () => {
    const { services, lite } = setUp();
    const catalog = buildCubeDataProductCatalog(services);
    expect(catalog.searchesOnServer).toBe(false);
    expect(catalog.searchLimit).toBeUndefined();
    await catalog.search({
      text: 'orders',
      environmentType: CubeDataProductEnvironmentType.PRODUCTION,
    });
    expect(lite).toHaveBeenCalledTimes(1);
  });
});
