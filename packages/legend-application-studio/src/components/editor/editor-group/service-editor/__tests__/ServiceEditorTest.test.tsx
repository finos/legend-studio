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

import { test, beforeEach, expect } from '@jest/globals';
import {
  type RenderResult,
  waitFor,
  fireEvent,
  getByText,
  getByTitle,
  queryByText,
} from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import { TEST_DATA__multiEXecutionService } from './TEST_DATA__ServiceEditor.js';
import type { EditorStore } from '../../../../../stores/editor/EditorStore.js';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';
import { LEGEND_STUDIO_TEST_ID } from '../../../../../application/LegendStudioTesting.js';

let renderResult: RenderResult;
let MOCK__editorStore: EditorStore;
beforeEach(async () => {
  MOCK__editorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore, {
    entities: TEST_DATA__multiEXecutionService,
  });
});
test(integrationTest('Service Multi Execution Editor'), async () => {
  MockedMonacoEditorInstance.getValue.mockReturnValue(
    '|testModelStoreTestSuites::model::Doc.all()',
  );
  await TEST__openElementFromExplorerTree(
    'testModelStoreTestSuites::service::DocM2MService',
    renderResult,
  );
  const editorGroup = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
  );

  fireEvent.click(getByText(editorGroup, 'General'));
  await waitFor(() => getByText(editorGroup, 'Service to test refiner flow'));
  await waitFor(() => getByText(editorGroup, 'dummy1'));
  await waitFor(() => getByText(editorGroup, 'dummy'));
  await waitFor(() => getByText(editorGroup, 'Execution'));

  fireEvent.click(getByText(editorGroup, 'Execution'));
  await waitFor(() => getByText(editorGroup, 'context'));
  await waitFor(() => getByText(editorGroup, 'Execution Contexts'));
  expect(
    await waitFor(() => editorGroup.querySelector(`input[value="env"]`)),
  ).toBeTruthy();
  await waitFor(() => getByText(editorGroup, 'QA'));
  await waitFor(() =>
    getByText(editorGroup, 'testModelStoreTestSuites::runtime::DocM2MRuntime'),
  );
  await waitFor(() =>
    getByText(editorGroup, 'testModelStoreTestSuites::mapping::DocM2MMapping'),
  );
  await waitFor(() => getByText(editorGroup, 'UAT'));
  fireEvent.click(getByText(editorGroup, 'UAT'));
  await waitFor(() =>
    getByText(editorGroup, 'testModelStoreTestSuites::runtime::DocM2MRuntime3'),
  );
  expect(
    queryByText(
      editorGroup,
      'testModelStoreTestSuites::runtime::DocM2MRuntime',
    ),
  ).toBeNull();
  fireEvent.click(getByText(editorGroup, 'QA'));
  fireEvent.click(getByTitle(editorGroup, 'Switch to single execution'));
  const changeDialog = await waitFor(() => renderResult.getByRole('dialog'));
  await waitFor(() => getByText(changeDialog, 'QA'));
  await waitFor(() => getByText(changeDialog, 'Change'));
});
