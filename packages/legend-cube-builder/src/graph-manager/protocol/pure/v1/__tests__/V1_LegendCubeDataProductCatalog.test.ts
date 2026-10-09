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
import { V1_LegendCubeDataProductCatalog } from '../V1_LegendCubeDataProductCatalog.js';

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

const setUp = (): {
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
    .spyOn(contract, 'getAllLiteDataProducts')
    .mockImplementation((async (environmentType: string) => ({
      dataProducts: [
        liteRow('ORDERS_PRODUCT', environmentType),
        // 'Production' casing, as some deployments send it
        liteRow('CASED_PRODUCT', 'Production'),
        liteRow('ADHOC_PRODUCT', environmentType, {
          type: 'AdHocDeployment',
          definition: '',
        }),
        liteRow('NO_PATH_PRODUCT', environmentType, undefined, ''),
        liteRow('NO_ORIGIN_PRODUCT', environmentType, null),
      ],
    })) as never);
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
      () => 'token',
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
    expect(lite).toHaveBeenCalledWith('PRODUCTION', undefined, 'token');
    await catalog.search({ text: '', environmentType: PRODUCTION_PARALLEL });
    expect(lite).toHaveBeenCalledTimes(2);
    expect(lite).toHaveBeenLastCalledWith(
      'PRODUCTION_PARALLEL',
      undefined,
      'token',
    );
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
