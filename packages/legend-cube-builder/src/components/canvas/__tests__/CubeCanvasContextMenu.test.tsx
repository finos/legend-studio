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
import { CubeDocument, type Join } from '@finos/legend-cube';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  NORTHWIND_RUNTIME,
  sliceQuery,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  TEST__importDocument,
  TEST__renderInCubeApplication,
} from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../CubeCanvas.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
/** The palette's transforms, in menu order */
const TRANSFORMS = [
  'Filter by Column',
  'Drop first <x> rows',
  'Take first <x> rows',
  'Take rows <x> to <y>',
  'Join Another Input',
];
const PALETTE = ['Relational Database Table', ...TRANSFORMS];
const ITEMS = [...PALETTE, 'Select', 'Remove', 'Swap Inputs'];

const render = async (document?: CubeDocument): Promise<CubeEditorState> => {
  const { host } = TEST__createCubeHost();
  const editorState = new CubeEditorState(host, document);
  await TEST__renderInCubeApplication(
    <div style={{ width: 800, height: 400 }}>
      <CubeCanvas editorState={editorState} />
    </div>,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.CANVAS,
  );
  return editorState;
};

const slice = (): CubeDocument =>
  new CubeDocument({ context: CONTEXT, query: sliceQuery() });

/** Right-clicks the element and returns the menu's items, by label */
const openMenu = async (
  target: Element,
): Promise<Map<string, HTMLButtonElement>> => {
  fireEvent.contextMenu(target);
  const menu = await screen.findByRole('menu');
  return new Map(
    within(menu)
      .getAllByRole<HTMLButtonElement>('button')
      .map((item) => [item.textContent ?? '', item]),
  );
};

/** Which items are enabled, in menu order */
const enabledItems = (items: Map<string, HTMLButtonElement>): string[] =>
  [...items].filter(([, item]) => !item.disabled).map(([label]) => label);

const closeMenu = async (): Promise<void> => {
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
};

/** Where the canvas takes a right-click around its nodes */
const canvasPane = (): Element =>
  document.querySelector('.react-flow__pane') ??
  screen.getByTestId(LEGEND_CUBE_TEST_ID.CANVAS);

beforeEach(() => {
  localStorage.clear();
});

describe('Canvas context menu', () => {
  test("Lists the palette, then the node's actions, each shown and disabled when it can't be done", async () => {
    await render(slice());
    let items = await openMenu(await TEST__findCanvasNode('join101'));
    expect([...items.keys()]).toEqual(ITEMS);
    // a table can't go after a node; a Join can be selected, removed and swapped
    expect(enabledItems(items)).toEqual([
      ...TRANSFORMS,
      'Select',
      'Remove',
      'Swap Inputs',
    ]);
    await closeMenu();

    // the node Execute runs, with one input
    items = await openMenu(await TEST__findCanvasNode('filter101'));
    expect(enabledItems(items)).toEqual([...TRANSFORMS, 'Remove']);
    await closeMenu();

    items = await openMenu(await TEST__findCanvasNode('relational101'));
    expect(enabledItems(items)).toEqual([...TRANSFORMS, 'Select', 'Remove']);
  });

  test('Offers only the palette around the nodes and on an empty canvas', async () => {
    const editorState = await render(slice());
    await TEST__findCanvasNode('join101');
    let items = await openMenu(canvasPane());
    expect([...items.keys()]).toEqual(ITEMS);
    expect(enabledItems(items)).toEqual(PALETTE);
    await closeMenu();

    act(() => editorState.importDocument(new CubeDocument(), false));
    items = await openMenu(screen.getByText(/No tables yet/u));
    expect(enabledItems(items)).toEqual(PALETTE);
  });

  test('Removes a node, as one undoable edit, without opening its editor', async () => {
    const editorState = await render(slice());
    const items = await openMenu(await TEST__findCanvasNode('join101'));
    fireEvent.click(items.get('Remove') as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    const { query } = editorState.document;
    expect(query.getNode('join101')).toBeUndefined();
    // its Left input now feeds what it fed
    expect(query.getInputIds('filter101')).toEqual(['relational101']);
    expect(editorState.history).toHaveLength(1);
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
  });

  test("Swaps a join's inputs, its key columns following them", async () => {
    const editorState = await render(slice());
    const join = editorState.document.query.getNode('join101') as Join;
    const items = await openMenu(await TEST__findCanvasNode('join101'));
    fireEvent.click(items.get('Swap Inputs') as HTMLButtonElement);
    const { query } = editorState.document;
    expect(query.getInputIds('join101')).toEqual([
      'relational102',
      'relational101',
    ]);
    const swapped = query.getNode('join101') as Join;
    expect(swapped.leftColumns).toEqual(join.rightColumns);
    expect(editorState.history).toHaveLength(1);
  });

  test('Selects a node, so Execute runs the query up to it', async () => {
    const editorState = await render(slice());
    const items = await openMenu(await TEST__findCanvasNode('join101'));
    fireEvent.click(items.get('Select') as HTMLButtonElement);
    expect(editorState.document.query.selected).toBe('join101');
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
  });

  test('Adds a palette item after the node the menu was opened on, or on its own around the nodes', async () => {
    const editorState = await render(slice());
    let items = await openMenu(await TEST__findCanvasNode('join101'));
    fireEvent.click(items.get('Filter by Column') as HTMLButtonElement);
    expect(editorState.document.query.getInputIds('filter102')).toEqual([
      'join101',
    ]);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    items = await openMenu(canvasPane());
    fireEvent.click(items.get('Join Another Input') as HTMLButtonElement);
    expect(editorState.document.query.getInputIds('join102')).toEqual([
      undefined,
      undefined,
    ]);
    expect(editorState.history).toHaveLength(2);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    items = await openMenu(canvasPane());
    fireEvent.click(
      items.get('Relational Database Table') as HTMLButtonElement,
    );
    expect(editorState.sourcePicker.isOpen).toBe(true);
  });

  test('Only selects in a read-only cube', async () => {
    const editorState = await render();
    await TEST__importDocument(editorState, slice(), true);
    const items = await openMenu(await TEST__findCanvasNode('join101'));
    expect(enabledItems(items)).toEqual(['Select']);
    fireEvent.click(items.get('Select') as HTMLButtonElement);
    expect(editorState.document.query.selected).toBe('join101');
  });
});
