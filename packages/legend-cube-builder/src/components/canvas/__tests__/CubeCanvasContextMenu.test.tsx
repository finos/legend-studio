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
  ArrowsJoinIcon,
  LayerGroupIcon,
  QuestionSquareIcon,
} from '@finos/legend-art';
import {
  Concat,
  Connection,
  CubeDocument,
  type Join,
  Limit,
  Query,
} from '@finos/legend-cube';
import {
  act,
  fireEvent,
  render as renderElement,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { runInAction } from 'mobx';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  NORTHWIND_RUNTIME,
  sliceQuery,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  TEST__importDocument,
  TEST__renderInCubeApplication,
} from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import type { CubeRowCountDraft } from '../../../stores/editors/CubeRowCountDraft.js';
import { CubeSourcePickerTabKey } from '../../../stores/source-picker/CubeSourcePickerTab.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubePalette } from '../../palette/CubePalette.js';
import { CubeCanvas } from '../CubeCanvas.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
/** The palette's transforms, in menu order */
const TRANSFORMS = [
  'Sort by Column',
  'Group by Column',
  'Filter by Column',
  'Restrict Columns',
  'Rename Columns',
  'Distinct Values',
  'Drop first <x> rows',
  'Take first <x> rows',
  'Take rows <x> to <y>',
  'Concatenate Another Input',
  'Join Another Input',
  'Compare Column Values',
  'Apply Window Functions',
];
const TABLE = 'Relational Database Table';
const PALETTE = [TABLE, 'Data Product (BETA)', ...TRANSFORMS];
const ITEMS = [...PALETTE, 'Select', 'Remove', 'Swap Inputs'];

const render = async (document?: CubeDocument): Promise<CubeEditorState> => {
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

const slice = (): CubeDocument =>
  new CubeDocument({ context: CONTEXT, query: sliceQuery() });

/** Right-clicks the element and returns the menu's items, by label */
const openMenu = async (
  target: Element,
): Promise<Map<string, HTMLButtonElement>> => {
  fireEvent.contextMenu(target);
  const menu = await screen.findByRole('menu');
  return new Map(
    within(menu)
      .getAllByRole<HTMLButtonElement>('button')
      .map((item) => [item.textContent ?? '', item]),
  );
};

/** Which items are enabled, in menu order */
const enabledItems = (items: Map<string, HTMLButtonElement>): string[] =>
  [...items].filter(([, item]) => !item.disabled).map(([label]) => label);

const closeMenu = async (): Promise<void> => {
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
};

/** Where the canvas takes a right-click around its nodes */
const canvasPane = (): Element =>
  document.querySelector('.react-flow__pane') ??
  screen.getByTestId(LEGEND_CUBE_TEST_ID.CANVAS);

beforeEach(() => {
  localStorage.clear();
});

describe('Canvas context menu', () => {
  test("Lists the palette, then the node's actions, each shown and disabled when it can't be done", async () => {
    await render(slice());
    let items = await openMenu(await TEST__findCanvasNode('join101'));
    expect([...items.keys()]).toEqual(ITEMS);
    // a table opens its dialog from any node, a cube of tables takes no data
    // product; a Join can be selected, removed and swapped
    expect(enabledItems(items)).toEqual([
      TABLE,
      ...TRANSFORMS,
      'Select',
      'Remove',
      'Swap Inputs',
    ]);
    await closeMenu();

    // the node Execute runs, with one input
    items = await openMenu(await TEST__findCanvasNode('filter101'));
    expect(enabledItems(items)).toEqual([TABLE, ...TRANSFORMS, 'Remove']);
    await closeMenu();

    items = await openMenu(await TEST__findCanvasNode('relational101'));
    expect(enabledItems(items)).toEqual([
      TABLE,
      ...TRANSFORMS,
      'Select',
      'Remove',
    ]);
  });

  test("Offers the palette around the nodes, the node's actions shown disabled, and no menu on an empty canvas", async () => {
    const editorState = await render(slice());
    await TEST__findCanvasNode('join101');
    const items = await openMenu(canvasPane());
    expect([...items.keys()]).toEqual(ITEMS);
    // a cube of tables takes no data product
    expect(enabledItems(items)).toEqual([TABLE, ...TRANSFORMS]);
    await closeMenu();

    // nothing to add after
    act(() => editorState.importDocument(new CubeDocument(), false));
    fireEvent.contextMenu(screen.getByText(/to start a new one/u));
    fireEvent.contextMenu(canvasPane());
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('Removes a node, as one undoable edit, without opening its editor', async () => {
    const editorState = await render(slice());
    const items = await openMenu(await TEST__findCanvasNode('join101'));
    fireEvent.click(items.get('Remove') as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    const { query } = editorState.document;
    expect(query.getNode('join101')).toBeUndefined();
    // its Left input now feeds what it fed
    expect(query.getInputIds('filter101')).toEqual(['relational101']);
    expect(editorState.history).toHaveLength(1);
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
  });

  test("Swaps a join's inputs, its key columns following them", async () => {
    const editorState = await render(slice());
    const join = editorState.document.query.getNode('join101') as Join;
    const items = await openMenu(await TEST__findCanvasNode('join101'));
    fireEvent.click(items.get('Swap Inputs') as HTMLButtonElement);
    const { query } = editorState.document;
    expect(query.getInputIds('join101')).toEqual([
      'relational102',
      'relational101',
    ]);
    const swapped = query.getNode('join101') as Join;
    expect(swapped.leftColumns).toEqual(join.rightColumns);
    expect(editorState.history).toHaveLength(1);
  });

  test('Selects a node, so Execute runs the query up to it', async () => {
    const editorState = await render(slice());
    const items = await openMenu(await TEST__findCanvasNode('join101'));
    fireEvent.click(items.get('Select') as HTMLButtonElement);
    expect(editorState.document.query.selected).toBe('join101');
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
  });

  test('Adds a transform after the node the menu was opened on, or after the selected node around the nodes, without opening its editor', async () => {
    const editorState = await render(slice());
    let items = await openMenu(await TEST__findCanvasNode('join101'));
    fireEvent.click(items.get('Filter by Column') as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    let { query } = editorState.document;
    expect(query.getInputIds('filter102')).toEqual(['join101']);
    // spliced in before the node the join fed
    expect(query.getInputIds('filter101')).toEqual(['filter102']);
    // the join wasn't the capture node, so the capture node stays
    expect(query.selected).toBe('filter101');
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
    expect(editorState.history).toHaveLength(1);

    act(() => editorState.select('join101'));
    const historyLength = editorState.history.length;
    items = await openMenu(canvasPane());
    fireEvent.click(items.get('Join Another Input') as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    query = editorState.document.query;
    expect(query.getInputIds('join102')).toEqual(['join101', undefined]);
    expect(query.getInputIds('filter102')).toEqual(['join102']);
    // added after the capture node, it becomes the capture node
    expect(query.selected).toBe('join102');
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
    expect(editorState.history).toHaveLength(historyLength + 1);
  });

  test.each<[string, () => Element | Promise<Element>]>([
    ['on a node', () => TEST__findCanvasNode('join101')],
    ['around the nodes', canvasPane],
  ])(
    'Opens the source dialog on its tab from the table item %s, adding no node',
    async (_where, target) => {
      const editorState = await render(slice());
      await TEST__findCanvasNode('join101');
      const { query } = editorState.document;
      // a tab open last, which the cube's own table tab overrides
      runInAction(() => {
        editorState.sourcePicker.activeTabKey =
          CubeSourcePickerTabKey.DATA_PRODUCT;
      });
      const items = await openMenu(await target());
      fireEvent.click(items.get(TABLE) as HTMLButtonElement);
      expect(editorState.sourcePicker.isOpen).toBe(true);
      expect(editorState.sourcePicker.activeTabKey).toBe(
        CubeSourcePickerTabKey.MODEL,
      );
      expect(editorState.document.query).toBe(query);
      expect(editorState.history).toHaveLength(0);
    },
  );

  test('Only selects in a read-only cube', async () => {
    const editorState = await render();
    await TEST__importDocument(editorState, slice(), true);
    const items = await openMenu(await TEST__findCanvasNode('join101'));
    expect(enabledItems(items)).toEqual(['Select']);
    fireEvent.click(items.get('Select') as HTMLButtonElement);
    expect(editorState.document.query.selected).toBe('join101');
  });
});

describe('Canvas context menu, with the node editor open', () => {
  /** The slice, then a Limit of 10 after its Filter, which Execute runs */
  const limitedSlice = (): CubeDocument => {
    const query = sliceQuery();
    return new CubeDocument({
      context: CONTEXT,
      query: new Query(
        [...query.nodes, new Limit('limit101', 10)],
        [...query.connections, new Connection('filter101', 'limit101', 'tds')],
        'limit101',
      ),
    });
  };

  /** Opens the Limit's editor and types a size, without applying it */
  const typeSize = async (
    editorState: CubeEditorState,
    text: string,
  ): Promise<void> => {
    fireEvent.click(await TEST__findCanvasNode('limit101'));
    act(() =>
      (editorState.nodeEditor.draft as CubeRowCountDraft<Limit>).setSizeText(
        text,
      ),
    );
  };

  const storedSize = (editorState: CubeEditorState): number | undefined =>
    (editorState.document.query.getNode('limit101') as Limit).size;

  test.each<[string, string, (query: Query) => void]>([
    [
      'Remove',
      'filter101',
      (query) => expect(query.getNode('filter101')).toBeUndefined(),
    ],
    [
      'Swap Inputs',
      'join101',
      (query) =>
        expect(query.getInputIds('join101')).toEqual([
          'relational102',
          'relational101',
        ]),
    ],
    ['Select', 'join101', (query) => expect(query.selected).toBe('join101')],
    [
      'Filter by Column',
      'relational101',
      (query) =>
        expect(query.getInputIds('filter102')).toEqual(['relational101']),
    ],
  ])(
    'Applies the open editor before %s on another node, as its own undo step',
    async (label, nodeId, expectDone) => {
      const editorState = await render(limitedSlice());
      await typeSize(editorState, '5');
      const items = await openMenu(await TEST__findCanvasNode(nodeId));
      fireEvent.click(items.get(label) as HTMLButtonElement);
      expect(storedSize(editorState)).toBe(5);
      expectDone(editorState.document.query);
      expect(editorState.nodeEditor.nodeId).toBeUndefined();
      expect(editorState.nodeEditor.notice).toBeUndefined();
      expect(editorState.history).toHaveLength(2);
    },
  );

  test('Does nothing from the menu while something opened from the node editor holds it open', async () => {
    const editorState = await render(limitedSlice());
    await typeSize(editorState, '5');
    act(() => {
      editorState.nodeEditor.holdOpen();
    });
    const items = await openMenu(await TEST__findCanvasNode('filter101'));
    fireEvent.click(items.get('Remove') as HTMLButtonElement);
    const { query } = editorState.document;
    expect(query.getNode('filter101')).toBeDefined();
    expect(storedSize(editorState)).toBe(10);
    expect(editorState.nodeEditor.nodeId).toBe('limit101');
    expect(editorState.nodeEditor.hasChanges).toBe(true);
    expect(editorState.history).toHaveLength(0);
  });
});

describe('Adding a concat', () => {
  const CONCAT = 'Concatenate Another Input';

  /** The palette beside the canvas */
  const renderWithPalette = async (
    document?: CubeDocument,
  ): Promise<CubeEditorState> => {
    const { host } = TEST__createCubeHost();
    const editorState = new CubeEditorState(host, document);
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

  /** The markup inside an icon's svg, which carries no class of its own */
  const iconMarkup = (element: Element | null): string | undefined =>
    (element?.tagName.toLowerCase() === 'svg'
      ? element
      : element?.querySelector('svg')
    )?.innerHTML;

  /** The markup inside the svg an icon draws on its own */
  const drawnIcon = (Icon: React.FC): string | undefined => {
    const { container, unmount } = renderElement(<Icon />);
    const markup = iconMarkup(container);
    unmount();
    container.remove();
    return markup;
  };

  test('Adds a concat that converts no types, from the palette or the canvas menu, drawn with its icon', async () => {
    const editorState = await renderWithPalette(slice());
    await TEST__findCanvasNode('join101');
    const concatIcon = drawnIcon(LayerGroupIcon);
    expect(concatIcon).toBeDefined();
    expect(concatIcon).not.toBe(drawnIcon(QuestionSquareIcon));
    expect(concatIcon).not.toBe(drawnIcon(ArrowsJoinIcon));
    /** The added concat, checked: a Concat, its types not converted, drawn with the concat icon */
    const expectConcat = async (nodeId: string): Promise<void> => {
      const node = editorState.document.query.getNode(nodeId);
      expect(node instanceof Concat).toBe(true);
      expect((node as Concat).widenTypes).toBe(false);
      const drawn = await TEST__findCanvasNode(nodeId);
      expect(
        within(drawn).getByText('Concatenate additional input'),
      ).toBeDefined();
      expect(iconMarkup(drawn.querySelector('svg'))).toBe(concatIcon);
    };

    // the palette's item, clicked, adds one after the capture node, which it becomes
    const paletteItem = within(
      screen.getByTestId(LEGEND_CUBE_TEST_ID.PALETTE),
    ).getByRole('button', { name: CONCAT });
    expect(iconMarkup(paletteItem.querySelector('svg'))).toBe(concatIcon);
    fireEvent.click(paletteItem);
    await expectConcat('concat101');
    expect(editorState.document.query.getInputIds('concat101')).toEqual([
      'filter101',
      undefined,
    ]);
    expect(editorState.document.query.selected).toBe('concat101');
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
    expect(editorState.history).toHaveLength(1);

    // the menu of a node adds one after it, the node feeding its First input
    let items = await openMenu(await TEST__findCanvasNode('join101'));
    fireEvent.click(items.get(CONCAT) as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await expectConcat('concat102');
    expect(editorState.document.query.getInputIds('concat102')).toEqual([
      'join101',
      undefined,
    ]);
    // spliced in before the node the join fed
    expect(editorState.document.query.getInputIds('filter101')).toEqual([
      'concat102',
    ]);
    expect(editorState.document.query.selected).toBe('concat101');
    expect(editorState.history).toHaveLength(2);

    // the menu around the nodes adds one after the capture node
    items = await openMenu(canvasPane());
    fireEvent.click(items.get(CONCAT) as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await expectConcat('concat103');
    expect(editorState.document.query.getInputIds('concat103')).toEqual([
      'concat101',
      undefined,
    ]);
    expect(editorState.document.query.selected).toBe('concat103');
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
    expect(editorState.history).toHaveLength(3);
  });
});
