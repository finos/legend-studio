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

import { expect, test } from '@jest/globals';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';
import {
  createSpy,
  integrationTest,
  type TEMPORARY__JestMatcher,
} from '@finos/legend-shared/test';
import { noop } from '@finos/legend-shared';
import {
  fireEvent,
  getByDisplayValue,
  getByPlaceholderText,
  getByText,
  getByTitle,
  queryByRole,
  waitFor,
} from '@testing-library/react';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import TEST_DATA__SimpleRelationalModel from './TEST_DATA__SimpleRelationalEntities.json' with { type: 'json' };
import TEST_DATA__DataProductQueryEntities from './TEST_DATA__DataProductQueryEntities.json' with { type: 'json' };
import TEST_DATA__LakehouseMappingRuntimeQueryEntities from './TEST_DATA__LakehouseMappingRuntimeQueryEntities.json' with { type: 'json' };
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import {
  type V1_PureGraphManager,
  Core_GraphManagerPreset,
} from '@finos/legend-graph';
import { QueryBuilder_GraphManagerPreset } from '@finos/legend-query-builder';
import { LegendStudioPluginManager } from '../../../../../application/LegendStudioPluginManager.js';
import { TEST_DATA_SimpleSnowflakeArtifact } from './TEST_DATA_SimpleSnowflakeArtifact.js';
import { SnowflakeAppFunctionActivatorEdtiorState } from '../../../../../stores/editor/editor-state/element-editor-state/function-activator/SnowflakeAppFunctionActivatorEditorState.js';
import { FunctionEditorState } from '../../../../../stores/editor/editor-state/element-editor-state/FunctionEditorState.js';

const pluginManager = LegendStudioPluginManager.create();
pluginManager
  .usePresets([
    new Core_GraphManagerPreset(),
    new QueryBuilder_GraphManagerPreset(),
  ])
  .install();

test(integrationTest('Test Function Activator '), async () => {
  const MOCK__editorStore = TEST__provideMockedEditorStore({
    pluginManager,
  });
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    MOCK__editorStore,
    {
      entities: TEST_DATA__SimpleRelationalModel,
    },
  );
  MockedMonacoEditorInstance.getValue.mockReturnValue('');
  MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
    readOnly: true,
  });

  const functionPackageName = 'model';
  const functionName = 'Firm_QueryFunction():TabularDataSet[1]';
  const explorerTree = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EXPLORER_TREES,
  );
  fireEvent.click(getByText(explorerTree, functionPackageName));
  fireEvent.click(getByText(explorerTree, functionName));

  const functionEditor = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.FUNCTION_EDITOR,
  );
  fireEvent.click(getByText(functionEditor, 'Activate'));
  const functionActivatorModal = await waitFor(() =>
    renderResult.getByRole('dialog'),
  );
  expect(getByText(functionActivatorModal, 'Snowflake UDTF')).toBeDefined();
  fireEvent.click(getByText(functionActivatorModal, 'Snowflake UDTF'));
  expect(getByText(functionActivatorModal, 'Target Path')).toBeDefined();
  fireEvent.click(getByText(functionActivatorModal, 'Activate'));
  fireEvent.click(getByText(explorerTree, 'NewActivator'));
  const editorGroupHeaders = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EDITOR_GROUP__HEADER_TABS,
  );
  expect(getByText(editorGroupHeaders, 'NewActivator')).toBeDefined();
  const editorGroupContent = await renderResult.findByTestId(
    LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT,
  );
  expect(getByText(editorGroupContent, 'snowflake application')).toBeDefined();
  expect(
    getByText(editorGroupContent, 'Snowflake Activator Metadata'),
  ).toBeDefined();
  expect(getByText(editorGroupContent, 'Function')).toBeDefined();
  expect(
    getByDisplayValue(
      editorGroupContent,
      `${functionPackageName}::${functionName}`,
    ),
  ).toBeDefined();
  expect(getByText(editorGroupContent, 'Connection')).toBeDefined();
  expect(getByText(editorGroupContent, `SnowflakeConnection`)).toBeDefined();
  expect(getByText(editorGroupContent, 'Activator Identifer')).toBeDefined();
  expect(getByText(editorGroupContent, `Description`)).toBeDefined();

  // Render Artifact test
  const MOCK__editorState =
    MOCK__editorStore.tabManagerState.getCurrentEditorState(
      SnowflakeAppFunctionActivatorEdtiorState,
    );
  const graphManager = MOCK__editorStore.graphManagerState
    .graphManager as V1_PureGraphManager;
  const engine = graphManager.engine;
  const mockRenderArtifact = createSpy(
    engine,
    'renderFunctionActivatorArtifact',
  ).mockReturnValue(Promise.resolve(TEST_DATA_SimpleSnowflakeArtifact));
  fireEvent.click(
    getByTitle(editorGroupContent, 'activator-artifact-dropdown'),
  );
  const renderArtifactButton = renderResult.getByText('Render Artifact');
  fireEvent.click(renderArtifactButton);
  const artifactModal = await waitFor(() => renderResult.getByRole('dialog'));
  expect(mockRenderArtifact).toHaveBeenCalled();
  expect(getByText(artifactModal, 'Artifact')).toBeDefined();
  expect(getByText(artifactModal, 'Close')).toBeDefined();
  expect(MOCK__editorState.artifact).toEqual(TEST_DATA_SimpleSnowflakeArtifact);
  const closeArtifactButton = renderResult.getByTitle('Close artifact modal');
  fireEvent.click(closeArtifactButton);
  expect(queryByRole(editorGroupContent, 'dialog')).toBeNull();
});

test(integrationTest('Test change detection in function editor'), async () => {
  const MOCK__editorStore = TEST__provideMockedEditorStore();
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    MOCK__editorStore,
    {
      entities: TEST_DATA__SimpleRelationalModel,
    },
  );
  MockedMonacoEditorInstance.getValue.mockReturnValue('');
  MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
    readOnly: true,
  });

  const explorerTree = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EXPLORER_TREES,
  );

  const functionPackageName = 'model';
  const functionName = 'Simple():String[1]';
  const functionPath = 'model::Simple__String_1_';

  const functionElement =
    MOCK__editorStore.graphManagerState.graph.getFunction(functionPath);

  fireEvent.click(getByText(explorerTree, functionPackageName));
  fireEvent.click(getByText(explorerTree, functionName));

  const functionEditor = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.FUNCTION_EDITOR),
  );

  fireEvent.click(getByText(functionEditor, 'Test Suites'));

  const hashAfterAddingSuite = functionElement.hashCode;

  const testSuitesPanel = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT),
  );

  expect(testSuitesPanel).toBeDefined();

  const assertionEditor = getByDisplayValue(testSuitesPanel, 'Hello World!');
  fireEvent.change(assertionEditor, {
    target: { value: 'Hi World!' },
  });

  const hashAfterModifyingAssertion = functionElement.hashCode;
  expect(hashAfterModifyingAssertion).not.toBe(hashAfterAddingSuite);

  const changes =
    MOCK__editorStore.changeDetectionState.workspaceLocalLatestRevisionState
      .changes;

  const functionChange = changes.find(
    (diff) => diff.entityPath === functionPath,
  );

  expect(functionChange).toBeDefined();
});

test(
  integrationTest(
    'Create function test suite warns (not errors) when query has no runtime or accessors',
  ),
  async () => {
    const MOCK__editorStore = TEST__provideMockedEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      MOCK__editorStore,
      {
        entities: TEST_DATA__DataProductQueryEntities,
      },
    );
    MockedMonacoEditorInstance.getValue.mockReturnValue('');
    MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
      readOnly: true,
    });

    const functionPath = 'com::entity::appendOnlyQuery__Relation_1_';
    const functionElement =
      MOCK__editorStore.graphManagerState.graph.getFunction(functionPath);

    // Navigate via the explorer tree to open the function editor
    const explorerTree = renderResult.getByTestId(
      LEGEND_STUDIO_TEST_ID.EXPLORER_TREES,
    );
    fireEvent.click(getByText(explorerTree, 'com'));
    await waitFor(() => getByText(explorerTree, 'entity'));
    fireEvent.click(getByText(explorerTree, 'entity'));
    const functionDisplayName = 'appendOnlyQuery():Relation<Any>[1]';
    await waitFor(() => getByText(explorerTree, functionDisplayName));
    fireEvent.click(getByText(explorerTree, functionDisplayName));

    const functionEditor = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.FUNCTION_EDITOR),
    );
    const functionEditorState =
      MOCK__editorStore.tabManagerState.getCurrentEditorState(
        FunctionEditorState,
      );

    // Sanity check: the function has no runtime binding (the warning scenario)
    expect(
      functionEditorState.functionTestableEditorState.associatedRuntimes
        ?.length ?? 0,
    ).toBe(0);

    // Navigate to the Test Suites tab
    fireEvent.click(getByText(functionEditor, 'Test Suites'));

    const testSuitesPanel = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT),
    );

    // Spy on notifications BEFORE triggering suite creation
    const warnSpy = createSpy(
      MOCK__editorStore.applicationStore.notificationService,
      'notifyWarning',
    ).mockImplementation(noop);
    const errorSpy = createSpy(
      MOCK__editorStore.applicationStore.notificationService,
      'notifyError',
    ).mockImplementation(noop);

    // Open the Create Function Test Suite modal via the blank placeholder
    fireEvent.click(getByText(testSuitesPanel, 'Add Test Suite'));
    const createSuiteModal = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );
    expect(
      getByText(createSuiteModal, 'Create Function Test Suite'),
    ).toBeDefined();

    // Fill in suite + test names
    const suiteNameInput = getByPlaceholderText(createSuiteModal, 'Suite Name');
    fireEvent.change(suiteNameInput, { target: { value: 'mySuite' } });
    const testNameInput = getByPlaceholderText(createSuiteModal, 'Test Name');
    fireEvent.change(testNameInput, { target: { value: 'myTest' } });

    // Click Create - should warn (not error) and still create the suite
    fireEvent.click(getByText(createSuiteModal, 'Create'));

    await waitFor(() =>
      expect(warnSpy as TEMPORARY__JestMatcher).toHaveBeenCalled(),
    );
    const warnMessages = (
      warnSpy as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls.map((args) => String(args[0]));
    expect(
      warnMessages.some((msg) =>
        msg.includes(
          'No runtime or accessors found, or they could not be resolved. For Relational (non-Lakehouse) function testing, please ensure that your query is bound to a runtime',
        ),
      ),
    ).toBe(true);
    expect(errorSpy as TEMPORARY__JestMatcher).not.toHaveBeenCalled();

    // The suite should have been created on the function despite the warning
    await waitFor(() =>
      expect(functionElement.tests.length).toBeGreaterThan(0),
    );
    const createdSuite = functionElement.tests[0];
    expect(createdSuite?.id).toBe('mySuite');
    expect(createdSuite?.tests[0]?.id).toBe('myTest');
  },
);

test(
  integrationTest('Create function test suite succeeds for a LakehouseRuntime'),
  async () => {
    const MOCK__editorStore = TEST__provideMockedEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      MOCK__editorStore,
      {
        entities: TEST_DATA__LakehouseMappingRuntimeQueryEntities,
      },
    );
    MockedMonacoEditorInstance.getValue.mockReturnValue('');
    MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
      readOnly: true,
    });

    const functionPath = 'com::entity::appendOnlyQuery__Relation_1_';
    const functionElement =
      MOCK__editorStore.graphManagerState.graph.getFunction(functionPath);

    // Navigate via the explorer tree to open the function editor
    const explorerTree = renderResult.getByTestId(
      LEGEND_STUDIO_TEST_ID.EXPLORER_TREES,
    );
    fireEvent.click(getByText(explorerTree, 'com'));
    await waitFor(() => getByText(explorerTree, 'entity'));
    fireEvent.click(getByText(explorerTree, 'entity'));
    const functionDisplayName = 'appendOnlyQuery():Relation<Any>[1]';
    await waitFor(() => getByText(explorerTree, functionDisplayName));
    fireEvent.click(getByText(explorerTree, functionDisplayName));

    const functionEditor = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.FUNCTION_EDITOR),
    );
    const functionEditorState =
      MOCK__editorStore.tabManagerState.getCurrentEditorState(
        FunctionEditorState,
      );

    expect(
      functionEditorState.functionTestableEditorState.associatedRuntimes
        ?.length ?? 0,
    ).toBe(1);

    // Navigate to the Test Suites tab
    fireEvent.click(getByText(functionEditor, 'Test Suites'));

    const testSuitesPanel = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT),
    );

    // Open the Create Function Test Suite modal via the blank placeholder
    fireEvent.click(getByText(testSuitesPanel, 'Add Test Suite'));
    const createSuiteModal = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );
    expect(
      getByText(createSuiteModal, 'Create Function Test Suite'),
    ).toBeDefined();

    // Fill in suite + test names
    const suiteNameInput = getByPlaceholderText(createSuiteModal, 'Suite Name');
    fireEvent.change(suiteNameInput, { target: { value: 'mySuite' } });
    const testNameInput = getByPlaceholderText(createSuiteModal, 'Test Name');
    fireEvent.change(testNameInput, { target: { value: 'myTest' } });

    // Click Create - should succeed for a LakehouseRuntime
    fireEvent.click(getByText(createSuiteModal, 'Create'));

    // The suite should have been created on the function
    await waitFor(() =>
      expect(functionElement.tests.length).toBeGreaterThan(0),
    );
    const createdSuite = functionElement.tests[0];
    expect(createdSuite?.id).toBe('mySuite');
    expect(createdSuite?.tests[0]?.id).toBe('myTest');
  },
);
