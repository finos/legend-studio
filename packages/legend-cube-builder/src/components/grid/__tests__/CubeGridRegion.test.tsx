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
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';
import {
  Core_LegendApplicationPlugin,
  type GenericLegendApplicationStore,
  LEGEND_APPLICATION_COLOR_THEME,
} from '@finos/legend-application';
import {
  ColumnComparisonFilter,
  CubeDocument,
  DEFAULT_META,
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
import {
  TEST__findCanvasNode,
  TEST__getCanvasNodeTooltip,
} from '../../../__test-utils__/CubeCanvasTestUtils.js';
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
import { NULL_CELL_TEXT } from '../../../__lib__/LegendCubeLabels.js';
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
/** Makes the node the one Execute runs, as Ctrl-click on the canvas does */
const selectNode = async (nodeId: string): Promise<void> => {
  fireEvent.click(await TEST__findCanvasNode(nodeId), { ctrlKey: true });
};
/** The node's errors and warnings, from its tooltip, which ends with its description */
const nodeProblems = async (nodeId: string): Promise<string[]> =>
  TEST__getCanvasNodeTooltip(await TEST__findCanvasNode(nodeId)).slice(0, -1);

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
/** Shows the grid in local mode: the run's rows sorted, grouped and filtered in the browser */
const useLocalMode = (): void => {
  fireEvent.click(within(toolbar()).getByRole('button', { name: 'Local' }));
};

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
  // the mocked code editor holds no text of its own
  MockedMonacoEditorInstance.getValue.mockReturnValue('');
  MockedMonacoEditorInstance.setValue.mockClear();
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

  test("Shows booleans as true and false, an empty string as empty and a Float 0 as 0.00, and only nulls as a muted '(null)'", async () => {
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
    expect(await cellTexts(2)).toEqual(['0.00', '1.50', '(null)']);
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

  test('Shows Decimal values grouped and Float values rounded to 2 places, with the exact value on hover, and leaves ids and years plain', async () => {
    const schema = new Schema([
      new SchemaColumn('TRADE_ID', PrimitiveType.get(`${P}BigInt`), false),
      new SchemaColumn('NOTIONAL', PrimitiveType.get('Decimal'), false),
      new SchemaColumn('NOTIONAL_MM', PrimitiveType.get('Float'), true),
      new SchemaColumn('YEAR', PrimitiveType.get(`${P}Int`), false),
    ]);
    await renderCube({
      document: new CubeDocument({
        context: CONTEXT,
        query: tableQuery(schema),
      }),
      result: resultFor(schema, [
        ['10692', '31102024.71', 31.10202471, '2026'],
        ['5', '-1234.5', null, '1999'],
        ['7', '512.00', 0.5, '2025'],
      ]),
    });
    useLocalMode();
    fireEvent.click(executeButton());
    expect(await cellTexts(0)).toEqual(['10692', '5', '7']);
    expect(await cellTexts(1)).toEqual(['31,102,024.71', '-1,234.5', '512.00']);
    expect(await cellTexts(2)).toEqual(['31.10', NULL_CELL_TEXT, '0.50']);
    expect(await cellTexts(3)).toEqual(['2026', '1999', '2025']);
    // the exact value on hover, where the two differ
    const shown = (row: number, column: number): HTMLElement =>
      cell(row, column).querySelector('span') as HTMLElement;
    expect(shown(0, 1).title).toBe('31102024.71');
    expect(shown(0, 2).title).toBe('31.10202471');
    expect(cell(2, 1).querySelector('span[title]')).toBeNull();
    expect(cell(0, 0).querySelector('span[title]')).toBeNull();
    // sorting still reads the values, not the text shown
    clickHeader(1);
    await waitFor(async () =>
      expect(await cellTexts(1)).toEqual([
        '-1,234.5',
        '512.00',
        '31,102,024.71',
      ]),
    );
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
    useLocalMode();
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
    useLocalMode();
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

  test("Sorts by a header on the engine in server-side mode, over all the query's rows, and shows the engine's order", async () => {
    const fake = await renderPage();
    fireEvent.click(executeButton());
    expect(await cellTexts(0)).toEqual(['10', '9007199254740993', '9']);
    fake.execute.mockResolvedValueOnce(
      result([
        ['9007199254740993', 'b'],
        ['10', 'a'],
        ['9', null],
      ]),
    );
    clickHeader(0);
    // the engine's order, whatever the browser would make of it
    await waitFor(async () =>
      expect(await cellTexts(0)).toEqual(['9007199254740993', '10', '9']),
    );
    const sorted = printIR(fake.execute.mock.calls[1]?.[1] as IR);
    expect(sorted).toContain('->sort(~ID->ascending())');
    // descending, then cleared: the run's own rows again, with no new run
    clickHeader(0);
    await waitFor(() => expect(fake.execute).toHaveBeenCalledTimes(3));
    clickHeader(0);
    await waitFor(async () =>
      expect(await cellTexts(0)).toEqual(['10', '9007199254740993', '9']),
    );
    expect(fake.execute.mock.calls.map((call) => printIR(call[1]))).toEqual([
      expect.not.stringContaining('->sort('),
      expect.stringContaining('->sort(~ID->ascending())'),
      expect.stringContaining('->sort(~ID->descending())'),
    ]);
  });

  test("Shows a drill-down's groups with their counts, each number summed, and a group's rows on expanding it", async () => {
    const fake = await renderPage(
      new CubeDocument({
        context: CONTEXT,
        query: tableQuery(),
        meta: {
          ...DEFAULT_META,
          drilldown: { columns: ['NAME'], aggregations: [] },
        },
      }),
    );
    fake.execute.mockResolvedValueOnce(result(ROWS));
    fake.execute.mockResolvedValueOnce({
      columns: ['NAME', 'ID Sum', 'Count Rows'],
      rows: [
        ['nine', '9', '1'],
        [null, '9007199254740993', '1'],
        ['ten', '10', '1'],
      ],
      sql: [],
      durationMs: 1,
    });
    fireEvent.click(executeButton());
    const groupCell = (row: number): HTMLElement =>
      grid().querySelector(
        `.ag-row[row-index="${row}"] [col-id="ag-Grid-AutoColumn"]`,
      ) as HTMLElement;
    await waitFor(() => expect(groupCell(0).textContent).toContain('nine'));
    expect(
      grid().querySelector('.ag-header-cell[col-id="ag-Grid-AutoColumn"]')
        ?.textContent,
    ).toContain('NAME');
    // the key, and the group's count
    expect(groupCell(0).textContent).toContain('(1)');
    expect(groupCell(1).textContent).toContain(NULL_CELL_TEXT);
    // the ID column holds each group's Sum, digit for digit
    expect(await cellTexts(0)).toEqual(['9', '9007199254740993', '10']);
    const groups = printIR(fake.execute.mock.calls[1]?.[1] as IR);
    expect(groups).toContain(`->groupBy(~[NAME], ~['ID Sum'`);
    // the group with no name, expanded: its rows, by Is Empty
    fake.execute.mockResolvedValueOnce(result([['9007199254740993', null]]));
    fireEvent.click(
      groupCell(1).querySelector('.ag-group-contracted') as HTMLElement,
    );
    await waitFor(() => expect(fake.execute).toHaveBeenCalledTimes(3));
    expect(printIR(fake.execute.mock.calls[2]?.[1] as IR)).toContain(
      '$row.NAME->isEmpty()',
    );
    await waitFor(async () =>
      expect(await cellTexts(0)).toEqual([
        '9',
        '9007199254740993',
        '9007199254740993',
        '10',
      ]),
    );
  });

  test("Lists the drill-down's levels above the grid, sets what group rows show, and removes a level or all", async () => {
    const fake = await renderPage(
      new CubeDocument({
        context: CONTEXT,
        query: tableQuery(),
        meta: {
          ...DEFAULT_META,
          drilldown: { columns: ['NAME', 'MISSING'], aggregations: [] },
        },
      }),
    );
    const groups = (sumName: string) => ({
      columns: ['NAME', sumName, 'Count Rows'],
      rows: [['ten', '10', '1']],
      sql: [],
      durationMs: 1,
    });
    fake.execute.mockResolvedValueOnce(result(ROWS));
    fake.execute.mockResolvedValueOnce(groups('ID Sum'));
    fireEvent.click(executeButton());
    const bar = await screen.findByTestId(LEGEND_CUBE_TEST_ID.DRILLDOWN_BAR);
    expect(bar.textContent).toContain('NAME');
    // a level the run lacks is said, and left out
    expect(within(bar).getByRole('status').textContent).toBe(
      `Drill-down column "MISSING" is not in the query's output.`,
    );
    await waitFor(() => expect(fake.execute).toHaveBeenCalledTimes(2));
    // the group rows' ID: its Average instead of its Sum
    fireEvent.click(within(bar).getByText('Group rows…'));
    const settings = await screen.findByTestId(
      LEGEND_CUBE_TEST_ID.DRILLDOWN_SETTINGS,
    );
    const id =
      within(settings).getByLabelText<HTMLSelectElement>("Group rows' ID");
    expect(id.value).toBe('Sum');
    expect([...id.options].map((option) => option.textContent)).toContain(
      'Sum (default)',
    );
    // NAME is a level: it has no setting
    expect(within(settings).queryByLabelText("Group rows' NAME")).toBeNull();
    fake.execute.mockResolvedValueOnce(groups('ID Average'));
    fireEvent.change(id, { target: { value: 'Average' } });
    await waitFor(() => expect(fake.execute).toHaveBeenCalledTimes(3));
    expect(printIR(fake.execute.mock.calls[2]?.[1] as IR)).toContain(
      `'ID Average': x | $x.ID : y | $y->average()`,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    // removing the only usable level shows the run's rows again
    fireEvent.click(within(bar).getByLabelText('Stop drilling down by NAME'));
    await waitFor(async () =>
      expect(await cellTexts(0)).toEqual(['10', '9007199254740993', '9']),
    );
    fireEvent.click(
      within(screen.getByTestId(LEGEND_CUBE_TEST_ID.DRILLDOWN_BAR)).getByText(
        'Clear',
      ),
    );
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.DRILLDOWN_BAR)).toBeNull();
    expect(fake.execute).toHaveBeenCalledTimes(3);
  });

  test('Lists the latest runs, newest first, with their SQL to copy', async () => {
    const applicationStore = TEST__createCubeApplicationStore();
    const copy = jest
      .spyOn(applicationStore.clipboardService, 'copyTextToClipboard')
      .mockResolvedValue(undefined);
    const { fake } = await renderCube({ applicationStore });
    fireEvent.click(executeButton());
    await cellTexts(0);
    fake.execute.mockResolvedValueOnce({
      ...result(ROWS),
      sql: ['select … order by "ID"'],
    });
    clickHeader(0);
    await waitFor(() => expect(fake.execute).toHaveBeenCalledTimes(2));
    fireEvent.click(within(toolbar()).getByText('Runs (2)'));
    const runs = screen.getByTestId(LEGEND_CUBE_TEST_ID.RUN_STATS);
    const entries = within(runs).getAllByRole('listitem');
    expect(entries.map((entry) => entry.textContent)).toEqual([
      expect.stringContaining('Rows, sorted by ID ascending'),
      expect.stringContaining('Execute'),
    ]);
    fireEvent.click(within(entries[0] as HTMLElement).getByText('Copy SQL'));
    expect(copy).toHaveBeenCalledWith('select … order by "ID"');
  });

  test("Shows a number column as its saved format, sets one from the cell's menu, and keeps a saved width", async () => {
    await renderPage(
      new CubeDocument({
        context: CONTEXT,
        query: tableQuery(),
        meta: {
          ...DEFAULT_META,
          presentation: {
            ...DEFAULT_META.presentation,
            columnWidths: [{ column: 'NAME', width: 321 }],
            columnHints: [
              {
                column: 'ID',
                format: {
                  style: 'currency',
                  currency: 'USD',
                  decimalPlaces: 2,
                  grouping: true,
                  redIfNegative: false,
                  parenthesesIfNegative: false,
                },
              },
            ],
          },
        },
      }),
    );
    fireEvent.click(executeButton());
    expect(await cellTexts(0)).toEqual([
      '$10.00',
      '$9,007,199,254,740,993.00',
      '$9.00',
    ]);
    // the exact value on hover
    expect(cell(1, 0).querySelector('span')?.title).toBe('9007199254740993');
    expect(headerCell(1).style.width).toBe('321px');
    // the menu's Format Column, on the ID column: a percent with no places
    fireEvent.contextMenu(cell(0, 0));
    fireEvent.click(await screen.findByText('Format Column…'));
    const form = await screen.findByTestId(LEGEND_CUBE_TEST_ID.COLUMN_FORMAT);
    fireEvent.change(within(form).getByLabelText('Style'), {
      target: { value: 'percent' },
    });
    fireEvent.change(within(form).getByLabelText('Decimal places'), {
      target: { value: '' },
    });
    expect(within(form).getByLabelText('Preview').textContent).toContain('25%');
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(async () =>
      expect(await cellTexts(0)).toEqual([
        '1,000%',
        '900,719,925,474,099,300%',
        '900%',
      ]),
    );
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

  // hexadecimal, exponent, binary and decimal text too (PLAN §11.14), which
  // `Number()` would read as 16, 1000, 3 and 1
  test.each([
    '0',
    '-1',
    '2.5',
    '1e400',
    'abc',
    '',
    '0x10',
    '1e3',
    '0b11',
    '1.0',
  ])(
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
    await selectNode('relational102');
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
    await selectNode('join101');
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
    await selectNode('relational101');
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
    expect(await nodeProblems('relational101')).toEqual([
      "The column 'NAME' can't be found in the relation",
    ]);
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
    expect(await nodeProblems('filter101')).toEqual(["Can't find column 'X'"]);
    await selectNode('join101');
    expect(
      screen.queryByTestId(LEGEND_CUBE_TEST_ID.EXECUTION_ERROR),
    ).toBeNull();
    expect(await nodeProblems('filter101')).toEqual([]);
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
    await selectNode('relational102');
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
    expect(await nodeProblems('relational101')).toEqual([]);
    expect(await nodeProblems('relational102')).toEqual([]);
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

  test("Shows the run's SQL statements formatted in a dialog, numbered, and copies them all", async () => {
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
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.SQL_PANEL)).toBeNull();
    fireEvent.click(within(toolbar()).getByText('Show SQL'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Executed SQL')).toBeDefined();
    expect(
      within(dialog).getByTestId(LEGEND_CUBE_TEST_ID.SQL_PANEL),
    ).toBeDefined();
    const formatted = '--QUERY #1\nselect\n  1\n\n--QUERY #2\nselect\n  2';
    // the (mocked) code editor is given the formatted statements
    expect(MockedMonacoEditorInstance.setValue.mock.calls.at(-1)?.[0]).toBe(
      formatted,
    );
    fireEvent.click(within(dialog).getByText('Copy SQL'));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    // through the application's clipboard service, as shown
    expect(copyTextToClipboard).toHaveBeenCalledWith(formatted);
    fireEvent.click(within(dialog).getByText('Close'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // a run in flight has no SQL to show
    fake.execute.mockImplementationOnce(
      async () => new Promise<CubeResult>(() => undefined),
    );
    fireEvent.click(executeButton());
    expect(await within(toolbar()).findByText('executing query')).toBeDefined();
    expect(within(toolbar()).queryByText('Show SQL')).toBeNull();
  });
});
