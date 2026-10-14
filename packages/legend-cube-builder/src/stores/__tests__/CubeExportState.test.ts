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

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import {
  CubeDocument,
  DEFAULT_META,
  type IR,
  Limit,
  printIR,
  Query,
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
} from '../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../CubeEditorState.js';
import type { CubeExecutionResult } from '../CubeExecutionState.js';
import {
  CUBE_EXPORT_CONTEXT_CHANGED,
  getCubeExportFileName,
} from '../CubeExportState.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';

const COLUMNS = ORDERS_COLUMNS.map(({ name }) => name);
const ORDERS_RESULT: CubeResult = {
  columns: COLUMNS,
  rows: [],
  sql: [],
  durationMs: 1,
};

let state: CubeEditorState;
let fake: FakeCubeEngine;
/** The files the browser was given to save: name and text */
let saved: { name: string; text: Promise<string> }[];

const setUp = async (withLimit = false): Promise<CubeExecutionResult> => {
  const created = TEST__createCubeHost({
    result: ORDERS_RESULT,
    csv: 'ORDER_ID,SHIP_COUNTRY\r\n10248,France\r\n',
  });
  fake = created.fake;
  const source = northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS);
  state = new CubeEditorState(
    created.host,
    new CubeDocument({
      name: 'French orders',
      context: { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME },
      query: withLimit
        ? new Query([source, new Limit('limit101', 5)], [], 'relational101')
            .connect('relational101', 'limit101')
            .select('limit101')
        : new Query([source], [], 'relational101'),
      meta: {
        ...DEFAULT_META,
        drilldown: { columns: ['SHIP_COUNTRY'], aggregations: [] },
      },
    }),
  );
  await flowResult(state.execution.execute());
  return state.execution.result as CubeExecutionResult;
};

beforeEach(() => {
  saved = [];
  // jsdom has no object URLs: the saved file is read back from its blob
  URL.createObjectURL = jest.fn((blob: Blob) => {
    saved.push({
      name: '',
      text: new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(blob);
      }),
    });
    return 'blob:cube';
  }) as unknown as typeof URL.createObjectURL;
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    const last = saved.at(-1);
    if (last) {
      last.name = this.download;
    }
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Export', () => {
  test("Saves the run's whole query as CSV, with no row limit and sorted as the grid is, not drilled down", async () => {
    const result = await setUp();
    await flowResult(
      state.export.exportCsv(result, [
        { column: 'FREIGHT', direction: SortDirection.DESC },
      ]),
    );
    const lambda = printIR(fake.exportCsv.mock.calls[0]?.[1] as IR);
    expect(lambda).toContain('->sort(~FREIGHT->descending())');
    expect(lambda).not.toContain('->limit(');
    expect(lambda).not.toContain('groupBy');
    expect(saved.map((file) => file.name)).toEqual(['French_orders.csv']);
    expect(await saved[0]?.text).toBe(
      'ORDER_ID,SHIP_COUNTRY\r\n10248,France\r\n',
    );
    expect(state.export.isExporting).toBe(false);
    expect(state.runStats.entries[0]?.label).toBe('Export CSV');
    expect(
      state.runStats.entries[0]?.lambda === fake.exportCsv.mock.calls[0]?.[1],
    ).toBe(true);
  });

  test("Keeps the run's own Limit: only the row limit of the grid is left out", async () => {
    const result = await setUp(true);
    await flowResult(state.export.exportCsv(result));
    expect(printIR(fake.exportCsv.mock.calls[0]?.[1] as IR)).toContain(
      '->limit(5)->from(',
    );
  });

  test('Keeps a failure for the grid region, and drops it at the next export', async () => {
    const result = await setUp();
    fake.exportCsv.mockRejectedValueOnce(
      new CubeEngineError(CubeEngineErrorKind.EXECUTION, 'Division by zero'),
    );
    await flowResult(state.export.exportCsv(result));
    expect(state.export.error?.firstLine).toBe('Division by zero');
    expect(saved).toEqual([]);
    expect(state.runStats.entries[0]).toMatchObject({
      label: 'Export CSV',
      error: 'Division by zero',
    });
    await flowResult(state.export.exportCsv(result));
    expect(state.export.error).toBeUndefined();
    expect(saved).toHaveLength(1);
  });

  test('Saves nothing once stopped', async () => {
    const result = await setUp();
    let answer: (csv: string) => void = () => undefined;
    fake.exportCsv.mockReturnValueOnce(
      new Promise<string>((resolve) => {
        answer = resolve;
      }),
    );
    const exporting = flowResult(state.export.exportCsv(result));
    expect(state.export.isExporting).toBe(true);
    state.export.stop();
    expect(
      fake.exportCsv.mock.calls[0]?.[2]?.abortController?.signal.aborted,
    ).toBe(true);
    answer('A\r\n');
    await exporting;
    expect(saved).toEqual([]);
    expect(state.export.error).toBeUndefined();
    // the Execute only
    expect(state.runStats.entries.map((entry) => entry.label)).toEqual([
      'Execute',
    ]);
  });

  test('Refuses to export a run made in another context, as the warehouse is read from the page', async () => {
    const result = await setUp();
    await flowResult(
      state.export.exportCsv({
        ...result,
        context: { ...result.context, runtime: 'other' },
      } as CubeExecutionResult),
    );
    expect(state.export.error?.firstLine).toBe(CUBE_EXPORT_CONTEXT_CHANGED);
    expect(fake.exportCsv).not.toHaveBeenCalled();
  });

  test("Names the file after the cube, or 'cube'", () => {
    expect(getCubeExportFileName('Largest buys / 2026', 'xlsx')).toBe(
      'Largest_buys_2026.xlsx',
    );
    expect(getCubeExportFileName(undefined, 'csv')).toBe('cube.csv');
    expect(getCubeExportFileName('  ', 'csv')).toBe('cube.csv');
  });
});
