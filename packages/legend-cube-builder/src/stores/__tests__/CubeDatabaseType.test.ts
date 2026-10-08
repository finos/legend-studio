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
  Distinct,
  Drop,
  Limit,
  printIR,
  Query,
  type QueryNode,
  Sort,
  SortDirection,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
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

  test('Loads no outline for a query without a Drop, Slice or Distinct', async () => {
    const { state, fake } = setUp(
      ordersThen(new Limit('limit101', 5)),
      outlineOn('SqlServer'),
    );
    await flowResult(state.execution.execute());
    expect(fake.loadModel).not.toHaveBeenCalled();
    expect(ranLambda(fake)).toContain('->limit(5)');
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
    expect(state.execution.result?.query).toBe(started);
    // the cube changed: the result is stale
    expect(state.execution.isStale).toBe(true);
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
