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
import { TEST__registryWithGroup } from '../../__test-utils__/CubeTestRegistry.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import type { QueryNode } from '../../graph/QueryNode.js';
import {
  AggregationFunction,
  type ColumnAggregation,
} from '../../nodes/transforms/Aggregation.js';
import { Group } from '../../nodes/transforms/Group.js';
import { Limit } from '../../nodes/transforms/Limit.js';
import { Sort, SortDirection } from '../../nodes/transforms/Sort.js';
import { Schema } from '../../schema/Schema.js';
import { storeAccessor } from '../CubeIR.js';
import { emitGroup } from '../emitters/GroupEmitter.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const RUNTIME = 'test::Runtime';
const ORDERS = '#>{test::Northwind.NORTHWIND.ORDERS}#';
const ACCESSOR = storeAccessor(['test::Northwind', 'NORTHWIND', 'ORDERS']);
const COLUMNS = [
  column('ORDER_ID'),
  column('CUSTOMER_ID', 'String'),
  column('SHIP_COUNTRY', 'String'),
  column('FREIGHT', 'Float'),
  column('ORDER_DATE', 'StrictDate'),
];
const {
  COUNT,
  DISTINCT_COUNT,
  DISTINCT_VALUE,
  SUM,
  AVERAGE,
  MIN,
  MAX,
  COUNT_ROWS,
} = AggregationFunction;

/** `n`, the Count of ORDER_ID */
const COUNT_OF_ORDER_ID: ColumnAggregation = {
  column: 'ORDER_ID',
  function: COUNT,
  name: 'n',
};
const COUNT_ROWS_AGGREGATION: ColumnAggregation = {
  column: undefined,
  function: COUNT_ROWS,
  name: 'Count Rows',
};

const group = (
  columns: readonly string[],
  aggregations: readonly ColumnAggregation[],
): Group => new Group('group101', columns, aggregations);

/** ORDERS, then the nodes, the last selected */
const ordersThen = (...nodes: QueryNode[]): Query => {
  const all = [resolvedTable('relational101', 'ORDERS', COLUMNS), ...nodes];
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

/** Group is registered with the builder's editor only in M4.5 */
const emitterOf = (query: Query): QueryEmitter =>
  new QueryEmitter(query, TEST__registryWithGroup());

/** The relation of ORDERS, then a Group with the keys and the aggregations */
const groupedOrders = (
  columns: readonly string[],
  aggregations: readonly ColumnAggregation[],
): string =>
  printIR(
    emitterOf(ordersThen(group(columns, aggregations))).emitRelation(
      'group101',
    ),
  );

describe(unitTest('Group emission'), () => {
  test('Groups by the keys in the order listed, not the input order, with each aggregation as a column spec of two functions', () => {
    expect(
      groupedOrders(['SHIP_COUNTRY', 'CUSTOMER_ID'], [COUNT_OF_ORDER_ID]),
    ).toBe(
      `${ORDERS}->groupBy(~[SHIP_COUNTRY, CUSTOMER_ID], ~[n: x | $x.ORDER_ID : y | $y->count()])`,
    );
  });

  test.each<[AggregationFunction, string, string]>([
    [COUNT, 'SHIP_COUNTRY', 'count()'],
    [DISTINCT_COUNT, 'SHIP_COUNTRY', 'distinct()->count()'],
    [DISTINCT_VALUE, 'SHIP_COUNTRY', 'uniqueValueOnly()'],
    [SUM, 'FREIGHT', 'sum()'],
    [AVERAGE, 'ORDER_ID', 'average()'],
    [MIN, 'ORDER_DATE', 'min()'],
    [MAX, 'ORDER_DATE', 'max()'],
  ])(
    'Writes %s of %s as $y->%s, over the column read from each row',
    (fn, aggregated, reduce) => {
      expect(
        groupedOrders(
          ['CUSTOMER_ID'],
          [{ column: aggregated, function: fn, name: 'n' }],
        ),
      ).toBe(
        `${ORDERS}->groupBy(~[CUSTOMER_ID], ~[n: x | $x.${aggregated} : y | $y->${reduce}])`,
      );
    },
  );

  test('Averages whole numbers with average() alone, never writing 1.0 *, which the engine adds', () => {
    const text = groupedOrders(
      ['CUSTOMER_ID'],
      [{ column: 'ORDER_ID', function: AVERAGE, name: 'n' }],
    );
    expect(text).toContain('$y->average()');
    expect(text).not.toContain('1.0');
  });

  test('Counts every row as x | 1, Count rows reading no column', () => {
    expect(groupedOrders(['CUSTOMER_ID'], [COUNT_ROWS_AGGREGATION])).toBe(
      `${ORDERS}->groupBy(~[CUSTOMER_ID], ~['Count Rows': x | 1 : y | $y->count()])`,
    );
  });

  test('Aggregates all the rows with aggregate() without a key, never with groupBy(~[], …)', () => {
    const text = groupedOrders([], [COUNT_OF_ORDER_ID]);
    expect(text).toBe(
      `${ORDERS}->aggregate(~[n: x | $x.ORDER_ID : y | $y->count()])`,
    );
    expect(text).not.toContain('groupBy');
  });

  test('Writes several aggregations in the order listed', () => {
    expect(
      groupedOrders(
        ['SHIP_COUNTRY'],
        [
          { column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum' },
          COUNT_ROWS_AGGREGATION,
          { column: 'ORDER_DATE', function: MIN, name: 'first' },
        ],
      ),
    ).toBe(
      `${ORDERS}->groupBy(~[SHIP_COUNTRY], ~['FREIGHT Sum': x | $x.FREIGHT : y | $y->sum(), 'Count Rows': x | 1 : y | $y->count(), first: x | $x.ORDER_DATE : y | $y->min()])`,
    );
  });

  test('Marks the groupBy as the group, and each column read, 1 and reduce as an aggregation of it', () => {
    const relation = emitterOf(
      ordersThen(
        group(
          ['SHIP_COUNTRY'],
          [
            COUNT_OF_ORDER_ID,
            { column: 'CUSTOMER_ID', function: DISTINCT_COUNT, name: 'm' },
            COUNT_ROWS_AGGREGATION,
          ],
        ),
      ),
    ).emitRelation('group101');
    expect(listOrigins(relation)).toEqual([
      'groupBy@group101:group',
      `${ORDERS}@relational101:accessor`,
      // n: x | $x.ORDER_ID : y | $y->count()
      '.ORDER_ID@group101:aggregation',
      'count@group101:aggregation',
      // m: x | $x.CUSTOMER_ID : y | $y->distinct()->count()
      '.CUSTOMER_ID@group101:aggregation',
      'count@group101:aggregation',
      'distinct@group101:aggregation',
      // 'Count Rows': x | 1 : y | $y->count()
      '1@group101:aggregation',
      'count@group101:aggregation',
    ]);
  });

  test('Marks the aggregate of all the rows as the group', () => {
    expect(
      listOrigins(
        emitterOf(ordersThen(group([], [COUNT_ROWS_AGGREGATION]))).emitRelation(
          'group101',
        ),
      ),
    ).toEqual([
      'aggregate@group101:group',
      `${ORDERS}@relational101:accessor`,
      '1@group101:aggregation',
      'count@group101:aggregation',
    ]);
  });

  test('Writes no sort before a Group, though a Sort comes before it', () => {
    const query = ordersThen(
      new Sort('sort101', [
        { column: 'ORDER_ID', direction: SortDirection.DESC },
      ]),
      group(['SHIP_COUNTRY'], [COUNT_OF_ORDER_ID]),
    );
    expect(
      printIR(
        emitterOf(query).emitRelation('group101', { withRowOrder: true }),
      ),
    ).toBe(
      `${ORDERS}->groupBy(~[SHIP_COUNTRY], ~[n: x | $x.ORDER_ID : y | $y->count()])`,
    );
  });

  test("Sorts a Group's rows by no order to run it, a Group keeping none", () => {
    const query = ordersThen(
      new Sort('sort101', [
        { column: 'ORDER_ID', direction: SortDirection.DESC },
      ]),
      group(['SHIP_COUNTRY'], [COUNT_OF_ORDER_ID]),
    );
    const lambda = emitterOf(query).emitExecutionLambda({
      rowLimit: 1000,
      runtime: RUNTIME,
    });
    expect(printIR(lambda)).toBe(
      `{| ${ORDERS}->groupBy(~[SHIP_COUNTRY], ~[n: x | $x.ORDER_ID : y | $y->count()])->limit(1001)->from(${RUNTIME})}`,
    );
    expect(listOrigins(lambda)).toEqual([
      'from@group101:from',
      'limit@group101:limit',
      'groupBy@group101:group',
      `${ORDERS}@relational101:accessor`,
      '.ORDER_ID@group101:aggregation',
      'count@group101:aggregation',
      '1001@group101:limit',
    ]);
  });

  test('Writes no sort before a Limit after a Group, the Group keeping no order', () => {
    const query = ordersThen(
      new Sort('sort101', [
        { column: 'ORDER_ID', direction: SortDirection.DESC },
      ]),
      group(['SHIP_COUNTRY'], [COUNT_OF_ORDER_ID]),
      new Limit('limit101', 5),
    );
    expect(
      printIR(
        emitterOf(query).emitRelation('limit101', { withRowOrder: true }),
      ),
    ).toBe(
      `${ORDERS}->groupBy(~[SHIP_COUNTRY], ~[n: x | $x.ORDER_ID : y | $y->count()])->limit(5)`,
    );
  });

  test.each<[string, Schema, string]>([
    [
      'its input',
      new Schema(COLUMNS),
      `Group "group101" would produce SHIP_COUNTRY, n, but its schema is ORDER_ID, CUSTOMER_ID, SHIP_COUNTRY, FREIGHT, ORDER_DATE`,
    ],
    [
      'the same names in another order',
      new Schema([column('n'), column('SHIP_COUNTRY', 'String')]),
      `Group "group101" would produce SHIP_COUNTRY, n, but its schema is n, SHIP_COUNTRY`,
    ],
    [
      'the names and a column more',
      new Schema([column('SHIP_COUNTRY', 'String'), column('n'), column('m')]),
      `Group "group101" would produce SHIP_COUNTRY, n, but its schema is SHIP_COUNTRY, n, m`,
    ],
  ])(
    "Refuses to emit names that don't come out as the node's schema: %s",
    (_, schema, message) => {
      expect(() =>
        emitGroup(group(['SHIP_COUNTRY'], [COUNT_OF_ORDER_ID]), [ACCESSOR], {
          inputSchemas: [new Schema(COLUMNS)],
          schema,
        }),
      ).toThrow(message);
    },
  );

  test('Refuses to emit a Group without an input', () => {
    expect(() =>
      emitGroup(group(['SHIP_COUNTRY'], [COUNT_OF_ORDER_ID]), [], {
        inputSchemas: [],
        schema: new Schema([column('SHIP_COUNTRY', 'String'), column('n')]),
      }),
    ).toThrow(`Can't emit group "group101": it needs one input`);
  });

  test('Refuses to emit a Group without an aggregation, whatever its schema', () => {
    expect(() =>
      emitGroup(group(['SHIP_COUNTRY'], []), [ACCESSOR], {
        inputSchemas: [new Schema(COLUMNS)],
        schema: new Schema([column('SHIP_COUNTRY', 'String')]),
      }),
    ).toThrow(`Can't emit group "group101": it has no aggregation`);
  });

  test('Refuses to emit a column function without a column, never counting rows in its place', () => {
    [undefined, ''].forEach((missing) =>
      expect(() =>
        emitGroup(
          group(
            ['SHIP_COUNTRY'],
            [{ column: missing, function: AggregationFunction.SUM, name: 'n' }],
          ),
          [ACCESSOR],
          {
            inputSchemas: [new Schema(COLUMNS)],
            schema: new Schema([column('SHIP_COUNTRY', 'String'), column('n')]),
          },
        ),
      ).toThrow(
        `Can't emit aggregation "n" of group "group101": it has no column`,
      ),
    );
  });

  test('Counts every row for Count rows, even holding a column, which validation refuses', () => {
    expect(
      printIR(
        emitGroup(
          group(
            ['SHIP_COUNTRY'],
            [{ column: 'ORDER_ID', function: COUNT_ROWS, name: 'n' }],
          ),
          [ACCESSOR],
          {
            inputSchemas: [new Schema(COLUMNS)],
            schema: new Schema([column('SHIP_COUNTRY', 'String'), column('n')]),
          },
        ),
      ),
    ).toContain(`~[n: x | 1 : y | $y->count()]`);
  });

  test("Doesn't emit a Group without an aggregation, which validation doesn't let through", () => {
    const emitter = emitterOf(ordersThen(group(['SHIP_COUNTRY'], [])));
    expect(emitter.canEmit('group101')).toBe(false);
    expect(() => emitter.emitRelation('group101')).toThrow(
      `Can't emit node "group101": it is invalid (Aggregations cannot be empty.)`,
    );
  });
});
