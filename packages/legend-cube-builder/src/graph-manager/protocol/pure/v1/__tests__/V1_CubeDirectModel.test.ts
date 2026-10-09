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
import { func, type IR, lambda, storeAccessor } from '@finos/legend-cube';
import { DIRECT_H2_CONNECTION } from '../../../../../__test-utils__/CubeDirectConnectionFixtures.js';
import type { AccessorPath } from '../../../../CubeEngine.js';
import {
  V1_buildCubeDirectModelContext,
  V1_collectCubeStoreAccessors,
} from '../V1_CubeDirectModel.js';

const ORDERS: AccessorPath = ['cube::direct::Database', '"S"', '"ORDERS"'];
const CUSTOMERS: AccessorPath = [
  'cube::direct::Database',
  '"S"',
  '"CUSTOMERS"',
];

describe('Direct-connection model', () => {
  test('Finds every table a lambda reads, each once, however deep, but not inside raw protocol JSON', () => {
    const join: IR = func('join', [
      storeAccessor(ORDERS),
      func('filter', [storeAccessor(CUSTOMERS)]),
      lambda(['x'], [storeAccessor(ORDERS)]),
    ]);
    const raw: IR = {
      k: 'raw',
      json: { k: 'storeAccessor', path: ['other::Db', 'S', 'T'] },
    };
    expect(V1_collectCubeStoreAccessors(lambda([], [join, raw]))).toEqual([
      ORDERS,
      CUSTOMERS,
    ]);
  });

  test('Puts the tables in one Database, by schema then table, by code point', () => {
    const table = (name: string) => ({ name: `"${name}"`, columns: [] });
    const model = V1_buildCubeDirectModelContext(DIRECT_H2_CONNECTION, [
      { path: ['b', 'T'], definition: table('T') },
      { path: ['a', 'b'], definition: table('b') },
      { path: ['a', 'B'], definition: table('B') },
    ]);
    const [database] = model.elements as {
      schemas: { name: string; tables: { name: string }[] }[];
    }[];
    expect(
      database?.schemas.map((schema) => [
        schema.name,
        schema.tables.map((t) => t.name),
      ]),
    ).toEqual([
      ['"a"', ['"B"', '"b"']],
      ['"b"', ['"T"']],
    ]);
  });
});
