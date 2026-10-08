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
  ColumnComparisonFilter,
  Connection,
  CubeDocument,
  Distinct,
  Drop,
  buildSchemasAndValidity,
  createNodeRegistry,
  Filter,
  FilterOperator,
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
  Restrict,
  Slice,
  Sort,
  SortDirection,
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
    index: 0 | 1,
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
    await applyAndRun(state, 'SHIP_COUNTRY', 1, (cell) => cell === 'France');
    const countries = shownValues(state, 'SHIP_COUNTRY');
    expect(countries).toHaveLength(77);
    expect(new Set(countries)).toEqual(new Set(['France']));
  });

  test('Filters on a null cell with Is Empty: the 507 orders with no ship region', async () => {
    const state = await ranOrders();
    await applyAndRun(state, 'SHIP_REGION', 1, (cell) => cell === null);
    const regions = shownValues(state, 'SHIP_REGION');
    expect(regions).toHaveLength(507);
    expect(new Set(regions)).toEqual(new Set([null]));
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
