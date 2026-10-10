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
  AggregationFunction,
  type ColumnAggregation,
  type ColumnDirection,
  Connection,
  CubeDocument,
  MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_COLUMN,
  MESSAGE_AGGREGATION_FUNCTION_INCOMPATIBLE,
  MESSAGE_AGGREGATION_FUNCTION_NEEDS_SORT,
  MESSAGE_AGGREGATION_FUNCTION_UNKNOWN,
  MESSAGE_AGGREGATION_OUTPUT_NAME_IS_INPUT_COLUMN,
  MESSAGE_ALREADY_IN_OUTPUT_SCHEMA,
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_CANNOT_HAVE_DUPLICATES,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
  MESSAGE_PARTITION_COLUMN_NOT_PARTITIONABLE,
  MESSAGE_SORT_COLUMN_NOT_SORTABLE,
  OpaqueType,
  Partition,
  PrimitiveType,
  Query,
  SchemaColumn,
  SortDirection,
  WindowRankFunction,
} from '@finos/legend-cube';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  COLUMN_NAME_RULES_HINT,
  PARTITION_EDITOR_NOTES,
  READ_ONLY_CUBE_TITLE,
} from '../../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import {
  TEST__findCanvasNode,
  TEST__getCanvasNodeTooltip,
} from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  TEST__importDocument,
  TEST__renderInCubeApplication,
} from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const { COUNT, SUM, AVERAGE, COUNT_ROWS } = AggregationFunction;
const { RANK, DENSE_RANK, ROW_NUMBER } = WindowRankFunction;
const { ASC, DESC } = SortDirection;
/** ORDERS, with a Variant column and a column of a type Cube doesn't know */
const COLUMNS = [
  ...ORDERS_COLUMNS,
  new SchemaColumn('PAYLOAD', PrimitiveType.get('Variant'), true),
  new SchemaColumn('SHAPE', OpaqueType.get('meta::external::Shape'), true),
];
const RANK_AGGREGATION: ColumnAggregation = {
  column: undefined,
  function: RANK,
  name: 'Rank',
};
const BY_DATE: ColumnDirection = { column: 'ORDER_DATE', direction: DESC };
/** How the function select shows each column function, in the spec's order */
const ALL_COLUMN_FUNCTIONS = [
  'Count',
  'Distinct Count',
  'Distinct Value',
  'Sum',
  'Average',
  'Min',
  'Max',
];
/** How the function select shows the functions that take no column, after the column functions */
const NO_COLUMN_FUNCTIONS = ['Count Rows', 'Rank', 'Dense Rank', 'Row Number'];

const ordersPartitioned = (
  columns: string[],
  sorts: ColumnDirection[],
  aggregations: ColumnAggregation[],
): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', COLUMNS),
      new Partition('partition101', columns, sorts, aggregations),
    ],
    [new Connection('relational101', 'partition101', 'tds')],
    'partition101',
  );

const render = async (query: Query): Promise<CubeEditorState> => {
  const { host } = TEST__createCubeHost();
  const editorState = new CubeEditorState(
    host,
    new CubeDocument({ context: CONTEXT, query }),
  );
  await TEST__renderInCubeApplication(
    <div style={{ display: 'flex' }}>
      <div style={{ width: 800, height: 400 }}>
        <CubeCanvas editorState={editorState} />
      </div>
    </div>,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.CANVAS,
  );
  return editorState;
};

const panel = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);

const openPartition = async (): Promise<void> => {
  fireEvent.click(await TEST__findCanvasNode('partition101'));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
};

const list = (label: string): HTMLElement =>
  within(panel()).getByRole('list', { name: label });

// ---------------------------------------- window functions ----------------------------------------

const functionList = (): HTMLElement => list('Window functions');

const rows = (): HTMLElement[] =>
  within(functionList()).queryAllByRole('listitem');

const row = (position: number): HTMLElement =>
  rows()[position - 1] as HTMLElement;

const columnPicker = (position: number): HTMLSelectElement =>
  within(panel()).getByLabelText<HTMLSelectElement>(
    `Aggregation column ${position}`,
  );

const functionPicker = (position: number): HTMLSelectElement =>
  within(panel()).getByLabelText<HTMLSelectElement>(
    `Aggregation function ${position}`,
  );

const name = (position: number): HTMLInputElement =>
  within(panel()).getByLabelText<HTMLInputElement>(
    `Aggregation output name ${position}`,
  );

const pick = (position: number, column: string): void => {
  fireEvent.change(columnPicker(position), { target: { value: column } });
};

const choose = (position: number, fn: string): void => {
  fireEvent.change(functionPicker(position), { target: { value: fn } });
};

const type = (position: number, text: string): void => {
  fireEvent.change(name(position), { target: { value: text } });
};

/** The function select's options, as shown */
const functions = (position: number): string[] =>
  Array.from(functionPicker(position).options).map(({ text }) => text);

/** The messages shown under a window-function row's two lines of controls */
const rowMessages = (position: number): string[] =>
  Array.from(row(position).children)
    .slice(2)
    .map((message) => message.textContent ?? '');

/**
 * A window-function row's problem, as shown under it and on the control it is
 * about (its column, its function, or else its name): none, or exactly this one
 */
const expectRowProblem = (
  position: number,
  problem: string | undefined,
): void => {
  const about = problem?.startsWith('Aggregation column')
    ? 'column'
    : problem?.startsWith('Aggregation function')
      ? 'function'
      : problem === undefined
        ? undefined
        : 'name';
  expect(name(position).getAttribute('aria-invalid')).toBe(
    String(about === 'name'),
  );
  expect(name(position).getAttribute('title')).toBe(
    about === 'name' ? (problem ?? null) : null,
  );
  expect(functionPicker(position).getAttribute('aria-invalid')).toBe(
    String(about === 'function'),
  );
  expect(functionPicker(position).getAttribute('title')).toBe(
    about === 'function' ? (problem ?? null) : null,
  );
  if (about === 'column') {
    expect(columnPicker(position).getAttribute('aria-invalid')).toBe('true');
  }
  expect(rowMessages(position)).toEqual(problem === undefined ? [] : [problem]);
};

// ---------------------------------------- partition columns ----------------------------------------

const columnList = (): HTMLElement => list('Partition columns');

const columnItems = (): HTMLElement[] =>
  within(columnList()).getAllByRole('listitem');

const checkbox = (column: string): HTMLInputElement =>
  within(columnList()).getByRole<HTMLInputElement>('checkbox', {
    name: new RegExp(`^${column}\\b`, 'u'),
  });

const checkboxes = (): HTMLInputElement[] =>
  within(columnList()).getAllByRole<HTMLInputElement>('checkbox');

// ---------------------------------------- sort columns ----------------------------------------

const sortList = (): HTMLElement => list('Sort columns');

const sortRows = (): HTMLElement[] =>
  within(sortList()).queryAllByRole('listitem');

const sortPicker = (position: number): HTMLSelectElement =>
  within(panel()).getByLabelText<HTMLSelectElement>(`Sort column ${position}`);

const directionPicker = (position: number): HTMLSelectElement =>
  within(panel()).getByLabelText<HTMLSelectElement>(
    `Sort direction ${position}`,
  );

const pickSort = (position: number, column: string): void => {
  fireEvent.change(sortPicker(position), { target: { value: column } });
};

const direct = (position: number, direction: SortDirection): void => {
  fireEvent.change(directionPicker(position), {
    target: { value: direction },
  });
};

const sortOption = (position: number, column: string): HTMLOptionElement =>
  Array.from(sortPicker(position).options).find(
    ({ value }) => value === column,
  ) as HTMLOptionElement;

/** The messages shown under a sort row's line of controls */
const sortRowMessages = (position: number): string[] =>
  Array.from((sortRows()[position - 1] as HTMLElement).children)
    .slice(1)
    .map((message) => message.textContent ?? '');

// ---------------------------------------- the panel ----------------------------------------

const button = (label: string): HTMLButtonElement =>
  within(panel()).getByRole<HTMLButtonElement>('button', { name: label });

const queryButton = (label: string): HTMLButtonElement | null =>
  within(panel()).queryByRole<HTMLButtonElement>('button', { name: label });

const problems = (): string[] =>
  Array.from(
    within(panel()).queryByRole('alert', { name: 'Problems' })?.children ?? [],
  ).map((problem) => problem.textContent ?? '');

const stored = (editorState: CubeEditorState): Partition =>
  editorState.document.query.getNode('partition101') as Partition;

beforeEach(() => {
  localStorage.clear();
});

describe('Partition editor', () => {
  test("Shows the window functions, then the partition columns, then the sort columns, in the editor's one scroller, and the notes", async () => {
    await render(ordersPartitioned([], [], []));
    await openPartition();
    expect(
      within(panel())
        .getAllByRole('list')
        .map((element) => element.getAttribute('aria-label'))
        .filter((label) => label !== null),
    ).toEqual(['Window functions', 'Partition columns', 'Sort columns']);
    // the editor's body is its one scroller (PLAN §11.8)
    [functionList(), columnList(), sortList()].forEach((element) =>
      expect(element.className).not.toMatch(
        /\b(?:max-h-|overflow-(?:[xy]-)?(?:auto|scroll))/u,
      ),
    );
    // one blank window-function row to start, not yet a problem, and no sort row
    expect(rows()).toHaveLength(1);
    expect(columnPicker(1).value).toBe('');
    expect(functionPicker(1).value).toBe('');
    expect(name(1).value).toBe('');
    expectRowProblem(1, undefined);
    expect(sortRows()).toEqual([]);
    expect(checkboxes().some((box) => box.checked)).toBe(false);
    // the blank row is left out, so there's no window function yet
    expect(problems()).toEqual([MESSAGE_CANNOT_BE_EMPTY('Aggregations')]);
    // the notes, and the rule for names
    [...PARTITION_EDITOR_NOTES, COLUMN_NAME_RULES_HINT].forEach((note) =>
      expect(within(panel()).getByText(note)).toBeDefined(),
    );
  });

  test('Builds the node on Apply, as one undo step: a column ticked, a sort row picked and Rank chosen', async () => {
    const editorState = await render(ordersPartitioned([], [], []));
    await openPartition();
    expect(button('Apply').disabled).toBe(true);
    fireEvent.click(checkbox('SHIP_COUNTRY'));
    fireEvent.click(button('Add sort column'));
    pickSort(1, 'ORDER_DATE');
    direct(1, DESC);
    choose(1, RANK);
    expect(problems()).toEqual([]);
    fireEvent.click(button('Apply'));
    expect(stored(editorState).columns).toEqual(['SHIP_COUNTRY']);
    expect(stored(editorState).sorts).toEqual([BY_DATE]);
    expect(stored(editorState).aggregations).toEqual([RANK_AGGREGATION]);
    expect(editorState.history).toHaveLength(1);
    expect(editorState.analysis.schemas.get('partition101')?.names()).toEqual([
      ...COLUMNS.map((column) => column.name),
      'Rank',
    ]);
    await waitFor(async () =>
      expect(
        TEST__getCanvasNodeTooltip(await TEST__findCanvasNode('partition101')),
      ).toContain('Apply 1 Window Function'),
    );
  });

  test("Lists the input's columns to partition by, with their types, a Variant or unknown type shown but not tickable", async () => {
    await render(ordersPartitioned([], [BY_DATE], [RANK_AGGREGATION]));
    await openPartition();
    expect(columnItems().map((item) => item.textContent)).toEqual([
      'ORDER_IDSmallInt',
      'CUSTOMER_IDVarchar(5)?',
      'EMPLOYEE_IDSmallInt?',
      'ORDER_DATEStrictDate?',
      'REQUIRED_DATEStrictDate?',
      'SHIPPED_DATEStrictDate?',
      'SHIP_VIASmallInt?',
      'FREIGHTDouble?',
      'SHIP_NAMEVarchar(40)?',
      'SHIP_ADDRESSVarchar(60)?',
      'SHIP_CITYVarchar(15)?',
      'SHIP_REGIONVarchar(15)?',
      'SHIP_POSTAL_CODEVarchar(10)?',
      'SHIP_COUNTRYVarchar(15)?',
      "PAYLOADVariant? (can't be partitioned by)",
      "SHAPEShape? (can't be partitioned by)",
    ]);
    expect(checkbox('ORDER_ID').disabled).toBe(false);
    expect(checkbox('PAYLOAD').disabled).toBe(true);
    expect(checkbox('SHAPE').disabled).toBe(true);
  });

  test("Stores ticked partition columns in the input's order, keeping a saved order until the picks change", async () => {
    const editorState = await render(
      ordersPartitioned(
        ['SHIP_COUNTRY', 'ORDER_ID'],
        [BY_DATE],
        [RANK_AGGREGATION],
      ),
    );
    await openPartition();
    expect(checkbox('SHIP_COUNTRY').checked).toBe(true);
    expect(checkbox('ORDER_ID').checked).toBe(true);
    // a name changed, the columns untouched: their order stays
    type(1, 'Place');
    fireEvent.click(button('Apply'));
    expect(stored(editorState).columns).toEqual(['SHIP_COUNTRY', 'ORDER_ID']);
    // a column ticked: the columns follow the input's order
    fireEvent.click(checkbox('EMPLOYEE_ID'));
    fireEvent.click(button('Apply'));
    expect(stored(editorState).columns).toEqual([
      'ORDER_ID',
      'EMPLOYEE_ID',
      'SHIP_COUNTRY',
    ]);
    expect(editorState.history).toHaveLength(2);
  });

  test("Lists a saved partition column the input lost, last and ticked, until it is unticked; the panel's list shows its problem, not the rows'", async () => {
    const editorState = await render(
      ordersPartitioned(['ORDER_ID', 'SHIPPER'], [], [RANK_AGGREGATION]),
    );
    await openPartition();
    // the node stops at its partition columns; the row still shows its own problem
    expect(problems()).toEqual([
      MESSAGE_NOT_IN_INPUT_SCHEMA('Partition column', 'SHIPPER'),
    ]);
    expectRowProblem(1, MESSAGE_AGGREGATION_FUNCTION_NEEDS_SORT(RANK));
    expect(columnItems()).toHaveLength(COLUMNS.length + 1);
    expect(columnItems().at(-1)?.textContent).toBe('SHIPPER(not in the input)');
    expect(checkbox('SHIPPER').checked).toBe(true);
    fireEvent.click(checkbox('SHIPPER'));
    expect(within(columnList()).queryByText('SHIPPER')).toBeNull();
    expect(problems()).toEqual([MESSAGE_AGGREGATION_FUNCTION_NEEDS_SORT(RANK)]);
    fireEvent.click(button('Add sort column'));
    pickSort(1, 'ORDER_DATE');
    expect(problems()).toEqual([]);
    fireEvent.click(button('Apply'));
    expect(stored(editorState).columns).toEqual(['ORDER_ID']);
  });

  test("Unticks a saved partition column that can't be compared, and every column with None, for one window over all the rows", async () => {
    const editorState = await render(
      ordersPartitioned(['ORDER_ID', 'PAYLOAD'], [BY_DATE], [RANK_AGGREGATION]),
    );
    await openPartition();
    expect(problems()).toEqual([
      MESSAGE_PARTITION_COLUMN_NOT_PARTITIONABLE('PAYLOAD', 'Variant'),
    ]);
    expect(checkbox('PAYLOAD').checked).toBe(true);
    expect(checkbox('PAYLOAD').disabled).toBe(false);
    fireEvent.click(checkbox('PAYLOAD'));
    expect(checkbox('PAYLOAD').checked).toBe(false);
    // once unticked, it can't be ticked again
    expect(checkbox('PAYLOAD').disabled).toBe(true);
    expect(problems()).toEqual([]);
    fireEvent.click(button('None'));
    expect(checkboxes().some((box) => box.checked)).toBe(false);
    fireEvent.click(button('Apply'));
    expect(stored(editorState).columns).toEqual([]);
  });

  test('Sets Count when a column is picked first, and names the row after its column and function until a name is typed', async () => {
    const editorState = await render(ordersPartitioned([], [BY_DATE], []));
    await openPartition();
    pick(1, 'ORDER_ID');
    expect(functionPicker(1).value).toBe(COUNT);
    expect(name(1).value).toBe('ORDER_ID Count');
    choose(1, SUM);
    expect(name(1).value).toBe('ORDER_ID Sum');
    // a typed name no longer follows
    type(1, 'Running total');
    choose(1, AVERAGE);
    expect(name(1).value).toBe('Running total');
    // until it is typed as the auto-name
    type(1, 'ORDER_ID Average');
    choose(1, SUM);
    expect(name(1).value).toBe('ORDER_ID Sum');
    fireEvent.click(button('Apply'));
    expect(stored(editorState).aggregations).toEqual([
      { column: 'ORDER_ID', function: SUM, name: 'ORDER_ID Sum' },
    ]);
  });

  test("Offers the column type's functions, then Count Rows, Rank, Dense Rank and Row Number; every column function before a column is picked", async () => {
    await render(ordersPartitioned([], [BY_DATE], []));
    await openPartition();
    expect(functions(1)).toEqual([
      'Pick a function',
      ...ALL_COLUMN_FUNCTIONS,
      ...NO_COLUMN_FUNCTIONS,
    ]);
    pick(1, 'SHIP_COUNTRY');
    expect(functions(1)).toEqual([
      'Count',
      'Distinct Count',
      'Distinct Value',
      ...NO_COLUMN_FUNCTIONS,
    ]);
    pick(1, 'ORDER_ID');
    expect(functions(1)).toEqual([
      ...ALL_COLUMN_FUNCTIONS,
      ...NO_COLUMN_FUNCTIONS,
    ]);
    pick(1, 'ORDER_DATE');
    expect(functions(1)).toEqual([
      'Count',
      'Distinct Count',
      'Distinct Value',
      'Min',
      'Max',
      ...NO_COLUMN_FUNCTIONS,
    ]);
    // a Variant or unknown type can be counted, though not partitioned by
    pick(1, 'PAYLOAD');
    expect(functions(1)).toEqual(['Count', ...NO_COLUMN_FUNCTIONS]);
    pick(1, 'SHAPE');
    expect(functions(1)).toEqual(['Count', ...NO_COLUMN_FUNCTIONS]);
    expectRowProblem(1, undefined);
    // a function the column doesn't offer stays listed, first, and is marked
    pick(1, 'FREIGHT');
    choose(1, SUM);
    pick(1, 'SHIP_COUNTRY');
    expect(functionPicker(1).value).toBe(SUM);
    expect(functions(1)).toEqual([
      'Sum',
      'Count',
      'Distinct Count',
      'Distinct Value',
      ...NO_COLUMN_FUNCTIONS,
    ]);
    const incompatible = MESSAGE_AGGREGATION_FUNCTION_INCOMPATIBLE(
      SUM,
      'SHIP_COUNTRY',
    );
    expectRowProblem(1, incompatible);
    expect(problems()).toEqual([incompatible]);
  });

  test('Shows a saved function no window knows first, as unknown, with its message', async () => {
    const editorState = await render(
      ordersPartitioned(
        [],
        [BY_DATE],
        [{ column: 'FREIGHT', function: 'Median', name: 'Middle' }],
      ),
    );
    await openPartition();
    expect(functionPicker(1).value).toBe('Median');
    expect(functions(1)).toEqual([
      'Median (unknown)',
      ...ALL_COLUMN_FUNCTIONS,
      ...NO_COLUMN_FUNCTIONS,
    ]);
    const unknown = MESSAGE_AGGREGATION_FUNCTION_UNKNOWN('Median');
    expectRowProblem(1, unknown);
    expect(problems()).toEqual([unknown]);
    // nothing changes until something is changed
    expect(button('Apply').disabled).toBe(true);
    choose(1, AVERAGE);
    expect(functions(1)).toEqual([
      ...ALL_COLUMN_FUNCTIONS,
      ...NO_COLUMN_FUNCTIONS,
    ]);
    expectRowProblem(1, undefined);
    fireEvent.click(button('Apply'));
    // the saved name was the user's, so it stays
    expect(stored(editorState).aggregations).toEqual([
      { column: 'FREIGHT', function: AVERAGE, name: 'Middle' },
    ]);
  });

  test('Shows "By the sort columns" in place of the column for Rank, Dense Rank and Row Number, and "Every row" for Count Rows', async () => {
    await render(ordersPartitioned([], [BY_DATE], []));
    await openPartition();
    pick(1, 'FREIGHT');
    (
      [
        [RANK, 'Rank', 'By the sort columns'],
        [DENSE_RANK, 'Dense Rank', 'By the sort columns'],
        [ROW_NUMBER, 'Row Number', 'By the sort columns'],
        [COUNT_ROWS, 'Count Rows', 'Every row'],
      ] as const
    ).forEach(([fn, autoName, text]) => {
      choose(1, fn);
      expect(
        within(panel()).queryByLabelText('Aggregation column 1'),
      ).toBeNull();
      expect(within(row(1)).getByText(text)).toBeDefined();
      // the column was cleared, so there is none to clear
      expect(queryButton('Clear column 1')).toBeNull();
      expect(name(1).value).toBe(autoName);
      expect(functions(1)).toEqual([
        ...ALL_COLUMN_FUNCTIONS,
        ...NO_COLUMN_FUNCTIONS,
      ]);
      expectRowProblem(1, undefined);
    });
    // back to a column function: a column to pick again
    choose(1, SUM);
    expect(columnPicker(1).value).toBe('');
    expect(within(row(1)).queryByText('Every row')).toBeNull();
    expect(name(1).value).toBe('');
    // left out until its column is picked
    expectRowProblem(1, undefined);
    expect(problems()).toEqual([MESSAGE_CANNOT_BE_EMPTY('Aggregations')]);
  });

  test('Marks a rank function with no sort column on its function select, until a sort row has a column', async () => {
    const editorState = await render(
      ordersPartitioned(['SHIP_COUNTRY'], [], []),
    );
    await openPartition();
    choose(1, RANK);
    const needsSort =
      'Aggregation function "Rank" requires at least one sort column.';
    expectRowProblem(1, needsSort);
    expect(problems()).toEqual([needsSort]);
    // a sort row without a column doesn't sort the window
    fireEvent.click(button('Add sort column'));
    expectRowProblem(1, needsSort);
    expect(problems()).toEqual([needsSort]);
    pickSort(1, 'ORDER_DATE');
    expectRowProblem(1, undefined);
    expect(problems()).toEqual([]);
    // removed again: the problem comes back
    fireEvent.click(button('Remove sort column 1'));
    expectRowProblem(1, needsSort);
    fireEvent.click(button('Add sort column'));
    pickSort(1, 'ORDER_ID');
    fireEvent.click(button('Apply'));
    expect(stored(editorState).sorts).toEqual([
      { column: 'ORDER_ID', direction: ASC },
    ]);
    expect(stored(editorState).aggregations).toEqual([RANK_AGGREGATION]);
  });

  test("Judges a saved Rank by the node's own sort until something changes: a saved blank sort key still counts", async () => {
    await render(
      ordersPartitioned(
        ['SHIP_COUNTRY'],
        [{ column: '', direction: DESC }],
        [RANK_AGGREGATION],
      ),
    );
    await openPartition();
    // as saved, the node sorts, by a key without a column, which it reports
    expectRowProblem(1, undefined);
    expect(problems()).toEqual(['Sort column does not have a name.']);
    // once something changes, the blank key is left out: Rank needs a sort
    fireEvent.click(checkbox('ORDER_ID'));
    const needsSort =
      'Aggregation function "Rank" requires at least one sort column.';
    expectRowProblem(1, needsSort);
    expect(problems()).toEqual([needsSort]);
  });

  test('Offers to clear the column a saved function that takes none holds, which the node refuses', async () => {
    const editorState = await render(
      ordersPartitioned(
        [],
        [],
        [
          { column: 'ORDER_ID', function: RANK, name: 'Rank' },
          { column: 'ORDER_ID', function: DENSE_RANK, name: 'Dense Rank' },
          { column: 'ORDER_ID', function: COUNT_ROWS, name: 'Count Rows' },
        ],
      ),
    );
    await openPartition();
    expect(within(row(1)).getByText('By the sort columns')).toBeDefined();
    expect(within(row(3)).getByText('Every row')).toBeDefined();
    // titled in sentence case
    expect(button('Clear column 1').title).toBe(
      'Rank takes no column: clear it',
    );
    expect(button('Clear column 2').title).toBe(
      'Dense rank takes no column: clear it',
    );
    expect(button('Clear column 3').title).toBe(
      'Count rows takes no column: clear it',
    );
    expectRowProblem(1, 'Aggregation function "Rank" does not allow column.');
    expectRowProblem(
      2,
      MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_COLUMN(DENSE_RANK),
    );
    expectRowProblem(
      3,
      MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_COLUMN(COUNT_ROWS),
    );
    fireEvent.click(button('Clear column 1'));
    expect(queryButton('Clear column 1')).toBeNull();
    // its column cleared, the rank still needs a sort
    expectRowProblem(1, MESSAGE_AGGREGATION_FUNCTION_NEEDS_SORT(RANK));
    fireEvent.click(button('Clear column 2'));
    // the needs-sort message quotes the function as saved
    expectRowProblem(
      2,
      'Aggregation function "DenseRank" requires at least one sort column.',
    );
    fireEvent.click(button('Clear column 3'));
    expectRowProblem(3, undefined);
    fireEvent.click(button('Add sort column'));
    pickSort(1, 'ORDER_DATE');
    expectRowProblem(1, undefined);
    expectRowProblem(2, undefined);
    expect(problems()).toEqual([]);
    fireEvent.click(button('Apply'));
    expect(stored(editorState).aggregations).toEqual([
      RANK_AGGREGATION,
      { column: undefined, function: DENSE_RANK, name: 'Dense Rank' },
      { column: undefined, function: COUNT_ROWS, name: 'Count Rows' },
    ]);
  });

  test('Marks each window-function row with its first problem, under it and on its name, as the node judges it', async () => {
    await render(ordersPartitioned([], [BY_DATE], [RANK_AGGREGATION]));
    await openPartition();
    // a name that folds to an input column's
    type(1, 'order_id');
    const isInputColumn =
      MESSAGE_AGGREGATION_OUTPUT_NAME_IS_INPUT_COLUMN('order_id');
    expectRowProblem(1, isInputColumn);
    expect(problems()).toEqual([isInputColumn]);
    // two ranks under the same name: both marked
    type(1, 'Rank');
    fireEvent.click(button('Add window function'));
    choose(2, RANK);
    expect(name(2).value).toBe('Rank');
    const duplicate = MESSAGE_ALREADY_IN_OUTPUT_SCHEMA(
      'Aggregation output name',
      'Rank',
    );
    expectRowProblem(1, duplicate);
    expectRowProblem(2, duplicate);
    expect(problems()).toEqual([duplicate]);
    // the other rank under its own name is fine
    choose(2, DENSE_RANK);
    expect(name(2).value).toBe('Dense Rank');
    expectRowProblem(1, undefined);
    expectRowProblem(2, undefined);
    expect(problems()).toEqual([]);
  });

  test('Judges a filled window-function row after a blank one by its own window function', async () => {
    const editorState = await render(ordersPartitioned([], [], []));
    await openPartition();
    fireEvent.click(button('Add window function'));
    choose(2, ROW_NUMBER);
    expectRowProblem(1, undefined);
    expectRowProblem(2, MESSAGE_AGGREGATION_FUNCTION_NEEDS_SORT(ROW_NUMBER));
    fireEvent.click(button('Add sort column'));
    pickSort(1, 'ORDER_ID');
    type(2, 'SHIP_COUNTRY');
    expectRowProblem(1, undefined);
    expectRowProblem(
      2,
      MESSAGE_AGGREGATION_OUTPUT_NAME_IS_INPUT_COLUMN('SHIP_COUNTRY'),
    );
    type(2, 'Row');
    expectRowProblem(2, undefined);
    fireEvent.click(button('Apply'));
    // the blank row is left out
    expect(stored(editorState).aggregations).toEqual([
      { column: undefined, function: ROW_NUMBER, name: 'Row' },
    ]);
  });

  test("Sorts the window as a Sort does: a column another row has, or one that can't be sorted, can't be picked", async () => {
    await render(
      ordersPartitioned(
        [],
        [{ column: 'ORDER_ID', direction: ASC }],
        [RANK_AGGREGATION],
      ),
    );
    await openPartition();
    expect(
      Array.from(directionPicker(1).options).map(({ text }) => text),
    ).toEqual(['Ascending', 'Descending']);
    fireEvent.click(button('Add sort column'));
    expect(sortPicker(2).value).toBe('');
    expect(directionPicker(2).value).toBe(ASC);
    expect(sortOption(2, 'ORDER_ID').disabled).toBe(true);
    expect(sortOption(2, 'PAYLOAD').disabled).toBe(true);
    expect(sortOption(2, 'SHAPE').disabled).toBe(true);
    expect(sortOption(2, 'SHIP_COUNTRY').disabled).toBe(false);
    // each says why
    expect(sortOption(2, 'PAYLOAD').textContent).toBe(
      "PAYLOAD: Variant? (can't be sorted)",
    );
    expect(sortOption(2, 'ORDER_ID').textContent).toBe(
      'ORDER_ID: SmallInt (already sorted on)',
    );
    expect(sortOption(2, 'SHIP_COUNTRY').textContent).toBe(
      'SHIP_COUNTRY: Varchar(15)?',
    );
    // a row keeps its own column
    expect(sortOption(1, 'ORDER_ID').disabled).toBe(false);
    expect(sortOption(1, 'ORDER_ID').textContent).toBe('ORDER_ID: SmallInt');
  });

  test('Reorders the sort rows, the first sorting first, never past either end', async () => {
    const editorState = await render(
      ordersPartitioned(
        [],
        [
          { column: 'ORDER_ID', direction: ASC },
          { column: 'SHIP_COUNTRY', direction: DESC },
        ],
        [RANK_AGGREGATION],
      ),
    );
    await openPartition();
    expect(button('Move sort column 1 up').disabled).toBe(true);
    expect(button('Move sort column 1 down').disabled).toBe(false);
    expect(button('Move sort column 2 up').disabled).toBe(false);
    expect(button('Move sort column 2 down').disabled).toBe(true);
    fireEvent.click(button('Move sort column 2 up'));
    expect([sortPicker(1).value, directionPicker(1).value]).toEqual([
      'SHIP_COUNTRY',
      DESC,
    ]);
    fireEvent.click(button('Apply'));
    expect(stored(editorState).sorts).toEqual([
      { column: 'SHIP_COUNTRY', direction: DESC },
      { column: 'ORDER_ID', direction: ASC },
    ]);
  });

  test('Marks each saved sort row with its first problem, as the node judges it', async () => {
    await render(
      ordersPartitioned(
        [],
        [
          { column: 'PAYLOAD', direction: ASC },
          { column: 'SHIPPER', direction: ASC },
          { column: 'ORDER_ID', direction: ASC },
          { column: 'ORDER_ID', direction: DESC },
        ],
        [RANK_AGGREGATION],
      ),
    );
    await openPartition();
    const notSortable = MESSAGE_SORT_COLUMN_NOT_SORTABLE('PAYLOAD', 'Variant');
    const notInInput = MESSAGE_NOT_IN_INPUT_SCHEMA('Sort column', 'SHIPPER');
    expect(problems()).toEqual([notSortable, notInInput]);
    expect(sortPicker(1).getAttribute('aria-invalid')).toBe('true');
    expect(sortPicker(2).getAttribute('aria-invalid')).toBe('true');
    expect(sortPicker(3).getAttribute('aria-invalid')).toBe('false');
    // the repeat is marked on its second row
    expect(sortPicker(4).getAttribute('aria-invalid')).toBe('true');
    expect(sortRowMessages(1)).toEqual([notSortable]);
    expect(sortRowMessages(2)).toEqual([notInInput]);
    expect(sortRowMessages(3)).toEqual([]);
    expect(sortRowMessages(4)).toEqual([
      MESSAGE_CANNOT_HAVE_DUPLICATES('Sort columns'),
    ]);
  });

  test('Stops adding sort rows once every sortable column has one, and always adds window functions', async () => {
    const editorState = await render(
      ordersPartitioned([], [BY_DATE], [RANK_AGGREGATION]),
    );
    await openPartition();
    fireEvent.click(button('Remove sort column 1'));
    expect(sortRows()).toEqual([]);
    // every ORDERS column sorts; the Variant and unknown ones don't
    for (let added = 1; added <= ORDERS_COLUMNS.length; added += 1) {
      expect(button('Add sort column').disabled).toBe(false);
      expect(button('Add sort column').title).toBe(
        'Add a column to sort the window by',
      );
      fireEvent.click(button('Add sort column'));
    }
    expect(sortRows()).toHaveLength(ORDERS_COLUMNS.length);
    expect(button('Add sort column').disabled).toBe(true);
    expect(button('Add sort column').title).toBe(
      'Every column that can be sorted already has a row',
    );
    // more window functions than the input has columns
    for (let added = 1; added <= COLUMNS.length + 1; added += 1) {
      expect(button('Add window function').disabled).toBe(false);
      fireEvent.click(button('Add window function'));
    }
    expect(button('Add window function').disabled).toBe(false);
    expect(rows()).toHaveLength(COLUMNS.length + 2);
    fireEvent.click(button('Remove aggregation 1'));
    expect(rows()).toHaveLength(COLUMNS.length + 1);
    fireEvent.click(button('Cancel'));
    expect(editorState.history).toHaveLength(0);
    expect(stored(editorState).sorts).toEqual([BY_DATE]);
    expect(stored(editorState).aggregations).toEqual([RANK_AGGREGATION]);
  });

  test('Shows a read-only cube without letting it change', async () => {
    const editorState = await render(new Query());
    await TEST__importDocument(
      editorState,
      new CubeDocument({
        context: CONTEXT,
        query: ordersPartitioned(
          ['ORDER_ID', 'SHIPPER'],
          [BY_DATE, { column: 'ORDER_ID', direction: ASC }],
          [
            { column: 'ORDER_ID', function: RANK, name: 'Rank' },
            { column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum' },
          ],
        ),
      }),
      true,
    );
    await openPartition();
    // the window functions
    expect(button('Clear column 1').disabled).toBe(true);
    expect(functionPicker(1).disabled).toBe(true);
    expect(name(1).disabled).toBe(true);
    expect(button('Remove aggregation 1').disabled).toBe(true);
    expect(columnPicker(2).disabled).toBe(true);
    expect(functionPicker(2).disabled).toBe(true);
    expect(name(2).disabled).toBe(true);
    expect(button('Remove aggregation 2').disabled).toBe(true);
    expect(button('Add window function').disabled).toBe(true);
    // the partition columns
    expect(checkboxes().every((box) => box.disabled)).toBe(true);
    expect(button('None').disabled).toBe(true);
    // the sort rows
    [1, 2].forEach((position) => {
      expect(sortPicker(position).disabled).toBe(true);
      expect(directionPicker(position).disabled).toBe(true);
      expect(button(`Move sort column ${position} up`).disabled).toBe(true);
      expect(button(`Move sort column ${position} down`).disabled).toBe(true);
      expect(button(`Remove sort column ${position}`).disabled).toBe(true);
    });
    expect(button('Add sort column').disabled).toBe(true);
    expect(button('Add sort column').title).toBe(READ_ONLY_CUBE_TITLE);
    expect(button('Apply').disabled).toBe(true);
    // the problems still show
    expect(problems()).toEqual([
      MESSAGE_NOT_IN_INPUT_SCHEMA('Partition column', 'SHIPPER'),
    ]);
  });
});
