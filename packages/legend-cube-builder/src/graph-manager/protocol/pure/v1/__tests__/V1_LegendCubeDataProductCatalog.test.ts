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

import { describe, expect, jest, test } from '@jest/globals';
import { Schema } from '@finos/legend-cube';
import { DepotServerClient } from '@finos/legend-server-depot';
import { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import type { PlainObject } from '@finos/legend-shared';
import { CubeDataProductEnvironmentType } from '../../../../CubeDataProduct.js';
import { CubeEngineError } from '../../../../CubeEngine.js';
import {
  V1_TEST__ORDERS_ARTIFACT,
  V1_TEST__ORDERS_DEFINITION,
} from '../__test-utils__/V1_CubeDataProductFixtures.js';
import {
  V1_CUBE_DATA_PRODUCT_LIST_ERROR,
  V1_LegendCubeDataProductCatalog,
} from '../V1_LegendCubeDataProductCatalog.js';

const { PRODUCTION, PRODUCTION_PARALLEL } = CubeDataProductEnvironmentType;

/** A lite row, as the lakehouse lists it */
const liteRow = (
  id: string,
  type: string,
  origin: PlainObject | null = {
    type: 'SdlcDeployment',
    group: 'com.example.sales',
    artifact: 'orders-products',
    version: '1.4.0',
  },
  fullPath: string | undefined = 'sales::products::OrdersProduct',
): PlainObject => ({
  id,
  deploymentId: 1234,
  title: `${id} title`,
  description: `About ${id}`,
  origin,
  fullPath,
  lakehouseEnvironment: { producerEnvironmentName: 'sales-producer', type },
});

/** A page of the lite list; with a cursor, more pages follow */
const litePage = (rows: PlainObject[], next?: PlainObject): PlainObject => ({
  liteDataProductsResponse: { dataProducts: rows },
  paginationMetadataRecord: next
    ? { hasNextPage: true, lastValuesMap: next, size: rows.length }
    : { hasNextPage: false, size: rows.length },
});

const setUp = (
  getAccessToken: () => string | undefined = () => 'token',
): {
  catalog: V1_LegendCubeDataProductCatalog;
  lite: jest.Mock;
  generations: jest.Mock;
  entity: jest.Mock;
} => {
  const contract = new LakehouseContractServerClient({
    baseUrl: 'http://lakehouse.test',
  });
  const depot = new DepotServerClient({ serverUrl: 'http://depot.test' });
  const lite = jest
    .spyOn(contract, 'getDataProductsLitePaginated')
    .mockImplementation((async (_size: number, environmentType: string) =>
      litePage([
        liteRow('ORDERS_PRODUCT', environmentType),
        // 'Production' casing, as some deployments send it
        liteRow('CASED_PRODUCT', 'Production'),
        liteRow('ADHOC_PRODUCT', environmentType, {
          type: 'AdHocDeployment',
          definition: '',
        }),
        liteRow('NO_PATH_PRODUCT', environmentType, undefined, ''),
        liteRow('NO_ORIGIN_PRODUCT', environmentType, null),
      ])) as never);
  const generations = jest
    .spyOn(depot, 'getGenerationFilesByType')
    .mockImplementation((async () => [
      {
        groupId: 'com.example.sales',
        artifactId: 'orders-products',
        versionId: '1.4.0',
        type: 'dataProduct',
        path: 'sales::products::OrdersProduct',
        file: {
          path: 'sales::products::OrdersProduct.json',
          content: JSON.stringify(V1_TEST__ORDERS_ARTIFACT),
        },
      },
    ]) as never);
  const entity = jest
    .spyOn(depot, 'getVersionEntity')
    .mockImplementation((async () => ({
      path: 'sales::products::OrdersProduct',
      classifierPath:
        'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
      content: V1_TEST__ORDERS_DEFINITION,
    })) as never);
  return {
    catalog: new V1_LegendCubeDataProductCatalog(
      contract,
      depot,
      getAccessToken,
    ),
    lite: lite as unknown as jest.Mock,
    generations: generations as unknown as jest.Mock,
    entity: entity as unknown as jest.Mock,
  };
};

describe('Data product catalog, on the lakehouse and the depot', () => {
  test('Lists the deployed products of a class from its lite list, read once, and keeps only those it can read', async () => {
    const { catalog, lite } = setUp();
    expect(catalog.environmentTypes).toEqual([PRODUCTION, PRODUCTION_PARALLEL]);
    const products = await catalog.search({
      text: '',
      environmentType: PRODUCTION,
    });
    expect(products.map((product) => product.id)).toEqual([
      'ORDERS_PRODUCT',
      'CASED_PRODUCT',
    ]);
    const [orders] = products;
    expect(orders).toMatchObject({
      deploymentId: '1234',
      dataProductPath: 'sales::products::OrdersProduct',
      title: 'ORDERS_PRODUCT title',
      groupId: 'com.example.sales',
      artifactId: 'orders-products',
      versionId: '1.4.0',
      environmentType: PRODUCTION,
    });
    // searched on the client, by title, id and description
    expect(
      (
        await catalog.search({
          text: 'about cased',
          environmentType: PRODUCTION,
        })
      ).map((product) => product.id),
    ).toEqual(['CASED_PRODUCT']);
    expect(lite).toHaveBeenCalledTimes(1);
    expect(lite).toHaveBeenCalledWith(
      1000,
      'PRODUCTION',
      undefined,
      undefined,
      'token',
    );
    await catalog.search({ text: '', environmentType: PRODUCTION_PARALLEL });
    expect(lite).toHaveBeenCalledTimes(2);
    expect(lite).toHaveBeenLastCalledWith(
      1000,
      'PRODUCTION_PARALLEL',
      undefined,
      undefined,
      'token',
    );
  });

  test('Drops a row it cannot read, and lists the others', async () => {
    const { catalog, lite } = setUp();
    lite.mockImplementationOnce(async () =>
      litePage([
        liteRow('ORDERS_PRODUCT', 'PRODUCTION'),
        // a deployment that is no primitive fails its row's deserializer
        {
          ...liteRow('OBJECT_DEPLOYMENT_PRODUCT', 'PRODUCTION'),
          deploymentId: {},
        },
        // a class of null fails the class check
        {
          ...liteRow('NULL_CLASS_PRODUCT', 'PRODUCTION'),
          lakehouseEnvironment: {
            producerEnvironmentName: 'sales-producer',
            type: null,
          },
        },
      ]),
    );
    expect(
      (await catalog.search({ text: '', environmentType: PRODUCTION })).map(
        (product) => product.id,
      ),
    ).toEqual(['ORDERS_PRODUCT']);
  });

  test('Lists a product the lakehouse gives a null description as having none', async () => {
    const { catalog, lite } = setUp();
    lite.mockImplementationOnce(async () =>
      litePage([
        { ...liteRow('ORDERS_PRODUCT', 'PRODUCTION'), description: null },
      ]),
    );
    const [orders] = await catalog.search({
      text: '',
      environmentType: PRODUCTION,
    });
    expect(orders?.id).toBe('ORDERS_PRODUCT');
    expect(orders?.description).toBeUndefined();
  });

  test('Lists again after a failed listing', async () => {
    const { catalog, lite } = setUp();
    lite.mockImplementationOnce(async () => {
      throw new Error('Lakehouse unavailable');
    });
    const failure = await catalog
      .search({ text: '', environmentType: PRODUCTION })
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(CubeEngineError);
    expect((failure as CubeEngineError).firstLine).toBe(
      "Cube couldn't list the data products",
    );
    expect(
      await catalog.search({ text: '', environmentType: PRODUCTION }),
    ).toHaveLength(2);
  });

  test('Describes a product from its deployed artifact and its definition at the deployed version, once', async () => {
    const { catalog, generations, entity } = setUp();
    const [orders] = await catalog.search({
      text: 'orders',
      environmentType: PRODUCTION,
    });
    const description = await catalog.describe(
      orders as NonNullable<typeof orders>,
    );
    await catalog.describe(orders as NonNullable<typeof orders>);
    expect(description.groups.map((group) => group.id)).toEqual([
      'core',
      'reference',
      'model',
    ]);
    expect(generations).toHaveBeenCalledTimes(1);
    const [project, version, type, path] = generations.mock.calls[0] as [
      { groupId: string; artifactId: string },
      string,
      string,
      string,
    ];
    expect([project.groupId, project.artifactId, version, type, path]).toEqual([
      'com.example.sales',
      'orders-products',
      '1.4.0',
      'dataProduct',
      'sales::products::OrdersProduct',
    ]);
    expect(entity).toHaveBeenCalledTimes(1);
    expect(entity).toHaveBeenCalledWith(
      'com.example.sales',
      'orders-products',
      '1.4.0',
      'sales::products::OrdersProduct',
    );
  });

  test("Resolves saved sources from the artifact at the cube's version, one by one", async () => {
    const { catalog } = setUp();
    const resolved = await catalog.resolveSchemas(
      {
        groupId: 'com.example.sales',
        artifactId: 'orders-products',
        versionId: '1.4.0',
        environmentType: PRODUCTION,
      },
      new Map([
        [
          'dataProductAccessPoint101',
          {
            dataProduct: 'sales::products::OrdersProduct',
            accessPointGroup: 'core',
            accessPoint: 'daily_orders',
          },
        ],
        [
          'dataProductAccessPoint102',
          {
            dataProduct: 'sales::products::OrdersProduct',
            accessPointGroup: 'core',
            accessPoint: 'orders_as_of',
          },
        ],
      ]),
    );
    expect(resolved.get('dataProductAccessPoint101')).toBeInstanceOf(Schema);
    expect(resolved.get('dataProductAccessPoint102')).toMatchObject({
      nodeId: 'dataProductAccessPoint102',
      detail: 'It takes parameters, which Cube does not support yet',
    });
  });

  test('Re-checks from the description already read this visit, and reads the depot again after a failed read', async () => {
    const { catalog, generations, entity } = setUp();
    const project = {
      groupId: 'com.example.sales',
      artifactId: 'orders-products',
      versionId: '1.4.0',
      environmentType: PRODUCTION,
    };
    const sources = new Map([
      [
        'dataProductAccessPoint101',
        {
          dataProduct: 'sales::products::OrdersProduct',
          accessPointGroup: 'core',
          accessPoint: 'daily_orders',
        },
      ],
      [
        'dataProductAccessPoint102',
        {
          dataProduct: 'sales::products::OrdersProduct',
          accessPointGroup: 'reference',
          accessPoint: 'daily_orders',
        },
      ],
    ]);
    // a failed read answers each source with its error
    generations.mockImplementationOnce(async () => {
      throw new Error('Depot unavailable');
    });
    const failed = await catalog.resolveSchemas(project, sources);
    expect([...failed.values()].map((answer) => answer.constructor)).toEqual([
      CubeEngineError,
      CubeEngineError,
    ]);
    expect(failed.get('dataProductAccessPoint102')).toMatchObject({
      nodeId: 'dataProductAccessPoint102',
    });
    // read again, then from what this visit read
    const read = await catalog.resolveSchemas(project, sources);
    expect(read.get('dataProductAccessPoint101')).toBeInstanceOf(Schema);
    const [orders] = await catalog.search({
      text: 'orders',
      environmentType: PRODUCTION,
    });
    await catalog.describe(orders as NonNullable<typeof orders>);
    await catalog.resolveSchemas(project, sources);
    expect(generations).toHaveBeenCalledTimes(2);
    expect(entity).toHaveBeenCalledTimes(2);
  });

  test("Links through the host's link function, and has none without one", () => {
    const contract = new LakehouseContractServerClient({
      baseUrl: 'http://lakehouse.test',
    });
    const depot = new DepotServerClient({ serverUrl: 'http://depot.test' });
    const link = jest.fn(() => 'https://marketplace.test/page');
    const target = {
      dataProductId: 'ORDERS_PRODUCT',
      deploymentId: '1234',
      environmentType: PRODUCTION_PARALLEL,
      accessPointGroup: 'core',
    };
    expect(
      new V1_LegendCubeDataProductCatalog(
        contract,
        depot,
        () => 'token',
        undefined,
        link,
      ).getMarketplaceLink(target),
    ).toBe('https://marketplace.test/page');
    expect(link).toHaveBeenCalledWith(target);
    expect(
      new V1_LegendCubeDataProductCatalog(
        contract,
        depot,
        () => 'token',
      ).getMarketplaceLink(target),
    ).toBeUndefined();
  });

  test('Says when a product has no deployed artifact', async () => {
    const { catalog, generations } = setUp();
    generations.mockImplementationOnce(async () => []);
    const [orders] = await catalog.search({
      text: 'orders',
      environmentType: PRODUCTION,
    });
    const failure = await catalog
      .describe(orders as NonNullable<typeof orders>)
      .catch((error: unknown) => error);
    expect((failure as CubeEngineError).detail).toContain(
      'has no deployed artifact at com.example.sales:orders-products:1.4.0',
    );
  });
});

describe('Paging the lite list', () => {
  const PAGE_ONE = [liteRow('ORDERS_PRODUCT', 'PRODUCTION')];
  const PAGE_TWO = [liteRow('RETURNS_PRODUCT', 'PRODUCTION')];
  const CURSOR = { id: 'ORDERS_PRODUCT', deployment_id: 1234 };

  const listFailure = async (
    catalog: V1_LegendCubeDataProductCatalog,
  ): Promise<string> => {
    const failure = await catalog
      .search({ text: '', environmentType: PRODUCTION })
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(CubeEngineError);
    return (failure as CubeEngineError).detail;
  };

  test("Follows the lakehouse's cursor until the last page, and keeps every page's rows", async () => {
    const { catalog, lite } = setUp();
    lite
      .mockImplementationOnce(async () => litePage(PAGE_ONE, CURSOR))
      .mockImplementationOnce(async () => litePage(PAGE_TWO));
    const products = await catalog.search({
      text: '',
      environmentType: PRODUCTION,
    });
    expect(products.map((product) => product.id)).toEqual([
      'ORDERS_PRODUCT',
      'RETURNS_PRODUCT',
    ]);
    expect(lite).toHaveBeenCalledTimes(2);
    expect(lite).toHaveBeenLastCalledWith(
      1000,
      'PRODUCTION',
      'ORDERS_PRODUCT',
      1234,
      'token',
    );
  });

  test('Stops with an error, and asks no further page, when more pages are said to follow but not where', async () => {
    const { catalog, lite } = setUp();
    lite.mockImplementationOnce(async () => ({
      ...litePage(PAGE_ONE),
      paginationMetadataRecord: { hasNextPage: true, size: 1 },
    }));
    expect(await listFailure(catalog)).toContain(
      V1_CUBE_DATA_PRODUCT_LIST_ERROR.NO_CURSOR,
    );
    expect(lite).toHaveBeenCalledTimes(1);
  });

  test.each([null, '', ' ', 'abc', true])(
    'Stops with an error, and asks no further page, when the next page starts at the deployment %p',
    async (deploymentId) => {
      const { catalog, lite } = setUp();
      lite.mockImplementationOnce(async () =>
        litePage(PAGE_ONE, {
          id: 'ORDERS_PRODUCT',
          deployment_id: deploymentId,
        }),
      );
      expect(await listFailure(catalog)).toContain(
        V1_CUBE_DATA_PRODUCT_LIST_ERROR.NO_CURSOR,
      );
      expect(lite).toHaveBeenCalledTimes(1);
    },
  );

  test('Follows a cursor whose deployment is a string of digits', async () => {
    const { catalog, lite } = setUp();
    lite
      .mockImplementationOnce(async () =>
        litePage(PAGE_ONE, { id: 'ORDERS_PRODUCT', deployment_id: '1234' }),
      )
      .mockImplementationOnce(async () => litePage(PAGE_TWO));
    await catalog.search({ text: '', environmentType: PRODUCTION });
    expect(lite).toHaveBeenLastCalledWith(
      1000,
      'PRODUCTION',
      'ORDERS_PRODUCT',
      1234,
      'token',
    );
  });

  test('Stops with an error on a repeated cursor, and asks no further page', async () => {
    const { catalog, lite } = setUp();
    lite.mockImplementation(async () => litePage(PAGE_ONE, CURSOR));
    expect(await listFailure(catalog)).toContain(
      V1_CUBE_DATA_PRODUCT_LIST_ERROR.REPEATED_CURSOR,
    );
    expect(lite).toHaveBeenCalledTimes(2);
  });

  test('Stops with an error past its page cap, however the cursor moves', async () => {
    const { catalog, lite } = setUp();
    let page = 0;
    lite.mockImplementation(async () =>
      litePage(PAGE_ONE, { id: `PRODUCT_${++page}`, deployment_id: page }),
    );
    expect(await listFailure(catalog)).toContain(
      V1_CUBE_DATA_PRODUCT_LIST_ERROR.TOO_MANY_PAGES,
    );
    expect(lite).toHaveBeenCalledTimes(50);
  });

  test('Takes an answer that is no page, such as a 200 carrying an error, as an error', async () => {
    const { catalog, lite } = setUp();
    lite.mockImplementationOnce(async () => ({
      errorMessage: 'Entitlements unavailable',
    }));
    expect(await listFailure(catalog)).toContain(
      V1_CUBE_DATA_PRODUCT_LIST_ERROR.UNREADABLE_PAGE,
    );
  });

  test('Stops between pages once its search is dropped, and lists afresh on the next search', async () => {
    const { catalog, lite } = setUp();
    let release!: () => void;
    lite.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(litePage(PAGE_ONE, CURSOR));
        }),
    );
    const abort = new AbortController();
    const dropped = catalog
      .search({ text: '', environmentType: PRODUCTION }, abort.signal)
      .catch((error: unknown) => error);
    abort.abort();
    // a new search doesn't wait on the stopped one
    lite.mockImplementationOnce(async () => litePage(PAGE_TWO));
    expect(
      (await catalog.search({ text: '', environmentType: PRODUCTION })).map(
        (product) => product.id,
      ),
    ).toEqual(['RETURNS_PRODUCT']);
    release();
    expect(await dropped).toBeInstanceOf(Error);
    expect(lite).toHaveBeenCalledTimes(2);
  });

  test('Asks for the access token on every page', async () => {
    let token = 0;
    const { catalog, lite } = setUp(() => `token-${++token}`);
    lite
      .mockImplementationOnce(async () => litePage(PAGE_ONE, CURSOR))
      .mockImplementationOnce(async () => litePage(PAGE_TWO));
    await catalog.search({ text: '', environmentType: PRODUCTION });
    expect(lite.mock.calls.map((call) => call[4])).toEqual([
      'token-1',
      'token-2',
    ]);
  });
});
