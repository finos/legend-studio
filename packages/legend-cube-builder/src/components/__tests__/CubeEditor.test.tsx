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

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  Connection,
  CubeDocument,
  FilterOperator,
  Join,
  Query,
  RelationalTableSource,
  Schema,
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
  CUSTOMERS_COLUMNS,
  NORTHWIND_DATABASE,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  TEST__findCanvasNode,
  TEST__getCanvasNodes,
  TEST__getCanvasNodeTooltip,
} from '../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__renderInCubeApplication } from '../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  FAKE_NORTHWIND_OUTLINE,
  type FakeCubeEngine,
} from '../../__test-utils__/FakeCubeEngine.js';
import type {
  CubeModelOutline,
  CubeResult,
} from '../../graph-manager/CubeEngine.js';
import { CUBE_NORTHWIND_MODEL } from '../../stores/fixtures/CubeNorthwindModel.js';
import { CubeEditor } from '../CubeEditor.js';

// the `mock` prefix lets the hoisted factory below use it; it is read only
// when the group renders, after this line has run
const mockPanelGroupTestId = 'legend-cube-test__panel-group';

// legend-art renders ResizablePanelGroup and ResizablePanel as bare divs under
// test, dropping their props; these keep the orientation and the largest
// size, so the layout can be read
jest.mock('@finos/legend-art', () => ({
  ...jest.requireActual<object>('@finos/legend-art'),
  ResizablePanelGroup: function ResizablePanelGroup(props: {
    orientation?: string;
    children?: React.ReactNode;
  }) {
    return (
      <div
        data-testid={mockPanelGroupTestId}
        data-orientation={props.orientation}
      >
        {props.children}
      </div>
    );
  },
  ResizablePanel: function ResizablePanel(props: {
    maxSize?: number;
    children?: React.ReactNode;
  }) {
    return <div data-max-size={props.maxSize}>{props.children}</div>;
  },
}));

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const OTHER_DATABASE = 'test::OtherDatabase';

/** Northwind, with another database its runtime also reaches */
const TWO_DATABASES: CubeModelOutline = {
  databases: [
    ...FAKE_NORTHWIND_OUTLINE.databases,
    { path: OTHER_DATABASE, schemas: [{ name: 'OTHER', tables: [] }] },
  ],
  runtimes: [
    {
      path: NORTHWIND_RUNTIME,
      storePaths: [NORTHWIND_DATABASE, OTHER_DATABASE],
    },
  ],
};

const renderPage = async (
  initialDocument?: CubeDocument,
  prepare?: (fake: FakeCubeEngine) => void,
): ReturnType<typeof TEST__renderInCubeApplication> => {
  const { host, fake } = TEST__createCubeHost();
  prepare?.(fake);
  return TEST__renderInCubeApplication(
    <CubeEditor host={host} initialDocument={initialDocument} />,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
};

/** The group that stacks the graph above the results; the node editor sits beside it, in another */
const stackedGroup = (): HTMLElement | undefined =>
  screen
    .queryAllByTestId(mockPanelGroupTestId)
    .find((group) => group.getAttribute('data-orientation') === 'horizontal');

/** A cube that already holds ORDERS, so the page has no empty state */
const withOrders = (): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
      [],
      'relational101',
    ),
  });

/** A run that never answers, until the page stops it */
const neverAnswers = (fake: FakeCubeEngine): void => {
  fake.execute.mockImplementation(
    async () => new Promise<CubeResult>(() => undefined),
  );
};

const toolbar = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.GRID_TOOLBAR);

/** legend-art's loading bar while it is loading; its idle form has another class */
const loadingBarIn = (element: HTMLElement): Element | null =>
  element.querySelector('.panel-loading-indicator');

beforeEach(() => {
  localStorage.clear();
});

describe('Cube page', () => {
  test('Opens on an empty, unsaved cube, with the query above and the results below', async () => {
    const { getByTestId } = await renderPage();
    const graph = getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION);
    expect(within(graph).getByText('Unsaved Query')).toBeDefined();
    expect(within(graph).getByText(/No tables yet/u)).toBeDefined();
    expect(getByTestId(LEGEND_CUBE_TEST_ID.GRID_REGION)).toBeDefined();
    // stacked, the query first, in one resizable group
    const group = stackedGroup() as HTMLElement;
    expect(
      [
        ...group.querySelectorAll(
          `[data-testid="${LEGEND_CUBE_TEST_ID.GRAPH_REGION}"], [data-testid="${LEGEND_CUBE_TEST_ID.GRID_REGION}"]`,
        ),
      ].map((region) => region.getAttribute('data-testid')),
    ).toEqual([
      LEGEND_CUBE_TEST_ID.GRAPH_REGION,
      LEGEND_CUBE_TEST_ID.GRID_REGION,
    ]);
  });

  test('Hides the graph down to its header, keeping the rows fresh, and shows it again', async () => {
    await renderPage(withOrders(), (fake) =>
      fake.execute.mockResolvedValue({
        columns: ORDERS_COLUMNS.map((column) => column.name),
        rows: [ORDERS_COLUMNS.map(() => null)],
        sql: [],
        durationMs: 1,
      }),
    );
    fireEvent.click(within(toolbar()).getByText('Execute'));
    await within(toolbar()).findByText(/rows? in/u);
    const graph = (): HTMLElement =>
      screen.getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION);
    fireEvent.click(within(graph()).getByText('Hide graph'));
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.CANVAS)).toBeNull();
    // the header stays, above the results, outside any resizable group
    expect(within(graph()).getByText('Add table')).toBeDefined();
    expect(stackedGroup()).toBeUndefined();
    expect(screen.getByTestId(LEGEND_CUBE_TEST_ID.GRID_REGION)).toBeDefined();
    expect(within(toolbar()).queryByText(/Stale/u)).toBeNull();
    expect(within(toolbar()).getByText(/rows? in/u)).toBeDefined();
    // an edit of the cube, so Undo shows the graph again
    fireEvent.click(within(graph()).getByText('Undo'));
    expect(screen.getByTestId(LEGEND_CUBE_TEST_ID.CANVAS)).toBeDefined();
    expect(within(graph()).getByText('Hide graph')).toBeDefined();
    fireEvent.click(within(graph()).getByText('Hide graph'));
    fireEvent.click(within(graph()).getByText('Show graph'));
    expect(screen.getByTestId(LEGEND_CUBE_TEST_ID.CANVAS)).toBeDefined();
    expect(within(toolbar()).queryByText(/Stale/u)).toBeNull();
  });

  test('Opens a cube saved with its graph hidden that way', async () => {
    await renderPage(
      new CubeDocument({
        query: sliceQuery(),
        meta: { presentation: { showGraph: false, columnWidths: [] } },
      }),
    );
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.CANVAS)).toBeNull();
    expect(
      within(screen.getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION)).getByText(
        'Show graph',
      ),
    ).toBeDefined();
  });

  test('Keeps the graph to at most 60% of the window height, as the window resizes', async () => {
    const { getByTestId } = await renderPage();
    const graphPanel = (): HTMLElement | null =>
      getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION).parentElement;
    expect(graphPanel()?.getAttribute('data-max-size')).toBe(
      String(Math.round(window.innerHeight * 0.6)),
    );
    const height = window.innerHeight;
    try {
      act(() => {
        window.innerHeight = 1000;
        window.dispatchEvent(new Event('resize'));
      });
      expect(graphPanel()?.getAttribute('data-max-size')).toBe('600');
    } finally {
      window.innerHeight = height;
    }
  });

  test('Opens the node editor beside the page, and says in the graph region when it closed dropping edits', async () => {
    await renderPage(
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
      }),
    );
    fireEvent.click(await TEST__findCanvasNode('join101'));
    const editor = await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
    // beside the graph and the results, in a group of its own
    expect(
      editor
        .closest(`[data-orientation="vertical"]`)
        ?.getAttribute('data-testid'),
    ).toBe(mockPanelGroupTestId);
    const pickKeys = (left: string, right: string): void => {
      fireEvent.click(within(editor).getByText('Add join columns'));
      const position = within(
        within(editor).getByRole('list', { name: 'Join columns' }),
      ).getAllByRole('listitem').length;
      fireEvent.change(
        within(editor).getByLabelText(`Left join column ${position}`),
        { target: { value: left } },
      );
      fireEvent.change(
        within(editor).getByLabelText(`Right join column ${position}`),
        { target: { value: right } },
      );
    };
    pickKeys('CUSTOMER_ID', 'CUSTOMER_ID');
    fireEvent.click(within(editor).getByText('Apply'));
    pickKeys('SHIP_CITY', 'CITY');
    const graph = screen.getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION);
    fireEvent.click(within(graph).getByText('Undo'));
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    const notice = within(graph).getByTestId(LEGEND_CUBE_TEST_ID.EDITOR_NOTICE);
    expect(notice.textContent).toContain(
      'join101 changed, so the editor of join101 closed without applying its changes.',
    );
    fireEvent.click(within(notice).getByText('Dismiss'));
    expect(
      within(graph).queryByTestId(LEGEND_CUBE_TEST_ID.EDITOR_NOTICE),
    ).toBeNull();
  });

  test("Marks its root as Legend Cube's, never as Data Cube's", async () => {
    const { baseElement, getByTestId } = await renderPage();
    // `.legend-cube` gives the page its height and width (style/index.scss),
    // which jsdom can't measure: without it the results collapse
    expect(
      getByTestId(LEGEND_CUBE_TEST_ID.EDITOR).classList.contains('legend-cube'),
    ).toBe(true);
    expect(baseElement.querySelector('.data-cube')).toBeNull();
  });

  test('Shows a named cube by its name', async () => {
    const { getByTestId } = await renderPage(
      new CubeDocument({ name: 'Orders 1997' }),
    );
    const graph = getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION);
    expect(within(graph).getByText('Orders 1997')).toBeDefined();
    expect(within(graph).queryByText('Unsaved Query')).toBeNull();
  });

  test("Draws the query's nodes, with the one Execute runs marked", async () => {
    await renderPage(
      new CubeDocument({ context: CONTEXT, query: sliceQuery() }),
    );
    const filter = await TEST__findCanvasNode('filter101');
    expect(TEST__getCanvasNodes()).toHaveLength(4);
    expect(filter.getAttribute('aria-current')).toBe('true');
    const orders = await TEST__findCanvasNode('relational101');
    expect(orders.getAttribute('aria-current')).toBe('false');
    expect(
      within(orders).getByText('Table "ORDERS" from schema "NORTHWIND"'),
    ).toBeDefined();
  });

  test('Moves the run to another node with Ctrl-click', async () => {
    await renderPage(new CubeDocument({ query: sliceQuery() }));
    fireEvent.click(await TEST__findCanvasNode('join101'), { ctrlKey: true });
    expect(
      (await TEST__findCanvasNode('join101')).getAttribute('aria-current'),
    ).toBe('true');
    expect(
      (await TEST__findCanvasNode('filter101')).getAttribute('aria-current'),
    ).toBe('false');
  });

  test('Undoes the last change from the header, and can undo nothing on a fresh page', async () => {
    await renderPage(new CubeDocument({ query: sliceQuery() }));
    const header = screen.getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION);
    const undo = within(header).getByText<HTMLButtonElement>('Undo');
    expect(undo.disabled).toBe(true);
    fireEvent.click(await TEST__findCanvasNode('join101'), { metaKey: true });
    expect(undo.disabled).toBe(false);
    fireEvent.click(undo);
    expect(
      (await TEST__findCanvasNode('filter101')).getAttribute('aria-current'),
    ).toBe('true');
    expect(
      (await TEST__findCanvasNode('join101')).getAttribute('aria-current'),
    ).toBe('false');
    expect(undo.disabled).toBe(true);
  });

  test("Shows a node's errors on it, query-level rules included", async () => {
    const otherDatabase = new RelationalTableSource(
      'relational102',
      { database: 'other::Database', schema: 'NORTHWIND', table: 'ORDERS' },
      { kind: 'resolved', schema: new Schema(ORDERS_COLUMNS) },
    );
    await renderPage(
      new CubeDocument({
        query: new Query(
          [
            northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
            otherDatabase,
          ],
          [],
          'relational101',
        ),
      }),
    );
    expect(
      TEST__getCanvasNodeTooltip(await TEST__findCanvasNode('relational101')),
    ).toEqual(['Table "ORDERS" from schema "NORTHWIND"', 'relational101']);
    const other = await TEST__findCanvasNode('relational102');
    expect(other.classList.contains('legend-cube__node--invalid')).toBe(true);
    expect(TEST__getCanvasNodeTooltip(other)[0]).toContain(
      'Sources from different databases are not supported yet',
    );
  });

  test('Shows two identical errors of a node once', async () => {
    // two conditions without a value give the same message twice
    await renderPage(
      new CubeDocument({
        context: CONTEXT,
        query: sliceQuery(
          new CompositeFilter(CompositeFilterOperator.AND, [
            new ColumnComparisonFilter('ORDER_ID', FilterOperator.EQUAL),
            new ColumnComparisonFilter('SHIP_CITY', FilterOperator.EQUAL),
          ]),
        ),
      }),
    );
    expect(
      TEST__getCanvasNodeTooltip(await TEST__findCanvasNode('filter101')),
    ).toEqual([
      'Filter value is required.',
      'Filter by ORDER_ID is (blank) and SHIP_CITY is (blank)',
      'filter101',
    ]);
  });

  test('Adds a second table from the header', async () => {
    const { getByTestId, queryByText } = await renderPage(
      withOrders(),
      (fake) => fake.loadModel.mockResolvedValue(TWO_DATABASES),
    );
    // no empty state: the header's button is the only way in
    expect(queryByText(/No tables yet/u)).toBeNull();
    expect(queryByText('add a table')).toBeNull();
    const graph = getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION);
    fireEvent.click(within(graph).getByText('Add table'));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() =>
      expect(within(dialog).queryByText('loading model')).toBeNull(),
    );
    // the runtime reaches another database too, but only ORDERS' is offered
    const database =
      within(dialog).getByLabelText<HTMLSelectElement>('Database');
    expect(Array.from(database.options).map(({ value }) => value)).toEqual([
      NORTHWIND_DATABASE,
    ]);
    expect(database.value).toBe(NORTHWIND_DATABASE);
    expect(database.disabled).toBe(true);
    const tables = within(dialog).getByRole('list', { name: 'Tables' });
    fireEvent.click(within(tables).getByText('CUSTOMERS'));
    fireEvent.click(within(dialog).getByText('Add'));
    await waitFor(() => expect(TEST__getCanvasNodes()).toHaveLength(2));
    expect(
      within(await TEST__findCanvasNode('relational102', graph)).getByText(
        'Table "CUSTOMERS" from schema "NORTHWIND"',
      ),
    ).toBeDefined();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('Keeps the query usable while a query runs', async () => {
    const { getByTestId } = await renderPage(
      new CubeDocument({ context: CONTEXT, query: sliceQuery() }),
      neverAnswers,
    );
    fireEvent.click(within(toolbar()).getByText('Execute'));
    expect(await within(toolbar()).findByText('executing query')).toBeDefined();
    // the run's bar is over the results only
    expect(
      loadingBarIn(getByTestId(LEGEND_CUBE_TEST_ID.GRID_REGION)),
    ).not.toBeNull();
    const graph = getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION);
    expect(loadingBarIn(graph)).toBeNull();
    expect(
      within(graph).getByText<HTMLButtonElement>('Add table').disabled,
    ).toBe(false);
    fireEvent.click(await TEST__findCanvasNode('join101', graph), {
      ctrlKey: true,
    });
    expect(
      (await TEST__findCanvasNode('join101', graph)).getAttribute(
        'aria-current',
      ),
    ).toBe('true');
    // the picker opens too, and closing it leaves the run going
    fireEvent.click(within(graph).getByText('Add table'));
    const dialog = await screen.findByRole('dialog');
    expect(
      await within(dialog).findByRole('list', { name: 'Tables' }),
    ).toBeDefined();
    fireEvent.click(within(dialog).getByText('Cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(within(toolbar()).getByText('executing query')).toBeDefined();
  });

  test('Keeps the results while the picker is open and a table resolves, and after Cancel', async () => {
    const { getByTestId } = await renderPage(undefined, (fake) =>
      fake.resolveSchemas.mockReturnValueOnce(new Promise(() => undefined)),
    );
    fireEvent.click(screen.getByText('add a table'));
    const dialog = await screen.findByRole('dialog');
    // the picker only adds tables: the page stays as it is behind it
    expect(getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION)).toBeDefined();
    expect(getByTestId(LEGEND_CUBE_TEST_ID.GRID_REGION)).toBeDefined();
    const tables = await within(dialog).findByRole('list', { name: 'Tables' });
    fireEvent.click(within(tables).getByText('ORDERS'));
    fireEvent.click(within(dialog).getByText('Add'));
    expect(await within(dialog).findByText('resolving source')).toBeDefined();
    // the resolution's bar is in the dialog, not over the results
    expect(loadingBarIn(dialog)).not.toBeNull();
    expect(
      loadingBarIn(getByTestId(LEGEND_CUBE_TEST_ID.GRID_REGION)),
    ).toBeNull();
    expect(within(toolbar()).getByText('Execute')).toBeDefined();
    fireEvent.click(within(dialog).getByText('Cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(getByTestId(LEGEND_CUBE_TEST_ID.GRID_REGION)).toBeDefined();
    expect(within(toolbar()).getByText('Execute')).toBeDefined();
  });

  test('Stops the run in flight when the page unmounts', async () => {
    let signal: AbortSignal | undefined;
    const { unmount } = await renderPage(withOrders(), (fake) =>
      fake.execute.mockImplementation(async (_model, _lambda, options) => {
        signal = options?.abortController?.signal;
        return new Promise<CubeResult>(() => undefined);
      }),
    );
    fireEvent.click(within(toolbar()).getByText('Execute'));
    expect(await within(toolbar()).findByText('executing query')).toBeDefined();
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
