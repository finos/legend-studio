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
import { guaranteeNonNullable } from '@finos/legend-shared';
import { createFakeCubeConnectionExplorer } from '../../__test-utils__/FakeCubeConnectionExplorer.js';
import { createFakeCubeEngine } from '../../__test-utils__/FakeCubeEngine.js';
import { createFakeCubeProjectCatalog } from '../../__test-utils__/FakeCubeProjectCatalog.js';
import { InMemoryCubeStore } from '../../__test-utils__/InMemoryCubeStore.js';
import { TEST__createCubeApplicationStore } from '../../__test-utils__/CubeTestApplication.js';
import { CubeDirectDatabaseType } from '../../graph-manager/CubeConnectionExplorer.js';
import { CubeDataProductEnvironmentType } from '../../graph-manager/CubeDataProduct.js';
import {
  buildLegendCubeLakehouseServices,
  LegendCubeHost,
  type LegendCubeHostConfig,
} from '../LegendCubeHost.js';
import { BUNDLED_MODELS } from '../LocalModelCatalog.js';

const ENGINE: LegendCubeHostConfig['engine'] = {
  baseUrl: 'https://engine.test/api',
  enableCompression: true,
};

/** A host with no server but the engine, and those given */
const hostOf = (config: Partial<LegendCubeHostConfig> = {}): LegendCubeHost =>
  new LegendCubeHost(TEST__createCubeApplicationStore(), {
    engine: ENGINE,
    ...config,
  });

describe("A Legend deployment as Cube's host", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Offers the bundled models, direct connections and services with only an engine, and no projects, data products or ingest data sets', () => {
    const host = hostOf();
    expect(host.modelCatalog.models).toBe(BUNDLED_MODELS);
    expect(host.connectionExplorer).toBeDefined();
    expect(host.serviceCatalog).toBeDefined();
    expect(host.projectCatalog).toBeUndefined();
    expect(host.dataProductCatalog).toBeUndefined();
    expect(host.ingestCatalog).toBeUndefined();
    // saved cubes, in the engine's Cube store (PLAN §11.13)
    expect(host.store).toBeDefined();
    expect(host.engineClientSettings.defaultBaseUrl).toBe(ENGINE.baseUrl);
    expect(host.engineClientSettings.requestCompression).toBe(true);
  });

  test('Offers projects with a depot, data products with a lakehouse beside it, and ingest data sets with its platform too', () => {
    expect(
      hostOf({ depotServerUrl: 'https://depot.test' }).projectCatalog,
    ).toBeDefined();
    // a lakehouse needs the depot, which holds the products' models
    expect(
      hostOf({ lakehouseContractUrl: 'https://lakehouse.test' })
        .dataProductCatalog,
    ).toBeUndefined();
    const lakehouse = {
      depotServerUrl: 'https://depot.test',
      lakehouseContractUrl: 'https://lakehouse.test',
    };
    const withLakehouse = hostOf(lakehouse);
    expect(withLakehouse.dataProductCatalog).toBeDefined();
    expect(withLakehouse.ingestCatalog).toBeUndefined();
    expect(
      hostOf({ ...lakehouse, lakehousePlatformUrl: 'https://platform.test' })
        .ingestCatalog,
    ).toBeDefined();
  });

  test('Uses the engine, the connection explorer, the project catalog and the store it is given', () => {
    const { engine } = createFakeCubeEngine();
    const { explorer: connectionExplorer } = createFakeCubeConnectionExplorer();
    const { catalog: projectCatalog } = createFakeCubeProjectCatalog();
    const store = new InMemoryCubeStore('alice');
    const host = new LegendCubeHost(
      TEST__createCubeApplicationStore(),
      { engine: ENGINE },
      { engine, connectionExplorer, projectCatalog, store },
    );
    expect(host.engine).toBe(engine);
    expect(host.connectionExplorer).toBe(connectionExplorer);
    expect(host.projectCatalog).toBe(projectCatalog);
    expect(host.store).toBe(store);
  });

  test("Links a data product to the marketplace of its deployment's class, and to none without one", () => {
    const lakehouse = {
      depotServerUrl: 'https://depot.test',
      lakehouseContractUrl: 'https://lakehouse.test',
    };
    const target = {
      dataProductId: 'ORDERS_PRODUCT',
      deploymentId: '1234',
      environmentType: CubeDataProductEnvironmentType.PRODUCTION,
      accessPointGroup: 'Core Group',
    };
    const catalog = guaranteeNonNullable(
      hostOf({
        ...lakehouse,
        marketplaceApplicationUrl: 'https://marketplace.test',
        marketplaceProductionParallelUrl: 'https://marketplace-parallel.test',
      }).dataProductCatalog,
    );
    expect(catalog.getMarketplaceLink(target)).toBe(
      'https://marketplace.test/dataProduct/deployed/ORDERS_PRODUCT/1234#apg-core-group',
    );
    expect(
      catalog.getMarketplaceLink({
        ...target,
        environmentType: CubeDataProductEnvironmentType.PRODUCTION_PARALLEL,
        accessPointGroup: undefined,
      }),
    ).toBe(
      'https://marketplace-parallel.test/dataProduct/deployed/ORDERS_PRODUCT/1234',
    );
    expect(
      guaranteeNonNullable(
        hostOf(lakehouse).dataProductCatalog,
      ).getMarketplaceLink(target),
    ).toBeUndefined();
  });

  test("Reads data products as the viewer, with the application's token, and the environment and stereotype the deployment gives", () => {
    const applicationStore = TEST__createCubeApplicationStore();
    applicationStore.identityService.setCurrentUser('viewer');
    applicationStore.setAccessToken('token');
    const getPreferredEnvironment = (): string => 'chosen-env';
    const services = guaranteeNonNullable(
      buildLegendCubeLakehouseServices(applicationStore, {
        engine: ENGINE,
        depotServerUrl: 'https://depot.test',
        lakehouseContractUrl: 'https://lakehouse.test',
        enterpriseStereotype: {
          profile: 'meta::pure::profiles::access',
          value: 'enterprise',
        },
        getPreferredEnvironment,
      }),
    );
    expect(services.getCurrentUser()).toBe('viewer');
    expect(services.getAccessToken()).toBe('token');
    expect(services.getPreferredEnvironment).toBe(getPreferredEnvironment);
    expect(services.enterpriseStereotype).toEqual({
      profile: 'meta::pure::profiles::access',
      value: 'enterprise',
    });
    // a marketplace server alone gives no search without a lakehouse
    expect(
      buildLegendCubeLakehouseServices(applicationStore, {
        engine: ENGINE,
        marketplaceServerUrl: 'https://marketplace.test',
      }),
    ).toBeUndefined();
  });

  test("Sends every engine client's requests to the engine Dev Settings names, from the next one", async () => {
    // every call fails, so the test reads where it went
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        Promise.reject(new Error('No server in tests')),
      );
    const host = hostOf();
    host.engineClientSettings.setBaseUrl('https://other-engine.test/api');
    const connection = host.connectionExplorer.buildConnection({
      databaseType: CubeDirectDatabaseType.H2,
      setupSqls: ['create schema CUBE_DIRECT'],
    });
    await expect(
      host.connectionExplorer.listSchemas(connection),
    ).rejects.toThrow('No server in tests');
    await expect(host.serviceCatalog.listServices()).rejects.toThrow(
      'No server in tests',
    );
    const urls = fetchSpy.mock.calls.map(([url]) => String(url));
    expect(urls).toHaveLength(2);
    urls.forEach((url) =>
      expect(url.startsWith('https://other-engine.test/api/')).toBe(true),
    );
  });
});
