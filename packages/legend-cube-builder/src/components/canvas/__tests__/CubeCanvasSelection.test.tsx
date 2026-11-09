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
  DEFAULT_META,
  Filter,
  Query,
  type StepContainer,
} from '@finos/legend-cube';
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
  sliceQuery,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../CubeCanvas.js';
import { CUBE_CONTAINER_LABEL } from '../CubeCanvasContainerMenu.js';
import {
  CUBE_CANVAS_NODE_HEIGHT,
  CUBE_CANVAS_NODE_WIDTH,
  layoutCubeCanvas,
} from '../CubeCanvasLayout.js';
import { getCubeCanvasStepsInBox } from '../CubeCanvasSelectionBox.js';

// Picking steps on the canvas with the mouse, and putting them in a
// container (PLAN §11.29). jsdom lays nothing out, so the canvas isn't
// fitted: its pixels are the graph's.

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

const PICKED_CLASS_NAME = 'legend-cube__node--picked';

/** ORDERS ⋈ CUSTOMERS, then a filter, with these containers */
const slice = (containers?: StepContainer[]): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: sliceQuery(),
    meta: { ...DEFAULT_META, containers },
  });

const render = async (document: CubeDocument): Promise<CubeEditorState> => {
  const { host } = TEST__createCubeHost();
  const editorState = new CubeEditorState(host, document);
  await TEST__renderInCubeApplication(
    <div style={{ width: 800, height: 400 }}>
      <CubeCanvas editorState={editorState} />
    </div>,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.CANVAS,
  );
  await TEST__findCanvasNode('filter101');
  return editorState;
};

/** React Flow's wrapper of a step, which takes the focus and the keys */
const stepWrapper = (stepId: string): HTMLElement =>
  document.querySelector<HTMLElement>(
    `.react-flow__node[data-id="${stepId}"]`,
  ) as HTMLElement;

const getPane = (): HTMLElement =>
  document.querySelector<HTMLElement>('.react-flow__pane') as HTMLElement;

const isPicked = async (stepId: string): Promise<boolean> =>
  (await TEST__findCanvasNode(stepId)).classList.contains(PICKED_CLASS_NAME);

const shiftClick = async (stepId: string): Promise<void> => {
  fireEvent.click(await TEST__findCanvasNode(stepId), { shiftKey: true });
};

/** A pointer event on the canvas: jsdom has no PointerEvent, so a MouseEvent of its type */
const point = (
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
  clientY: number,
): void => {
  act(() => {
    target.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX,
        clientY,
      }),
    );
  });
};

beforeEach(() => {
  localStorage.clear();
});

describe('Picking steps on the canvas', () => {
  test('Shift-click picks a step and unpicks it, opening no editor; a click on the canvas picks none', async () => {
    const editorState = await render(slice());
    await shiftClick('join101');
    await shiftClick('relational101');
    expect(await isPicked('join101')).toBe(true);
    expect(await isPicked('relational101')).toBe(true);
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
    await shiftClick('join101');
    expect(await isPicked('join101')).toBe(false);
    // the output step, picked, keeps its ring, and gets the tint as well
    await shiftClick('filter101');
    const output = await TEST__findCanvasNode('filter101');
    expect(output.classList.contains('legend-cube__node--selected')).toBe(true);
    expect(output.classList.contains(PICKED_CLASS_NAME)).toBe(true);
    // a click with Shift on the canvas is a box not drawn: it keeps them
    fireEvent.click(getPane(), { shiftKey: true });
    expect(editorState.canvasSelection.stepIds).toEqual([
      'relational101',
      'filter101',
    ]);
    fireEvent.click(getPane());
    expect(editorState.canvasSelection.stepIds).toEqual([]);
    expect(await isPicked('relational101')).toBe(false);
    // a plain click still opens the step's editor
    fireEvent.click(await TEST__findCanvasNode('join101'));
    expect(editorState.nodeEditor.nodeId).toBe('join101');
  });

  test('Shift and a drag on the canvas draws a box that adds the steps wholly inside it', async () => {
    const editorState = await render(slice());
    await shiftClick('filter101');
    const { positions } = layoutCubeCanvas(
      editorState.document.query,
      undefined,
    );
    // the two sources, in the first column, the upper one first
    const [upper, lower] = ['relational101', 'relational102']
      .map((id) => ({ id, ...(positions.get(id) as { x: number; y: number }) }))
      .sort((a, b) => a.y - b.y) as [
      { id: string; x: number; y: number },
      { id: string; x: number; y: number },
    ];
    const left = Math.min(upper.x, lower.x) - 5;
    const top = upper.y - 5;
    const right = Math.max(upper.x, lower.x) + CUBE_CANVAS_NODE_WIDTH;
    const bottom = lower.y + CUBE_CANVAS_NODE_HEIGHT;
    fireEvent.keyDown(window, { key: 'Shift' });
    const pane = getPane();
    point(pane, 'pointerdown', left, top);
    // the box holds the upper source, and part of the lower one
    point(pane, 'pointermove', right, upper.y + CUBE_CANVAS_NODE_HEIGHT + 1);
    expect([...editorState.canvasSelection.stepIds].sort()).toEqual(
      ['filter101', upper.id].sort(),
    );
    // then both
    point(pane, 'pointermove', right + 5, bottom + 5);
    expect(document.querySelector('.react-flow__selection')).not.toBeNull();
    point(pane, 'pointerup', right + 5, bottom + 5);
    fireEvent.keyUp(window, { key: 'Shift' });
    expect(editorState.canvasSelection.stepIds).toEqual([
      'relational101',
      'relational102',
      'filter101',
    ]);
    expect(await isPicked('relational102')).toBe(true);
    // React Flow selected nothing: it draws no rectangle of its own over them
    expect(document.querySelector('.react-flow__nodesselection')).toBeNull();
    // nor did the drag pick the Join between them
    expect(await isPicked('join101')).toBe(false);
  });

  test('Escape on the canvas picks none, and Shift with Enter or Space picks the focused step', async () => {
    const editorState = await render(slice());
    fireEvent.keyDown(stepWrapper('join101'), { key: ' ', shiftKey: true });
    fireEvent.keyDown(stepWrapper('filter101'), {
      key: 'Enter',
      shiftKey: true,
    });
    expect(editorState.canvasSelection.stepIds).toEqual([
      'join101',
      'filter101',
    ]);
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
    fireEvent.keyDown(stepWrapper('join101'), { key: 'Escape' });
    expect(editorState.canvasSelection.stepIds).toEqual([]);
    // from the canvas itself, which a press on it focuses
    await shiftClick('join101');
    const canvas = document.querySelector('.react-flow') as HTMLElement;
    expect(canvas.tabIndex).toBe(-1);
    fireEvent.keyDown(canvas, { key: 'Escape' });
    expect(editorState.canvasSelection.stepIds).toEqual([]);
  });
});

describe('Putting the steps picked in a container', () => {
  test("A picked step's menu puts the selection in a container, with the steps between them: one undo step", async () => {
    const editorState = await render(slice());
    // an unpicked step's menu has no such item
    fireEvent.contextMenu(await TEST__findCanvasNode('relational101'));
    expect(
      within(await screen.findByRole('menu')).queryByRole('button', {
        name: CUBE_CONTAINER_LABEL.PUT_SELECTION_IN,
      }),
    ).toBeNull();
    fireEvent.keyDown(await screen.findByRole('menu'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await shiftClick('relational101');
    await shiftClick('relational102');
    fireEvent.contextMenu(await TEST__findCanvasNode('relational102'));
    const item = within(await screen.findByRole('menu')).getByRole('button', {
      name: CUBE_CONTAINER_LABEL.PUT_SELECTION_IN,
    });
    expect(item.getAttribute('title')).toBe(
      'A new container of the 2 steps selected and the step between them (Ctrl/Cmd+G)',
    );
    fireEvent.click(item);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    const frame = await screen.findByTestId(
      LEGEND_CUBE_TEST_ID.CANVAS_CONTAINER,
    );
    expect(frame.textContent).toContain('Container 1');
    expect(frame.textContent).toContain('3 steps');
    expect(editorState.document.meta.containers?.[0]?.steps).toEqual([
      'join101',
      'relational101',
      'relational102',
    ]);
    expect(editorState.canvasSelection.stepIds).toEqual([]);
    act(() => editorState.undo());
    await waitFor(() =>
      expect(
        screen.queryByTestId(LEGEND_CUBE_TEST_ID.CANVAS_CONTAINER),
      ).toBeNull(),
    );
  });

  test("Ctrl/Cmd+G on the canvas puts the selection in a container, the browser's Find Next kept from running", async () => {
    const editorState = await render(slice());
    await shiftClick('join101');
    await shiftClick('filter101');
    // false: the default was prevented
    expect(
      fireEvent.keyDown(stepWrapper('filter101'), { key: 'g', ctrlKey: true }),
    ).toBe(false);
    expect(editorState.document.meta.containers?.[0]?.steps).toEqual([
      'filter101',
      'join101',
    ]);
    // Cmd on the canvas itself, with nothing picked: nothing to do, and
    // still not the browser's
    const canvas = document.querySelector('.react-flow') as HTMLElement;
    expect(fireEvent.keyDown(canvas, { key: 'g', metaKey: true })).toBe(false);
    expect(editorState.document.meta.containers).toHaveLength(1);
    // with Shift, the key is another's, e.g. Studio's
    await shiftClick('relational101');
    expect(
      fireEvent.keyDown(canvas, { key: 'G', metaKey: true, shiftKey: true }),
    ).toBe(true);
    expect(editorState.document.meta.containers).toHaveLength(1);
  });

  test('Refuses a step between the steps picked that is in a container, with the reason in the tooltip', async () => {
    const editorState = await render(
      slice([
        {
          id: 'container1',
          title: 'The join',
          steps: ['join101'],
          folded: false,
        },
      ]),
    );
    await shiftClick('relational101');
    await shiftClick('filter101');
    fireEvent.contextMenu(await TEST__findCanvasNode('filter101'));
    const item = within(
      await screen.findByRole('menu'),
    ).getByRole<HTMLButtonElement>('button', {
      name: CUBE_CONTAINER_LABEL.PUT_SELECTION_IN,
    });
    expect(item.disabled).toBe(true);
    expect(item.getAttribute('title')).toMatch(
      /^“.+”, between the steps selected, is in “The join”: containers don't nest$/u,
    );
    // nor does Ctrl+G
    fireEvent.keyDown(stepWrapper('filter101'), { key: 'g', ctrlKey: true });
    expect(editorState.document.meta.containers).toHaveLength(1);
  });

  test("Refuses steps of two trees, which a container can't link", async () => {
    await render(
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [
            northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
            new Filter('filter101'),
            northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
          ],
          [new Connection('relational101', 'filter101', 'tds')],
          'filter101',
        ),
      }),
    );
    await shiftClick('filter101');
    await shiftClick('relational102');
    fireEvent.contextMenu(await TEST__findCanvasNode('relational102'));
    const item = within(
      await screen.findByRole('menu'),
    ).getByRole<HTMLButtonElement>('button', {
      name: CUBE_CONTAINER_LABEL.PUT_SELECTION_IN,
    });
    expect(item.disabled).toBe(true);
    expect(item.getAttribute('title')).toBe(
      "The steps selected aren't all of one tree: a container's steps are linked to one another",
    );
  });
});

describe('The selection box', () => {
  test('Takes the steps wholly inside it, in the graph the viewport shows', () => {
    const positions = new Map([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 300, y: 0 }],
    ]);
    const all = {
      x: 0,
      y: 0,
      width: 300 + CUBE_CANVAS_NODE_WIDTH,
      height: CUBE_CANVAS_NODE_HEIGHT,
    };
    expect(getCubeCanvasStepsInBox(positions, all, [0, 0, 1])).toEqual([
      'a',
      'b',
    ]);
    // a pixel short of b
    expect(
      getCubeCanvasStepsInBox(
        positions,
        { ...all, width: all.width - 1 },
        [0, 0, 1],
      ),
    ).toEqual(['a']);
    // the graph moved 100 pixels right and shown at half its size
    expect(
      getCubeCanvasStepsInBox(
        positions,
        {
          x: 100 + 150,
          y: 0,
          width: CUBE_CANVAS_NODE_WIDTH / 2,
          height: CUBE_CANVAS_NODE_HEIGHT / 2,
        },
        [100, 0, 0.5],
      ),
    ).toEqual(['b']);
  });
});
