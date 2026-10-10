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
  Concat,
  Connection,
  CubeDocument,
  Join,
  JoinType,
  PrimitiveType,
  Query,
  SchemaColumn,
} from '@finos/legend-cube';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { DATE_OR_TIMESTAMP_WARNING } from '../../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_DATABASE,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  TEST__importDocument,
  TEST__renderInCubeApplication,
} from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import {
  FAKE_NORTHWIND_OUTLINE,
  type FakeCubeEngine,
} from '../../../__test-utils__/FakeCubeEngine.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

const render = async (
  query: Query,
  prepare?: (fake: FakeCubeEngine) => void,
): Promise<CubeEditorState> => {
  const { host, fake } = TEST__createCubeHost();
  prepare?.(fake);
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

/** ORDERS on the Left, CUSTOMERS on the Right, joined on the given keys */
const ordersJoinCustomers = (
  leftColumns: string[] = [],
  rightColumns: string[] = [],
): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
      northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
      new Join('join101', { leftColumns, rightColumns }),
    ],
    [
      new Connection('relational101', 'join101', 'leftTds'),
      new Connection('relational102', 'join101', 'rightTds'),
    ],
    'join101',
  );

const panel = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);

const openJoin = async (): Promise<HTMLElement> => {
  fireEvent.click(await TEST__findCanvasNode('join101'));
  return screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
};

const pick = (label: string, value: string): void => {
  fireEvent.change(within(panel()).getByLabelText(label), {
    target: { value },
  });
};

const button = (name: string): HTMLButtonElement =>
  within(panel()).getByRole<HTMLButtonElement>('button', { name });

const problems = (): string[] =>
  Array.from(
    within(panel()).queryByRole('alert', { name: 'Problems' })?.children ?? [],
  ).map((problem) => problem.textContent ?? '');

/** Adds a pair of join columns and picks them */
const addKeys = (left: string, right: string): void => {
  fireEvent.click(button('Add join columns'));
  const rows = within(
    within(panel()).getByRole('list', { name: 'Join columns' }),
  ).getAllByRole('listitem');
  const position = rows.length;
  pick(`Left join column ${position}`, left);
  pick(`Right join column ${position}`, right);
};

const column = (name: string, path: string, params: number[] = []) =>
  new SchemaColumn(name, PrimitiveType.get(path, params), true);

beforeEach(() => {
  localStorage.clear();
});

describe('Join editor', () => {
  test('Says the join needs key columns, then turns it valid on Apply, as one undo step', async () => {
    const editorState = await render(ordersJoinCustomers());
    await openJoin();
    expect(problems()).toEqual(['Left join columns cannot be empty.']);
    expect(editorState.analysis.validity.get('join101')).toEqual([
      'Left join columns cannot be empty.',
    ]);
    expect(button('Apply').disabled).toBe(true);
    // several edits, one step
    fireEvent.change(within(panel()).getByLabelText('Join type'), {
      target: { value: JoinType.INNER },
    });
    addKeys('SHIP_CITY', 'CITY');
    fireEvent.click(button('Remove join columns 1'));
    addKeys('CUSTOMER_ID', 'CUSTOMER_ID');
    expect(problems()).toEqual([]);
    fireEvent.click(button('Apply'));
    const stored = editorState.document.query.getNode('join101') as Join;
    expect(stored.joinType).toBe(JoinType.INNER);
    expect(stored.leftColumns).toEqual(['CUSTOMER_ID']);
    expect(editorState.analysis.validity.get('join101')).toEqual([]);
    expect(editorState.history).toHaveLength(1);
    // the panel goes on, on the stored join, with nothing left to apply
    expect(editorState.nodeEditor.draft?.original).toBe(stored);
    expect(button('Apply').disabled).toBe(true);
    await waitFor(async () =>
      expect(
        (await TEST__findCanvasNode('join101')).classList.contains(
          'legend-cube__node--invalid',
        ),
      ).toBe(false),
    );
  });

  test('Offers the join types in order, a new join being a left outer one', async () => {
    await render(ordersJoinCustomers());
    await openJoin();
    const select =
      within(panel()).getByLabelText<HTMLSelectElement>('Join type');
    expect(Array.from(select.options).map((option) => option.text)).toEqual([
      'Inner',
      'Left Outer',
      'Right Outer',
      'Full Outer',
    ]);
    expect(select.value).toBe(JoinType.LEFT_OUTER);
  });

  test('Adds nothing to undo for Cancel, or for edits that change nothing', async () => {
    const editorState = await render(
      ordersJoinCustomers(['CUSTOMER_ID'], ['CUSTOMER_ID']),
    );
    await openJoin();
    // added but never picked: nothing to store
    fireEvent.click(button('Add join columns'));
    expect(button('Apply').disabled).toBe(true);
    pick('Left join column 1', 'SHIP_CITY');
    expect(button('Apply').disabled).toBe(false);
    pick('Left join column 1', 'CUSTOMER_ID');
    expect(button('Apply').disabled).toBe(true);
    pick('Left join column 1', 'SHIP_CITY');
    fireEvent.click(button('Cancel'));
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    expect(editorState.history).toHaveLength(0);
    expect(
      (editorState.document.query.getNode('join101') as Join).leftColumns,
    ).toEqual(['CUSTOMER_ID']);
  });

  test('Offers only the columns of each input, with their types, and marks a pair that cannot be compared', async () => {
    await render(ordersJoinCustomers(['ORDER_ID'], ['COMPANY_NAME']));
    await openJoin();
    const left =
      within(panel()).getByLabelText<HTMLSelectElement>('Left join column 1');
    expect(Array.from(left.options).map((option) => option.text)).toEqual(
      ORDERS_COLUMNS.map(
        (c) => `${c.name}: ${c.type.displayName}${c.nullable ? '?' : ''}`,
      ),
    );
    expect(
      within(panel()).getByLabelText<HTMLSelectElement>('Right join column 1')
        .options,
    ).toHaveLength(CUSTOMERS_COLUMNS.length);
    expect(left.getAttribute('aria-invalid')).toBe('true');
    expect(
      within(panel()).getByText("SmallInt and Varchar(40) can't be compared"),
    ).toBeDefined();
    expect(problems()).toEqual([
      'Join columns "ORDER_ID" and "COMPANY_NAME" must be of compatible types.',
    ]);
  });

  test('Lists the columns in both inputs that are not joined on', async () => {
    const orderDetails = [
      column('ORDER_ID', 'meta::pure::precisePrimitives::SmallInt'),
      column('PRODUCT_ID', 'meta::pure::precisePrimitives::SmallInt'),
      column('UNIT_PRICE', 'meta::pure::precisePrimitives::Double'),
      column('QUANTITY', 'meta::pure::precisePrimitives::SmallInt'),
    ];
    const products = [
      column('PRODUCT_ID', 'meta::pure::precisePrimitives::SmallInt'),
      column('PRODUCT_NAME', 'meta::pure::precisePrimitives::Varchar', [40]),
      column('UNIT_PRICE', 'meta::pure::precisePrimitives::Double'),
    ];
    await render(
      new Query(
        [
          northwindTable('relational101', 'ORDER_DETAILS', orderDetails),
          northwindTable('relational102', 'PRODUCTS', products),
          new Join('join101', {
            leftColumns: ['PRODUCT_ID'],
            rightColumns: ['PRODUCT_ID'],
          }),
        ],
        [
          new Connection('relational101', 'join101', 'leftTds'),
          new Connection('relational102', 'join101', 'rightTds'),
        ],
        'join101',
      ),
    );
    await openJoin();
    expect(
      within(
        within(panel()).getByRole('list', { name: 'Columns in both inputs' }),
      )
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['UNIT_PRICE → UNIT_PRICE_1 (Left), UNIT_PRICE_2 (Right)']);
    // joining on it too clears it
    addKeys('UNIT_PRICE', 'UNIT_PRICE');
    expect(
      within(panel()).queryByRole('list', { name: 'Columns in both inputs' }),
    ).toBeNull();
  });

  test('Stops offering more key pairs once an input has no column left', async () => {
    const editorState = await render(
      new Query(
        [
          northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
          northwindTable('relational102', 'CUSTOMERS', [
            column('CUSTOMER_ID', 'meta::pure::precisePrimitives::Varchar', [
              5,
            ]),
          ]),
          new Join('join101'),
        ],
        [
          new Connection('relational101', 'join101', 'leftTds'),
          new Connection('relational102', 'join101', 'rightTds'),
        ],
        'join101',
      ),
    );
    await openJoin();
    addKeys('CUSTOMER_ID', 'CUSTOMER_ID');
    expect(button('Add join columns').disabled).toBe(true);
    fireEvent.click(button('Remove join columns 1'));
    expect(button('Add join columns').disabled).toBe(false);
    expect(editorState.history).toHaveLength(0);
  });

  test('Swaps the inputs, the key columns following them, applying the edits in the same undo step', async () => {
    const editorState = await render(
      ordersJoinCustomers(['SHIP_CITY'], ['CITY']),
    );
    await openJoin();
    fireEvent.change(within(panel()).getByLabelText('Join type'), {
      target: { value: JoinType.INNER },
    });
    fireEvent.click(button('Swap Inputs'));
    const { query } = editorState.document;
    expect(query.getInputIds('join101')).toEqual([
      'relational102',
      'relational101',
    ]);
    const swapped = query.getNode('join101') as Join;
    expect(swapped.leftColumns).toEqual(['CITY']);
    expect(swapped.rightColumns).toEqual(['SHIP_CITY']);
    expect(swapped.joinType).toBe(JoinType.INNER);
    expect(editorState.history).toHaveLength(1);
    // the editor shows the swapped join, with nothing left to apply
    expect(
      within(panel()).getByLabelText<HTMLSelectElement>('Left join column 1')
        .value,
    ).toBe('CITY');
    expect(button('Apply').disabled).toBe(true);
    expect(editorState.nodeEditor.notice).toBeUndefined();
  });

  test("Warns about a key on a column whose type Cube can't read, without blocking it", async () => {
    const editorState = await render(
      ordersJoinCustomers(
        ['CUSTOMER_ID', 'SHIP_REGION'],
        ['CUSTOMER_ID', 'REGION'],
      ),
      (fake) =>
        fake.loadModel.mockResolvedValue({
          ...FAKE_NORTHWIND_OUTLINE,
          databases: [
            {
              path: NORTHWIND_DATABASE,
              schemas: [
                {
                  name: 'NORTHWIND',
                  tables: [
                    {
                      name: 'ORDERS',
                      isView: false,
                      columnCount: ORDERS_COLUMNS.length,
                      flags: [],
                      untypedColumns: ['SHIP_REGION'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
    );
    await openJoin();
    expect(await within(panel()).findByText(/^type unknown: /u)).toBeDefined();
    expect(problems()).toEqual([]);
    expect(editorState.analysis.validity.get('join101')).toEqual([]);
    // a key on a typed column has no warning
    pick('Left join column 2', 'SHIP_CITY');
    expect(within(panel()).queryByText(/^type unknown: /u)).toBeNull();
    expect(button('Apply').disabled).toBe(false);
  });

  test('Shows a read-only cube without letting it change', async () => {
    const editorState = await render(new Query());
    await TEST__importDocument(
      editorState,
      new CubeDocument({
        context: CONTEXT,
        query: ordersJoinCustomers(['CUSTOMER_ID'], ['CUSTOMER_ID']),
      }),
      true,
    );
    await openJoin();
    expect(
      within(panel()).getByLabelText<HTMLSelectElement>('Left join column 1')
        .disabled,
    ).toBe(true);
    expect(
      within(panel()).getByLabelText<HTMLSelectElement>('Join type').disabled,
    ).toBe(true);
    expect(button('Add join columns').disabled).toBe(true);
    expect(button('Swap Inputs').disabled).toBe(true);
    expect(button('Apply').disabled).toBe(true);
    // edited behind the controls' back, closing still stores nothing
    act(
      () =>
        editorState.nodeEditor.draft &&
        (
          editorState.nodeEditor.draft as unknown as {
            setJoinType: (t: JoinType) => void;
          }
        ).setJoinType(JoinType.INNER),
    );
    fireEvent.click(
      within(panel()).getByRole('button', { name: 'Close the editor' }),
    );
    expect(
      (editorState.document.query.getNode('join101') as Join).joinType,
    ).toBe(JoinType.LEFT_OUTER);
    expect(editorState.history).toHaveLength(1);
  });

  test('Warns about a key on an untyped column of the Right input too', async () => {
    await render(
      ordersJoinCustomers(
        ['CUSTOMER_ID', 'SHIP_REGION'],
        ['CUSTOMER_ID', 'REGION'],
      ),
      (fake) =>
        fake.loadModel.mockResolvedValue({
          ...FAKE_NORTHWIND_OUTLINE,
          databases: [
            {
              path: NORTHWIND_DATABASE,
              schemas: [
                {
                  name: 'NORTHWIND',
                  tables: [
                    {
                      name: 'CUSTOMERS',
                      isView: false,
                      columnCount: CUSTOMERS_COLUMNS.length,
                      flags: [],
                      untypedColumns: ['REGION'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
    );
    await openJoin();
    expect(await within(panel()).findByText(/^type unknown: /u)).toBeDefined();
    expect(problems()).toEqual([]);
    pick('Right join column 2', 'CITY');
    expect(within(panel()).queryByText(/^type unknown: /u)).toBeNull();
  });

  test('Warns that a key Convert types made a Date matches timestamps only at midnight', async () => {
    const P = 'meta::pure::precisePrimitives::';
    const dates = (id: string, path: string) =>
      northwindTable(id, 'ORDERS', [
        new SchemaColumn('WHEN', PrimitiveType.get(path), true),
      ]);
    // StrictDate and Timestamp converted to Date, joined to a StrictDate
    const editorState = await render(
      new Query(
        [
          dates('relational101', 'StrictDate'),
          dates('relational102', `${P}Timestamp`),
          new Concat('concat101', true),
          dates('relational103', 'StrictDate'),
          new Join('join101', {
            leftColumns: ['WHEN'],
            rightColumns: ['WHEN'],
          }),
        ],
        [
          new Connection('relational101', 'concat101', 'tds1'),
          new Connection('relational102', 'concat101', 'tds2'),
          new Connection('concat101', 'join101', 'leftTds'),
          new Connection('relational103', 'join101', 'rightTds'),
        ],
        'join101',
      ),
    );
    await openJoin();
    expect(within(panel()).getByText(DATE_OR_TIMESTAMP_WARNING)).toBeDefined();
    expect(problems()).toEqual([]);
    // the Date on the Right input
    act(() => editorState.nodeEditor.swapInputs());
    expect(editorState.document.query.getInputIds('join101')).toEqual([
      'relational103',
      'concat101',
    ]);
    expect(within(panel()).getByText(DATE_OR_TIMESTAMP_WARNING)).toBeDefined();
  });

  test('Gives no date warning on keys of precise date types', async () => {
    await render(ordersJoinCustomers(['ORDER_DATE'], ['CUSTOMER_ID']));
    await openJoin();
    pick('Right join column 1', 'CUSTOMER_ID');
    expect(within(panel()).queryByText(DATE_OR_TIMESTAMP_WARNING)).toBeNull();
  });

  test("Shows the picked column's type with its family's icon and its full type in the tooltip", async () => {
    await render(ordersJoinCustomers(['CUSTOMER_ID'], ['CUSTOMER_ID']));
    await openJoin();
    const typeLabel = (label: string): HTMLElement =>
      within(panel())
        .getByLabelText(label)
        .parentElement?.querySelector('span') as HTMLElement;
    const text = typeLabel('Left join column 1');
    expect(text.textContent).toBe('Varchar(5)?');
    expect(text.title).toBe('meta::pure::precisePrimitives::Varchar(5)');
    const textIcon = text.querySelector('svg')?.innerHTML;
    pick('Left join column 1', 'EMPLOYEE_ID');
    const number = typeLabel('Left join column 1');
    expect(number.title).toBe('meta::pure::precisePrimitives::SmallInt');
    expect(number.querySelector('svg')?.innerHTML).not.toBe(textIcon);
  });
});

describe('Join editor, renaming the columns both inputs have', () => {
  // ORDERS and CUSTOMERS both have CUSTOMER_ID
  const sharedColumns = (): HTMLElement =>
    within(panel()).getByRole('list', { name: 'Columns in both inputs' });

  test('Puts a Rename before each input, as one undo step, and the join turns valid', async () => {
    const editorState = await render(
      ordersJoinCustomers(['SHIP_COUNTRY'], ['COUNTRY']),
    );
    const before = editorState.document.query;
    await openJoin();
    expect(problems()).toEqual([
      'Duplicate column names between inputs are not supported if they are not part of the join columns: "CUSTOMER_ID"',
    ]);
    expect(within(sharedColumns()).getByRole('listitem').textContent).toBe(
      'CUSTOMER_ID → CUSTOMER_ID_1 (Left), CUSTOMER_ID_2 (Right)',
    );
    fireEvent.click(button('Rename them'));
    const { query } = editorState.document;
    expect(query.getInputIds('join101')).toEqual(['rename101', 'rename102']);
    expect(query.getInputIds('rename101')).toEqual(['relational101']);
    expect(query.getInputIds('rename102')).toEqual(['relational102']);
    expect(editorState.analysis.validity.get('join101')).toEqual([]);
    expect(editorState.history).toHaveLength(1);
    // the panel goes on, on the join, with nothing to apply and nothing shared
    expect(editorState.nodeEditor.nodeId).toBe('join101');
    expect(editorState.nodeEditor.hasChanges).toBe(false);
    expect(
      within(panel()).queryByRole('list', { name: 'Columns in both inputs' }),
    ).toBeNull();
    expect(problems()).toEqual([]);
    act(() => editorState.undo());
    expect(editorState.document.query === before).toBe(false);
    expect(editorState.document.query.nodes.map((node) => node.id)).toEqual(
      before.nodes.map((node) => node.id),
    );
  });

  test('Applies the edits not yet applied in the same step', async () => {
    const editorState = await render(ordersJoinCustomers());
    await openJoin();
    addKeys('SHIP_COUNTRY', 'COUNTRY');
    expect(editorState.nodeEditor.hasChanges).toBe(true);
    expect(button('Rename them').disabled).toBe(false);
    fireEvent.click(button('Rename them'));
    const join = editorState.document.query.getNode('join101') as Join;
    expect(join.leftColumns).toEqual(['SHIP_COUNTRY']);
    expect(join.rightColumns).toEqual(['COUNTRY']);
    expect(editorState.history).toHaveLength(1);
    expect(editorState.analysis.validity.get('join101')).toEqual([]);
    // the panel follows the new join, with nothing left to apply
    expect(editorState.nodeEditor.nodeId).toBe('join101');
    expect(editorState.nodeEditor.draft?.original === join).toBe(true);
    expect(editorState.nodeEditor.hasChanges).toBe(false);
    expect(editorState.nodeEditor.notice).toBeUndefined();
    expect(screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeDefined();
  });

  test('Rewrites a key it renames, and the panel follows the rewritten join', async () => {
    const editorState = await render(
      ordersJoinCustomers(['CUSTOMER_ID'], ['COUNTRY']),
    );
    await openJoin();
    fireEvent.click(button('Rename them'));
    const join = editorState.document.query.getNode('join101') as Join;
    expect(join.leftColumns).toEqual(['CUSTOMER_ID_1']);
    expect(join.rightColumns).toEqual(['COUNTRY']);
    expect(editorState.nodeEditor.draft?.original).toBe(join);
    expect(editorState.nodeEditor.notice).toBeUndefined();
    expect(editorState.analysis.validity.get('join101')).toEqual([]);
  });

  test('Keeps the node Execute runs selected', async () => {
    const editorState = await render(
      ordersJoinCustomers(['SHIP_COUNTRY'], ['COUNTRY']),
    );
    act(() => editorState.select('relational101'));
    await openJoin();
    fireEvent.click(button('Rename them'));
    expect(editorState.document.query.selected).toBe('relational101');
  });

  test('Is disabled while the join has another problem', async () => {
    await render(ordersJoinCustomers(['SHIP_COUNTRY'], ['NOPE']));
    await openJoin();
    expect(button('Rename them').disabled).toBe(true);
  });

  test('Is disabled in a read-only cube', async () => {
    const editorState = await render(new Query());
    await TEST__importDocument(
      editorState,
      new CubeDocument({
        context: CONTEXT,
        query: ordersJoinCustomers(['SHIP_COUNTRY'], ['COUNTRY']),
      }),
      true,
    );
    await openJoin();
    expect(button('Rename them').disabled).toBe(true);
  });

  test('Still warns about an untyped key once it is renamed', async () => {
    const editorState = await render(
      ordersJoinCustomers(['CUSTOMER_ID'], ['COUNTRY']),
      (fake) =>
        fake.loadModel.mockResolvedValue({
          ...FAKE_NORTHWIND_OUTLINE,
          databases: [
            {
              path: NORTHWIND_DATABASE,
              schemas: [
                {
                  name: 'NORTHWIND',
                  tables: [
                    {
                      name: 'ORDERS',
                      isView: false,
                      columnCount: ORDERS_COLUMNS.length,
                      flags: [],
                      untypedColumns: ['CUSTOMER_ID'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
    );
    await openJoin();
    expect(await within(panel()).findByText(/^type unknown: /u)).toBeDefined();
    fireEvent.click(button('Rename them'));
    expect(
      (editorState.document.query.getNode('join101') as Join).leftColumns,
    ).toEqual(['CUSTOMER_ID_1']);
    expect(await within(panel()).findByText(/^type unknown: /u)).toBeDefined();
  });
});
