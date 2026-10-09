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

import { describe, expect, test } from '@jest/globals';
import { Schema } from '@finos/legend-cube';
import {
  createFakeCubeDataProductCatalog,
  FAKE_DATA_PRODUCT_CANDIDATES,
  fakeDescriptionOf,
} from '../../__test-utils__/FakeCubeDataProductCatalog.js';
import { CubeDataProductEnvironmentType } from '../CubeDataProduct.js';
import { CubeAccessPoint } from '../CubeDataProductCatalog.js';
import { CubeEngineError } from '../CubeEngine.js';

const { PRODUCTION, PRODUCTION_PARALLEL } = CubeDataProductEnvironmentType;

describe('Data product catalog', () => {
  test('Knows a product deployed from a moving version', () => {
    expect(
      FAKE_DATA_PRODUCT_CANDIDATES.map((product) => [
        product.id,
        product.environmentType,
        product.isSnapshot,
      ]),
    ).toEqual([
      ['ORDERS_PRODUCT', PRODUCTION, false],
      ['RETURNS_PRODUCT', PRODUCTION, true],
      ['ORDERS_PRODUCT', PRODUCTION_PARALLEL, false],
    ]);
  });

  test('Lets an access point be picked only with its columns and no reason against it', () => {
    const [orders] = FAKE_DATA_PRODUCT_CANDIDATES;
    const { groups } = fakeDescriptionOf(
      orders as (typeof FAKE_DATA_PRODUCT_CANDIDATES)[number],
    );
    expect(
      groups.map((group) => [
        group.id,
        group.accessPoints.map((point) => [point.id, point.isPickable]),
      ]),
    ).toEqual([
      [
        'core',
        [
          ['daily_orders', true],
          ['orders_as_of', false],
        ],
      ],
      [
        'reference',
        [
          ['customers', true],
          ['raw_feed', false],
        ],
      ],
    ]);
    expect(new CubeAccessPoint({ id: 'bare' }).isPickable).toBe(false);
  });

  test("Lists a class's products by text, and resolves saved sources one by one, failures included", async () => {
    const { catalog } = createFakeCubeDataProductCatalog();
    expect(catalog.environmentTypes).toEqual([PRODUCTION, PRODUCTION_PARALLEL]);
    expect(
      (
        await catalog.search({ text: 'returns', environmentType: PRODUCTION })
      ).map((product) => product.id),
    ).toEqual(['RETURNS_PRODUCT']);
    expect(
      (
        await catalog.search({
          text: '',
          environmentType: PRODUCTION_PARALLEL,
        })
      ).map((product) => product.id),
    ).toEqual(['ORDERS_PRODUCT']);
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
            accessPoint: 'gone',
          },
        ],
      ]),
    );
    expect(resolved.get('dataProductAccessPoint101')).toBeInstanceOf(Schema);
    expect(resolved.get('dataProductAccessPoint102')).toBeInstanceOf(
      CubeEngineError,
    );
    expect(
      (resolved.get('dataProductAccessPoint102') as CubeEngineError).nodeId,
    ).toBe('dataProductAccessPoint102');
  });
});
