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

import { test, expect, beforeEach } from '@jest/globals';
import {
  type RenderResult,
  getAllByTitle,
  getAllByText,
  waitFor,
  getByText,
  fireEvent,
} from '@testing-library/react';
import TEST_DATA__enumerationMappingEntities from './TEST_DATA__EnumerationMapping.json' with { type: 'json' };
import { integrationTest } from '@finos/legend-shared/test';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import type { EditorStore } from '../../../../../stores/editor/EditorStore.js';
import { MappingEditorState } from '../../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';

let renderResult: RenderResult;
let MOCK__editorStore: EditorStore;

beforeEach(async () => {
  MOCK__editorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore, {
    entities: TEST_DATA__enumerationMappingEntities,
  });
});

test.only(
  integrationTest('Enumeration mapping editor basic functionality'),
  async () => {
    await TEST__openElementFromExplorerTree('demo::MyMap', renderResult);
    const editorGroupHeader = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP__HEADER_TABS),
    );
    await waitFor(() => getByText(editorGroupHeader, 'MyMap'));
    const mappingExplorer = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.MAPPING_EXPLORER),
    );
    await waitFor(() => getByText(mappingExplorer, 'Enum_1'));
    await waitFor(() => getByText(mappingExplorer, 'Enum_2'));
    // open Enum_1 [enumToEnum] enumeration mapping
    await waitFor(() => getByText(mappingExplorer, 'Enum_1 [enumToEnum]'));
    fireEvent.click(getByText(mappingExplorer, 'Enum_1 [enumToEnum]'));
    // Enum_1 [enumToEnum] mapping source values
    let sourcePanel = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.SOURCE_PANEL),
    );
    await waitFor(() => getByText(sourcePanel, 'Enum_2'));
    await waitFor(() => getByText(sourcePanel, 'zero'));
    await waitFor(() => getByText(sourcePanel, 'one'));
    let mainEditor = await waitFor(() =>
      renderResult.getByTestId(
        LEGEND_STUDIO_TEST_ID.ENUMERATION_MAPPING_EDITOR,
      ),
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
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.SOURCE_PANEL),
    );
    await waitFor(() => getByText(sourcePanel, 'String'));
    mainEditor = await waitFor(() =>
      renderResult.getByTestId(
        LEGEND_STUDIO_TEST_ID.ENUMERATION_MAPPING_EDITOR,
      ),
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
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.SOURCE_PANEL),
    );
    await waitFor(() => getByText(sourcePanel, 'String'));
    mainEditor = await waitFor(() =>
      renderResult.getByTestId(
        LEGEND_STUDIO_TEST_ID.ENUMERATION_MAPPING_EDITOR,
      ),
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
      MOCK__editorStore.tabManagerState.getCurrentEditorState(
        MappingEditorState,
      );
    expect(mappingEditorState.openedTabStates).toHaveLength(3);
    const mappingTabs = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR__TABS__HEADER),
    );
    fireEvent.click(getByText(mappingTabs, 'Enum_1 [enumToEnum]'));
    mainEditor = await waitFor(() =>
      renderResult.getByTestId(
        LEGEND_STUDIO_TEST_ID.ENUMERATION_MAPPING_EDITOR,
      ),
    );
    await waitFor(() => getAllByText(mainEditor, 'Enum_2'));
    // close
    fireEvent.click(getAllByTitle(mappingTabs, 'Close')[0] as HTMLElement);
    expect(mappingEditorState.openedTabStates).toHaveLength(2);
    fireEvent.click(getAllByTitle(mappingTabs, 'Close')[0] as HTMLElement);
    expect(mappingEditorState.openedTabStates).toHaveLength(1);
    fireEvent.click(getAllByTitle(mappingTabs, 'Close')[0] as HTMLElement);
    // assert no current tab state
    expect(mappingEditorState.openedTabStates).toHaveLength(0);
    expect(mappingEditorState.currentTabState).toBeUndefined();
  },
);
