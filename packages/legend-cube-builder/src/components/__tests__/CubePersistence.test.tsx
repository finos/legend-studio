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
import { CubeDocument, Query, serializeCubeSpec } from '@finos/legend-cube';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  TEST__chooseCubeMenuItem,
  TEST__isCubeMenuItemDisabled,
  TEST__openCubeMenu,
  TEST__renderInCubeApplication,
} from '../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import { InMemoryCubeStore } from '../../__test-utils__/InMemoryCubeStore.js';
import {
  LOAD_ERROR_TITLE,
  UNSAVED_CHANGES_MESSAGE,
} from '../../__lib__/LegendCubePersistenceLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import { CubeDraft } from '../../graph-manager/CubeStore.js';
import { CUBE_NORTHWIND_MODEL } from '../../stores/fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../../stores/CubeEditorState.js';
import { CubeEditor } from '../CubeEditor.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

const ordersDocument = (name?: string): CubeDocument =>
  new CubeDocument({
    name,
    context: CONTEXT,
    query: new Query(
      [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
      [],
      'relational101',
    ),
  });

const renderPage = async (options?: {
  document?: CubeDocument;
  initialCubeId?: string;
  store?: InMemoryCubeStore;
}): Promise<{
  editorState: CubeEditorState;
  store: InMemoryCubeStore;
  onSavedCubeChange: jest.Mock<(cubeId: string | undefined) => void>;
}> => {
  const store = options?.store ?? new InMemoryCubeStore('alice');
  const { host } = TEST__createCubeHost();
  host.applicationStore.identityService.setCurrentUser('alice');
  const onSavedCubeChange = jest.fn<(cubeId: string | undefined) => void>();
  const spy = jest.spyOn(CubeEditorState.prototype, 'registerCommands');
  try {
    await TEST__renderInCubeApplication(
      <CubeEditor
        host={{ ...host, store }}
        initialDocument={options?.document}
        initialCubeId={options?.initialCubeId}
        onSavedCubeChange={onSavedCubeChange}
      />,
      host.applicationStore,
      LEGEND_CUBE_TEST_ID.EDITOR,
    );
    return {
      editorState: guaranteeNonNullable(
        spy.mock.contexts[0] as CubeEditorState | undefined,
      ),
      store,
      onSavedCubeChange,
    };
  } finally {
    spy.mockRestore();
  }
};

const header = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION);
const title = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.CUBE_TITLE);
const headerButton = (name: string): HTMLButtonElement =>
  within(header()).getByRole<HTMLButtonElement>('button', { name });

const saveInStore = async (
  store: InMemoryCubeStore,
  name: string,
): Promise<string> =>
  (
    await store.createCube(
      new CubeDraft(name, 1, serializeCubeSpec(ordersDocument(name)), []),
    )
  ).id;

beforeEach(() => {
  localStorage.clear();
});

describe("The cube's name and its unsaved changes (spec §17.10)", () => {
  test('Shows an asterisk until the cube is saved, and its id, version and owners on hover', async () => {
    const { store, onSavedCubeChange } = await renderPage({
      document: ordersDocument(),
    });
    expect(title().textContent).toBe('Unsaved Query *');
    expect(title().title).toBe(
      'Unsaved Query\nNot saved yet\nUnsaved changes to the query',
    );

    fireEvent.click(headerButton('Save'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Save cube')).not.toBeNull();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'French orders' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    expect(title().textContent).toBe('French orders');
    expect(title().title).toBe(
      'French orders\nId: cube-1\nVersion: 1\nOwners: alice',
    );
    expect(store.calls).toEqual(['create French orders']);
    expect(onSavedCubeChange).toHaveBeenLastCalledWith('cube-1');
    expect(headerButton('Save').title).toBe(
      'Save the cube as version 2 (Alt+S)',
    );
  });
});

describe('Load (spec §14.4, QUESTIONS.md U9)', () => {
  test('Opens the cube the address names, and says why when it cannot', async () => {
    const store = new InMemoryCubeStore('alice');
    const id = await saveInStore(store, 'Saved orders');
    await renderPage({ store, initialCubeId: id });
    await waitFor(() => expect(title().textContent).toBe('Saved orders'));
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.LOAD_ERROR)).toBeNull();
  });

  test('Shows "Error loading query!" in the graph area for a cube it cannot open', async () => {
    const { onSavedCubeChange } = await renderPage({ initialCubeId: 'nope' });
    const banner = await screen.findByTestId(LEGEND_CUBE_TEST_ID.LOAD_ERROR);
    expect(banner.textContent).toContain(LOAD_ERROR_TITLE);
    expect(banner.textContent).toContain("Can't find cube 'nope'");
    expect(title().textContent).toBe('Unsaved Query');
    // the address keeps the id
    expect(onSavedCubeChange).not.toHaveBeenCalled();
    fireEvent.click(within(banner).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.LOAD_ERROR)).toBeNull();
  });

  test('Lists saved cubes, opens one, and deletes one after a confirmation', async () => {
    const store = new InMemoryCubeStore('alice');
    await saveInStore(store, 'French orders');
    await saveInStore(store.asUser('bob'), 'Bob trades');
    const { onSavedCubeChange } = await renderPage({ store });
    await TEST__chooseCubeMenuItem('Load…');
    const dialog = await screen.findByRole('dialog');
    await waitFor(() =>
      expect(
        within(dialog).getAllByTestId(LEGEND_CUBE_TEST_ID.LOAD_DIALOG_ROW),
      ).toHaveLength(2),
    );
    const [bobRow, aliceRow] = within(dialog).getAllByTestId(
      LEGEND_CUBE_TEST_ID.LOAD_DIALOG_ROW,
    ) as [HTMLElement, HTMLElement];
    expect(bobRow.textContent).toContain('Bob trades');
    expect(bobRow.textContent).toContain('Owners: bob');
    // only the viewer's own cubes can be deleted
    expect(within(bobRow).queryByRole('button', { name: 'Delete' })).toBeNull();

    fireEvent.click(within(aliceRow).getByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByText(
      'Delete "French orders"? It will no longer be found or opened.',
    );
    fireEvent.click(
      within(
        guaranteeNonNullable(confirm.closest('[role="dialog"]')) as HTMLElement,
      ).getByRole('button', { name: 'Delete' }),
    );
    await waitFor(() =>
      expect(
        within(dialog).getAllByTestId(LEGEND_CUBE_TEST_ID.LOAD_DIALOG_ROW),
      ).toHaveLength(1),
    );

    const [remaining] = within(dialog).getAllByTestId(
      LEGEND_CUBE_TEST_ID.LOAD_DIALOG_ROW,
    ) as [HTMLElement];
    expect(remaining.textContent).toContain('Bob trades');
    fireEvent.click(
      await within(remaining).findByRole('button', { name: 'Open' }),
    );
    await waitFor(() => expect(title().textContent).toBe('Bob trades'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onSavedCubeChange).toHaveBeenLastCalledWith('cube-2');
    // another user's cube: Save as only, and no Delete
    expect(headerButton('Save').disabled).toBe(true);
    expect(await TEST__isCubeMenuItemDisabled('Save')).toBe(true);
    expect(await TEST__isCubeMenuItemDisabled('Save as…')).toBe(false);
    expect(await TEST__isCubeMenuItemDisabled('Delete…')).toBe(true);
  });
});

describe('New, Import and the confirmation (spec §17.14)', () => {
  test('Asks before New loses unsaved changes', async () => {
    const { onSavedCubeChange } = await renderPage({
      document: ordersDocument('Draft'),
    });
    await TEST__chooseCubeMenuItem('New');
    const confirm = await screen.findByText(UNSAVED_CHANGES_MESSAGE);
    const dialog = guaranteeNonNullable(
      confirm.closest('[role="dialog"]'),
    ) as HTMLElement;
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(title().textContent).toBe('Draft *');

    await TEST__chooseCubeMenuItem('New');
    fireEvent.click(
      within(
        guaranteeNonNullable(
          (await screen.findByText(UNSAVED_CHANGES_MESSAGE)).closest(
            '[role="dialog"]',
          ),
        ) as HTMLElement,
      ).getByRole('button', { name: 'Continue' }),
    );
    await waitFor(() => expect(title().textContent).toBe('Unsaved Query'));
    expect(onSavedCubeChange).not.toHaveBeenCalled();
  });

  test('Asks before Import replaces unsaved changes', async () => {
    await renderPage({ document: ordersDocument('Draft') });
    await TEST__chooseCubeMenuItem('Import');
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(
      within(dialog).getByRole('textbox', { name: 'Cube spec' }),
      {
        target: { value: serializeCubeSpec(ordersDocument('Imported')) },
      },
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Import' }));
    fireEvent.click(
      within(
        guaranteeNonNullable(
          (await screen.findByText(UNSAVED_CHANGES_MESSAGE)).closest(
            '[role="dialog"]',
          ),
        ) as HTMLElement,
      ).getByRole('button', { name: 'Continue' }),
    );
    await waitFor(() => expect(title().textContent).toBe('Imported *'));
  });

  test('Without a store, as in Studio, offers no Save or Load, and tracks no unsaved changes', async () => {
    const { host } = TEST__createCubeHost();
    await TEST__renderInCubeApplication(
      <CubeEditor host={host} initialDocument={ordersDocument('Draft')} />,
      host.applicationStore,
      LEGEND_CUBE_TEST_ID.EDITOR,
    );
    expect(title().textContent).toBe('Draft');
    expect(title().title).toBe('');
    expect(within(header()).queryByRole('button', { name: 'Save' })).toBeNull();
    const menu = await TEST__openCubeMenu();
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['New', 'Import', 'Import Pure', 'Export', 'Copy', 'Paste']);
    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

    // nothing to lose: New asks nothing
    await TEST__chooseCubeMenuItem('New');
    await waitFor(() => expect(title().textContent).toBe('Unsaved Query'));
    expect(screen.queryByText(UNSAVED_CHANGES_MESSAGE)).toBeNull();
  });
});
