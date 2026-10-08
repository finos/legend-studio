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
import { listOrigins } from '../../__test-utils__/CubeIRTestUtils.js';
import { column, resolvedTable } from '../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import { Restrict } from '../../nodes/transforms/Restrict.js';
import { Schema, type SchemaColumn } from '../../schema/Schema.js';
import { storeAccessor } from '../CubeIR.js';
import { emitRestrict } from '../emitters/RestrictEmitter.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const ORDERS = '#>{test::Northwind.NORTHWIND.ORDERS}#';
const COLUMNS = [
  column('ORDER_ID'),
  column('CUSTOMER_ID'),
  column('SHIP_COUNTRY'),
];

const ordersRestricted = (columns: string[]): Query =>
  new Query(
    [
      resolvedTable('relational101', 'ORDERS', COLUMNS),
      new Restrict('restrict101', columns),
    ],
    [new Connection('relational101', 'restrict101', 'tds')],
    'restrict101',
  );

describe(unitTest('Restrict emission'), () => {
  test("Selects the kept columns in the input's order, not the order they were picked in", () => {
    const relation = new QueryEmitter(
      ordersRestricted(['SHIP_COUNTRY', 'ORDER_ID']),
    ).emitRelation('restrict101');
    expect(printIR(relation)).toBe(
      `${ORDERS}->select(~[ORDER_ID, SHIP_COUNTRY])`,
    );
    expect(listOrigins(relation)).toEqual([
      'select@restrict101:select',
      `${ORDERS}@relational101:accessor`,
    ]);
  });

  test('Refuses to emit a schema that is not a subsequence of its input', () => {
    const input = new Schema(COLUMNS);
    const accessor = storeAccessor(['test::Northwind', 'NORTHWIND', 'ORDERS']);
    const restrict = new Restrict('restrict101', ['ORDER_ID']);
    expect(() =>
      emitRestrict(restrict, [accessor], {
        inputSchemas: [input],
        schema: new Schema([COLUMNS[2], COLUMNS[0]] as SchemaColumn[]),
      }),
    ).toThrow(`Restrict "restrict101" would select SHIP_COUNTRY, ORDER_ID`);
    expect(() =>
      emitRestrict(restrict, [accessor], {
        inputSchemas: [input],
        schema: new Schema([column('FREIGHT')]),
      }),
    ).toThrow(`Restrict "restrict101" would select FREIGHT`);
    expect(() =>
      emitRestrict(restrict, [accessor], {
        inputSchemas: [input],
        schema: new Schema([]),
      }),
    ).toThrow(`Restrict "restrict101" would select `);
  });

  test("Refuses to emit an invalid restrict, which validation doesn't let through", () => {
    expect(new QueryEmitter(ordersRestricted([])).canEmit('restrict101')).toBe(
      false,
    );
    expect(
      new QueryEmitter(ordersRestricted(['SHIPPER'])).canEmit('restrict101'),
    ).toBe(false);
  });
});
