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
import { Rename, type RenameMapping } from '../../nodes/transforms/Rename.js';
import { Schema } from '../../schema/Schema.js';
import { storeAccessor } from '../CubeIR.js';
import { emitRename } from '../emitters/RenameEmitter.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const ORDERS = '#>{test::Northwind.NORTHWIND.ORDERS}#';
const COLUMNS = [column('ORDER_ID'), column('SHIP_COUNTRY')];

const ordersRenamed = (mappings: RenameMapping[]): Query =>
  new Query(
    [
      resolvedTable('relational101', 'ORDERS', COLUMNS),
      new Rename('rename101', mappings),
    ],
    [new Connection('relational101', 'rename101', 'tds')],
    'rename101',
  );

describe(unitTest('Rename emission'), () => {
  test('Chains one rename per mapping, in mapping order, quoting names that need it', () => {
    const relation = new QueryEmitter(
      ordersRenamed([
        { from: 'SHIP_COUNTRY', to: 'Ship Country' },
        { from: 'ORDER_ID', to: "order's id" },
      ]),
    ).emitRelation('rename101');
    expect(printIR(relation)).toBe(
      `${ORDERS}->rename(~SHIP_COUNTRY, ~'Ship Country')->rename(~ORDER_ID, ~'order\\'s id')`,
    );
    expect(listOrigins(relation)).toEqual([
      'rename@rename101:rename',
      'rename@rename101:rename',
      `${ORDERS}@relational101:accessor`,
    ]);
  });

  test('Writes the names as given in the column specs', () => {
    const relation = new QueryEmitter(
      ordersRenamed([{ from: 'ORDER_ID', to: 'país' }]),
    ).emitRelation('rename101');
    expect(relation).toMatchObject({
      k: 'func',
      name: 'rename',
      params: [
        { k: 'storeAccessor' },
        { k: 'colSpec', name: 'ORDER_ID' },
        { k: 'colSpec', name: 'país' },
      ],
    });
  });

  test("Refuses to emit names that don't come out as the node's schema", () => {
    const rename = new Rename('rename101', [{ from: 'ORDER_ID', to: 'ID' }]);
    const accessor = storeAccessor(['test::Northwind', 'NORTHWIND', 'ORDERS']);
    expect(() =>
      emitRename(rename, [accessor], {
        inputSchemas: [new Schema(COLUMNS)],
        schema: new Schema(COLUMNS),
      }),
    ).toThrow(
      `Rename "rename101" would produce ID, SHIP_COUNTRY, but its schema is ORDER_ID, SHIP_COUNTRY`,
    );
  });

  test("Refuses to emit an invalid rename, which validation doesn't let through", () => {
    expect(new QueryEmitter(ordersRenamed([])).canEmit('rename101')).toBe(
      false,
    );
    expect(
      new QueryEmitter(
        ordersRenamed([{ from: 'ORDER_ID', to: 'SHIP_COUNTRY' }]),
      ).canEmit('rename101'),
    ).toBe(false);
  });
});
