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

import { beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import {
  AggregationFunction,
  type ColumnAggregation,
  ColumnComparisonFilter,
  Concat,
  Connection,
  CubeDocument,
  Distinct,
  Drop,
  buildSchemasAndValidity,
  canRenameConcatInput,
  createNodeRegistry,
  Filter,
  FilterOperator,
  getAvailableAggregations,
  Group,
  NotFilter,
  fixJoinDuplicates,
  Join,
  JoinType,
  Limit,
  printIR,
  Query,
  type QueryNode,
  QueryEmitter,
  type RelationalTableSource,
  Rename,
  renameConcatInput,
  Restrict,
  Slice,
  Sort,
  SortDirection,
  Partition,
  WindowRankFunction,
  CompositeFilter,
  CompositeFilterOperator,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { parseLosslessJSON, stringifyLosslessJSON } from '@finos/legend-shared';
import {
  CUBE_ENGINE_TEST__getCommit,
  CUBE_ENGINE_TEST__grammarToJson_lambda,
} from '../__test-utils__/CubeEngineTestSupport.js';
import { TEST__createCubeApplicationStore } from '../__test-utils__/CubeTestApplication.js';
import {
  TEST__chainOf,
  TEST__columnValues,
  TEST__expectEngineTyping,
  TEST__inferredSchema,
  TEST__northwindTable,
  TEST__resolveSources,
  TEST__runQuery,
} from '../__test-utils__/CubeOperationsTestUtils.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import { V1_serializeCubeLambda } from '../graph-manager/protocol/pure/v1/V1_CubeLambdaSerializer.js';
import type { V1_LegendCubeEngine } from '../graph-manager/protocol/pure/v1/V1_LegendCubeEngine.js';
import { CubeEditorState } from '../stores/CubeEditorState.js';
import { getCubeGridQuickActions } from '../stores/CubeGridQuickActions.js';
import {
  CUBE_NORTHWIND_MODEL,
  CUBE_NORTHWIND_RUNTIME,
} from '../stores/fixtures/CubeNorthwindModel.js';
import { LocalModelCatalog } from '../stores/LocalModelCatalog.js';

// M2's operations on the engine (PLAN §11.4), on the Cube Northwind fixture.
// Rows come back in H2's order unless a Sort reaches the node that runs, so
// results are compared as counts and sets. ORDERS has 830 orders, ORDER_ID
// 10248 to 11077 with no gap. H2 scans ORDERS in ascending ORDER_ID order, so
// the Sort tests sort descending: without the sort, they fail.

const ROW_LIMIT = 10000;

let engine: V1_LegendCubeEngine;

beforeAll(async () => {
  const commit = await CUBE_ENGINE_TEST__getCommit();
  process.stdout.write(`Legend Cube operations: engine commit ${commit}\n`);
});

// spies are restored after each test; the row limit is kept per user
beforeEach(() => {
  ({ engine } = V1_createEngineBackedCubeEngine());
  localStorage.clear();
});

const orders = async (): Promise<RelationalTableSource> => {
  const [resolved] = await TEST__resolveSources(engine, [
    TEST__northwindTable('relational101', 'ORDERS'),
  ]);
  return resolved as RelationalTableSource;
};

/** ORDERS, then the given nodes, captured at the last */
const ordersThen = async (...nodes: QueryNode[]): Promise<Query> =>
  TEST__chainOf([await orders(), ...nodes]);

const orderIds = (values: readonly unknown[]): number[] =>
  values.map((value) => Number(value));

/** ORDERS and CUSTOMERS, resolved */
const ordersAndCustomers = async (): Promise<
  [RelationalTableSource, RelationalTableSource]
> =>
  (await TEST__resolveSources(engine, [
    TEST__northwindTable('relational101', 'ORDERS'),
    TEST__northwindTable('relational102', 'CUSTOMERS'),
  ])) as [RelationalTableSource, RelationalTableSource];

/** A join on CUSTOMER_ID of the two nodes, each given with what feeds it */
const joinOn = (
  left: QueryNode[],
  right: QueryNode[],
  joinType: JoinType,
): Query => {
  const join = new Join('join101', {
    leftColumns: ['CUSTOMER_ID'],
    rightColumns: ['CUSTOMER_ID'],
    joinType,
  });
  const chain = (nodes: QueryNode[]): Connection[] =>
    nodes
      .slice(1)
      .map(
        (node, index) =>
          new Connection((nodes[index] as QueryNode).id, node.id, 'tds'),
      );
  return new Query(
    [...left, ...right, join],
    [
      ...chain(left),
      ...chain(right),
      new Connection((left.at(-1) as QueryNode).id, 'join101', 'leftTds'),
      new Connection((right.at(-1) as QueryNode).id, 'join101', 'rightTds'),
    ],
    'join101',
  );
};

/** The execution lambda as protocol JSON, without the source information Cube stamps */
const emittedJson = (
  query: Query,
  rowLimit = ROW_LIMIT,
  databaseType?: string,
): unknown =>
  parseLosslessJSON(
    stringifyLosslessJSON(
      V1_serializeCubeLambda(
        new QueryEmitter(query).emitExecutionLambda({
          rowLimit,
          runtime: CUBE_NORTHWIND_RUNTIME,
          databaseType,
        }),
      ),
      (key: string, value: unknown) =>
        key === 'sourceInformation' ? undefined : value,
    ),
  );

describe('Limit on the engine', () => {
  test('Emits what the engine parses from the printed Pure, and types as Cube infers', async () => {
    const query = await ordersThen(new Limit('limit101', 5));
    const lambda = new QueryEmitter(query).emitExecutionLambda({
      rowLimit: ROW_LIMIT,
      runtime: CUBE_NORTHWIND_RUNTIME,
    });
    expect(emittedJson(query)).toEqual(
      await CUBE_ENGINE_TEST__grammarToJson_lambda(printIR(lambda)),
    );
    await TEST__expectEngineTyping(engine, query);
  });

  test('Takes 5 of the 830 orders', async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(new Limit('limit101', 5)),
      ROW_LIMIT,
    );
    const ids = orderIds(TEST__columnValues(result, 'ORDER_ID'));
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    ids.forEach((id) => {
      expect(id).toBeGreaterThanOrEqual(10248);
      expect(id).toBeLessThanOrEqual(11077);
    });
  });

  test('Takes every row when the size is larger than the input', async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(new Limit('limit101', 1000)),
      ROW_LIMIT,
    );
    expect(result.rows).toHaveLength(830);
  });

  test('Fetches one row past the row limit, and no more than the Limit gives', async () => {
    // 10 rows under a row limit of 10: the run fetches 11 and gets 10, so nothing is cut off
    const exact = await TEST__runQuery(
      engine,
      await ordersThen(new Limit('limit101', 10)),
      10,
    );
    expect(exact.rows).toHaveLength(10);
    // 5 rows under a row limit of 3: the run gets one more than it shows, so it is cut off
    const cut = await TEST__runQuery(
      engine,
      await ordersThen(new Limit('limit101', 5)),
      3,
    );
    expect(cut.rows).toHaveLength(4);
  });

  test('Takes its rows from the rows a filter keeps', async () => {
    const query = await ordersThen(
      new Filter(
        'filter101',
        new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
          kind: 'string',
          value: 'France',
        }),
      ),
      new Limit('limit101', 5),
    );
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(TEST__columnValues(result, 'SHIP_COUNTRY')).toEqual(
      Array(5).fill('France'),
    );
  });
});

describe('Limit inside a query, on the engine', () => {
  test('Limits one side of a join, and a left join still keeps every order', async () => {
    const [ordersTable, customersTable] = await ordersAndCustomers();
    const query = joinOn(
      [ordersTable],
      [customersTable, new Limit('limit101', 5)],
      JoinType.LEFT_OUTER,
    );
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    const ids = orderIds(TEST__columnValues(result, 'ORDER_ID'));
    expect(ids).toHaveLength(830);
    expect(new Set(ids).size).toBe(830);
  });

  test('Joins only the rows a Limit takes', async () => {
    const [ordersTable, customersTable] = await ordersAndCustomers();
    const query = joinOn(
      [ordersTable, new Limit('limit101', 5)],
      [customersTable],
      JoinType.INNER,
    );
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    const ids = orderIds(TEST__columnValues(result, 'ORDER_ID'));
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });

  test('Filters only the rows a Limit takes', async () => {
    const query = await ordersThen(
      new Limit('limit101', 5),
      new Filter(
        'filter101',
        new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
          kind: 'string',
          value: 'France',
        }),
      ),
    );
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    const countries = TEST__columnValues(result, 'SHIP_COUNTRY');
    expect(countries.length).toBeLessThanOrEqual(5);
    countries.forEach((country) => expect(country).toBe('France'));
  });
});

describe('Limit in the editor, on the engine', () => {
  /** The page's state on the engine, running ORDERS → Limit of this size */
  const editorOf = async (size: number): Promise<CubeEditorState> => {
    const state = new CubeEditorState({
      applicationStore: TEST__createCubeApplicationStore(),
      engine,
      modelCatalog: new LocalModelCatalog(engine),
    });
    state.applyDocument(
      new CubeDocument({
        context: {
          model: CUBE_NORTHWIND_MODEL,
          runtime: CUBE_NORTHWIND_RUNTIME,
        },
        query: await ordersThen(new Limit('limit101', size)),
      }),
    );
    return state;
  };

  test("Shows a Limit's rows in full when they fit the row limit", async () => {
    const state = await editorOf(10);
    state.setRowLimit(10);
    await flowResult(state.execution.execute());
    expect(state.execution.error).toBeUndefined();
    expect(state.execution.result?.rows).toHaveLength(10);
    expect(state.execution.result?.limited).toBe(false);
  });

  test("Cuts a Limit's rows at the row limit, and says so", async () => {
    const state = await editorOf(5);
    state.setRowLimit(3);
    await flowResult(state.execution.execute());
    expect(state.execution.error).toBeUndefined();
    expect(state.execution.result?.rows).toHaveLength(3);
    expect(state.execution.result?.limited).toBe(true);
  });
});

describe('Grid quick actions, on the engine', () => {
  /** The page's state on the engine, having run ORDERS (no row limit cut) */
  const ranOrders = async (): Promise<CubeEditorState> => {
    const state = new CubeEditorState({
      applicationStore: TEST__createCubeApplicationStore(),
      engine,
      modelCatalog: new LocalModelCatalog(engine),
    });
    state.applyDocument(
      new CubeDocument({
        context: {
          model: CUBE_NORTHWIND_MODEL,
          runtime: CUBE_NORTHWIND_RUNTIME,
        },
        query: await ordersThen(),
      }),
    );
    state.setRowLimit(ROW_LIMIT);
    await flowResult(state.execution.execute());
    expect(state.execution.error).toBeUndefined();
    return state;
  };

  /** The shown values of a column */
  const shownValues = (state: CubeEditorState, column: string): unknown[] => {
    const result = state.execution.result;
    const position = result?.schema.names().indexOf(column) ?? -1;
    expect(position).toBeGreaterThanOrEqual(0);
    return (result?.rows ?? []).map((row) => row[position]);
  };

  /** Applies a quick action on the first shown row whose cell in the column matches, then runs again */
  const applyAndRun = async (
    state: CubeEditorState,
    column: string,
    index: 0 | 1 | 2,
    matches: (cell: unknown) => boolean,
  ): Promise<void> => {
    const result = state.execution.result;
    const position = result?.schema.names().indexOf(column) ?? -1;
    const row = result?.rows.find((candidate) => matches(candidate[position]));
    expect(row).toBeDefined();
    const action = getCubeGridQuickActions(
      state,
      position,
      row?.[position] ?? null,
    )[index];
    expect(action?.disabledReason).toBeUndefined();
    action?.apply();
    expect(state.execution.isStale).toBe(true);
    await flowResult(state.execution.execute());
    expect(state.execution.error).toBeUndefined();
  };

  test('Sorts by the clicked column: the rows come back ordered by it', async () => {
    const state = await ranOrders();
    // H2 gives ORDERS in ORDER_ID order, which isn't CUSTOMER_ID order
    await applyAndRun(state, 'CUSTOMER_ID', 0, () => true);
    const customers = shownValues(state, 'CUSTOMER_ID').filter(
      (value): value is string => typeof value === 'string',
    );
    expect(customers.length).toBeGreaterThan(800);
    expect(customers).toEqual([...customers].sort());
  });

  test("Filters on the clicked cell's value: the 77 French orders", async () => {
    const state = await ranOrders();
    await applyAndRun(state, 'SHIP_COUNTRY', 2, (cell) => cell === 'France');
    const countries = shownValues(state, 'SHIP_COUNTRY');
    expect(countries).toHaveLength(77);
    expect(new Set(countries)).toEqual(new Set(['France']));
  });

  test('Filters on a null cell with Is Empty: the 507 orders with no ship region', async () => {
    const state = await ranOrders();
    await applyAndRun(state, 'SHIP_REGION', 2, (cell) => cell === null);
    const regions = shownValues(state, 'SHIP_REGION');
    expect(regions).toHaveLength(507);
    expect(new Set(regions)).toEqual(new Set([null]));
  });
  test('Groups by the clicked column: one row per country, counting the 830 orders', async () => {
    const state = await ranOrders();
    await applyAndRun(state, 'SHIP_COUNTRY', 1, () => true);
    expect(state.execution.result?.schema.names()).toEqual([
      'SHIP_COUNTRY',
      'Count Rows',
    ]);
    expect(shownValues(state, 'SHIP_COUNTRY')).toHaveLength(21);
    expect(
      shownValues(state, 'Count Rows').reduce<number>(
        (total, count) => total + Number(count),
        0,
      ),
    ).toBe(830);
  });
});

describe('Drop on the engine', () => {
  test('Emits what the engine parses from the printed Pure, and types as Cube infers', async () => {
    const query = await ordersThen(new Drop('drop101', 10));
    const lambda = new QueryEmitter(query).emitExecutionLambda({
      rowLimit: ROW_LIMIT,
      runtime: CUBE_NORTHWIND_RUNTIME,
    });
    expect(emittedJson(query)).toEqual(
      await CUBE_ENGINE_TEST__grammarToJson_lambda(printIR(lambda)),
    );
    await TEST__expectEngineTyping(engine, query);
  });

  test('Drops 825 of the 830 orders, and keeps 5 distinct ones', async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(new Drop('drop101', 825)),
      ROW_LIMIT,
    );
    const ids = orderIds(TEST__columnValues(result, 'ORDER_ID'));
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });

  test("Drops every row when the size is the input's, and gives an empty result", async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(new Drop('drop101', 830)),
      ROW_LIMIT,
    );
    expect(result.rows).toEqual([]);
    expect(result.columns).toContain('ORDER_ID');
  });

  test('Drops from the rows a filter keeps (77 French orders)', async () => {
    const query = await ordersThen(
      new Filter(
        'filter101',
        new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
          kind: 'string',
          value: 'France',
        }),
      ),
      new Drop('drop101', 70),
    );
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(TEST__columnValues(result, 'SHIP_COUNTRY')).toEqual(
      Array(7).fill('France'),
    );
  });
});

describe('Slice on the engine', () => {
  test('Emits what the engine parses from the printed Pure, and types as Cube infers', async () => {
    const query = await ordersThen(new Slice('slice101', 10, 15));
    const lambda = new QueryEmitter(query).emitExecutionLambda({
      rowLimit: ROW_LIMIT,
      runtime: CUBE_NORTHWIND_RUNTIME,
    });
    expect(emittedJson(query)).toEqual(
      await CUBE_ENGINE_TEST__grammarToJson_lambda(printIR(lambda)),
    );
    await TEST__expectEngineTyping(engine, query);
  });

  test('Takes the rows from the start up to, not including, the stop', async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(new Slice('slice101', 10, 15)),
      ROW_LIMIT,
    );
    const ids = orderIds(TEST__columnValues(result, 'ORDER_ID'));
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });

  test('Takes only the rows there are past the end of its input', async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(new Slice('slice101', 825, 840)),
      ROW_LIMIT,
    );
    expect(result.rows).toHaveLength(5);
  });

  test('Takes its rows from the rows a filter keeps (77 French orders)', async () => {
    const query = await ordersThen(
      new Filter(
        'filter101',
        new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
          kind: 'string',
          value: 'France',
        }),
      ),
      new Slice('slice101', 70, 80),
    );
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(TEST__columnValues(result, 'SHIP_COUNTRY')).toEqual(
      Array(7).fill('France'),
    );
  });
});

const { ASC, DESC } = SortDirection;

/** A Sort on ORDER_ID, descending */
const byOrderIdDesc = (id = 'sort101'): Sort =>
  new Sort(id, [{ column: 'ORDER_ID', direction: DESC }]);

const frenchOrders = (): Filter =>
  new Filter(
    'filter101',
    new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
      kind: 'string',
      value: 'France',
    }),
  );

/** The numbers from `from` down to `to` */
const countDown = (from: number, to: number): number[] =>
  Array.from({ length: from - to + 1 }, (_, index) => from - index);

describe('Sort on the engine', () => {
  test('Gets ORDERS in ascending ORDER_ID order without a Sort, so these tests sort descending', async () => {
    // the control: were the sort not written, the tests below would get these rows
    const result = await TEST__runQuery(
      engine,
      await ordersThen(new Limit('limit101', 5)),
      ROW_LIMIT,
    );
    expect(orderIds(TEST__columnValues(result, 'ORDER_ID'))).toEqual(
      countDown(10252, 10248).reverse(),
    );
  });

  test.each<[string, Sort]>([
    ['one key', byOrderIdDesc()],
    [
      'two keys',
      new Sort('sort101', [
        { column: 'SHIP_COUNTRY', direction: DESC },
        { column: 'ORDER_ID', direction: ASC },
      ]),
    ],
  ])(
    'Emits what the engine parses from the printed Pure with %s, and types as Cube infers',
    async (_, sort) => {
      for (const query of [
        await ordersThen(sort),
        await ordersThen(sort, new Limit('limit101', 5)),
      ]) {
        const lambda = new QueryEmitter(query).emitExecutionLambda({
          rowLimit: ROW_LIMIT,
          runtime: CUBE_NORTHWIND_RUNTIME,
        });
        expect(emittedJson(query)).toEqual(
          await CUBE_ENGINE_TEST__grammarToJson_lambda(printIR(lambda)),
        );
        await TEST__expectEngineTyping(engine, query);
      }
    },
  );

  test('Shows the rows in the order of a Sort that reaches the run, cut at the row limit', async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(byOrderIdDesc()),
      5,
    );
    // one more row than the row limit, the sixth in order too
    expect(orderIds(TEST__columnValues(result, 'ORDER_ID'))).toEqual(
      countDown(11077, 11072),
    );
  });

  test("Takes the first rows by a Sort's order", async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(byOrderIdDesc(), new Limit('limit101', 5)),
      ROW_LIMIT,
    );
    expect(orderIds(TEST__columnValues(result, 'ORDER_ID'))).toEqual(
      countDown(11077, 11073),
    );
  });

  test("Drops the first rows by a Sort's order", async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(byOrderIdDesc(), new Drop('drop101', 825)),
      ROW_LIMIT,
    );
    expect(orderIds(TEST__columnValues(result, 'ORDER_ID'))).toEqual(
      countDown(10252, 10248),
    );
  });

  test("Takes a range of rows by a Sort's order", async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(byOrderIdDesc(), new Slice('slice101', 10, 15)),
      ROW_LIMIT,
    );
    expect(orderIds(TEST__columnValues(result, 'ORDER_ID'))).toEqual(
      countDown(11067, 11063),
    );
  });

  test('Sorts by a renamed key under its new name, through a filter', async () => {
    const french = orderIds(
      TEST__columnValues(
        await TEST__runQuery(
          engine,
          await ordersThen(frenchOrders()),
          ROW_LIMIT,
        ),
        'ORDER_ID',
      ),
    );
    expect(french).toHaveLength(77);
    const query = await ordersThen(
      byOrderIdDesc(),
      new Rename('rename101', [{ from: 'ORDER_ID', to: 'Order Id' }]),
      frenchOrders(),
      new Limit('limit101', 3),
    );
    expect(
      printIR(
        new QueryEmitter(query).emitRelation('limit101', {
          withRowOrder: true,
        }),
      ),
    ).toContain(`->sort(~'Order Id'->descending())->limit(3)`);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(orderIds(TEST__columnValues(result, 'Order Id'))).toEqual(
      [...french].sort((a, b) => b - a).slice(0, 3),
    );
  });

  test("Puts the later Sort's keys first, then the earlier's", async () => {
    const venezuelan = orderIds(
      TEST__columnValues(
        await TEST__runQuery(
          engine,
          await ordersThen(
            new Filter(
              'filter101',
              new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
                kind: 'string',
                value: 'Venezuela',
              }),
            ),
          ),
          ROW_LIMIT,
        ),
        'ORDER_ID',
      ),
    );
    const query = await ordersThen(
      byOrderIdDesc(),
      new Sort('sort102', [{ column: 'SHIP_COUNTRY', direction: DESC }]),
      new Limit('limit101', 5),
    );
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    // Venezuela is the last country, and its orders come by ORDER_ID descending
    expect(TEST__columnValues(result, 'SHIP_COUNTRY')).toEqual(
      Array(5).fill('Venezuela'),
    );
    expect(orderIds(TEST__columnValues(result, 'ORDER_ID'))).toEqual(
      [...venezuelan].sort((a, b) => b - a).slice(0, 5),
    );
  });

  test('Writes no sort once a Restrict drops the key, and still runs', async () => {
    const query = await ordersThen(
      byOrderIdDesc(),
      new Restrict('restrict101', ['SHIP_COUNTRY']),
      new Limit('limit101', 5),
    );
    const lambda = new QueryEmitter(query).emitExecutionLambda({
      rowLimit: ROW_LIMIT,
      runtime: CUBE_NORTHWIND_RUNTIME,
    });
    expect(printIR(lambda)).not.toContain('sort(');
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(result.rows).toHaveLength(5);
  });
});

// SQL Server's workarounds (PLAN §11.4), written for SqlServer but run on the
// fixture's H2, which takes both forms: their rows must be the native forms'.
// Sorted descending, so rows numbered in H2's scan order would fail.
const SQL_SERVER = 'SqlServer';

describe('Database workarounds, run on H2', () => {
  test.each<[string, QueryNode[]]>([
    ['a Drop', [byOrderIdDesc(), new Drop('drop101', 825)]],
    ['a Slice', [byOrderIdDesc(), new Slice('slice101', 10, 15)]],
    ['a Slice with no Sort', [new Slice('slice101', 10, 15)]],
    [
      'a Distinct',
      [
        new Restrict('restrict101', ['SHIP_COUNTRY']),
        new Distinct('distinct101'),
      ],
    ],
  ])(
    'Emits what the engine parses from the printed Pure for %s, and types as Cube infers',
    async (_, nodes) => {
      const query = await ordersThen(...nodes);
      const lambda = new QueryEmitter(query).emitExecutionLambda({
        rowLimit: ROW_LIMIT,
        runtime: CUBE_NORTHWIND_RUNTIME,
        databaseType: SQL_SERVER,
      });
      expect(printIR(lambda)).toMatch(/rowNumber|cube_d/u);
      expect(emittedJson(query, ROW_LIMIT, SQL_SERVER)).toEqual(
        await CUBE_ENGINE_TEST__grammarToJson_lambda(printIR(lambda)),
      );
      await TEST__expectEngineTyping(engine, query);
    },
  );

  test('Drops the first rows by the Sort, through row numbers', async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(byOrderIdDesc(), new Drop('drop101', 825)),
      ROW_LIMIT,
      SQL_SERVER,
    );
    expect(orderIds(TEST__columnValues(result, 'ORDER_ID'))).toEqual(
      countDown(10252, 10248),
    );
  });

  test('Takes a range of rows by the Sort, through row numbers', async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(byOrderIdDesc(), new Slice('slice101', 10, 15)),
      ROW_LIMIT,
      SQL_SERVER,
    );
    expect(orderIds(TEST__columnValues(result, 'ORDER_ID'))).toEqual(
      countDown(11067, 11063),
    );
  });

  test('Numbers the rows by their first column when no Sort orders them', async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(new Slice('slice101', 10, 15)),
      ROW_LIMIT,
      SQL_SERVER,
    );
    expect(new Set(orderIds(TEST__columnValues(result, 'ORDER_ID')))).toEqual(
      new Set(countDown(10262, 10258)),
    );
  });

  test('Keeps the columns of the native forms', async () => {
    const query = await ordersThen(byOrderIdDesc(), new Drop('drop101', 825));
    const native = await TEST__runQuery(engine, query, ROW_LIMIT);
    const numbered = await TEST__runQuery(engine, query, ROW_LIMIT, SQL_SERVER);
    expect(numbered.columns).toEqual(native.columns);
  });

  test.each<[string, QueryNode[]]>([
    [
      'a Limit after a Sort on two columns',
      [
        new Sort('sort101', [
          { column: 'CUSTOMER_ID', direction: SortDirection.ASC },
          { column: 'ORDER_ID', direction: SortDirection.DESC },
        ]),
        new Limit('limit101', 5),
      ],
    ],
    [
      'a Distinct then a Limit',
      [
        new Restrict('restrict101', ['SHIP_COUNTRY']),
        new Distinct('distinct101'),
        new Limit('limit101', 5),
      ],
    ],
  ])(
    'Emits what the engine parses from the printed Pure for %s on Sybase IQ, and types as Cube infers',
    async (_, nodes) => {
      const query = await ordersThen(...nodes);
      const lambda = new QueryEmitter(query).emitExecutionLambda({
        rowLimit: ROW_LIMIT,
        runtime: CUBE_NORTHWIND_RUNTIME,
        databaseType: 'SybaseIQ',
      });
      expect(printIR(lambda)).toMatch(/rowNumber|cube_d/u);
      expect(emittedJson(query, ROW_LIMIT, 'SybaseIQ')).toEqual(
        await CUBE_ENGINE_TEST__grammarToJson_lambda(printIR(lambda)),
      );
      await TEST__expectEngineTyping(engine, query);
    },
  );

  test("Takes a Limit's rows by every key of a Sort on two columns, through row numbers (Sybase IQ)", async () => {
    // ALFKI has six orders: numbered by CUSTOMER_ID alone, any five would do
    const result = await TEST__runQuery(
      engine,
      await ordersThen(
        new Sort('sort101', [
          { column: 'CUSTOMER_ID', direction: SortDirection.ASC },
          { column: 'ORDER_ID', direction: SortDirection.DESC },
        ]),
        new Limit('limit101', 5),
      ),
      ROW_LIMIT,
      'SybaseIQ',
    );
    expect(orderIds(TEST__columnValues(result, 'ORDER_ID'))).toEqual([
      11011, 10952, 10835, 10702, 10692,
    ]);
    expect(new Set(TEST__columnValues(result, 'CUSTOMER_ID'))).toEqual(
      new Set(['ALFKI']),
    );
  });

  test('Takes five distinct countries from a padded Distinct then a Limit (Sybase IQ)', async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(
        new Restrict('restrict101', ['SHIP_COUNTRY']),
        new Distinct('distinct101'),
        new Limit('limit101', 5),
      ),
      ROW_LIMIT,
      'SybaseIQ',
    );
    const countries = TEST__columnValues(result, 'SHIP_COUNTRY');
    expect(countries).toHaveLength(5);
    expect(new Set(countries).size).toBe(5);
  });

  test('Keeps one row of each ship city and country, padded', async () => {
    const query = await ordersThen(
      new Restrict('restrict101', ['SHIP_COUNTRY', 'SHIP_CITY']),
      new Distinct('distinct101'),
    );
    const result = await TEST__runQuery(engine, query, ROW_LIMIT, SQL_SERVER);
    expect(result.rows).toHaveLength(70);
    // in the input's order, as Restrict keeps them
    expect(result.columns).toEqual(['SHIP_CITY', 'SHIP_COUNTRY']);
  });
});

describe('Distinct on the engine', () => {
  test('Emits what the engine parses from the printed Pure, and types as Cube infers', async () => {
    const query = await ordersThen(new Distinct('distinct101'));
    const lambda = new QueryEmitter(query).emitExecutionLambda({
      rowLimit: ROW_LIMIT,
      runtime: CUBE_NORTHWIND_RUNTIME,
    });
    expect(emittedJson(query)).toEqual(
      await CUBE_ENGINE_TEST__grammarToJson_lambda(printIR(lambda)),
    );
    await TEST__expectEngineTyping(engine, query);
  });

  test('Keeps every order, since no two are identical', async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(new Distinct('distinct101')),
      ROW_LIMIT,
    );
    expect(result.rows).toHaveLength(830);
  });
});

describe('Restrict on the engine', () => {
  test("Selects the kept columns in the input's order, typed as Cube infers", async () => {
    const query = await ordersThen(
      new Restrict('restrict101', ['SHIP_COUNTRY', 'ORDER_ID']),
    );
    const lambda = new QueryEmitter(query).emitExecutionLambda({
      rowLimit: ROW_LIMIT,
      runtime: CUBE_NORTHWIND_RUNTIME,
    });
    expect(emittedJson(query)).toEqual(
      await CUBE_ENGINE_TEST__grammarToJson_lambda(printIR(lambda)),
    );
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(result.columns).toEqual(['ORDER_ID', 'SHIP_COUNTRY']);
    expect(result.rows).toHaveLength(830);
  });

  test.each<[string, string[], number]>([
    ['the ship countries', ['SHIP_COUNTRY'], 21],
    ['the ship countries and cities', ['SHIP_COUNTRY', 'SHIP_CITY'], 70],
    ['the employees and shippers', ['EMPLOYEE_ID', 'SHIP_VIA'], 27],
  ])(
    'Keeps one row of each of %s with a Distinct after it',
    async (_, columns, count) => {
      const query = await ordersThen(
        new Restrict('restrict101', columns),
        new Distinct('distinct101'),
      );
      await TEST__expectEngineTyping(engine, query);
      const result = await TEST__runQuery(engine, query, ROW_LIMIT);
      expect(result.rows).toHaveLength(count);
      expect(new Set(result.rows.map((row) => JSON.stringify(row))).size).toBe(
        count,
      );
    },
  );
});

describe('Rename on the engine', () => {
  test.each(['Ship Country', 'ship-country', 'país', "it's"])(
    'Renames a column to %j, as the engine parses the printed Pure and types it',
    async (to) => {
      const query = await ordersThen(
        new Rename('rename101', [{ from: 'SHIP_COUNTRY', to }]),
      );
      const lambda = new QueryEmitter(query).emitExecutionLambda({
        rowLimit: ROW_LIMIT,
        runtime: CUBE_NORTHWIND_RUNTIME,
      });
      expect(emittedJson(query)).toEqual(
        await CUBE_ENGINE_TEST__grammarToJson_lambda(printIR(lambda)),
      );
      await TEST__expectEngineTyping(engine, query);
    },
  );

  test('Filters on a renamed column, which keeps its place', async () => {
    const query = await ordersThen(
      new Rename('rename101', [
        { from: 'SHIP_COUNTRY', to: 'Ship Country' },
        { from: 'ORDER_ID', to: 'Order' },
      ]),
      new Filter(
        'filter101',
        new ColumnComparisonFilter('Ship Country', FilterOperator.EQUAL, {
          kind: 'string',
          value: 'France',
        }),
      ),
    );
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(result.rows).toHaveLength(77);
    expect(result.columns.indexOf('Ship Country')).toBe(13);
    expect(result.columns.indexOf('Order')).toBe(0);
    expect(result.columns).not.toContain('SHIP_COUNTRY');
  });
});

describe('Join autofix on the engine', () => {
  /** ORDER_DETAILS ⋈ PRODUCTS on PRODUCT_ID (they share UNIT_PRICE), before the Right input this node */
  const detailsJoinProducts = async (
    beforeRight: QueryNode[] = [],
  ): Promise<Query> => {
    const [details, products] = await TEST__resolveSources(engine, [
      TEST__northwindTable('relational101', 'ORDER_DETAILS'),
      TEST__northwindTable('relational102', 'PRODUCTS'),
    ]);
    const join = new Join('join101', {
      leftColumns: ['PRODUCT_ID'],
      rightColumns: ['PRODUCT_ID'],
      joinType: JoinType.INNER,
    });
    const right = [products as RelationalTableSource, ...beforeRight];
    return new Query(
      [details as RelationalTableSource, ...right, join],
      [
        ...right
          .slice(1)
          .map(
            (node, index) =>
              new Connection((right[index] as QueryNode).id, node.id, 'tds'),
          ),
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection((right.at(-1) as QueryNode).id, 'join101', 'rightTds'),
      ],
      'join101',
    );
  };

  /** The query with the join's shared columns renamed */
  const fixed = (query: Query): Query => {
    const { schemas } = buildSchemasAndValidity(
      query,
      createNodeRegistry().queryRules,
    );
    const [left, right] = query
      .getInputIds('join101')
      .map((id) => schemas.get(id ?? ''));
    return fixJoinDuplicates(query, 'join101', left, right);
  };

  test('Gives a join its inputs could not run, which the engine types and runs', async () => {
    const query = fixed(await detailsJoinProducts());
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(result.rows).toHaveLength(2155);
    expect(result.columns).toContain('UNIT_PRICE_1');
    expect(result.columns).toContain('UNIT_PRICE_2');
    expect(result.columns).not.toContain('UNIT_PRICE');
  });

  test('Takes the next free name when an earlier Rename made the first one', async () => {
    const query = fixed(
      await detailsJoinProducts([
        new Rename('rename101', [{ from: 'PRODUCT_NAME', to: 'UNIT_PRICE_1' }]),
      ]),
    );
    await TEST__expectEngineTyping(engine, query);
    expect(
      buildSchemasAndValidity(query).schemas.get('join101')?.names(),
    ).toContain('UNIT_PRICE_1_2');
  });
});

describe('Group on the engine', () => {
  const { COUNT, DISTINCT_VALUE, SUM, MAX, COUNT_ROWS } = AggregationFunction;
  const aggregation = (
    fn: AggregationFunction,
    column: string | undefined,
    name: string,
  ): ColumnAggregation => ({ column, function: fn, name });

  /** CUBETEST.ALLTYPES, resolved: three rows, ID 3 empty but for its key */
  const alltypes = async (): Promise<RelationalTableSource> => {
    const [resolved] = await TEST__resolveSources(engine, [
      TEST__northwindTable('relational101', 'ALLTYPES', 'CUBETEST'),
    ]);
    return resolved as RelationalTableSource;
  };

  test('Groups the 830 orders by SHIP_COUNTRY into 21 groups, through a Cube-emitted function2', async () => {
    const query = await ordersThen(
      new Group(
        'group101',
        ['SHIP_COUNTRY'],
        [aggregation(COUNT_ROWS, undefined, 'orders')],
      ),
    );
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(result.columns).toEqual(['SHIP_COUNTRY', 'orders']);
    expect(result.rows).toHaveLength(21);
    expect(
      orderIds(TEST__columnValues(result, 'orders')).reduce((a, b) => a + b, 0),
    ).toBe(830);
    expect(new Set(TEST__columnValues(result, 'SHIP_COUNTRY')).size).toBe(21);
  });

  test('Aggregates all the rows into one, with no group column', async () => {
    const query = await ordersThen(
      new Group('group101', [], [aggregation(COUNT_ROWS, undefined, 'orders')]),
    );
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(result.rows).toHaveLength(1);
    expect(orderIds(TEST__columnValues(result, 'orders'))).toEqual([830]);
  });

  test("Counts the 507 orders with no SHIP_REGION in Count rows, and none of them in the region's Count", async () => {
    const query = await ordersThen(
      new Group(
        'group101',
        ['SHIP_REGION'],
        [
          aggregation(COUNT, 'SHIP_REGION', 'regions'),
          aggregation(COUNT_ROWS, undefined, 'orders'),
        ],
      ),
    );
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    const index = TEST__columnValues(result, 'SHIP_REGION').indexOf(null);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(Number(TEST__columnValues(result, 'regions')[index])).toBe(0);
    expect(Number(TEST__columnValues(result, 'orders')[index])).toBe(507);
  });

  test('Gives every function each ALLTYPES column offers, as its values work out over the three rows', async () => {
    const table = await alltypes();
    const schema =
      table.resolution.kind === 'resolved'
        ? table.resolution.schema
        : undefined;
    const query = TEST__chainOf([
      table,
      new Group(
        'group101',
        [],
        [
          aggregation(COUNT_ROWS, undefined, 'Count Rows'),
          ...(schema?.columns ?? []).flatMap((column) =>
            getAvailableAggregations(column.type).map((fn) =>
              aggregation(fn, column.name, `${column.name}_${fn}`),
            ),
          ),
        ],
      ),
    ]);
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    const value = (name: string): unknown =>
      TEST__columnValues(result, name)[0];
    expect(result.rows).toHaveLength(1);
    // counts: ID has three values, every other column two (ID 3 is empty)
    expect(Number(value('Count Rows'))).toBe(3);
    expect(Number(value('ID_Count'))).toBe(3);
    expect(Number(value('ID_DistinctCount'))).toBe(3);
    ['TI', 'SI', 'BI', 'F', 'D', 'DEC', 'NUM', 'DT', 'TS', 'B', 'VC'].forEach(
      (column) => {
        expect([column, Number(value(`${column}_Count`))]).toEqual([column, 2]);
        expect([column, Number(value(`${column}_DistinctCount`))]).toEqual([
          column,
          2,
        ]);
        // two distinct values: no single one
        expect([column, value(`${column}_DistinctValue`)]).toEqual([
          column,
          null,
        ]);
      },
    );
    // sums and averages of numbers, the big integer's sum exact
    expect(value('TI_Sum')).toBe('3');
    expect(value('SI_Sum')).toBe('300');
    expect(value('BI_Sum')).toBe('9007199254740997');
    expect(value('ID_Sum')).toBe('6');
    expect(value('F_Sum')).toBe(4);
    expect(value('D_Sum')).toBe(2.6);
    expect(value('DEC_Sum')).toBe('13.59');
    expect(value('NUM_Sum')).toBe('3.7345');
    expect(value('TI_Average')).toBe(1.5);
    expect(value('SI_Average')).toBe(150);
    expect(value('DEC_Average')).toBe(6.795);
    // smallest and largest, dates and timestamps included
    expect([value('BI_Min'), value('BI_Max')]).toEqual([
      '4',
      '9007199254740993',
    ]);
    expect([value('D_Min'), value('D_Max')]).toEqual([0.1, 2.5]);
    expect([value('NUM_Min'), value('NUM_Max')]).toEqual(['1.2345', '2.5000']);
    expect([value('DT_Min'), value('DT_Max')]).toEqual([
      '2024-01-02',
      '2024-01-03',
    ]);
    expect([value('TS_Min'), value('TS_Max')]).toEqual([
      '2024-01-02T03:04:05.678000000+0000',
      '2024-01-02T13:00:00.000000000+0000',
    ]);
  });

  test("Gives a group's one distinct value, and nothing for a group with none", async () => {
    const query = TEST__chainOf([
      await alltypes(),
      new Group(
        'group101',
        ['ID'],
        [aggregation(DISTINCT_VALUE, 'VC', 'text')],
      ),
    ]);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    const byId = new Map(
      TEST__columnValues(result, 'ID').map((id, index) => [
        Number(id),
        TEST__columnValues(result, 'text')[index],
      ]),
    );
    expect(Object.fromEntries(byId)).toEqual({ 1: 'abc', 2: 'xyz', 3: null });
  });

  test('Gives one row over no rows: counts of 0, then nothing', async () => {
    const query = await ordersThen(
      new Filter(
        'filter101',
        new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
          kind: 'string',
          value: 'Nowhere',
        }),
      ),
      new Group(
        'group101',
        [],
        [
          aggregation(COUNT_ROWS, undefined, 'orders'),
          aggregation(COUNT, 'ORDER_ID', 'ids'),
          aggregation(SUM, 'FREIGHT', 'freight total'),
          aggregation(MAX, 'ORDER_DATE', 'last'),
        ],
      ),
    );
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(result.rows).toHaveLength(1);
    expect(
      result.rows[0]?.map((cell) => (cell === null ? null : Number(cell))),
    ).toEqual([0, 0, null, null]);
  });

  test("Keeps a group whose Sum is empty in a negated filter on the Sum, as the Sum's nullability says", async () => {
    // ID 3's Sum of SI is empty: Cube marks the Sum nullable, so the negation
    // keeps it (the engine types it as never empty)
    const query = TEST__chainOf([
      await alltypes(),
      new Group('group101', ['ID'], [aggregation(SUM, 'SI', 'total')]),
      new Filter(
        'filter101',
        new NotFilter(
          new ColumnComparisonFilter('total', FilterOperator.EQUAL, {
            kind: 'integer',
            value: '100',
          }),
        ),
      ),
    ]);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(orderIds(TEST__columnValues(result, 'ID')).sort()).toEqual([2, 3]);
  });
});

describe('Concat on the engine', () => {
  const COMPANY_CITY_COUNTRY = ['COMPANY_NAME', 'CITY', 'COUNTRY'];

  /** Two tables of one schema, resolved, as relational101 and relational102 */
  const tables = async (
    first: string,
    second: string,
    schema?: string,
  ): Promise<[RelationalTableSource, RelationalTableSource]> =>
    (await TEST__resolveSources(engine, [
      TEST__northwindTable('relational101', first, schema),
      TEST__northwindTable('relational102', second, schema),
    ])) as [RelationalTableSource, RelationalTableSource];

  /**
   * Each input with the nodes after it, concatenated by concat101 (its
   * First and Second), converting types or not, then the nodes after it,
   * captured at the last
   */
  const concatOfWith = (
    widenTypes: boolean,
    first: QueryNode[],
    second: QueryNode[],
    ...after: QueryNode[]
  ): Query => {
    const concat = new Concat('concat101', widenTypes);
    const chain = (nodes: readonly QueryNode[]): Connection[] =>
      nodes
        .slice(1)
        .map(
          (node, index) =>
            new Connection(
              (nodes[index] as QueryNode).id,
              node.id,
              node.ports[0] as string,
            ),
        );
    const nodes: QueryNode[] = [concat, ...after];
    return new Query(
      [...first, ...second, ...nodes],
      [
        ...chain(first),
        ...chain(second),
        new Connection((first.at(-1) as QueryNode).id, concat.id, 'tds1'),
        new Connection((second.at(-1) as QueryNode).id, concat.id, 'tds2'),
        ...chain(nodes),
      ],
      nodes.at(-1)?.id,
    );
  };

  /** Types must match */
  const concatOf = (
    first: QueryNode[],
    second: QueryNode[],
    ...after: QueryNode[]
  ): Query => concatOfWith(false, first, second, ...after);

  /** Convert types (PLAN §11.5, Q5): differing types cast to the type both are */
  const convertingConcatOf = (
    first: QueryNode[],
    second: QueryNode[],
    ...after: QueryNode[]
  ): Query => concatOfWith(true, first, second, ...after);

  /** CUSTOMERS and SUPPLIERS, each restricted to COMPANY_NAME, CITY and COUNTRY, concatenated */
  const companies = async (...after: QueryNode[]): Promise<Query> => {
    const [customers, suppliers] = await tables('CUSTOMERS', 'SUPPLIERS');
    return concatOf(
      [customers, new Restrict('restrict101', COMPANY_CITY_COUNTRY)],
      [suppliers, new Restrict('restrict102', COMPANY_CITY_COUNTRY)],
      ...after,
    );
  };

  /** The values of one column of a table, run alone */
  const tableValues = async (
    table: string,
    column: string,
    schema?: string,
  ): Promise<unknown[]> => {
    const [source] = await TEST__resolveSources(engine, [
      TEST__northwindTable('relational101', table, schema),
    ]);
    return TEST__columnValues(
      await TEST__runQuery(
        engine,
        TEST__chainOf([
          source as RelationalTableSource,
          new Restrict('restrict101', [column]),
        ]),
        ROW_LIMIT,
      ),
      column,
    );
  };

  const sorted = (values: readonly unknown[]): string[] =>
    values.map((value) => String(value)).sort();

  test('Emits what the engine parses from the printed Pure, and types as Cube infers', async () => {
    const query = await companies();
    const lambda = new QueryEmitter(query).emitExecutionLambda({
      rowLimit: ROW_LIMIT,
      runtime: CUBE_NORTHWIND_RUNTIME,
    });
    expect(printIR(lambda)).toContain('->concatenate(');
    expect(emittedJson(query)).toEqual(
      await CUBE_ENGINE_TEST__grammarToJson_lambda(printIR(lambda)),
    );
    await TEST__expectEngineTyping(engine, query);
  });

  test('Gives the 91 customers and the 29 suppliers: 120 rows', async () => {
    const result = await TEST__runQuery(engine, await companies(), ROW_LIMIT);
    expect(result.columns).toEqual(COMPANY_CITY_COUNTRY);
    expect(result.rows).toHaveLength(120);
    expect(sorted(TEST__columnValues(result, 'COMPANY_NAME'))).toEqual(
      sorted([
        ...(await tableValues('CUSTOMERS', 'COMPANY_NAME')),
        ...(await tableValues('SUPPLIERS', 'COMPANY_NAME')),
      ]),
    );
  });

  test('Gives the same rows with its inputs swapped', async () => {
    const query = await companies();
    const swapped = query.swapInputs('concat101');
    expect(swapped === query).toBe(false);
    const [rows, swappedRows] = [
      await TEST__runQuery(engine, query, ROW_LIMIT),
      await TEST__runQuery(engine, swapped, ROW_LIMIT),
    ];
    expect(sorted(TEST__columnValues(swappedRows, 'COMPANY_NAME'))).toEqual(
      sorted(TEST__columnValues(rows, 'COMPANY_NAME')),
    );
  });

  test('Keeps the rows both inputs share: CUSTOMERS with itself gives each customer twice', async () => {
    const [first, second] = await tables('CUSTOMERS', 'CUSTOMERS');
    const query = concatOf(
      [first, new Restrict('restrict101', ['CUSTOMER_ID'])],
      [second, new Restrict('restrict102', ['CUSTOMER_ID'])],
    );
    await TEST__expectEngineTyping(engine, query);
    const ids = TEST__columnValues(
      await TEST__runQuery(engine, query, ROW_LIMIT),
      'CUSTOMER_ID',
    );
    expect(ids).toHaveLength(182);
    const once = await tableValues('CUSTOMERS', 'CUSTOMER_ID');
    expect(sorted(ids)).toEqual(sorted([...once, ...once]));
  });

  test('Removes the countries both inputs have with a Distinct after it', async () => {
    const [customers, suppliers] = await tables('CUSTOMERS', 'SUPPLIERS');
    const query = concatOf(
      [customers, new Restrict('restrict101', ['COUNTRY'])],
      [suppliers, new Restrict('restrict102', ['COUNTRY'])],
      new Distinct('distinct101'),
    );
    await TEST__expectEngineTyping(engine, query);
    const countries = TEST__columnValues(
      await TEST__runQuery(engine, query, ROW_LIMIT),
      'COUNTRY',
    );
    expect(sorted(countries)).toEqual(
      sorted([
        ...new Set([
          ...(await tableValues('CUSTOMERS', 'COUNTRY')),
          ...(await tableValues('SUPPLIERS', 'COUNTRY')),
        ]),
      ]),
    );
  });

  test("Takes a Limit inside its first input by that input's Sort: the last 3 customers and the 29 suppliers", async () => {
    const [customers, suppliers] = await tables('CUSTOMERS', 'SUPPLIERS');
    const query = concatOf(
      [
        customers,
        new Restrict('restrict101', COMPANY_CITY_COUNTRY),
        new Sort('sort101', [
          { column: 'COMPANY_NAME', direction: SortDirection.DESC },
        ]),
        new Limit('limit101', 3),
      ],
      [suppliers, new Restrict('restrict102', COMPANY_CITY_COUNTRY)],
    );
    await TEST__expectEngineTyping(engine, query);
    const names = TEST__columnValues(
      await TEST__runQuery(engine, query, ROW_LIMIT),
      'COMPANY_NAME',
    );
    expect(names).toHaveLength(32);
    const lastCustomers = sorted(
      await tableValues('CUSTOMERS', 'COMPANY_NAME'),
    ).slice(-3);
    expect(sorted(names)).toEqual(
      sorted([
        ...lastCustomers,
        ...(await tableValues('SUPPLIERS', 'COMPANY_NAME')),
      ]),
    );
  });

  test('Makes a column nullable when one input has it nullable: 830 orders and 91 customers', async () => {
    const [ordersTable, customers] = await tables('ORDERS', 'CUSTOMERS');
    const query = concatOf(
      [ordersTable, new Restrict('restrict101', ['CUSTOMER_ID', 'SHIP_NAME'])],
      [
        customers,
        new Restrict('restrict102', ['CUSTOMER_ID', 'COMPANY_NAME']),
        new Rename('rename102', [{ from: 'COMPANY_NAME', to: 'SHIP_NAME' }]),
      ],
    );
    await TEST__expectEngineTyping(engine, query);
    const { schemas } = buildSchemasAndValidity(
      query,
      createNodeRegistry().queryRules,
    );
    expect(
      schemas
        .get('concat101')
        ?.columns.map(({ name, nullable }) => [name, nullable]),
    ).toEqual([
      ['CUSTOMER_ID', true],
      ['SHIP_NAME', true],
    ]);
    expect((await TEST__runQuery(engine, query, ROW_LIMIT)).rows).toHaveLength(
      921,
    );
  });

  test("Runs after its Rename autofix, each supplier's REGION under CITY", async () => {
    const [customers, suppliers] = await tables('CUSTOMERS', 'SUPPLIERS');
    const query = concatOf(
      [customers, new Restrict('restrict101', COMPANY_CITY_COUNTRY)],
      [
        suppliers,
        new Restrict('restrict102', ['COMPANY_NAME', 'REGION', 'COUNTRY']),
      ],
    );
    const { schemas } = buildSchemasAndValidity(
      query,
      createNodeRegistry().queryRules,
    );
    const fixed = renameConcatInput(
      query,
      'concat101',
      schemas.get('restrict101'),
      schemas.get('restrict102'),
    );
    await TEST__expectEngineTyping(engine, fixed);
    const result = await TEST__runQuery(engine, fixed, ROW_LIMIT);
    expect(result.rows).toHaveLength(120);
    const names = TEST__columnValues(result, 'COMPANY_NAME');
    // a supplier whose REGION is LA, and whose CITY is New Orleans
    expect(
      TEST__columnValues(result, 'CITY')[
        names.indexOf('New Orleans Cajun Delights')
      ],
    ).toBe('LA');
  });

  test('Counts the rows of both inputs in a Group after it', async () => {
    const query = await companies(
      new Group(
        'group101',
        ['COUNTRY'],
        [
          {
            column: undefined,
            function: AggregationFunction.COUNT_ROWS,
            name: 'companies',
          },
        ],
      ),
    );
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(
      orderIds(TEST__columnValues(result, 'companies')).reduce(
        (a, b) => a + b,
        0,
      ),
    ).toBe(120);
  });

  // Convert types (M4.13, PLAN §11.5, Q5): a differing type is cast to the
  // type both inputs are, a type-only cast: H2 unions the columns' own SQL
  // types

  const CUBETEST = 'CUBETEST';

  /**
   * The columns, listed in their table's order, each renamed to the name at
   * its position in `names` (a Restrict, then a Rename when a name changes),
   * the nodes' ids ending in the suffix
   */
  const keptAs = (
    suffix: string,
    columns: readonly string[],
    names: readonly string[],
  ): QueryNode[] => {
    const mappings = columns.flatMap((from, index) => {
      const to = names[index] as string;
      return from === to ? [] : [{ from, to }];
    });
    return [
      new Restrict(`restrict${suffix}`, columns),
      ...(mappings.length ? [new Rename(`rename${suffix}`, mappings)] : []),
    ];
  };

  /** ALLTYPES twice, the first's columns and the second's, each kept under the names */
  const alltypesInputs = async (
    first: readonly string[],
    second: readonly string[],
    names: readonly string[],
  ): Promise<[QueryNode[], QueryNode[]]> => {
    const [one, two] = await tables('ALLTYPES', 'ALLTYPES', CUBETEST);
    return [
      [one, ...keptAs('101', first, names)],
      [two, ...keptAs('102', second, names)],
    ];
  };

  /** ALLTYPES' columns concatenated with others of its own, converting types */
  const convertedAlltypes = async (
    first: readonly string[],
    second: readonly string[],
    names: readonly string[],
  ): Promise<Query> =>
    convertingConcatOf(...(await alltypesInputs(first, second, names)));

  /** Cube's columns of concat101: `<name> <type>`, `?` when nullable */
  const concatColumns = (query: Query): string[] =>
    TEST__inferredSchema(query, 'concat101').columns.map(
      ({ name, type, nullable }) =>
        `${name} ${type.displayName}${nullable ? '?' : ''}`,
    );

  /** The values of one column of the query's result */
  const valuesOf = async (query: Query, column: string): Promise<unknown[]> =>
    TEST__columnValues(await TEST__runQuery(engine, query, ROW_LIMIT), column);

  /** The values of one ALLTYPES column, run alone */
  const alltypesValues = (column: string): Promise<unknown[]> =>
    tableValues('ALLTYPES', column, CUBETEST);

  /** Each row of the query's result, as text, sorted */
  const sortedRows = async (query: Query): Promise<string[]> =>
    (await TEST__runQuery(engine, query, ROW_LIMIT)).rows
      .map((row) => JSON.stringify(row))
      .sort();

  /** Numbers as numbers, whether H2 gives them as text or not, sorted */
  const sortedNumbers = (values: readonly unknown[]): string[] =>
    values
      .map((value) => (value === null ? 'null' : String(Number(value))))
      .sort();

  test('Emits what the engine parses from the printed Pure when it converts types, and types as Cube infers', async () => {
    const query = await convertedAlltypes(
      ['TI', 'DT', 'VC'],
      ['SI', 'TS', 'VC'],
      ['N', 'WHEN', 'CUBE_CAST'],
    );
    const printed = printIR(
      new QueryEmitter(query).emitExecutionLambda({
        rowLimit: ROW_LIMIT,
        runtime: CUBE_NORTHWIND_RUNTIME,
      }),
    );
    // in both inputs, the temporary names avoiding CUBE_CAST, in any case
    expect(
      printed.split(
        '->extend(~[cube_cast2: x | $x.N->cast(@Integer), cube_cast3: x | $x.WHEN->cast(@Date)])->select(~[cube_cast2, cube_cast3, CUBE_CAST])->rename(~cube_cast2, ~N)->rename(~cube_cast3, ~WHEN)',
      ),
    ).toHaveLength(3);
    expect(emittedJson(query)).toEqual(
      await CUBE_ENGINE_TEST__grammarToJson_lambda(printed),
    );
    await TEST__expectEngineTyping(engine, query);
  });

  test("Converts TinyInt and SmallInt to Integer: ALLTYPES' TI with its SI gives 6 rows, both columns' values", async () => {
    const query = await convertedAlltypes(['TI'], ['SI'], ['TI']);
    expect(concatColumns(query)).toEqual(['TI Integer?']);
    await TEST__expectEngineTyping(engine, query);
    const values = await valuesOf(query, 'TI');
    expect(values).toHaveLength(6);
    expect(sorted(values)).toEqual(
      sorted([
        ...(await alltypesValues('TI')),
        ...(await alltypesValues('SI')),
      ]),
    );
  });

  test("Converts two Varchar lengths to String: CUSTOMERS' CITY with SUPPLIERS' CONTACT_NAME gives the 120 rows of both", async () => {
    const [customers, suppliers] = await tables('CUSTOMERS', 'SUPPLIERS');
    const query = convertingConcatOf(
      [customers, new Restrict('restrict101', ['COMPANY_NAME', 'CITY'])],
      [
        suppliers,
        ...keptAs(
          '102',
          ['COMPANY_NAME', 'CONTACT_NAME'],
          ['COMPANY_NAME', 'CITY'],
        ),
      ],
    );
    expect(concatColumns(query)).toEqual([
      'COMPANY_NAME Varchar(40)',
      'CITY String?',
    ]);
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(result.rows).toHaveLength(120);
    expect(sorted(TEST__columnValues(result, 'CITY'))).toEqual(
      sorted([
        ...(await tableValues('CUSTOMERS', 'CITY')),
        ...(await tableValues('SUPPLIERS', 'CONTACT_NAME')),
      ]),
    );
    expect(sorted(TEST__columnValues(result, 'COMPANY_NAME'))).toEqual(
      sorted([
        ...(await tableValues('CUSTOMERS', 'COMPANY_NAME')),
        ...(await tableValues('SUPPLIERS', 'COMPANY_NAME')),
      ]),
    );
  });

  test('Converts a StrictDate and a Timestamp to Date: H2 gives the dates as midnight timestamps, the timestamps as they are', async () => {
    const query = await convertedAlltypes(['DT'], ['TS'], ['WHEN']);
    expect(concatColumns(query)).toEqual(['WHEN Date?']);
    await TEST__expectEngineTyping(engine, query);
    // run alone, DT gives dates; in the union, which has no SQL cast, H2
    // takes the TIMESTAMP of the two SQL types
    const dates = await alltypesValues('DT');
    expect(sorted(dates)).toEqual(['2024-01-02', '2024-01-03', 'null']);
    expect(sorted(await valuesOf(query, 'WHEN'))).toEqual(
      sorted([
        ...dates.map((date) =>
          date === null ? null : `${String(date)}T00:00:00.000000000+0000`,
        ),
        ...(await alltypesValues('TS')),
      ]),
    );
  });

  test('Converts numbers to the type both are, each value kept: Number, Float and Decimal', async () => {
    const converted = async (
      first: string,
      second: string,
      type: string,
    ): Promise<unknown[]> => {
      const query = await convertedAlltypes([first], [second], [first]);
      expect(concatColumns(query)).toEqual([`${first} ${type}`]);
      await TEST__expectEngineTyping(engine, query);
      return valuesOf(query, first);
    };
    // Int with Float4: H2 gives each value as text, an integer as 1.0
    expect(sortedNumbers(await converted('ID', 'F', 'Number?'))).toEqual(
      sortedNumbers([
        ...(await alltypesValues('ID')),
        ...(await alltypesValues('F')),
      ]),
    );
    // BigInt with Double: the big integer exact
    const bigAndDouble = await converted('BI', 'D', 'Number?');
    expect(bigAndDouble).toContain('9007199254740993');
    expect(sortedNumbers(bigAndDouble)).toEqual(
      sortedNumbers([
        ...(await alltypesValues('BI')),
        ...(await alltypesValues('D')),
      ]),
    );
    // Float4 with Double
    expect(sortedNumbers(await converted('F', 'D', 'Float?'))).toEqual(
      sortedNumbers([
        ...(await alltypesValues('F')),
        ...(await alltypesValues('D')),
      ]),
    );
    // two Numeric precisions: each value with its own scale, 12.34 and 2.5000
    expect(sorted(await converted('DEC', 'NUM', 'Decimal?'))).toEqual(
      sorted([
        ...(await alltypesValues('DEC')),
        ...(await alltypesValues('NUM')),
      ]),
    );
  });

  test("Keeps each row's values together beside a column named CUBE_CAST, the converted columns cast under other names", async () => {
    const [first, second] = await alltypesInputs(
      ['TI', 'SI', 'VC'],
      ['SI', 'BI', 'VC'],
      ['A', 'B', 'CUBE_CAST'],
    );
    const query = convertingConcatOf(first, second);
    expect(concatColumns(query)).toEqual([
      'A Integer?',
      'B Integer?',
      'CUBE_CAST Varchar(20)?',
    ]);
    await TEST__expectEngineTyping(engine, query);
    expect(await sortedRows(query)).toEqual(
      [
        ...(await sortedRows(TEST__chainOf(first))),
        ...(await sortedRows(TEST__chainOf(second))),
      ].sort(),
    );
  });

  test('Runs after its Rename autofix, offered once it converts types: CONTACT_NAME under CITY', async () => {
    const [customers, suppliers] = await tables('CUSTOMERS', 'SUPPLIERS');
    const inputs: [QueryNode[], QueryNode[]] = [
      [customers, new Restrict('restrict101', ['COMPANY_NAME', 'CITY'])],
      [
        suppliers,
        new Restrict('restrict102', ['COMPANY_NAME', 'CONTACT_NAME']),
      ],
    ];
    const { schemas } = buildSchemasAndValidity(
      concatOf(...inputs),
      createNodeRegistry().queryRules,
    );
    const [first, second] = [
      schemas.get('restrict101'),
      schemas.get('restrict102'),
    ];
    // Varchar(15) and Varchar(30) must match unless it converts types
    expect(
      canRenameConcatInput(concatOf(...inputs), 'concat101', first, second),
    ).toBe(false);
    const fixed = renameConcatInput(
      convertingConcatOf(...inputs),
      'concat101',
      first,
      second,
    );
    await TEST__expectEngineTyping(engine, fixed);
    const result = await TEST__runQuery(engine, fixed, ROW_LIMIT);
    expect(result.rows).toHaveLength(120);
    expect(sorted(TEST__columnValues(result, 'CITY'))).toEqual(
      sorted([
        ...(await tableValues('CUSTOMERS', 'CITY')),
        ...(await tableValues('SUPPLIERS', 'CONTACT_NAME')),
      ]),
    );
  });
});

describe('Partition on the engine', () => {
  const { COUNT, SUM, AVERAGE, COUNT_ROWS } = AggregationFunction;
  const { RANK, DENSE_RANK, ROW_NUMBER } = WindowRankFunction;
  const fn = (
    function_: string,
    column: string | undefined,
    name: string,
  ): ColumnAggregation => ({ column, function: function_, name });
  const by = (
    column: string,
    direction = SortDirection.ASC,
  ): { column: string; direction: SortDirection } => ({ column, direction });
  const equals = (column: string, value: string): Filter =>
    new Filter(
      'filter101',
      new ColumnComparisonFilter(column, FilterOperator.EQUAL, {
        kind: 'string',
        value,
      }),
    );
  const numbers = (values: readonly unknown[]): (number | null)[] =>
    values.map((value) => (value === null ? null : Number(value)));
  /** The rows of a column, in ORDER_ID order */
  const byOrderId = (
    result: Awaited<ReturnType<typeof TEST__runQuery>>,
    column: string,
  ): (number | null)[] => {
    const ids = orderIds(TEST__columnValues(result, 'ORDER_ID'));
    const values = numbers(TEST__columnValues(result, column));
    return ids
      .map((id, index) => [id, values[index] ?? null] as const)
      .sort(([a], [b]) => a - b)
      .map(([, value]) => value);
  };

  test('Runs aggregates over the rows up to each row, rows tied on the sort counting together, and ranks the ties', async () => {
    // ORDERS 10250 and 10251 share 1996-07-08; no partition column
    const query = await ordersThen(
      new Restrict('restrict101', ['ORDER_ID', 'EMPLOYEE_ID', 'ORDER_DATE']),
      new Partition(
        'partition101',
        [],
        [by('ORDER_DATE')],
        [
          fn(COUNT_ROWS, undefined, 'n'),
          fn(SUM, 'EMPLOYEE_ID', 's'),
          fn(RANK, undefined, 'rk'),
          fn(DENSE_RANK, undefined, 'drk'),
          fn(ROW_NUMBER, undefined, 'rn'),
        ],
      ),
      new Filter(
        'filter101',
        new ColumnComparisonFilter('ORDER_ID', FilterOperator.LESS_THAN, {
          kind: 'integer',
          value: '10254',
        }),
      ),
    );
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(result.columns).toEqual([
      'ORDER_ID',
      'EMPLOYEE_ID',
      'ORDER_DATE',
      'n',
      's',
      'rk',
      'drk',
      'rn',
    ]);
    expect(byOrderId(result, 'n')).toEqual([1, 2, 4, 4, 5, 6]);
    expect(byOrderId(result, 's')).toEqual([5, 11, 18, 18, 22, 25]);
    expect(byOrderId(result, 'rk')).toEqual([1, 2, 3, 3, 5, 6]);
    expect(byOrderId(result, 'drk')).toEqual([1, 2, 3, 3, 4, 5]);
    // Row Number numbers the tied rows 3 and 4, in either order
    const rowNumbers = byOrderId(result, 'rn');
    expect([
      rowNumbers[0],
      rowNumbers[1],
      rowNumbers[4],
      rowNumbers[5],
    ]).toEqual([1, 2, 5, 6]);
    expect(new Set([rowNumbers[2], rowNumbers[3]])).toEqual(new Set([3, 4]));
  });

  test("Runs ALFKI's sum of EMPLOYEE_ID by date, and gives every row the whole total without a sort", async () => {
    const running = await ordersThen(
      new Partition(
        'partition101',
        ['CUSTOMER_ID'],
        [by('ORDER_DATE')],
        [fn(SUM, 'EMPLOYEE_ID', 'running')],
      ),
      equals('CUSTOMER_ID', 'ALFKI'),
    );
    const result = await TEST__runQuery(engine, running, ROW_LIMIT);
    expect(byOrderId(result, 'running')).toEqual([6, 10, 14, 15, 16, 19]);
    const total = await ordersThen(
      new Partition(
        'partition101',
        ['CUSTOMER_ID'],
        [],
        [fn(SUM, 'EMPLOYEE_ID', 'total')],
      ),
      equals('CUSTOMER_ID', 'ALFKI'),
    );
    expect(
      byOrderId(await TEST__runQuery(engine, total, ROW_LIMIT), 'total'),
    ).toEqual([19, 19, 19, 19, 19, 19]);
  });

  test("Counts France's 77 orders on each of its rows though a Filter after the window keeps only France", async () => {
    const query = await ordersThen(
      new Partition(
        'partition101',
        ['SHIP_COUNTRY'],
        [],
        [fn(COUNT_ROWS, undefined, 'n')],
      ),
      equals('SHIP_COUNTRY', 'France'),
    );
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(result.rows).toHaveLength(77);
    expect(new Set(numbers(TEST__columnValues(result, 'n')))).toEqual(
      new Set([77]),
    );
    expect(result.sql.join('\n')).toMatch(/\bwith\b/iu);
  });

  test("Keeps each country's top 3 freights with a Filter on their Rank", async () => {
    const query = await ordersThen(
      new Partition(
        'partition101',
        ['SHIP_COUNTRY'],
        [by('FREIGHT', SortDirection.DESC)],
        [fn(RANK, undefined, 'rk')],
      ),
      new Filter(
        'filter101',
        new CompositeFilter(CompositeFilterOperator.AND, [
          new ColumnComparisonFilter('rk', FilterOperator.LESS_THAN_OR_EQUAL, {
            kind: 'integer',
            value: '3',
          }),
          new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
            kind: 'string',
            value: 'France',
          }),
        ]),
      ),
      new Sort('sort101', [by('rk')]),
    );
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    // sorted by the rank, after the window: the capture's sort is outside its let
    expect(orderIds(TEST__columnValues(result, 'ORDER_ID'))).toEqual([
      10634, 10511, 10787,
    ]);
    expect(numbers(TEST__columnValues(result, 'rk'))).toEqual([1, 2, 3]);
  });

  test("Leaves ALLTYPES ID 3's Sum and Average empty, its Count 0 and its Count Rows 1", async () => {
    const [alltypes] = await TEST__resolveSources(engine, [
      TEST__northwindTable('relational101', 'ALLTYPES', 'CUBETEST'),
    ]);
    const query = TEST__chainOf([
      alltypes as RelationalTableSource,
      new Restrict('restrict101', ['ID', 'SI']),
      new Partition(
        'partition101',
        ['ID'],
        [],
        [
          fn(AVERAGE, 'SI', 'a'),
          fn(SUM, 'SI', 's'),
          fn(COUNT, 'SI', 'c'),
          fn(COUNT_ROWS, undefined, 'n'),
        ],
      ),
    ]);
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    const row = (id: number): (number | null)[] => {
      const index = numbers(TEST__columnValues(result, 'ID')).indexOf(id);
      return ['a', 's', 'c', 'n'].map(
        (column) => numbers(TEST__columnValues(result, column))[index] ?? null,
      );
    };
    expect(row(1)).toEqual([100, 100, 1, 1]);
    expect(row(3)).toEqual([null, null, 0, 1]);
  });
});
