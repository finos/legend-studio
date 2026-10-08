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
  Limit,
  MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER,
  Query,
} from '@finos/legend-cube';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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
const SIZE = 'Rows to keep';

/** ORDERS → limit101, holding this size */
const ordersLimited = (size: number | undefined): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
      new Limit('limit101', size),
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

const openLimit = async (): Promise<HTMLElement> => {
  fireEvent.click(await TEST__findCanvasNode('limit101'));
  return screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
};

const sizeField = (): HTMLInputElement =>
  within(panel()).getByLabelText<HTMLInputElement>(SIZE);

const type = (text: string): void => {
  fireEvent.change(sizeField(), { target: { value: text } });
};

const button = (name: string): HTMLButtonElement =>
  within(panel()).getByRole<HTMLButtonElement>('button', { name });

const problems = (): string[] =>
  Array.from(
    within(panel()).queryByRole('alert', { name: 'Problems' })?.children ?? [],
  ).map((problem) => problem.textContent ?? '');

const storedSize = (editorState: CubeEditorState): number | undefined =>
  (editorState.document.query.getNode('limit101') as Limit).size;

beforeEach(() => {
  localStorage.clear();
});

describe('Limit editor', () => {
  test('Shows the size in one field and stores a new one on Apply, as one undo step', async () => {
    const editorState = await render(ordersLimited(10));
    await openLimit();
    expect(
      within(panel()).getByText('Take first <x> rows', { exact: true }),
    ).toBeDefined();
    expect(sizeField().value).toBe('10');
    expect(sizeField().getAttribute('aria-invalid')).toBe('false');
    expect(problems()).toEqual([]);
    expect(button('Apply').disabled).toBe(true);
    type('5');
    expect(button('Apply').disabled).toBe(false);
    fireEvent.click(button('Apply'));
    expect(storedSize(editorState)).toBe(5);
    expect(editorState.history).toHaveLength(1);
    // the panel goes on, on the stored node, with nothing left to apply
    expect(editorState.nodeEditor.draft?.original).toBe(
      editorState.document.query.getNode('limit101'),
    );
    expect(button('Apply').disabled).toBe(true);
    await waitFor(async () =>
      expect(
        TEST__getCanvasNodeTooltip(await TEST__findCanvasNode('limit101')),
      ).toContain('Take first 5 row(s)'),
    );
  });

  test('Reports a cleared field and stores it cleared, never as the default', async () => {
    const editorState = await render(ordersLimited(10));
    await openLimit();
    type('');
    expect(sizeField().getAttribute('aria-invalid')).toBe('true');
    expect(problems()).toEqual([MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER]);
    // clearing the default is a change: the saved spec tells them apart
    expect(button('Apply').disabled).toBe(false);
    fireEvent.click(button('Apply'));
    expect(storedSize(editorState)).toBeUndefined();
    expect(editorState.history).toHaveLength(1);
    expect(editorState.analysis.validity.get('limit101')).toEqual([
      MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER,
    ]);
    expect(editorState.execution.canExecute).toBe(false);
  });

  test.each([
    '0',
    '-3',
    '1.5',
    '1e3',
    '0x10',
    'ten',
    // whole, but past what a double holds exactly
    '9007199254740993',
    '99999999999999999999',
  ])('Marks %j as not a positive whole number', async (text) => {
    await render(ordersLimited(10));
    await openLimit();
    type(text);
    expect(sizeField().value).toBe(text);
    expect(sizeField().getAttribute('aria-invalid')).toBe('true');
    expect(problems()).toEqual([MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER]);
  });

  test('Takes a size with a sign or spaces around it', async () => {
    const editorState = await render(ordersLimited(10));
    await openLimit();
    type(' +20 ');
    expect(sizeField().getAttribute('aria-invalid')).toBe('false');
    expect(problems()).toEqual([]);
    fireEvent.click(button('Apply'));
    expect(storedSize(editorState)).toBe(20);
  });

  test('Adds nothing to undo for Cancel, or for a size typed back', async () => {
    const editorState = await render(ordersLimited(10));
    await openLimit();
    type('5');
    type('10');
    expect(button('Apply').disabled).toBe(true);
    type('7');
    fireEvent.click(button('Cancel'));
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    expect(editorState.history).toHaveLength(0);
    expect(storedSize(editorState)).toBe(10);
  });

  test('Opens a cleared size as an empty field with its problem', async () => {
    const editorState = await render(ordersLimited(undefined));
    await openLimit();
    expect(sizeField().value).toBe('');
    expect(problems()).toEqual([MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER]);
    type('25');
    fireEvent.click(button('Apply'));
    expect(storedSize(editorState)).toBe(25);
    expect(editorState.analysis.validity.get('limit101')).toEqual([]);
  });

  test('Is a text field that asks for the numeric keypad', async () => {
    await render(ordersLimited(10));
    await openLimit();
    expect(sizeField().getAttribute('type')).toBe('text');
    expect(sizeField().getAttribute('inputmode')).toBe('numeric');
  });

  test('Shows a read-only cube without letting it change', async () => {
    const editorState = await render(new Query());
    await TEST__importDocument(
      editorState,
      new CubeDocument({ context: CONTEXT, query: ordersLimited(10) }),
      true,
    );
    await openLimit();
    expect(sizeField().disabled).toBe(true);
    expect(button('Apply').disabled).toBe(true);
  });
});

describe('Limit editor, on a saved size the field cannot hold', () => {
  // only a spec the app didn't write holds such a size: it must stay as saved
  // until the user types something else
  const renderImported = async (): Promise<CubeEditorState> => {
    const editorState = await render(new Query());
    await TEST__importDocument(
      editorState,
      new CubeDocument({ context: CONTEXT, query: ordersLimited(1.5) }),
    );
    return editorState;
  };

  test('Opens it as written and marked, with nothing to apply, and closes without changing it', async () => {
    const editorState = await renderImported();
    const steps = editorState.history.length;
    await openLimit();
    expect(sizeField().value).toBe('1.5');
    expect(sizeField().getAttribute('aria-invalid')).toBe('true');
    expect(problems()).toEqual([MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER]);
    expect(button('Apply').disabled).toBe(true);
    fireEvent.click(
      within(panel()).getByRole('button', { name: 'Close the editor' }),
    );
    expect(storedSize(editorState)).toBe(1.5);
    expect(editorState.history).toHaveLength(steps);
  });

  test('Keeps it when another node is opened', async () => {
    const editorState = await renderImported();
    const steps = editorState.history.length;
    await openLimit();
    fireEvent.click(await TEST__findCanvasNode('relational101'));
    await waitFor(() =>
      expect(editorState.nodeEditor.nodeId).toBe('relational101'),
    );
    expect(storedSize(editorState)).toBe(1.5);
    expect(editorState.history).toHaveLength(steps);
  });

  test('Keeps it once its text is typed back, with nothing to apply', async () => {
    const editorState = await renderImported();
    const steps = editorState.history.length;
    await openLimit();
    type('1.5x');
    expect(button('Apply').disabled).toBe(false);
    type('1.5');
    expect(button('Apply').disabled).toBe(true);
    fireEvent.click(
      within(panel()).getByRole('button', { name: 'Close the editor' }),
    );
    expect(storedSize(editorState)).toBe(1.5);
    expect(editorState.history).toHaveLength(steps);
  });

  test('Says nothing of lost changes on Undo once its text is typed back', async () => {
    const editorState = await renderImported();
    await openLimit();
    type('1.5x');
    type('1.5');
    act(() => editorState.undo());
    expect(editorState.nodeEditor.notice).toBeUndefined();
  });
});
