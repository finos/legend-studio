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

import { jest } from '@jest/globals';
import { PrimitiveType, Schema, SchemaColumn } from '@finos/legend-cube';
import { CubeDataProductEnvironmentType } from '../graph-manager/CubeDataProduct.js';
import {
  CubeAccessPoint,
  CubeAccessPointGroup,
  type CubeDataProductCatalog,
  CubeDataProductCandidate,
  CubeDataProductDescription,
} from '../graph-manager/CubeDataProductCatalog.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../graph-manager/CubeEngine.js';

// A data product catalog for jsdom tests: canned products, no network. Each
// method is a jest.fn, so tests can read its calls or change its answer

const { PRODUCTION, PRODUCTION_PARALLEL } = CubeDataProductEnvironmentType;

const column = (name: string, path: string, params: number[] = []) =>
  new SchemaColumn(name, PrimitiveType.get(path, params), false);

/** The orders product's daily access point */
export const FAKE_DAILY_ORDERS_SCHEMA = new Schema([
  column('ORDER_ID', 'meta::pure::precisePrimitives::BigInt'),
  column('CUSTOMER_ID', 'meta::pure::precisePrimitives::Varchar', [10]),
  column('REGION', 'meta::pure::precisePrimitives::Varchar', [20]),
  column('AMOUNT', 'meta::pure::precisePrimitives::Numeric', [10, 2]),
]);

export const FAKE_CUSTOMERS_SCHEMA = new Schema([
  column('CUSTOMER_ID', 'meta::pure::precisePrimitives::Varchar', [10]),
  column('COUNTRY', 'meta::pure::precisePrimitives::Varchar', [40]),
]);

const candidate = (
  id: string,
  title: string,
  environmentType: CubeDataProductEnvironmentType,
  versionId = '1.4.0',
): CubeDataProductCandidate =>
  new CubeDataProductCandidate({
    id,
    deploymentId: `deployment-${id.toLowerCase()}`,
    dataProductPath: `sales::products::${title.replace(/\s/gu, '')}`,
    title,
    description: `${title}, for tests`,
    groupId: 'com.example.sales',
    artifactId: 'orders-products',
    versionId,
    environmentType,
    producerEnvironmentName: 'sales-producer',
  });

/** Products of each class Cube lists, one deployed from a moving version */
export const FAKE_DATA_PRODUCT_CANDIDATES: readonly CubeDataProductCandidate[] =
  [
    candidate('ORDERS_PRODUCT', 'Orders Product', PRODUCTION),
    candidate(
      'RETURNS_PRODUCT',
      'Returns Product',
      PRODUCTION,
      'feature-returns-SNAPSHOT',
    ),
    candidate('ORDERS_PRODUCT', 'Orders Product', PRODUCTION_PARALLEL),
  ];

/** Two groups: one with a pickable access point, and two that can't be picked */
export const fakeDescriptionOf = (
  product: CubeDataProductCandidate,
): CubeDataProductDescription =>
  new CubeDataProductDescription(product, [
    new CubeAccessPointGroup({
      id: 'core',
      title: 'Core',
      accessPoints: [
        new CubeAccessPoint({
          id: 'daily_orders',
          title: 'Daily orders',
          schema: FAKE_DAILY_ORDERS_SCHEMA,
          sampleRows: [['1', 'ALFKI', 'EMEA', '12.34']],
        }),
        new CubeAccessPoint({
          id: 'orders_as_of',
          title: 'Orders as of a date',
          schema: FAKE_DAILY_ORDERS_SCHEMA,
          disabledReason:
            'It takes parameters, which Cube does not support yet',
        }),
      ],
    }),
    new CubeAccessPointGroup({
      id: 'reference',
      title: 'Reference',
      accessPoints: [
        new CubeAccessPoint({ id: 'customers', schema: FAKE_CUSTOMERS_SCHEMA }),
        new CubeAccessPoint({
          id: 'raw_feed',
          disabledReason: 'Its columns are not in the deployed artifact',
        }),
      ],
    }),
  ]);

const SCHEMAS = new Map([
  ['daily_orders', FAKE_DAILY_ORDERS_SCHEMA],
  ['customers', FAKE_CUSTOMERS_SCHEMA],
]);

export interface FakeCubeDataProductCatalog {
  readonly catalog: CubeDataProductCatalog;
  readonly search: jest.Mock<CubeDataProductCatalog['search']>;
  readonly describe: jest.Mock<CubeDataProductCatalog['describe']>;
  readonly resolveSchemas: jest.Mock<CubeDataProductCatalog['resolveSchemas']>;
  readonly getMarketplaceLink: jest.Mock<
    CubeDataProductCatalog['getMarketplaceLink']
  >;
}

/**
 * A fresh fake: build one per test, since jest.fn keeps its calls across
 * tests. One that searches on a server answers with its matches, as the
 * lakehouse's list is answered
 */
export const createFakeCubeDataProductCatalog = (
  candidates: readonly CubeDataProductCandidate[] = FAKE_DATA_PRODUCT_CANDIDATES,
  options?: { searchesOnServer?: boolean; searchLimit?: number },
): FakeCubeDataProductCatalog => {
  const search = jest.fn<CubeDataProductCatalog['search']>(
    async ({ text, environmentType }) =>
      Promise.resolve(
        candidates.filter(
          (product) =>
            product.environmentType === environmentType &&
            `${product.title} ${product.id}`
              .toLowerCase()
              .includes(text.trim().toLowerCase()),
        ),
      ),
  );
  const describe = jest.fn<CubeDataProductCatalog['describe']>(
    async (product) => Promise.resolve(fakeDescriptionOf(product)),
  );
  const resolveSchemas = jest.fn<CubeDataProductCatalog['resolveSchemas']>(
    async (_project, sources) =>
      Promise.resolve(
        new Map(
          [...sources].map(([nodeId, source]) => [
            nodeId,
            SCHEMAS.get(source.accessPoint) ??
              new CubeEngineError(
                CubeEngineErrorKind.COMPILE,
                `The access point "${source.accessPoint}" can't be found`,
                nodeId,
              ),
          ]),
        ),
      ),
  );
  const getMarketplaceLink = jest.fn<
    CubeDataProductCatalog['getMarketplaceLink']
  >(
    (target) =>
      `https://marketplace.test/dataProduct/deployed/${target.dataProductId}/${target.deploymentId}`,
  );
  return {
    catalog: {
      environmentTypes: [PRODUCTION, PRODUCTION_PARALLEL],
      searchesOnServer: options?.searchesOnServer,
      searchLimit: options?.searchLimit,
      search,
      describe,
      resolveSchemas,
      getMarketplaceLink,
    },
    search,
    describe,
    resolveSchemas,
    getMarketplaceLink,
  };
};
