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
  Core_LegendApplicationPlugin,
  LEGEND_APPLICATION_COLOR_THEME,
} from '@finos/legend-application';
import {
  Connection,
  CubeDocument,
  Filter,
  Join,
  Query,
  type Schema,
  UnknownNode,
} from '@finos/legend-cube';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { runInAction } from 'mobx';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import {
  TEST__findCanvasNode,
  TEST__getCanvasNodes,
  TEST__getCanvasNodeTooltip,
} from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import {
  TEST__createCubeApplicationStore,
  TEST__createCubeHost,
} from '../../../__test-utils__/CubeTestApplication.js';
import type { FakeCubeEngine } from '../../../__test-utils__/FakeCubeEngine.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas, isCubeCanvasConnectionValid } from '../CubeCanvas.js';
import {
  CUBE_OUTPUT_HANDLE_ID,
  getCubeCanvasNodeStatus,
} from '../CubeCanvasElements.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

const renderCanvas = async (
  document?: CubeDocument,
  prepare?: (fake: FakeCubeEngine) => void,
): Promise<CubeEditorState> => {
  const { host, fake } = TEST__createCubeHost();
  prepare?.(fake);
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

const hasState = (node: HTMLElement, state: string): boolean =>
  node.classList.contains(`legend-cube__node--${state}`);

/** ORDERS and CUSTOMERS joined, before any key is set, and a Filter after the Join */
const keylessJoin = (): Query =>
  new Query(
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
    'join101',
  );

beforeEach(() => {
  localStorage.clear();
});

describe('Cube canvas', () => {
  test('Labels the two inputs of a join Left and Right, as visible text', async () => {
    await renderCanvas(new CubeDocument({ query: sliceQuery() }));
    await TEST__findCanvasNode('join101');
    await waitFor(() =>
      expect(document.querySelectorAll('.react-flow__edge')).toHaveLength(3),
    );
    // the edge into the Filter has no label
    expect(
      screen
        .getAllByTestId(LEGEND_CUBE_TEST_ID.CANVAS_EDGE_LABEL)
        .map((label) => label.textContent),
    ).toEqual(['Left', 'Right']);
    // each label sits at the input it names: Left above Right
    const [left, right] = screen
      .getAllByTestId(LEGEND_CUBE_TEST_ID.CANVAS_EDGE_LABEL)
      .map(
        (label) =>
          /translate\((?<x>[-\d.]+)px, (?<y>[-\d.]+)px\)$/u.exec(
            label.style.transform,
          )?.groups,
      );
    expect(Number(left?.y)).toBeLessThan(Number(right?.y));
  });

  test('Draws every node 200 by 72, with an input handle per port, in port order, and one output', async () => {
    await renderCanvas(new CubeDocument({ query: sliceQuery() }));
    await TEST__findCanvasNode('join101');
    const wrapper = document.querySelector<HTMLElement>(
      '.react-flow__node[data-id="join101"]',
    );
    expect(wrapper?.style.width).toBe('200px');
    expect(wrapper?.style.height).toBe('72px');
    const handles = (nodeId: string): (string | null)[] =>
      Array.from(
        document.querySelectorAll(
          `.react-flow__node[data-id="${nodeId}"] .react-flow__handle`,
        ),
      ).map((handle) => handle.getAttribute('data-handleid'));
    expect(handles('join101')).toEqual([
      'leftTds',
      'rightTds',
      CUBE_OUTPUT_HANDLE_ID,
    ]);
    expect(handles('filter101')).toEqual(['tds', CUBE_OUTPUT_HANDLE_ID]);
    expect(handles('relational101')).toEqual([CUBE_OUTPUT_HANDLE_ID]);
  });

  test('Shows each node state with its own class', async () => {
    const state = await renderCanvas(
      new CubeDocument({ context: CONTEXT, query: keylessJoin() }),
    );
    const join = await TEST__findCanvasNode('join101');
    const filter = await TEST__findCanvasNode('filter101');
    const orders = await TEST__findCanvasNode('relational101');
    // the Join has an error of its own, so the Filter after it can't be checked
    expect(hasState(join, 'selected')).toBe(true);
    expect(hasState(join, 'invalid')).toBe(true);
    expect(hasState(join, 'incomplete')).toBe(false);
    expect(hasState(filter, 'incomplete')).toBe(true);
    expect(hasState(filter, 'invalid')).toBe(false);
    expect(hasState(filter, 'selected')).toBe(false);
    expect(
      ['selected', 'invalid', 'incomplete', 'resolving', 'engine-error'].some(
        (modifier) => hasState(orders, modifier),
      ),
    ).toBe(false);
    act(() =>
      state.setHostIssue(
        'relational101',
        new CubeEngineError(CubeEngineErrorKind.EXECUTION, 'Table gone'),
      ),
    );
    await waitFor(() => expect(hasState(orders, 'engine-error')).toBe(true));
    // its settings are fine: an engine error is not an error of its own
    expect(hasState(orders, 'invalid')).toBe(false);
    expect(TEST__getCanvasNodeTooltip(orders)[0]).toBe('Table gone');
  });

  test('Shows a node with an empty input port as incomplete', async () => {
    await renderCanvas(
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
    const join = await TEST__findCanvasNode('join101');
    expect(hasState(join, 'incomplete')).toBe(true);
    expect(hasState(join, 'invalid')).toBe(false);
  });

  test('Shows a table being typed again as resolving, until the engine answers', async () => {
    let answer: (value: Map<string, Schema | CubeEngineError>) => void = () =>
      undefined;
    const state = await renderCanvas(undefined, (fake) =>
      fake.resolveSchemas.mockReturnValueOnce(
        new Promise((resolve) => {
          answer = resolve;
        }),
      ),
    );
    act(() =>
      state.importDocument(
        new CubeDocument({
          context: CONTEXT,
          query: new Query(
            [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
            [],
            'relational101',
          ),
        }),
        false,
      ),
    );
    const orders = await TEST__findCanvasNode('relational101');
    expect(hasState(orders, 'resolving')).toBe(true);
    await act(async () => {
      answer(new Map());
      await Promise.resolve();
    });
    await waitFor(() => expect(hasState(orders, 'resolving')).toBe(false));
  });

  test('Puts errors first in a node tooltip, each once, then warnings, its description and its id', async () => {
    const state = await renderCanvas(
      new CubeDocument({ context: CONTEXT, query: keylessJoin() }),
    );
    act(() =>
      runInAction(() => {
        state.setHostIssue(
          'join101',
          new CubeEngineError(
            CubeEngineErrorKind.COMPILE,
            'Left join columns cannot be empty.\nat line 1',
          ),
        );
        const orders = state.document.query.getNode('relational101');
        state.warnings = new Map([
          [orders?.key ?? 0, ['This table changed since the cube was saved']],
        ]);
      }),
    );
    await waitFor(async () =>
      expect(
        TEST__getCanvasNodeTooltip(await TEST__findCanvasNode('join101')),
      ).toEqual([
        'Left join columns cannot be empty.',
        'Join additional input',
        'join101',
      ]),
    );
    expect(
      TEST__getCanvasNodeTooltip(await TEST__findCanvasNode('relational101')),
    ).toEqual([
      'This table changed since the cube was saved',
      'Table "ORDERS" from schema "NORTHWIND"',
      'relational101',
    ]);
    // the upstream error, in words, on the node after the join
    expect(
      TEST__getCanvasNodeTooltip(await TEST__findCanvasNode('filter101'))[0],
    ).toBe(
      'This node depends on some invalid inputs. Please correct these first.',
    );
  });

  test('Opens the editor on a click, without changing which node Execute runs', async () => {
    const state = await renderCanvas(new CubeDocument({ query: sliceQuery() }));
    fireEvent.click(await TEST__findCanvasNode('join101'));
    expect(state.nodeEditor.nodeId).toBe('join101');
    expect(state.document.query.selected).toBe('filter101');
    expect(state.history).toHaveLength(0);
  });

  test('Makes a node the one Execute runs on Ctrl-click or Cmd-click', async () => {
    const state = await renderCanvas(new CubeDocument({ query: sliceQuery() }));
    fireEvent.click(await TEST__findCanvasNode('join101'), { ctrlKey: true });
    expect(state.document.query.selected).toBe('join101');
    fireEvent.click(await TEST__findCanvasNode('relational102'), {
      metaKey: true,
    });
    expect(state.document.query.selected).toBe('relational102');
    expect(state.history).toHaveLength(2);
    // the node Execute already runs: nothing to do
    fireEvent.click(await TEST__findCanvasNode('relational102'), {
      ctrlKey: true,
    });
    expect(state.history).toHaveLength(2);
    expect(state.nodeEditor.nodeId).toBeUndefined();
    await waitFor(async () =>
      expect(
        (await TEST__findCanvasNode('relational102')).getAttribute(
          'aria-current',
        ),
      ).toBe('true'),
    );
  });

  test('Selects on Ctrl-click in a read-only cube too', async () => {
    const state = await renderCanvas();
    act(() =>
      state.importDocument(new CubeDocument({ query: sliceQuery() }), true),
    );
    fireEvent.click(await TEST__findCanvasNode('join101'), { ctrlKey: true });
    expect(state.document.query.selected).toBe('join101');
    // and its handles can't start or take a connection
    expect(
      document.querySelectorAll('.react-flow__handle.connectable'),
    ).toHaveLength(0);
  });

  test('Draws an Unknown node and its edges, unlabelled', async () => {
    await renderCanvas(
      new CubeDocument({
        query: new Query(
          [
            northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
            new UnknownNode('pivot101', 1, { kind: 'pivot' }),
            new Filter('filter101'),
          ],
          [
            new Connection('relational101', 'pivot101', 'in0'),
            new Connection('pivot101', 'filter101', 'tds'),
          ],
          'filter101',
        ),
      }),
    );
    const unknown = await TEST__findCanvasNode('pivot101');
    expect(
      within(unknown).getByText('Unknown Transform "pivot101"'),
    ).toBeDefined();
    await waitFor(() =>
      expect(document.querySelectorAll('.react-flow__edge')).toHaveLength(2),
    );
    expect(
      screen.queryAllByTestId(LEGEND_CUBE_TEST_ID.CANVAS_EDGE_LABEL),
    ).toHaveLength(0);
    // nothing can be connected into it
    expect(
      document
        .querySelector(
          '.react-flow__node[data-id="pivot101"] .react-flow__handle[data-handleid="in0"]',
        )
        ?.classList.contains('connectable'),
    ).toBe(false);
  });

  test('Offers to add a table when the cube is empty', async () => {
    const state = await renderCanvas();
    expect(TEST__getCanvasNodes()).toHaveLength(0);
    const canvas = screen.getByTestId(LEGEND_CUBE_TEST_ID.CANVAS);
    expect(canvas.textContent).toBe('No tables yet: add a table to start.');
    fireEvent.click(within(canvas).getByText('add a table'));
    expect(state.sourcePicker.isOpen).toBe(true);
  });

  test('Offers no table to add when an empty cube is read-only', async () => {
    const state = await renderCanvas();
    act(() => state.importDocument(new CubeDocument(), true));
    const link = within(
      screen.getByTestId(LEGEND_CUBE_TEST_ID.CANVAS),
    ).getByText<HTMLButtonElement>('add a table');
    expect(link.disabled).toBe(true);
  });
});

describe('Cube canvas, more', () => {
  /**
   * Runs `run` with what React Flow's click-to-connect needs and jsdom
   * lacks: with nothing laid out, React Flow then takes the clicked handle
   */
  const withClickConnect = async (run: () => Promise<void>): Promise<void> => {
    const added: [object, string][] = [];
    const stub = (target: object, name: string, value: unknown): void => {
      if (!(name in target)) {
        Object.defineProperty(target, name, {
          configurable: true,
          writable: true,
          value,
        });
        added.push([target, name]);
      }
    };
    stub(document, 'elementFromPoint', (): Element | null => null);
    stub(globalThis, 'structuredClone', (value: unknown): unknown =>
      JSON.parse(JSON.stringify(value)),
    );
    try {
      await run();
    } finally {
      added.forEach(([target, name]) => {
        delete (target as Record<string, unknown>)[name];
      });
    }
  };

  const handle = (nodeId: string, handleId: string): Element =>
    document.querySelector(
      `.react-flow__node[data-id="${nodeId}"] .react-flow__handle[data-handleid="${handleId}"]`,
    ) as Element;

  test('Leaves the mouse on a node body to the HTML drag, so React Flow neither moves the node nor pans', async () => {
    await renderCanvas(new CubeDocument({ query: sliceQuery() }));
    await TEST__findCanvasNode('join101');
    const nodes = TEST__getCanvasNodes();
    expect(nodes).toHaveLength(4);
    nodes.forEach((node) => {
      expect(node.classList.contains('nodrag')).toBe(true);
      // React Flow adds no 'nopan' itself while nodes can't be dragged
      expect(node.classList.contains('nopan')).toBe(true);
    });
  });

  test("Draws the canvas in the page's color theme, with background, controls and a minimap, and no attribution", async () => {
    const applicationStore = TEST__createCubeApplicationStore([
      new Core_LegendApplicationPlugin(),
    ]);
    const { host } = TEST__createCubeHost(undefined, applicationStore);
    const editorState = new CubeEditorState(
      host,
      new CubeDocument({ query: sliceQuery() }),
    );
    await TEST__renderInCubeApplication(
      <div style={{ width: 800, height: 400 }}>
        <CubeCanvas editorState={editorState} />
      </div>,
      applicationStore,
      LEGEND_CUBE_TEST_ID.CANVAS,
    );
    await TEST__findCanvasNode('join101');
    const chrome = (): Record<string, boolean> => {
      const flow = document.querySelector('.react-flow');
      return {
        dark: Boolean(flow?.classList.contains('dark')),
        light: Boolean(flow?.classList.contains('light')),
        minimap: document.querySelector('.react-flow__minimap') !== null,
        controls: document.querySelector('.react-flow__controls') !== null,
        background: document.querySelector('.react-flow__background') !== null,
        attribution:
          document.querySelector('.react-flow__attribution') !== null,
      };
    };
    expect(
      applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled,
    ).toBe(false);
    expect(chrome()).toEqual({
      dark: true,
      light: false,
      minimap: true,
      controls: true,
      background: true,
      attribution: false,
    });
    await act(async () => {
      applicationStore.layoutService.setColorTheme(
        LEGEND_APPLICATION_COLOR_THEME.LEGACY_LIGHT,
      );
    });
    expect(
      applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled,
    ).toBe(true);
    expect(chrome()).toMatchObject({ dark: false, light: true });
  });

  test('Opens a node on Enter or Space, selects it with Ctrl or Cmd, and gives no keyboard help it does not honour', async () => {
    const state = await renderCanvas(new CubeDocument({ query: sliceQuery() }));
    await TEST__findCanvasNode('join101');
    const wrapper = document.querySelector<HTMLElement>(
      '.react-flow__node[data-id="join101"]',
    ) as HTMLElement;
    expect(wrapper.getAttribute('aria-describedby')).toBeNull();
    wrapper.focus();
    fireEvent.keyDown(wrapper, { key: 'Enter' });
    expect(state.nodeEditor.nodeId).toBe('join101');
    const filter = document.querySelector<HTMLElement>(
      '.react-flow__node[data-id="relational101"]',
    ) as HTMLElement;
    fireEvent.keyDown(filter, { key: ' ', ctrlKey: true });
    expect(state.document.query.selected).toBe('relational101');
    expect(state.nodeEditor.nodeId).toBe('join101');
    // other keys do nothing
    fireEvent.keyDown(filter, { key: 'Delete' });
    expect(state.document.query.getNode('relational101')).toBeDefined();
  });

  test("Doesn't open a node's editor on a click on one of its handles", () =>
    withClickConnect(async () => {
      const state = await renderCanvas(
        new CubeDocument({ query: sliceQuery() }),
      );
      await TEST__findCanvasNode('join101');
      fireEvent.click(handle('join101', CUBE_OUTPUT_HANDLE_ID));
      fireEvent.click(handle('join101', 'leftTds'));
      expect(state.nodeEditor.nodeId).toBeUndefined();
      fireEvent.click(await TEST__findCanvasNode('join101'));
      expect(state.nodeEditor.nodeId).toBe('join101');
    }));

  test('Connects a node to the port of the handle it is clicked to, and nothing else', () =>
    withClickConnect(async () => {
      const state = await renderCanvas(
        new CubeDocument({
          query: new Query(
            [
              northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
              northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
              new Join('join101'),
            ],
            [],
            'join101',
          ),
        }),
      );
      await TEST__findCanvasNode('join101');
      fireEvent.click(handle('relational102', CUBE_OUTPUT_HANDLE_ID));
      fireEvent.click(handle('join101', 'rightTds'));
      expect(state.document.query.connections).toEqual([
        new Connection('relational102', 'join101', 'rightTds'),
      ]);
      // CUSTOMERS already feeds the Join
      fireEvent.click(handle('relational102', CUBE_OUTPUT_HANDLE_ID));
      fireEvent.click(handle('join101', 'leftTds'));
      expect(state.document.query.connections).toHaveLength(1);
      expect(state.nodeEditor.nodeId).toBeUndefined();
    }));

  test('Leads the tooltip of a node with no validity entry with the R104 notice', () => {
    const state = new CubeEditorState(
      TEST__createCubeHost().host,
      new CubeDocument({ query: sliceQuery() }),
    );
    // a node the query doesn't hold, so inference has no entry for it
    const ghost = new Filter('filter999');
    expect(getCubeCanvasNodeStatus(state, ghost).tooltip.split('\n')).toEqual([
      'This node depends on some invalid inputs.',
      ghost.describe(),
      'filter999',
    ]);
  });
});

describe('Connecting by dragging between handles', () => {
  const query = (): Query =>
    new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
        new Join('join101'),
      ],
      [new Connection('relational101', 'join101', 'leftTds')],
      'join101',
    );

  test('Allows only an output into a free input port that the query lets it feed', () => {
    const connection = (
      source: string,
      target: string,
      targetHandle: string | null,
      sourceHandle: string | null = CUBE_OUTPUT_HANDLE_ID,
    ) => ({ source, target, sourceHandle, targetHandle });
    expect(
      isCubeCanvasConnectionValid(
        query(),
        connection('relational102', 'join101', 'rightTds'),
      ),
    ).toBe(true);
    // the Left port is taken
    expect(
      isCubeCanvasConnectionValid(
        query(),
        connection('relational102', 'join101', 'leftTds'),
      ),
    ).toBe(false);
    // ORDERS already feeds the join
    expect(
      isCubeCanvasConnectionValid(
        query(),
        connection('relational101', 'join101', 'rightTds'),
      ),
    ).toBe(false);
    expect(
      isCubeCanvasConnectionValid(
        query(),
        connection('relational102', 'join101', null),
      ),
    ).toBe(false);
    expect(
      isCubeCanvasConnectionValid(
        query(),
        connection('relational102', 'join101', 'rightTds', 'leftTds'),
      ),
    ).toBe(false);
  });
});
