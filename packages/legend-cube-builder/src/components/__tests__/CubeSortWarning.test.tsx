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
  Join,
  MESSAGE_SORT_ORDER_LOST,
  Query,
  Sort,
  SortDirection,
} from '@finos/legend-cube';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import {
  TEST__findCanvasNode,
  TEST__getCanvasNodeTooltip,
} from '../../__test-utils__/CubeCanvasTestUtils.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../canvas/CubeCanvas.js';
import { CubeNodeEditorPanel } from '../editors/CubeNodeEditorPanel.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** ORDERS sorted by ORDER_ID, joined to CUSTOMERS on CUSTOMER_ID; the join selected */
const sortedOrdersJoined = (): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
      new Sort('sort101', [
        { column: 'ORDER_ID', direction: SortDirection.DESC },
      ]),
      northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
      new Join('join101', {
        leftColumns: ['CUSTOMER_ID'],
        rightColumns: ['CUSTOMER_ID'],
      }),
    ],
    [
      new Connection('relational101', 'sort101', 'tds'),
      new Connection('sort101', 'join101', 'leftTds'),
      new Connection('relational102', 'join101', 'rightTds'),
    ],
    'join101',
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

const LOST = MESSAGE_SORT_ORDER_LOST('join101');

beforeEach(() => {
  localStorage.clear();
});

describe('Sort warning', () => {
  test('Marks the Sort on the canvas and lists the warning in its tooltip, after its errors', async () => {
    await render(sortedOrdersJoined());
    const sort = await TEST__findCanvasNode('sort101');
    expect(sort.classList.contains('legend-cube__node--warning')).toBe(true);
    // a warning, not an error
    expect(sort.classList.contains('legend-cube__node--invalid')).toBe(false);
    expect(TEST__getCanvasNodeTooltip(sort)).toEqual([
      LOST,
      'Sort by "ORDER_ID" Desc',
      'sort101',
    ]);
    const join = await TEST__findCanvasNode('join101');
    expect(join.classList.contains('legend-cube__node--warning')).toBe(false);
  });

  test("Shows the warning in the Sort's editor, once", async () => {
    await render(sortedOrdersJoined());
    fireEvent.click(await TEST__findCanvasNode('sort101'));
    const panel = await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
    expect(within(panel).getByRole('status').textContent).toBe(LOST);
  });

  test('Drops the warning once the order reaches the output', async () => {
    const editorState = await render(sortedOrdersJoined());
    act(() => editorState.removeNode('join101'));
    await waitFor(async () =>
      expect(
        (await TEST__findCanvasNode('sort101')).classList.contains(
          'legend-cube__node--warning',
        ),
      ).toBe(false),
    );
    expect(
      TEST__getCanvasNodeTooltip(await TEST__findCanvasNode('sort101')),
    ).toEqual(['Sort by "ORDER_ID" Desc', 'sort101']);
  });
});
