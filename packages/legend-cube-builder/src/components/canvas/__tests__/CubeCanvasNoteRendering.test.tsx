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
  type StepNote,
} from '@finos/legend-cube';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { runInAction } from 'mobx';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../CubeCanvas.js';
import {
  CUBE_CANVAS_NODE_HEIGHT,
  CUBE_CANVAS_NOTE_HEIGHT,
} from '../CubeCanvasLayout.js';
import { CUBE_STEP_NOTE_LABEL } from '../CubeCanvasStepNote.js';

// Notes on the canvas (PLAN §11.31): a line under the step, the whole note
// on hover, written in the step's editor from its menu or a click on it

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const NOTE = 'Only EMEA desks,\nper Risk';

/** ORDERS → filter101 → filter102, with these notes */
const chain = (notes?: StepNote[]): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        new Filter('filter101'),
        new Filter('filter102'),
      ],
      [
        new Connection('relational101', 'filter101', 'tds'),
        new Connection('filter101', 'filter102', 'tds'),
      ],
      'filter102',
    ),
    meta: { ...DEFAULT_META, notes },
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
  return editorState;
};

/** The step's React Flow wrapper */
const flowNodeOf = (stepId: string): HTMLElement =>
  document.querySelector<HTMLElement>(
    `.react-flow__node[data-id="${stepId}"]`,
  ) as HTMLElement;

const openMenu = async (stepId: string): Promise<HTMLElement> => {
  fireEvent.contextMenu(await TEST__findCanvasNode(stepId));
  return screen.findByRole('menu');
};

beforeEach(() => {
  localStorage.clear();
});

describe('Notes on the canvas', () => {
  test('Shows a step’s note as one line under it, its lines run together', async () => {
    await render(chain([{ step: 'filter102', text: NOTE }]));
    const note = await screen.findByTestId(
      LEGEND_CUBE_TEST_ID.CANVAS_STEP_NOTE,
    );
    expect(note.textContent).toBe('Only EMEA desks, per Risk');
    expect(flowNodeOf('filter102').contains(note)).toBe(true);
    // the step's node is taller by the line; its output stays in its middle
    expect(flowNodeOf('filter102').style.height).toBe(
      `${CUBE_CANVAS_NODE_HEIGHT + CUBE_CANVAS_NOTE_HEIGHT}px`,
    );
    expect(flowNodeOf('filter101').style.height).toBe(
      `${CUBE_CANVAS_NODE_HEIGHT}px`,
    );
    expect(
      flowNodeOf('filter102').querySelector<HTMLElement>(
        '.react-flow__handle.source',
      )?.style.top,
    ).toBe(`${CUBE_CANVAS_NODE_HEIGHT / 2}px`);
  });

  test('Shows the whole note, as written, on hover', async () => {
    await render(chain([{ step: 'filter102', text: NOTE }]));
    fireEvent.mouseOver(
      await screen.findByTestId(LEGEND_CUBE_TEST_ID.CANVAS_STEP_NOTE),
    );
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toBe(NOTE);
  });

  test("Add Note… opens the step's editor at its Note field; applied, the note shows under the step", async () => {
    const editorState = await render(chain());
    const menu = await openMenu('filter101');
    fireEvent.click(
      within(menu).getByRole('button', { name: CUBE_STEP_NOTE_LABEL.ADD }),
    );
    const field = await screen.findByTestId<HTMLTextAreaElement>(
      LEGEND_CUBE_TEST_ID.STEP_NOTE_FIELD,
    );
    await waitFor(() => expect(document.activeElement).toBe(field));
    fireEvent.change(field, { target: { value: 'Why this filter' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    const note = await screen.findByTestId(
      LEGEND_CUBE_TEST_ID.CANVAS_STEP_NOTE,
    );
    expect(note.textContent).toBe('Why this filter');
    expect(flowNodeOf('filter101').contains(note)).toBe(true);
    expect(editorState.getStepNote('filter101')).toBe('Why this filter');
  });

  test("Edit Note… in a noted step's menu; a click on the note opens its editor at the note", async () => {
    await render(chain([{ step: 'filter102', text: NOTE }]));
    const menu = await openMenu('filter102');
    expect(
      within(menu).getByRole('button', { name: CUBE_STEP_NOTE_LABEL.EDIT }),
    ).toBeDefined();
    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    fireEvent.click(
      await screen.findByTestId(LEGEND_CUBE_TEST_ID.CANVAS_STEP_NOTE),
    );
    const field = await screen.findByTestId<HTMLTextAreaElement>(
      LEGEND_CUBE_TEST_ID.STEP_NOTE_FIELD,
    );
    expect(field.value).toBe(NOTE);
    await waitFor(() => expect(document.activeElement).toBe(field));
  });

  test('Takes the line away once the note is cleared', async () => {
    const editorState = await render(
      chain([{ step: 'filter102', text: NOTE }]),
    );
    await screen.findByTestId(LEGEND_CUBE_TEST_ID.CANVAS_STEP_NOTE);
    act(() => editorState.setStepNote('filter102', ''));
    await waitFor(() =>
      expect(
        screen.queryByTestId(LEGEND_CUBE_TEST_ID.CANVAS_STEP_NOTE),
      ).toBeNull(),
    );
    expect(flowNodeOf('filter102').style.height).toBe(
      `${CUBE_CANVAS_NODE_HEIGHT}px`,
    );
  });

  test("A read-only cube shows its notes, but Edit Note… is off and the editor's field can't be changed", async () => {
    const editorState = await render(
      chain([{ step: 'filter102', text: NOTE }]),
    );
    act(() =>
      runInAction(() => {
        editorState.readOnly = true;
      }),
    );
    const menu = await openMenu('filter102');
    expect(
      within(menu)
        .getByRole('button', { name: CUBE_STEP_NOTE_LABEL.EDIT })
        .hasAttribute('disabled'),
    ).toBe(true);
    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    fireEvent.click(
      await screen.findByTestId(LEGEND_CUBE_TEST_ID.CANVAS_STEP_NOTE),
    );
    const field = await screen.findByTestId<HTMLTextAreaElement>(
      LEGEND_CUBE_TEST_ID.STEP_NOTE_FIELD,
    );
    expect(field.readOnly).toBe(true);
    // with no note, a read-only step's editor has no Note field
    act(() => editorState.nodeEditor.open('filter101'));
    await waitFor(() =>
      expect(
        screen.queryByTestId(LEGEND_CUBE_TEST_ID.STEP_NOTE_FIELD),
      ).toBeNull(),
    );
  });
});
