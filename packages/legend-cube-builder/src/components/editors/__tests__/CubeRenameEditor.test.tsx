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
  MESSAGE_ALREADY_IN_INPUT_SCHEMA,
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_NEW_COLUMN_NAME_INVALID,
  MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER,
  Query,
  Rename,
  type RenameMapping,
} from '@finos/legend-cube';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  COLUMN_NAME_RULES_HINT,
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

const ordersRenamed = (mappings: RenameMapping[]): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
      new Rename('rename101', mappings),
    ],
    [new Connection('relational101', 'rename101', 'tds')],
    'rename101',
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

const openRename = async (): Promise<void> => {
  fireEvent.click(await TEST__findCanvasNode('rename101'));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
};

const pick = (position: number, column: string): void => {
  fireEvent.change(within(panel()).getByLabelText(`Old column ${position}`), {
    target: { value: column },
  });
};

const name = (position: number): HTMLInputElement =>
  within(panel()).getByLabelText<HTMLInputElement>(
    `New column name ${position}`,
  );

const type = (position: number, text: string): void => {
  fireEvent.change(name(position), { target: { value: text } });
};

const button = (label: string): HTMLButtonElement =>
  within(panel()).getByRole<HTMLButtonElement>('button', { name: label });

const problems = (): string[] =>
  Array.from(
    within(panel()).queryByRole('alert', { name: 'Problems' })?.children ?? [],
  ).map((problem) => problem.textContent ?? '');

const stored = (editorState: CubeEditorState): readonly RenameMapping[] =>
  (editorState.document.query.getNode('rename101') as Rename).mappings;

beforeEach(() => {
  localStorage.clear();
});

describe('Rename editor', () => {
  test('Renames a picked column on Apply, as one undo step, the rule for names shown', async () => {
    const editorState = await render(ordersRenamed([]));
    await openRename();
    expect(problems()).toEqual([MESSAGE_CANNOT_BE_EMPTY('Column renames')]);
    expect(within(panel()).getByText(COLUMN_NAME_RULES_HINT)).toBeDefined();
    // the editor's body is its one scroller (PLAN §11.8)
    expect(
      within(panel()).getByRole('list', { name: 'Column renames' }).className,
    ).not.toMatch(/\b(?:max-h-|overflow-(?:[xy]-)?(?:auto|scroll))/u);
    pick(1, 'SHIP_COUNTRY');
    type(1, 'Ship Country');
    expect(problems()).toEqual([]);
    fireEvent.click(button('Apply'));
    expect(stored(editorState)).toEqual([
      { from: 'SHIP_COUNTRY', to: 'Ship Country' },
    ]);
    expect(editorState.history).toHaveLength(1);
    expect(editorState.analysis.schemas.get('rename101')?.names().at(-1)).toBe(
      'Ship Country',
    );
    await waitFor(async () =>
      expect(
        TEST__getCanvasNodeTooltip(await TEST__findCanvasNode('rename101')),
      ).toContain('Rename 1 Column'),
    );
  });

  test('Marks each row with its first problem, as the node judges it', async () => {
    await render(ordersRenamed([]));
    await openRename();
    pick(1, 'ORDER_ID');
    type(1, 'CUSTOMER_ID');
    expect(name(1).getAttribute('aria-invalid')).toBe('true');
    expect(
      within(panel()).getAllByText(
        MESSAGE_ALREADY_IN_INPUT_SCHEMA('New column name', 'CUSTOMER_ID'),
      ).length,
    ).toBeGreaterThan(0);
    type(1, 'say "hi"');
    expect(name(1).title).toBe(MESSAGE_NEW_COLUMN_NAME_INVALID);
    // two rows onto the same new name: both marked
    type(1, 'X');
    fireEvent.click(button('Add column to rename'));
    pick(2, 'SHIP_COUNTRY');
    type(2, 'X');
    expect(name(1).title).toBe(MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER('X'));
    expect(name(2).title).toBe(MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER('X'));
    // an untouched blank row is no problem
    fireEvent.click(button('Add column to rename'));
    expect(name(3).getAttribute('aria-invalid')).toBe('false');
  });

  test('Keeps a new name exactly as typed, spaces included', async () => {
    const editorState = await render(ordersRenamed([]));
    await openRename();
    pick(1, 'SHIP_COUNTRY');
    type(1, ' Ship');
    expect(name(1).value).toBe(' Ship');
    expect(name(1).title).toBe(MESSAGE_NEW_COLUMN_NAME_INVALID);
    fireEvent.click(button('Apply'));
    expect(stored(editorState)).toEqual([
      { from: 'SHIP_COUNTRY', to: ' Ship' },
    ]);
  });

  test('Removes a rename, and stops adding rows once every column has one', async () => {
    const editorState = await render(
      ordersRenamed([{ from: 'ORDER_ID', to: 'ID' }]),
    );
    await openRename();
    fireEvent.click(button('Remove rename 1'));
    expect(within(panel()).queryByLabelText('Old column 1')).toBeNull();
    for (let row = 1; row <= ORDERS_COLUMNS.length; row += 1) {
      fireEvent.click(button('Add column to rename'));
    }
    expect(button('Add column to rename').disabled).toBe(true);
    fireEvent.click(button('Cancel'));
    expect(editorState.history).toHaveLength(0);
  });

  test('Shows a read-only cube without letting it change', async () => {
    const editorState = await render(new Query());
    await TEST__importDocument(
      editorState,
      new CubeDocument({
        context: CONTEXT,
        query: ordersRenamed([{ from: 'ORDER_ID', to: 'ID' }]),
      }),
      true,
    );
    await openRename();
    expect(
      within(panel()).getByLabelText<HTMLSelectElement>('Old column 1')
        .disabled,
    ).toBe(true);
    expect(name(1).disabled).toBe(true);
    expect(button('Remove rename 1').disabled).toBe(true);
    expect(button('Add column to rename').disabled).toBe(true);
    expect(button('Add column to rename').title).toBe(READ_ONLY_CUBE_TITLE);
    expect(button('Apply').disabled).toBe(true);
  });

  test('Judges a filled row after a blank one by its own mapping', async () => {
    const editorState = await render(ordersRenamed([]));
    await openRename();
    fireEvent.click(button('Add column to rename'));
    pick(2, 'ORDER_ID');
    type(2, 'SHIP_COUNTRY');
    expect(name(1).getAttribute('aria-invalid')).toBe('false');
    expect(name(2).getAttribute('aria-invalid')).toBe('true');
    expect(name(2).title).toBe(
      MESSAGE_ALREADY_IN_INPUT_SCHEMA('New column name', 'SHIP_COUNTRY'),
    );
    type(2, 'Order Id');
    expect(name(2).getAttribute('aria-invalid')).toBe('false');
    fireEvent.click(button('Apply'));
    expect(stored(editorState)).toEqual([{ from: 'ORDER_ID', to: 'Order Id' }]);
  });
});
