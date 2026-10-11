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
  type ColumnComparisonFilter,
  type CompositeFilter,
  Connection,
  CubeDocument,
  type Filter,
  Limit,
  Query,
} from '@finos/legend-cube';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';
import { isCubeNodeEditorDismissedBy } from '../useCubeNodeEditorDismiss.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const OUTSIDE = 'Outside the canvas';

describe('What a press outside the floating node editor closes it on', () => {
  let root: HTMLElement;

  const byId = (id: string): HTMLElement =>
    root.querySelector<HTMLElement>(`#${id}`) as HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
    // an editor, the canvas's parts and MUI's layers, and a plain button
    root.innerHTML = `
      <div id="editor"><input id="in-editor" /></div>
      <div class="react-flow__pane" id="pane">
        <div class="react-flow__node"><span id="on-node"></span></div>
      </div>
      <div class="react-flow__controls"><button id="on-controls"></button></div>
      <div class="react-flow__minimap"><svg><rect id="on-minimap"></rect></svg></div>
      <div class="MuiModal-root"><div><button id="in-modal"></button></div></div>
      <div class="MuiPopover-root"><ul><li id="in-popover"></li></ul></div>
      <div class="MuiPopper-root"><div id="in-popper"></div></div>
      <div class="reflex-splitter"><span id="on-splitter"></span></div>
      <div><button id="elsewhere"></button></div>
    `;
  });

  afterEach(() => {
    root.remove();
  });

  test('Not on a press inside the editor', () => {
    const editor = byId('editor');
    expect(isCubeNodeEditorDismissedBy(editor, editor)).toBe(false);
    expect(isCubeNodeEditorDismissedBy(byId('in-editor'), editor)).toBe(false);
  });

  test("Not on a node, the canvas's background, its controls or its minimap", () => {
    const editor = byId('editor');
    ['on-node', 'pane', 'on-controls', 'on-minimap'].forEach((id) =>
      expect(isCubeNodeEditorDismissedBy(byId(id), editor)).toBe(false),
    );
  });

  test('Not on the splitter between the graph and the results, which it follows', () => {
    expect(
      isCubeNodeEditorDismissedBy(byId('on-splitter'), byId('editor')),
    ).toBe(false);
  });

  test("Not in MUI's layers, where a dialog, menu or dropdown opened from the editor lives", () => {
    const editor = byId('editor');
    ['in-modal', 'in-popover', 'in-popper'].forEach((id) =>
      expect(isCubeNodeEditorDismissedBy(byId(id), editor)).toBe(false),
    );
  });

  test('On a press anywhere else', () => {
    const editor = byId('editor');
    expect(isCubeNodeEditorDismissedBy(byId('elsewhere'), editor)).toBe(true);
    expect(isCubeNodeEditorDismissedBy(document.body, editor)).toBe(true);
    // with no editor drawn, anywhere else still is
    expect(isCubeNodeEditorDismissedBy(byId('elsewhere'), null)).toBe(true);
  });

  test('Not on a target that is no element', () => {
    const editor = byId('editor');
    expect(isCubeNodeEditorDismissedBy(null, editor)).toBe(false);
    expect(isCubeNodeEditorDismissedBy(document, editor)).toBe(false);
    expect(isCubeNodeEditorDismissedBy(window, editor)).toBe(false);
  });
});

/** ORDERS → limit101, holding size 10 */
const ordersLimited = (): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
      new Limit('limit101', 10),
    ],
    [new Connection('relational101', 'limit101', 'tds')],
    'limit101',
  );

const render = async (query: Query): Promise<CubeEditorState> => {
  const { host } = TEST__createCubeHost();
  const editorState = new CubeEditorState(
    host,
    new CubeDocument({ context: CONTEXT, query }),
  );
  await TEST__renderInCubeApplication(
    <div style={{ display: 'flex' }}>
      <button>{OUTSIDE}</button>
      <div style={{ width: 800, height: 400 }}>
        <CubeCanvas editorState={editorState} />
      </div>
    </div>,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.CANVAS,
  );
  return editorState;
};

const editor = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);

const openEditor = async (nodeId: string): Promise<HTMLElement> => {
  fireEvent.click(await TEST__findCanvasNode(nodeId));
  const opened = await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
  // let the popper settle its position
  await act(async () => {
    await Promise.resolve();
  });
  return opened;
};

/** Opens the Limit's editor and types a new size, not yet stored */
const editLimit = async (): Promise<void> => {
  await openEditor('limit101');
  fireEvent.change(within(editor()).getByLabelText('Rows to keep'), {
    target: { value: '5' },
  });
};

const storedSize = (editorState: CubeEditorState): number | undefined =>
  (editorState.document.query.getNode('limit101') as Limit).size;

/**
 * A press of a mouse button going down on the target; jsdom has no
 * PointerEvent, so it is a MouseEvent of that type, carrying the button
 */
const press = (target: Element, button = 0): void => {
  act(() => {
    target.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        button,
      }),
    );
  });
};

const pressEscape = (target: Element | Document = document): void => {
  fireEvent.keyDown(target, { key: 'Escape' });
};

const outside = (): HTMLElement =>
  screen.getByRole('button', { name: OUTSIDE });

const pane = (): HTMLElement =>
  document.querySelector<HTMLElement>('.react-flow__pane') as HTMLElement;

/** Open on the Limit with its edit still in the draft */
const expectStillEditing = (editorState: CubeEditorState): void => {
  expect(editorState.nodeEditor.nodeId).toBe('limit101');
  expect(editorState.nodeEditor.hasChanges).toBe(true);
  expect(storedSize(editorState)).toBe(10);
  expect(editorState.history).toHaveLength(0);
  expect(editor()).toBeDefined();
};

/** Closed, its edit stored as one undo step */
const expectClosedApplied = (editorState: CubeEditorState): void => {
  expect(editorState.nodeEditor.nodeId).toBeUndefined();
  expect(storedSize(editorState)).toBe(5);
  expect(editorState.history).toHaveLength(1);
  expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Closing the floating node editor', () => {
  test('Applies its edits as one undo step and closes on a press of the main button outside it, as the button goes down', async () => {
    const editorState = await render(ordersLimited());
    await editLimit();
    press(outside());
    expectClosedApplied(editorState);
  });

  test('Stays open on a press of another button outside it', async () => {
    const editorState = await render(ordersLimited());
    await editLimit();
    press(outside(), 2);
    press(outside(), 1);
    expectStillEditing(editorState);
    press(outside());
    expectClosedApplied(editorState);
  });

  test('Stays open on a press inside it', async () => {
    const editorState = await render(ordersLimited());
    await editLimit();
    press(within(editor()).getByLabelText('Rows to keep'));
    press(editor());
    expectStillEditing(editorState);
  });

  test("Stays open on a press on the canvas's controls", async () => {
    const editorState = await render(ordersLimited());
    await editLimit();
    press(screen.getByRole('button', { name: /zoom in/iu }));
    expectStillEditing(editorState);
  });

  test('Leaves a press on another node to its click, which applies the edits and opens that node', async () => {
    const editorState = await render(ordersLimited());
    await editLimit();
    const orders = await TEST__findCanvasNode('relational101');
    press(orders);
    expectStillEditing(editorState);
    fireEvent.click(orders);
    expect(storedSize(editorState)).toBe(5);
    expect(editorState.history).toHaveLength(1);
    expect(editorState.nodeEditor.nodeId).toBe('relational101');
  });

  test("Stays open on a press on the canvas's background, which may pan it, and closes, applying, on a click there", async () => {
    const editorState = await render(ordersLimited());
    await editLimit();
    press(pane());
    expectStillEditing(editorState);
    fireEvent.click(pane());
    expectClosedApplied(editorState);
  });

  test('Stays open on any key but Escape, and on Ctrl with the main button, a right-click on macOS', async () => {
    const editorState = await render(ordersLimited());
    await editLimit();
    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(outside(), { key: 'a' });
    act(() => {
      outside().dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          ctrlKey: true,
        }),
      );
    });
    expectStillEditing(editorState);
    pressEscape();
    expectClosedApplied(editorState);
  });

  test("Leaves an Escape in the results grid's menu to the menu", async () => {
    const editorState = await render(ordersLimited());
    await editLimit();
    const menu = document.createElement('div');
    menu.className = 'ag-menu';
    const item = document.createElement('span');
    menu.appendChild(item);
    document.body.appendChild(menu);
    try {
      pressEscape(item);
      expectStillEditing(editorState);
    } finally {
      menu.remove();
    }
  });

  test('Applies its edits as one undo step and closes on Escape', async () => {
    const editorState = await render(ordersLimited());
    await editLimit();
    pressEscape();
    expectClosedApplied(editorState);
  });

  test('Leaves an Escape that something else already used to it', async () => {
    const editorState = await render(ordersLimited());
    await editLimit();
    const used = (event: KeyboardEvent): void => event.preventDefault();
    outside().addEventListener('keydown', used);
    pressEscape(outside());
    expectStillEditing(editorState);
    outside().removeEventListener('keydown', used);
    pressEscape(outside());
    expectClosedApplied(editorState);
  });

  test('Leaves the first Escape in a filter value being typed to the value, closing and applying on the next', async () => {
    const editorState = await render(sliceQuery());
    await openEditor('filter101');
    const condition = within(editor()).getAllByTestId(
      LEGEND_CUBE_TEST_ID.FILTER_CONDITION,
    )[0] as HTMLElement;
    const value = (): HTMLElement =>
      within(condition).getByRole('button', { name: 'Filter value' });
    const typed = (): HTMLElement =>
      within(condition).getByRole('textbox', { name: 'Filter value' });
    // an edit in the draft: Lyon in place of France
    fireEvent.click(value());
    fireEvent.change(typed(), { target: { value: 'Lyon' } });
    fireEvent.blur(typed());
    fireEvent.click(value());
    fireEvent.change(typed(), { target: { value: 'Paris' } });
    pressEscape(typed());
    expect(editorState.nodeEditor.nodeId).toBe('filter101');
    expect(value().textContent).toBe('Lyon');
    expect(editorState.history).toHaveLength(0);
    pressEscape();
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
    expect(editorState.history).toHaveLength(1);
    const stored = (editorState.document.query.getNode('filter101') as Filter)
      .filter as CompositeFilter;
    expect((stored.rules[0] as ColumnComparisonFilter).value).toEqual({
      kind: 'string',
      value: 'Lyon',
    });
  });

  test('Stays open on a press outside or Escape while something opened from it holds it open', async () => {
    const editorState = await render(ordersLimited());
    await editLimit();
    let release: () => void = () => undefined;
    act(() => {
      release = editorState.nodeEditor.holdOpen();
    });
    press(outside());
    pressEscape();
    expectStillEditing(editorState);
    act(() => release());
    press(outside());
    expectClosedApplied(editorState);
  });

  test('Stays open on a press outside or Escape while a Cube dialog is open', async () => {
    const editorState = await render(ordersLimited());
    await editLimit();
    act(() => editorState.sourcePicker.open());
    expect(editorState.isDialogOpen).toBe(true);
    press(outside());
    pressEscape();
    expectStillEditing(editorState);
    act(() => editorState.sourcePicker.close());
    press(outside());
    expectClosedApplied(editorState);
  });

  test('Stops listening for presses and Escape once it closes', async () => {
    const editorState = await render(ordersLimited());
    await editLimit();
    pressEscape();
    expectClosedApplied(editorState);
    const finish = jest.spyOn(editorState.nodeEditor, 'finish');
    press(outside());
    pressEscape();
    expect(finish).not.toHaveBeenCalled();
    // and listens again once another editor opens
    await openEditor('limit101');
    finish.mockClear();
    press(outside());
    expect(finish).toHaveBeenCalledTimes(1);
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
  });
});

/** The canvas's own wrapper of a node, which takes the keyboard focus */
const nodeWrapper = (nodeId: string): HTMLElement =>
  document.querySelector<HTMLElement>(
    `.react-flow__node[data-id="${nodeId}"]`,
  ) as HTMLElement;

describe('The keyboard focus when the floating node editor closes', () => {
  test('Goes back to the node the editor was open on, on the Escape that closes it', async () => {
    const editorState = await render(ordersLimited());
    await editLimit();
    editor().focus();
    expect(document.activeElement).toBe(editor());
    pressEscape(editor());
    expectClosedApplied(editorState);
    expect(document.activeElement).toBe(nodeWrapper('limit101'));
  });

  test.each([['Cancel'], ['Close the editor']])(
    'Goes back to the node when %s is pressed from the keyboard',
    async (name) => {
      const editorState = await render(ordersLimited());
      await editLimit();
      const button = within(editor()).getByRole('button', { name });
      button.focus();
      fireEvent.click(button);
      expect(editorState.nodeEditor.nodeId).toBeUndefined();
      expect(document.activeElement).toBe(nodeWrapper('limit101'));
    },
  );

  test('Stays where the user put it, outside the editor, on a press or an Escape there', async () => {
    const editorState = await render(ordersLimited());
    await editLimit();
    outside().focus();
    pressEscape(outside());
    expectClosedApplied(editorState);
    expect(document.activeElement).toBe(outside());
    await openEditor('limit101');
    outside().focus();
    press(outside());
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
    expect(document.activeElement).toBe(outside());
  });

  test('Stays in the editor on an Escape that leaves it open', async () => {
    const editorState = await render(ordersLimited());
    await editLimit();
    editor().focus();
    act(() => {
      editorState.nodeEditor.holdOpen();
    });
    pressEscape(editor());
    expectStillEditing(editorState);
    expect(document.activeElement).toBe(editor());
  });
});
