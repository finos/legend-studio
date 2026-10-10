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
import { Connection, CubeDocument, Join, Query } from '@finos/legend-cube';
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
  CUSTOMERS_COLUMNS,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';
import {
  CUBE_NODE_EDITOR_WIDTH,
  CUBE_NODE_EDITOR_Z_INDEX,
} from '../CubeNodeEditorPopper.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

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

/** The layer the editor floats in: the nearest ancestor raised above the canvas */
const popperRoot = (element: HTMLElement): HTMLElement | undefined => {
  let current = element.parentElement;
  while (current && current !== document.body) {
    if (current.style.zIndex === String(CUBE_NODE_EDITOR_Z_INDEX)) {
      return current;
    }
    current = current.parentElement;
  }
  return undefined;
};

/** ORDERS and CUSTOMERS feeding a Join with no key yet */
const keylessJoin = (): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
        new Join('join101'),
      ],
      [
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('relational102', 'join101', 'rightTds'),
      ],
      'join101',
    ),
  });

/** Picks a pair of join keys in the open Join editor, the edit Apply would store */
const editJoinKeys = (): void => {
  fireEvent.click(within(editor()).getByText('Add join columns'));
  fireEvent.change(within(editor()).getByLabelText('Left join column 1'), {
    target: { value: 'CUSTOMER_ID' },
  });
  fireEvent.change(within(editor()).getByLabelText('Right join column 1'), {
    target: { value: 'CUSTOMER_ID' },
  });
};

const storedJoin = (editorState: CubeEditorState): Join =>
  editorState.document.query.getNode('join101') as Join;

const render = async (floatingEditor?: boolean): Promise<CubeEditorState> => {
  const { host } = TEST__createCubeHost();
  const editorState = new CubeEditorState(host, keylessJoin());
  await TEST__renderInCubeApplication(
    <div style={{ width: 800, height: 400 }}>
      {floatingEditor === undefined ? (
        <CubeCanvas editorState={editorState} />
      ) : (
        <CubeCanvas editorState={editorState} floatingEditor={floatingEditor} />
      )}
    </div>,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.CANVAS,
  );
  return editorState;
};

beforeEach(() => {
  localStorage.clear();
});

describe('Floating node editor', () => {
  test('Opens on a click in a layer of its own, outside the canvas, one width for every node and above the canvas', async () => {
    await render(true);
    const opened = await openEditor('join101');
    expect(
      screen.getByTestId(LEGEND_CUBE_TEST_ID.CANVAS).contains(opened),
    ).toBe(false);
    expect(document.body.contains(opened)).toBe(true);
    const root = popperRoot(opened);
    expect(root).toBeDefined();
    expect(root?.style.width).toBe(`${CUBE_NODE_EDITOR_WIDTH}px`);
    expect(CUBE_NODE_EDITOR_WIDTH).toBe(432);
    expect(CUBE_NODE_EDITOR_Z_INDEX).toBe(1250);
    // a canvas jsdom can't measure hides nothing
    expect(root?.style.visibility).not.toBe('hidden');
  });

  test('Lays the editor out to float: its own size, its body scrolling between 80px and a third of the window', async () => {
    await render(true);
    const opened = await openEditor('join101');
    expect(opened.classList.contains('h-full')).toBe(false);
    expect(opened.classList.contains('border-l')).toBe(false);
    // header, body, then Apply and Cancel
    const body = opened.children[1] as HTMLElement;
    expect(body.classList.contains('max-h-[33vh]')).toBe(true);
    expect(body.classList.contains('min-h-[80px]')).toBe(true);
    expect(body.classList.contains('overflow-y-auto')).toBe(true);
    expect(body.classList.contains('flex-1')).toBe(false);
  });

  test('Applies its edits as one undo step, staying open', async () => {
    const editorState = await render(true);
    await openEditor('join101');
    editJoinKeys();
    fireEvent.click(within(editor()).getByRole('button', { name: 'Apply' }));
    expect(storedJoin(editorState).leftColumns).toEqual(['CUSTOMER_ID']);
    expect(storedJoin(editorState).rightColumns).toEqual(['CUSTOMER_ID']);
    expect(editorState.history).toHaveLength(1);
    expect(editorState.nodeEditor.nodeId).toBe('join101');
    expect(screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeDefined();
  });

  test('Drops its edits and closes on Cancel', async () => {
    const editorState = await render(true);
    await openEditor('join101');
    editJoinKeys();
    fireEvent.click(within(editor()).getByRole('button', { name: 'Cancel' }));
    expect(storedJoin(editorState).leftColumns).toEqual([]);
    expect(editorState.history).toHaveLength(0);
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
  });

  test('Shows the node clicked next, in the one floating editor', async () => {
    const editorState = await render(true);
    await openEditor('join101');
    fireEvent.click(await TEST__findCanvasNode('relational101'));
    expect(editorState.nodeEditor.nodeId).toBe('relational101');
    await waitFor(() =>
      expect(
        within(editor()).getByText('Relational Database Table'),
      ).toBeDefined(),
    );
    expect(screen.getAllByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toHaveLength(
      1,
    );
    expect(within(editor()).getByText('relational101')).toBeDefined();
  });

  test("Keeps a right-click in the editor from opening the canvas's menu", async () => {
    await render(true);
    // a right-click on a node opens the menu
    fireEvent.contextMenu(await TEST__findCanvasNode('join101'));
    expect(await screen.findByRole('menu')).toBeDefined();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

    await openEditor('join101');
    fireEvent.contextMenu(within(editor()).getByText('join101'));
    fireEvent.contextMenu(editor());
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('Shows nothing while no node is open, nor once it closes', async () => {
    const editorState = await render(true);
    await TEST__findCanvasNode('join101');
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    const opened = await openEditor('join101');
    const root = popperRoot(opened);
    fireEvent.click(
      within(opened).getByRole('button', { name: 'Close the editor' }),
    );
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    expect(root && document.body.contains(root)).toBe(false);
  });

  test('Draws no editor from the canvas unless it is told to float', async () => {
    const editorState = await render();
    fireEvent.click(await TEST__findCanvasNode('join101'));
    expect(editorState.nodeEditor.nodeId).toBe('join101');
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
  });
});

describe('Placing the floating node editor', () => {
  const restores: (() => void)[] = [];

  /**
   * The rendered canvas's place on the screen and a 1440 by 900 window,
   * which jsdom doesn't measure, so the popper places the editor as a
   * browser would
   */
  const stubLayout = (canvas: {
    left: number;
    top: number;
    width: number;
    height: number;
  }): void => {
    const element = document.querySelector('.react-flow');
    if (!element) {
      throw new Error('No canvas to place');
    }
    jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      ...canvas,
      x: canvas.left,
      y: canvas.top,
      right: canvas.left + canvas.width,
      bottom: canvas.top + canvas.height,
      toJSON: () => canvas,
    } as DOMRect);
    (
      [
        ['clientWidth', 1440],
        ['clientHeight', 900],
      ] as const
    ).forEach(([name, value]) => {
      const own = Object.getOwnPropertyDescriptor(
        document.documentElement,
        name,
      );
      Object.defineProperty(document.documentElement, name, {
        configurable: true,
        value,
      });
      restores.push(() => {
        if (own) {
          Object.defineProperty(document.documentElement, name, own);
        } else {
          delete (
            document.documentElement as unknown as Record<string, unknown>
          )[name];
        }
      });
    });
  };

  afterEach(() => {
    jest.restoreAllMocks();
    restores.splice(0).forEach((restore) => restore());
  });

  test('Places the editor 8px below its node, centred, following the node opened next', async () => {
    await render(true);
    stubLayout({ left: 100, top: 50, width: 800, height: 400 });
    // join101 at (280, 52) in the layout, at zoom 1 with no pan: 380..580 x 102..174
    const root = popperRoot(await openEditor('join101'));
    expect(root?.getAttribute('data-popper-placement')).toBe('bottom');
    expect(root?.style.transform).toBe('translate(480px, 182px)');
    // relational102 at (0, 104): 100..300 x 154..226
    fireEvent.click(await TEST__findCanvasNode('relational102'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(popperRoot(editor())?.style.transform).toBe(
      'translate(200px, 234px)',
    );
  });

  test('Follows its node through a zoom', async () => {
    await render(true);
    stubLayout({ left: 100, top: 50, width: 800, height: 400 });
    const root = popperRoot(await openEditor('join101'));
    expect(root?.style.transform).toBe('translate(480px, 182px)');
    fireEvent.click(screen.getByRole('button', { name: /zoom in/iu }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    expect(root?.style.transform).not.toBe('translate(480px, 182px)');
  });

  test('Hides the editor while its node is out of the canvas, keeping it open', async () => {
    // a canvas 100px tall shows relational101 (50..122) but not relational102 (154..226)
    const editorState = await render(true);
    stubLayout({ left: 100, top: 50, width: 800, height: 100 });
    const opened = await openEditor('relational102');
    expect(popperRoot(opened)?.style.visibility).toBe('hidden');
    expect(editorState.nodeEditor.nodeId).toBe('relational102');
    fireEvent.click(await TEST__findCanvasNode('relational101'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(popperRoot(editor())?.style.visibility).not.toBe('hidden');
  });
});
