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

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  DEFAULT_PIVOT_AGGREGATION,
  MESSAGE_PIVOT_UNSUPPORTED_DATABASE,
  Pivot,
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  Connection,
  CubeDocument,
  DataProductAccessPointSource,
  Distinct,
  Drop,
  type ExpressionFilter,
  Filter,
  FilterOperator,
  Limit,
  MESSAGE_CONDITION_WILDCARD,
  MESSAGE_FILTER_VALUE_WILDCARD,
  printIR,
  Query,
  RelationalTableSource,
  Schema,
  Slice,
  type QueryNode,
  Sort,
  SortDirection,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import {
  TEST__checkedExpressionFilter,
  TEST__expression,
} from '../../__test-utils__/CubeExpressionTestUtils.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import { FAKE_DAILY_ORDERS_SCHEMA } from '../../__test-utils__/FakeCubeDataProductCatalog.js';
import {
  NORTHWIND_DATABASE,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  createFakeNorthwindOutline,
  FAKE_NORTHWIND_OUTLINE,
  type FakeCubeEngine,
} from '../../__test-utils__/FakeCubeEngine.js';
import type {
  CubeModelOutline,
  CubeResult,
} from '../../graph-manager/CubeEngine.js';
import {
  createCubeDataProductModel,
  CUBE_DATA_PRODUCT_RUNTIME_PATH,
  CubeDataProductEnvironmentType,
} from '../../graph-manager/CubeDataProduct.js';
import {
  CUBE_NORTHWIND_MODEL,
  CUBE_NORTHWIND_MODEL_CODE,
} from '../fixtures/CubeNorthwindModel.js';
import {
  CUBE_INGEST_MODEL_TYPE,
  CUBE_INGEST_RUNTIME_PATH,
} from '../../graph-manager/CubeIngest.js';
import {
  CUBE_LAKEHOUSE_RUNTIME_KIND,
  CubeLakehouseRuntimeKind,
  getLakehouseDatabaseType,
} from '../../graph-manager/CubeLakehouseRuntime.js';
import { CubeEditorState } from '../CubeEditorState.js';

// The database type a run is written for (PLAN §11.4), from the runtime's
// connections in the model's outline

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** The Northwind outline, its runtime's connection of this database type */
const outlineOn = createFakeNorthwindOutline;

const OTHER_DATABASE = 'test::Other';

/** The Northwind outline, its runtime connecting Northwind and another database with these types */
const outlineOnTwo = (
  northwindType: string,
  otherType: string,
): CubeModelOutline => ({
  ...FAKE_NORTHWIND_OUTLINE,
  runtimes: [
    {
      path: NORTHWIND_RUNTIME,
      storePaths: [NORTHWIND_DATABASE, OTHER_DATABASE],
      connections: [
        { storePath: NORTHWIND_DATABASE, databaseType: northwindType },
        { storePath: OTHER_DATABASE, databaseType: otherType },
      ],
    },
  ],
});

/** No rows, under the ORDERS columns */
const NO_ORDERS: CubeResult = {
  columns: ORDERS_COLUMNS.map((column) => column.name),
  rows: [],
  sql: [],
  durationMs: 1,
};

/** ORDERS, then the nodes, the last captured */
const ordersThen = (...nodes: QueryNode[]): CubeDocument => {
  const all = [
    northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
    ...nodes,
  ];
  return new CubeDocument({
    context: CONTEXT,
    query: new Query(
      all,
      all
        .slice(1)
        .map(
          (node, index) =>
            new Connection((all[index] as QueryNode).id, node.id, 'tds'),
        ),
      all.at(-1)?.id,
    ),
  });
};

const sortedDrop = (): CubeDocument =>
  ordersThen(
    new Sort('sort101', [
      { column: 'ORDER_ID', direction: SortDirection.DESC },
    ]),
    new Drop('drop101', 10),
  );

/** A cube on the document, its fake engine prepared first: a cube with a table loads its outline as it opens */
const setUp = (
  document: CubeDocument,
  outline?: CubeModelOutline,
  prepare?: (fake: FakeCubeEngine) => void,
): { state: CubeEditorState; fake: FakeCubeEngine } => {
  const { host, fake } = TEST__createCubeHost({
    result: NO_ORDERS,
    pure: 'the Pure',
    ...(outline ? { outline } : {}),
  });
  prepare?.(fake);
  return { state: new CubeEditorState(host, document), fake };
};

/** The lambda the fake engine was asked to run, as text */
const ranLambda = (fake: FakeCubeEngine): string => {
  expect(fake.execute).toHaveBeenCalledTimes(1);
  return printIR(fake.execute.mock.calls[0]?.[1] as never);
};

/** A promise the test settles by hand, to hold the outline's load open */
const held = <T>(): { promise: Promise<T>; resolve: (value: T) => void } => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

beforeEach(() => {
  localStorage.clear();
});

describe('Cube execution: the database type', () => {
  test('Runs a Drop through row numbers, and pads a Distinct, on a SqlServer runtime', async () => {
    const drop = setUp(sortedDrop(), outlineOn('SqlServer'));
    await flowResult(drop.state.execution.execute());
    expect(ranLambda(drop.fake)).toContain(
      '->extend([~ORDER_ID->descending()]->over(), ~[cube_rn: {p, w, r | $p->rowNumber($r)}])->filter({row | $row.cube_rn > 10})',
    );
    expect(drop.state.execution.error).toBeUndefined();
    const distinct = setUp(
      ordersThen(new Distinct('distinct101')),
      outlineOn('SqlServer'),
    );
    await flowResult(distinct.state.execution.execute());
    expect(ranLambda(distinct.fake)).toContain(
      '->distinct()->extend(~cube_d: x | 1)->select(',
    );
  });

  test.each([
    [
      'whatever connections its outline names',
      [{ storePath: 'any::Store', databaseType: 'SqlServer' }],
    ],
    ['with the outline the engine gives it', undefined],
  ])(
    'Writes a Drop the native way on a data product cube, %s: it runs on Snowflake, where its lakehouse runtime routes',
    async (_case, connections) => {
      const daily = new DataProductAccessPointSource(
        'dataProductAccessPoint101',
        {
          dataProduct: 'sales::products::OrdersProduct',
          accessPointGroup: 'core',
          accessPoint: 'daily_orders',
          dataProductId: 'ORDERS_PRODUCT',
          deploymentId: '1234',
        },
        { kind: 'resolved', schema: FAKE_DAILY_ORDERS_SCHEMA },
      );
      const sort = new Sort('sort101', [
        { column: 'ORDER_ID', direction: SortDirection.DESC },
      ]);
      const drop = new Drop('drop101', 10);
      const { host, fake } = TEST__createCubeHost({
        result: {
          columns: FAKE_DAILY_ORDERS_SCHEMA.columns.map(({ name }) => name),
          rows: [],
          sql: [],
          durationMs: 1,
        },
        outline: {
          databases: [],
          runtimes: [
            {
              path: CUBE_DATA_PRODUCT_RUNTIME_PATH,
              storePaths: [],
              ...(connections ? { connections } : {}),
            },
          ],
        },
      });
      const state = new CubeEditorState(
        host,
        new CubeDocument({
          context: {
            model: createCubeDataProductModel({
              groupId: 'com.example.sales',
              artifactId: 'orders-products',
              versionId: '1.4.0',
              environmentType: CubeDataProductEnvironmentType.PRODUCTION,
            }),
            runtime: CUBE_DATA_PRODUCT_RUNTIME_PATH,
          },
          query: new Query(
            [daily, sort, drop],
            [
              new Connection(daily.id, sort.id, 'tds'),
              new Connection(sort.id, drop.id, 'tds'),
            ],
            drop.id,
          ),
        }),
      );
      await flowResult(state.execution.execute());
      const { model, runtime } = state.document.context ?? {};
      expect(
        state.getRunDatabaseType(
          state.document.query,
          drop.id,
          model as never,
          runtime as never,
        ),
      ).toBe('Snowflake');
      const ran = ranLambda(fake);
      expect(ran).toContain('->drop(10)');
      expect(ran).not.toContain('rowNumber');
    },
  );

  test('Writes the native forms on an H2 runtime', async () => {
    const { state, fake } = setUp(sortedDrop());
    await flowResult(state.execution.execute());
    expect(ranLambda(fake)).toContain(
      '->sort(~ORDER_ID->descending())->drop(10)',
    );
    expect(state.execution.result).toBeDefined();
  });

  test('Writes the native forms when the outline fails to load, with no error', async () => {
    const { state, fake } = setUp(sortedDrop(), outlineOn('SqlServer'), (f) =>
      f.loadModel.mockRejectedValueOnce(
        new Error('The model does not compile'),
      ),
    );
    // the run waits for the load the cube started as it opened
    await flowResult(state.execution.execute());
    expect(fake.loadModel).toHaveBeenCalledTimes(1);
    expect(ranLambda(fake)).toContain('->drop(10)');
    expect(state.execution.error).toBeUndefined();
  });

  test('Loads the outline again on the next run after it failed to load, and writes that run for its database', async () => {
    const { state, fake } = setUp(sortedDrop(), outlineOn('SqlServer'), (f) =>
      f.loadModel.mockRejectedValueOnce(new Error('The engine is down')),
    );
    await flowResult(state.execution.execute());
    expect(fake.loadModel).toHaveBeenCalledTimes(1);
    expect(printIR(fake.execute.mock.calls[0]?.[1] as never)).toContain(
      '->drop(10)',
    );
    // the failed load isn't kept: the next run loads the outline again
    await flowResult(state.execution.execute());
    expect(fake.loadModel).toHaveBeenCalledTimes(2);
    expect(printIR(fake.execute.mock.calls[1]?.[1] as never)).toContain(
      '$row.cube_rn > 10',
    );
  });

  test('Loads the outline once, as a cube with a table opens, and a run that needs no database type loads it no more', async () => {
    const { state, fake } = setUp(
      ordersThen(
        new Sort('sort101', [
          { column: 'ORDER_ID', direction: SortDirection.DESC },
        ]),
      ),
      outlineOn('SqlServer'),
    );
    expect(fake.loadModel).toHaveBeenCalledTimes(1);
    await flowResult(state.execution.execute());
    expect(fake.loadModel).toHaveBeenCalledTimes(1);
    expect(ranLambda(fake)).toContain(
      '->sort(~ORDER_ID->descending())->limit(1001)',
    );
  });

  test('Runs a Slice through row numbers on a SqlServer runtime', async () => {
    const { state, fake } = setUp(
      ordersThen(new Slice('slice101', 10, 20)),
      outlineOn('SqlServer'),
    );
    await flowResult(state.execution.execute());
    expect(fake.loadModel).toHaveBeenCalled();
    const ran = ranLambda(fake);
    expect(ran).toContain('$p->rowNumber($r)');
    expect(ran).toContain('($row.cube_rn > 10) && ($row.cube_rn <= 20)');
    expect(ran).not.toContain('->slice(10, 20)');
  });

  test('Runs a Limit after a Sort on two columns through row numbers on a Sybase IQ runtime', async () => {
    const { state, fake } = setUp(
      ordersThen(
        new Sort('sort101', [
          { column: 'CUSTOMER_ID', direction: SortDirection.ASC },
          { column: 'ORDER_ID', direction: SortDirection.DESC },
        ]),
        new Limit('limit101', 5),
      ),
      outlineOn('SybaseIQ'),
    );
    await flowResult(state.execution.execute());
    expect(ranLambda(fake)).toContain('$row.cube_rn <= 5');
  });

  test('Reads the database type of only the databases the run reads', async () => {
    // a table of another database, connected as H2, that the run doesn't read
    const document = sortedDrop();
    const other = new RelationalTableSource(
      'relational201',
      { database: OTHER_DATABASE, schema: 'NORTHWIND', table: 'ORDERS' },
      { kind: 'resolved', schema: new Schema(ORDERS_COLUMNS) },
    );
    const { state, fake } = setUp(
      document.withQuery(
        new Query(
          [...document.query.nodes, other],
          document.query.connections,
          'drop101',
        ),
      ),
      outlineOnTwo('SqlServer', 'H2'),
    );
    expect(state.execution.canExecute).toBe(true);
    await flowResult(state.execution.execute());
    expect(ranLambda(fake)).toContain('$row.cube_rn > 10');
  });

  test('Renders Show Pure as Execute runs it', async () => {
    const { state, fake } = setUp(sortedDrop(), outlineOn('Sybase'));
    await flowResult(state.showPure.open());
    expect(fake.renderPure).toHaveBeenCalledTimes(1);
    expect(printIR(fake.renderPure.mock.calls[0]?.[0] as never)).toContain(
      '$p->rowNumber($r)',
    );
    expect(state.showPure.text).toBe('the Pure');
  });
});

describe('Cube execution: while the outline loads', () => {
  test('Shows Stop at once, and a run stopped while the outline loads shows nothing and runs nothing', async () => {
    const { state, fake } = setUp(sortedDrop(), outlineOn('SqlServer'));
    const outline = held<CubeModelOutline>();
    fake.loadModel.mockReturnValueOnce(outline.promise);
    const run = flowResult(state.execution.execute());
    expect(state.execution.isRunning).toBe(true);
    state.execution.stop();
    outline.resolve(outlineOn('SqlServer'));
    await run;
    expect(fake.execute).not.toHaveBeenCalled();
    expect(state.execution.result).toBeUndefined();
    expect(state.execution.error).toBeUndefined();
    expect(state.execution.isRunning).toBe(false);
  });

  test('Ignores a second Execute while the outline loads', async () => {
    const { state, fake } = setUp(sortedDrop(), outlineOn('SqlServer'));
    const outline = held<CubeModelOutline>();
    fake.loadModel.mockReturnValueOnce(outline.promise);
    const run = flowResult(state.execution.execute());
    await flowResult(state.execution.execute());
    outline.resolve(outlineOn('SqlServer'));
    await run;
    expect(fake.execute).toHaveBeenCalledTimes(1);
  });

  test('Runs the query it started with, though the cube changes while the outline loads', async () => {
    const { state, fake } = setUp(sortedDrop(), outlineOn('SqlServer'));
    const started = state.document.query;
    const outline = held<CubeModelOutline>();
    fake.loadModel.mockReturnValueOnce(outline.promise);
    const run = flowResult(state.execution.execute());
    state.applyQuery(started.replace(new Drop('drop101', 20)));
    outline.resolve(outlineOn('SqlServer'));
    await run;
    expect(ranLambda(fake)).toContain('$row.cube_rn > 10');
    expect(state.execution.result?.query === started).toBe(true);
    // the cube changed: the result is stale
    expect(state.execution.isStale).toBe(true);
  });

  test('Runs on the database it started with, though the table moves to a database of another type while the outline loads', async () => {
    const { state, fake } = setUp(
      sortedDrop(),
      outlineOnTwo('SqlServer', 'H2'),
    );
    const started = state.document.query;
    const outline = held<CubeModelOutline>();
    fake.loadModel.mockReturnValueOnce(outline.promise);
    const run = flowResult(state.execution.execute());
    state.applyQuery(
      started.replace(
        new RelationalTableSource(
          'relational101',
          { database: OTHER_DATABASE, schema: 'NORTHWIND', table: 'ORDERS' },
          { kind: 'resolved', schema: new Schema(ORDERS_COLUMNS) },
        ),
      ),
    );
    outline.resolve(outlineOnTwo('SqlServer', 'H2'));
    await run;
    const ran = ranLambda(fake);
    expect(ran).toContain('$row.cube_rn > 10');
    expect(ran).toContain(NORTHWIND_DATABASE);
    expect(state.execution.result?.query === started).toBe(true);
  });

  test('Shows nothing in a Show Pure closed while the outline loads', async () => {
    const { state, fake } = setUp(sortedDrop(), outlineOn('SqlServer'));
    const outline = held<CubeModelOutline>();
    fake.loadModel.mockReturnValueOnce(outline.promise);
    const open = flowResult(state.showPure.open());
    expect(state.showPure.isRendering).toBe(true);
    state.showPure.close();
    outline.resolve(outlineOn('SqlServer'));
    await open;
    expect(fake.renderPure).not.toHaveBeenCalled();
    expect(state.showPure.isOpen).toBe(false);
    expect(state.showPure.text).toBeUndefined();
    expect(state.showPure.isRendering).toBe(false);
  });
});

describe('Cube on DuckDB: patterns given % or _', () => {
  /** A Filter of SHIP_COUNTRY with this operator and value */
  const filterOf = (operator: FilterOperator, value: string): Filter =>
    new Filter(
      'filter101',
      new ColumnComparisonFilter('SHIP_COUNTRY', operator, {
        kind: 'string',
        value,
      }),
    );
  /** `x | $x.SHIP_NAME->toOne()->endsWith(<value>)`, checked for ORDERS */
  const endsWithOf = (value: string): ExpressionFilter =>
    TEST__checkedExpressionFilter(
      'expressionFilter101',
      ordersThen().query,
      `x | $x.SHIP_NAME->toOne()->endsWith('${value}')`,
      TEST__expression.lambda(
        TEST__expression.call(
          'endsWith',
          TEST__expression.call('toOne', TEST__expression.column('SHIP_NAME')),
          TEST__expression.string(value),
        ),
      ),
    );
  /** Lets the outline the cube loads by itself arrive */
  const settle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  test("Refuses a column Filter's pattern given % or _, negated or not, once the outline it loads by itself names DuckDB, and runs nothing", async () => {
    const { state, fake } = setUp(
      ordersThen(filterOf(FilterOperator.DOES_NOT_CONTAIN, '50%')),
      outlineOn('DuckDB'),
    );
    await settle();
    expect(fake.loadModel).toHaveBeenCalledTimes(1);
    expect(state.getNodeErrors('filter101')).toEqual([
      MESSAGE_FILTER_VALUE_WILDCARD('does not contain', 'DuckDB'),
    ]);
    await flowResult(state.execution.execute());
    expect(fake.execute).not.toHaveBeenCalled();
  });

  test("Refuses a Filter by Expression's endsWith given _ on DuckDB", async () => {
    const { state } = setUp(ordersThen(endsWithOf('a_b')), outlineOn('DuckDB'));
    await settle();
    expect(state.getNodeErrors('expressionFilter101')).toEqual([
      MESSAGE_CONDITION_WILDCARD('endsWith', 'DuckDB'),
    ]);
  });

  test('Runs them on H2, with the value as it is', async () => {
    const { state, fake } = setUp(
      ordersThen(filterOf(FilterOperator.STARTS_WITH, '50%')),
      outlineOn('H2'),
    );
    await settle();
    expect(state.getNodeErrors('filter101')).toEqual([]);
    await flowResult(state.execution.execute());
    expect(ranLambda(fake)).toContain("$row.SHIP_COUNTRY->startsWith('50%')");
  });

  test("Loads the new model's outline when an import changes the model under such a filter", async () => {
    const { state, fake } = setUp(
      ordersThen(filterOf(FilterOperator.CONTAINS, '50%')),
      outlineOn('H2'),
    );
    await settle();
    expect(state.getNodeErrors('filter101')).toEqual([]);
    // another model's text, as the catalog keeps outlines by it
    const otherModel = {
      _type: 'text',
      code: `${CUBE_NORTHWIND_MODEL_CODE}\n`,
    };
    fake.loadModel.mockResolvedValueOnce(outlineOn('DuckDB'));
    state.importDocument(
      new CubeDocument({
        context: { ...CONTEXT, model: otherModel },
        query: state.document.query,
      }),
      false,
    );
    await settle();
    expect(fake.loadModel.mock.calls.at(-1)?.[0] === otherModel).toBe(true);
    expect(state.getNodeErrors('filter101')).toEqual([
      MESSAGE_FILTER_VALUE_WILDCARD('contains', 'DuckDB'),
    ]);
  });

  test('Runs a filter with no % or _ in a pattern, nor one in an Equal, on DuckDB', async () => {
    const { state, fake } = setUp(
      ordersThen(
        new Filter(
          'filter101',
          new CompositeFilter(CompositeFilterOperator.AND, [
            new ColumnComparisonFilter(
              'SHIP_COUNTRY',
              FilterOperator.CONTAINS,
              { kind: 'string', value: 'ance' },
            ),
            new ColumnComparisonFilter('SHIP_NAME', FilterOperator.EQUAL, {
              kind: 'string',
              value: '50%',
            }),
          ]),
        ),
      ),
      outlineOn('DuckDB'),
    );
    await settle();
    expect(state.getNodeErrors('filter101')).toEqual([]);
    await flowResult(state.execution.execute());
    expect(fake.loadModel).toHaveBeenCalledTimes(1);
    expect(fake.execute).toHaveBeenCalledTimes(1);
  });

  test('Refuses a run started before the outline names DuckDB, with the message, and asks the engine nothing', async () => {
    const { state, fake } = setUp(
      ordersThen(filterOf(FilterOperator.CONTAINS, '_')),
      outlineOn('DuckDB'),
    );
    // the run starts while the outline the cube asked for is on its way:
    // the filter is valid then, so the run itself refuses it, for DuckDB
    expect(state.execution.canExecute).toBe(true);
    await flowResult(state.execution.execute());
    expect(fake.execute).not.toHaveBeenCalled();
    expect(state.execution.error?.message ?? '').toContain(
      MESSAGE_FILTER_VALUE_WILDCARD('contains', 'DuckDB'),
    );
    // and the filter is refused from then on
    expect(state.execution.canExecute).toBe(false);
  });
});

describe('Cube databases: Pivot, and the lakehouse runtimes', () => {
  /** SHIP_VIA's 1 by SHIP_COUNTRY, counting rows */
  const pivotOf = (): Pivot =>
    new Pivot(
      'pivot101',
      ['SHIP_COUNTRY'],
      'SHIP_VIA',
      [{ kind: 'integer', value: '1' }],
      DEFAULT_PIVOT_AGGREGATION,
    );
  /** Lets the outline the cube loads as it opens arrive */
  const settle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  test('Refuses a Pivot on an H2 cube once the outline is in, says why one would be refused there, and allows it on DuckDB', async () => {
    const h2 = setUp(ordersThen(pivotOf()), outlineOn('H2'));
    // before the outline arrives, the database isn't known
    expect(
      h2.state.getAddDatabaseProblem('pivot', 'relational101'),
    ).toBeUndefined();
    await settle();
    expect(h2.state.getNodeErrors('pivot101')).toEqual([
      MESSAGE_PIVOT_UNSUPPORTED_DATABASE('H2'),
    ]);
    expect(h2.state.getAddDatabaseProblem('pivot', 'relational101')).toBe(
      MESSAGE_PIVOT_UNSUPPORTED_DATABASE('H2'),
    );
    expect(
      h2.state.getAddDatabaseProblem('group', 'relational101'),
    ).toBeUndefined();
    // added after nothing, it reads no database
    expect(h2.state.getAddDatabaseProblem('pivot', undefined)).toBeUndefined();
    const duckDb = setUp(ordersThen(pivotOf()), outlineOn('DuckDB'));
    await settle();
    expect(duckDb.state.getNodeErrors('pivot101')).toEqual([]);
    expect(
      duckDb.state.getAddDatabaseProblem('pivot', 'relational101'),
    ).toBeUndefined();
  });

  test('Maps each lakehouse runtime to the database it routes to, an ingest cube to Snowflake too', () => {
    expect(getLakehouseDatabaseType(CubeLakehouseRuntimeKind.LAKEHOUSE)).toBe(
      'Snowflake',
    );
    expect(
      getLakehouseDatabaseType(CubeLakehouseRuntimeKind.SINGLE_STORE),
    ).toBe('MemSQL');
    expect(getLakehouseDatabaseType('LakehouseDatabricksRuntime')).toBe(
      undefined,
    );
    expect(CUBE_LAKEHOUSE_RUNTIME_KIND).toBe('LakehouseRuntime');
    const { state } = setUp(ordersThen());
    expect(
      state.getRunDatabaseType(
        state.document.query,
        'relational101',
        { _type: CUBE_INGEST_MODEL_TYPE } as never,
        CUBE_INGEST_RUNTIME_PATH,
      ),
    ).toBe('Snowflake');
  });

  test('Keeps one outline per model content: a cube imported on the same model loads it no more', async () => {
    const { state, fake } = setUp(ordersThen(), outlineOn('H2'));
    await settle();
    expect(fake.loadModel).toHaveBeenCalledTimes(1);
    state.importDocument(
      new CubeDocument({
        context: { ...CONTEXT, model: { ...CUBE_NORTHWIND_MODEL } },
        query: state.document.query,
      }),
      false,
    );
    await settle();
    expect(fake.loadModel).toHaveBeenCalledTimes(1);
    expect(state.modelOutline).toBeDefined();
  });
});
