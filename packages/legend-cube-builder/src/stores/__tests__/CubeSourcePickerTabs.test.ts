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

import { describe, expect, test } from '@jest/globals';
import {
  CubeDocument,
  PrimitiveType,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  createCubeDirectModel,
  CUBE_DIRECT_RUNTIME_PATH,
} from '../../graph-manager/CubeDirectConnection.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';

const { MODEL, DIRECT_CONNECTION, DATA_PRODUCT } = CubeSourcePickerTabKey;

const setUp = (
  document?: CubeDocument,
): ReturnType<typeof TEST__createCubeHost> & { state: CubeEditorState } => {
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
  return { ...created, state: new CubeEditorState(created.host, document) };
};

/** Lets the flows started by an action run */
const settle = async (): Promise<void> => {
  for (let tries = 0; tries < 10; tries++) {
    await Promise.resolve();
  }
};

const DIRECT_CUBE = new CubeDocument().withContext({
  model: createCubeDirectModel({ _type: 'saved' }),
  runtime: CUBE_DIRECT_RUNTIME_PATH,
});

/** The keys of the tabs, and whether each is enabled */
const tabsOf = (state: CubeEditorState): [string, boolean][] =>
  state.sourcePicker.tabs.map((tab) => [
    tab.key,
    state.sourcePicker.isTabEnabled(tab),
  ]);

describe('Source dialog tabs', () => {
  test('Offers every tab on an empty cube, opening on the one asked for, else the one open last', () => {
    const { state, connections } = setUp();
    const picker = state.sourcePicker;
    expect(tabsOf(state)).toEqual([
      [MODEL, true],
      [DIRECT_CONNECTION, true],
      [DATA_PRODUCT, true],
    ]);
    picker.open();
    expect(picker.activeTab.key).toBe(MODEL);
    picker.selectTab(DIRECT_CONNECTION);
    expect(picker.activeTab.key).toBe(DIRECT_CONNECTION);
    picker.close();
    picker.open();
    expect(picker.activeTab.key).toBe(DIRECT_CONNECTION);
    picker.close();
    picker.open(MODEL);
    expect(picker.activeTab.key).toBe(MODEL);
    // an empty cube's database connection tab calls nothing until tested
    expect(connections.listSchemas).not.toHaveBeenCalled();
  });

  test('Has no database connection tab on a host without a connection explorer', () => {
    const { host } = TEST__createCubeHost();
    const state = new CubeEditorState({
      ...host,
      connectionExplorer: undefined,
    });
    expect(tabsOf(state)).toEqual([
      [MODEL, true],
      [DATA_PRODUCT, true],
    ]);
    state.sourcePicker.open(DIRECT_CONNECTION);
    expect(state.sourcePicker.activeTab.key).toBe(MODEL);
  });

  test('Keeps a cube on a model to the Model tab, whichever tab is asked for', () => {
    const { state } = setUp(
      new CubeDocument().withContext({ model: CUBE_NORTHWIND_MODEL }),
    );
    const picker = state.sourcePicker;
    expect(tabsOf(state)).toEqual([
      [MODEL, true],
      [DIRECT_CONNECTION, false],
      [DATA_PRODUCT, false],
    ]);
    picker.open(DIRECT_CONNECTION);
    expect(picker.activeTab.key).toBe(MODEL);
    picker.selectTab(DIRECT_CONNECTION);
    expect(picker.activeTab.key).toBe(MODEL);
  });

  test('Gives a cube of a model kind no tab claims to the Model tab', () => {
    const { state } = setUp(
      new CubeDocument().withContext({
        model: { _type: 'pointer', sdlcInfo: {} },
      }),
    );
    expect(tabsOf(state)).toEqual([
      [MODEL, true],
      [DIRECT_CONNECTION, false],
      [DATA_PRODUCT, false],
    ]);
  });

  test("Keeps a direct cube to its tab, listing its connection's schemas on opening", async () => {
    const { state, connections } = setUp(DIRECT_CUBE);
    const picker = state.sourcePicker;
    expect(tabsOf(state)).toEqual([
      [MODEL, false],
      [DIRECT_CONNECTION, true],
      [DATA_PRODUCT, false],
    ]);
    picker.open(MODEL);
    expect(picker.activeTab.key).toBe(DIRECT_CONNECTION);
    await settle();
    expect(connections.listSchemas).toHaveBeenCalledWith({ _type: 'saved' });
    picker.selectTab(MODEL);
    expect(picker.activeTab.key).toBe(DIRECT_CONNECTION);
  });

  test('Adds through the open tab, closing the dialog once the source is added', async () => {
    const { state, fake } = setUp();
    const picker = state.sourcePicker;
    picker.open(DIRECT_CONNECTION);
    await flowResult(picker.directTab.testConnection());
    await settle();
    expect(picker.canConfirm).toBe(false);
    picker.directTab.selectTable('"ORDERS"');
    expect(picker.canConfirm).toBe(true);
    await flowResult(picker.confirm());
    expect(picker.isOpen).toBe(false);
    expect(state.document.query.nodes.map(({ id }) => id)).toEqual([
      'relational101',
    ]);
    // the cube is now direct: its tab alone is enabled
    expect(tabsOf(state)).toEqual([
      [MODEL, false],
      [DIRECT_CONNECTION, true],
      [DATA_PRODUCT, false],
    ]);

    // a table the engine can't type keeps the dialog open, with the error
    picker.open();
    picker.directTab.selectTable('"ORDER.LINES"');
    await flowResult(picker.confirm());
    expect(picker.isOpen).toBe(true);
    expect(picker.directTab.error?.message).toBe(
      'The table ""CUBE_DIRECT"."ORDER.LINES"" can\'t be found',
    );
    expect(fake.resolveSchemas).toHaveBeenCalledTimes(2);

    // undoing the first table frees the cube for any tab again
    picker.close();
    state.undo();
    expect(tabsOf(state)).toEqual([
      [MODEL, true],
      [DIRECT_CONNECTION, true],
      [DATA_PRODUCT, true],
    ]);
  });

  test("Doesn't add through a tab the cube's kind disables", async () => {
    const { state } = setUp(
      new CubeDocument().withContext({ model: CUBE_NORTHWIND_MODEL }),
    );
    const picker = state.sourcePicker;
    // a stale tab key, e.g. kept from before an import
    picker.activeTabKey = DIRECT_CONNECTION;
    expect(picker.canConfirm).toBe(false);
  });

  test('Opens nothing on a read-only cube', () => {
    const { state } = setUp();
    state.importDocument(new CubeDocument(), true);
    state.sourcePicker.open(DIRECT_CONNECTION);
    expect(state.sourcePicker.isOpen).toBe(false);
  });
});
