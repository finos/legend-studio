/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import type { RenderResult } from '@testing-library/react';
import {
  getAllByTitle,
  getAllByText,
  waitFor,
  getByText,
  fireEvent,
} from '@testing-library/react';
import enumerationMappingEntities from '../../../../editor/edit-panel/mapping-editor/__tests__/EnumerationMappingTestData.json';
import { integrationTest } from '@finos/legend-studio-shared';
import {
  openElementFromExplorerTree,
  getMockedEditorStore,
  setUpEditorWithDefaultSDLCData,
} from '../../../../ComponentTestUtils';
import { CORE_TEST_ID } from '../../../../../const';
import type { EditorStore } from '../../../../../stores/EditorStore';
import { MappingEditorState } from '../../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';

let renderResult: RenderResult;
let mockedEditorStore: EditorStore;

beforeEach(async () => {
  mockedEditorStore = getMockedEditorStore();
  renderResult = await setUpEditorWithDefaultSDLCData(mockedEditorStore, {
    entities: enumerationMappingEntities,
  });
});

test(
  integrationTest('Enumeration mapping editor basic functionality'),
  async () => {
    await openElementFromExplorerTree('demo::MyMap', renderResult);
    const editPanelHeader = await waitFor(() =>
      renderResult.getByTestId(CORE_TEST_ID.EDIT_PANEL__HEADER_TABS),
    );
    await waitFor(() => getByText(editPanelHeader, 'MyMap'));
    const mappingExplorer = await waitFor(() =>
      renderResult.getByTestId(CORE_TEST_ID.MAPPING_EXPLORER),
    );
    await waitFor(() => getByText(mappingExplorer, 'Enum_1'));
    await waitFor(() => getByText(mappingExplorer, 'Enum_2'));
    // open Enum_1 [enumToEnum] enumeration mapping
    await waitFor(() => getByText(mappingExplorer, 'Enum_1 [enumToEnum]'));
    fireEvent.click(getByText(mappingExplorer, 'Enum_1 [enumToEnum]'));
    // Enum_1 [enumToEnum] mapping source values
    let sourcePanel = await waitFor(() =>
      renderResult.getByTestId(CORE_TEST_ID.SOURCE_PANEL),
    );
    await waitFor(() => getByText(sourcePanel, 'Enum_2'));
    await waitFor(() => getByText(sourcePanel, 'zero'));
    await waitFor(() => getByText(sourcePanel, 'one'));
    let mainEditor = await waitFor(() =>
      renderResult.getByTestId(CORE_TEST_ID.MAIN_EDITOR),
    );
    // Enum_1 [enumToEnum] mapping source value labels
    await waitFor(() => getByText(mainEditor, '_0'));
    await waitFor(() => getByText(mainEditor, '_1'));
    // Enum_1 [enumToEnum] mapping inputs
    expect(
      await waitFor(() => mainEditor.querySelector(`input[value="zero"]`)),
    ).not.toBeNull();
    expect(
      await waitFor(() => mainEditor.querySelector(`input[value="one"]`)),
    ).not.toBeNull();
    // Enum_1 [enumToEnum] mapping input return types
    let returnTypes = await waitFor(() => getAllByText(mainEditor, 'Enum_2'));
    expect(returnTypes).toHaveLength(4);
    // open enum_2 enumeration mapping
    fireEvent.click(getByText(mappingExplorer, 'Enum_2'));
    sourcePanel = await waitFor(() =>
      renderResult.getByTestId(CORE_TEST_ID.SOURCE_PANEL),
    );
    await waitFor(() => getByText(sourcePanel, 'String'));
    mainEditor = await waitFor(() =>
      renderResult.getByTestId(CORE_TEST_ID.MAIN_EDITOR),
    );
    // enum_2 mapping source value labels
    await waitFor(() => getByText(mainEditor, 'one'));
    await waitFor(() => getByText(mainEditor, 'zero'));
    // enum_2 mapping inputs
    expect(
      await waitFor(() => mainEditor.querySelector(`input[value="0"]`)),
    ).not.toBeNull();
    expect(
      await waitFor(() => mainEditor.querySelector(`input[value="1"]`)),
    ).not.toBeNull();
    // enum_2 mapping input return types
    returnTypes = await waitFor(() => getAllByText(mainEditor, 'String'));
    expect(returnTypes).toHaveLength(4);
    // open enum_1 enumeration mapping
    fireEvent.click(getByText(mappingExplorer, 'Enum_1'));
    sourcePanel = await waitFor(() =>
      renderResult.getByTestId(CORE_TEST_ID.SOURCE_PANEL),
    );
    await waitFor(() => getByText(sourcePanel, 'String'));
    mainEditor = await waitFor(() =>
      renderResult.getByTestId(CORE_TEST_ID.MAIN_EDITOR),
    );
    // enum_2 mapping source value labels
    await waitFor(() => getByText(mainEditor, '_0'));
    await waitFor(() => getByText(mainEditor, '_1'));
    // enum_2 mapping inputs
    expect(
      await waitFor(() => mainEditor.querySelector(`input[value="false"]`)),
    ).not.toBeNull();
    expect(
      await waitFor(() => mainEditor.querySelector(`input[value="0"]`)),
    ).not.toBeNull();
    expect(
      await waitFor(() => mainEditor.querySelector(`input[value="true"]`)),
    ).not.toBeNull();
    expect(
      await waitFor(() => mainEditor.querySelector(`input[value="1"]`)),
    ).not.toBeNull();
    // enum_2 mapping input return types
    returnTypes = await waitFor(() => getAllByText(mainEditor, 'String'));
    expect(returnTypes).toHaveLength(6);

    // test tabs
    const mappingEditorState =
      mockedEditorStore.getCurrentEditorState(MappingEditorState);
    expect(mappingEditorState.openedTabStates).toHaveLength(3);
    const mappingTabs = await waitFor(() =>
      renderResult.getByTestId(CORE_TEST_ID.EDITOR__TABS__HEADER),
    );
    fireEvent.click(getByText(mappingTabs, 'Enum_1 [enumToEnum]'));
    mainEditor = await waitFor(() =>
      renderResult.getByTestId(CORE_TEST_ID.MAIN_EDITOR),
    );
    await waitFor(() => getAllByText(mainEditor, 'Enum_2'));
    // close
    fireEvent.click(getAllByTitle(mappingTabs, 'Close')[0]);
    expect(mappingEditorState.openedTabStates).toHaveLength(2);
    fireEvent.click(getAllByTitle(mappingTabs, 'Close')[0]);
    expect(mappingEditorState.openedTabStates).toHaveLength(1);
    fireEvent.click(getAllByTitle(mappingTabs, 'Close')[0]);
    // assert no current tab state
    expect(mappingEditorState.openedTabStates).toHaveLength(0);
    expect(mappingEditorState.currentTabState).toBeUndefined();
  },
);
