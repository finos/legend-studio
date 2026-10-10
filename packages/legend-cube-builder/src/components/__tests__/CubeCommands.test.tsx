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
  collectKeyedCommandConfigEntriesFromConfig,
  type KeyedCommandConfigEntry,
  LegendApplicationPlugin,
  type LegendApplicationPluginManager,
} from '@finos/legend-application';
import {
  Connection,
  CubeDocument,
  type IR,
  Limit,
  Query,
} from '@finos/legend-cube';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  LEGEND_CUBE_COMMAND_CONFIG,
  LEGEND_CUBE_COMMAND_KEY,
} from '../../__lib__/LegendCubeCommand.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../__test-utils__/CubeCanvasTestUtils.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  TEST__chooseAddItem,
  TEST__renderInCubeApplication,
} from '../../__test-utils__/CubePageTestUtils.js';
import {
  TEST__createCubeApplicationStore,
  TEST__createCubeHost,
} from '../../__test-utils__/CubeTestApplication.js';
import type { FakeCubeEngine } from '../../__test-utils__/FakeCubeEngine.js';
import type { CubeResult } from '../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../stores/fixtures/CubeNorthwindModel.js';
import { CubeEditor } from '../CubeEditor.js';

/** Contributes Cube's key bindings, as a host's plugin does */
class TEST__CubeCommandsPlugin extends LegendApplicationPlugin {
  constructor() {
    super('TEST__CubeCommandsPlugin', '0.0.0');
  }

  install(
    pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>,
  ): void {
    pluginManager.registerApplicationPlugin(this);
  }

  override getExtraKeyedCommandConfigEntries(): KeyedCommandConfigEntry[] {
    return collectKeyedCommandConfigEntriesFromConfig(
      LEGEND_CUBE_COMMAND_CONFIG,
    );
  }
}

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

const ORDERS_RESULT: CubeResult = {
  columns: ORDERS_COLUMNS.map((column) => column.name),
  rows: [],
  sql: [],
  durationMs: 1,
};

const renderPage = async (
  document: CubeDocument = new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
      [],
      'relational101',
    ),
  }),
): Promise<{
  fake: FakeCubeEngine;
  host: ReturnType<typeof TEST__createCubeHost>['host'];
  editorState: CubeEditorState;
  unmount: () => void;
}> => {
  // the plugin is installed before the application store is made
  const applicationStore = TEST__createCubeApplicationStore([
    new TEST__CubeCommandsPlugin(),
  ]);
  const { host, fake } = TEST__createCubeHost(
    { result: ORDERS_RESULT },
    applicationStore,
  );
  // the page makes its own state: it is caught as the page registers its commands
  const spy = jest.spyOn(CubeEditorState.prototype, 'registerCommands');
  try {
    const { unmount } = await TEST__renderInCubeApplication(
      <CubeEditor host={host} initialDocument={document} />,
      applicationStore,
      LEGEND_CUBE_TEST_ID.EDITOR,
    );
    return {
      fake,
      host,
      editorState: guaranteeNonNullable(
        spy.mock.contexts[0] as CubeEditorState | undefined,
      ),
      unmount,
    };
  } finally {
    spy.mockRestore();
  }
};

const pressF9 = (target: Element | Document = document): void => {
  fireEvent.keyDown(target, { key: 'F9', code: 'F9' });
};

const pressUndo = (
  target: Element | Document = document,
  modifier: 'ctrlKey' | 'metaKey' = 'ctrlKey',
): void => {
  fireEvent.keyDown(target, { key: 'z', code: 'KeyZ', [modifier]: true });
};

const graph = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION);
const toolbar = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.GRID_TOOLBAR);

/** ORDERS, then a Limit of the size, which Execute runs */
const limitDocument = (size: number | undefined): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        new Limit('limit101', size),
      ],
      [new Connection('relational101', 'limit101', 'tds')],
      'limit101',
    ),
  });

/** The size field of the open Limit editor */
const sizeField = (): HTMLInputElement =>
  within(screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).getByLabelText(
    'Rows to keep',
  );

/** Opens the Limit's editor and types a size, without applying it */
const typeSize = async (
  text: string,
  focus = false,
): Promise<HTMLInputElement> => {
  fireEvent.click(await TEST__findCanvasNode('limit101'));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
  const size = sizeField();
  if (focus) {
    size.focus();
  }
  fireEvent.change(size, { target: { value: text } });
  return size;
};

/** The Limit sizes in the lambda of the first run */
const takesRun = (fake: FakeCubeEngine): string[] => {
  const takes: string[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
    } else if (typeof node === 'object' && node !== null) {
      const ir = node as IR & { origin?: { role: string } };
      if (ir.k === 'literal' && ir.origin?.role === 'take') {
        takes.push(String(ir.value.value));
      }
      Object.values(node).forEach(visit);
    }
  };
  visit(fake.execute.mock.calls[0]?.[1]);
  return takes;
};

beforeEach(() => {
  localStorage.clear();
});

describe('Cube keyboard shortcuts', () => {
  test('Executes on F9', async () => {
    const { fake } = await renderPage();
    pressF9();
    await waitFor(() => expect(fake.execute).toHaveBeenCalledTimes(1));
    await within(toolbar()).findByText(/rows? in/u);
  });

  test('Does nothing on F9 while Execute is disabled', async () => {
    const { fake, host } = await renderPage(new CubeDocument());
    const { commandService } = host.applicationStore;
    // a trigger that says no leaves the key to any other command bound to it
    expect(commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.EXECUTE)).toBe(
      false,
    );
    expect(commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.UNDO)).toBe(false);
    expect(
      within(toolbar()).getByText<HTMLButtonElement>('Execute').disabled,
    ).toBe(true);
    pressF9();
    expect(fake.execute).not.toHaveBeenCalled();
  });

  test('Does nothing on F9 while a run is going or a Cube dialog is open', async () => {
    const { fake, host } = await renderPage();
    fake.execute.mockImplementation(
      async () => new Promise<CubeResult>(() => undefined),
    );
    fireEvent.click(within(graph()).getByText('Show Pure'));
    await screen.findByRole('dialog');
    pressF9();
    expect(fake.execute).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Close'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    pressF9();
    expect(fake.execute).toHaveBeenCalledTimes(1);
    pressF9();
    expect(fake.execute).toHaveBeenCalledTimes(1);
    expect(
      host.applicationStore.commandService.runCommand(
        LEGEND_CUBE_COMMAND_KEY.EXECUTE,
      ),
    ).toBe(false);
  });

  test('Does nothing on F9 or Ctrl+Z while the source picker is open', async () => {
    const { fake } = await renderPage(
      new CubeDocument({ context: CONTEXT, query: sliceQuery() }),
    );
    fireEvent.click(await TEST__findCanvasNode('join101'), { ctrlKey: true });
    await TEST__chooseAddItem('Relational Database Table');
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('list', { name: 'Tables' });
    pressF9();
    pressUndo();
    expect(fake.execute).not.toHaveBeenCalled();
    expect(
      (await TEST__findCanvasNode('join101')).getAttribute('aria-current'),
    ).toBe('true');
  });

  test('Undoes on Ctrl+Z or Cmd+Z with the focus on the page', async () => {
    await renderPage(
      new CubeDocument({ context: CONTEXT, query: sliceQuery() }),
    );
    const select = async (nodeId: string): Promise<void> => {
      fireEvent.click(await TEST__findCanvasNode(nodeId), { ctrlKey: true });
    };
    const selected = async (nodeId: string): Promise<string | null> =>
      (await TEST__findCanvasNode(nodeId)).getAttribute('aria-current');
    await select('join101');
    await select('relational101');
    pressUndo();
    expect(await selected('join101')).toBe('true');
    pressUndo(document, 'metaKey');
    expect(await selected('filter101')).toBe('true');
    // nothing left to undo
    pressUndo();
    expect(await selected('filter101')).toBe('true');
  });

  test('Leaves Ctrl+Z to a text field with the focus, and does nothing while a Cube dialog is open', async () => {
    await renderPage(
      new CubeDocument({ context: CONTEXT, query: sliceQuery() }),
    );
    fireEvent.click(await TEST__findCanvasNode('join101'), { ctrlKey: true });
    const rowLimit = within(toolbar()).getByLabelText('Row limit');
    rowLimit.focus();
    pressUndo(rowLimit);
    expect(
      (await TEST__findCanvasNode('join101')).getAttribute('aria-current'),
    ).toBe('true');
    rowLimit.blur();
    fireEvent.click(within(graph()).getByText('Import (dev)'));
    await screen.findByRole('dialog');
    pressUndo();
    expect(
      (await TEST__findCanvasNode('join101')).getAttribute('aria-current'),
    ).toBe('true');
  });

  test("Leaves Ctrl+Z to the size field of a Limit's editor", async () => {
    await renderPage(
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
    const selected = async (nodeId: string): Promise<string | null> =>
      (await TEST__findCanvasNode(nodeId)).getAttribute('aria-current');
    fireEvent.click(await TEST__findCanvasNode('relational101'), {
      ctrlKey: true,
    });
    fireEvent.click(await TEST__findCanvasNode('limit101'));
    const size = within(
      await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR),
    ).getByLabelText('Rows to keep');
    size.focus();
    pressUndo(size);
    expect(await selected('relational101')).toBe('true');
    size.blur();
    pressUndo();
    expect(await selected('limit101')).toBe('true');
  });

  test('Applies the typed size of a Limit on F9 and runs it, as one undo step', async () => {
    const { fake } = await renderPage(limitDocument(10));
    const size = await typeSize('5', true);
    pressF9(size);
    await waitFor(() => expect(fake.execute).toHaveBeenCalledTimes(1));
    expect(takesRun(fake)).toEqual(['5']);
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    const undo = within(graph()).getByText<HTMLButtonElement>('Undo');
    expect(undo.disabled).toBe(false);
    fireEvent.click(undo);
    expect(undo.disabled).toBe(true);
    fireEvent.click(await TEST__findCanvasNode('limit101'));
    expect(sizeField().value).toBe('10');
  });

  test('Runs on F9 a query that only the edits in the open editor make valid, and does nothing without them', async () => {
    const { fake, host } = await renderPage(limitDocument(undefined));
    const { commandService } = host.applicationStore;
    expect(commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.EXECUTE)).toBe(
      false,
    );
    fireEvent.click(await TEST__findCanvasNode('limit101'));
    await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
    pressF9();
    expect(fake.execute).not.toHaveBeenCalled();
    fireEvent.change(sizeField(), { target: { value: '5' } });
    pressF9();
    await waitFor(() => expect(fake.execute).toHaveBeenCalledTimes(1));
    expect(takesRun(fake)).toEqual(['5']);
  });

  test('Does nothing on F9, Ctrl+Z, Execute or Undo while something opened from the node editor holds it open', async () => {
    const { fake, host, editorState } = await renderPage(limitDocument(10));
    const { commandService } = host.applicationStore;
    await typeSize('5');
    let release: () => void = () => undefined;
    act(() => {
      release = editorState.nodeEditor.holdOpen();
    });
    pressF9();
    pressUndo();
    expect(commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.EXECUTE)).toBe(
      false,
    );
    expect(commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.UNDO)).toBe(false);
    fireEvent.click(within(toolbar()).getByText('Execute'));
    fireEvent.click(within(graph()).getByText('Undo'));
    expect(fake.execute).not.toHaveBeenCalled();
    expect(sizeField().value).toBe('5');
    expect(editorState.history).toHaveLength(0);
    act(() => release());
    pressF9();
    await waitFor(() => expect(fake.execute).toHaveBeenCalledTimes(1));
    expect(takesRun(fake)).toEqual(['5']);
  });

  test('Applies the edits in the open editor on Ctrl+Z, then undoes only them, closing the editor without a notice', async () => {
    const { editorState } = await renderPage(limitDocument(10));
    const limit = editorState.document.query.getNode('limit101');
    fireEvent.click(await TEST__findCanvasNode('relational101'), {
      ctrlKey: true,
    });
    await typeSize('5');
    pressUndo();
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    expect(
      within(graph()).queryByTestId(LEGEND_CUBE_TEST_ID.EDITOR_NOTICE),
    ).toBeNull();
    expect(editorState.document.query.getNode('limit101')).toBe(limit);
    // the change before the edits stays
    expect(
      (await TEST__findCanvasNode('relational101')).getAttribute(
        'aria-current',
      ),
    ).toBe('true');
    expect(editorState.history).toHaveLength(1);
  });

  test('Drops the edits in the open editor on Ctrl+Z when there is nothing else to undo', async () => {
    const { editorState } = await renderPage(limitDocument(10));
    const limit = editorState.document.query.getNode('limit101');
    await typeSize('5');
    expect(document.activeElement?.tagName).not.toBe('INPUT');
    pressUndo();
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    expect(
      within(graph()).queryByTestId(LEGEND_CUBE_TEST_ID.EDITOR_NOTICE),
    ).toBeNull();
    expect(editorState.document.query.getNode('limit101')).toBe(limit);
    expect(editorState.history).toHaveLength(0);
  });

  test('Enables Undo while the open editor has edits and there is no history, and Undo then leaves the cube as it was', async () => {
    const { editorState } = await renderPage(limitDocument(10));
    const limit = editorState.document.query.getNode('limit101');
    const undo = within(graph()).getByText<HTMLButtonElement>('Undo');
    expect(undo.disabled).toBe(true);
    await typeSize('5');
    expect(undo.disabled).toBe(false);
    fireEvent.click(undo);
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    expect(
      within(graph()).queryByTestId(LEGEND_CUBE_TEST_ID.EDITOR_NOTICE),
    ).toBeNull();
    expect(editorState.document.query.getNode('limit101')).toBe(limit);
    expect(undo.disabled).toBe(true);
  });

  test('Applies the edits in the open editor when Execute is clicked, and runs them', async () => {
    const { fake } = await renderPage(limitDocument(10));
    await typeSize('5');
    fireEvent.click(within(toolbar()).getByText('Execute'));
    await waitFor(() => expect(fake.execute).toHaveBeenCalledTimes(1));
    expect(takesRun(fake)).toEqual(['5']);
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    expect(within(graph()).getByText<HTMLButtonElement>('Undo').disabled).toBe(
      false,
    );
  });

  test('Takes its commands away when the page closes', async () => {
    const { host, unmount } = await renderPage();
    const { commandRegistry } = host.applicationStore.commandService;
    expect(commandRegistry.has(LEGEND_CUBE_COMMAND_KEY.EXECUTE)).toBe(true);
    expect(commandRegistry.has(LEGEND_CUBE_COMMAND_KEY.UNDO)).toBe(true);
    unmount();
    expect(
      [...commandRegistry.keys()].filter((key) =>
        key.startsWith('legend-cube'),
      ),
    ).toEqual([]);
  });

  test('Names the shortcuts in the tooltips of Execute and Undo while they are disabled too', async () => {
    await renderPage(new CubeDocument());
    const execute = within(toolbar()).getByText<HTMLButtonElement>('Execute');
    expect(execute.disabled).toBe(true);
    expect(execute.title).toBe('• Add a table first.\n(F9)');
    const undo = within(graph()).getByText<HTMLButtonElement>('Undo');
    expect(undo.disabled).toBe(true);
    expect(undo.title).toBe('Undo the last change (Ctrl+Z / Cmd+Z)');
  });

  test('Names the shortcuts in the tooltips of Execute and Undo', async () => {
    await renderPage();
    expect(within(toolbar()).getByText('Execute').title).toBe(
      'Run the query up to the selected node (F9)',
    );
    expect(within(graph()).getByText('Undo').title).toBe(
      'Undo the last change (Ctrl+Z / Cmd+Z)',
    );
  });
});
