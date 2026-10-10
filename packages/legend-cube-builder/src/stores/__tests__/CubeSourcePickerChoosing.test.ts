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

import { describe, expect, jest, test } from '@jest/globals';
import {
  CubeDocument,
  PrimitiveType,
  RelationalTableSource,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import {
  READ_ONLY_CUBE_TITLE,
  UNSERVED_SOURCE_KIND_TITLE,
} from '../../__lib__/LegendCubeLabels.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  createCubeDataProductModel,
  CUBE_DATA_PRODUCT_RUNTIME_PATH,
  CubeDataProductEnvironmentType,
} from '../../graph-manager/CubeDataProduct.js';
import {
  createCubeDirectModel,
  CUBE_DIRECT_RUNTIME_PATH,
} from '../../graph-manager/CubeDirectConnection.js';
import type { CubeHost } from '../CubeHost.js';
import { CubeEditorState } from '../CubeEditorState.js';
import type { CubeSourcePickerState } from '../CubeSourcePickerState.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';

const { MODEL, DIRECT_CONNECTION, DATA_PRODUCT } = CubeSourcePickerTabKey;

const setUp = (
  document?: CubeDocument,
  prepare?: (host: CubeHost) => CubeHost,
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
  const host = prepare?.(created.host) ?? created.host;
  return { ...created, state: new CubeEditorState(host, document) };
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

/** Spies on every tab's open and close */
const spyOnTabs = (
  picker: CubeSourcePickerState,
): {
  opened: () => string[];
  closed: () => string[];
} => {
  const tabs = [picker.modelTab, picker.directTab, picker.dataProductTab];
  const spies = tabs.map((tab) => ({
    key: tab.key,
    open: jest.spyOn(tab, 'open'),
    close: jest.spyOn(tab, 'close'),
  }));
  return {
    opened: () =>
      spies.filter(({ open }) => open.mock.calls.length).map(({ key }) => key),
    closed: () =>
      spies
        .filter(({ close }) => close.mock.calls.length)
        .map(({ key }) => key),
  };
};

describe('Source dialog opened to choose a tab', () => {
  test('Opens with no tab chosen, and none opened, when the host serves several tabs and the cube has no fixed context', async () => {
    const { state, fake, connections, dataProducts } = setUp();
    const picker = state.sourcePicker;
    const spies = spyOnTabs(picker);
    picker.openToChoose();
    expect(picker.isOpen).toBe(true);
    expect(picker.isChoosingTab).toBe(true);
    await settle();
    expect(spies.opened()).toEqual([]);
    expect(fake.loadModel).not.toHaveBeenCalled();
    expect(connections.listSchemas).not.toHaveBeenCalled();
    expect(dataProducts.search).not.toHaveBeenCalled();
  });

  test('Opens a cube with a fixed context on its own tab, not to choose', async () => {
    const { state, connections } = setUp(DIRECT_CUBE);
    const picker = state.sourcePicker;
    picker.openToChoose();
    expect(picker.isOpen).toBe(true);
    expect(picker.isChoosingTab).toBe(false);
    expect(picker.activeTab.key).toBe(DIRECT_CONNECTION);
    await settle();
    expect(connections.listSchemas).toHaveBeenCalledWith({ _type: 'saved' });
  });

  test('Opens on the only tab a host serves, not to choose', () => {
    const { state } = setUp(undefined, (host) => ({
      ...host,
      connectionExplorer: undefined,
      dataProductCatalog: undefined,
    }));
    const picker = state.sourcePicker;
    const spies = spyOnTabs(picker);
    picker.openToChoose();
    expect(picker.isOpen).toBe(true);
    expect(picker.isChoosingTab).toBe(false);
    expect(picker.activeTab.key).toBe(MODEL);
    expect(spies.opened()).toEqual([MODEL]);
  });

  test('Opens nothing on a read-only cube', () => {
    const { state } = setUp();
    state.importDocument(new CubeDocument(), true);
    const picker = state.sourcePicker;
    expect(picker.disabledReason).toBe(READ_ONLY_CUBE_TITLE);
    picker.openToChoose();
    expect(picker.isOpen).toBe(false);
    expect(picker.isChoosingTab).toBe(false);
  });

  test("Opens nothing on a cube whose kind the host doesn't serve", () => {
    const { state } = setUp(
      new CubeDocument().withContext({
        model: createCubeDataProductModel({
          groupId: 'com.example.sales',
          artifactId: 'orders-products',
          versionId: '1.4.0',
          environmentType: CubeDataProductEnvironmentType.PRODUCTION,
        }),
        runtime: CUBE_DATA_PRODUCT_RUNTIME_PATH,
      }),
      (host) => ({ ...host, dataProductCatalog: undefined }),
    );
    const picker = state.sourcePicker;
    expect(picker.disabledReason).toBe(UNSERVED_SOURCE_KIND_TITLE);
    picker.openToChoose();
    expect(picker.isOpen).toBe(false);
    expect(picker.isChoosingTab).toBe(false);
  });

  test('Choosing a tab opens it and ends choosing, closing no other tab', async () => {
    const { state, connections } = setUp();
    const picker = state.sourcePicker;
    picker.openToChoose();
    const spies = spyOnTabs(picker);
    picker.selectTab(DIRECT_CONNECTION);
    expect(picker.isChoosingTab).toBe(false);
    expect(picker.activeTab.key).toBe(DIRECT_CONNECTION);
    expect(spies.opened()).toEqual([DIRECT_CONNECTION]);
    expect(spies.closed()).toEqual([]);
    expect(picker.isOpen).toBe(true);
    // an empty cube's database connection tab calls nothing until tested
    await settle();
    expect(connections.listSchemas).not.toHaveBeenCalled();
  });

  test('Choosing the tab open last opens it too', async () => {
    const { state, fake } = setUp();
    const picker = state.sourcePicker;
    expect(picker.activeTabKey).toBe(MODEL);
    picker.openToChoose();
    const spies = spyOnTabs(picker);
    picker.selectTab(MODEL);
    expect(picker.isChoosingTab).toBe(false);
    expect(picker.activeTab.key).toBe(MODEL);
    expect(spies.opened()).toEqual([MODEL]);
    expect(spies.closed()).toEqual([]);
    await settle();
    expect(fake.loadModel).toHaveBeenCalled();
  });

  test("Can't add while choosing, even when the tab open last could", async () => {
    // the fake engine's Northwind schemas, so the Model tab can add ORDERS
    const state = new CubeEditorState(TEST__createCubeHost().host);
    const picker = state.sourcePicker;
    picker.openToChoose();
    picker.modelTab.open();
    await settle();
    picker.modelTab.selectSchema('NORTHWIND');
    picker.modelTab.selectTable('ORDERS');
    expect(picker.activeTab).toBe(picker.modelTab);
    expect(picker.modelTab.canConfirm).toBe(true);
    expect(picker.canConfirm).toBe(false);
    await flowResult(picker.confirm());
    expect(picker.isOpen).toBe(true);
    expect(state.document.query.isEmpty).toBe(true);

    picker.selectTab(MODEL);
    expect(picker.canConfirm).toBe(true);
  });

  test('Closing or opening on a tab ends choosing', () => {
    const { state } = setUp();
    const picker = state.sourcePicker;
    picker.openToChoose();
    picker.close();
    expect(picker.isOpen).toBe(false);
    expect(picker.isChoosingTab).toBe(false);

    picker.openToChoose();
    picker.open(DATA_PRODUCT);
    expect(picker.isChoosingTab).toBe(false);
    expect(picker.activeTab.key).toBe(DATA_PRODUCT);
  });

  test("Lands a later Add Items' table on the table tab chosen last, not to choose", () => {
    const { state } = setUp();
    const picker = state.sourcePicker;
    picker.openToChoose();
    picker.selectTab(DIRECT_CONNECTION);
    picker.close();
    picker.openToChoose();
    picker.close();

    const tab = picker.tabForSourceType(RelationalTableSource.TYPE);
    expect(tab?.key).toBe(DIRECT_CONNECTION);
    picker.open(tab?.key);
    expect(picker.isOpen).toBe(true);
    expect(picker.isChoosingTab).toBe(false);
    expect(picker.activeTab.key).toBe(DIRECT_CONNECTION);
  });
});
