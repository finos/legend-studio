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
  Distinct,
  Join,
  Query,
} from '@finos/legend-cube';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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
import { FAKE_NORTHWIND_OUTLINE } from '../../../__test-utils__/FakeCubeEngine.js';
import type {
  CubeModelOutline,
  CubeOutlineJoin,
} from '../../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../CubeCanvas.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const [DATABASE] = FAKE_NORTHWIND_OUTLINE.databases;

const ordersJoin = (
  name: string,
  orders: string,
  customers: string,
): CubeOutlineJoin => ({
  name,
  pairs: [
    [
      { schema: 'NORTHWIND', table: 'ORDERS', column: orders },
      { schema: 'NORTHWIND', table: 'CUSTOMERS', column: customers },
    ],
  ],
});

/** Northwind's outline with the database's joins of ORDERS and CUSTOMERS */
const outlineWith = (joins: CubeOutlineJoin[]): CubeModelOutline => ({
  ...FAKE_NORTHWIND_OUTLINE,
  databases: [{ ...(DATABASE as NonNullable<typeof DATABASE>), joins }],
});

const render = async (
  query: Query,
  outline: CubeModelOutline,
): Promise<CubeEditorState> => {
  const { host } = TEST__createCubeHost({ outline });
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

/** ORDERS alone, and CUSTOMERS' distinct rows */
const twoChains = (): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
      northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
      new Distinct('distinct101'),
    ],
    [new Connection('relational102', 'distinct101', 'tds')],
    'relational101',
  );

const panel = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);

const joinOf = (editorState: CubeEditorState): Join =>
  editorState.document.query.getNode('join101') as Join;

beforeEach(() => {
  localStorage.clear();
});

describe("Joining a node with another from the canvas's menu", () => {
  test('Lists the other chains under Join Another Input, and adds the Join with the one picked, its columns filled in', async () => {
    const editorState = await render(
      twoChains(),
      outlineWith([
        ordersJoin('Orders_Customers', 'CUSTOMER_ID', 'CUSTOMER_ID'),
      ]),
    );
    fireEvent.contextMenu(await TEST__findCanvasNode('relational101'));
    const menu = await screen.findByRole('menu');
    const join = within(menu).getByRole('button', {
      name: /^Join Another Input/u,
    });
    fireEvent.mouseEnter(join.parentElement as HTMLElement);
    const submenu = await screen.findByRole('menu', { name: 'Join with' });
    const candidates = within(submenu).getAllByRole('button');
    expect(candidates.map((each) => each.textContent)).toEqual([
      'Distinct Values · from CUSTOMERS',
    ]);
    fireEvent.click(candidates[0] as HTMLElement);
    await TEST__findCanvasNode('join101');
    await waitFor(() =>
      expect(editorState.document.query.getInputIds('join101')).toEqual([
        'relational101',
        'distinct101',
      ]),
    );
    expect(joinOf(editorState).leftColumns).toEqual(['CUSTOMER_ID']);
    // its editor opens on it
    await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('Still adds the Join alone on a click, its other input picked in its editor, where its columns are filled in', async () => {
    const editorState = await render(
      twoChains(),
      outlineWith([
        ordersJoin('Orders_Customers', 'CUSTOMER_ID', 'CUSTOMER_ID'),
      ]),
    );
    fireEvent.contextMenu(await TEST__findCanvasNode('relational101'));
    fireEvent.click(
      within(await screen.findByRole('menu')).getByRole('button', {
        name: /^Join Another Input/u,
      }),
    );
    await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
    const input =
      within(panel()).getByLabelText<HTMLSelectElement>('Right input');
    expect(
      within(input)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Pick the node to join', 'Distinct Values · from CUSTOMERS']);
    fireEvent.change(input, { target: { value: 'distinct101' } });
    await waitFor(() =>
      expect(joinOf(editorState).rightColumns).toEqual(['CUSTOMER_ID']),
    );
  });
});

describe("The Join editor's suggested join columns", () => {
  test('Lists the suggestions, strongest first, each taken with one click, and lists the suggested columns first', async () => {
    // two database joins: none is clearly it, so nothing is filled in
    const editorState = await render(
      new Query(
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
      outlineWith([
        ordersJoin('Orders_Customers', 'CUSTOMER_ID', 'CUSTOMER_ID'),
        ordersJoin('Ship_City', 'SHIP_CITY', 'CITY'),
      ]),
    );
    fireEvent.click(await TEST__findCanvasNode('join101'));
    await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
    const list = await within(panel()).findByRole('list', {
      name: 'Suggested join columns',
    });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      "CUSTOMER_ID = CUSTOMER_IDthe database's join Orders_CustomersUse",
      "SHIP_CITY = CITYthe database's join Ship_CityUse",
    ]);
    fireEvent.click(
      within(list).getAllByRole('button', { name: 'Use' })[1] as HTMLElement,
    );
    expect(
      within(panel()).getByLabelText<HTMLSelectElement>('Left join column 1')
        .value,
    ).toBe('SHIP_CITY');
    // taken: it leaves the list
    expect(
      within(
        within(panel()).getByRole('list', { name: 'Suggested join columns' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(1);
    // the suggested columns come first in the pickers
    const groups = within(panel())
      .getByLabelText('Left join column 1')
      .querySelectorAll('optgroup');
    expect(Array.from(groups).map((group) => group.label)).toEqual([
      'Suggested',
      'Other columns',
    ]);
    expect(
      Array.from(groups[0]?.querySelectorAll('option') ?? []).map(
        (option) => option.value,
      ),
    ).toEqual(['SHIP_CITY']);
    // Apply keeps them
    fireEvent.click(within(panel()).getByRole('button', { name: 'Apply' }));
    await waitFor(() =>
      expect(joinOf(editorState).leftColumns).toEqual(['SHIP_CITY']),
    );
  });
});
