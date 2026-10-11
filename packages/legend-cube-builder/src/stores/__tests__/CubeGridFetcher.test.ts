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
  buildSchemasAndValidity,
  checkDrilldown,
  createNodeRegistry,
  CubeDocument,
  DEFAULT_META,
  deriveDrilldownLevel,
  type Drilldown,
  type DrilldownCell,
  type IR,
  printIR,
  Query,
  Schema,
  SortDirection,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import type { FakeCubeEngine } from '../../__test-utils__/FakeCubeEngine.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeResult,
  type CubeResultValue,
} from '../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../CubeEditorState.js';
import type { CubeExecutionResult } from '../CubeExecutionState.js';
import {
  CUBE_GRID_CONTEXT_CHANGED,
  CubeGridFetchDropped,
  CubeGridFetcher,
} from '../CubeGridFetcher.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';

const RUN_SCHEMA = new Schema(ORDERS_COLUMNS);
const BY_COUNTRY: Drilldown = { columns: ['SHIP_COUNTRY'], aggregations: [] };

/** An answer the test gives when it chooses */
const deferred = <T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

/** ORDERS, typed, as a cube with this drill-down */
const ordersCube = (drilldown?: Drilldown): CubeDocument =>
  new CubeDocument({
    context: { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME },
    query: new Query(
      [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
      [],
      'relational101',
    ),
    meta: { ...DEFAULT_META, ...(drilldown ? { drilldown } : {}) },
  });

/** A row of ORDERS: its id, its country, everything else empty */
const orderRow = (id: number, country: string | null): CubeResultValue[] =>
  RUN_SCHEMA.columns.map(({ name }) =>
    name === 'ORDER_ID' ? String(id) : name === 'SHIP_COUNTRY' ? country : null,
  );

const ORDERS_RESULT: CubeResult = {
  columns: RUN_SCHEMA.names(),
  rows: [orderRow(10248, 'France'), orderRow(10249, 'Germany')],
  sql: ['select * from ORDERS'],
  durationMs: 5,
};

/** The columns a level of the drill-down gives, in its order, as the engine would name them */
const levelColumns = (
  drilldown: Drilldown,
  keys: DrilldownCell[],
): readonly string[] => {
  const level = deriveDrilldownLevel({
    query: ordersCube().query,
    captureId: 'relational101',
    schema: RUN_SCHEMA,
    drilldown: checkDrilldown(drilldown, RUN_SCHEMA),
    keys,
    sorts: [],
  });
  return (
    buildSchemasAndValidity(level.query, createNodeRegistry().queryRules)
      .schemas.get(level.query.selected as string)
      ?.names() ?? []
  );
};

/** An answer of a level, its rows given as values by column name */
const levelAnswer = (
  columns: readonly string[],
  rows: Record<string, CubeResultValue>[],
  sql = 'select …',
): CubeResult => ({
  columns,
  rows: rows.map((row) => columns.map((name) => row[name] ?? null)),
  sql: [sql],
  durationMs: 3,
});

/** The run lambda of the nth engine call, printed */
const runOf = (fake: FakeCubeEngine, call: number): string =>
  printIR(fake.execute.mock.calls[call]?.[1] as IR);

let state: CubeEditorState;
let fake: FakeCubeEngine;

/** A cube with the drill-down, or none, run */
const setUp = async (
  drilldown: Drilldown | 'none' = BY_COUNTRY,
): Promise<CubeExecutionResult> => {
  const created = TEST__createCubeHost({ result: ORDERS_RESULT });
  fake = created.fake;
  state = new CubeEditorState(
    created.host,
    ordersCube(drilldown === 'none' ? undefined : drilldown),
  );
  await flowResult(state.execution.execute());
  const { result } = state.execution;
  if (!result) {
    throw new Error('The cube did not run');
  }
  return result;
};

const COUNTRY_GROUPS = (): CubeResult =>
  levelAnswer(levelColumns(BY_COUNTRY, []), [
    {
      SHIP_COUNTRY: 'France',
      'ORDER_ID Sum': '20497',
      'FREIGHT Sum': 12.5,
      'Count Rows': '2',
    },
    {
      SHIP_COUNTRY: null,
      'ORDER_ID Sum': '10249',
      'FREIGHT Sum': null,
      'Count Rows': '1',
    },
  ]);

beforeEach(() => {
  localStorage.clear();
});

describe('Grid fetcher', () => {
  test("Gives a group level's rows by the run's columns, a column with no aggregation empty, with each group's count", async () => {
    const result = await setUp();
    fake.execute.mockResolvedValueOnce(COUNTRY_GROUPS());
    const top = await state.gridFetcher.fetchLevel(result, [], []);
    expect(top.level.groupColumns).toEqual(['SHIP_COUNTRY']);
    expect(top.limited).toBe(false);
    const at = (name: string): number => RUN_SCHEMA.names().indexOf(name);
    const [france, empty] = top.rows;
    expect(france?.cells[at('SHIP_COUNTRY')]).toBe('France');
    expect(france?.cells[at('ORDER_ID')]).toBe('20497');
    expect(france?.cells[at('FREIGHT')]).toBe(12.5);
    // text columns show nothing on a group row
    expect(france?.cells[at('SHIP_CITY')]).toBeUndefined();
    expect(france?.count).toBe(2);
    expect(empty?.cells[at('SHIP_COUNTRY')]).toBeNull();
    expect(empty?.cells[at('FREIGHT')]).toBeNull();
    expect(empty?.count).toBe(1);
    expect(runOf(fake, 1)).toContain(
      `->groupBy(~[SHIP_COUNTRY], ~['ORDER_ID Sum'`,
    );
  });

  test("Gives the leaf's rows whole, with no count", async () => {
    const result = await setUp();
    fake.execute.mockResolvedValueOnce({
      ...ORDERS_RESULT,
      rows: [orderRow(10248, 'France')],
    });
    const rows = await state.gridFetcher.fetchLevel(result, ['France'], []);
    expect(rows.level.isLeaf).toBe(true);
    expect(rows.rows).toEqual([{ cells: orderRow(10248, 'France') }]);
    expect(runOf(fake, 1)).toContain(`$row.SHIP_COUNTRY == 'France'`);
  });

  test('Records each fetch in the run stats, after the Execute, newest first', async () => {
    const result = await setUp();
    fake.execute.mockResolvedValueOnce(COUNTRY_GROUPS());
    await state.gridFetcher.fetchLevel(
      result,
      [],
      [{ column: 'FREIGHT', direction: SortDirection.DESC }],
    );
    fake.execute.mockResolvedValueOnce({ ...ORDERS_RESULT, rows: [] });
    await state.gridFetcher.fetchLevel(result, [null], []);
    expect(state.runStats.entries.map((entry) => entry.label)).toEqual([
      'Rows of SHIP_COUNTRY (null)',
      'Groups by SHIP_COUNTRY, sorted by FREIGHT descending',
      'Execute',
    ]);
    expect(state.runStats.entries[1]?.sql).toEqual(['select …']);
  });

  test('Answers a level asked for again from its cache, and another sort with a new run', async () => {
    const result = await setUp();
    fake.execute.mockResolvedValue(COUNTRY_GROUPS());
    const first = await state.gridFetcher.fetchLevel(result, [], []);
    expect(await state.gridFetcher.fetchLevel(result, [], [])).toBe(first);
    // the Execute, then one fetch
    expect(fake.execute).toHaveBeenCalledTimes(2);
    await state.gridFetcher.fetchLevel(
      result,
      [],
      [{ column: 'SHIP_COUNTRY', direction: SortDirection.DESC }],
    );
    expect(fake.execute).toHaveBeenCalledTimes(3);
    expect(state.runStats.entries).toHaveLength(3);
  });

  test('Fetches a level again after it failed', async () => {
    const result = await setUp();
    fake.execute.mockRejectedValueOnce(
      new CubeEngineError(CubeEngineErrorKind.EXECUTION, 'The engine failed'),
    );
    await expect(state.gridFetcher.fetchLevel(result, [], [])).rejects.toThrow(
      'The engine failed',
    );
    fake.execute.mockResolvedValueOnce(COUNTRY_GROUPS());
    expect(
      (await state.gridFetcher.fetchLevel(result, [], [])).rows,
    ).toHaveLength(2);
    expect(fake.execute).toHaveBeenCalledTimes(3);
  });

  test('Drops an answer that comes after a purge, and fetches the level again', async () => {
    const result = await setUp();
    const late = deferred<CubeResult>();
    fake.execute.mockReturnValueOnce(late.promise);
    const fetching = state.gridFetcher.fetchLevel(result, [], []);
    state.gridFetcher.purge();
    late.resolve(COUNTRY_GROUPS());
    await expect(fetching).rejects.toBeInstanceOf(CubeGridFetchDropped);
    // the purge aborted it
    expect(
      fake.execute.mock.calls[1]?.[2]?.abortController?.signal.aborted,
    ).toBe(true);
    fake.execute.mockResolvedValueOnce(COUNTRY_GROUPS());
    await state.gridFetcher.fetchLevel(result, [], []);
    expect(fake.execute).toHaveBeenCalledTimes(3);
    // the dropped answer recorded nothing
    expect(state.runStats.entries.map((entry) => entry.label)).toEqual([
      'Groups by SHIP_COUNTRY',
      'Execute',
    ]);
  });

  test("Drops an answer for an earlier run once another run's rows are asked for", async () => {
    const result = await setUp();
    const late = deferred<CubeResult>();
    fake.execute.mockReturnValueOnce(late.promise);
    const fetching = state.gridFetcher.fetchLevel(result, [], []);
    fake.execute.mockResolvedValueOnce(ORDERS_RESULT);
    await flowResult(state.execution.execute());
    const next = state.execution.result as CubeExecutionResult;
    expect(next.id).not.toBe(result.id);
    fake.execute.mockResolvedValueOnce(COUNTRY_GROUPS());
    await state.gridFetcher.fetchLevel(next, [], []);
    late.resolve(COUNTRY_GROUPS());
    await expect(fetching).rejects.toBeInstanceOf(CubeGridFetchDropped);
  });

  test("Runs with the run's row limit, not the one the cube has now", async () => {
    const result = await setUp();
    expect(state.setRowLimit(5)).toBe(true);
    fake.execute.mockResolvedValueOnce(COUNTRY_GROUPS());
    await state.gridFetcher.fetchLevel(result, [], []);
    expect(runOf(fake, 1)).toContain(`->limit(${result.rowLimit + 1})`);
    expect(runOf(fake, 1)).toContain(`->from(${NORTHWIND_RUNTIME})`);
  });

  test("Says when a level is cut at the run's row limit", async () => {
    const result = await setUp();
    expect(state.setRowLimit(1)).toBe(true);
    await flowResult(state.execution.execute());
    const limited = state.execution.result as CubeExecutionResult;
    expect(limited.rowLimit).toBe(1);
    fake.execute.mockResolvedValueOnce(COUNTRY_GROUPS());
    const top = await state.gridFetcher.fetchLevel(limited, [], []);
    expect(top.limited).toBe(true);
    expect(top.rows).toHaveLength(1);
    expect(result.rowLimit).not.toBe(1);
  });

  test('Refuses to fetch for a run made in another context, as the warehouse is read from the page', async () => {
    const result = await setUp();
    await expect(
      state.gridFetcher.fetchLevel(
        {
          ...result,
          context: { ...result.context, runtime: 'other' },
        } as CubeExecutionResult,
        [],
        [],
      ),
    ).rejects.toThrow(CUBE_GRID_CONTEXT_CHANGED);
    expect(fake.execute).toHaveBeenCalledTimes(1);
  });

  test('Refuses more keys than the drill-down has levels, without calling the engine', async () => {
    const result = await setUp();
    await expect(
      state.gridFetcher.fetchLevel(result, ['France', 'Lyon'], []),
    ).rejects.toThrow(`A drill-down of 1 levels can't expand 2 keys`);
    expect(fake.execute).toHaveBeenCalledTimes(1);
  });

  test('Drops the least recently used levels past its row budget, never the one just answered', async () => {
    const result = await setUp();
    const fetcher = new CubeGridFetcher(state, 3);
    fake.execute.mockResolvedValue(COUNTRY_GROUPS());
    const sorted = (column: string) => [
      { column, direction: SortDirection.ASC },
    ];
    await fetcher.fetchLevel(result, [], sorted('SHIP_COUNTRY'));
    expect(fetcher.cachedRows).toBe(2);
    // a second level of 2 rows: the first goes
    await fetcher.fetchLevel(result, [], sorted('FREIGHT'));
    expect(fetcher.cachedRows).toBe(2);
    await fetcher.fetchLevel(result, [], sorted('FREIGHT'));
    expect(fake.execute).toHaveBeenCalledTimes(3);
    await fetcher.fetchLevel(result, [], sorted('SHIP_COUNTRY'));
    expect(fake.execute).toHaveBeenCalledTimes(4);
  });

  test('Keeps a level used again over one used less lately', async () => {
    const result = await setUp();
    // room for two levels of two rows
    const fetcher = new CubeGridFetcher(state, 5);
    fake.execute.mockResolvedValue(COUNTRY_GROUPS());
    const sorted = (column: string) => [
      { column, direction: SortDirection.ASC },
    ];
    await fetcher.fetchLevel(result, [], sorted('SHIP_COUNTRY'));
    await fetcher.fetchLevel(result, [], sorted('FREIGHT'));
    // used again: the FREIGHT level is now the least recently used
    await fetcher.fetchLevel(result, [], sorted('SHIP_COUNTRY'));
    await fetcher.fetchLevel(result, [], sorted('ORDER_ID'));
    expect(fake.execute).toHaveBeenCalledTimes(4);
    await fetcher.fetchLevel(result, [], sorted('SHIP_COUNTRY'));
    expect(fake.execute).toHaveBeenCalledTimes(4);
    await fetcher.fetchLevel(result, [], sorted('FREIGHT'));
    expect(fake.execute).toHaveBeenCalledTimes(5);
  });

  test("Uses the cube's drill-down as it is now, which is presentation and not the run", async () => {
    const result = await setUp('none');
    fake.execute.mockResolvedValueOnce(ORDERS_RESULT);
    const flat = await state.gridFetcher.fetchLevel(result, [], []);
    expect(flat.level.isLeaf).toBe(true);
    state.importDocument(ordersCube(BY_COUNTRY), false);
    // a new document has a new context: the run is for the old one
    await expect(state.gridFetcher.fetchLevel(result, [], [])).rejects.toThrow(
      CUBE_GRID_CONTEXT_CHANGED,
    );
  });
});
