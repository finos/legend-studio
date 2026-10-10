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
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
  Query,
  Restrict,
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

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

const ordersRestricted = (columns: string[]): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
      new Restrict('restrict101', columns),
    ],
    [new Connection('relational101', 'restrict101', 'tds')],
    'restrict101',
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

const openRestrict = async (): Promise<void> => {
  fireEvent.click(await TEST__findCanvasNode('restrict101'));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
};

const list = (): HTMLElement =>
  within(panel()).getByRole('list', { name: 'Columns to keep' });

const checkbox = (name: string): HTMLInputElement =>
  within(list()).getByRole<HTMLInputElement>('checkbox', {
    name: new RegExp(`^${name}\\b`, 'u'),
  });

const button = (name: string): HTMLButtonElement =>
  within(panel()).getByRole<HTMLButtonElement>('button', { name });

const problems = (): string[] =>
  Array.from(
    within(panel()).queryByRole('alert', { name: 'Problems' })?.children ?? [],
  ).map((problem) => problem.textContent ?? '');

const stored = (editorState: CubeEditorState): readonly string[] =>
  (editorState.document.query.getNode('restrict101') as Restrict).columns;

beforeEach(() => {
  localStorage.clear();
});

describe('Restrict editor', () => {
  test("Lists the input's columns in order, with their types, and stores the picks in that order on Apply", async () => {
    const editorState = await render(ordersRestricted([]));
    await openRestrict();
    expect(problems()).toEqual([MESSAGE_CANNOT_BE_EMPTY('Columns')]);
    const items = within(list()).getAllByRole('listitem');
    expect(items).toHaveLength(ORDERS_COLUMNS.length);
    expect(items[0]?.textContent).toContain('ORDER_ID');
    expect(items[0]?.textContent).toContain('SmallInt');
    // the editor's body is its one scroller (PLAN §11.8)
    expect(list().className).not.toMatch(
      /\b(?:max-h-|overflow-(?:[xy]-)?(?:auto|scroll))/u,
    );
    fireEvent.click(checkbox('SHIP_COUNTRY'));
    fireEvent.click(checkbox('ORDER_ID'));
    expect(problems()).toEqual([]);
    fireEvent.click(button('Apply'));
    expect(stored(editorState)).toEqual(['ORDER_ID', 'SHIP_COUNTRY']);
    expect(editorState.history).toHaveLength(1);
    expect(editorState.analysis.schemas.get('restrict101')?.names()).toEqual([
      'ORDER_ID',
      'SHIP_COUNTRY',
    ]);
    await waitFor(async () =>
      expect(
        TEST__getCanvasNodeTooltip(await TEST__findCanvasNode('restrict101')),
      ).toContain('Restrict Columns to: "ORDER_ID", "SHIP_COUNTRY"'),
    );
  });

  test('Picks every column with All, and none with None', async () => {
    await render(ordersRestricted(['ORDER_ID']));
    await openRestrict();
    fireEvent.click(button('All'));
    expect(
      within(list())
        .getAllByRole<HTMLInputElement>('checkbox')
        .every((box) => box.checked),
    ).toBe(true);
    fireEvent.click(button('None'));
    expect(
      within(list())
        .getAllByRole<HTMLInputElement>('checkbox')
        .some((box) => box.checked),
    ).toBe(false);
    expect(problems()).toEqual([MESSAGE_CANNOT_BE_EMPTY('Columns')]);
  });

  test('Adds nothing to undo for Cancel, or for the same columns ticked again', async () => {
    const editorState = await render(ordersRestricted(['ORDER_ID']));
    await openRestrict();
    fireEvent.click(checkbox('ORDER_ID'));
    fireEvent.click(checkbox('ORDER_ID'));
    expect(button('Apply').disabled).toBe(true);
    fireEvent.click(checkbox('SHIP_COUNTRY'));
    fireEvent.click(button('Cancel'));
    expect(editorState.history).toHaveLength(0);
    expect(stored(editorState)).toEqual(['ORDER_ID']);
  });

  test('Lists a saved column the input lost, last and ticked, until it is unticked', async () => {
    const editorState = await render(ordersRestricted(['ORDER_ID', 'SHIPPER']));
    await openRestrict();
    expect(problems()).toEqual([
      MESSAGE_NOT_IN_INPUT_SCHEMA('Column', 'SHIPPER'),
    ]);
    const items = within(list()).getAllByRole('listitem');
    expect(items.at(-1)?.textContent).toContain('SHIPPER');
    expect(items.at(-1)?.textContent).toContain('(not in the input)');
    fireEvent.click(checkbox('SHIPPER'));
    expect(problems()).toEqual([]);
    fireEvent.click(button('Apply'));
    expect(stored(editorState)).toEqual(['ORDER_ID']);
  });

  test('Shows a read-only cube without letting it change', async () => {
    const editorState = await render(new Query());
    await TEST__importDocument(
      editorState,
      new CubeDocument({
        context: CONTEXT,
        query: ordersRestricted(['ORDER_ID']),
      }),
      true,
    );
    await openRestrict();
    expect(checkbox('ORDER_ID').disabled).toBe(true);
    expect(button('All').disabled).toBe(true);
    expect(button('None').disabled).toBe(true);
    expect(button('Apply').disabled).toBe(true);
  });
});
