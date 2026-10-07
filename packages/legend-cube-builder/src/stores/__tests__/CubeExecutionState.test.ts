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
  RelationalTableSource,
  Schema,
} from '@finos/legend-cube';
import { flowResult, isObservable } from 'mobx';
import { DEFAULT_ROW_LIMIT } from '../../__lib__/LegendCubeLabels.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  CUSTOMERS_COLUMNS,
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

/** ORDERS and CUSTOMERS side by side, ORDERS captured */
const twoTablesQuery = (): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
      northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
    ],
    [],
    'relational101',
  );

/** `count` rows of nulls under the columns of `schema`, as the engine names them */
const resultUnder = (schema: Schema | undefined, count: number): CubeResult => {
  const names = schema?.columns.map((column) => column.name) ?? [];
  return {
    columns: names,
    rows: Array.from({ length: count }, () => names.map(() => null)),
    sql: ['select 1'],
    durationMs: 1,
  };
};

/** A schema's columns as text, name, type and NULLs, for readable failures */
const describeColumns = (schema: Schema | undefined): string[] =>
  schema?.columns.map(
    (column) =>
      `${column.name}: ${column.type.fullName}${column.nullable ? '[0..1]' : '[1]'}`,
  ) ?? [];

const setUp = (
  document = new CubeDocument({ context: CONTEXT, query: ordersQuery() }),
): { state: CubeEditorState; fake: FakeCubeEngine } => {
  const { host, fake } = TEST__createCubeHost({ result: ordersResult(3) });
  return { state: new CubeEditorState(host, document), fake };
};

/** A promise the test settles by hand, to hold a run open */
interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

const deferred = <T>(): Deferred<T> => {
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

  test("Doesn't run a capture node whose only error is a query-level rule", () => {
    const otherDatabase = new RelationalTableSource(
      'relational102',
      { database: 'other::Database', schema: 'NORTHWIND', table: 'ORDERS' },
      { kind: 'resolved', schema: new Schema(ORDERS_COLUMNS) },
    );
    const query = new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        otherDatabase,
      ],
      [],
      'relational102',
    );
    const { state } = setUp(new CubeDocument({ context: CONTEXT, query }));
    expect(state.execution.canExecute).toBe(false);
    const [reason] = state.execution.disabledReasons;
    expect(reason).toContain(otherDatabase.describe());
    expect(reason).toContain(
      'Sources from different databases are not supported yet',
    );
    // the rule puts its error on the later table only
    state.select('relational101');
    expect(state.execution.canExecute).toBe(true);
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

  test("Holds the result by reference: the rows are the engine's own, never observed deeply", async () => {
    const { state, fake } = setUp();
    const response = ordersResult(3);
    fake.execute.mockResolvedValueOnce(response);
    await flowResult(state.execution.execute());
    const { result } = state.execution;
    expect(result).toBeDefined();
    expect(result?.rows).toBe(response.rows);
    expect(isObservable(result)).toBe(false);
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
    expect(isObservable(state.execution.result?.rows)).toBe(false);
    // the port's rows are left as they are
    expect(response.rows).toHaveLength(3);
  });

  test('Shows every row, and says nothing was cut, when a run returns exactly `limit` rows', async () => {
    const { state } = setUp();
    state.setRowLimit(3);
    await flowResult(state.execution.execute());
    expect(state.execution.result?.rows).toHaveLength(3);
    expect(state.execution.result?.limited).toBe(false);
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

  test("Shows an answer whose columns aren't the query's, position by position, as an error on the capture node", async () => {
    const { state, fake } = setUp();
    const names = ORDERS_COLUMNS.map((column) => column.name);
    // the same columns in another order
    fake.execute.mockResolvedValueOnce({
      ...ordersResult(2),
      columns: [...names].reverse(),
    });
    await flowResult(state.execution.execute());
    expect(state.execution.result).toBeUndefined();
    expect(state.execution.error?.kind).toBe(CubeEngineErrorKind.EXECUTION);
    expect(state.execution.error?.nodeId).toBe('relational101');
    expect(state.hostIssues.get('relational101')?.firstLine).toBe(
      'The engine returned the column "SHIP_COUNTRY" at position 1, but the query has "ORDER_ID" there',
    );
    // one column named differently, further along
    fake.execute.mockResolvedValueOnce({
      ...ordersResult(2),
      columns: names.map((name) => (name === 'SHIP_CITY' ? 'CITY' : name)),
    });
    await flowResult(state.execution.execute());
    expect(state.execution.result).toBeUndefined();
    expect(state.execution.error?.kind).toBe(CubeEngineErrorKind.EXECUTION);
    expect(state.hostIssues.get('relational101')?.firstLine).toBe(
      'The engine returned the column "CITY" at position 11, but the query has "SHIP_CITY" there',
    );
  });

  test('A failed run clears the rows of the run before it', async () => {
    const { state, fake } = setUp();
    await flowResult(state.execution.execute());
    expect(state.execution.result?.rows).toHaveLength(3);
    fake.execute.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        'bad\nmore',
        'relational101',
      ),
    );
    await flowResult(state.execution.execute());
    expect(state.execution.error?.firstLine).toBe('bad');
    expect(state.hostIssues.get('relational101')?.firstLine).toBe('bad');
    expect(state.execution.result).toBeUndefined();
    expect(state.execution.isStale).toBe(false);
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

  test.each([
    [
      'answers',
      (run: Deferred<CubeResult>): void => run.resolve(ordersResult(1)),
    ],
    [
      'fails',
      (run: Deferred<CubeResult>): void =>
        run.reject(
          new CubeEngineError(
            CubeEngineErrorKind.NETWORK,
            'aborted',
            'relational101',
          ),
        ),
    ],
  ])(
    'Keeps the next run going when a stopped run %s late',
    async (_settlement, settle) => {
      const { state, fake } = setUp();
      const first = deferred<CubeResult>();
      const second = deferred<CubeResult>();
      fake.execute
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      const firstRun = flowResult(state.execution.execute());
      state.execution.stop();
      const secondRun = flowResult(state.execution.execute());
      settle(first);
      await firstRun;
      expect(state.execution.isRunning).toBe(true);
      expect(state.execution.result).toBeUndefined();
      expect(state.execution.error).toBeUndefined();
      // Execute is still Stop: no third request
      await flowResult(state.execution.execute());
      expect(fake.execute).toHaveBeenCalledTimes(2);
      second.resolve(ordersResult(2));
      await secondRun;
      expect(state.execution.isRunning).toBe(false);
      expect(state.execution.result?.rows).toHaveLength(2);
    },
  );

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

  test("Doesn't mark the rows stale while the run that refreshes them is in flight", async () => {
    const { state, fake } = setUp();
    await flowResult(state.execution.execute());
    state.setRowLimit(10);
    expect(state.execution.isStale).toBe(true);
    const held = deferred<CubeResult>();
    fake.execute.mockReturnValueOnce(held.promise);
    const run = flowResult(state.execution.execute());
    expect(state.execution.isRunning).toBe(true);
    // the earlier rows stay while the run is in flight
    expect(state.execution.result?.rowLimit).toBe(DEFAULT_ROW_LIMIT);
    expect(state.execution.isStale).toBe(false);
    held.resolve(ordersResult(3));
    await run;
    expect(state.execution.result?.rowLimit).toBe(10);
    expect(state.execution.isStale).toBe(false);
  });

  test('Keeps the schema the rows ran with once they are stale', async () => {
    const { state } = setUp(
      new CubeDocument({ context: CONTEXT, query: twoTablesQuery() }),
    );
    await flowResult(state.execution.execute());
    const schema = state.execution.result?.schema;
    const ordersColumns = describeColumns(new Schema(ORDERS_COLUMNS));
    expect(describeColumns(schema)).toEqual(ordersColumns);
    state.select('relational102');
    expect(state.execution.isStale).toBe(true);
    expect(describeColumns(state.execution.result?.schema)).toEqual(
      ordersColumns,
    );
    // the very schema the run kept
    expect(state.execution.result?.schema === schema).toBe(true);
  });
});

describe('Cube execution: edits while a run is in flight', () => {
  test('Keeps the schema the run started with when the selection changes during the run', async () => {
    const { state, fake } = setUp(
      new CubeDocument({ context: CONTEXT, query: sliceQuery() }),
    );
    const filterSchema = state.analysis.schemas.get('filter101');
    const held = deferred<CubeResult>();
    fake.execute.mockReturnValueOnce(held.promise);
    const run = flowResult(state.execution.execute());
    state.select('relational102');
    held.resolve(resultUnder(filterSchema, 2));
    await run;
    const { result, error } = state.execution;
    expect(error).toBeUndefined();
    expect(result?.rows).toHaveLength(2);
    expect(result?.query.selected).toBe('filter101');
    expect(describeColumns(filterSchema)).not.toEqual(
      describeColumns(state.analysis.schemas.get('relational102')),
    );
    expect(describeColumns(result?.schema)).toEqual(
      describeColumns(filterSchema),
    );
    expect(state.execution.isStale).toBe(true);
  });

  test('Keeps the schema the run started with when the capture node is replaced during the run', async () => {
    const { state, fake } = setUp();
    const held = deferred<CubeResult>();
    fake.execute.mockReturnValueOnce(held.promise);
    const run = flowResult(state.execution.execute());
    // the same node id, now on another table
    state.applyQuery(
      state.document.query.replace(
        northwindTable('relational101', 'CUSTOMERS', CUSTOMERS_COLUMNS),
      ),
    );
    held.resolve(ordersResult(2));
    await run;
    const { result, error } = state.execution;
    const ordersColumns = describeColumns(new Schema(ORDERS_COLUMNS));
    expect(error).toBeUndefined();
    expect(result?.rows).toHaveLength(2);
    expect(result?.query.selected).toBe('relational101');
    expect(
      describeColumns(state.analysis.schemas.get('relational101')),
    ).toEqual(describeColumns(new Schema(CUSTOMERS_COLUMNS)));
    expect(describeColumns(result?.schema)).toEqual(ordersColumns);
    expect(state.execution.isStale).toBe(true);
  });

  /**
   * Runs the slice once, then holds a second run, makes `edit` while it is in
   * flight, and fails it on the filter
   */
  const failRunAfter = async (
    edit: (state: CubeEditorState) => void,
  ): Promise<CubeEditorState> => {
    const { state, fake } = setUp(
      new CubeDocument({ context: CONTEXT, query: sliceQuery() }),
    );
    fake.execute.mockResolvedValue(
      resultUnder(state.analysis.schemas.get('filter101'), 2),
    );
    await flowResult(state.execution.execute());
    expect(state.execution.result?.rows).toHaveLength(2);
    const held = deferred<CubeResult>();
    fake.execute.mockReturnValueOnce(held.promise);
    const run = flowResult(state.execution.execute());
    expect(state.execution.isRunning).toBe(true);
    edit(state);
    held.reject(
      new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        `The column 'SHIP_COUNTRY' is wrong\nmore`,
        'filter101',
      ),
    );
    await run;
    expect(state.execution.isRunning).toBe(false);
    return state;
  };

  test('Drops the error of a run that fails after another node was selected, and its rows', async () => {
    const state = await failRunAfter((editor) => editor.select('join101'));
    expect(state.execution.error).toBeUndefined();
    expect(state.hostIssues.size).toBe(0);
    expect(state.execution.result).toBeUndefined();
  });

  test('Drops the error of a run that fails after the node it names was edited', async () => {
    const germany = new Filter(
      'filter101',
      new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
        kind: 'string',
        value: 'Germany',
      }),
    );
    const state = await failRunAfter((editor) =>
      editor.applyQuery(editor.document.query.replace(germany)),
    );
    expect(state.document.query.getNode('filter101')).toBe(germany);
    expect(state.execution.error).toBeUndefined();
    expect(state.hostIssues.size).toBe(0);
    expect(state.execution.result).toBeUndefined();
  });

  test('Keeps the error of a run that fails after only the name changed', async () => {
    const state = await failRunAfter((editor) =>
      editor.applyDocument(editor.document.withName('France')),
    );
    expect(state.document.name).toBe('France');
    expect(state.execution.error?.firstLine).toBe(
      `The column 'SHIP_COUNTRY' is wrong`,
    );
    expect(state.hostIssues.get('filter101')?.firstLine).toBe(
      `The column 'SHIP_COUNTRY' is wrong`,
    );
    expect(state.execution.result).toBeUndefined();
  });
});
