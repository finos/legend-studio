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
  Connection,
  CubeDocument,
  Group,
  MESSAGE_AGGREGATION_FUNCTION_EMPTY,
  MESSAGE_AGGREGATION_FUNCTION_INCOMPATIBLE,
  MESSAGE_AGGREGATION_FUNCTION_UNKNOWN,
  MESSAGE_AGGREGATION_OUTPUT_NAME_EMPTY,
  MESSAGE_AGGREGATION_OUTPUT_NAME_INVALID,
  MESSAGE_AGGREGATION_OUTPUT_NAME_IS_INPUT_COLUMN,
  MESSAGE_ALREADY_IN_OUTPUT_SCHEMA,
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_GROUP_COLUMN_NOT_GROUPABLE,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
  OpaqueType,
  PrimitiveType,
  Query,
  SchemaColumn,
} from '@finos/legend-cube';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  COLUMN_NAME_RULES_HINT,
  GROUP_EDITOR_NOTES,
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
import { CubeNodeEditorPanel } from '../CubeNodeEditorPanel.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const { COUNT, DISTINCT_COUNT, SUM, AVERAGE, MAX, COUNT_ROWS } =
  AggregationFunction;
/** ORDERS, with a Variant column and a column of a type Cube doesn't know */
const COLUMNS = [
  ...ORDERS_COLUMNS,
  new SchemaColumn('PAYLOAD', PrimitiveType.get('Variant'), true),
  new SchemaColumn('SHAPE', OpaqueType.get('meta::external::Shape'), true),
];
const COUNT_ROWS_AGGREGATION: ColumnAggregation = {
  column: undefined,
  function: COUNT_ROWS,
  name: 'Count Rows',
};
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

const ordersGrouped = (
  columns: string[],
  aggregations: ColumnAggregation[],
): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', COLUMNS),
      new Group('group101', columns, aggregations),
    ],
    [new Connection('relational101', 'group101', 'tds')],
    'group101',
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
      <CubeNodeEditorPanel editorState={editorState} />
    </div>,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.CANVAS,
  );
  return editorState;
};

const panel = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);

const openGroup = async (): Promise<void> => {
  fireEvent.click(await TEST__findCanvasNode('group101'));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
};

const keyList = (): HTMLElement =>
  within(panel()).getByRole('list', { name: 'Group columns' });

const keyItems = (): HTMLElement[] =>
  within(keyList()).getAllByRole('listitem');

const checkbox = (name: string): HTMLInputElement =>
  within(keyList()).getByRole<HTMLInputElement>('checkbox', {
    name: new RegExp(`^${name}\\b`, 'u'),
  });

const aggregationList = (): HTMLElement =>
  within(panel()).getByRole('list', { name: 'Aggregations' });

const rows = (): HTMLElement[] =>
  within(aggregationList()).queryAllByRole('listitem');

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

const button = (label: string): HTMLButtonElement =>
  within(panel()).getByRole<HTMLButtonElement>('button', { name: label });

const problems = (): string[] =>
  Array.from(
    within(panel()).queryByRole('alert', { name: 'Problems' })?.children ?? [],
  ).map((problem) => problem.textContent ?? '');

/** The messages shown under a row's two lines of controls */
const rowMessages = (position: number): string[] =>
  Array.from(row(position).children)
    .slice(2)
    .map((message) => message.textContent ?? '');

/**
 * A row's problem, as shown under it and on the control it is about (its
 * column, its function, or else its name): none, or exactly this one
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

const stored = (editorState: CubeEditorState): Group =>
  editorState.document.query.getNode('group101') as Group;

beforeEach(() => {
  localStorage.clear();
});

describe('Group editor', () => {
  test("Lists the input's columns in order, with their types, a Variant or unknown type shown but not tickable", async () => {
    await render(ordersGrouped([], []));
    await openGroup();
    // the blank row is left out, so there's no aggregation yet
    expect(problems()).toEqual([MESSAGE_CANNOT_BE_EMPTY('Aggregations')]);
    expect(keyItems().map((item) => item.textContent)).toEqual([
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
      "PAYLOADVariant? (can't be grouped)",
      "SHAPEShape? (can't be grouped)",
    ]);
    expect(checkbox('ORDER_ID').disabled).toBe(false);
    expect(checkbox('PAYLOAD').disabled).toBe(true);
    expect(checkbox('SHAPE').disabled).toBe(true);
    expect(
      within(keyList())
        .getAllByRole<HTMLInputElement>('checkbox')
        .some((box) => box.checked),
    ).toBe(false);
    // both lists scroll on their own, so the editor fits wherever it is shown
    expect(keyList().className).toContain('overflow-auto');
    expect(aggregationList().className).toContain('overflow-auto');
    // one blank row to start, not yet a problem
    expect(rows()).toHaveLength(1);
    expect(columnPicker(1).value).toBe('');
    expect(functionPicker(1).value).toBe('');
    expect(name(1).value).toBe('');
    expectRowProblem(1, undefined);
    // the notes, and the rule for names
    [...GROUP_EDITOR_NOTES, COLUMN_NAME_RULES_HINT].forEach((note) =>
      expect(within(panel()).getByText(note)).toBeDefined(),
    );
  });

  test("Stores ticked keys in the input's order on Apply, as one undo step", async () => {
    const editorState = await render(
      ordersGrouped([], [COUNT_ROWS_AGGREGATION]),
    );
    await openGroup();
    expect(problems()).toEqual([]);
    expect(button('Apply').disabled).toBe(true);
    fireEvent.click(checkbox('SHIP_COUNTRY'));
    fireEvent.click(checkbox('ORDER_ID'));
    expect(checkbox('SHIP_COUNTRY').checked).toBe(true);
    expect(checkbox('ORDER_ID').checked).toBe(true);
    fireEvent.click(button('Apply'));
    expect(stored(editorState).columns).toEqual(['ORDER_ID', 'SHIP_COUNTRY']);
    expect(stored(editorState).aggregations).toEqual([COUNT_ROWS_AGGREGATION]);
    expect(editorState.history).toHaveLength(1);
    expect(editorState.analysis.schemas.get('group101')?.names()).toEqual([
      'ORDER_ID',
      'SHIP_COUNTRY',
      'Count Rows',
    ]);
    await waitFor(async () =>
      expect(
        TEST__getCanvasNodeTooltip(await TEST__findCanvasNode('group101')),
      ).toContain('Group by "ORDER_ID", "SHIP_COUNTRY"'),
    );
  });

  test('Keeps a saved order of keys until the picks change', async () => {
    const editorState = await render(
      ordersGrouped(['SHIP_COUNTRY', 'ORDER_ID'], [COUNT_ROWS_AGGREGATION]),
    );
    await openGroup();
    expect(checkbox('SHIP_COUNTRY').checked).toBe(true);
    expect(checkbox('ORDER_ID').checked).toBe(true);
    // a name changed, the keys untouched: their order stays
    type(1, 'Orders');
    fireEvent.click(button('Apply'));
    expect(stored(editorState).columns).toEqual(['SHIP_COUNTRY', 'ORDER_ID']);
    expect(stored(editorState).aggregations).toEqual([
      { column: undefined, function: COUNT_ROWS, name: 'Orders' },
    ]);
    // a key ticked: the keys follow the input's order
    fireEvent.click(checkbox('EMPLOYEE_ID'));
    fireEvent.click(button('Apply'));
    expect(stored(editorState).columns).toEqual([
      'ORDER_ID',
      'EMPLOYEE_ID',
      'SHIP_COUNTRY',
    ]);
    expect(editorState.history).toHaveLength(2);
  });

  test('Adds nothing to undo for Cancel, or for a key ticked and unticked again', async () => {
    const editorState = await render(
      ordersGrouped(['ORDER_ID'], [COUNT_ROWS_AGGREGATION]),
    );
    await openGroup();
    fireEvent.click(checkbox('SHIP_COUNTRY'));
    fireEvent.click(checkbox('SHIP_COUNTRY'));
    expect(button('Apply').disabled).toBe(true);
    fireEvent.click(checkbox('SHIP_COUNTRY'));
    fireEvent.click(button('Cancel'));
    expect(editorState.history).toHaveLength(0);
    expect(stored(editorState).columns).toEqual(['ORDER_ID']);
  });

  test('Lists a saved key the input lost, last and ticked, until it is unticked', async () => {
    const editorState = await render(
      ordersGrouped(['ORDER_ID', 'SHIPPER'], [COUNT_ROWS_AGGREGATION]),
    );
    await openGroup();
    expect(problems()).toEqual([
      MESSAGE_NOT_IN_INPUT_SCHEMA('Group column', 'SHIPPER'),
    ]);
    expect(keyItems()).toHaveLength(COLUMNS.length + 1);
    expect(keyItems().at(-1)?.textContent).toBe('SHIPPER(not in the input)');
    expect(checkbox('SHIPPER').checked).toBe(true);
    fireEvent.click(checkbox('SHIPPER'));
    expect(within(keyList()).queryByText('SHIPPER')).toBeNull();
    expect(problems()).toEqual([]);
    fireEvent.click(button('Apply'));
    expect(stored(editorState).columns).toEqual(['ORDER_ID']);
  });

  test('Unticks every key with None, for one row of all the rows', async () => {
    const editorState = await render(
      ordersGrouped(['ORDER_ID', 'PAYLOAD'], [COUNT_ROWS_AGGREGATION]),
    );
    await openGroup();
    expect(problems()).toEqual([
      MESSAGE_GROUP_COLUMN_NOT_GROUPABLE('PAYLOAD', 'Variant'),
    ]);
    expect(checkbox('PAYLOAD').checked).toBe(true);
    fireEvent.click(button('None'));
    expect(
      within(keyList())
        .getAllByRole<HTMLInputElement>('checkbox')
        .some((box) => box.checked),
    ).toBe(false);
    expect(problems()).toEqual([]);
    fireEvent.click(button('Apply'));
    expect(stored(editorState).columns).toEqual([]);
    expect(editorState.analysis.schemas.get('group101')?.names()).toEqual([
      'Count Rows',
    ]);
    await waitFor(async () =>
      expect(
        TEST__getCanvasNodeTooltip(await TEST__findCanvasNode('group101')),
      ).toContain('Aggregate all rows'),
    );
  });

  test('Sets Count when a column is picked first, and names the row after its column and function until a name is typed', async () => {
    const editorState = await render(ordersGrouped(['SHIP_COUNTRY'], []));
    await openGroup();
    pick(1, 'ORDER_ID');
    expect(functionPicker(1).value).toBe(COUNT);
    expect(name(1).value).toBe('ORDER_ID Count');
    choose(1, SUM);
    expect(name(1).value).toBe('ORDER_ID Sum');
    // a function already picked stays when the column changes
    pick(1, 'FREIGHT');
    expect(functionPicker(1).value).toBe(SUM);
    expect(name(1).value).toBe('FREIGHT Sum');
    // a typed name no longer follows
    type(1, 'Total');
    choose(1, AVERAGE);
    expect(name(1).value).toBe('Total');
    // until it is typed as the auto-name
    type(1, 'FREIGHT Average');
    choose(1, MAX);
    expect(name(1).value).toBe('FREIGHT Max');
    expect(problems()).toEqual([]);
    fireEvent.click(button('Apply'));
    expect(stored(editorState).aggregations).toEqual([
      { column: 'FREIGHT', function: MAX, name: 'FREIGHT Max' },
    ]);
    expect(editorState.history).toHaveLength(1);
    expect(editorState.analysis.schemas.get('group101')?.names()).toEqual([
      'SHIP_COUNTRY',
      'FREIGHT Max',
    ]);
  });

  test("Offers the functions of the column's type, then Count Rows; every column function before a column is picked", async () => {
    await render(ordersGrouped([], []));
    await openGroup();
    expect(functions(1)).toEqual([
      'Pick a function',
      ...ALL_COLUMN_FUNCTIONS,
      'Count Rows',
    ]);
    pick(1, 'SHIP_COUNTRY');
    expect(functions(1)).toEqual([
      'Count',
      'Distinct Count',
      'Distinct Value',
      'Count Rows',
    ]);
    pick(1, 'ORDER_ID');
    expect(functions(1)).toEqual([...ALL_COLUMN_FUNCTIONS, 'Count Rows']);
    pick(1, 'ORDER_DATE');
    expect(functions(1)).toEqual([
      'Count',
      'Distinct Count',
      'Distinct Value',
      'Min',
      'Max',
      'Count Rows',
    ]);
    // a Variant or unknown type can be counted, though not grouped by
    pick(1, 'PAYLOAD');
    expect(functions(1)).toEqual(['Count', 'Count Rows']);
    expectRowProblem(1, undefined);
    pick(1, 'SHAPE');
    expect(functions(1)).toEqual(['Count', 'Count Rows']);
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
      'Count Rows',
    ]);
    const incompatible = MESSAGE_AGGREGATION_FUNCTION_INCOMPATIBLE(
      SUM,
      'SHIP_COUNTRY',
    );
    expectRowProblem(1, incompatible);
    expect(problems()).toEqual([incompatible]);
  });

  test('Counts every row with Count Rows, which takes no column', async () => {
    const editorState = await render(ordersGrouped(['SHIP_COUNTRY'], []));
    await openGroup();
    pick(1, 'ORDER_ID');
    choose(1, COUNT_ROWS);
    expect(within(panel()).queryByLabelText('Aggregation column 1')).toBeNull();
    expect(within(row(1)).getByText('Every row')).toBeDefined();
    expect(name(1).value).toBe('Count Rows');
    expect(functions(1)).toEqual([...ALL_COLUMN_FUNCTIONS, 'Count Rows']);
    expect(problems()).toEqual([]);
    // back to a column function: a column to pick again
    choose(1, DISTINCT_COUNT);
    expect(columnPicker(1).value).toBe('');
    expect(within(row(1)).queryByText('Every row')).toBeNull();
    expect(name(1).value).toBe('');
    // left out until its column is picked
    expectRowProblem(1, undefined);
    expect(problems()).toEqual([MESSAGE_CANNOT_BE_EMPTY('Aggregations')]);
    choose(1, COUNT_ROWS);
    fireEvent.click(button('Apply'));
    expect(stored(editorState).aggregations).toEqual([COUNT_ROWS_AGGREGATION]);
    expect(editorState.analysis.schemas.get('group101')?.names()).toEqual([
      'SHIP_COUNTRY',
      'Count Rows',
    ]);
  });

  test('Shows a saved unknown or empty function as it is, with its message', async () => {
    const editorState = await render(
      ordersGrouped(
        ['SHIP_COUNTRY'],
        [
          { column: 'ORDER_ID', function: 'Rank', name: 'Rank' },
          { column: 'FREIGHT', function: '', name: 'Freight total' },
        ],
      ),
    );
    await openGroup();
    expect(functionPicker(1).value).toBe('Rank');
    // a Group doesn't know Rank, so its row keeps the column like any other
    expect(columnPicker(1).value).toBe('ORDER_ID');
    expect(screen.queryByRole('button', { name: 'Clear column 1' })).toBeNull();
    expect(functions(1)).toEqual([
      'Rank (unknown)',
      ...ALL_COLUMN_FUNCTIONS,
      'Count Rows',
    ]);
    const unknown = MESSAGE_AGGREGATION_FUNCTION_UNKNOWN('Rank');
    expectRowProblem(1, unknown);
    expect(functionPicker(2).value).toBe('');
    expect(functions(2)).toEqual([
      'Pick a function',
      ...ALL_COLUMN_FUNCTIONS,
      'Count Rows',
    ]);
    expectRowProblem(2, MESSAGE_AGGREGATION_FUNCTION_EMPTY);
    expect(problems()).toEqual([unknown, MESSAGE_AGGREGATION_FUNCTION_EMPTY]);
    // nothing changes until something is changed
    expect(button('Apply').disabled).toBe(true);
    choose(1, DISTINCT_COUNT);
    choose(2, SUM);
    expect(functions(1)).toEqual([...ALL_COLUMN_FUNCTIONS, 'Count Rows']);
    expectRowProblem(1, undefined);
    expectRowProblem(2, undefined);
    expect(problems()).toEqual([]);
    fireEvent.click(button('Apply'));
    // the saved names were the user's, so they stay
    expect(stored(editorState).aggregations).toEqual([
      { column: 'ORDER_ID', function: DISTINCT_COUNT, name: 'Rank' },
      { column: 'FREIGHT', function: SUM, name: 'Freight total' },
    ]);
  });

  test('Marks each row with its first problem, under it and on its name, as the node judges it', async () => {
    await render(ordersGrouped(['SHIP_COUNTRY'], []));
    await openGroup();
    pick(1, 'ORDER_ID');
    // a name that folds to an input column's
    type(1, 'order_id');
    const isInputColumn =
      MESSAGE_AGGREGATION_OUTPUT_NAME_IS_INPUT_COLUMN('order_id');
    expectRowProblem(1, isInputColumn);
    expect(problems()).toEqual([isInputColumn]);
    type(1, ' Orders');
    expectRowProblem(1, MESSAGE_AGGREGATION_OUTPUT_NAME_INVALID);
    type(1, '');
    expectRowProblem(1, MESSAGE_AGGREGATION_OUTPUT_NAME_EMPTY);
    // a column aggregated twice the same way: the same name, both marked
    type(1, 'ORDER_ID Count');
    fireEvent.click(button('Add aggregation'));
    pick(2, 'ORDER_ID');
    expect(name(2).value).toBe('ORDER_ID Count');
    const duplicate = MESSAGE_ALREADY_IN_OUTPUT_SCHEMA(
      'Aggregation output name',
      'ORDER_ID Count',
    );
    expectRowProblem(1, duplicate);
    expectRowProblem(2, duplicate);
    expect(problems()).toEqual([duplicate]);
    // the same column another way is fine
    choose(2, DISTINCT_COUNT);
    expect(name(2).value).toBe('ORDER_ID Distinct Count');
    expectRowProblem(1, undefined);
    expectRowProblem(2, undefined);
    expect(problems()).toEqual([]);
  });

  test('Judges a filled row after a blank one by its own aggregation', async () => {
    const editorState = await render(ordersGrouped(['SHIP_COUNTRY'], []));
    await openGroup();
    fireEvent.click(button('Add aggregation'));
    pick(2, 'ORDER_ID');
    type(2, 'SHIP_COUNTRY');
    expectRowProblem(1, undefined);
    expectRowProblem(
      2,
      MESSAGE_AGGREGATION_OUTPUT_NAME_IS_INPUT_COLUMN('SHIP_COUNTRY'),
    );
    type(2, 'Orders');
    expectRowProblem(2, undefined);
    fireEvent.click(button('Apply'));
    // the blank row is left out
    expect(stored(editorState).aggregations).toEqual([
      { column: 'ORDER_ID', function: COUNT, name: 'Orders' },
    ]);
  });

  test('Shows only the first problem of a saved row', async () => {
    await render(
      ordersGrouped(
        ['SHIP_COUNTRY'],
        [
          { column: 'SHIPPER', function: SUM, name: '' },
          { column: 'SHIP_CITY', function: AVERAGE, name: '' },
        ],
      ),
    );
    await openGroup();
    // a column the input lost stays shown, so it can be fixed
    expect(columnPicker(1).value).toBe('SHIPPER');
    expect(columnPicker(1).getAttribute('aria-invalid')).toBe('true');
    const notInInput = MESSAGE_NOT_IN_INPUT_SCHEMA(
      'Aggregation column',
      'SHIPPER',
    );
    const incompatible = MESSAGE_AGGREGATION_FUNCTION_INCOMPATIBLE(
      AVERAGE,
      'SHIP_CITY',
    );
    expectRowProblem(1, notInInput);
    expectRowProblem(2, incompatible);
    expect(problems()).toEqual([notInInput, incompatible]);
    expect(
      within(panel()).queryByText(MESSAGE_AGGREGATION_OUTPUT_NAME_EMPTY),
    ).toBeNull();
  });

  test('Adds rows without limit, even more than the input has columns, and removes them', async () => {
    const editorState = await render(
      ordersGrouped(['SHIP_COUNTRY'], [COUNT_ROWS_AGGREGATION]),
    );
    await openGroup();
    // more rows than the input has columns
    for (let added = 1; added <= COLUMNS.length + 1; added += 1) {
      expect(button('Add aggregation').disabled).toBe(false);
      fireEvent.click(button('Add aggregation'));
    }
    expect(button('Add aggregation').disabled).toBe(false);
    expect(rows()).toHaveLength(COLUMNS.length + 2);
    // added rows are blank, and left out
    expect(columnPicker(2).value).toBe('');
    expect(problems()).toEqual([]);
    fireEvent.click(button('Remove aggregation 1'));
    expect(rows()).toHaveLength(COLUMNS.length + 1);
    expect(within(aggregationList()).queryByText('Every row')).toBeNull();
    expect(problems()).toEqual([MESSAGE_CANNOT_BE_EMPTY('Aggregations')]);
    while (rows().length) {
      fireEvent.click(button('Remove aggregation 1'));
    }
    expect(
      within(panel()).queryByLabelText('Aggregation function 1'),
    ).toBeNull();
    expect(button('Add aggregation').disabled).toBe(false);
    fireEvent.click(button('Cancel'));
    expect(editorState.history).toHaveLength(0);
    expect(stored(editorState).aggregations).toEqual([COUNT_ROWS_AGGREGATION]);
  });

  test('Shows a read-only cube without letting it change', async () => {
    const editorState = await render(new Query());
    await TEST__importDocument(
      editorState,
      new CubeDocument({
        context: CONTEXT,
        query: ordersGrouped(
          ['ORDER_ID', 'SHIPPER'],
          [
            { column: 'FREIGHT', function: SUM, name: 'FREIGHT Sum' },
            COUNT_ROWS_AGGREGATION,
          ],
        ),
      }),
      true,
    );
    await openGroup();
    expect(
      within(keyList())
        .getAllByRole<HTMLInputElement>('checkbox')
        .every((box) => box.disabled),
    ).toBe(true);
    expect(button('None').disabled).toBe(true);
    expect(columnPicker(1).disabled).toBe(true);
    expect(functionPicker(1).disabled).toBe(true);
    expect(name(1).disabled).toBe(true);
    expect(button('Remove aggregation 1').disabled).toBe(true);
    expect(functionPicker(2).disabled).toBe(true);
    expect(name(2).disabled).toBe(true);
    expect(button('Remove aggregation 2').disabled).toBe(true);
    expect(button('Add aggregation').disabled).toBe(true);
    expect(button('Apply').disabled).toBe(true);
    // the problems still show
    expect(problems()).toEqual([
      MESSAGE_NOT_IN_INPUT_SCHEMA('Group column', 'SHIPPER'),
    ]);
  });
  test("Unticks a saved key that can't be grouped on its own, keeping the others", async () => {
    const editorState = await render(
      ordersGrouped(['ORDER_ID', 'PAYLOAD'], [COUNT_ROWS_AGGREGATION]),
    );
    await openGroup();
    expect(checkbox('PAYLOAD').checked).toBe(true);
    expect(checkbox('PAYLOAD').disabled).toBe(false);
    fireEvent.click(checkbox('PAYLOAD'));
    expect(checkbox('PAYLOAD').checked).toBe(false);
    // once unticked, it can't be ticked again
    expect(checkbox('PAYLOAD').disabled).toBe(true);
    expect(problems()).toEqual([]);
    fireEvent.click(button('Apply'));
    expect(stored(editorState).columns).toEqual(['ORDER_ID']);
  });

  test('Offers to clear the column a saved Count rows holds, which it refuses', async () => {
    const editorState = await render(
      ordersGrouped(
        ['SHIP_COUNTRY'],
        [{ column: 'ORDER_ID', function: COUNT_ROWS, name: 'Count Rows' }],
      ),
    );
    await openGroup();
    expectRowProblem(
      1,
      'Aggregation function "CountRows" does not allow column.',
    );
    fireEvent.click(button('Clear column 1'));
    expectRowProblem(1, undefined);
    expect(
      within(panel()).queryByRole('button', { name: 'Clear column 1' }),
    ).toBeNull();
    fireEvent.click(button('Apply'));
    expect(stored(editorState).aggregations).toEqual([
      { column: undefined, function: COUNT_ROWS, name: 'Count Rows' },
    ]);
  });

  test('Marks the control a problem is about: a column the input lacks on the column picker, not the name', async () => {
    await render(
      ordersGrouped(
        ['SHIP_COUNTRY'],
        [{ column: 'SHIPPER', function: COUNT, name: 'SHIPPER Count' }],
      ),
    );
    await openGroup();
    expectRowProblem(
      1,
      MESSAGE_NOT_IN_INPUT_SCHEMA('Aggregation column', 'SHIPPER'),
    );
    expect(columnPicker(1).getAttribute('aria-invalid')).toBe('true');
    expect(name(1).getAttribute('aria-invalid')).toBe('false');
  });

  test('Shows an auto-name over 128 characters whole, as invalid, never cut', async () => {
    const long = 'C'.repeat(114);
    const { host } = TEST__createCubeHost();
    const editorState = new CubeEditorState(
      host,
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [
            northwindTable('relational101', 'ORDERS', [
              ...COLUMNS,
              new SchemaColumn(long, PrimitiveType.get('String'), true),
            ]),
            new Group('group101', ['SHIP_COUNTRY'], []),
          ],
          [new Connection('relational101', 'group101', 'tds')],
          'group101',
        ),
      }),
    );
    await TEST__renderInCubeApplication(
      <div style={{ display: 'flex' }}>
        <div style={{ width: 800, height: 400 }}>
          <CubeCanvas editorState={editorState} />
        </div>
        <CubeNodeEditorPanel editorState={editorState} />
      </div>,
      host.applicationStore,
      LEGEND_CUBE_TEST_ID.CANVAS,
    );
    await openGroup();
    pick(1, long);
    choose(1, DISTINCT_COUNT);
    expect(name(1).value).toBe(`${long} Distinct Count`);
    expect(name(1).value).toHaveLength(129);
    expectRowProblem(1, MESSAGE_AGGREGATION_OUTPUT_NAME_INVALID);
  });
});
