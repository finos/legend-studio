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
  Connection,
  CubeDocument,
  Difference,
  type DifferenceSettings,
  PrimitiveType,
  Query,
  SchemaColumn,
} from '@finos/legend-cube';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { DIFFERENCE_EDITOR_NOTES } from '../../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';
import { CubeNodeEditorPanel } from '../CubeNodeEditorPanel.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const P = 'meta::pure::precisePrimitives::';

const column = (
  name: string,
  path: string,
  nullable = true,
  params: number[] = [],
): SchemaColumn =>
  new SchemaColumn(name, PrimitiveType.get(path, params), nullable);

/** Last month's orders */
const LAST = [
  column('ORDER_ID', `${P}SmallInt`, false),
  column('SHIP_VIA', `${P}SmallInt`),
  column('SHIP_CITY', `${P}Varchar`, true, [15]),
  column('FREIGHT', `${P}Double`),
  column('DISCOUNT', `${P}Double`),
];
/** This month's orders: no discount */
const NOW = [
  column('ORDER_ID', `${P}SmallInt`, false),
  column('SHIP_VIA', `${P}SmallInt`),
  column('FREIGHT', `${P}Double`),
];

/** Last month's orders on the Left, this month's on the Right, compared on these settings */
const compared = (
  settings: Partial<DifferenceSettings> = {},
  right: SchemaColumn[] = NOW,
): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', LAST),
      northwindTable('relational102', 'ORDERS_ARCHIVE', right),
      new Difference('difference101', settings),
    ],
    [
      new Connection('relational101', 'difference101', 'tds1'),
      new Connection('relational102', 'difference101', 'tds2'),
    ],
    'difference101',
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

const openDifference = async (): Promise<void> => {
  fireEvent.click(await TEST__findCanvasNode('difference101'));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
};

const button = (name: string): HTMLButtonElement =>
  within(panel()).getByRole<HTMLButtonElement>('button', { name });

const problems = (): string[] =>
  Array.from(
    within(panel()).queryByRole('alert', { name: 'Problems' })?.children ?? [],
  ).map((problem) => problem.textContent ?? '');

const pick = (label: string, value: string): void => {
  fireEvent.change(within(panel()).getByLabelText(label), {
    target: { value },
  });
};

/** Adds a pair of join columns and picks them */
const addKeys = (left: string, right: string): void => {
  fireEvent.click(button('Add join columns'));
  const rows = within(
    within(panel()).getByRole('list', { name: 'Join columns' }),
  ).getAllByRole('listitem');
  pick(`Left join column ${rows.length}`, left);
  pick(`Right join column ${rows.length}`, right);
};

const differenceList = (): HTMLElement =>
  within(panel()).getByRole('list', { name: 'Difference columns' });

const checkbox = (name: string): HTMLInputElement =>
  within(differenceList()).getByRole<HTMLInputElement>('checkbox', {
    name: new RegExp(`^${name}\\b`, 'u'),
  });

/** Each column of the list with what it says after its name */
const listed = (): string[] =>
  within(differenceList())
    .getAllByRole('listitem')
    .map((item) => item.textContent ?? '');

beforeEach(() => {
  localStorage.clear();
});

describe('Difference editor', () => {
  test('Asks for join columns, then difference columns, then turns valid on Apply, as one undo step', async () => {
    const editorState = await render(compared());
    await openDifference();
    expect(problems()).toEqual(['Left join columns cannot be empty.']);
    expect(button('Apply').disabled).toBe(true);
    addKeys('ORDER_ID', 'ORDER_ID');
    expect(problems()).toEqual(['Difference columns cannot be empty.']);
    // ticked out of order, kept in the Left input's order
    fireEvent.click(checkbox('FREIGHT'));
    fireEvent.click(checkbox('SHIP_VIA'));
    expect(problems()).toEqual([]);
    fireEvent.click(button('Apply'));
    const stored = editorState.document.query.getNode(
      'difference101',
    ) as Difference;
    expect(stored.leftColumns).toEqual(['ORDER_ID']);
    expect(stored.rightColumns).toEqual(['ORDER_ID']);
    expect(stored.differenceColumns).toEqual(['SHIP_VIA', 'FREIGHT']);
    expect(editorState.history).toHaveLength(1);
    expect(editorState.analysis.schemas.get('difference101')?.names()).toEqual([
      'ORDER_ID',
      'SHIP_CITY',
      'DISCOUNT',
      'SHIP_VIA_1',
      'FREIGHT_1',
      'SHIP_VIA_2',
      'FREIGHT_2',
      'SHIP_VIA_valueDifference',
      'FREIGHT_valueDifference',
    ]);
    expect(editorState.nodeEditor.draft?.original).toBe(stored);
    expect(button('Apply').disabled).toBe(true);
    await waitFor(async () =>
      expect(
        (await TEST__findCanvasNode('difference101')).classList.contains(
          'legend-cube__node--invalid',
        ),
      ).toBe(false),
    );
  });

  test("Lists the Left input's columns, saying why one can't be a difference column", async () => {
    await render(
      compared({ leftColumns: ['ORDER_ID'], rightColumns: ['ORDER_ID'] }, [
        ...NOW,
        column('DISCOUNT', `${P}Float4`),
      ]),
    );
    await openDifference();
    expect(listed()).toEqual([
      'ORDER_IDSmallInt (a join column)',
      'SHIP_VIASmallInt?',
      'SHIP_CITYVarchar(15)? (not a number)',
      'FREIGHTDouble?',
      'DISCOUNTDouble? (Float4 in the Right input)',
    ]);
    expect(checkbox('ORDER_ID').disabled).toBe(true);
    expect(checkbox('SHIP_VIA').disabled).toBe(false);
    expect(checkbox('SHIP_CITY').disabled).toBe(true);
    expect(checkbox('DISCOUNT').disabled).toBe(true);
    // a Left column the Right input lacks
    fireEvent.click(button('Remove join columns 1'));
    addKeys('SHIP_VIA', 'SHIP_VIA');
    expect(checkbox('ORDER_ID').disabled).toBe(false);
    expect(checkbox('SHIP_VIA').disabled).toBe(true);
  });

  test('Says when a Left column is not in the Right input', async () => {
    await render(
      compared({ leftColumns: ['ORDER_ID'], rightColumns: ['ORDER_ID'] }),
    );
    await openDifference();
    expect(listed()).toContain('DISCOUNTDouble? (not in the Right input)');
  });

  test('Keeps a saved difference column the Left input lacks listed until it is unticked', async () => {
    await render(
      compared({
        leftColumns: ['ORDER_ID'],
        rightColumns: ['ORDER_ID'],
        differenceColumns: ['SHIP_VIA', 'QTY'],
      }),
    );
    await openDifference();
    expect(listed()).toContain('QTY(not in the input)');
    expect(problems()).toEqual([
      'Left difference column "QTY" is not present in the input schema.',
      'Right difference column "QTY" is not present in the input schema.',
    ]);
    fireEvent.click(checkbox('QTY'));
    expect(listed()).not.toContain('QTY(not in the input)');
  });

  test('Swaps the inputs, the join columns following them and the difference columns kept, in one undo step', async () => {
    const editorState = await render(
      compared({
        leftColumns: ['ORDER_ID'],
        rightColumns: ['ORDER_ID'],
        differenceColumns: ['SHIP_VIA'],
      }),
    );
    await openDifference();
    fireEvent.click(button('Swap Inputs'));
    const { query } = editorState.document;
    expect(query.getInputIds('difference101')).toEqual([
      'relational102',
      'relational101',
    ]);
    const swapped = query.getNode('difference101') as Difference;
    expect(swapped.differenceColumns).toEqual(['SHIP_VIA']);
    expect(editorState.history).toHaveLength(1);
  });

  test('Says what its output holds', async () => {
    await render(compared());
    await openDifference();
    DIFFERENCE_EDITOR_NOTES.forEach((note) =>
      expect(within(panel()).getByText(note)).toBeTruthy(),
    );
  });
});
