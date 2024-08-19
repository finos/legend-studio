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

import { test, expect } from '@jest/globals';
import {
  waitFor,
  fireEvent,
  getByText,
  getByTitle,
  queryByText,
  getAllByTitle,
  getAllByPlaceholderText,
} from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import {
  TEST_DATA__multiEXecutionService,
  TEST_DATA__serviceEntities,
} from './TEST_DATA__ServiceEditor.js';
import TEST_DATA__ExternalFormatServiceEntities from './TEST_DATA__ExternalFormatServiceEntities.json' with { type: 'json' };
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import { ServiceEditorState } from '../../../../../stores/editor/editor-state/element-editor-state/service/ServiceEditorState.js';
import { LegendStudioPluginManager } from '../../../../../application/LegendStudioPluginManager.js';
import { QueryBuilder_GraphManagerPreset } from '@finos/legend-query-builder';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  Core_GraphManagerPreset,
  resolveServiceQueryRawLambda,
} from '@finos/legend-graph';
import { getContentTypeWithParamFromQuery } from '../../../../../stores/editor/utils/TestableUtils.js';

test(integrationTest('Service Multi Execution Editor'), async () => {
  const MOCK__editorStore = TEST__provideMockedEditorStore();
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    MOCK__editorStore,
    {
      entities: TEST_DATA__multiEXecutionService,
    },
  );
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

const pluginManager = LegendStudioPluginManager.create();
pluginManager
  .usePresets([
    new QueryBuilder_GraphManagerPreset(),
    new Core_GraphManagerPreset(),
  ])
  .install();

test(
  integrationTest('Test Enternal Format Service Test Parameter Setup'),
  async () => {
    const MOCK__editorStore = TEST__provideMockedEditorStore({ pluginManager });
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      MOCK__editorStore,
      {
        entities: TEST_DATA__ExternalFormatServiceEntities,
      },
    );

    MockedMonacoEditorInstance.getValue.mockReturnValue('');
    await TEST__openElementFromExplorerTree(
      'demo::externalFormat::flatdata::simple::service::FlatdataWithM2MChainingMerged',
      renderResult,
    );
    const editorGroup = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
    );
    await waitFor(() => getByText(editorGroup, 'Test'));
    fireEvent.click(getByText(editorGroup, 'Test'));
    const serviceTestEditor = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.SERVICE_TEST_EDITOR),
    );
    // basic test screen
    const connectionTestData = queryByText(
      serviceTestEditor,
      'Add Connection Test Data',
    );
    expect(connectionTestData).toBeNull();
    await waitFor(() => getByText(serviceTestEditor, 'test_1'));

    // binding
    await waitFor(() => getByText(serviceTestEditor, 'Setup'));
    fireEvent.click(getByText(serviceTestEditor, 'Setup'));
    const serviceTestSetupEditor = await waitFor(() =>
      renderResult.getByTestId(
        LEGEND_STUDIO_TEST_ID.SERVICE_TEST_EDITOR__SETUP__PARAMETERS,
      ),
    );

    const contentTypeParmPairs = getContentTypeWithParamFromQuery(
      resolveServiceQueryRawLambda(
        MOCK__editorStore.tabManagerState.getCurrentEditorState(
          ServiceEditorState,
        ).service,
      ),
      MOCK__editorStore,
    );

    expect(contentTypeParmPairs).toHaveLength(2);
    const firstPair = guaranteeNonNullable(
      guaranteeNonNullable(contentTypeParmPairs)[0],
    );
    const secondPair = guaranteeNonNullable(
      guaranteeNonNullable(contentTypeParmPairs)[1],
    );
    expect(firstPair.contentType).toBe('application/x.flatdata');
    expect(firstPair.param).toBe('data');
    expect(secondPair.contentType).toBe('application/x.flatdata');
    expect(secondPair.param).toBe('data1');
    fireEvent.click(getByText(serviceTestEditor, 'Setup'));
    await waitFor(() =>
      getAllByTitle(serviceTestSetupEditor, 'Open in a popup...'),
    );

    // basic test suite set up
    const testSuiteId = getByText(editorGroup, 'testSuite_1');
    fireEvent.contextMenu(testSuiteId);
    fireEvent.click(renderResult.getByText('Delete'));
    await waitFor(() => getByText(editorGroup, 'Add Test Suite'));
    fireEvent.click(getByText(editorGroup, 'Add Test Suite'));
    const newServiceTestEditor = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.SERVICE_TEST_EDITOR),
    );
    getByText(newServiceTestEditor, 'test_1');
    getByText(newServiceTestEditor, 'Setup');
    getByText(newServiceTestEditor, 'data');
    getByText(newServiceTestEditor, 'data1');
    getByText(newServiceTestEditor, 'parameters');
    getByText(newServiceTestEditor, 'Assertion');
    const newConnectionTestData = queryByText(
      newServiceTestEditor,
      'Add Connection Test Data',
    );
    expect(newConnectionTestData).toBeNull();
  },
);

test(
  integrationTest(
    'Test Enternal Format Service Test Parameter Setup for Binding with Byte',
  ),
  async () => {
    const MOCK__editorStore = TEST__provideMockedEditorStore({ pluginManager });
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      MOCK__editorStore,
      {
        entities: TEST_DATA__ExternalFormatServiceEntities,
      },
    );
    MockedMonacoEditorInstance.getValue.mockReturnValue('');
    await TEST__openElementFromExplorerTree(
      'demo::externalFormat::flatdata::simple::service::FlatdataInternalizeByte',
      renderResult,
    );
    const editorGroup = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
    );
    await waitFor(() => getByText(editorGroup, 'Test'));
    fireEvent.click(getByText(editorGroup, 'Test'));
    const serviceTestEditor = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.SERVICE_TEST_EDITOR),
    );
    await waitFor(() => getByText(serviceTestEditor, 'Setup'));
    fireEvent.click(getByText(serviceTestEditor, 'Setup'));
    const serviceTestSetupEditor = await waitFor(() =>
      renderResult.getByTestId(
        LEGEND_STUDIO_TEST_ID.SERVICE_TEST_EDITOR__SETUP__PARAMETERS,
      ),
    );
    fireEvent.click(getByText(serviceTestEditor, 'Setup'));
    const contentTypeParmPairsForByte = getContentTypeWithParamFromQuery(
      resolveServiceQueryRawLambda(
        MOCK__editorStore.tabManagerState.getCurrentEditorState(
          ServiceEditorState,
        ).service,
      ),
      MOCK__editorStore,
    );

    expect(contentTypeParmPairsForByte).toHaveLength(1);
    expect(
      guaranteeNonNullable(guaranteeNonNullable(contentTypeParmPairsForByte)[0])
        .contentType,
    ).toBe('application/x.flatdata');

    //Test showing actual string as value for byte type
    await waitFor(() =>
      getByText(
        serviceTestSetupEditor,
        'First Name,Last NameJohn,DoeOlive,Yew',
      ),
    );
    await waitFor(() =>
      getAllByTitle(serviceTestSetupEditor, 'Open in a popup...'),
    );

    // Test click `generate` button to generate an empty string as a default value
    fireEvent.click(getByText(serviceTestEditor, 'Generate'));
    await waitFor(() =>
      getAllByPlaceholderText(serviceTestSetupEditor, '(empty)'),
    );
  },
);

test(
  integrationTest(
    'Test Enternal Format Service Test Parameter Setup for only specifying ContentType and Byte',
  ),
  async () => {
    const MOCK__editorStore = TEST__provideMockedEditorStore({ pluginManager });
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      MOCK__editorStore,
      {
        entities: TEST_DATA__ExternalFormatServiceEntities,
      },
    );
    MockedMonacoEditorInstance.getValue.mockReturnValue('');
    await TEST__openElementFromExplorerTree(
      'demo::externalFormat::flatdata::simple::service::FlatdataWithM2MContentType',
      renderResult,
    );
    const editorGroup = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
    );
    await waitFor(() => getByText(editorGroup, 'Test'));
    fireEvent.click(getByText(editorGroup, 'Test'));
    const serviceTestEditor = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.SERVICE_TEST_EDITOR),
    );
    await waitFor(() => getByText(serviceTestEditor, 'Setup'));
    fireEvent.click(getByText(serviceTestEditor, 'Setup'));
    const serviceTestSetupEditor = await waitFor(() =>
      renderResult.getByTestId(
        LEGEND_STUDIO_TEST_ID.SERVICE_TEST_EDITOR__SETUP__PARAMETERS,
      ),
    );
    fireEvent.click(getByText(serviceTestEditor, 'Setup'));
    const contentTypeParmPairsForByte = getContentTypeWithParamFromQuery(
      resolveServiceQueryRawLambda(
        MOCK__editorStore.tabManagerState.getCurrentEditorState(
          ServiceEditorState,
        ).service,
      ),
      MOCK__editorStore,
    );

    expect(contentTypeParmPairsForByte).toHaveLength(1);
    expect(
      guaranteeNonNullable(guaranteeNonNullable(contentTypeParmPairsForByte)[0])
        .contentType,
    ).toBe('application/json');
    //Test showing actual string as value for byte type
    await waitFor(() =>
      getByText(
        serviceTestSetupEditor,
        'First Name,Last NameJohn,DoeOlive,Yew',
      ),
    );
    await waitFor(() =>
      getAllByTitle(serviceTestSetupEditor, 'Open in a popup...'),
    );

    // Test click `generate` button to generate an empty string as a default value
    fireEvent.click(getByText(serviceTestEditor, 'Generate'));
    await waitFor(() =>
      getAllByPlaceholderText(serviceTestSetupEditor, '(empty)'),
    );
  },
);

test(
  integrationTest('Test Basic Service Editor Test With Relational'),
  async () => {
    const MOCK__editorStore = TEST__provideMockedEditorStore({ pluginManager });
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      MOCK__editorStore,
      {
        entities: TEST_DATA__serviceEntities,
      },
    );

    MockedMonacoEditorInstance.getValue.mockReturnValue('');
    await TEST__openElementFromExplorerTree(
      'model::RelationalService',
      renderResult,
    );
    const editorGroup = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
    );
    await waitFor(() => getByText(editorGroup, 'Test'));
    fireEvent.click(getByText(editorGroup, 'Test'));
    await waitFor(() => getByText(editorGroup, 'Add Test Suite'));
    fireEvent.click(getByText(editorGroup, 'Add Test Suite'));
    const serviceTestEditor = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.SERVICE_TEST_EDITOR),
    );
    await waitFor(() => getByText(serviceTestEditor, 'test_1'));
    getByText(serviceTestEditor, 'TABULAR DATA');
    getByText(editorGroup, 'Add a relational data table');
    getByTitle(editorGroup, 'Import CSV');
    getByText(editorGroup, 'Relational Table Explorer');
    getByText(editorGroup, 'CSV Values');
  },
);
