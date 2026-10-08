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
import { FilterOperator } from '../../filter/FilterOperator.js';
import { ColumnComparisonFilter } from '../../filter/FilterTree.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import type { QueryNode } from '../../graph/QueryNode.js';
import { Drop } from '../../nodes/transforms/Drop.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { Join } from '../../nodes/transforms/Join.js';
import { Limit } from '../../nodes/transforms/Limit.js';
import { Rename } from '../../nodes/transforms/Rename.js';
import { Restrict } from '../../nodes/transforms/Restrict.js';
import { Slice } from '../../nodes/transforms/Slice.js';
import { Sort, SortDirection } from '../../nodes/transforms/Sort.js';
import { Schema } from '../../schema/Schema.js';
import { EmitRole, storeAccessor } from '../CubeIR.js';
import { originOf } from '../EmitContext.js';
import {
  emitRowOrder,
  emitSort,
  emitSortedInput,
} from '../emitters/SortEmitter.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const RUNTIME = 'test::Runtime';
const ORDERS = '#>{test::Northwind.NORTHWIND.ORDERS}#';
const ACCESSOR = storeAccessor(['test::Northwind', 'NORTHWIND', 'ORDERS']);
const COLUMNS = [
  column('ORDER_ID'),
  column('CUSTOMER_ID', 'String'),
  column('SHIP_COUNTRY', 'String'),
];
const SCHEMA = new Schema(COLUMNS);
const { ASC, DESC } = SortDirection;

const orders = (id = 'relational101'): QueryNode =>
  resolvedTable(id, 'ORDERS', COLUMNS);

/** ORDERS, then the nodes, the last selected */
const ordersThen = (...nodes: QueryNode[]): Query => {
  const all = [orders(), ...nodes];
  return new Query(
    all,
    all
      .slice(1)
      .map(
        (node, index) =>
          new Connection((all[index] as QueryNode).id, node.id, 'tds'),
      ),
    all.at(-1)?.id,
  );
};

const byOrderIdDesc = (id = 'sort101'): Sort =>
  new Sort(id, [{ column: 'ORDER_ID', direction: DESC }]);

const run = (query: Query): string =>
  printIR(
    new QueryEmitter(query).emitExecutionLambda({
      rowLimit: 1000,
      runtime: RUNTIME,
    }),
  );

describe(unitTest('Sort emission'), () => {
  test('Writes nothing where a Sort stands, so typing gets its input as it is', () => {
    const query = ordersThen(byOrderIdDesc());
    const emitter = new QueryEmitter(query);
    expect(printIR(emitter.emitRelation('sort101'))).toBe(ORDERS);
    expect(printIR(emitter.emitTypingLambda('sort101'))).toBe(`{| ${ORDERS}}`);
    expect(emitSort(byOrderIdDesc(), [ACCESSOR]) === ACCESSOR).toBe(true);
  });

  test("Sorts the run's rows by a Sort that reaches it, before the row limit", () => {
    const lambda = new QueryEmitter(
      ordersThen(byOrderIdDesc()),
    ).emitExecutionLambda({ rowLimit: 1000, runtime: RUNTIME });
    expect(printIR(lambda)).toBe(
      `{| ${ORDERS}->sort(~ORDER_ID->descending())->limit(1001)->from(${RUNTIME})}`,
    );
    expect(listOrigins(lambda)).toEqual([
      'from@sort101:from',
      'limit@sort101:limit',
      'sort@sort101:captureSort',
      `${ORDERS}@relational101:accessor`,
      'descending@sort101:sortKey',
      '1001@sort101:limit',
    ]);
  });

  test('Writes several keys as a list, most significant first', () => {
    expect(
      run(
        ordersThen(
          new Sort('sort101', [
            { column: 'SHIP_COUNTRY', direction: DESC },
            { column: 'ORDER_ID', direction: ASC },
          ]),
        ),
      ),
    ).toBe(
      `{| ${ORDERS}->sort([~SHIP_COUNTRY->descending(), ~ORDER_ID->ascending()])->limit(1001)->from(${RUNTIME})}`,
    );
  });

  test.each<[string, QueryNode, string]>([
    ['a Limit', new Limit('next101', 5), 'limit(5)'],
    ['a Drop', new Drop('next101', 5), 'drop(5)'],
    ['a Slice', new Slice('next101', 5, 10), 'slice(5, 10)'],
  ])(
    'Sorts just before %s that takes rows by the order, and again for the run',
    (_, node, call) => {
      const query = ordersThen(byOrderIdDesc(), node);
      const lambda = new QueryEmitter(query).emitExecutionLambda({
        rowLimit: 1000,
        runtime: RUNTIME,
      });
      expect(printIR(lambda)).toBe(
        `{| ${ORDERS}->sort(~ORDER_ID->descending())->${call}->sort(~ORDER_ID->descending())->limit(1001)->from(${RUNTIME})}`,
      );
      // the sort before the node is the node's; each key, the Sort's
      expect(
        listOrigins(lambda).filter(
          (origin) => origin.startsWith('sort@') || origin.includes(':sortKey'),
        ),
      ).toEqual([
        'sort@next101:captureSort',
        'sort@next101:sort',
        'descending@sort101:sortKey',
        'descending@sort101:sortKey',
      ]);
    },
  );

  test('Writes the order only to run: not to type, and not without being asked', () => {
    const query = ordersThen(byOrderIdDesc(), new Limit('limit101', 5));
    const emitter = new QueryEmitter(query);
    expect(printIR(emitter.emitRelation('limit101'))).toBe(
      `${ORDERS}->limit(5)`,
    );
    expect(printIR(emitter.emitTypingLambda('limit101'))).toBe(
      `{| ${ORDERS}->limit(5)}`,
    );
    expect(
      printIR(emitter.emitRelation('limit101', { withRowOrder: true })),
    ).toBe(`${ORDERS}->sort(~ORDER_ID->descending())->limit(5)`);
  });

  test('Sorts by the keys under their names where the order is used, through a Rename and a Filter', () => {
    const query = ordersThen(
      byOrderIdDesc(),
      new Rename('rename101', [{ from: 'ORDER_ID', to: 'Order Id' }]),
      new Filter(
        'filter101',
        new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
          kind: 'string',
          value: 'France',
        }),
      ),
      new Limit('limit101', 3),
    );
    expect(
      printIR(
        new QueryEmitter(query).emitRelation('limit101', {
          withRowOrder: true,
        }),
      ),
    ).toBe(
      `${ORDERS}->rename(~ORDER_ID, ~'Order Id')->filter({row | $row.SHIP_COUNTRY == 'France'})->sort(~'Order Id'->descending())->limit(3)`,
    );
  });

  test('Merges two Sorts in a row: the later keys first', () => {
    expect(
      run(
        ordersThen(
          byOrderIdDesc(),
          new Sort('sort102', [{ column: 'SHIP_COUNTRY', direction: ASC }]),
          new Limit('limit101', 5),
        ),
      ),
    ).toContain(
      `${ORDERS}->sort([~SHIP_COUNTRY->ascending(), ~ORDER_ID->descending()])->limit(5)`,
    );
  });

  test.each<[string, QueryNode[]]>([
    ['without a Sort', [new Limit('limit101', 5)]],
    [
      'once a Restrict drops the key',
      [
        byOrderIdDesc(),
        new Restrict('restrict101', ['SHIP_COUNTRY']),
        new Limit('limit101', 5),
      ],
    ],
  ])('Writes no sort %s', (_, nodes) => {
    expect(run(ordersThen(...nodes))).not.toContain('sort(');
  });

  test('Writes no sort after a Join, though both its inputs are sorted', () => {
    const query = new Query(
      [
        orders('relational101'),
        byOrderIdDesc('sort101'),
        resolvedTable('relational102', 'CUSTOMERS', [
          column('CUSTOMER_ID', 'String'),
          column('COMPANY_NAME', 'String'),
        ]),
        new Sort('sort102', [{ column: 'COMPANY_NAME', direction: ASC }]),
        new Join('join101', {
          leftColumns: ['CUSTOMER_ID'],
          rightColumns: ['CUSTOMER_ID'],
        }),
        new Limit('limit101', 5),
      ],
      [
        new Connection('relational101', 'sort101', 'tds'),
        new Connection('relational102', 'sort102', 'tds'),
        new Connection('sort101', 'join101', 'leftTds'),
        new Connection('sort102', 'join101', 'rightTds'),
        new Connection('join101', 'limit101', 'tds'),
      ],
      'limit101',
    );
    expect(new QueryEmitter(query).canEmit('limit101')).toBe(true);
    expect(run(query)).not.toContain('sort(');
  });

  test("Doesn't emit a Sort that validation doesn't let through", () => {
    const query = ordersThen(
      new Sort('sort101', [{ column: '', direction: ASC }]),
    );
    expect(new QueryEmitter(query).canEmit('sort101')).toBe(false);
  });

  test('Refuses to emit a Sort without an input', () => {
    expect(() => emitSort(byOrderIdDesc(), [])).toThrow(
      `Can't emit sort "sort101": it needs one input`,
    );
  });

  test('Refuses to sort by no key, or by a column the rows do not have', () => {
    const origin = originOf('limit101', EmitRole.SORT);
    expect(() => emitRowOrder(ACCESSOR, [], SCHEMA, origin)).toThrow(
      `Can't sort by no column`,
    );
    expect(() =>
      emitRowOrder(
        ACCESSOR,
        [
          {
            column: 'ORDER_ID',
            direction: ASC,
            sortId: 'sort101',
            keyIndex: 0,
          },
          { column: 'SHIPPER', direction: ASC, sortId: 'sort101', keyIndex: 1 },
        ],
        SCHEMA,
        origin,
      ),
    ).toThrow(
      `Can't sort by ORDER_ID, SHIPPER: the rows have ORDER_ID, CUSTOMER_ID, SHIP_COUNTRY`,
    );
  });

  test('Leaves the input as it is without an order to write', () => {
    const limit = new Limit('limit101', 5);
    expect(emitSortedInput(limit, ACCESSOR, undefined) === ACCESSOR).toBe(true);
    expect(
      emitSortedInput(limit, ACCESSOR, {
        inputSchemas: [SCHEMA],
        schema: SCHEMA,
        inputOrder: [],
      }) === ACCESSOR,
    ).toBe(true);
  });
});
