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
  FILTER_DEFINITION,
  Filter,
  Join,
  Limit,
  Query,
} from '@finos/legend-cube';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { OTHER_SOURCE_KIND_TITLE } from '../../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import {
  TEST__findCanvasNode,
  TEST__getCanvasNodes,
} from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import type { CubeHost } from '../../../stores/CubeHost.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import type { CubeRowCountDraft } from '../../../stores/editors/CubeRowCountDraft.js';
import { CubeSourcePickerTabKey } from '../../../stores/source-picker/CubeSourcePickerTab.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';
import { CubePalette, PALETTE_EMPTY_HINT } from '../CubePalette.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const TABLE = 'Relational Database Table';
const SORT = 'Sort by Column';
const GROUP = 'Group by Column';
const FILTER = 'Filter by Column';
const RESTRICT = 'Restrict Columns';
const RENAME = 'Rename Columns';
const DISTINCT = 'Distinct Values';
const DROP = 'Drop first <x> rows';
const LIMIT = 'Take first <x> rows';
const SLICE = 'Take rows <x> to <y>';
const CONCAT = 'Concatenate Another Input';
const JOIN = 'Join Another Input';
const PARTITION = 'Apply Window Functions';

const render = async (
  document?: CubeDocument,
  options?: {
    host?: CubeHost;
    prepare?: (editorState: CubeEditorState) => void;
  },
): Promise<CubeEditorState> => {
  const host = options?.host ?? TEST__createCubeHost().host;
  const editorState = new CubeEditorState(host, document);
  options?.prepare?.(editorState);
  await TEST__renderInCubeApplication(
    <div style={{ display: 'flex', width: 1000, height: 400 }}>
      <CubePalette editorState={editorState} />
      <div style={{ width: 800, height: 400 }}>
        <CubeCanvas editorState={editorState} />
      </div>
    </div>,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.PALETTE,
  );
  return editorState;
};

const paletteItem = (label: string): HTMLElement =>
  within(screen.getByTestId(LEGEND_CUBE_TEST_ID.PALETTE)).getByRole('button', {
    name: label,
  });

const isLit = (node: HTMLElement): boolean =>
  node.classList.contains('legend-cube__node--drop-target');

/** Starts dragging an item, as the browser does when the mouse leaves it with the button down */
const startDrag = (source: HTMLElement): void => {
  fireEvent.dragStart(source);
};

const dragOver = (target: Element): void => {
  fireEvent.dragEnter(target);
  fireEvent.dragOver(target);
};

/** Drops what is dragged on the target, and ends the drag */
const drop = (source: HTMLElement, target: Element): void => {
  dragOver(target);
  fireEvent.drop(target);
  fireEvent.dragEnd(source);
};

/** Where the canvas takes drops around its nodes */
const canvasPane = (): Element =>
  document.querySelector('.react-flow__pane') ??
  screen.getByTestId(LEGEND_CUBE_TEST_ID.CANVAS);

/** ORDERS and CUSTOMERS, and a Join that nothing feeds yet */
const unwiredJoin = (): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
        new Join('join101'),
      ],
      [],
      'relational101',
    ),
  });

/** The slice query, with the Join, which feeds the Filter, selected */
const joinSelectedQuery = (): Query => {
  const query = sliceQuery();
  return new Query(query.nodes, query.connections, 'join101');
};

/** A new Filter went in between the Join and the Filter it fed, as one undo step, and is the capture */
const expectSplicedAfterJoin = (editorState: CubeEditorState): void => {
  const { query } = editorState.document;
  expect(query.nodes).toHaveLength(5);
  expect(query.getInputIds('filter102')).toEqual(['join101']);
  expect(query.getInputIds('filter101')).toEqual(['filter102']);
  expect(query.getInputIds('join101')).toEqual([
    'relational101',
    'relational102',
  ]);
  expect(query.selected).toBe('filter102');
  expect(editorState.history).toHaveLength(1);
  expect(editorState.nodeEditor.nodeId).toBeUndefined();
};

beforeEach(() => {
  localStorage.clear();
});

describe('Cube palette', () => {
  test('Lists the sources, a divider, then the transforms, read from the registry', async () => {
    await render();
    const list = within(
      screen.getByTestId(LEGEND_CUBE_TEST_ID.PALETTE),
    ).getByRole('group', { name: 'Palette' });
    expect(
      Array.from(list.children).map(
        (child) =>
          child.getAttribute('aria-label') ?? child.getAttribute('role'),
      ),
    ).toEqual([
      TABLE,
      'Data Product (BETA)',
      'separator',
      SORT,
      GROUP,
      FILTER,
      RESTRICT,
      RENAME,
      DISTINCT,
      DROP,
      LIMIT,
      SLICE,
      CONCAT,
      JOIN,
      PARTITION,
    ]);
    expect(within(paletteItem(FILTER)).getByText(FILTER)).toBeDefined();
    expect(paletteItem(FILTER).querySelector('svg')).not.toBeNull();
    // only the data product source is in beta
    expect(within(list).getAllByText('BETA')).toHaveLength(1);
    expect(
      within(paletteItem('Data Product (BETA)')).getByText('BETA'),
    ).toBeDefined();
  });

  test('Marks a node type in beta', async () => {
    await render(undefined, {
      prepare: (editorState) =>
        editorState.registry.register({
          ...FILTER_DEFINITION,
          type: 'betaFilter',
          label: 'Beta Filter',
          beta: true,
        }),
    });
    expect(
      within(paletteItem('Beta Filter (BETA)')).getByText('BETA'),
    ).toBeDefined();
  });

  test("Disables, with the reason, a source of another kind than the cube's, and hides data products from a host without a catalog", async () => {
    const editorState = await render(
      new CubeDocument().withContext({ model: CUBE_NORTHWIND_MODEL }),
    );
    const dataProduct = paletteItem('Data Product (BETA)');
    expect(dataProduct.getAttribute('aria-disabled')).toBe('true');
    expect(dataProduct.title).toBe(OTHER_SOURCE_KIND_TITLE);
    fireEvent.click(dataProduct);
    expect(editorState.sourcePicker.isOpen).toBe(false);
    expect(paletteItem(TABLE).getAttribute('aria-disabled')).toBe('false');
    expect(paletteItem(TABLE).title).toBe(
      'Click, or drop it on the canvas, to pick a table',
    );
  });

  test('Has no Data Product item on a host without a data product catalog', async () => {
    const { host } = TEST__createCubeHost();
    await render(undefined, {
      host: { ...host, dataProductCatalog: undefined },
    });
    expect(
      within(screen.getByTestId(LEGEND_CUBE_TEST_ID.PALETTE)).queryByRole(
        'button',
        { name: 'Data Product (BETA)' },
      ),
    ).toBeNull();
  });

  test('Collapses to icons, with the label in the tooltip, and remembers it for the user', async () => {
    await render();
    fireEvent.click(screen.getByTitle('Collapse the palette'));
    const filter = paletteItem(FILTER);
    expect(within(filter).queryByText(FILTER)).toBeNull();
    expect(filter.querySelector('svg')).not.toBeNull();
    expect(filter.title.startsWith(`${FILTER}: `)).toBe(true);
    expect(screen.queryByText(PALETTE_EMPTY_HINT)).toBeNull();
    // a new page, in a new application, for the same user
    const { host } = TEST__createCubeHost();
    expect(new CubeEditorState(host).isPaletteCollapsed).toBe(true);
    fireEvent.click(screen.getByTitle('Expand the palette'));
    expect(within(paletteItem(FILTER)).getByText(FILTER)).toBeDefined();
    expect(
      new CubeEditorState(TEST__createCubeHost().host).isPaletteCollapsed,
    ).toBe(false);
  });

  test('Hints at dragging while the cube is empty, and only then', async () => {
    const editorState = await render();
    expect(screen.getByText(PALETTE_EMPTY_HINT)).toBeDefined();
    act(() => editorState.addNode('filter'));
    expect(screen.queryByText(PALETTE_EMPTY_HINT)).toBeNull();
  });

  test("Opens the source dialog on the table's tab, clicked or dropped anywhere, even on a node, which doesn't light up", async () => {
    const editorState = await render(new CubeDocument({ query: sliceQuery() }));
    const { document } = editorState;
    const { sourcePicker } = editorState;
    fireEvent.click(paletteItem(TABLE));
    expect(sourcePicker.isOpen).toBe(true);
    expect(sourcePicker.activeTabKey).toBe(CubeSourcePickerTabKey.MODEL);
    act(() => sourcePicker.close());

    const join = await TEST__findCanvasNode('join101');
    startDrag(paletteItem(TABLE));
    dragOver(join);
    expect(isLit(join)).toBe(false);
    drop(paletteItem(TABLE), join);
    expect(sourcePicker.isOpen).toBe(true);
    expect(sourcePicker.activeTabKey).toBe(CubeSourcePickerTabKey.MODEL);
    act(() => sourcePicker.close());

    startDrag(paletteItem(TABLE));
    drop(paletteItem(TABLE), canvasPane());
    expect(sourcePicker.isOpen).toBe(true);
    // nothing is added until the dialog's Add
    expect(editorState.document).toBe(document);
    expect(editorState.history).toHaveLength(0);
  });

  test("Opens the source dialog on the data product's tab, clicked or dropped on a node", async () => {
    const editorState = await render(new CubeDocument({ query: sliceQuery() }));
    const { document } = editorState;
    const { sourcePicker } = editorState;
    const dataProduct = (): HTMLElement => paletteItem('Data Product (BETA)');
    fireEvent.click(dataProduct());
    expect(sourcePicker.isOpen).toBe(true);
    expect(sourcePicker.activeTabKey).toBe(CubeSourcePickerTabKey.DATA_PRODUCT);
    act(() => sourcePicker.close());

    const join = await TEST__findCanvasNode('join101');
    startDrag(dataProduct());
    dragOver(join);
    expect(isLit(join)).toBe(false);
    drop(dataProduct(), join);
    expect(sourcePicker.isOpen).toBe(true);
    expect(sourcePicker.activeTabKey).toBe(CubeSourcePickerTabKey.DATA_PRODUCT);
    expect(editorState.document).toBe(document);
    expect(editorState.history).toHaveLength(0);
  });

  test('Adds a transform on its own when clicked, or dropped on the empty canvas', async () => {
    const editorState = await render();
    fireEvent.click(paletteItem(FILTER));
    expect(editorState.document.query.nodes.map((node) => node.id)).toEqual([
      'filter101',
    ]);
    expect(editorState.history).toHaveLength(1);
    act(() => editorState.undo());
    startDrag(paletteItem(JOIN));
    drop(paletteItem(JOIN), screen.getByTestId(LEGEND_CUBE_TEST_ID.CANVAS));
    expect(editorState.document.query.nodes.map((node) => node.id)).toEqual([
      'join101',
    ]);
    expect(editorState.document.query.connections).toEqual([]);
    await TEST__findCanvasNode('join101');
  });

  test('Splices a transform clicked in after the selected node, which captures it, opening no editor', async () => {
    const editorState = await render(
      new CubeDocument({ query: joinSelectedQuery() }),
    );
    fireEvent.click(paletteItem(FILTER));
    expectSplicedAfterJoin(editorState);
    await TEST__findCanvasNode('filter102');
  });

  test('Splices a transform dropped around the nodes in after the selected node, once', async () => {
    const editorState = await render(
      new CubeDocument({ query: joinSelectedQuery() }),
    );
    await TEST__findCanvasNode('join101');
    startDrag(paletteItem(FILTER));
    drop(paletteItem(FILTER), canvasPane());
    expectSplicedAfterJoin(editorState);
    await TEST__findCanvasNode('filter102');
  });

  test.each([['on the canvas'], ['on a node']])(
    'Applies the open editor before a transform dropped %s is added',
    async (where) => {
      const editorState = await render(
        new CubeDocument({
          context: CONTEXT,
          query: new Query(
            [
              northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
              new Limit('limit101', 10),
            ],
            [new Connection('relational101', 'limit101', 'tds')],
            'limit101',
          ),
        }),
      );
      await TEST__findCanvasNode('limit101');
      act(() => {
        editorState.nodeEditor.open('limit101');
        (editorState.nodeEditor.draft as CubeRowCountDraft<Limit>).setSizeText(
          '5',
        );
      });
      startDrag(paletteItem(FILTER));
      drop(
        paletteItem(FILTER),
        where === 'on a node'
          ? await TEST__findCanvasNode('limit101')
          : canvasPane(),
      );
      expect(
        (editorState.document.query.getNode('limit101') as Limit).size,
      ).toBe(5);
      expect(editorState.nodeEditor.nodeId).toBeUndefined();
      expect(editorState.document.query.getInputIds('filter101')).toEqual([
        'limit101',
      ]);
      expect(editorState.history).toHaveLength(2);
    },
  );

  test('Says in the tooltip where an item goes', async () => {
    await render(new CubeDocument({ query: sliceQuery() }));
    expect(paletteItem(FILTER).title).toBe(
      'Click, or drop it on the canvas, to add it after the selected node; drop it on a node to add it after that node',
    );
    expect(paletteItem(TABLE).title).toBe(
      'Click, or drop it on the canvas, to pick a table',
    );
    expect(paletteItem('Data Product (BETA)').title).toBe(
      'Click, or drop it on the canvas, to pick an access point',
    );
  });

  test('Splices a transform dropped on a node in after it, once', async () => {
    const editorState = await render(new CubeDocument({ query: sliceQuery() }));
    const join = await TEST__findCanvasNode('join101');
    startDrag(paletteItem(FILTER));
    dragOver(join);
    expect(isLit(join)).toBe(true);
    drop(paletteItem(FILTER), join);
    const { query } = editorState.document;
    // the canvas under the node did not add one more
    expect(query.nodes).toHaveLength(5);
    expect(query.getInputIds('filter102')).toEqual(['join101']);
    expect(query.getInputIds('filter101')).toEqual(['filter102']);
    expect(editorState.history).toHaveLength(1);
    await TEST__findCanvasNode('filter102');
  });

  test('Lights up every node for a transform, none for a source', async () => {
    await render(new CubeDocument({ query: sliceQuery() }));
    await TEST__findCanvasNode('filter101');
    const nodes = TEST__getCanvasNodes();
    startDrag(paletteItem(FILTER));
    nodes.forEach((node) => {
      dragOver(node);
      expect(isLit(node)).toBe(true);
    });
    fireEvent.dragEnd(paletteItem(FILTER));
    nodes.forEach((node) => expect(isLit(node)).toBe(false));
    startDrag(paletteItem(TABLE));
    nodes.forEach((node) => {
      dragOver(node);
      expect(isLit(node)).toBe(false);
    });
    fireEvent.dragEnd(paletteItem(TABLE));
  });

  test('Lights up a node only where dropping another node on it connects or moves it', async () => {
    await render(new CubeDocument({ query: sliceQuery() }));
    const filter = await TEST__findCanvasNode('filter101');
    const expected: Record<string, boolean> = {
      // the Filter moves after either table
      relational101: true,
      relational102: true,
      // the Join already feeds it, and nothing can feed it
      join101: false,
      filter101: false,
    };
    startDrag(filter);
    for (const [nodeId, lit] of Object.entries(expected)) {
      const node = await TEST__findCanvasNode(nodeId);
      dragOver(node);
      expect([nodeId, isLit(node)]).toEqual([nodeId, lit]);
    }
    fireEvent.dragEnd(filter);
  });

  test('Leaves the cube as it is when a node is dropped where it can go nowhere', async () => {
    const editorState = await render(new CubeDocument({ query: sliceQuery() }));
    const { document } = editorState;
    const filter = await TEST__findCanvasNode('filter101');
    startDrag(filter);
    drop(filter, await TEST__findCanvasNode('join101'));
    const orders = await TEST__findCanvasNode('relational101');
    startDrag(orders);
    drop(orders, await TEST__findCanvasNode('relational102'));
    expect(editorState.document).toBe(document);
    expect(editorState.history).toHaveLength(0);
  });

  test('Connects a node dropped on another to its first free port', async () => {
    const editorState = await render(unwiredJoin());
    const customers = await TEST__findCanvasNode('relational102');
    startDrag(customers);
    const join = await TEST__findCanvasNode('join101');
    dragOver(join);
    expect(isLit(join)).toBe(true);
    drop(customers, join);
    expect(editorState.document.query.connections).toEqual([
      new Connection('relational102', 'join101', 'leftTds'),
    ]);
    expect(editorState.history).toHaveLength(1);
  });

  test('Moves a node dropped on another after it, when it cannot connect', async () => {
    const editorState = await render(new CubeDocument({ query: sliceQuery() }));
    const filter = await TEST__findCanvasNode('filter101');
    startDrag(filter);
    drop(filter, await TEST__findCanvasNode('relational102'));
    const { query } = editorState.document;
    expect(query.getInputIds('filter101')).toEqual(['relational102']);
    expect(query.getInputIds('join101')).toEqual([
      'relational101',
      'filter101',
    ]);
    expect(editorState.history).toHaveLength(1);
  });

  test('Neither adds nor drags anything while the cube is read-only', async () => {
    const editorState = await render();
    act(() =>
      editorState.importDocument(
        new CubeDocument({
          query: new Query(
            [
              northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
              new Filter('filter101'),
            ],
            [],
            'relational101',
          ),
        }),
        true,
      ),
    );
    const { document } = editorState;
    expect(paletteItem(FILTER).getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(paletteItem(FILTER));
    fireEvent.keyDown(paletteItem(FILTER), { key: 'Enter' });
    fireEvent.click(paletteItem(TABLE));
    expect(editorState.sourcePicker.isOpen).toBe(false);
    const orders = await TEST__findCanvasNode('relational101');
    const filter = await TEST__findCanvasNode('filter101');
    // no drag starts, so nothing lights up and there is nothing to drop
    startDrag(paletteItem(FILTER));
    dragOver(orders);
    expect(isLit(orders)).toBe(false);
    fireEvent.dragEnd(paletteItem(FILTER));
    startDrag(orders);
    dragOver(filter);
    expect(isLit(filter)).toBe(false);
    fireEvent.dragEnd(orders);
    expect(editorState.document).toBe(document);
  });

  test('Adds an item from the keyboard', async () => {
    const editorState = await render();
    fireEvent.keyDown(paletteItem(FILTER), { key: 'Enter' });
    fireEvent.keyDown(paletteItem(JOIN), { key: ' ' });
    expect(editorState.document.query.nodes.map((node) => node.type)).toEqual([
      'filter',
      'join',
    ]);
    // the Join went after the Filter, the selected node, and captures it
    const { query } = editorState.document;
    expect(query.getInputIds('join101')).toEqual(['filter101', undefined]);
    expect(query.selected).toBe('join101');
  });
});
