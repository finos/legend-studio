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
  CubeDocument,
  PrimitiveType,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import {
  createCubeDirectModel,
  CUBE_DIRECT_RUNTIME_PATH,
} from '../../../graph-manager/CubeDirectConnection.js';
import type { CubeHost } from '../../../stores/CubeHost.js';
import { CubeEditor } from '../../CubeEditor.js';

const renderPage = async (
  prepare?: (host: CubeHost) => CubeHost,
  initialDocument?: CubeDocument,
): Promise<ReturnType<typeof TEST__createCubeHost>> => {
  const created = TEST__createCubeHost({
    schemas: new Map([
      [
        '"CUBE_DIRECT"."ORDERS"',
        new Schema([
          new SchemaColumn('ORDER_ID', PrimitiveType.get('Integer'), false),
        ]),
      ],
    ]),
  });
  const host = prepare?.(created.host) ?? created.host;
  await TEST__renderInCubeApplication(
    <CubeEditor host={host} initialDocument={initialDocument} />,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
  return created;
};

const openDialog = async (): Promise<HTMLElement> => {
  fireEvent.click(screen.getByText('add a table'));
  return screen.findByRole('dialog');
};

const tabStates = (dialog: HTMLElement): [string, boolean, boolean][] =>
  within(dialog)
    .getAllByRole('tab')
    .map((tab) => [
      tab.textContent ?? '',
      tab.getAttribute('aria-selected') === 'true',
      (tab as HTMLButtonElement).disabled,
    ]);

beforeEach(() => {
  localStorage.clear();
});

describe('Source dialog', () => {
  test('Opens on the Model tab of an "Add a source" dialog, with a Database connection tab beside it', async () => {
    await renderPage();
    const dialog = await openDialog();
    expect(within(dialog).getByText('Add a source')).toBeDefined();
    expect(tabStates(dialog)).toEqual([
      ['Model', true, false],
      ['Database connection', false, false],
    ]);
    expect(within(dialog).getByLabelText('Model')).toBeDefined();
    fireEvent.click(
      within(dialog).getByRole('tab', { name: 'Database connection' }),
    );
    expect(tabStates(dialog)).toEqual([
      ['Model', false, false],
      ['Database connection', true, false],
    ]);
    expect(within(dialog).getByLabelText('Setup SQL')).toBeDefined();
    expect(within(dialog).queryByLabelText('Model')).toBeNull();
  });

  test('Adds a table through the Database connection tab and shows it on the canvas', async () => {
    const { connections } = await renderPage();
    const dialog = await openDialog();
    fireEvent.click(
      within(dialog).getByRole('tab', { name: 'Database connection' }),
    );
    const add = within(dialog).getByRole<HTMLButtonElement>('button', {
      name: 'Add',
    });
    expect(add.disabled).toBe(true);
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Test connection' }),
    );
    const tables = await within(dialog).findByRole('list', { name: 'Tables' });
    expect(connections.listSchemas).toHaveBeenCalledTimes(1);
    fireEvent.click(within(tables).getByText('ORDERS'));
    expect(add.disabled).toBe(false);
    fireEvent.click(add);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await TEST__findCanvasNode('relational101')).toBeDefined();
  });

  test("Enables only a direct cube's own tab", async () => {
    await renderPage(
      undefined,
      new CubeDocument().withContext({
        model: createCubeDirectModel({ _type: 'saved' }),
        runtime: CUBE_DIRECT_RUNTIME_PATH,
      }),
    );
    const dialog = await openDialog();
    expect(tabStates(dialog)).toEqual([
      ['Model', false, true],
      ['Database connection', true, false],
    ]);
  });

  test('Shows no tabs when the host offers only models', async () => {
    await renderPage((host) => ({ ...host, connectionExplorer: undefined }));
    const dialog = await openDialog();
    expect(within(dialog).queryByRole('tablist')).toBeNull();
    expect(within(dialog).getByLabelText('Model')).toBeDefined();
  });
});
