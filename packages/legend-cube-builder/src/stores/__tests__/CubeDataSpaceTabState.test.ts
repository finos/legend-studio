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
import { DataSpaceSource } from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  createFakeCubeDataSpaceEditor,
  FAKE_RISK_DATA_SPACE,
  FAKE_TRADES_DATA_SPACE,
  type FakeCubeDataSpaceEditor,
} from '../../__test-utils__/FakeCubeDataSpaceEditor.js';
import { createFakeCubeProjectCatalog } from '../../__test-utils__/FakeCubeProjectCatalog.js';
import { CUBE_DATA_SPACE_MESSAGE } from '../../__lib__/LegendCubeDataSpaceLabels.js';
import type { CubeProjectCatalog } from '../../graph-manager/CubeProjectCatalog.js';
import { createCubeProjectModel } from '../../graph-manager/CubeProject.js';
import { CubeEditorState } from '../CubeEditorState.js';
import {
  CUBE_DATA_SPACE_LIST_LIMIT,
  getCubeDataSpaceKey,
} from '../source-picker/CubeDataSpaceTabState.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';

/** Lets the flows an action started finish */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const TRADES_KEY = getCubeDataSpaceKey(FAKE_TRADES_DATA_SPACE);

const setUp = (
  options: {
    withEditor?: boolean;
    dataSpaces?: Parameters<typeof createFakeCubeDataSpaceEditor>[0];
  } = {},
): {
  state: CubeEditorState;
  editor: FakeCubeDataSpaceEditor;
  listVersions: jest.Mock<CubeProjectCatalog['listVersions']>;
} => {
  const { host } = TEST__createCubeHost();
  const editor = createFakeCubeDataSpaceEditor(options.dataSpaces);
  const projects = createFakeCubeProjectCatalog();
  const listVersions = jest.fn<CubeProjectCatalog['listVersions']>(async () =>
    Promise.resolve(['2.4.0', '2.3.0', '2.2.0']),
  );
  const state = new CubeEditorState({
    ...host,
    projectCatalog: { ...projects.catalog, listVersions },
    ...(options.withEditor === false ? {} : { dataSpaceEditor: editor.editor }),
  });
  return { state, editor, listVersions };
};

/** Opens the tab from its palette item, picks the trades data space, and lets it read */
const pickTrades = async (state: CubeEditorState): Promise<void> => {
  state.addNode(DataSpaceSource.TYPE);
  await settle();
  await flowResult(state.sourcePicker.dataSpaceTab.pick(TRADES_KEY));
};

describe('The Data Space tab', () => {
  test('Is offered, with its palette item, only by a host with a data space editor', () => {
    const offered = (state: CubeEditorState): boolean =>
      state.offeredSources.some(
        (definition) => definition.type === DataSpaceSource.TYPE,
      );
    const without = setUp({ withEditor: false }).state;
    expect(without.sourcePicker.dataSpaceTab.isAvailable).toBe(false);
    expect(without.sourcePicker.tabs.map((tab) => tab.key)).not.toContain(
      CubeSourcePickerTabKey.DATA_SPACE,
    );
    expect(offered(without)).toBe(false);
    const { state } = setUp();
    // after Ingest, as the palette shows it
    expect(state.sourcePicker.tabs.map((tab) => tab.key)).toContain(
      CubeSourcePickerTabKey.DATA_SPACE,
    );
    expect(offered(state)).toBe(true);
  });

  test('Opens from its palette item and lists the data spaces once, searched by title and path', async () => {
    const { state, editor } = setUp();
    state.addNode(DataSpaceSource.TYPE);
    expect(state.sourcePicker.isOpen).toBe(true);
    expect(state.sourcePicker.activeTabKey).toBe(
      CubeSourcePickerTabKey.DATA_SPACE,
    );
    await settle();
    const tab = state.sourcePicker.dataSpaceTab;
    expect(tab.dataSpaces).toEqual([
      FAKE_RISK_DATA_SPACE,
      FAKE_TRADES_DATA_SPACE,
    ]);
    state.sourcePicker.close();
    state.sourcePicker.open(CubeSourcePickerTabKey.DATA_SPACE);
    await settle();
    expect(editor.listDataSpaces).toHaveBeenCalledTimes(1);
    // the title of one, the path of the other
    tab.setSearch('trades');
    expect(tab.matchingDataSpaces).toEqual([FAKE_TRADES_DATA_SPACE]);
    tab.setSearch('RISK::');
    expect(tab.matchingDataSpaces).toEqual([FAKE_RISK_DATA_SPACE]);
  });

  test('Shows the first data spaces of a long list, and says so', async () => {
    const many = Array.from(
      { length: CUBE_DATA_SPACE_LIST_LIMIT + 5 },
      (_, index) => ({
        ...FAKE_TRADES_DATA_SPACE,
        path: `trading::DataSpace${index}`,
      }),
    );
    const { state } = setUp({ dataSpaces: many });
    state.addNode(DataSpaceSource.TYPE);
    await settle();
    const tab = state.sourcePicker.dataSpaceTab;
    expect(tab.matchingDataSpaces).toHaveLength(CUBE_DATA_SPACE_LIST_LIMIT + 5);
    expect(tab.shownDataSpaces).toHaveLength(CUBE_DATA_SPACE_LIST_LIMIT);
  });

  test("Picks a data space at the version listed, among its project's released ones, in its default execution context", async () => {
    const { state, editor, listVersions } = setUp();
    await pickTrades(state);
    const tab = state.sourcePicker.dataSpaceTab;
    expect(listVersions).toHaveBeenCalledWith(FAKE_TRADES_DATA_SPACE.project);
    expect(tab.versions).toEqual(['2.4.0', '2.3.0', '2.2.0']);
    expect(tab.versionId).toBe('2.3.0');
    expect(editor.describeDataSpace).toHaveBeenLastCalledWith(
      FAKE_TRADES_DATA_SPACE.project,
      FAKE_TRADES_DATA_SPACE.path,
    );
    expect(tab.executionContext).toBe('production');
    expect(tab.canConfirm).toBe(true);
    tab.setExecutionContext('uat');
    expect(tab.executionContext).toBe('uat');
    // one it doesn't have is ignored
    tab.setExecutionContext('qa');
    expect(tab.executionContext).toBe('uat');
    // another version is read again, in its default context
    await flowResult(tab.selectVersion('2.4.0'));
    expect(editor.describeDataSpace).toHaveBeenLastCalledWith(
      { ...FAKE_TRADES_DATA_SPACE.project, versionId: '2.4.0' },
      FAKE_TRADES_DATA_SPACE.path,
    );
    expect(tab.versionId).toBe('2.4.0');
    expect(tab.executionContext).toBe('production');
  });

  test("Adds an unset source, saving the project and the context as the cube's, and opens its editor", async () => {
    const { state } = setUp();
    await pickTrades(state);
    state.sourcePicker.dataSpaceTab.setExecutionContext('uat');
    await flowResult(state.sourcePicker.confirm());
    expect(state.sourcePicker.isOpen).toBe(false);
    const [node] = state.document.query.nodes;
    expect(node).toBeInstanceOf(DataSpaceSource);
    const source = node as DataSpaceSource;
    expect(source.dataSpace).toBe(FAKE_TRADES_DATA_SPACE.path);
    expect(source.executionContext).toBe('uat');
    expect(source.isUnset()).toBe(true);
    expect(state.document.context).toEqual({
      model: createCubeProjectModel(FAKE_TRADES_DATA_SPACE.project),
      runtime: 'trading::TradeUatRuntime',
      mapping: 'trading::TradeUatMapping',
    });
    // its entity, columns and filter are picked in its editor
    expect(state.nodeEditor.nodeId).toBe(source.id);
    // one undo step
    state.undo();
    expect(state.document.query.nodes).toEqual([]);
    expect(state.document.context).toBeUndefined();
  });

  test("Offers only the cube's data space, version and context once the cube has a data space source", async () => {
    const { state, editor, listVersions } = setUp();
    await pickTrades(state);
    await flowResult(state.sourcePicker.confirm());
    state.nodeEditor.cancel();
    const picker = state.sourcePicker;
    expect(picker.fixedTab?.key).toBe(CubeSourcePickerTabKey.DATA_SPACE);
    // a project's tables and functions can't join it
    expect(picker.isTabEnabled(picker.projectTab)).toBe(false);
    expect(picker.isTabEnabled(picker.projectFunctionTab)).toBe(false);
    expect(picker.isTabEnabled(picker.modelTab)).toBe(false);
    listVersions.mockClear();
    editor.listDataSpaces.mockClear();
    state.addNode(DataSpaceSource.TYPE);
    await settle();
    const tab = picker.dataSpaceTab;
    expect(editor.listDataSpaces).not.toHaveBeenCalled();
    expect(listVersions).not.toHaveBeenCalled();
    expect(tab.offeredDataSpaces).toEqual([
      {
        path: FAKE_TRADES_DATA_SPACE.path,
        project: FAKE_TRADES_DATA_SPACE.project,
      },
    ]);
    expect(tab.versions).toEqual(['2.3.0']);
    expect(tab.executionContext).toBe('production');
    tab.setExecutionContext('uat');
    expect(tab.executionContext).toBe('production');
    await flowResult(picker.confirm());
    expect(state.document.query.nodes).toHaveLength(2);
    expect(state.nodeEditor.nodeId).toBe('dataSpace102');
  });

  test("Offers the version listed alone when the project's versions can't be listed", async () => {
    const { state, listVersions } = setUp();
    listVersions.mockRejectedValueOnce(new Error('No such project'));
    await pickTrades(state);
    const tab = state.sourcePicker.dataSpaceTab;
    expect(tab.error).toBeUndefined();
    expect(tab.versions).toEqual([FAKE_TRADES_DATA_SPACE.project.versionId]);
    expect(tab.versionId).toBe(FAKE_TRADES_DATA_SPACE.project.versionId);
    expect(tab.canConfirm).toBe(true);
  });

  test('Says why when the list or a data space cannot be read, and reads the list again on Retry', async () => {
    const { state, editor } = setUp();
    editor.listDataSpaces.mockRejectedValueOnce(new Error('Depot is down'));
    state.addNode(DataSpaceSource.TYPE);
    await settle();
    const tab = state.sourcePicker.dataSpaceTab;
    expect(tab.error).toEqual({ message: 'Depot is down' });
    tab.retry();
    await settle();
    expect(tab.error).toBeUndefined();
    expect(tab.dataSpaces).toHaveLength(2);
    editor.describeDataSpace.mockRejectedValueOnce(
      new Error('No data space at this version'),
    );
    await flowResult(tab.pick(TRADES_KEY));
    expect(tab.error).toEqual({ message: 'No data space at this version' });
    expect(tab.canConfirm).toBe(false);
  });

  test('Adds nothing, and says so, when the cube took another context while the data space was picked', async () => {
    const { state } = setUp();
    await pickTrades(state);
    const tab = state.sourcePicker.dataSpaceTab;
    // another data space's context, as an import would bring
    state.applyDocument(
      state.document.withContext({
        model: createCubeProjectModel(FAKE_RISK_DATA_SPACE.project),
        runtime: 'risk::RiskDataSpaceRuntime',
        mapping: 'risk::RiskDataSpaceMapping',
      }),
    );
    expect(await flowResult(tab.confirm())).toBe(false);
    expect(tab.error).toEqual({
      message: CUBE_DATA_SPACE_MESSAGE.CUBE_CHANGED,
    });
    expect(state.document.query.nodes).toEqual([]);
  });
});
