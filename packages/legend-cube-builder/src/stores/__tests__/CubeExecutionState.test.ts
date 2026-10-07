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
  ColumnComparisonFilter,
  CubeDocument,
  Filter,
  FilterOperator,
  Join,
  JoinType,
  printIR,
  Query,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  NORTHWIND_DATABASE,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import type { FakeCubeEngine } from '../../__test-utils__/FakeCubeEngine.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeResult,
  type CubeResultValue,
} from '../../graph-manager/CubeEngine.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../CubeEditorState.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** ORDERS alone, captured */
const ordersQuery = (): Query =>
  new Query(
    [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
    [],
    'relational101',
  );

/** `count` ORDERS rows: one value per column, the ORDER_ID first */
const ordersResult = (count: number): CubeResult => ({
  columns: ORDERS_COLUMNS.map((column) => column.name),
  rows: Array.from({ length: count }, (_, index) =>
    ORDERS_COLUMNS.map(
      (_column, position): CubeResultValue =>
        position === 0 ? String(10248 + index) : null,
    ),
  ),
  sql: ['select * from NORTHWIND.ORDERS'],
  durationMs: 12,
});

const setUp = (
  document = new CubeDocument({ context: CONTEXT, query: ordersQuery() }),
): { state: CubeEditorState; fake: FakeCubeEngine } => {
  const { host, fake } = TEST__createCubeHost({ result: ordersResult(3) });
  return { state: new CubeEditorState(host, document), fake };
};

/** A promise the test settles by hand, to hold a run open */
const deferred = <T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  localStorage.clear();
});

describe('Cube execution: when it can run', () => {
  test('Runs a valid capture node even when a node elsewhere is invalid', () => {
    const stray = new Filter(
      'filter102',
      new ColumnComparisonFilter('NOPE', FilterOperator.EQUAL, {
        kind: 'string',
        value: 'x',
      }),
    );
    const query = sliceQuery().add(stray).select('join101');
    const { state } = setUp(new CubeDocument({ context: CONTEXT, query }));
    expect(state.analysis.validity.get('filter102')?.length).toBeGreaterThan(0);
    expect(state.execution.disabledReasons).toEqual([]);
    expect(state.execution.canExecute).toBe(true);
  });

  test("Doesn't run a capture node with an invalid input, and names that input's error", () => {
    const badFilter = new ColumnComparisonFilter('NOPE', FilterOperator.EQUAL, {
      kind: 'string',
      value: 'x',
    });
    const { state } = setUp(
      new CubeDocument({ context: CONTEXT, query: sliceQuery(badFilter) }),
    );
    const filterErrors = state.analysis.validity.get('filter101') ?? [];
    expect(state.execution.canExecute).toBe(false);
    expect(state.execution.disabledReasons).toEqual([
      `${state.document.query.getNode('filter101')?.describe()}: ${filterErrors[0]}`,
    ]);
  });

  test('Names the input whose error made the capture node invalid, not the capture node', () => {
    // the join has no keys, so the filter after it is invalid only because of it
    const query = new Query(
      sliceQuery().nodes.map((node) =>
        node.id === 'join101'
          ? new Join('join101', {
              leftColumns: [],
              rightColumns: [],
              joinType: JoinType.INNER,
            })
          : node,
      ),
      sliceQuery().connections,
      'filter101',
    );
    const { state } = setUp(new CubeDocument({ context: CONTEXT, query }));
    const [reason] = state.execution.disabledReasons;
    expect(reason).toContain(query.getNode('join101')?.describe() ?? '?');
    expect(reason).not.toContain('depends on some invalid inputs');
  });

  test("Doesn't run an empty query, or a cube with no model or no runtime", () => {
    expect(setUp(new CubeDocument()).state.execution.disabledReasons).toEqual([
      'Add a table first.',
    ]);
    expect(
      setUp(new CubeDocument({ query: ordersQuery() })).state.execution
        .disabledReasons,
    ).toEqual(['The cube has no model.']);
    expect(
      setUp(
        new CubeDocument({
          context: { model: CUBE_NORTHWIND_MODEL },
          query: ordersQuery(),
        }),
      ).state.execution.disabledReasons,
    ).toEqual(['The cube has no runtime.']);
  });
});

describe('Cube execution: a run', () => {
  test('Sends the cube model and the capture lambda, one row past the limit, from the runtime', async () => {
    const { state, fake } = setUp();
    state.setRowLimit(5);
    await flowResult(state.execution.execute());
    expect(fake.execute).toHaveBeenCalledTimes(1);
    const [model, lambda, options] = fake.execute.mock.calls[0] ?? [];
    expect(model).toBe(CUBE_NORTHWIND_MODEL);
    expect(printIR(lambda as never)).toBe(
      `{| #>{${NORTHWIND_DATABASE}.NORTHWIND.ORDERS}#->limit(6)->from(${NORTHWIND_RUNTIME})}`,
    );
    expect(options?.abortController).toBeInstanceOf(AbortController);
  });

  test('Shows the rows under the schema the run was made with', async () => {
    const { state } = setUp();
    await flowResult(state.execution.execute());
    const { result, error } = state.execution;
    expect(error).toBeUndefined();
    expect(result?.schema.columns.map((column) => column.name)).toEqual(
      ORDERS_COLUMNS.map((column) => column.name),
    );
    expect(result?.rows.map((row) => row[0])).toEqual([
      '10248',
      '10249',
      '10250',
    ]);
    expect(result?.limited).toBe(false);
    expect(result?.sql).toEqual(['select * from NORTHWIND.ORDERS']);
    expect(result?.durationMs).toBe(12);
  });

  test('Keeps `limit` rows of a run that returned one more, and says it was cut', async () => {
    const { state, fake } = setUp();
    const response = ordersResult(3);
    fake.execute.mockResolvedValue(response);
    state.setRowLimit(2);
    await flowResult(state.execution.execute());
    expect(state.execution.result?.rows).toHaveLength(2);
    expect(state.execution.result?.limited).toBe(true);
    expect(state.execution.result?.rowLimit).toBe(2);
    // the port's rows are left as they are
    expect(response.rows).toHaveLength(3);
  });

  test('Shows a failed run as an error on the node the engine named, with no rows', async () => {
    const { state, fake } = setUp(
      new CubeDocument({ context: CONTEXT, query: sliceQuery() }),
    );
    fake.execute.mockResolvedValueOnce({ ...ordersResult(1), columns: [] });
    fake.execute.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        `The column 'REMOVED' can't be found in the relation\nmore`,
        'join101',
      ),
    );
    // the first answer has the wrong columns
    await flowResult(state.execution.execute());
    expect(state.execution.error?.kind).toBe(CubeEngineErrorKind.EXECUTION);
    expect(state.execution.error?.nodeId).toBe('filter101');
    expect(state.hostIssues.get('filter101')?.firstLine).toContain(
      'returned 0 columns',
    );
    await flowResult(state.execution.execute());
    expect(state.execution.result).toBeUndefined();
    expect(state.execution.error?.firstLine).toBe(
      `The column 'REMOVED' can't be found in the relation`,
    );
    expect([...state.hostIssues.keys()]).toEqual(['join101']);
    expect(state.hostIssues.get('join101')?.detail).toContain('more');
  });

  test('Shows an error without a node on the capture node', async () => {
    const { state, fake } = setUp();
    fake.execute.mockRejectedValue(new Error('socket hang up'));
    await flowResult(state.execution.execute());
    expect(state.execution.error?.kind).toBe(CubeEngineErrorKind.EXECUTION);
    expect(state.hostIssues.get('relational101')?.firstLine).toBe(
      'socket hang up',
    );
  });

  test('Clears the last error and engine errors when a new run starts', async () => {
    const { state, fake } = setUp();
    fake.execute.mockRejectedValueOnce(new Error('down'));
    await flowResult(state.execution.execute());
    expect(state.hostIssues.size).toBe(1);
    await flowResult(state.execution.execute());
    expect(state.execution.error).toBeUndefined();
    expect(state.hostIssues.size).toBe(0);
    expect(state.execution.result?.rows).toHaveLength(3);
  });
});

describe('Cube execution: stopping and staleness', () => {
  test('Runs one query at a time', async () => {
    const { state, fake } = setUp();
    const held = deferred<CubeResult>();
    fake.execute.mockReturnValueOnce(held.promise);
    const run = flowResult(state.execution.execute());
    expect(state.execution.isRunning).toBe(true);
    await flowResult(state.execution.execute());
    expect(fake.execute).toHaveBeenCalledTimes(1);
    held.resolve(ordersResult(1));
    await run;
    expect(state.execution.isRunning).toBe(false);
    expect(state.execution.result?.rows).toHaveLength(1);
  });

  test('Stops a run: its request is cancelled and it shows nothing, even when it answers later', async () => {
    const { state, fake } = setUp();
    const held = deferred<CubeResult>();
    fake.execute.mockReturnValueOnce(held.promise);
    const run = flowResult(state.execution.execute());
    const signal = fake.execute.mock.calls[0]?.[2]?.abortController?.signal;
    state.execution.stop();
    expect(signal?.aborted).toBe(true);
    expect(state.execution.isRunning).toBe(false);
    held.reject(
      new CubeEngineError(
        CubeEngineErrorKind.NETWORK,
        'aborted',
        'relational101',
      ),
    );
    await run;
    expect(state.execution.error).toBeUndefined();
    expect(state.execution.result).toBeUndefined();
    expect(state.hostIssues.size).toBe(0);
  });

  test('Ignores the late answer of a stopped run once a new run has started', async () => {
    const { state, fake } = setUp();
    const first = deferred<CubeResult>();
    fake.execute.mockReturnValueOnce(first.promise);
    const firstRun = flowResult(state.execution.execute());
    state.execution.stop();
    await flowResult(state.execution.execute());
    expect(state.execution.result?.rows).toHaveLength(3);
    first.resolve(ordersResult(1));
    await firstRun;
    expect(state.execution.result?.rows).toHaveLength(3);
  });

  test('Stops the run when the page closes', async () => {
    const { state, fake } = setUp();
    const held = deferred<CubeResult>();
    fake.execute.mockReturnValueOnce(held.promise);
    const run = flowResult(state.execution.execute());
    state.dispose();
    expect(
      fake.execute.mock.calls[0]?.[2]?.abortController?.signal.aborted,
    ).toBe(true);
    held.resolve(ordersResult(1));
    await run;
    expect(state.execution.result).toBeUndefined();
  });

  test('Marks the shown rows stale when the query or the row limit changes, not when the name does', async () => {
    const { state, fake } = setUp(
      new CubeDocument({ context: CONTEXT, query: sliceQuery() }),
    );
    fake.execute.mockResolvedValue({
      ...ordersResult(0),
      columns:
        state.analysis.schemas
          .get('filter101')
          ?.columns.map((column) => column.name) ?? [],
    });
    expect(state.execution.isStale).toBe(false);
    await flowResult(state.execution.execute());
    expect(state.execution.isStale).toBe(false);
    state.applyDocument(state.document.withName('France'));
    expect(state.execution.isStale).toBe(false);
    state.select('join101');
    expect(state.execution.isStale).toBe(true);
    // the rows stay, and nothing runs again
    expect(state.execution.result).toBeDefined();
    expect(fake.execute).toHaveBeenCalledTimes(1);
    state.select('filter101');
    expect(state.execution.isStale).toBe(true);
    await flowResult(state.execution.execute());
    expect(state.execution.isStale).toBe(false);
    state.setRowLimit(10);
    expect(state.execution.isStale).toBe(true);
  });
});
