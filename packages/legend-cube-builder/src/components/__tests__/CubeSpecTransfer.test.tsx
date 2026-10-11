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

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import {
  Core_LegendApplicationPlugin,
  LEGEND_APPLICATION_COLOR_THEME,
} from '@finos/legend-application';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  Connection,
  CubeDocument,
  FilterOperator,
  MAX_SPEC_BYTES,
  Query,
  Schema,
  serializeCubeSpec,
  UnknownNode,
  UnsupportedFilter,
} from '@finos/legend-cube';
import { guaranteeNonNullable, readFileAsText } from '@finos/legend-shared';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import { READ_ONLY_CUBE_TITLE } from '../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import {
  TEST__findCanvasNode,
  TEST__getCanvasNodeTooltip,
} from '../../__test-utils__/CubeCanvasTestUtils.js';
import {
  TEST__getAddItemsTrigger,
  TEST__renderInCubeApplication,
} from '../../__test-utils__/CubePageTestUtils.js';
import {
  TEST__createCubeApplicationStore,
  TEST__createCubeHost,
} from '../../__test-utils__/CubeTestApplication.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import type { FakeCubeEngine } from '../../__test-utils__/FakeCubeEngine.js';
import type { CubeEngine } from '../../graph-manager/CubeEngine.js';
import type { CubeHost } from '../../stores/CubeHost.js';
import { CUBE_NORTHWIND_MODEL } from '../../stores/fixtures/CubeNorthwindModel.js';
import { CubeEditor } from '../CubeEditor.js';

type ResolvedSchemas = Awaited<ReturnType<CubeEngine['resolveSchemas']>>;

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

const sliceDocument = (): CubeDocument =>
  new CubeDocument({
    name: 'Orders in France',
    context: CONTEXT,
    query: sliceQuery(),
  });

const ordersDocument = (): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
      [],
      'relational101',
    ),
  });

/**
 * A cube that can't run, with everything a saved cube may hold that this
 * version can't use: a filter value that isn't a number, a filter rule it
 * doesn't support, a node of an unknown kind with an unconnected input, and
 * an unknown key
 */
const unfinishedDocument = (): CubeDocument => {
  const slice = sliceQuery(
    new CompositeFilter(CompositeFilterOperator.AND, [
      new ColumnComparisonFilter('ORDER_ID', FilterOperator.EQUAL, {
        kind: 'invalid',
        text: 'ten',
      }),
      new UnsupportedFilter({ kind: 'regex', column: 'SHIP_NAME' }),
    ]),
  );
  return new CubeDocument({
    name: 'Unfinished',
    context: CONTEXT,
    query: new Query(
      [
        ...slice.nodes,
        new UnknownNode('pivot101', 2, {
          kind: 'pivot',
          pivotColumns: ['SHIP_COUNTRY'],
        }),
      ],
      [...slice.connections, new Connection('filter101', 'pivot101', 'in0')],
      'pivot101',
    ),
    rest: { savedBy: 'a newer Cube' },
  });
};

const renderPage = async (
  initialDocument?: CubeDocument,
  { host, fake } = TEST__createCubeHost(),
): Promise<{ host: CubeHost; fake: FakeCubeEngine }> => {
  await TEST__renderInCubeApplication(
    <CubeEditor host={host} initialDocument={initialDocument} />,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
  return { host, fake };
};

const graphRegion = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION);
const headerButton = (text: string): HTMLButtonElement =>
  within(graphRegion()).getByText<HTMLButtonElement>(text);
/**
 * The strip along the top of the graph region, with the cube's name and its
 * buttons: the one that holds Import, which is never hidden
 */
const headerStrip = (): HTMLElement =>
  guaranteeNonNullable(headerButton('Import').parentElement);
/** The ids of the nodes on the canvas, in the query's order */
const nodeIds = (): string[] =>
  Array.from(document.querySelectorAll('.react-flow__node')).map(
    (node) => node.getAttribute('data-id') ?? '',
  );
/** The node's errors and warnings, from its tooltip, which ends with its description and id */
const nodeProblems = async (nodeId: string): Promise<string[]> =>
  TEST__getCanvasNodeTooltip(await TEST__findCanvasNode(nodeId)).slice(0, -2);
const executeButton = (): HTMLButtonElement =>
  within(
    screen.getByTestId(LEGEND_CUBE_TEST_ID.GRID_TOOLBAR),
  ).getByText<HTMLButtonElement>('Execute');
/**
 * legend-art's loading bar among the region's own children, which has one
 * class while it loads and another while idle
 */
const barIn = (region: HTMLElement): Element | undefined =>
  Array.from(region.children).find((child) =>
    child.className.startsWith('panel-loading-indicator'),
  );
/** The spec the Export dialog shows */
const exportedText = (dialog: HTMLElement): string =>
  within(dialog).getByLabelText<HTMLTextAreaElement>('Cube spec').value;

/**
 * Whether the dialog's frame and the named footer buttons are drawn dark,
 * as `[name, dark, light]`: the theme shows only in legend-art's classes
 */
const themeOf = (
  dialog: HTMLElement,
  buttons: string[],
): [boolean | undefined, (string | boolean)[][]] => [
  dialog.querySelector('.modal')?.classList.contains('modal--dark'),
  buttons.map((name) => {
    const { classList } = within(dialog).getByRole('button', { name });
    return [
      name,
      classList.contains('btn--dark'),
      classList.contains('btn--light'),
    ];
  }),
];

// a function, since `<T>` in a .tsx arrow function reads as a JSX tag
function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

/** Opens Import, pastes the text and presses Import */
const importText = async (text: string): Promise<HTMLElement> => {
  fireEvent.click(headerButton('Import'));
  const dialog = await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Cube spec'), {
    target: { value: text },
  });
  fireEvent.click(within(dialog).getByText('Import'));
  return dialog;
};

// jsdom has no object URLs: a test defines one, and this puts back what was there
const CREATE_OBJECT_URL = Object.getOwnPropertyDescriptor(
  URL,
  'createObjectURL',
);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  if (CREATE_OBJECT_URL) {
    Object.defineProperty(URL, 'createObjectURL', CREATE_OBJECT_URL);
  } else {
    delete (URL as { createObjectURL?: unknown }).createObjectURL;
  }
  jest.restoreAllMocks();
});

describe('Cube spec export and import, on the page', () => {
  test('Shows the spec, copies it, and downloads it as a .cube.json file named after the cube', async () => {
    const { host } = await renderPage(sliceDocument());
    const copy = jest
      .spyOn(host.applicationStore.clipboardService, 'copyTextToClipboard')
      .mockResolvedValue();
    // jsdom has no object URLs, and follows no download links
    const blobs: Blob[] = [];
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: (blob: Blob): string => {
        blobs.push(blob);
        return 'blob:cube';
      },
    });
    const clicked: HTMLAnchorElement[] = [];
    jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push(this);
      });

    fireEvent.click(headerButton('Export'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Export spec')).toBeDefined();
    const spec = serializeCubeSpec(sliceDocument());
    expect(exportedText(dialog)).toBe(spec);

    fireEvent.click(within(dialog).getByText('Copy'));
    expect(copy).toHaveBeenCalledWith(spec, expect.anything());

    fireEvent.click(within(dialog).getByText('Download'));
    expect(clicked.map((link) => link.download)).toEqual([
      'Orders_in_France.cube.json',
    ]);
    // jsdom's Blob has no text()
    expect(
      await readFileAsText(new File([blobs[0] as Blob], 'spec.cube.json')),
    ).toBe(spec);
    expect(blobs[0]?.type).toBe('application/json');

    fireEvent.click(within(dialog).getByText('Close'));
    await waitForElementToBeRemoved(dialog);
  });

  test("Exports a cube that can't run, and imports it back as it was saved", async () => {
    const document = unfinishedDocument();
    await renderPage(document);
    // the cube really can't run
    expect(executeButton().disabled).toBe(true);
    expect(headerButton('Show Pure').disabled).toBe(true);

    const exportButton = headerButton('Export');
    expect(exportButton.disabled).toBe(false);
    fireEvent.click(exportButton);
    let dialog = await screen.findByRole('dialog');
    const spec = serializeCubeSpec(document);
    expect(exportedText(dialog)).toBe(spec);
    expect(within(dialog).queryByRole('alert')).toBeNull();
    const saved = JSON.parse(spec) as {
      savedBy?: unknown;
      query: { nodes: { id: string; inputs?: unknown }[] };
    };
    expect(saved.savedBy).toBe('a newer Cube');
    expect(
      saved.query.nodes.find((node) => node.id === 'pivot101')?.inputs,
    ).toEqual(['filter101', null]);
    fireEvent.click(within(dialog).getByText('Close'));
    await waitForElementToBeRemoved(dialog);

    // the invalid value, the unsupported rule, the unknown node, its
    // unconnected input and the unknown key all come back
    dialog = await importText(spec);
    await waitForElementToBeRemoved(dialog);
    await waitFor(() =>
      expect(within(graphRegion()).queryByText('resolving source')).toBeNull(),
    );
    await waitFor(() =>
      expect(nodeIds()).toEqual([
        'relational101',
        'relational102',
        'join101',
        'filter101',
        'pivot101',
      ]),
    );
    fireEvent.click(headerButton('Export'));
    dialog = await screen.findByRole('dialog');
    expect(exportedText(dialog)).toBe(spec);
  });

  test('Says why a cube too large to save is not exported, and offers nothing to copy or download', async () => {
    await renderPage(ordersDocument().withName('x'.repeat(MAX_SPEC_BYTES)));
    fireEvent.click(headerButton('Export'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('alert').textContent).toBe(
      `The cube is too large to save: its spec is over ${MAX_SPEC_BYTES} bytes`,
    );
    expect(within(dialog).queryByLabelText('Cube spec')).toBeNull();
    expect(within(dialog).getByText<HTMLButtonElement>('Copy').disabled).toBe(
      true,
    );
    expect(
      within(dialog).getByText<HTMLButtonElement>('Download').disabled,
    ).toBe(true);
    fireEvent.click(within(dialog).getByText('Close'));
    await waitForElementToBeRemoved(dialog);
  });

  test.each([
    [LEGEND_APPLICATION_COLOR_THEME.LEGACY_LIGHT, false],
    [LEGEND_APPLICATION_COLOR_THEME.DEFAULT_DARK, true],
  ])(
    'Draws the Export and Import dialogs and their buttons in the color theme %s (dark: %s)',
    async (theme, dark) => {
      const created = TEST__createCubeHost(
        undefined,
        // the core plugin registers the light theme
        TEST__createCubeApplicationStore([new Core_LegendApplicationPlugin()]),
      );
      const { layoutService } = created.host.applicationStore;
      layoutService.setColorTheme(theme);
      // a theme that isn't registered is ignored, which would test nothing
      expect(layoutService.currentColorTheme.key).toBe(theme);
      await renderPage(ordersDocument(), created);

      fireEvent.click(headerButton('Export'));
      let dialog = await screen.findByRole('dialog');
      expect(themeOf(dialog, ['Copy', 'Download', 'Close'])).toEqual([
        dark,
        [
          ['Copy', dark, !dark],
          ['Download', dark, !dark],
          ['Close', dark, !dark],
        ],
      ]);
      fireEvent.click(within(dialog).getByText('Close'));
      await waitForElementToBeRemoved(dialog);

      fireEvent.click(headerButton('Import'));
      dialog = await screen.findByRole('dialog');
      expect(themeOf(dialog, ['Import', 'Cancel'])).toEqual([
        dark,
        [
          ['Import', dark, !dark],
          ['Cancel', dark, !dark],
        ],
      ]);
    },
  );

  test('Imports a pasted spec in place of the cube, runs nothing, and Undo brings the cube back', async () => {
    const { fake } = await renderPage(ordersDocument());
    await waitFor(() => expect(nodeIds()).toEqual(['relational101']));
    const dialog = await importText(serializeCubeSpec(sliceDocument()));
    await waitForElementToBeRemoved(dialog);
    expect(within(graphRegion()).getByText('Orders in France')).toBeDefined();
    await waitFor(() =>
      expect(nodeIds()).toEqual([
        'relational101',
        'relational102',
        'join101',
        'filter101',
      ]),
    );
    expect(fake.execute).not.toHaveBeenCalled();
    expect(
      screen.getByText('Execute the query to see its rows.'),
    ).toBeDefined();

    fireEvent.click(headerButton('Undo'));
    await waitFor(() => expect(nodeIds()).toEqual(['relational101']));
  });

  test('Shows where a broken spec is broken, keeps the dialog open and the cube as it was', async () => {
    await renderPage(ordersDocument());
    const spec = JSON.parse(serializeCubeSpec(ordersDocument())) as {
      query: { nodes: Record<string, unknown>[] };
    };
    spec.query.nodes[0] = { ...spec.query.nodes[0], table: 7 };
    const dialog = await importText(JSON.stringify(spec));
    expect(within(dialog).getByRole('alert').textContent).toBe(
      "Can't import the spec: query.nodes[0].table must be a string",
    );
    await waitFor(() => expect(nodeIds()).toEqual(['relational101']));
    expect(headerButton('Undo').disabled).toBe(true);
  });

  test("Can't import before a spec is pasted or chosen", async () => {
    await renderPage();
    fireEvent.click(headerButton('Import'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText<HTMLButtonElement>('Import').disabled).toBe(
      true,
    );
    fireEvent.click(within(dialog).getByText('Cancel'));
    await waitForElementToBeRemoved(dialog);
  });

  test('Reads a chosen .cube.json file into the spec to import', async () => {
    await renderPage();
    fireEvent.click(headerButton('Import'));
    const dialog = await screen.findByRole('dialog');
    const spec = serializeCubeSpec(sliceDocument());
    fireEvent.change(within(dialog).getByLabelText('Spec file'), {
      target: {
        files: [
          new File([spec], 'slice.cube.json', { type: 'application/json' }),
        ],
      },
    });
    const text =
      within(dialog).getByLabelText<HTMLTextAreaElement>('Cube spec');
    await waitFor(() => expect(text.value).toBe(spec));
    fireEvent.click(within(dialog).getByText('Import'));
    await waitForElementToBeRemoved(dialog);
    await waitFor(() => expect(nodeIds()).toHaveLength(4));
  });

  test('Opens a spec from a newer version read-only, says so, and still selects, runs and shows its Pure', async () => {
    const PURE = '#>{showcase::northwind::store::NorthwindDatabase}#';
    const { fake } = await renderPage(
      ordersDocument(),
      TEST__createCubeHost({ pure: PURE }),
    );
    const newer = JSON.stringify({
      ...JSON.parse(serializeCubeSpec(sliceDocument())),
      formatVersion: 2,
    });
    const dialog = await importText(newer);
    await waitForElementToBeRemoved(dialog);
    const banner = within(graphRegion()).getByRole('status');
    expect(banner.textContent).toContain(
      'saved by a newer version of Legend Cube',
    );
    const addItems = TEST__getAddItemsTrigger();
    expect(addItems.disabled).toBe(true);
    expect(addItems.title).toBe(READ_ONLY_CUBE_TITLE);
    fireEvent.click(addItems);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(headerButton('Undo').disabled).toBe(true);
    expect(headerButton('Export').disabled).toBe(true);
    expect(headerButton('Import').disabled).toBe(false);
    expect(executeButton().disabled).toBe(false);

    // Show Pure works
    const showPure = headerButton('Show Pure');
    expect(showPure.disabled).toBe(false);
    fireEvent.click(showPure);
    const pure = await screen.findByRole('dialog');
    expect((await within(pure).findByLabelText('Pure query')).textContent).toBe(
      PURE,
    );
    expect(fake.renderPure).toHaveBeenCalledTimes(1);
    fireEvent.click(within(pure).getByText('Close'));
    await waitForElementToBeRemoved(pure);

    // so does Select, and the cube stays read-only
    fireEvent.click(await TEST__findCanvasNode('join101'), { ctrlKey: true });
    await waitFor(async () =>
      expect(
        (await TEST__findCanvasNode('join101')).getAttribute('aria-current'),
      ).toBe('true'),
    );
    expect(
      (await TEST__findCanvasNode('filter101')).getAttribute('aria-current'),
    ).toBe('false');
    expect(within(graphRegion()).getByRole('status')).toBe(banner);
    expect(headerButton('Undo').disabled).toBe(true);
    expect(headerButton('Export').disabled).toBe(true);
    expect(executeButton().disabled).toBe(false);
  });

  test("Types the imported cube's tables again and warns on a table that changed since it was saved", async () => {
    const { fake } = await renderPage();
    const spec = JSON.parse(serializeCubeSpec(ordersDocument())) as {
      query: { nodes: { schemaSnapshot: { name: string }[] }[] };
    };
    const [orders] = spec.query.nodes;
    // saved before SHIP_COUNTRY was added
    if (orders) {
      orders.schemaSnapshot = orders.schemaSnapshot.filter(
        (column) => column.name !== 'SHIP_COUNTRY',
      );
    }
    const dialog = await importText(JSON.stringify(spec));
    await waitForElementToBeRemoved(dialog);
    await waitFor(async () =>
      expect(await nodeProblems('relational101')).toEqual([
        'This table changed since the cube was saved: added SHIP_COUNTRY',
      ]),
    );
    expect(fake.resolveSchemas).toHaveBeenCalledTimes(1);
    expect(within(graphRegion()).queryByText('resolving source')).toBeNull();
  });

  test("Says 'resolving source' with a bar over the query while an imported cube's tables are typed again", async () => {
    const { fake } = await renderPage();
    const held = deferred<ResolvedSchemas>();
    fake.resolveSchemas.mockReturnValueOnce(held.promise);
    const dialog = await importText(serializeCubeSpec(ordersDocument()));
    await waitForElementToBeRemoved(dialog);

    // the label sits in the header strip, beside the cube's name
    const strip = headerStrip();
    expect(strip.parentElement).toBe(graphRegion());
    expect(within(strip).getByText('Unsaved Query')).toBeDefined();
    expect(within(strip).getByText('resolving source')).toBeDefined();
    // the bar is the graph region's own child, and covers it
    expect(barIn(graphRegion())?.className).toBe('panel-loading-indicator');
    await waitFor(() =>
      expect(
        graphRegion().classList.contains('panel-loading-indicator__container'),
      ).toBe(true),
    );
    // the results are not held up
    const grid = screen.getByTestId(LEGEND_CUBE_TEST_ID.GRID_REGION);
    expect(grid.querySelector('.panel-loading-indicator')).toBeNull();
    expect(fake.resolveSchemas).toHaveBeenCalledTimes(1);

    await act(async () => {
      held.resolve(new Map([['relational101', new Schema(ORDERS_COLUMNS)]]));
    });
    await waitFor(() =>
      expect(within(graphRegion()).queryByText('resolving source')).toBeNull(),
    );
    // the idle bar stays in place
    expect(barIn(graphRegion())?.className).toBe(
      'panel-loading-indicator--disabled',
    );
    await waitFor(() =>
      expect(
        graphRegion().classList.contains('panel-loading-indicator__container'),
      ).toBe(false),
    );
    await waitFor(() => expect(nodeIds()).toEqual(['relational101']));
    expect(await nodeProblems('relational101')).toEqual([]);
  });
});
