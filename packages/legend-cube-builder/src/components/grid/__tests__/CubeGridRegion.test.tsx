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
  Core_LegendApplicationPlugin,
  type GenericLegendApplicationStore,
  LEGEND_APPLICATION_COLOR_THEME,
} from '@finos/legend-application';
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
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import {
  TEST__createCubeApplicationStore,
  TEST__createCubeHost,
} from '../../../__test-utils__/CubeTestApplication.js';
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
import type { CubeHost } from '../../../stores/CubeHost.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeEditor } from '../../CubeEditor.js';

const P = 'meta::pure::precisePrimitives::';
const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** A table of two columns: an exact BigInt ID and a nullable name */
const SCHEMA = new Schema([
  new SchemaColumn('ID', PrimitiveType.get(`${P}BigInt`), false),
  new SchemaColumn('NAME', PrimitiveType.get(`${P}Varchar`, [10]), true),
]);

const table = (
  id: string,
  name: string,
  schema = SCHEMA,
  database = NORTHWIND_DATABASE,
): RelationalTableSource =>
  new RelationalTableSource(
    id,
    { database, schema: 'S', table: name },
    { kind: 'resolved', schema },
  );

const tableQuery = (schema = SCHEMA): Query =>
  new Query([table('relational101', 'T', schema)], [], 'relational101');

/** Two tables, not joined, the first captured: selecting the second changes the query */
const twoTableQuery = (): Query =>
  new Query(
    [table('relational101', 'T'), table('relational102', 'U')],
    [],
    'relational101',
  );

const result = (rows: CubeResult['rows']): CubeResult => ({
  columns: ['ID', 'NAME'],
  rows,
  sql: ['select "ID", "NAME" from S.T'],
  durationMs: 42,
});

/** A result whose columns are the schema's, as the engine names them */
const resultFor = (schema: Schema, rows: CubeResult['rows']): CubeResult => ({
  columns: schema.columns.map((column) => column.name),
  rows,
  sql: ['select 1'],
  durationMs: 42,
});

const ROWS: CubeResult['rows'] = [
  ['10', 'ten'],
  ['9007199254740993', null],
  ['9', 'nine'],
];

const renderCube = async (
  options: {
    document?: CubeDocument | undefined;
    result?: CubeResult | undefined;
    applicationStore?: GenericLegendApplicationStore | undefined;
    prepare?: ((fake: FakeCubeEngine, host: CubeHost) => void) | undefined;
  } = {},
): Promise<{ host: CubeHost; fake: FakeCubeEngine; unmount: () => void }> => {
  const { host, fake } = TEST__createCubeHost(
    { result: options.result ?? result(ROWS) },
    options.applicationStore,
  );
  options.prepare?.(fake, host);
  const { unmount } = await TEST__renderInCubeApplication(
    <CubeEditor
      host={host}
      initialDocument={
        options.document ??
        new CubeDocument({ context: CONTEXT, query: tableQuery() })
      }
    />,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
  return { host, fake, unmount };
};

const renderPage = async (
  document?: CubeDocument,
  prepare?: (fake: FakeCubeEngine) => void,
): Promise<FakeCubeEngine> => (await renderCube({ document, prepare })).fake;

const toolbar = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.GRID_TOOLBAR);
const executeButton = (): HTMLButtonElement =>
  within(toolbar()).getByText<HTMLButtonElement>('Execute');
const rowLimitInput = (): HTMLInputElement =>
  within(toolbar()).getByLabelText<HTMLInputElement>('Row limit');
const nodeRow = (nodeId: string): HTMLElement =>
  screen
    .getAllByTestId(LEGEND_CUBE_TEST_ID.NODE_ROW)
    .find((row) => within(row).queryByText(nodeId)) as HTMLElement;

const grid = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.RESULT_GRID);
const headerCell = (column: number): HTMLElement =>
  grid().querySelector(`.ag-header-cell[col-id="c${column}"]`) as HTMLElement;
const headerText = (column: number): string | null | undefined =>
  headerCell(column).querySelector('.ag-header-cell-text')?.textContent;
const cell = (row: number, column: number): HTMLElement =>
  grid().querySelector(
    `.ag-center-cols-container .ag-row[row-index="${row}"] [col-id="c${column}"]`,
  ) as HTMLElement;

/** The text of a column's cells, by row index */
const cellTexts = async (column: number): Promise<string[]> => {
  const resultGrid = await screen.findByTestId(LEGEND_CUBE_TEST_ID.RESULT_GRID);
  await waitFor(() =>
    expect(
      resultGrid.querySelectorAll('.ag-center-cols-container .ag-row').length,
    ).toBeGreaterThan(0),
  );
  return [...resultGrid.querySelectorAll('.ag-center-cols-container .ag-row')]
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

/** Sorts by a column, as a click on its header does */
const clickHeader = (column: number): void => {
  fireEvent.click(
    headerCell(column).querySelector('.ag-header-cell-label') as Element,
  );
};

/** Hovers a column's header until its tooltip shows, reads it, then moves away until it hides */
const headerTooltip = async (
  column: number,
): Promise<string | null | undefined> => {
  const header = headerCell(column);
  fireEvent.mouseOver(header);
  fireEvent.mouseEnter(header);
  fireEvent.mouseMove(header);
  // past the grid's tooltip delay of 500 ms
  await act(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 900);
    });
  });
  const text = document.querySelector('.ag-tooltip')?.textContent;
  fireEvent.mouseOut(header);
  fireEvent.mouseLeave(header);
  await waitFor(() => expect(document.querySelector('.ag-tooltip')).toBeNull());
  return text;
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

  test("Shows booleans as true and false, an empty string as empty and a 0 as 0, and only nulls as a muted '(null)'", async () => {
    const schema = new Schema([
      new SchemaColumn('B', PrimitiveType.get('Boolean'), true),
      new SchemaColumn('S', PrimitiveType.get(`${P}Varchar`, [10]), true),
      new SchemaColumn('F', PrimitiveType.get(`${P}Double`), true),
    ]);
    await renderCube({
      document: new CubeDocument({
        context: CONTEXT,
        query: tableQuery(schema),
      }),
      result: resultFor(schema, [
        [true, '', 0],
        [false, ' a ', 1.5],
        [null, null, null],
      ]),
    });
    fireEvent.click(executeButton());
    expect(await cellTexts(0)).toEqual(['true', 'false', '(null)']);
    expect(await cellTexts(1)).toEqual(['', ' a ', '(null)']);
    expect(await cellTexts(2)).toEqual(['0', '1.5', '(null)']);
    expect(within(cell(2, 1)).getByText('(null)').className).toContain(
      'text-[var(--color-text-muted)]',
    );
  });

  test("Heads each column with its name, dots and spaces included, right-aligns only numbers, and counts '1 row'", async () => {
    const schema = new Schema([
      new SchemaColumn('a.b', PrimitiveType.get(`${P}BigInt`), false),
      new SchemaColumn('c d', PrimitiveType.get(`${P}Varchar`, [10]), true),
      new SchemaColumn(
        'rowNumber',
        PrimitiveType.get(`${P}Varchar`, [10]),
        true,
      ),
    ]);
    await renderCube({
      document: new CubeDocument({
        context: CONTEXT,
        query: tableQuery(schema),
      }),
      result: resultFor(schema, [['7', 'x', 'r']]),
    });
    fireEvent.click(executeButton());
    expect(await cellTexts(0)).toEqual(['7']);
    expect(await cellTexts(1)).toEqual(['x']);
    expect(await cellTexts(2)).toEqual(['r']);
    expect([0, 1, 2].map(headerText)).toEqual(['a.b', 'c d', 'rowNumber']);
    expect(within(toolbar()).getByText('1 row in 42 ms')).toBeDefined();
    // the number column, cells and header; not the text columns
    expect(cell(0, 0).classList.contains('ag-right-aligned-cell')).toBe(true);
    expect(headerCell(0).classList.contains('ag-right-aligned-header')).toBe(
      true,
    );
    [1, 2].forEach((column) => {
      expect(cell(0, column).classList.contains('ag-right-aligned-cell')).toBe(
        false,
      );
      expect(
        headerCell(column).classList.contains('ag-right-aligned-header'),
      ).toBe(false);
    });
  });

  test("Shows a column's type, nullable marker and full path in its header tooltip", async () => {
    await renderPage();
    fireEvent.click(executeButton());
    await cellTexts(0);
    expect([0, 1].map(headerText)).toEqual(['ID', 'NAME']);
    expect(await headerTooltip(0)).toBe(`BigInt (${P}BigInt)`);
    expect(await headerTooltip(1)).toBe(`Varchar(10)? (${P}Varchar(10))`);
  }, 20_000);

  test("Styles the grid in the page's color theme", async () => {
    const applicationStore = TEST__createCubeApplicationStore([
      new Core_LegendApplicationPlugin(),
    ]);
    // Legend Query's default theme is light
    applicationStore.layoutService.setColorTheme(
      LEGEND_APPLICATION_COLOR_THEME.LEGACY_LIGHT,
    );
    await renderCube({ applicationStore });
    fireEvent.click(executeButton());
    await cellTexts(0);
    expect(grid().classList.contains('ag-theme-balham')).toBe(true);
    expect(grid().classList.contains('ag-theme-balham-dark')).toBe(false);
    await act(async () => {
      applicationStore.layoutService.setColorTheme(
        LEGEND_APPLICATION_COLOR_THEME.DEFAULT_DARK,
      );
    });
    expect(grid().classList.contains('ag-theme-balham-dark')).toBe(true);
    expect(grid().classList.contains('ag-theme-balham')).toBe(false);
  });

  test('Sorts a number column by value, digit for digit past what a JS number holds', async () => {
    // the two large values are the same JS number: in this order, only a sort by their text gets them right
    await renderPage(undefined, (fake) =>
      fake.execute.mockResolvedValue(
        result([
          ['9007199254740993', 'a'],
          ['9007199254740992', 'b'],
          ['10', 'c'],
          ['9', 'd'],
        ]),
      ),
    );
    fireEvent.click(executeButton());
    await cellTexts(0);
    clickHeader(0);
    await waitFor(async () =>
      expect(await cellTexts(0)).toEqual([
        '9',
        '10',
        '9007199254740992',
        '9007199254740993',
      ]),
    );
  });

  test("Shows a new run's rows in the engine's order, not under the last run's sort", async () => {
    const fake = await renderPage();
    fireEvent.click(executeButton());
    await cellTexts(0);
    clickHeader(0);
    await waitFor(async () =>
      expect(await cellTexts(0)).toEqual(['9', '10', '9007199254740993']),
    );
    fake.execute.mockResolvedValueOnce(
      result([
        ['3', 'c'],
        ['1', 'a'],
        ['2', 'b'],
      ]),
    );
    fireEvent.click(executeButton());
    await waitFor(async () =>
      expect(new Set(await cellTexts(0))).toEqual(new Set(['1', '2', '3'])),
    );
    expect(await cellTexts(0)).toEqual(['3', '1', '2']);
  });

  test("Shows the limit, says when the run returned more rows, and keeps naming the run's limit after an edit", async () => {
    const fake = await renderPage();
    const limit = rowLimitInput();
    expect(limit.value).toBe('1000');
    fireEvent.change(limit, { target: { value: '2' } });
    fireEvent.keyDown(limit, { key: 'Enter' });
    fireEvent.click(executeButton());
    expect(await cellTexts(0)).toEqual(['10', '9007199254740993']);
    const truncation = 'Showing the first 2 rows; the query returned more.';
    expect(within(toolbar()).getByText(truncation)).toBeDefined();
    // a new limit runs nothing: the rows shown are still the 2 of the run
    fireEvent.change(limit, { target: { value: '7' } });
    fireEvent.blur(limit);
    expect(within(toolbar()).getByText(/Stale/u)).toBeDefined();
    expect(within(toolbar()).getByText('2 rows in 42 ms')).toBeDefined();
    expect(within(toolbar()).getByText(truncation)).toBeDefined();
    expect(
      within(toolbar()).queryByText(/Showing the first 7 rows/u),
    ).toBeNull();
    expect(fake.execute).toHaveBeenCalledTimes(1);
  });

  test('Commits a row limit on Enter or blur, not while it is typed', async () => {
    const { host } = await renderCube();
    const persistValue = jest.spyOn(
      host.applicationStore.userDataService,
      'persistValue',
    );
    fireEvent.click(executeButton());
    await cellTexts(0);
    const limit = rowLimitInput();
    // clearing the box to type a new limit is not a refusal, and the run is not stale yet
    ['', '5', '50'].forEach((text) => {
      fireEvent.change(limit, { target: { value: text } });
      expect(within(toolbar()).queryByRole('alert')).toBeNull();
      expect(within(toolbar()).queryByText(/Stale/u)).toBeNull();
    });
    expect(persistValue).not.toHaveBeenCalled();
    fireEvent.keyDown(limit, { key: 'Enter' });
    expect(within(toolbar()).getByText(/Stale/u)).toBeDefined();
    expect(persistValue).toHaveBeenCalledTimes(1);
    expect(persistValue).toHaveBeenCalledWith('legend-cube.row-limit', 50);
    fireEvent.change(limit, { target: { value: '60' } });
    expect(persistValue).toHaveBeenCalledTimes(1);
    fireEvent.blur(limit);
    expect(persistValue).toHaveBeenCalledTimes(2);
    expect(persistValue).toHaveBeenLastCalledWith('legend-cube.row-limit', 60);
  });

  test.each(['0', '-1', '2.5', '1e400', 'abc', ''])(
    "Refuses the row limit '%s', which is not a whole number of at least 1, and keeps the last one",
    async (text) => {
      const fake = await renderPage();
      const limit = rowLimitInput();
      fireEvent.change(limit, { target: { value: text } });
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
    },
  );

  test('Warns about a row limit above 100,000, but keeps it', async () => {
    const fake = await renderPage();
    const warning = 'A large row limit can slow the page down.';
    const limit = rowLimitInput();
    expect(within(toolbar()).queryByText(warning)).toBeNull();
    fireEvent.change(limit, { target: { value: '100000' } });
    fireEvent.blur(limit);
    expect(within(toolbar()).queryByText(warning)).toBeNull();
    fireEvent.change(limit, { target: { value: '100001' } });
    fireEvent.keyDown(limit, { key: 'Enter' });
    expect(within(toolbar()).getByText(warning)).toBeDefined();
    // a warning, not a refusal: the run uses the limit
    expect(within(toolbar()).queryByRole('alert')).toBeNull();
    expect(limit.value).toBe('100001');
    fireEvent.click(executeButton());
    await cellTexts(0);
    expect(printIR(fake.execute.mock.calls[0]?.[1] as IR)).toContain(
      '->limit(100002)',
    );
    // a refusal replaces the warning
    fireEvent.change(limit, { target: { value: '0' } });
    fireEvent.blur(limit);
    expect(within(toolbar()).getByRole('alert')).toBeDefined();
    expect(within(toolbar()).queryByText(warning)).toBeNull();
  });

  test('Marks the rows stale after an edit, keeps them, and runs nothing until Execute', async () => {
    const fake = await renderPage(
      new CubeDocument({ context: CONTEXT, query: tableQuery() }),
    );
    fireEvent.click(executeButton());
    await cellTexts(0);
    expect(within(toolbar()).queryByText(/Stale/u)).toBeNull();
    // the row limit is part of the run
    const limit = rowLimitInput();
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

  test('Keeps the headers of the run on its stale rows after another node is selected', async () => {
    const other = new Schema([
      new SchemaColumn('CODE', PrimitiveType.get(`${P}Varchar`, [10]), true),
    ]);
    await renderPage(
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [table('relational101', 'T'), table('relational102', 'U', other)],
          [],
          'relational101',
        ),
      }),
    );
    fireEvent.click(executeButton());
    await cellTexts(0);
    expect([0, 1].map(headerText)).toEqual(['ID', 'NAME']);
    fireEvent.click(within(nodeRow('relational102')).getByText('Select'));
    expect(within(toolbar()).getByText(/Stale/u)).toBeDefined();
    // the rows are still the first table's, so are their headers
    expect([0, 1].map(headerText)).toEqual(['ID', 'NAME']);
    expect(await cellTexts(1)).toEqual(['ten', '(null)', 'nine']);
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
    fireEvent.click(within(nodeRow('join101')).getByText('Select'));
    expect(executeButton().disabled).toBe(false);
  });

  test("Can't execute a table whose only error is a query-level rule, and says why", async () => {
    await renderPage(
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [
            table('relational101', 'T'),
            table('relational102', 'U', SCHEMA, 'other::Database'),
          ],
          [],
          'relational102',
        ),
      }),
    );
    expect(executeButton().disabled).toBe(true);
    expect(executeButton().title).toContain(
      'Sources from different databases are not supported yet',
    );
    fireEvent.click(within(nodeRow('relational101')).getByText('Select'));
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

  test('Cuts a long first line at 500 characters, and keeps the whole line in its tooltip and under Details', async () => {
    // one line, so the first line is the whole error
    const line = `${'y'.repeat(590)} TAIL_MARKER`;
    await renderPage(undefined, (fake) =>
      fake.execute.mockRejectedValue(
        new CubeEngineError(
          CubeEngineErrorKind.EXECUTION,
          line,
          'relational101',
        ),
      ),
    );
    fireEvent.click(executeButton());
    const error = await screen.findByTestId(
      LEGEND_CUBE_TEST_ID.EXECUTION_ERROR,
    );
    const shown = error.firstElementChild as HTMLElement;
    expect(shown.textContent).toBe(`${'y'.repeat(500)}…`);
    expect(shown.title).toBe(line);
    fireEvent.click(within(error).getByText('Details'));
    expect(error.querySelector('pre')?.textContent).toBe(line);
  });

  test('Shows no Details for a short one-line error, which its first line already says', async () => {
    await renderPage(undefined, (fake) =>
      fake.execute.mockRejectedValue(
        new CubeEngineError(
          CubeEngineErrorKind.EXECUTION,
          'Connection refused',
          'relational101',
        ),
      ),
    );
    fireEvent.click(executeButton());
    const error = await screen.findByTestId(
      LEGEND_CUBE_TEST_ID.EXECUTION_ERROR,
    );
    expect(error.textContent).toBe('Connection refused');
    expect(within(error).queryByText('Details')).toBeNull();
    expect((error.firstElementChild as HTMLElement).title).toBe('');
  });

  test("Shows no rows, stats or SQL of an earlier run beside a failed run's error", async () => {
    const fake = await renderPage();
    fireEvent.click(executeButton());
    await cellTexts(0);
    expect(within(toolbar()).getByText('3 rows in 42 ms')).toBeDefined();
    fake.execute.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        'The database failed',
        'relational101',
      ),
    );
    fireEvent.click(executeButton());
    await screen.findByTestId(LEGEND_CUBE_TEST_ID.EXECUTION_ERROR);
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.RESULT_GRID)).toBeNull();
    expect(within(toolbar()).queryByText(/rows? in/u)).toBeNull();
    expect(within(toolbar()).queryByText('Show SQL')).toBeNull();
    expect(within(toolbar()).queryByText(/Stale/u)).toBeNull();
  });

  test("Drops a failed run's error from the results and from its node when the query changes", async () => {
    await renderPage(
      new CubeDocument({ context: CONTEXT, query: sliceQuery() }),
      (fake) =>
        fake.execute.mockRejectedValue(
          new CubeEngineError(
            CubeEngineErrorKind.COMPILE,
            "Can't find column 'X'\nat line 3",
            'filter101',
          ),
        ),
    );
    fireEvent.click(executeButton());
    await screen.findByTestId(LEGEND_CUBE_TEST_ID.EXECUTION_ERROR);
    expect(within(nodeRow('filter101')).getByRole('alert').textContent).toBe(
      "Can't find column 'X'",
    );
    fireEvent.click(within(nodeRow('join101')).getByText('Select'));
    expect(
      screen.queryByTestId(LEGEND_CUBE_TEST_ID.EXECUTION_ERROR),
    ).toBeNull();
    expect(within(nodeRow('filter101')).queryByRole('alert')).toBeNull();
    expect(
      screen.getByText('Execute the query to see its rows.'),
    ).toBeDefined();
  });

  test('Shows nothing of a run that fails after the query changed', async () => {
    const fake = await renderPage(
      new CubeDocument({ context: CONTEXT, query: twoTableQuery() }),
    );
    fireEvent.click(executeButton());
    await cellTexts(0);
    let failRun: (error: Error) => void = () => undefined;
    fake.execute.mockImplementationOnce(
      async () =>
        new Promise<CubeResult>((_resolve, reject) => {
          failRun = reject;
        }),
    );
    fireEvent.click(executeButton());
    expect(await within(toolbar()).findByText('executing query')).toBeDefined();
    fireEvent.click(within(nodeRow('relational102')).getByText('Select'));
    await act(async () => {
      failRun(
        new CubeEngineError(
          CubeEngineErrorKind.EXECUTION,
          'The database failed',
          'relational101',
        ),
      );
    });
    expect(executeButton().disabled).toBe(false);
    expect(
      screen.queryByTestId(LEGEND_CUBE_TEST_ID.EXECUTION_ERROR),
    ).toBeNull();
    expect(within(nodeRow('relational101')).queryByRole('alert')).toBeNull();
    expect(within(nodeRow('relational102')).queryByRole('alert')).toBeNull();
    // nor the earlier run's rows, as the failed run's
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.RESULT_GRID)).toBeNull();
    expect(within(toolbar()).queryByText(/rows? in/u)).toBeNull();
    expect(
      screen.getByText('Execute the query to see its rows.'),
    ).toBeDefined();
  });

  test('Reports a run that fails unexpectedly, and can run again', async () => {
    const alertUnhandledError = jest.fn<(error: Error) => void>();
    await renderCube({
      prepare: (fake, host) => {
        host.applicationStore.alertUnhandledError = alertUnhandledError;
        // not an Error: the run can't make an engine error of it
        fake.execute.mockRejectedValueOnce(null);
      },
    });
    fireEvent.click(executeButton());
    await waitFor(() => expect(alertUnhandledError).toHaveBeenCalledTimes(1));
    expect(alertUnhandledError.mock.calls[0]?.[0]).toBeInstanceOf(TypeError);
    expect(within(toolbar()).queryByText('executing query')).toBeNull();
    expect(executeButton().disabled).toBe(false);
    fireEvent.click(executeButton());
    expect(await cellTexts(0)).toEqual(['10', '9007199254740993', '9']);
  });

  test('Shows the run in progress, with a loading bar over the results, and stops it', async () => {
    let signal: AbortSignal | undefined;
    const fake = await renderPage(undefined, (engine) =>
      engine.execute.mockImplementation(async (_model, _lambda, options) => {
        signal = options?.abortController?.signal;
        return new Promise<CubeResult>(() => undefined);
      }),
    );
    const region = screen.getByTestId(LEGEND_CUBE_TEST_ID.GRID_REGION);
    expect(region.firstElementChild?.className).toBe(
      'panel-loading-indicator--disabled',
    );
    fireEvent.click(executeButton());
    expect(await within(toolbar()).findByText('executing query')).toBeDefined();
    // the bar is the region's first child, and covers it
    expect(region.firstElementChild?.className).toBe('panel-loading-indicator');
    await waitFor(() =>
      expect(
        region.classList.contains('panel-loading-indicator__container'),
      ).toBe(true),
    );
    fireEvent.click(within(toolbar()).getByText('Stop'));
    expect(signal?.aborted).toBe(true);
    expect(within(toolbar()).queryByText('executing query')).toBeNull();
    expect(region.firstElementChild?.className).toBe(
      'panel-loading-indicator--disabled',
    );
    await waitFor(() =>
      expect(
        region.classList.contains('panel-loading-indicator__container'),
      ).toBe(false),
    );
    expect(executeButton().disabled).toBe(false);
    expect(fake.execute).toHaveBeenCalledTimes(1);
  });

  test('Stops the run in flight when the page closes', async () => {
    let signal: AbortSignal | undefined;
    const { unmount } = await renderCube({
      prepare: (fake) =>
        fake.execute.mockImplementation(async (_model, _lambda, options) => {
          signal = options?.abortController?.signal;
          return new Promise<CubeResult>(() => undefined);
        }),
    });
    fireEvent.click(executeButton());
    expect(await within(toolbar()).findByText('executing query')).toBeDefined();
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  test("Shows each of the run's SQL statements on request, and copies them all", async () => {
    const writeText = jest.fn(async (_text: string) => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    const { host, fake } = await renderCube({
      result: { ...result(ROWS), sql: ['select 1', 'select 2'] },
    });
    const copyTextToClipboard = jest.spyOn(
      host.applicationStore.clipboardService,
      'copyTextToClipboard',
    );
    fireEvent.click(executeButton());
    await cellTexts(0);
    const showSql = within(toolbar()).getByText('Show SQL');
    expect(showSql.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.SQL_PANEL)).toBeNull();
    fireEvent.click(showSql);
    expect(
      within(toolbar()).getByText('Hide SQL').getAttribute('aria-expanded'),
    ).toBe('true');
    const panel = screen.getByTestId(LEGEND_CUBE_TEST_ID.SQL_PANEL);
    expect(
      [...panel.querySelectorAll('pre')].map((pre) => pre.textContent),
    ).toEqual(['select 1', 'select 2']);
    fireEvent.click(within(panel).getByText('Copy SQL'));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    // through the application's clipboard service, every statement in order
    expect(copyTextToClipboard).toHaveBeenCalledTimes(1);
    expect(copyTextToClipboard.mock.calls[0]?.[0].split(/\n+/u)).toEqual([
      'select 1',
      'select 2',
    ]);
    // a run in flight hides the last run's SQL
    fake.execute.mockImplementationOnce(
      async () => new Promise<CubeResult>(() => undefined),
    );
    fireEvent.click(executeButton());
    expect(await within(toolbar()).findByText('executing query')).toBeDefined();
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.SQL_PANEL)).toBeNull();
    expect(within(toolbar()).queryByText(/(?:Show|Hide) SQL/u)).toBeNull();
    fireEvent.click(within(toolbar()).getByText('Stop'));
    expect(screen.getByTestId(LEGEND_CUBE_TEST_ID.SQL_PANEL)).toBeDefined();
    fireEvent.click(within(toolbar()).getByText('Hide SQL'));
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.SQL_PANEL)).toBeNull();
  });
});
