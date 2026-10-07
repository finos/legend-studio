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
  ColumnComparisonFilter,
  CubeDocument,
  FilterOperator,
  type IR,
  PrimitiveType,
  printIR,
  Query,
  RelationalTableSource,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import {
  NORTHWIND_DATABASE,
  NORTHWIND_RUNTIME,
  sliceQuery,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import type { FakeCubeEngine } from '../../../__test-utils__/FakeCubeEngine.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeResult,
} from '../../../graph-manager/CubeEngine.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeEditor } from '../../CubeEditor.js';

const P = 'meta::pure::precisePrimitives::';
const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** A table of two columns: an exact BigInt ID and a nullable name */
const SCHEMA = new Schema([
  new SchemaColumn('ID', PrimitiveType.get(`${P}BigInt`), false),
  new SchemaColumn('NAME', PrimitiveType.get(`${P}Varchar`, [10]), true),
]);

const tableQuery = (): Query =>
  new Query(
    [
      new RelationalTableSource(
        'relational101',
        { database: NORTHWIND_DATABASE, schema: 'S', table: 'T' },
        { kind: 'resolved', schema: SCHEMA },
      ),
    ],
    [],
    'relational101',
  );

const result = (rows: CubeResult['rows']): CubeResult => ({
  columns: ['ID', 'NAME'],
  rows,
  sql: ['select "ID", "NAME" from S.T'],
  durationMs: 42,
});

const ROWS: CubeResult['rows'] = [
  ['10', 'ten'],
  ['9007199254740993', null],
  ['9', 'nine'],
];

const renderPage = async (
  document = new CubeDocument({ context: CONTEXT, query: tableQuery() }),
  prepare?: (fake: FakeCubeEngine) => void,
): Promise<FakeCubeEngine> => {
  const { host, fake } = TEST__createCubeHost({ result: result(ROWS) });
  prepare?.(fake);
  await TEST__renderInCubeApplication(
    <CubeEditor host={host} initialDocument={document} />,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
  return fake;
};

const toolbar = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.GRID_TOOLBAR);
const executeButton = (): HTMLButtonElement =>
  within(toolbar()).getByText<HTMLButtonElement>('Execute');

/** The text of a column's cells, by row index */
const cellTexts = async (column: number): Promise<string[]> => {
  const grid = await screen.findByTestId(LEGEND_CUBE_TEST_ID.RESULT_GRID);
  await waitFor(() =>
    expect(
      grid.querySelectorAll('.ag-center-cols-container .ag-row').length,
    ).toBeGreaterThan(0),
  );
  return [...grid.querySelectorAll('.ag-center-cols-container .ag-row')]
    .sort(
      (a, b) =>
        Number(a.getAttribute('row-index')) -
        Number(b.getAttribute('row-index')),
    )
    .map(
      (row) =>
        row.querySelector(`[col-id="c${column}"]`)?.textContent ?? '(missing)',
    );
};

const consoleError = console.error; // eslint-disable-line no-console

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  // the data grid silences console errors until it is ready
  console.error = consoleError; // eslint-disable-line no-console
});

describe('Cube results', () => {
  test("Shows a run's rows, exactly as the engine wrote them, with nulls marked", async () => {
    const fake = await renderPage();
    fireEvent.click(executeButton());
    expect(await cellTexts(0)).toEqual(['10', '9007199254740993', '9']);
    expect(await cellTexts(1)).toEqual(['ten', '(null)', 'nine']);
    expect(within(toolbar()).getByText('3 rows in 42 ms')).toBeDefined();
    expect(fake.execute).toHaveBeenCalledTimes(1);
  });

  test('Sorts a number column by value', async () => {
    await renderPage();
    fireEvent.click(executeButton());
    await cellTexts(0);
    const header = screen
      .getByTestId(LEGEND_CUBE_TEST_ID.RESULT_GRID)
      .querySelector('.ag-header-cell[col-id="c0"] .ag-header-cell-label');
    fireEvent.click(header as Element);
    await waitFor(async () =>
      expect(await cellTexts(0)).toEqual(['9', '10', '9007199254740993']),
    );
  });

  test('Shows the limit, and says when the run returned more rows', async () => {
    await renderPage();
    const limit =
      within(toolbar()).getByLabelText<HTMLInputElement>('Row limit');
    expect(limit.value).toBe('1000');
    fireEvent.change(limit, { target: { value: '2' } });
    fireEvent.keyDown(limit, { key: 'Enter' });
    fireEvent.click(executeButton());
    expect(await cellTexts(0)).toEqual(['10', '9007199254740993']);
    expect(
      within(toolbar()).getByText(
        'Showing the first 2 rows; the query returned more.',
      ),
    ).toBeDefined();
  });

  test('Refuses a row limit that is not a whole number of at least 1, and keeps the last one', async () => {
    const fake = await renderPage();
    const limit =
      within(toolbar()).getByLabelText<HTMLInputElement>('Row limit');
    fireEvent.change(limit, { target: { value: '0' } });
    fireEvent.blur(limit);
    expect(within(toolbar()).getByRole('alert').textContent).toBe(
      'The row limit must be a whole number of at least 1.',
    );
    fireEvent.click(executeButton());
    await cellTexts(0);
    // the run used the last good limit, one row past it
    expect(printIR(fake.execute.mock.calls[0]?.[1] as IR)).toContain(
      '->limit(1001)',
    );
    expect(within(toolbar()).getByText('3 rows in 42 ms')).toBeDefined();
  });

  test('Marks the rows stale after an edit, keeps them, and runs nothing until Execute', async () => {
    const fake = await renderPage(
      new CubeDocument({ context: CONTEXT, query: tableQuery() }),
    );
    fireEvent.click(executeButton());
    await cellTexts(0);
    expect(within(toolbar()).queryByText(/Stale/u)).toBeNull();
    // the row limit is part of the run
    const limit = within(toolbar()).getByLabelText('Row limit');
    fireEvent.change(limit, { target: { value: '500' } });
    fireEvent.blur(limit);
    expect(within(toolbar()).getByText(/Stale/u)).toBeDefined();
    expect(await cellTexts(0)).toEqual(['10', '9007199254740993', '9']);
    expect(fake.execute).toHaveBeenCalledTimes(1);
    fireEvent.click(executeButton());
    await waitFor(() =>
      expect(within(toolbar()).queryByText(/Stale/u)).toBeNull(),
    );
  });

  test("Can't execute a node with an invalid input, and says why", async () => {
    const badFilter = new ColumnComparisonFilter('NOPE', FilterOperator.EQUAL, {
      kind: 'string',
      value: 'x',
    });
    await renderPage(
      new CubeDocument({ context: CONTEXT, query: sliceQuery(badFilter) }),
    );
    expect(executeButton().disabled).toBe(true);
    expect(executeButton().title).toContain('• ');
    expect(executeButton().title).toContain('NOPE');
    // a valid node upstream can run
    const joinRow = screen
      .getAllByTestId(LEGEND_CUBE_TEST_ID.NODE_ROW)
      .find((row) => within(row).queryByText('join101')) as HTMLElement;
    fireEvent.click(within(joinRow).getByText('Select'));
    expect(executeButton().disabled).toBe(false);
  });

  test("Shows a failed run's error in the results and on the node it names", async () => {
    await renderPage(undefined, (fake) =>
      fake.execute.mockRejectedValue(
        new CubeEngineError(
          CubeEngineErrorKind.COMPILE,
          "The column 'NAME' can't be found in the relation\nat line 7",
          'relational101',
        ),
      ),
    );
    fireEvent.click(executeButton());
    const error = await screen.findByTestId(
      LEGEND_CUBE_TEST_ID.EXECUTION_ERROR,
    );
    expect(error.textContent).toContain(
      "The column 'NAME' can't be found in the relation",
    );
    fireEvent.click(within(error).getByText('Details'));
    expect(within(error).getByText(/at line 7/u)).toBeDefined();
    const [row] = screen.getAllByTestId(LEGEND_CUBE_TEST_ID.NODE_ROW);
    expect(within(row as HTMLElement).getByRole('alert').textContent).toBe(
      "The column 'NAME' can't be found in the relation",
    );
  });

  test('Shows the run in progress, and stops it', async () => {
    let signal: AbortSignal | undefined;
    const fake = await renderPage(undefined, (engine) =>
      engine.execute.mockImplementation(async (_model, _lambda, options) => {
        signal = options?.abortController?.signal;
        return new Promise<CubeResult>(() => undefined);
      }),
    );
    fireEvent.click(executeButton());
    expect(await within(toolbar()).findByText('executing query')).toBeDefined();
    fireEvent.click(within(toolbar()).getByText('Stop'));
    expect(signal?.aborted).toBe(true);
    expect(within(toolbar()).queryByText('executing query')).toBeNull();
    expect(executeButton().disabled).toBe(false);
    expect(fake.execute).toHaveBeenCalledTimes(1);
  });

  test("Copies the run's SQL", async () => {
    const writeText = jest.fn(async (_text: string) => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    await renderPage();
    fireEvent.click(executeButton());
    await cellTexts(0);
    fireEvent.click(within(toolbar()).getByText('Copy SQL'));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('select "ID", "NAME" from S.T'),
    );
  });
});
