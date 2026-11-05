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
  CubeDocument,
  DEFAULT_META,
  type StepContainer,
} from '@finos/legend-cube';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { RUNNING_NODE_LABEL } from '../../../__lib__/LegendCubeHelpText.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import {
  TEST__findCanvasNode,
  TEST__getCanvasNodes,
} from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  NORTHWIND_RUNTIME,
  sliceQuery,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../CubeCanvas.js';
import { CUBE_CONTAINER_LABEL } from '../CubeCanvasContainerMenu.js';
import { getCubeCanvasContainerNodeId } from '../CubeCanvasElements.js';

// Containers on the canvas (PLAN §11.29): a frame behind their steps, or,
// folded, one box in their place; made and changed from the menus

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** ORDERS ⋈ CUSTOMERS, then a filter, with these containers */
const slice = (containers?: StepContainer[]): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: sliceQuery(),
    meta: { ...DEFAULT_META, containers },
  });

const ORDERS_WITH_CUSTOMERS: StepContainer = {
  id: 'container1',
  title: 'Orders with customers',
  steps: ['relational101', 'relational102', 'join101'],
  folded: false,
};

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
  return editorState;
};

const findFrame = (): Promise<HTMLElement> =>
  screen.findByTestId(LEGEND_CUBE_TEST_ID.CANVAS_CONTAINER);

const findFoldedBox = (): Promise<HTMLElement> =>
  screen.findByTestId(LEGEND_CUBE_TEST_ID.CANVAS_FOLDED_CONTAINER);

/** The drawn steps' ids, sorted */
const drawnSteps = (): string[] =>
  TEST__getCanvasNodes()
    .map(
      (node) =>
        node.closest<HTMLElement>('.react-flow__node')?.dataset.id ?? '',
    )
    .sort();

beforeEach(() => {
  localStorage.clear();
});

describe('Containers on the canvas', () => {
  test('Frames an open container behind its steps, with its title and how many steps it holds', async () => {
    await render(slice([ORDERS_WITH_CUSTOMERS]));
    const frame = await findFrame();
    expect(frame.textContent).toContain('Orders with customers');
    expect(frame.textContent).toContain('3 steps');
    await TEST__findCanvasNode('join101');
    expect(drawnSteps()).toEqual([
      'filter101',
      'join101',
      'relational101',
      'relational102',
    ]);
  });

  test("Draws a folded container as one box in its steps' place, with the Output label of a step in it", async () => {
    await render(
      slice([
        {
          ...ORDERS_WITH_CUSTOMERS,
          steps: ['join101', 'filter101'],
          folded: true,
        },
      ]),
    );
    const box = await findFoldedBox();
    expect(box.textContent).toContain('Orders with customers');
    expect(box.textContent).toContain('2 steps, folded');
    // filter101, the output step, is in it
    expect(within(box).getByText(RUNNING_NODE_LABEL)).toBeDefined();
    await TEST__findCanvasNode('relational101');
    expect(drawnSteps()).toEqual(['relational101', 'relational102']);
  });

  test('Folds a container from its head and opens it from its box, one undo step each', async () => {
    const editorState = await render(slice([ORDERS_WITH_CUSTOMERS]));
    fireEvent.click(
      within(await findFrame()).getByRole('button', {
        name: 'Fold the container',
      }),
    );
    fireEvent.click(
      within(await findFoldedBox()).getByRole('button', {
        name: 'Open the container',
      }),
    );
    await findFrame();
    act(() => editorState.undo());
    await findFoldedBox();
    expect(editorState.document.meta.containers?.[0]?.folded).toBe(true);
  });

  test('Opens a folded box on Enter', async () => {
    const editorState = await render(
      slice([{ ...ORDERS_WITH_CUSTOMERS, folded: true }]),
    );
    await findFoldedBox();
    const wrapper = document.querySelector<HTMLElement>(
      `.react-flow__node[data-id="${getCubeCanvasContainerNodeId('container1', true)}"]`,
    );
    fireEvent.keyDown(wrapper as HTMLElement, { key: 'Enter' });
    await findFrame();
    expect(editorState.document.meta.containers?.[0]?.folded).toBe(false);
  });

  test('Takes a container away with its ×, its steps staying', async () => {
    const editorState = await render(slice([ORDERS_WITH_CUSTOMERS]));
    fireEvent.click(
      within(await findFrame()).getByRole('button', {
        name: 'Take the container away',
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByTestId(LEGEND_CUBE_TEST_ID.CANVAS_CONTAINER),
      ).toBeNull(),
    );
    expect(editorState.document.query.nodes).toHaveLength(4);
  });

  test('Renames a container in place, from a double-click on its title or its menu', async () => {
    const editorState = await render(slice([ORDERS_WITH_CUSTOMERS]));
    fireEvent.doubleClick(
      within(await findFrame()).getByText('Orders with customers'),
    );
    const input =
      await screen.findByLabelText<HTMLInputElement>('Container title');
    fireEvent.change(input, { target: { value: 'Orders, joined' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(editorState.document.meta.containers?.[0]?.title).toBe(
      'Orders, joined',
    );
    // from its head's menu; Escape keeps the title
    fireEvent.contextMenu(
      within(await findFrame()).getByText('Orders, joined'),
    );
    fireEvent.click(
      within(await screen.findByRole('menu')).getByRole('button', {
        name: CUBE_CONTAINER_LABEL.RENAME,
      }),
    );
    const again =
      await screen.findByLabelText<HTMLInputElement>('Container title');
    fireEvent.change(again, { target: { value: 'Not this' } });
    fireEvent.keyDown(again, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByLabelText('Container title')).toBeNull(),
    );
    expect(editorState.document.meta.containers?.[0]?.title).toBe(
      'Orders, joined',
    );
  });

  test("Puts a step in a new container from its menu's Put in a Container", async () => {
    const editorState = await render(slice());
    fireEvent.contextMenu(await TEST__findCanvasNode('join101'));
    const menu = await screen.findByRole('menu');
    const putIn = within(menu).getByRole('button', {
      name: CUBE_CONTAINER_LABEL.PUT_IN,
    });
    // a click opens its menu, and leaves the step's open
    fireEvent.click(putIn);
    const submenu = await screen.findByRole('menu', {
      name: CUBE_CONTAINER_LABEL.PUT_IN,
    });
    fireEvent.click(
      within(submenu).getByRole('button', {
        name: CUBE_CONTAINER_LABEL.WITH_STEPS_BEFORE,
      }),
    );
    // the item closes the menus, as any does
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    const frame = await findFrame();
    expect(frame.textContent).toContain('Container 1');
    expect(frame.textContent).toContain('3 steps');
    expect(editorState.document.meta.containers?.[0]?.steps).toEqual([
      'join101',
      'relational101',
      'relational102',
    ]);
  });

  test('Takes a step at its edge out of its container from its menu', async () => {
    const editorState = await render(slice([ORDERS_WITH_CUSTOMERS]));
    fireEvent.contextMenu(await TEST__findCanvasNode('relational101'));
    fireEvent.click(
      within(await screen.findByRole('menu')).getByRole('button', {
        name: CUBE_CONTAINER_LABEL.TAKE_OUT,
      }),
    );
    expect(editorState.document.meta.containers?.[0]?.steps).toEqual([
      'relational102',
      'join101',
    ]);
    expect((await findFrame()).textContent).toContain('2 steps');
  });
});
