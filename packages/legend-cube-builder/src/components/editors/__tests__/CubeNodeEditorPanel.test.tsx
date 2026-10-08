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
  Filter,
  Join,
  Query,
  RelationalTableSource,
  Schema,
  type SchemaColumn,
} from '@finos/legend-cube';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  CUBE_NODE_HELP_TEXT,
  SELECT_NODE_TOOLTIP,
} from '../../../__lib__/LegendCubeHelpText.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_DATABASE,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  TEST__importDocument,
  TEST__renderInCubeApplication,
} from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import type { FakeCubeEngine } from '../../../__test-utils__/FakeCubeEngine.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';
import { CubeNodeEditorPanel } from '../CubeNodeEditorPanel.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

const render = async (
  document?: CubeDocument,
  prepare?: (fake: FakeCubeEngine) => void,
): Promise<CubeEditorState> => {
  const { host, fake } = TEST__createCubeHost();
  prepare?.(fake);
  const editorState = new CubeEditorState(host, document);
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

const openPanel = async (nodeId: string): Promise<HTMLElement> => {
  fireEvent.click(await TEST__findCanvasNode(nodeId));
  return screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
};

/** The Source panel's columns, as `name type` */
const columnRows = (): string[] =>
  within(within(panel()).getByRole('table', { name: 'Columns' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent)
        .join(' '),
    );

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
const editJoinKeys = (left = 'CUSTOMER_ID', right = 'CUSTOMER_ID'): void => {
  fireEvent.click(within(panel()).getByText('Add join columns'));
  const rows = within(
    within(panel()).getByRole('list', { name: 'Join columns' }),
  ).getAllByRole('listitem');
  fireEvent.change(
    within(panel()).getByLabelText(`Left join column ${rows.length}`),
    { target: { value: left } },
  );
  fireEvent.change(
    within(panel()).getByLabelText(`Right join column ${rows.length}`),
    { target: { value: right } },
  );
};

const storedJoin = (editorState: CubeEditorState): Join =>
  editorState.document.query.getNode('join101') as Join;

const ordersOnly = (columns: SchemaColumn[] = ORDERS_COLUMNS): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [northwindTable('relational101', 'ORDERS', columns)],
      [],
      'relational101',
    ),
  });

beforeEach(() => {
  localStorage.clear();
});

describe('Node editor panel', () => {
  test("Opens on a click with the node's label, id, help and Select, without changing which node runs", async () => {
    const editorState = await render(
      new CubeDocument({ context: CONTEXT, query: sliceQuery() }),
    );
    const editor = await openPanel('relational101');
    expect(within(editor).getByText('Relational Database Table')).toBeDefined();
    expect(within(editor).getByText('relational101')).toBeDefined();
    expect(within(editor).getByRole('img', { name: 'Help' }).title).toBe(
      CUBE_NODE_HELP_TEXT.relational,
    );
    expect(editorState.document.query.selected).toBe('filter101');
    const select = within(editor).getByRole('button', { name: 'Select' });
    expect(select.title).toBe(SELECT_NODE_TOOLTIP);
    fireEvent.click(select);
    expect(editorState.document.query.selected).toBe('relational101');
    const selected = within(panel()).getByText('(Selected)');
    expect(selected.title).toBe(SELECT_NODE_TOOLTIP);
    expect(
      within(panel()).queryByRole('button', { name: 'Select' }),
    ).toBeNull();
  });

  test('Shows the upstream error instead of the editor while an input is invalid', async () => {
    await render(
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [
            northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
            northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
            new Join('join101'),
            new Filter('filter101'),
          ],
          [
            new Connection('relational101', 'join101', 'leftTds'),
            new Connection('relational102', 'join101', 'rightTds'),
            new Connection('join101', 'filter101', 'tds'),
          ],
          'filter101',
        ),
      }),
    );
    const editor = await openPanel('filter101');
    expect(within(editor).getByRole('alert').textContent).toBe(
      'This node depends on some invalid inputs. Please correct these first.',
    );
    expect(within(editor).queryByRole('combobox')).toBeNull();
  });

  test('Shows that an input is missing instead of the editor', async () => {
    await render(
      new CubeDocument({
        query: new Query(
          [
            northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
            new Join('join101'),
          ],
          [new Connection('relational101', 'join101', 'leftTds')],
          'join101',
        ),
      }),
    );
    const editor = await openPanel('join101');
    expect(within(editor).getByRole('alert').textContent).toBe(
      'This node requires more inputs. Please drag and drop another input to associate.',
    );
  });

  test('Shows a table source: where it reads from, quotes stripped, and its columns with their types', async () => {
    await render(
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [
            new RelationalTableSource(
              'relational101',
              {
                database: NORTHWIND_DATABASE,
                schema: '"QUOTED.SCHEMA"',
                table: 'ORDERS',
              },
              { kind: 'resolved', schema: new Schema(ORDERS_COLUMNS) },
            ),
          ],
          [],
          'relational101',
        ),
      }),
    );
    const editor = await openPanel('relational101');
    expect(within(editor).getByText(NORTHWIND_DATABASE)).toBeDefined();
    expect(within(editor).getByText('QUOTED.SCHEMA')).toBeDefined();
    expect(within(editor).getByText('ORDERS')).toBeDefined();
    const rows = columnRows();
    expect(rows).toHaveLength(ORDERS_COLUMNS.length);
    expect(rows.slice(0, 2)).toEqual([
      'ORDER_ID SmallInt',
      'CUSTOMER_ID Varchar(5)?',
    ]);
    // a source has nothing to apply
    expect(within(editor).queryByText('Apply')).toBeNull();
  });

  test('Refreshes a table that changed: a warning lists the change, the panel shows the new columns, and nothing is added to undo', async () => {
    let answer: (schemas: Map<string, Schema>) => void = () => undefined;
    const added = [...ORDERS_COLUMNS, ...CUSTOMERS_COLUMNS.slice(1, 2)];
    const editorState = await render(ordersOnly(), (fake) =>
      fake.resolveSchemas.mockReturnValueOnce(
        new Promise((resolve) => {
          answer = resolve;
        }),
      ),
    );
    const editor = await openPanel('relational101');
    fireEvent.click(within(editor).getByText('Refresh'));
    expect(await within(panel()).findByText('refreshing source')).toBeDefined();
    expect(
      within(panel()).getByText<HTMLButtonElement>('Refresh').disabled,
    ).toBe(true);
    await act(async () => {
      answer(new Map([['relational101', new Schema(added)]]));
    });
    await waitFor(() =>
      expect(within(panel()).queryByText('refreshing source')).toBeNull(),
    );
    expect(within(panel()).getByRole('status').textContent).toBe(
      'This table changed since the cube was saved: added COMPANY_NAME',
    );
    expect(columnRows().at(-1)).toBe('COMPANY_NAME Varchar(40)');
    expect(editorState.history).toHaveLength(0);
    // the panel follows the typed source
    expect(editorState.nodeEditor.node).toBe(
      editorState.document.query.getNode('relational101'),
    );
    expect(editorState.nodeEditor.notice).toBeUndefined();
  });

  test('Leaves a table that did not change as it is on Refresh', async () => {
    const editorState = await render(ordersOnly());
    const { query } = editorState.document;
    const editor = await openPanel('relational101');
    fireEvent.click(within(editor).getByText('Refresh'));
    await waitFor(() =>
      expect(within(panel()).queryByText('refreshing source')).toBeNull(),
    );
    expect(editorState.document.query).toBe(query);
    expect(editorState.history).toHaveLength(0);
    expect(within(panel()).queryByRole('status')).toBeNull();
  });

  test("Keeps a table's columns when Refresh fails, with a warning", async () => {
    const editorState = await render(ordersOnly(), (fake) =>
      fake.resolveSchemas.mockRejectedValueOnce(
        new CubeEngineError(CubeEngineErrorKind.NETWORK, 'Engine unreachable'),
      ),
    );
    const editor = await openPanel('relational101');
    fireEvent.click(within(editor).getByText('Refresh'));
    expect((await within(panel()).findByRole('status')).textContent).toBe(
      'Could not re-check this table, so it keeps its saved columns: Engine unreachable',
    );
    expect(columnRows()).toHaveLength(ORDERS_COLUMNS.length);
    expect(editorState.history).toHaveLength(0);
  });

  test('Closes from its header', async () => {
    const editorState = await render(ordersOnly());
    const editor = await openPanel('relational101');
    fireEvent.click(
      within(editor).getByRole('button', { name: 'Close the editor' }),
    );
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
  });

  test('Closes, saying nothing, when its node is removed and it had no edits', async () => {
    const editorState = await render(
      new CubeDocument({ context: CONTEXT, query: sliceQuery() }),
    );
    await openPanel('relational102');
    act(() => editorState.removeNode('relational102'));
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    expect(editorState.nodeEditor.notice).toBeUndefined();
    // and opens again on what Undo brings back
    act(() => editorState.undo());
    await openPanel('relational102');
  });

  test('Closes on Import, saying nothing when it had no edits', async () => {
    const editorState = await render(ordersOnly());
    await openPanel('relational101');
    await TEST__importDocument(editorState, ordersOnly());
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    expect(editorState.nodeEditor.notice).toBeUndefined();
  });

  test('Applies its edits when another node is clicked, then shows that one', async () => {
    const editorState = await render(keylessJoin());
    await openPanel('join101');
    editJoinKeys();
    fireEvent.click(await TEST__findCanvasNode('relational101'));
    expect(storedJoin(editorState).leftColumns).toEqual(['CUSTOMER_ID']);
    expect(editorState.history).toHaveLength(1);
    expect(editorState.nodeEditor.nodeId).toBe('relational101');
    expect(
      within(panel()).getByText('Relational Database Table'),
    ).toBeDefined();
  });

  test('Applies its edits when closed from its header', async () => {
    const editorState = await render(keylessJoin());
    await openPanel('join101');
    editJoinKeys();
    expect(
      within(panel()).getByRole('button', { name: 'Close the editor' }).title,
    ).toBe('Close, applying the changes');
    fireEvent.click(
      within(panel()).getByRole('button', { name: 'Close the editor' }),
    );
    expect(storedJoin(editorState).leftColumns).toEqual(['CUSTOMER_ID']);
    expect(editorState.history).toHaveLength(1);
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
  });

  test('Closes without applying its edits, and says so, when Undo changes its node', async () => {
    const editorState = await render(keylessJoin());
    await openPanel('join101');
    editJoinKeys();
    fireEvent.click(within(panel()).getByText('Apply'));
    editJoinKeys('SHIP_CITY', 'CITY');
    act(() => editorState.undo());
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    expect(editorState.nodeEditor.notice).toBe(
      'join101 changed, so the editor of join101 closed without applying its changes.',
    );
    expect(storedJoin(editorState).leftColumns).toEqual([]);
    expect(editorState.history).toHaveLength(0);
    // opening it again clears the notice
    await openPanel('join101');
    expect(editorState.nodeEditor.notice).toBeUndefined();
  });

  test('Shows the node Undo brings back when it had no edits', async () => {
    const editorState = await render(keylessJoin());
    await openPanel('join101');
    editJoinKeys();
    fireEvent.click(within(panel()).getByText('Apply'));
    act(() => editorState.undo());
    expect(editorState.nodeEditor.notice).toBeUndefined();
    expect(editorState.nodeEditor.draft?.original).toBe(
      storedJoin(editorState),
    );
    expect(
      within(
        within(panel()).getByRole('list', { name: 'Join columns' }),
      ).queryAllByRole('listitem'),
    ).toHaveLength(0);
  });

  test('Says so when its node is removed with edits pending, the removal being the one undo step', async () => {
    const editorState = await render(keylessJoin());
    await openPanel('join101');
    editJoinKeys();
    fireEvent.contextMenu(await TEST__findCanvasNode('join101'));
    const menu = await screen.findByRole('menu');
    fireEvent.click(within(menu).getByRole('button', { name: 'Remove' }));
    expect(editorState.document.query.getNode('join101')).toBeUndefined();
    expect(editorState.history).toHaveLength(1);
    expect(editorState.nodeEditor.notice).toBe(
      'join101 was removed, so the editor of join101 closed without applying its changes.',
    );
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
  });

  test('Closes without applying on Import, saying so when it had edits', async () => {
    const editorState = await render(keylessJoin());
    await openPanel('join101');
    editJoinKeys();
    await TEST__importDocument(editorState, keylessJoin());
    expect(editorState.nodeEditor.notice).toBe(
      'Another cube was opened, so the editor of join101 closed without applying its changes.',
    );
    expect(storedJoin(editorState).leftColumns).toEqual([]);
    expect(editorState.history).toHaveLength(1);
  });

  test("Lists the edited node's problems as they are, before Apply", async () => {
    await render(keylessJoin());
    await openPanel('join101');
    const problems = (): string | null | undefined =>
      within(panel()).queryByRole('alert', { name: 'Problems' })?.textContent;
    expect(problems()).toBe('Left join columns cannot be empty.');
    editJoinKeys('ORDER_ID', 'COMPANY_NAME');
    expect(problems()).toBe(
      'Join columns "ORDER_ID" and "COMPANY_NAME" must be of compatible types.',
    );
  });
});
