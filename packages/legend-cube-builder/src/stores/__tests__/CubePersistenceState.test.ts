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
  ColumnComparisonFilter,
  Connection,
  CubeDocument,
  Filter,
  FilterOperator,
  parseCubeSpec,
  Query,
  serializeCubeSpec,
} from '@finos/legend-cube';
import { flowResult, when } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import { InMemoryCubeStore } from '../../__test-utils__/InMemoryCubeStore.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { LEGEND_CUBE_COMMAND_KEY } from '../../__lib__/LegendCubeCommand.js';
import { READ_ONLY_CUBE_TITLE } from '../../__lib__/LegendCubeLabels.js';
import {
  EMPTY_CUBE_SAVE_TITLE,
  NO_CUBE_STORE_TITLE,
  NOT_OWNER_SAVE_TITLE,
  UNSAVED_CHANGES_MESSAGE,
} from '../../__lib__/LegendCubePersistenceLabels.js';
import {
  CubeDraft,
  CubeStoreErrorKind,
} from '../../graph-manager/CubeStore.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CUBE_SPEC_TRANSFER_MODE } from '../CubeSpecTransferState.js';

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

/** ORDERS filtered on an order id that isn't a number: invalid */
const invalidDocument = (): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        new Filter(
          'filter101',
          new ColumnComparisonFilter('ORDER_ID', FilterOperator.EQUAL, {
            kind: 'invalid',
            text: 'ten',
          }),
        ),
      ],
      [new Connection('relational101', 'filter101', 'tds')],
      'filter101',
    ),
  });

const createPage = (
  document = new CubeDocument(),
  options?: { withStore?: boolean; user?: string },
): {
  editorState: CubeEditorState;
  store: InMemoryCubeStore;
  fake: ReturnType<typeof TEST__createCubeHost>['fake'];
} => {
  const store = new InMemoryCubeStore(options?.user ?? 'alice');
  const { host, fake } = TEST__createCubeHost();
  host.applicationStore.identityService.setCurrentUser(
    options?.user ?? 'alice',
  );
  const editorState = new CubeEditorState(
    options?.withStore === false ? host : { ...host, store },
    document,
  );
  return { editorState, store, fake };
};

/** A cube saved by someone, as the store holds it */
const saveInStore = async (
  store: InMemoryCubeStore,
  document: CubeDocument,
  name: string,
): Promise<string> =>
  (
    await store.createCube(
      new CubeDraft(name, 1, serializeCubeSpec(document), []),
    )
  ).id;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('The modified state (spec §17.10)', () => {
  test('A new cube is modified once it has a node, and not after it is saved', async () => {
    const { editorState } = createPage();
    const { persistence } = editorState;
    expect(persistence.isModified).toBe(false);
    editorState.applyDocument(ordersDocument());
    expect(persistence.isQueryModified).toBe(true);
    expect(persistence.isPresentationModified).toBe(false);

    persistence.save();
    expect(persistence.saveDialog.isOpen).toBe(true);
    persistence.saveDialog.setName('  French orders  ');
    await persistence.saveDialog.confirm();
    expect(persistence.saveDialog.isOpen).toBe(false);
    expect(persistence.savedCube?.name).toBe('French orders');
    expect(editorState.document.name).toBe('French orders');
    expect(persistence.isModified).toBe(false);
  });

  test('Tracks the query and the presentation apart, and undoing back clears both', async () => {
    const { editorState, store } = createPage();
    const id = await saveInStore(store, ordersDocument('Orders'), 'Orders');
    const { persistence } = editorState;
    expect(await flowResult(persistence.openCube(id))).toBe(true);
    expect(persistence.isModified).toBe(false);

    editorState.setColumnWidth('ORDER_ID', 180);
    expect(persistence.isPresentationModified).toBe(true);
    expect(persistence.isQueryModified).toBe(false);

    editorState.applyDocument(editorState.document.withName('Renamed'));
    expect(persistence.isQueryModified).toBe(true);
    editorState.undo();
    expect(persistence.isQueryModified).toBe(false);

    editorState.setShowGraph(false);
    expect(persistence.isPresentationModified).toBe(true);
    editorState.undo();
    // widths take no undo step, so the presentation is still the one changed
    expect(persistence.isPresentationModified).toBe(true);
    expect(persistence.isQueryModified).toBe(false);
  });
});

describe('Save and Save as (spec §14.4)', () => {
  test('Saves a saved cube at once, over the version the page knows', async () => {
    const { editorState, store } = createPage();
    const id = await saveInStore(store, ordersDocument('Orders'), 'Orders');
    const { persistence } = editorState;
    await flowResult(persistence.openCube(id));
    editorState.applyDocument(editorState.document.withName('Orders, again'));
    expect(persistence.isModified).toBe(true);

    persistence.save();
    expect(persistence.saveDialog.isOpen).toBe(false);
    await when(() => !persistence.isPending);
    expect(store.calls).toContain(`save ${id}@1`);
    expect(persistence.savedCube?.version).toBe(2);
    expect(persistence.isModified).toBe(false);
    const saved = await store.getCube(id);
    expect(saved.name).toBe('Orders, again');
    expect(parseCubeSpec(saved.content).document.name).toBe('Orders, again');
  });

  test('A version saved elsewhere since opens the Save dialog, saying why, to save a copy', async () => {
    const { editorState, store } = createPage();
    const id = await saveInStore(store, ordersDocument('Orders'), 'Orders');
    const { persistence } = editorState;
    await flowResult(persistence.openCube(id));
    // another tab saves first
    await store.saveCube(
      id,
      1,
      new CubeDraft(
        'Theirs',
        1,
        serializeCubeSpec(ordersDocument('Theirs')),
        [],
      ),
    );
    editorState.setShowGraph(false);
    persistence.save();
    await when(() => !persistence.isPending);
    expect(persistence.saveDialog.isOpen).toBe(true);
    expect(persistence.saveDialog.error).toBe(
      `Cannot change version 1 of cube '${id}': its current version is 2.`,
    );
    // nothing was overwritten
    expect((await store.getCube(id)).name).toBe('Theirs');

    persistence.saveDialog.setName('Mine');
    await persistence.saveDialog.confirm();
    expect(persistence.currentId).not.toBe(id);
    expect(persistence.savedCube?.name).toBe('Mine');
    expect(persistence.savedCube?.owners).toEqual(['alice']);
    expect(persistence.isModified).toBe(false);
  });

  test("Saves another user's cube only as a copy", async () => {
    const { editorState, store } = createPage();
    const id = await saveInStore(
      store.asUser('bob'),
      ordersDocument('Bob orders'),
      'Bob orders',
    );
    const { persistence } = editorState;
    await flowResult(persistence.openCube(id));
    expect(persistence.isOwner).toBe(false);
    expect(persistence.saveDisabledReason).toBe(NOT_OWNER_SAVE_TITLE);
    expect(persistence.saveAsDisabledReason).toBeUndefined();
    expect(persistence.deleteDisabledReason).toBe(
      "Only this cube's owners can delete it.",
    );
    persistence.save();
    expect(store.calls).not.toContain(`save ${id}@1`);
    persistence.saveAs();
    expect(persistence.saveDialog.name).toBe('Bob orders');
    persistence.saveDialog.setName('My copy');
    await persistence.saveDialog.confirm();
    expect(persistence.savedCube?.owners).toEqual(['alice']);
    expect((await store.getCube(id)).name).toBe('Bob orders');
  });

  test('Is disabled without a store, for an empty, invalid or read-only cube', () => {
    expect(
      createPage(ordersDocument(), { withStore: false }).editorState.persistence
        .saveDisabledReason,
    ).toBe(NO_CUBE_STORE_TITLE);
    expect(
      createPage(new CubeDocument()).editorState.persistence.saveDisabledReason,
    ).toBe(EMPTY_CUBE_SAVE_TITLE);
    const invalid = createPage(invalidDocument()).editorState.persistence;
    expect(invalid.saveDisabledReason).toMatch(
      /^A cube is saved only when every step is valid: /u,
    );
    expect(invalid.saveAsDisabledReason).toBe(invalid.saveDisabledReason);

    const { editorState } = createPage();
    editorState.importDocument(ordersDocument(), true);
    expect(editorState.persistence.saveDisabledReason).toBe(
      READ_ONLY_CUBE_TITLE,
    );
    // Export is allowed for an invalid cube; Save isn't (PLAN Appendix A)
    expect(invalid.loadDisabledReason).toBeUndefined();
  });

  test('Keeps the Save dialog open, saying why, when the store refuses', async () => {
    const { editorState, store } = createPage(ordersDocument());
    const { persistence } = editorState;
    persistence.save();
    expect(persistence.saveDialog.nameError).toBe('Name the cube.');
    await persistence.saveDialog.confirm();
    expect(store.calls).toEqual([]);
    persistence.saveDialog.setName('Orders');
    store.failNext(
      CubeStoreErrorKind.UNAVAILABLE,
      'Cube store MongoDB database has not been configured properly',
    );
    await persistence.saveDialog.confirm();
    expect(persistence.saveDialog.isOpen).toBe(true);
    expect(persistence.saveDialog.error).toBe(
      'Cube store MongoDB database has not been configured properly',
    );
    expect(persistence.currentId).toBeUndefined();
  });
});

describe('Load (spec §14.4, QUESTIONS.md U9)', () => {
  test("Opens a saved cube without running it, under the store's name", async () => {
    const { editorState, store, fake } = createPage();
    const id = await saveInStore(store, ordersDocument('Old name'), 'New name');
    const { persistence } = editorState;
    expect(await flowResult(persistence.openCube(id, true))).toBe(true);
    expect(editorState.document.name).toBe('New name');
    expect(editorState.document.query.nodes.map((node) => node.id)).toEqual([
      'relational101',
    ]);
    expect(persistence.currentId).toBe(id);
    expect(persistence.loadError).toBeUndefined();
    expect(fake.execute).not.toHaveBeenCalled();
    await when(() => !editorState.isResolvingSources);
    expect(persistence.isModified).toBe(false);
  });

  test('Says why a cube could not be opened: in the graph area from the address, else in the dialog', async () => {
    const { editorState, store } = createPage(ordersDocument());
    const { persistence } = editorState;
    expect(await flowResult(persistence.openCube('nope', true))).toBe(false);
    expect(persistence.loadError).toBe("Can't find cube 'nope'");
    expect(editorState.document.query.nodes).toHaveLength(1);

    const broken = (
      await store.createCube(
        new CubeDraft('Broken', 1, '{"formatVersion":1,"query":{}}', []),
      )
    ).id;
    persistence.openLoadDialog();
    expect(await flowResult(persistence.openCube(broken))).toBe(false);
    expect(persistence.loadDialog.error).toBe(
      "Can't read the saved cube: query.nodes is required",
    );
    expect(persistence.currentId).toBeUndefined();

    const noStore = createPage(undefined, { withStore: false }).editorState
      .persistence;
    expect(await flowResult(noStore.openCube('a', true))).toBe(false);
    expect(noStore.loadError).toBe(NO_CUBE_STORE_TITLE);
  });

  test("Searches the store as the viewer types, and lists only the viewer's cubes when asked", async () => {
    const { editorState, store } = createPage();
    await saveInStore(store, ordersDocument(), 'French orders');
    await saveInStore(store.asUser('bob'), ordersDocument(), 'Bob trades');
    const { loadDialog } = editorState.persistence;
    editorState.persistence.openLoadDialog();
    await when(
      () => loadDialog.results !== undefined && !loadDialog.isSearching,
    );
    expect(loadDialog.results?.map((cube) => cube.name)).toEqual([
      'Bob trades',
      'French orders',
    ]);
    loadDialog.setSearchText('FRENCH');
    await when(
      () => loadDialog.results?.length === 1 && !loadDialog.isSearching,
    );
    expect(loadDialog.results?.[0]?.name).toBe('French orders');
    loadDialog.setSearchText('');
    loadDialog.setOnlyMine(true);
    // the observable first: the store's calls aren't one
    await when(
      () => !loadDialog.isSearching && store.calls.at(-1) === 'search ',
    );
    expect(loadDialog.results?.map((cube) => cube.name)).toEqual([
      'French orders',
    ]);
    loadDialog.close();
  });

  test('Asks before unsaved changes are lost, and opens nothing when the viewer declines', async () => {
    const { editorState, store } = createPage(ordersDocument());
    const id = await saveInStore(store, ordersDocument('Saved'), 'Saved');
    const { persistence } = editorState;
    persistence.loadCube(id);
    expect(persistence.confirmation?.message).toBe(UNSAVED_CHANGES_MESSAGE);
    persistence.cancelConfirmation();
    expect(store.calls).not.toContain(`get ${id}`);
    persistence.loadCube(id);
    persistence.confirm();
    await when(() => !persistence.isPending);
    expect(persistence.currentId).toBe(id);
  });
});

describe('New, Delete and undo', () => {
  test('New asks first, then empties the page; undo shows the saved cube again', async () => {
    const { editorState, store } = createPage();
    const id = await saveInStore(store, ordersDocument('Orders'), 'Orders');
    const { persistence } = editorState;
    await flowResult(persistence.openCube(id));
    persistence.newCube();
    // nothing unsaved: no question
    expect(persistence.confirmation).toBeUndefined();
    expect(editorState.document.query.nodes).toHaveLength(0);
    expect(persistence.currentId).toBeUndefined();

    editorState.undo();
    expect(persistence.currentId).toBe(id);
    expect(persistence.isModified).toBe(false);

    editorState.applyDocument(editorState.document.withName('Edited'));
    persistence.newCube();
    expect(persistence.confirmation?.message).toBe(UNSAVED_CHANGES_MESSAGE);
    persistence.confirm();
    expect(editorState.document.query.nodes).toHaveLength(0);
    editorState.undo();
    expect(persistence.currentId).toBe(id);
    expect(persistence.isQueryModified).toBe(true);
  });

  test('Redo follows the saved cube too, and New does nothing on an empty cube', async () => {
    const { editorState, store } = createPage();
    const { persistence } = editorState;
    // nothing to empty yet
    persistence.newCube();
    expect(editorState.canUndo).toBe(false);

    const id = await saveInStore(store, ordersDocument('Orders'), 'Orders');
    await flowResult(persistence.openCube(id));
    persistence.newCube();
    expect(persistence.currentId).toBeUndefined();
    editorState.undo();
    expect(persistence.currentId).toBe(id);
    editorState.redo();
    expect(persistence.currentId).toBeUndefined();
    expect(editorState.document.query.nodes).toHaveLength(0);
    editorState.undo();
    expect(persistence.currentId).toBe(id);
    expect(persistence.isModified).toBe(false);
  });

  test('Deletes the saved cube shown after a confirmation, keeping its content unsaved', async () => {
    const { editorState, store } = createPage();
    const id = await saveInStore(store, ordersDocument('Orders'), 'Orders');
    const { persistence } = editorState;
    await flowResult(persistence.openCube(id));
    persistence.deleteCube();
    expect(persistence.confirmation?.message).toBe(
      'Delete "Orders"? It will no longer be found or opened.',
    );
    persistence.confirm();
    await when(() => !persistence.isPending);
    expect(store.calls).toContain(`delete ${id}@1`);
    expect(persistence.currentId).toBeUndefined();
    expect(editorState.document.name).toBe('Orders');
    expect(persistence.isModified).toBe(true);
    await expect(store.getCube(id)).rejects.toThrow(`Can't find cube '${id}'`);
  });
});

describe('Copy and Paste (spec §14.4)', () => {
  test('Copies the whole spec, invalid cubes included', async () => {
    const { editorState } = createPage(invalidDocument());
    const copy = jest
      .spyOn(
        editorState.host.applicationStore.clipboardService,
        'copyTextToClipboard',
      )
      .mockResolvedValue();
    await editorState.persistence.copy();
    expect(copy).toHaveBeenCalledWith(
      serializeCubeSpec(editorState.document, editorState.registry),
      { notifySuccessMessage: 'Cube spec copied to the clipboard' },
    );
  });

  test("Pastes the clipboard's spec as Import does, and opens Import when the browser won't read it", async () => {
    const { editorState } = createPage();
    const { persistence, specTransfer } = editorState;
    const text = serializeCubeSpec(ordersDocument('Pasted'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText: () => Promise.resolve(text) },
    });
    try {
      persistence.paste();
      await when(() => editorState.document.name === 'Pasted');
      expect(specTransfer.mode).toBeUndefined();
      expect(persistence.currentId).toBeUndefined();
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      });
    }
    editorState.applyDocument(editorState.document.withName('Edited'));
    persistence.paste();
    expect(persistence.confirmation).toBeDefined();
    persistence.confirm();
    await when(() => specTransfer.mode === CUBE_SPEC_TRANSFER_MODE.IMPORT);
    expect(specTransfer.importText).toBe('');
  });
});

describe('Shortcuts (spec §17.12)', () => {
  test('Run as their buttons do, and do nothing when unavailable or a dialog is open', async () => {
    const { editorState, store } = createPage(
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS)],
          [],
          'relational102',
        ),
      }),
    );
    const { commandService } = editorState.host.applicationStore;
    editorState.registerCommands();
    try {
      expect(commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.SAVE)).toBe(
        true,
      );
      expect(editorState.persistence.saveDialog.isOpen).toBe(true);
      // a dialog is open
      expect(commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.LOAD)).toBe(
        false,
      );
      editorState.persistence.saveDialog.setName('Customers');
      await editorState.persistence.saveDialog.confirm();
      expect(store.calls).toEqual(['create Customers']);

      expect(commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.NEW)).toBe(true);
      expect(editorState.document.query.nodes).toHaveLength(0);
      expect(commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.SAVE)).toBe(
        false,
      );
      expect(commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.LOAD)).toBe(
        true,
      );
      expect(editorState.persistence.loadDialog.isOpen).toBe(true);
      editorState.persistence.loadDialog.close();
    } finally {
      editorState.deregisterCommands();
      editorState.dispose();
    }
  });

  test('Leave New, Copy and Paste to a text field that has the focus', () => {
    const { editorState } = createPage(ordersDocument('Orders'));
    const { commandService } = editorState.host.applicationStore;
    const copy = jest
      .spyOn(
        editorState.host.applicationStore.clipboardService,
        'copyTextToClipboard',
      )
      .mockResolvedValue();
    const field = document.createElement('input');
    document.body.appendChild(field);
    editorState.registerCommands();
    try {
      field.focus();
      // Alt+C is Match case in a code editor's find, for one
      expect(commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.COPY)).toBe(
        false,
      );
      expect(commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.PASTE)).toBe(
        false,
      );
      expect(commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.NEW)).toBe(
        false,
      );
      // Save and Load still run
      expect(commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.SAVE)).toBe(
        true,
      );
      editorState.persistence.saveDialog.close();
      field.blur();
      expect(commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.COPY)).toBe(
        true,
      );
      expect(copy).toHaveBeenCalledTimes(1);
    } finally {
      field.remove();
      editorState.deregisterCommands();
      editorState.dispose();
    }
  });
});

describe("Save while the node editor's edits may fix the cube", () => {
  test('Lets the edits decide only when step problems are all that blocks Save', async () => {
    const invalid = createPage(invalidDocument()).editorState.persistence;
    expect(invalid.isSaveBlockedOnlyByProblems).toBe(true);
    expect(invalid.isSaveAsBlockedOnlyByProblems).toBe(true);

    const noStore = createPage(invalidDocument(), { withStore: false })
      .editorState.persistence;
    expect(noStore.isSaveBlockedOnlyByProblems).toBe(false);

    const valid = createPage(ordersDocument()).editorState.persistence;
    expect(valid.isSaveBlockedOnlyByProblems).toBe(false);

    // someone else's cube: Save as only
    const { editorState, store } = createPage();
    const id = (
      await store
        .asUser('bob')
        .createCube(
          new CubeDraft('Bob', 1, serializeCubeSpec(invalidDocument()), []),
        )
    ).id;
    await flowResult(editorState.persistence.openCube(id));
    expect(editorState.persistence.isSaveAsBlockedOnlyByProblems).toBe(true);
    expect(editorState.persistence.isSaveBlockedOnlyByProblems).toBe(false);
  });
});
