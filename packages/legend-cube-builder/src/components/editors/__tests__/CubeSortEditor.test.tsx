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
  type ColumnDirection,
  Connection,
  CubeDocument,
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_CANNOT_HAVE_DUPLICATES,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
  MESSAGE_SORT_COLUMN_NOT_SORTABLE,
  PrimitiveType,
  Query,
  SchemaColumn,
  Sort,
  SortDirection,
} from '@finos/legend-cube';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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
const { ASC, DESC } = SortDirection;
/** ORDERS, with a Variant column too */
const COLUMNS = [
  ...ORDERS_COLUMNS,
  new SchemaColumn('PAYLOAD', PrimitiveType.get('Variant'), true),
];

const ordersSorted = (sorts: ColumnDirection[]): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', COLUMNS),
      new Sort('sort101', sorts),
    ],
    [new Connection('relational101', 'sort101', 'tds')],
    'sort101',
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

const openSort = async (): Promise<void> => {
  fireEvent.click(await TEST__findCanvasNode('sort101'));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
};

const columnPicker = (position: number): HTMLSelectElement =>
  within(panel()).getByLabelText<HTMLSelectElement>(`Sort column ${position}`);

const directionPicker = (position: number): HTMLSelectElement =>
  within(panel()).getByLabelText<HTMLSelectElement>(
    `Sort direction ${position}`,
  );

const pick = (position: number, column: string): void => {
  fireEvent.change(columnPicker(position), { target: { value: column } });
};

const direct = (position: number, direction: SortDirection): void => {
  fireEvent.change(directionPicker(position), {
    target: { value: direction },
  });
};

const button = (label: string): HTMLButtonElement =>
  within(panel()).getByRole<HTMLButtonElement>('button', { name: label });

const problems = (): string[] =>
  Array.from(
    within(panel()).queryByRole('alert', { name: 'Problems' })?.children ?? [],
  ).map((problem) => problem.textContent ?? '');

const option = (position: number, column: string): HTMLOptionElement =>
  Array.from(columnPicker(position).options).find(
    ({ value }) => value === column,
  ) as HTMLOptionElement;

const stored = (editorState: CubeEditorState): readonly ColumnDirection[] =>
  (editorState.document.query.getNode('sort101') as Sort).sorts;

beforeEach(() => {
  localStorage.clear();
});

describe('Sort editor', () => {
  test('Sorts by a picked column and direction on Apply, as one undo step', async () => {
    const editorState = await render(ordersSorted([]));
    await openSort();
    expect(problems()).toEqual([MESSAGE_CANNOT_BE_EMPTY('Sorts')]);
    // the rows scroll on their own, so the editor fits wherever it is shown
    expect(
      within(panel()).getByRole('list', { name: 'Sort columns' }).className,
    ).toContain('overflow-auto');
    expect(columnPicker(1).value).toBe('');
    expect(
      Array.from(directionPicker(1).options).map(({ text }) => text),
    ).toEqual(['Ascending', 'Descending']);
    pick(1, 'ORDER_ID');
    direct(1, DESC);
    expect(problems()).toEqual([]);
    fireEvent.click(button('Apply'));
    expect(stored(editorState)).toEqual([
      { column: 'ORDER_ID', direction: DESC },
    ]);
    expect(editorState.history).toHaveLength(1);
    await waitFor(async () =>
      expect(
        TEST__getCanvasNodeTooltip(await TEST__findCanvasNode('sort101')),
      ).toContain('Sort by "ORDER_ID" Desc'),
    );
  });

  test('Reorders the rows, the first sorting first', async () => {
    const editorState = await render(
      ordersSorted([
        { column: 'ORDER_ID', direction: ASC },
        { column: 'SHIP_COUNTRY', direction: DESC },
      ]),
    );
    await openSort();
    expect(button('Move sort column 1 up').disabled).toBe(true);
    expect(button('Move sort column 2 down').disabled).toBe(true);
    fireEvent.click(button('Move sort column 2 up'));
    expect([columnPicker(1).value, directionPicker(1).value]).toEqual([
      'SHIP_COUNTRY',
      DESC,
    ]);
    fireEvent.click(button('Apply'));
    expect(stored(editorState)).toEqual([
      { column: 'SHIP_COUNTRY', direction: DESC },
      { column: 'ORDER_ID', direction: ASC },
    ]);
  });

  test("Doesn't offer a column another row has, or one that can't be sorted", async () => {
    await render(ordersSorted([{ column: 'ORDER_ID', direction: ASC }]));
    await openSort();
    fireEvent.click(button('Add sort column'));
    expect(option(2, 'ORDER_ID').disabled).toBe(true);
    expect(option(2, 'PAYLOAD').disabled).toBe(true);
    expect(option(2, 'SHIP_COUNTRY').disabled).toBe(false);
    // a row keeps its own column
    expect(option(1, 'ORDER_ID').disabled).toBe(false);
  });

  test('Marks each saved row with its first problem, as the node judges it', async () => {
    await render(
      ordersSorted([
        { column: 'PAYLOAD', direction: ASC },
        { column: 'SHIPPER', direction: ASC },
        { column: 'ORDER_ID', direction: ASC },
        { column: 'ORDER_ID', direction: DESC },
      ]),
    );
    await openSort();
    const notSortable = MESSAGE_SORT_COLUMN_NOT_SORTABLE('PAYLOAD', 'Variant');
    expect(problems()).toEqual([
      notSortable,
      MESSAGE_NOT_IN_INPUT_SCHEMA('Sort column', 'SHIPPER'),
    ]);
    expect(columnPicker(1).getAttribute('aria-invalid')).toBe('true');
    expect(columnPicker(2).getAttribute('aria-invalid')).toBe('true');
    expect(columnPicker(3).getAttribute('aria-invalid')).toBe('false');
    // the repeat is marked on its second row
    expect(columnPicker(4).getAttribute('aria-invalid')).toBe('true');
    expect(
      within(panel()).getAllByText(
        MESSAGE_CANNOT_HAVE_DUPLICATES('Sort columns'),
      ),
    ).toHaveLength(1);
  });

  test('Removes a row, and stops adding rows once every sortable column has one', async () => {
    const editorState = await render(
      ordersSorted([{ column: 'ORDER_ID', direction: ASC }]),
    );
    await openSort();
    fireEvent.click(button('Remove sort column 1'));
    expect(within(panel()).queryByLabelText('Sort column 1')).toBeNull();
    // every ORDERS column sorts; the Variant one doesn't
    for (let row = 1; row <= ORDERS_COLUMNS.length; row += 1) {
      expect(button('Add sort column').disabled).toBe(false);
      fireEvent.click(button('Add sort column'));
    }
    expect(button('Add sort column').disabled).toBe(true);
    fireEvent.click(button('Cancel'));
    expect(editorState.history).toHaveLength(0);
  });

  test('Shows a read-only cube without letting it change', async () => {
    const editorState = await render(new Query());
    await TEST__importDocument(
      editorState,
      new CubeDocument({
        context: CONTEXT,
        query: ordersSorted([
          { column: 'ORDER_ID', direction: ASC },
          { column: 'SHIP_COUNTRY', direction: DESC },
        ]),
      }),
      true,
    );
    await openSort();
    expect(columnPicker(1).disabled).toBe(true);
    expect(directionPicker(1).disabled).toBe(true);
    expect(button('Move sort column 2 up').disabled).toBe(true);
    expect(button('Remove sort column 1').disabled).toBe(true);
    expect(button('Add sort column').disabled).toBe(true);
    expect(button('Apply').disabled).toBe(true);
  });
});
