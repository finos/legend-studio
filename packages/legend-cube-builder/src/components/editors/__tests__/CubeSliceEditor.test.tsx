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
  MESSAGE_MUST_BE_WHOLE_NUMBER,
  MESSAGE_START_ROW_INDEX_MUST_BE_LESS_THAN_STOP,
  Query,
  Slice,
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
const START = 'Start row index';
const STOP = 'Stop row index';

/** ORDERS → slice101, holding this range */
const ordersSliced = (
  start: number | undefined,
  stop: number | undefined,
): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
      new Slice('slice101', start, stop),
    ],
    [new Connection('relational101', 'slice101', 'tds')],
    'slice101',
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

const openSlice = async (): Promise<void> => {
  fireEvent.click(await TEST__findCanvasNode('slice101'));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
};

const field = (label: string): HTMLInputElement =>
  within(panel()).getByLabelText<HTMLInputElement>(label);

const type = (label: string, text: string): void => {
  fireEvent.change(field(label), { target: { value: text } });
};

const button = (name: string): HTMLButtonElement =>
  within(panel()).getByRole<HTMLButtonElement>('button', { name });

const problems = (): string[] =>
  Array.from(
    within(panel()).queryByRole('alert', { name: 'Problems' })?.children ?? [],
  ).map((problem) => problem.textContent ?? '');

const stored = (editorState: CubeEditorState): Slice =>
  editorState.document.query.getNode('slice101') as Slice;

beforeEach(() => {
  localStorage.clear();
});

describe('Slice editor', () => {
  test('Shows the range, says the stop row is not kept, and stores a new range on Apply, as one undo step', async () => {
    const editorState = await render(ordersSliced(10, 20));
    await openSlice();
    expect([field(START).value, field(STOP).value]).toEqual(['10', '20']);
    expect(
      within(panel()).getByText(
        'Rows count from 0: the start row is kept, the stop row is not.',
      ),
    ).toBeDefined();
    expect(button('Apply').disabled).toBe(true);
    type(START, '0');
    type(STOP, '5');
    fireEvent.click(button('Apply'));
    expect([stored(editorState).start, stored(editorState).stop]).toEqual([
      0, 5,
    ]);
    expect(editorState.history).toHaveLength(1);
    await waitFor(async () =>
      expect(
        TEST__getCanvasNodeTooltip(await TEST__findCanvasNode('slice101')),
      ).toContain('Take rows 0 to 5 (5 excluded)'),
    );
  });

  test('Reports each bound on its own field, and a stop that does not come after the start', async () => {
    await render(ordersSliced(10, 20));
    await openSlice();
    type(START, '-1');
    type(STOP, '');
    expect(field(START).getAttribute('aria-invalid')).toBe('true');
    expect(field(STOP).getAttribute('aria-invalid')).toBe('true');
    expect(problems()).toEqual([
      MESSAGE_MUST_BE_WHOLE_NUMBER('Start row index'),
      MESSAGE_MUST_BE_WHOLE_NUMBER('Stop row index'),
    ]);
    type(START, '5');
    type(STOP, '5');
    expect(field(START).getAttribute('aria-invalid')).toBe('false');
    expect(field(STOP).getAttribute('aria-invalid')).toBe('true');
    expect(problems()).toEqual([
      MESSAGE_START_ROW_INDEX_MUST_BE_LESS_THAN_STOP,
    ]);
  });

  test('Stores a cleared bound cleared, never as the default', async () => {
    const editorState = await render(ordersSliced(10, 20));
    await openSlice();
    type(STOP, '');
    fireEvent.click(button('Apply'));
    expect(stored(editorState).stop).toBeUndefined();
    expect(stored(editorState).start).toBe(10);
    expect(editorState.analysis.validity.get('slice101')).toEqual([
      MESSAGE_MUST_BE_WHOLE_NUMBER('Stop row index'),
    ]);
  });

  test('Shows a read-only cube without letting it change', async () => {
    const editorState = await render(new Query());
    await TEST__importDocument(
      editorState,
      new CubeDocument({ context: CONTEXT, query: ordersSliced(10, 20) }),
      true,
    );
    await openSlice();
    expect(field(START).disabled).toBe(true);
    expect(field(STOP).disabled).toBe(true);
    expect(button('Apply').disabled).toBe(true);
  });
});
