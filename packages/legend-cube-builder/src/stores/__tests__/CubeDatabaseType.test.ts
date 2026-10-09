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
  Connection,
  CubeDocument,
  DataProductAccessPointSource,
  Distinct,
  Drop,
  Limit,
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
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import { FAKE_DAILY_ORDERS_SCHEMA } from '../../__test-utils__/FakeCubeDataProductCatalog.js';
import {
  NORTHWIND_DATABASE,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import {
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
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../CubeEditorState.js';

// The database type a run is written for (PLAN §11.4), from the runtime's
// connections in the model's outline

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** The Northwind outline, its runtime's connection of this database type */
const outlineOn = (databaseType: string): CubeModelOutline => ({
  ...FAKE_NORTHWIND_OUTLINE,
  runtimes: [
    {
      path: NORTHWIND_RUNTIME,
      storePaths: [NORTHWIND_DATABASE],
      connections: [{ storePath: NORTHWIND_DATABASE, databaseType }],
    },
  ],
});

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

const setUp = (
  document: CubeDocument,
  outline?: CubeModelOutline,
): { state: CubeEditorState; fake: FakeCubeEngine } => {
  const { host, fake } = TEST__createCubeHost({
    result: NO_ORDERS,
    pure: 'the Pure',
    ...(outline ? { outline } : {}),
  });
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
    'Writes a Drop the native way on a data product cube, %s: it reads no database',
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
      expect(fake.loadModel).toHaveBeenCalled();
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
    const { state, fake } = setUp(sortedDrop(), outlineOn('SqlServer'));
    fake.loadModel.mockRejectedValueOnce(
      new Error('The model does not compile'),
    );
    await flowResult(state.execution.execute());
    expect(ranLambda(fake)).toContain('->drop(10)');
    expect(state.execution.error).toBeUndefined();
  });

  test('Loads no outline for a query without a Drop, Slice, Limit or Distinct', async () => {
    const { state, fake } = setUp(
      ordersThen(
        new Sort('sort101', [
          { column: 'ORDER_ID', direction: SortDirection.DESC },
        ]),
      ),
      outlineOn('SqlServer'),
    );
    await flowResult(state.execution.execute());
    expect(fake.loadModel).not.toHaveBeenCalled();
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
