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
import { ApplicationStore } from '@finos/legend-application';
import {
  BUNDLED_MODELS,
  CubeDataProductCandidate,
  CubeDataProductEnvironmentType,
  type CubeConnectionExplorer,
  CubeDirectDatabaseType,
  type CubeEngine,
  type CubeModelOutline,
} from '@finos/legend-cube-builder';
import {
  AbstractServerClient,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import {
  buildLegendQueryCubeEngineConfig,
  buildLegendQueryCubeLakehouseServices,
  LegendQueryCubeHost,
} from '../cube/LegendQueryCubeHost.js';
import { LegendQueryUserDataHelper } from '../../__lib__/LegendQueryUserDataHelper.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../__test-utils__/LegendQueryApplicationTestUtils.js';

const OUTLINE: CubeModelOutline = { databases: [], runtimes: [] };

const createApplicationStore = (
  extraConfigData = {},
): ConstructorParameters<typeof LegendQueryCubeHost>[0] =>
  new ApplicationStore(
    TEST__getTestLegendQueryApplicationConfig(extraConfigData),
    LegendQueryPluginManager.create(),
  );

describe('Legend Query as the Cube host', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    // the static default would leak into the next test
    AbstractServerClient.setDefaultAuthenticationTokenProvider(undefined);
  });

  test("Configures Cube's engine client as Query's editor does", () => {
    const config = TEST__getTestLegendQueryApplicationConfig({
      engine: {
        url: 'https://testEngineUrl',
        queryUrl: 'https://testEngineQueryUrl',
        queryClientName: 'test-client',
        useCookieAuthOnly: true,
      },
    });
    expect(buildLegendQueryCubeEngineConfig(config)).toEqual({
      baseUrl: 'https://testEngineUrl',
      queryBaseUrl: 'https://testEngineQueryUrl',
      queryClientName: 'test-client',
      enableCompression: true,
      useCookieAuthOnly: true,
    });
    expect(
      buildLegendQueryCubeEngineConfig(
        TEST__getTestLegendQueryApplicationConfig(),
      ),
    ).toMatchObject({ enableCompression: true, useCookieAuthOnly: false });
  });

  test("Gives the page Query's application store, the engine and the bundled models", async () => {
    const applicationStore = createApplicationStore();
    const loadModel = jest.fn<CubeEngine['loadModel']>(async () =>
      Promise.resolve(OUTLINE),
    );
    const engine: CubeEngine = {
      loadModel,
      resolveSchemas: jest.fn<CubeEngine['resolveSchemas']>(),
      typeLambdas: jest.fn<CubeEngine['typeLambdas']>(),
      execute: jest.fn<CubeEngine['execute']>(),
      renderPure: jest.fn<CubeEngine['renderPure']>(),
    };
    const host = new LegendQueryCubeHost(applicationStore, engine);
    expect(host.applicationStore).toBe(applicationStore);
    expect(host.engine).toBe(engine);
    expect(host.modelCatalog.models).toBe(BUNDLED_MODELS);
    expect(host.modelCatalog.models.map((model) => model.label)).toEqual([
      'Northwind (Cube fixture)',
      'Sports (sample)',
      'Trades (sample)',
    ]);
    // the catalog reads models through the host's engine
    const [northwind] = host.modelCatalog.models;
    await host.modelCatalog.loadOutline(
      (northwind as (typeof BUNDLED_MODELS)[number]).model,
    );
    expect(loadModel).toHaveBeenCalledTimes(1);
  });

  test("Builds an engine from Query's config when none is given", () => {
    const host = new LegendQueryCubeHost(createApplicationStore());
    expect(Object.keys(host.engine)).not.toHaveLength(0);
    expect(typeof host.engine.execute).toBe('function');
  });

  test('Offers data products only when Query has a lakehouse', () => {
    expect(
      new LegendQueryCubeHost(createApplicationStore()).dataProductCatalog,
    ).toBeUndefined();
    expect(
      new LegendQueryCubeHost(
        createApplicationStore({
          lakehouse: { url: 'https://lakehouse.test' },
        }),
      ).dataProductCatalog,
    ).toBeDefined();
  });

  test('Offers ingest data sets only when Query has a lakehouse and its platform', () => {
    expect(
      new LegendQueryCubeHost(
        createApplicationStore({
          lakehouse: { url: 'https://lakehouse.test' },
        }),
      ).ingestCatalog,
    ).toBeUndefined();
    expect(
      new LegendQueryCubeHost(
        createApplicationStore({
          lakehouse: {
            url: 'https://lakehouse.test',
            platformUrl: 'https://platform.test',
          },
        }),
      ).ingestCatalog,
    ).toBeDefined();
  });

  test("Finds the ingest servers through Query's lakehouse platform, traced by Query's tracer", async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        Promise.reject(new Error('No server in tests')),
      );
    const applicationStore = createApplicationStore({
      lakehouse: {
        url: 'https://lakehouse.test',
        platformUrl: 'https://platform.test',
      },
    });
    const trace = jest.spyOn(applicationStore.tracerService, 'createTrace');
    const catalog = guaranteeNonNullable(
      new LegendQueryCubeHost(applicationStore).ingestCatalog,
    );
    await expect(
      catalog.listProducers(CubeDataProductEnvironmentType.PRODUCTION),
    ).rejects.toThrow('No server in tests');
    expect(
      fetchSpy.mock.calls
        .map(([url]) => String(url))
        .some((url) =>
          url.startsWith('https://platform.test/ingest/discovery/environments'),
        ),
    ).toBe(true);
    expect(trace).toHaveBeenCalled();
  });

  test("Lists data products from Query's lakehouse, and reads them from Query's depot, traced by Query's tracer", async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        Promise.reject(new Error('No server in tests')),
      );
    const applicationStore = createApplicationStore({
      lakehouse: { url: 'https://lakehouse.test' },
      depot: { url: 'https://depot.test' },
    });
    const trace = jest.spyOn(applicationStore.tracerService, 'createTrace');
    const catalog = guaranteeNonNullable(
      new LegendQueryCubeHost(applicationStore).dataProductCatalog,
    );
    await expect(
      catalog.search({
        text: '',
        environmentType: CubeDataProductEnvironmentType.PRODUCTION,
      }),
    ).rejects.toThrow("Cube couldn't list the data products");
    expect(String(guaranteeNonNullable(fetchSpy.mock.calls[0])[0])).toMatch(
      /^https:\/\/lakehouse\.test\/.*dataproducts\/lite/u,
    );
    await expect(
      catalog.describe(
        new CubeDataProductCandidate({
          id: 'ORDERS_PRODUCT',
          deploymentId: '1',
          dataProductPath: 'sales::products::OrdersProduct',
          title: 'Orders',
          groupId: 'com.example.sales',
          artifactId: 'orders-products',
          versionId: '1.4.0',
          environmentType: CubeDataProductEnvironmentType.PRODUCTION,
        }),
      ),
    ).rejects.toThrow("Cube couldn't read the data product");
    const urls = fetchSpy.mock.calls.map(([url]) => String(url));
    expect(
      urls.some((url) =>
        url.startsWith(
          'https://depot.test/generations/com.example.sales/orders-products/1.4.0/types/dataProduct',
        ),
      ),
    ).toBe(true);
    expect(trace).toHaveBeenCalled();
  });

  test("Searches data products on Query's marketplace server, traced by Query's tracer, when Query has one beside its lakehouse", async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        Promise.reject(new Error('No server in tests')),
      );
    const applicationStore = createApplicationStore({
      lakehouse: { url: 'https://lakehouse.test' },
      marketplace: {
        url: 'https://marketplace-app.test',
        productionParallelUrl: 'https://marketplace-parallel-app.test',
        serverUrl: 'https://marketplace.test',
      },
    });
    expect(applicationStore.config.marketplaceServerUrl).toBe(
      'https://marketplace.test',
    );
    const trace = jest.spyOn(applicationStore.tracerService, 'createTrace');
    const catalog = guaranteeNonNullable(
      new LegendQueryCubeHost(applicationStore).dataProductCatalog,
    );
    expect(catalog.searchesOnServer).toBe(true);
    await expect(
      catalog.search({
        text: 'orders',
        environmentType: CubeDataProductEnvironmentType.PRODUCTION,
      }),
    ).rejects.toThrow("Cube couldn't search the data products");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = String(guaranteeNonNullable(fetchSpy.mock.calls[0])[0]);
    expect(url).toMatch(
      /^https:\/\/marketplace\.test\/v1\/search\/lakehouseAccess\/PRODUCTION\?query=orders&/u,
    );
    expect(trace).toHaveBeenCalledTimes(1);
    expect(trace.mock.calls[0]?.[2]).toBe(url);
  });

  test("Lists data products from Query's lakehouse when Query has no marketplace server, its marketplace application being no server", () => {
    const lakehouse = { url: 'https://lakehouse.test' };
    const marketplace = {
      url: 'https://marketplace-app.test',
      productionParallelUrl: 'https://marketplace-parallel-app.test',
    };
    const applicationStore = createApplicationStore({ lakehouse, marketplace });
    expect(applicationStore.config.marketplaceApplicationUrl).toBe(
      'https://marketplace-app.test',
    );
    expect(applicationStore.config.marketplaceServerUrl).toBeUndefined();
    expect(
      new LegendQueryCubeHost(applicationStore).dataProductCatalog
        ?.searchesOnServer,
    ).toBe(false);
    expect(
      new LegendQueryCubeHost(createApplicationStore({ lakehouse }))
        .dataProductCatalog?.searchesOnServer,
    ).toBe(false);
    // a marketplace server alone offers no data products
    expect(
      new LegendQueryCubeHost(
        createApplicationStore({
          marketplace: {
            ...marketplace,
            serverUrl: 'https://marketplace.test',
          },
        }),
      ).dataProductCatalog,
    ).toBeUndefined();
  });

  test("Links data products to Query's marketplace of the deployment's class", () => {
    const lakehouse = { url: 'https://lakehouse.test' };
    const target = {
      dataProductId: 'ORDERS_PRODUCT',
      deploymentId: '1234',
      environmentType: CubeDataProductEnvironmentType.PRODUCTION,
      accessPointGroup: 'Core Group',
    };
    const catalog = guaranteeNonNullable(
      new LegendQueryCubeHost(
        createApplicationStore({
          lakehouse,
          marketplace: {
            url: 'https://marketplace.test',
            productionParallelUrl: 'https://marketplace-parallel.test',
          },
        }),
      ).dataProductCatalog,
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
    // without a marketplace, no link
    expect(
      guaranteeNonNullable(
        new LegendQueryCubeHost(createApplicationStore({ lakehouse }))
          .dataProductCatalog,
      ).getMarketplaceLink(target),
    ).toBeUndefined();
  });

  test('Marks the groups open to everyone as Studio and Marketplace configure them', () => {
    const lakehouse = { url: 'https://lakehouse.test' };
    const applicationStore = createApplicationStore({
      lakehouse,
      extensions: {
        core: {
          dataProductConfig: {
            classifications: ['ignored by Query'],
            publicStereotype: {
              profile: 'meta::pure::profiles::access',
              stereotype: 'enterprise',
            },
          },
        },
      },
    });
    expect(
      buildLegendQueryCubeLakehouseServices(applicationStore)
        ?.enterpriseStereotype,
    ).toEqual({ profile: 'meta::pure::profiles::access', value: 'enterprise' });
    expect(
      buildLegendQueryCubeLakehouseServices(
        createApplicationStore({ lakehouse }),
      )?.enterpriseStereotype,
    ).toBeUndefined();
  });

  test('Prefers the lakehouse environment Query remembers for the viewer', () => {
    const applicationStore = createApplicationStore({
      lakehouse: { url: 'https://lakehouse.test' },
    });
    const services = guaranteeNonNullable(
      buildLegendQueryCubeLakehouseServices(applicationStore),
    );
    expect(services.getPreferredEnvironment?.()).toBeUndefined();
    LegendQueryUserDataHelper.persistLakehouseUserInfo(
      applicationStore.userDataService,
      { env: 'chosen-env', snowflakeWarehouse: undefined },
    );
    expect(services.getPreferredEnvironment?.()).toBe('chosen-env');
    expect(
      buildLegendQueryCubeLakehouseServices(createApplicationStore()),
    ).toBeUndefined();
  });

  test('Gives the page the connection explorer it is given', () => {
    const explorer = {} as CubeConnectionExplorer;
    const host = new LegendQueryCubeHost(
      createApplicationStore(),
      undefined,
      explorer,
    );
    expect(host.connectionExplorer).toBe(explorer);
  });

  test("Builds a connection explorer that reads databases through Query's engine server, traced by Query's tracer", async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        Promise.reject(new Error('No engine server in tests')),
      );
    const applicationStore = createApplicationStore({
      engine: { url: 'https://explorer-engine.test' },
    });
    const trace = jest.spyOn(applicationStore.tracerService, 'createTrace');
    const { connectionExplorer } = new LegendQueryCubeHost(applicationStore);
    const connection = connectionExplorer.buildConnection({
      databaseType: CubeDirectDatabaseType.H2,
      setupSqls: ['create schema CUBE_DIRECT'],
    });
    await expect(connectionExplorer.listSchemas(connection)).rejects.toThrow(
      'No engine server in tests',
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = String(guaranteeNonNullable(fetchSpy.mock.calls[0])[0]);
    expect(url).toMatch(
      /^https:\/\/explorer-engine\.test\/pure\/v1\/utilities\/database\/schemaExploration/u,
    );
    expect(trace).toHaveBeenCalledTimes(1);
    expect(trace.mock.calls[0]?.[2]).toBe(url);
  });

  test("Builds an engine that calls Query's engine server, compressed, in Query's auth mode and traced by Query's tracer", async () => {
    // the engine is opaque, so its calls are read where they leave it
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        Promise.reject(new Error('No engine server in tests')),
      );
    const bearerStore = createApplicationStore({
      engine: {
        url: 'https://bearer-engine.test',
        // the client names itself on calls to its query server
        queryUrl: 'https://bearer-engine.test',
        queryClientName: 'test-client',
      },
    });
    const cookieStore = createApplicationStore({
      engine: { url: 'https://cookie-engine.test', useCookieAuthOnly: true },
    });
    // a token Query would send, unless its engine takes the cookie only (set
    // after the stores, whose constructors install their own provider)
    AbstractServerClient.setDefaultAuthenticationTokenProvider(
      () => 'test-token',
    );
    const bearerTrace = jest.spyOn(bearerStore.tracerService, 'createTrace');
    const cookieTrace = jest.spyOn(cookieStore.tracerService, 'createTrace');
    const [northwind] = BUNDLED_MODELS;
    const { model } = guaranteeNonNullable(northwind);

    const requestOf = async (
      applicationStore: ReturnType<typeof createApplicationStore>,
    ): Promise<{ url: string; init: RequestInit }> => {
      fetchSpy.mockClear();
      await expect(
        new LegendQueryCubeHost(applicationStore).engine.loadModel(model),
      ).rejects.toThrow('No engine server in tests');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = guaranteeNonNullable(fetchSpy.mock.calls[0]);
      return { url: String(url), init: guaranteeNonNullable(init) };
    };

    const bearer = await requestOf(bearerStore);
    expect(bearer.url).toMatch(
      /^https:\/\/bearer-engine\.test\/pure\/v1\/grammar\/grammarToJson\/model/u,
    );
    expect(bearer.url).toMatch(/[?&]client_name=test-client(?:&|$)/u);
    // compressed: zlib, whatever the call's own content type
    expect(bearer.init.body).toBeInstanceOf(Blob);
    expect(bearer.init.headers).toMatchObject({
      'Content-Type': 'application/zlib;charset=utf-8',
      Authorization: 'Bearer test-token',
    });

    const cookie = await requestOf(cookieStore);
    expect(cookie.url).toMatch(/^https:\/\/cookie-engine\.test\/pure\/v1\//u);
    expect(cookie.init.body).toBeInstanceOf(Blob);
    expect(cookie.init.headers).not.toHaveProperty('Authorization');
    expect(cookie.init.credentials).toBe('include');

    // each engine traces its calls through its own store's tracer
    expect(bearerTrace).toHaveBeenCalledTimes(1);
    expect(bearerTrace.mock.calls[0]?.[2]).toBe(bearer.url);
    expect(cookieTrace).toHaveBeenCalledTimes(1);
    expect(cookieTrace.mock.calls[0]?.[2]).toBe(cookie.url);
  });
});
