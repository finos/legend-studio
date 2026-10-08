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
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { column } from '../../__test-utils__/CubeTestNodes.js';
import { EnumType, PrimitiveType } from '../../types/CubeType.js';
import { Schema, SchemaColumn } from '../Schema.js';

const ORDERS = new Schema([
  column('ORDER_ID', 'Int'),
  column('SHIP_NAME', 'Varchar', true, [40]),
]);

describe(unitTest('Schema'), () => {
  test('Looks up columns and lists names in order', () => {
    expect(ORDERS.lookup('SHIP_NAME')?.nullable).toBe(true);
    expect(ORDERS.lookup('MISSING')).toBeUndefined();
    expect(ORDERS.type('ORDER_ID')?.displayName).toBe('Int');
    expect(ORDERS.type('MISSING')).toBeUndefined();
    expect(ORDERS.names()).toEqual(['ORDER_ID', 'SHIP_NAME']);
    expect(Object.isFrozen(ORDERS.columns)).toBe(true);
  });

  test('Needs column names, and unique ones', () => {
    expect(
      () => new SchemaColumn('', PrimitiveType.get('String'), false),
    ).toThrow();
    expect(
      () => new Schema([column('ORDER_ID'), column('ORDER_ID', 'String')]),
    ).toThrow();
  });

  test('Equality compares names and types in order, and ignores nullability', () => {
    expect(
      ORDERS.equals(
        new Schema([
          column('ORDER_ID', 'Int'),
          column('SHIP_NAME', 'Varchar', false, [40]),
        ]),
      ),
    ).toBe(true);
    // order
    expect(
      ORDERS.equals(
        new Schema([
          column('SHIP_NAME', 'Varchar', true, [40]),
          column('ORDER_ID', 'Int'),
        ]),
      ),
    ).toBe(false);
    // precise type parameters
    expect(
      ORDERS.equals(
        new Schema([
          column('ORDER_ID', 'Int'),
          column('SHIP_NAME', 'Varchar', true, [15]),
        ]),
      ),
    ).toBe(false);
    // names
    expect(
      ORDERS.equals(
        new Schema([
          column('ORDER_ID', 'Int'),
          column('SHIP', 'Varchar', true, [40]),
        ]),
      ),
    ).toBe(false);
    // length
    expect(ORDERS.equals(new Schema([column('ORDER_ID', 'Int')]))).toBe(false);
    // ...in both directions: a prefix or an empty schema is not equal either
    expect(new Schema([column('ORDER_ID', 'Int')]).equals(ORDERS)).toBe(false);
    expect(new Schema([]).equals(ORDERS)).toBe(false);
    expect(new Schema([column('ORDER_ID', 'Int')]).isIdenticalTo(ORDERS)).toBe(
      false,
    );
    expect(new Schema([]).equals(new Schema([]))).toBe(true);
  });

  test('Drift detection also compares nullability', () => {
    const sameButNotNull = new Schema([
      column('ORDER_ID', 'Int'),
      column('SHIP_NAME', 'Varchar', false, [40]),
    ]);
    expect(ORDERS.equals(sameButNotNull)).toBe(true);
    expect(ORDERS.isIdenticalTo(sameButNotNull)).toBe(false);
    expect(
      ORDERS.isIdenticalTo(
        new Schema([
          column('ORDER_ID', 'Int'),
          column('SHIP_NAME', 'Varchar', true, [40]),
        ]),
      ),
    ).toBe(true);
  });

  test('Compares column types structurally, not by object identity', () => {
    const colorColumn = (values: string[], path = 'my::model::Color'): Schema =>
      new Schema([
        new SchemaColumn('COLOR', new EnumType(path, values), false),
      ]);
    // separate enumeration objects with the same path are the same type
    expect(colorColumn(['RED']).equals(colorColumn(['BLUE']))).toBe(true);
    expect(colorColumn(['RED']).isIdenticalTo(colorColumn(['BLUE']))).toBe(
      true,
    );
    expect(
      colorColumn(['RED']).equals(colorColumn(['RED'], 'my::model::Size')),
    ).toBe(false);
  });
});
