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
  collectKeyedCommandConfigEntriesFromConfig,
  type KeyedCommandConfigEntry,
  LegendApplicationPlugin,
  type LegendApplicationPluginManager,
} from '@finos/legend-application';
import { Connection, CubeDocument, Limit, Query } from '@finos/legend-cube';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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
import { TEST__renderInCubeApplication } from '../../__test-utils__/CubePageTestUtils.js';
import {
  TEST__createCubeApplicationStore,
  TEST__createCubeHost,
} from '../../__test-utils__/CubeTestApplication.js';
import type { FakeCubeEngine } from '../../__test-utils__/FakeCubeEngine.js';
import type { CubeResult } from '../../graph-manager/CubeEngine.js';
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
  const { unmount } = await TEST__renderInCubeApplication(
    <CubeEditor host={host} initialDocument={document} />,
    applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
  return { fake, host, unmount };
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
    fireEvent.click(within(graph()).getByText('Add table'));
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
