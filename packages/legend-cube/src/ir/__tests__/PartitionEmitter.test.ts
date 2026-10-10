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
import {
  AggregationFunction,
  type ColumnAggregation,
  WindowRankFunction,
  WindowRowFunction,
} from '../../nodes/transforms/Aggregation.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { createNodeRegistry } from '../../nodes/NodeRegistry.js';
import { Partition } from '../../nodes/transforms/Partition.js';
import {
  type ColumnDirection,
  Sort,
  SortDirection,
} from '../../nodes/transforms/Sort.js';
import { Schema } from '../../schema/Schema.js';
import { storeAccessor } from '../CubeIR.js';
import { emitPartition } from '../emitters/PartitionEmitter.js';
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
/** The input's columns, as a Partition keeps them */
const INPUT = 'ORDER_ID, CUSTOMER_ID, SHIP_COUNTRY, FREIGHT, ORDER_DATE';
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
const { RANK, DENSE_RANK, ROW_NUMBER } = WindowRankFunction;

/** `n`, the Count of ORDER_ID */
const COUNT_OF_ORDER_ID: ColumnAggregation = {
  column: 'ORDER_ID',
  function: COUNT,
  name: 'n',
};
const COUNT_ROWS_FUNCTION: ColumnAggregation = {
  column: undefined,
  function: COUNT_ROWS,
  name: 'Count Rows',
};
/** `s`, the Sum of FREIGHT */
const SUM_OF_FREIGHT: ColumnAggregation = {
  column: 'FREIGHT',
  function: SUM,
  name: 's',
};
/** `mx`, the Max of ORDER_DATE */
const MAX_OF_ORDER_DATE: ColumnAggregation = {
  column: 'ORDER_DATE',
  function: MAX,
  name: 'mx',
};
const rankFunction = (
  fn: WindowRankFunction,
  name: string,
): ColumnAggregation => ({
  column: undefined,
  function: fn,
  name,
});
/** `rk`, a Rank */
const RANK_FUNCTION = rankFunction(RANK, 'rk');

const BY_ORDER_DATE: readonly ColumnDirection[] = [
  { column: 'ORDER_DATE', direction: SortDirection.ASC },
];
/** The window of a Partition by SHIP_COUNTRY sorted by ORDER_DATE */
const OVER_COUNTRY_BY_DATE = `~[SHIP_COUNTRY]->over([~ORDER_DATE->ascending()])`;
const SUM_TEXT = `s: {p, w, r | $r.FREIGHT} : y | $y->sum()`;
const MAX_TEXT = `mx: {p, w, r | $r.ORDER_DATE} : y | $y->max()`;
const RANK_TEXT = `rk: {p, w, r | $p->rank($w, $r)}`;

const partition = (
  columns: readonly string[],
  sorts: readonly ColumnDirection[],
  aggregations: readonly ColumnAggregation[],
): Partition => new Partition('partition101', columns, sorts, aggregations);

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

const emitterOf = (query: Query): QueryEmitter =>
  new QueryEmitter(query, createNodeRegistry());

/** The relation of ORDERS, then a Partition with the columns, sorts and window functions */
const windowedOrders = (
  columns: readonly string[],
  sorts: readonly ColumnDirection[],
  aggregations: readonly ColumnAggregation[],
): string =>
  printIR(
    emitterOf(ordersThen(partition(columns, sorts, aggregations))).emitRelation(
      'partition101',
    ),
  );

/** The countries' top 3, by their Rank `rk` */
const topThree = (): Filter =>
  new Filter(
    'filter101',
    new ColumnComparisonFilter('rk', FilterOperator.LESS_THAN_OR_EQUAL, {
      kind: 'integer',
      value: '3',
    }),
  );
const TOP_THREE = `->filter({row | $row.rk <= 3})`;

/** Each country's orders ranked by date */
const rankedByDate = (): Partition =>
  partition(['SHIP_COUNTRY'], BY_ORDER_DATE, [RANK_FUNCTION]);
const RANKED_BY_DATE = `${ORDERS}->extend(${OVER_COUNTRY_BY_DATE}, ~[${RANK_TEXT}])`;

const run = (query: Query): string =>
  printIR(
    emitterOf(query).emitExecutionLambda({ rowLimit: 1000, runtime: RUNTIME }),
  );

describe(unitTest('Partition emission'), () => {
  test.each<[string, readonly string[], readonly ColumnDirection[], string]>([
    [
      'partition columns and sort keys',
      ['SHIP_COUNTRY', 'CUSTOMER_ID'],
      [
        { column: 'ORDER_DATE', direction: SortDirection.ASC },
        { column: 'ORDER_ID', direction: SortDirection.DESC },
      ],
      `~[SHIP_COUNTRY, CUSTOMER_ID]->over([~ORDER_DATE->ascending(), ~ORDER_ID->descending()])`,
    ],
    ['partition columns only', ['SHIP_COUNTRY'], [], `~[SHIP_COUNTRY]->over()`],
    ['sort keys only', [], BY_ORDER_DATE, `[~ORDER_DATE->ascending()]->over()`],
    ['neither', [], [], `[]->over()`],
  ])(
    'Writes the window of a Partition with %s as over() of the lists it has, in the order listed',
    (_, columns, sorts, over) => {
      expect(windowedOrders(columns, sorts, [COUNT_OF_ORDER_ID])).toBe(
        `${ORDERS}->extend(${over}, ~[n: {p, w, r | $r.ORDER_ID} : y | $y->size()])`,
      );
    },
  );

  test('Never writes an empty partition column list, which the engine fails on, nor an empty list before the sort keys', () => {
    const sortedOnly = windowedOrders([], BY_ORDER_DATE, [COUNT_OF_ORDER_ID]);
    expect(sortedOnly).not.toContain('~[]');
    expect(sortedOnly).not.toContain('[]->over(');
    expect(windowedOrders([], [], [COUNT_OF_ORDER_ID])).not.toContain('~[]');
  });

  test('Writes even one window function in the array form, never the single form a later filter runs before', () => {
    expect(windowedOrders(['SHIP_COUNTRY'], [], [COUNT_OF_ORDER_ID])).toContain(
      `, ~[n: {p, w, r | $r.ORDER_ID} : y | $y->size()])`,
    );
    expect(
      windowedOrders(['SHIP_COUNTRY'], BY_ORDER_DATE, [RANK_FUNCTION]),
    ).toContain(`, ~[${RANK_TEXT}])`);
  });

  test.each<[AggregationFunction, string, string]>([
    [COUNT, 'SHIP_COUNTRY', 'size()'],
    [DISTINCT_COUNT, 'SHIP_COUNTRY', 'distinct()->size()'],
    [DISTINCT_VALUE, 'SHIP_COUNTRY', 'uniqueValueOnly()'],
    [SUM, 'FREIGHT', 'sum()'],
    [AVERAGE, 'ORDER_ID', 'average()'],
    [MIN, 'ORDER_DATE', 'min()'],
    [MAX, 'ORDER_DATE', 'max()'],
  ])(
    'Writes %s of %s as $y->%s, over the column read from each row of the window',
    (fn, aggregated, reduce) => {
      expect(
        windowedOrders(
          ['CUSTOMER_ID'],
          [],
          [{ column: aggregated, function: fn, name: 'n' }],
        ),
      ).toBe(
        `${ORDERS}->extend(~[CUSTOMER_ID]->over(), ~[n: {p, w, r | $r.${aggregated}} : y | $y->${reduce}])`,
      );
    },
  );

  test('Counts with size(), never with count(), which loses its OVER on the engine', () => {
    [
      COUNT_OF_ORDER_ID,
      { column: 'CUSTOMER_ID', function: DISTINCT_COUNT, name: 'n' },
      COUNT_ROWS_FUNCTION,
    ].forEach((aggregation) =>
      expect(
        windowedOrders(['SHIP_COUNTRY'], BY_ORDER_DATE, [aggregation]),
      ).not.toContain('count('),
    );
  });

  test('Counts every row as {p, w, r | 1}, Count rows reading no column', () => {
    expect(windowedOrders(['SHIP_COUNTRY'], [], [COUNT_ROWS_FUNCTION])).toBe(
      `${ORDERS}->extend(~[SHIP_COUNTRY]->over(), ~['Count Rows': {p, w, r | 1} : y | $y->size()])`,
    );
  });

  test('Averages whole numbers with average() alone, never writing 1.0 *, which the engine adds', () => {
    const text = windowedOrders(
      ['SHIP_COUNTRY'],
      [],
      [{ column: 'ORDER_ID', function: AVERAGE, name: 'n' }],
    );
    expect(text).toContain('$y->average()');
    expect(text).not.toContain('1.0');
  });

  test.each<[WindowRankFunction, string]>([
    [RANK, '$p->rank($w, $r)'],
    [DENSE_RANK, '$p->denseRank($w, $r)'],
    [ROW_NUMBER, '$p->rowNumber($r)'],
  ])('Writes %s as the number %s of each row, with no reduce', (fn, call) => {
    expect(
      windowedOrders(['SHIP_COUNTRY'], BY_ORDER_DATE, [rankFunction(fn, 'rk')]),
    ).toBe(
      `${ORDERS}->extend(${OVER_COUNTRY_BY_DATE}, ~[rk: {p, w, r | ${call}}])`,
    );
  });

  test('Writes the aggregates in one extend and the ranks in a second, each in the order listed', () => {
    expect(
      windowedOrders(['SHIP_COUNTRY'], BY_ORDER_DATE, [
        SUM_OF_FREIGHT,
        MAX_OF_ORDER_DATE,
        RANK_FUNCTION,
        rankFunction(ROW_NUMBER, 'rn'),
      ]),
    ).toBe(
      `${ORDERS}->extend(${OVER_COUNTRY_BY_DATE}, ~[${SUM_TEXT}, ${MAX_TEXT}])->extend(${OVER_COUNTRY_BY_DATE}, ~[${RANK_TEXT}, rn: {p, w, r | $p->rowNumber($r)}])`,
    );
  });

  test("Leaves out the ranks' extend when there are no ranks, and the aggregates' when there are no aggregates", () => {
    expect(
      windowedOrders(['SHIP_COUNTRY'], BY_ORDER_DATE, [
        SUM_OF_FREIGHT,
        COUNT_ROWS_FUNCTION,
      ]),
    ).toBe(
      `${ORDERS}->extend(${OVER_COUNTRY_BY_DATE}, ~[${SUM_TEXT}, 'Count Rows': {p, w, r | 1} : y | $y->size()])`,
    );
    expect(
      windowedOrders(['SHIP_COUNTRY'], BY_ORDER_DATE, [
        RANK_FUNCTION,
        rankFunction(DENSE_RANK, 'drk'),
        rankFunction(ROW_NUMBER, 'rn'),
      ]),
    ).toBe(
      `${ORDERS}->extend(${OVER_COUNTRY_BY_DATE}, ~[${RANK_TEXT}, drk: {p, w, r | $p->denseRank($w, $r)}, rn: {p, w, r | $p->rowNumber($r)}])`,
    );
  });

  test('Selects every column in the order listed when a rank is listed before an aggregate', () => {
    expect(
      windowedOrders(['SHIP_COUNTRY'], BY_ORDER_DATE, [
        SUM_OF_FREIGHT,
        RANK_FUNCTION,
        MAX_OF_ORDER_DATE,
      ]),
    ).toBe(
      `${ORDERS}->extend(${OVER_COUNTRY_BY_DATE}, ~[${SUM_TEXT}, ${MAX_TEXT}])->extend(${OVER_COUNTRY_BY_DATE}, ~[${RANK_TEXT}])->select(~[${INPUT}, s, rk, mx])`,
    );
    expect(
      windowedOrders(['SHIP_COUNTRY'], BY_ORDER_DATE, [
        RANK_FUNCTION,
        SUM_OF_FREIGHT,
      ]),
    ).toBe(
      `${ORDERS}->extend(${OVER_COUNTRY_BY_DATE}, ~[${SUM_TEXT}])->extend(${OVER_COUNTRY_BY_DATE}, ~[${RANK_TEXT}])->select(~[${INPUT}, rk, s])`,
    );
  });

  test('Selects nothing when the window functions come out in the order listed', () => {
    [
      [SUM_OF_FREIGHT, MAX_OF_ORDER_DATE, RANK_FUNCTION],
      [SUM_OF_FREIGHT, MAX_OF_ORDER_DATE],
      [RANK_FUNCTION, rankFunction(ROW_NUMBER, 'rn')],
    ].forEach((aggregations) =>
      expect(
        windowedOrders(['SHIP_COUNTRY'], BY_ORDER_DATE, aggregations),
      ).not.toContain('select'),
    );
  });

  test('Writes NTile, Percent Rank, Cumulative Distribution, Lag, Lead and First beside the ranks, and Last as First over the reversed sort, in a third extend', () => {
    const bothWays: readonly ColumnDirection[] = [
      { column: 'ORDER_DATE', direction: SortDirection.ASC },
      { column: 'ORDER_ID', direction: SortDirection.DESC },
    ];
    expect(
      windowedOrders(['SHIP_COUNTRY'], bothWays, [
        SUM_OF_FREIGHT,
        RANK_FUNCTION,
        { ...rankFunction(WindowRankFunction.NTILE, 'nt'), buckets: 4 },
        rankFunction(WindowRankFunction.PERCENT_RANK, 'pr'),
        rankFunction(WindowRankFunction.CUMULATIVE_DISTRIBUTION, 'cd'),
        {
          column: 'FREIGHT',
          function: WindowRowFunction.LAG,
          name: 'prev',
          offset: 1,
        },
        {
          column: 'ORDER_DATE',
          function: WindowRowFunction.LEAD,
          name: 'next2',
          offset: 2,
        },
        { column: 'FREIGHT', function: WindowRowFunction.FIRST, name: 'f' },
        { column: 'CUSTOMER_ID', function: WindowRowFunction.LAST, name: 'l' },
      ]),
    ).toBe(
      `${ORDERS}->extend(~[SHIP_COUNTRY]->over([~ORDER_DATE->ascending(), ~ORDER_ID->descending()]), ~[${SUM_TEXT}])` +
        `->extend(~[SHIP_COUNTRY]->over([~ORDER_DATE->ascending(), ~ORDER_ID->descending()]), ~[${RANK_TEXT}, nt: {p, w, r | $p->ntile($r, 4)}, pr: {p, w, r | $p->percentRank($w, $r)}, cd: {p, w, r | $p->cumulativeDistribution($w, $r)}, prev: {p, w, r | $p->lag($r, 1).FREIGHT}, next2: {p, w, r | $p->lead($r, 2).ORDER_DATE}, f: {p, w, r | $p->first($w, $r).FREIGHT}])` +
        `->extend(~[SHIP_COUNTRY]->over([~ORDER_DATE->descending(), ~ORDER_ID->ascending()]), ~[l: {p, w, r | $p->first($w, $r).CUSTOMER_ID}])`,
    );
  });

  test('Writes Last over the reversed sort with no partition column too, and selects the order listed when it comes first', () => {
    const last: ColumnAggregation = {
      column: 'FREIGHT',
      function: WindowRowFunction.LAST,
      name: 'l',
    };
    expect(windowedOrders([], BY_ORDER_DATE, [last])).toBe(
      `${ORDERS}->extend([~ORDER_DATE->descending()]->over(), ~[l: {p, w, r | $p->first($w, $r).FREIGHT}])`,
    );
    expect(
      windowedOrders(['SHIP_COUNTRY'], BY_ORDER_DATE, [last, SUM_OF_FREIGHT]),
    ).toBe(
      `${ORDERS}->extend(${OVER_COUNTRY_BY_DATE}, ~[${SUM_TEXT}])->extend(~[SHIP_COUNTRY]->over([~ORDER_DATE->descending()]), ~[l: {p, w, r | $p->first($w, $r).FREIGHT}])->select(~[${INPUT}, l, s])`,
    );
  });

  test('Refuses to emit a Lag without a whole offset, or an NTile without a bucket count', () => {
    expect(() =>
      emitterOf(
        ordersThen(
          partition(['SHIP_COUNTRY'], BY_ORDER_DATE, [
            { column: 'FREIGHT', function: WindowRowFunction.LAG, name: 'p' },
          ]),
        ),
      ).emitRelation('partition101'),
    ).toThrow();
    const query = ordersThen(
      partition(['SHIP_COUNTRY'], BY_ORDER_DATE, [
        { ...rankFunction(WindowRankFunction.NTILE, 'nt'), buckets: 4 },
      ]),
    );
    const node = query.getNode('partition101') as Partition;
    expect(() =>
      emitPartition(
        node.withAggregations([rankFunction(WindowRankFunction.NTILE, 'nt')]),
        [ACCESSOR],
        {
          inputSchemas: [new Schema(COLUMNS)],
          schema: new Schema([...COLUMNS, column('nt')]),
        } as never,
      ),
    ).toThrow(
      `Can't emit window function "nt": its setting isn't a whole number of at least 1`,
    );
  });

  test('Marks the extend, its window and sort keys as the window, and each column read, 1 and reduce as an aggregation of it', () => {
    const relation = emitterOf(
      ordersThen(
        partition(
          ['SHIP_COUNTRY'],
          [{ column: 'ORDER_DATE', direction: SortDirection.DESC }],
          [
            COUNT_OF_ORDER_ID,
            { column: 'CUSTOMER_ID', function: DISTINCT_COUNT, name: 'm' },
            COUNT_ROWS_FUNCTION,
          ],
        ),
      ),
    ).emitRelation('partition101');
    expect(listOrigins(relation)).toEqual([
      'extend@partition101:window',
      `${ORDERS}@relational101:accessor`,
      // ~[SHIP_COUNTRY]->over([~ORDER_DATE->descending()])
      'over@partition101:window',
      'descending@partition101:window',
      // n: {p, w, r | $r.ORDER_ID} : y | $y->size()
      '.ORDER_ID@partition101:aggregation',
      'size@partition101:aggregation',
      // m: {p, w, r | $r.CUSTOMER_ID} : y | $y->distinct()->size()
      '.CUSTOMER_ID@partition101:aggregation',
      'size@partition101:aggregation',
      'distinct@partition101:aggregation',
      // 'Count Rows': {p, w, r | 1} : y | $y->size()
      '1@partition101:aggregation',
      'size@partition101:aggregation',
    ]);
  });

  test("Marks both extends and their windows as the window, each rank call as an aggregation, and the select as the Partition's select", () => {
    const relation = emitterOf(
      ordersThen(
        partition(['SHIP_COUNTRY'], BY_ORDER_DATE, [
          SUM_OF_FREIGHT,
          RANK_FUNCTION,
          MAX_OF_ORDER_DATE,
          rankFunction(DENSE_RANK, 'drk'),
          rankFunction(ROW_NUMBER, 'rn'),
        ]),
      ),
    ).emitRelation('partition101');
    expect(listOrigins(relation)).toEqual([
      'select@partition101:select',
      // the ranks' extend, reading the aggregates'
      'extend@partition101:window',
      'extend@partition101:window',
      `${ORDERS}@relational101:accessor`,
      'over@partition101:window',
      'ascending@partition101:window',
      '.FREIGHT@partition101:aggregation',
      'sum@partition101:aggregation',
      '.ORDER_DATE@partition101:aggregation',
      'max@partition101:aggregation',
      'over@partition101:window',
      'ascending@partition101:window',
      'rank@partition101:aggregation',
      'denseRank@partition101:aggregation',
      'rowNumber@partition101:aggregation',
    ]);
  });

  test.each<[string, Schema, string]>([
    [
      'its input',
      new Schema(COLUMNS),
      `Partition "partition101" would produce ${INPUT}, n, but its schema is ${INPUT}`,
    ],
    [
      'the same names in another order',
      new Schema([column('n'), ...COLUMNS]),
      `Partition "partition101" would produce ${INPUT}, n, but its schema is n, ${INPUT}`,
    ],
    [
      'the names and a column more',
      new Schema([...COLUMNS, column('n'), column('m')]),
      `Partition "partition101" would produce ${INPUT}, n, but its schema is ${INPUT}, n, m`,
    ],
  ])(
    "Refuses to emit names that don't come out as the node's schema: %s",
    (_, schema, message) => {
      expect(() =>
        emitPartition(
          partition(['SHIP_COUNTRY'], [], [COUNT_OF_ORDER_ID]),
          [ACCESSOR],
          { inputSchemas: [new Schema(COLUMNS)], schema },
        ),
      ).toThrow(message);
    },
  );

  test("Refuses a schema with the window functions in the extends' order, not the order listed", () => {
    expect(() =>
      emitPartition(
        partition(['SHIP_COUNTRY'], BY_ORDER_DATE, [
          SUM_OF_FREIGHT,
          RANK_FUNCTION,
          MAX_OF_ORDER_DATE,
        ]),
        [ACCESSOR],
        {
          inputSchemas: [new Schema(COLUMNS)],
          schema: new Schema([
            ...COLUMNS,
            column('s', 'Float', true),
            column('mx', 'StrictDate', true),
            column('rk'),
          ]),
        },
      ),
    ).toThrow(
      `Partition "partition101" would produce ${INPUT}, s, rk, mx, but its schema is ${INPUT}, s, mx, rk`,
    );
  });

  test('Refuses to emit a Partition without an input', () => {
    expect(() =>
      emitPartition(partition(['SHIP_COUNTRY'], [], [COUNT_OF_ORDER_ID]), [], {
        inputSchemas: [],
        schema: new Schema([...COLUMNS, column('n')]),
      }),
    ).toThrow(`Can't emit partition "partition101": it needs one input`);
  });

  test('Refuses to emit a Partition without a window function, whatever its schema', () => {
    expect(() =>
      emitPartition(partition(['SHIP_COUNTRY'], [], []), [ACCESSOR], {
        inputSchemas: [new Schema(COLUMNS)],
        schema: new Schema(COLUMNS),
      }),
    ).toThrow(`Can't emit partition "partition101": it has no window function`);
  });

  test('Refuses to emit a column function without a column, never counting rows in its place', () => {
    [undefined, ''].forEach((missing) =>
      expect(() =>
        emitPartition(
          partition(
            ['SHIP_COUNTRY'],
            [],
            [{ column: missing, function: SUM, name: 'n' }],
          ),
          [ACCESSOR],
          {
            inputSchemas: [new Schema(COLUMNS)],
            schema: new Schema([...COLUMNS, column('n')]),
          },
        ),
      ).toThrow(
        `Can't emit window function "n" of partition "partition101": it has no column`,
      ),
    );
  });

  test('Counts every row for Count rows, even holding a column, which validation refuses', () => {
    expect(
      printIR(
        emitPartition(
          partition(
            ['SHIP_COUNTRY'],
            [],
            [{ column: 'ORDER_ID', function: COUNT_ROWS, name: 'n' }],
          ),
          [ACCESSOR],
          {
            inputSchemas: [new Schema(COLUMNS)],
            schema: new Schema([...COLUMNS, column('n')]),
          },
        ),
      ),
    ).toContain(`~[n: {p, w, r | 1} : y | $y->size()]`);
  });

  test.each<[string, Partition, string]>([
    [
      'without a window function',
      partition(['SHIP_COUNTRY'], BY_ORDER_DATE, []),
      'Aggregations cannot be empty.',
    ],
    [
      'with a rank and no sort key',
      partition(['SHIP_COUNTRY'], [], [RANK_FUNCTION]),
      'Aggregation function "Rank" requires at least one sort column.',
    ],
  ])(
    "Doesn't emit a Partition %s, which validation doesn't let through",
    (_, node, error) => {
      const emitter = emitterOf(ordersThen(node));
      expect(emitter.canEmit('partition101')).toBe(false);
      expect(() => emitter.emitRelation('partition101')).toThrow(
        `Can't emit node "partition101": it is invalid (${error})`,
      );
    },
  );
});

describe(unitTest('Partition emission: window isolation'), () => {
  test('Binds no let for a Partition at the capture', () => {
    expect(run(ordersThen(rankedByDate()))).toBe(
      `{| ${RANKED_BY_DATE}->limit(1001)->from(${RUNTIME})}`,
    );
  });

  test('Binds a Partition a Filter follows with a let, then runs the block from the runtime and limits it', () => {
    expect(run(ordersThen(rankedByDate(), topThree()))).toBe(
      `{| {| let n_partition101 = ${RANKED_BY_DATE}; $n_partition101${TOP_THREE};}->from(${RUNTIME})->limit(1001)}`,
    );
  });

  test('Marks the let with the Partition it binds', () => {
    const origins = listOrigins(
      emitterOf(ordersThen(rankedByDate(), topThree())).emitExecutionLambda({
        rowLimit: 1000,
        runtime: RUNTIME,
      }),
    );
    expect(origins).toContain('let n_partition101@partition101:let');
    expect(origins).toContain('extend@partition101:window');
  });

  test("Sorts by the order of a Sort before a captured Partition, which keeps its input's order", () => {
    const byIdDescending = new Sort('sort101', [
      { column: 'ORDER_ID', direction: SortDirection.DESC },
    ]);
    expect(run(ordersThen(byIdDescending, rankedByDate()))).toBe(
      `{| ${RANKED_BY_DATE}->sort(~ORDER_ID->descending())->limit(1001)->from(${RUNTIME})}`,
    );
  });

  test('Sorts by the order of a Sort before a bound Partition after the runtime, outside the block', () => {
    const byIdDescending = new Sort('sort101', [
      { column: 'ORDER_ID', direction: SortDirection.DESC },
    ]);
    expect(run(ordersThen(byIdDescending, rankedByDate(), topThree()))).toBe(
      `{| {| let n_partition101 = ${RANKED_BY_DATE}; $n_partition101${TOP_THREE};}->from(${RUNTIME})->sort(~ORDER_ID->descending())->limit(1001)}`,
    );
  });

  test('Never binds a Partition to type the node after it', () => {
    const text = printIR(
      emitterOf(ordersThen(rankedByDate(), topThree())).emitTypingLambda(
        'filter101',
      ),
    );
    expect(text).toBe(`{| ${RANKED_BY_DATE}${TOP_THREE}}`);
    expect(text).not.toContain('let');
  });

  test('Binds a Partition a captured Sort follows, and reads it alone as the block, sorted outside it', () => {
    expect(
      run(
        ordersThen(
          rankedByDate(),
          new Sort('sort101', [
            { column: 'rk', direction: SortDirection.DESC },
          ]),
        ),
      ),
    ).toBe(
      `{| {| let n_partition101 = ${RANKED_BY_DATE}; $n_partition101;}->from(${RUNTIME})->sort(~rk->descending())->limit(1001)}`,
    );
  });

  test('Binds a Partition of a Partition after the Partition it reads', () => {
    const highest = new Partition(
      'partition102',
      ['SHIP_COUNTRY'],
      [],
      [{ column: 'rk', function: AggregationFunction.MAX, name: 'mxrk' }],
    );
    expect(run(ordersThen(rankedByDate(), highest, topThree()))).toBe(
      `{| {| let n_partition101 = ${RANKED_BY_DATE}; let n_partition102 = $n_partition101->extend(~[SHIP_COUNTRY]->over(), ~[mxrk: {p, w, r | $r.rk} : y | $y->max()]); $n_partition102${TOP_THREE};}->from(${RUNTIME})->limit(1001)}`,
    );
  });
});
