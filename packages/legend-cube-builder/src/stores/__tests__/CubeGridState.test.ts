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
  CubeDocument,
  DEFAULT_META,
  type Drilldown,
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
import {
  TEST__createCubeApplicationStore,
  TEST__createCubeHost,
} from '../../__test-utils__/CubeTestApplication.js';
import type { FakeCubeEngine } from '../../__test-utils__/FakeCubeEngine.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeResult,
  type CubeResultValue,
} from '../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../CubeEditorState.js';
import type { CubeExecutionResult } from '../CubeExecutionState.js';
import { CUBE_GRID_GROUP_COLUMN_ID, CubeGridMode } from '../CubeGridState.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';

const RUN_SCHEMA = new Schema(ORDERS_COLUMNS);
const at = (name: string): number => RUN_SCHEMA.names().indexOf(name);

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

const orderRow = (id: number, country: string | null): CubeResultValue[] =>
  RUN_SCHEMA.columns.map(({ name }) =>
    name === 'ORDER_ID' ? String(id) : name === 'SHIP_COUNTRY' ? country : null,
  );

const ORDERS_RESULT: CubeResult = {
  columns: RUN_SCHEMA.names(),
  rows: [orderRow(10248, 'France'), orderRow(10249, null)],
  sql: [],
  durationMs: 1,
};

let state: CubeEditorState;
let fake: FakeCubeEngine;

const setUp = async (
  drilldown?: Drilldown,
  applicationStore = TEST__createCubeApplicationStore(),
): Promise<CubeExecutionResult> => {
  const created = TEST__createCubeHost(
    { result: ORDERS_RESULT },
    applicationStore,
  );
  fake = created.fake;
  state = new CubeEditorState(created.host, ordersCube(drilldown));
  await flowResult(state.execution.execute());
  return state.execution.result as CubeExecutionResult;
};

beforeEach(() => {
  localStorage.clear();
});

describe('Grid state', () => {
  test('Shows the run server-side by default, and remembers the mode for the user', async () => {
    const applicationStore = TEST__createCubeApplicationStore();
    await setUp(undefined, applicationStore);
    expect(state.grid.mode).toBe(CubeGridMode.SERVER_SIDE);
    state.grid.setMode(CubeGridMode.LOCAL);
    expect(state.grid.isServerSide).toBe(false);
    // nothing runs again: both modes show the same run
    expect(fake.execute).toHaveBeenCalledTimes(1);
    await setUp(undefined, applicationStore);
    expect(state.grid.mode).toBe(CubeGridMode.LOCAL);
  });

  test("Gives the run's own rows with no fetch when nothing is derived", async () => {
    const result = await setUp();
    const rows = await state.grid.loadRows(result, [], []);
    expect(rows?.map((row) => [row.isGroup, row.cells])).toEqual([
      [false, ORDERS_RESULT.rows[0]],
      [false, ORDERS_RESULT.rows[1]],
    ]);
    expect(new Set(rows?.map((row) => row.id)).size).toBe(2);
    expect(fake.execute).toHaveBeenCalledTimes(1);
  });

  test("Maps the sort ag-grid asks for to the run's columns, the groups' column to the level's", async () => {
    const result = await setUp({
      columns: ['SHIP_COUNTRY', 'SHIP_CITY'],
      aggregations: [],
    });
    const freight = `c${at('FREIGHT')}`;
    expect(
      state.grid.toSorts(
        result,
        [
          { colId: CUBE_GRID_GROUP_COLUMN_ID, sort: 'desc' },
          { colId: freight, sort: 'asc' },
          { colId: 'unknown', sort: 'asc' },
        ],
        1,
      ),
    ).toEqual([
      { column: 'SHIP_CITY', direction: SortDirection.DESC },
      { column: 'FREIGHT', direction: SortDirection.ASC },
    ]);
    // at the leaf, the groups' column sorts nothing
    expect(
      state.grid.toSorts(
        result,
        [{ colId: CUBE_GRID_GROUP_COLUMN_ID, sort: 'desc' }],
        2,
      ),
    ).toEqual([]);
  });

  test('Gives groups their typed keys, outermost first, an empty one kept apart from the text "null"', async () => {
    const result = await setUp({ columns: ['SHIP_COUNTRY'], aggregations: [] });
    fake.execute.mockResolvedValueOnce({
      columns: [
        'SHIP_COUNTRY',
        'ORDER_ID Sum',
        'EMPLOYEE_ID Sum',
        'SHIP_VIA Sum',
        'FREIGHT Sum',
        'Count Rows',
      ],
      rows: [
        ['null', '1', null, null, null, '3'],
        [null, '2', null, null, null, '4'],
      ],
      sql: [],
      durationMs: 1,
    });
    const groups = await state.grid.loadRows(result, [], []);
    expect(groups?.map((row) => [row.keys, row.isGroup, row.count])).toEqual([
      [['null'], true, 3],
      [[null], true, 4],
    ]);
    expect(groups?.[0]?.id).not.toBe(groups?.[1]?.id);
    // a group's rows are asked for by its keys
    fake.execute.mockResolvedValueOnce(ORDERS_RESULT);
    const rows = await state.grid.loadRows(result, [null], []);
    expect(rows?.every((row) => !row.isGroup)).toBe(true);
    expect(rows?.map((row) => row.keys)).toEqual([[null], [null]]);
  });

  test('Says a level was cut at the row limit, and forgets it for a new grid', async () => {
    const result = await setUp({ columns: ['SHIP_COUNTRY'], aggregations: [] });
    state.setRowLimit(1);
    await flowResult(state.execution.execute());
    const limited = state.execution.result as CubeExecutionResult;
    fake.execute.mockResolvedValueOnce({
      columns: [
        'SHIP_COUNTRY',
        'ORDER_ID Sum',
        'EMPLOYEE_ID Sum',
        'SHIP_VIA Sum',
        'FREIGHT Sum',
        'Count Rows',
      ],
      rows: [
        ['France', '1', null, null, null, '3'],
        ['Germany', '2', null, null, null, '4'],
      ],
      sql: [],
      durationMs: 1,
    });
    expect(await state.grid.loadRows(limited, [], [])).toHaveLength(1);
    expect(state.grid.hasLimitedLevel).toBe(true);
    state.grid.resetLevels();
    expect(state.grid.hasLimitedLevel).toBe(false);
    expect(result.id).not.toBe(limited.id);
  });

  test("Keeps a fetch's error for the grid region, and drops it at the next fetch", async () => {
    const result = await setUp({ columns: ['SHIP_COUNTRY'], aggregations: [] });
    fake.execute.mockRejectedValueOnce(
      new CubeEngineError(CubeEngineErrorKind.EXECUTION, 'The engine failed'),
    );
    await expect(state.grid.loadRows(result, [], [])).rejects.toThrow(
      'The engine failed',
    );
    expect(state.grid.fetchError?.firstLine).toBe('The engine failed');
    expect(state.grid.fetching).toBe(0);
    fake.execute.mockResolvedValueOnce({
      columns: [
        'SHIP_COUNTRY',
        'ORDER_ID Sum',
        'EMPLOYEE_ID Sum',
        'SHIP_VIA Sum',
        'FREIGHT Sum',
        'Count Rows',
      ],
      rows: [],
      sql: [],
      durationMs: 1,
    });
    await state.grid.loadRows(result, [], []);
    expect(state.grid.fetchError).toBeUndefined();
  });

  test('Leaves rows the grid no longer shows alone', async () => {
    const result = await setUp({ columns: ['SHIP_COUNTRY'], aggregations: [] });
    let answer: (value: CubeResult) => void = () => undefined;
    fake.execute.mockReturnValueOnce(
      new Promise<CubeResult>((resolve) => {
        answer = resolve;
      }),
    );
    const loading = state.grid.loadRows(result, [], []);
    state.gridFetcher.purge();
    answer(ORDERS_RESULT);
    expect(await loading).toBeUndefined();
    expect(state.grid.fetchError).toBeUndefined();
  });
});
