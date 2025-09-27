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
import { integrationTest } from '@finos/legend-shared/test';
import {
  create_RawLambda,
  extractElementNameFromPath,
  stub_RawLambda,
  V1_buildExecutionResult,
  V1_deserializeExecutionResult,
} from '@finos/legend-graph';
import {
  act,
  fireEvent,
  getAllByText,
  getByDisplayValue,
  getByRole,
  getByText,
  getByTitle,
  waitFor,
  getByPlaceholderText,
} from '@testing-library/react';
import {
  TEST_QUERY_NAME,
  TEST__provideMockedQueryEditorStore,
  TEST__setUpQueryEditor,
} from '../__test-utils__/QueryEditorComponentTestUtils.js';
import {
  QUERY_BUILDER_TEST_ID,
  dragAndDrop,
} from '@finos/legend-query-builder';
import {
  TEST_DATA__ResultState_entities,
  TEST_DATA__result,
  TEST_DATA__modelCoverageAnalysisResult,
  TEST_DATA__simpleProjectionQuery,
} from './TEST_DATA__QueryBuilder_ResultStateTest.js';

test(
  integrationTest(
    'User can enter a description and it is included in the query payload',
  ),
  async () => {
    const { renderResult } = await TEST__setUpQueryEditor(
      TEST__provideMockedQueryEditorStore(),
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );

    // Open the save as new query modal
    const saveDropdown = await waitFor(() =>
      renderResult.getByTitle('query__editor__save-dropdown'),
    );
    fireEvent.click(saveDropdown);
    const saveAsNewQueryButton = renderResult.getByTitle(
      'query__editor__save-dropdown__save-as',
    );
    fireEvent.click(saveAsNewQueryButton);

    // Wait for the modal to appear
    const createNewQueryModal = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );

    const nameInput = getByPlaceholderText(
      createNewQueryModal,
      /e\.g\. "MyQuery"/i, // or whatever your placeholder is for the name
    );
    fireEvent.change(nameInput, {
      target: { value: 'Test Query Name' },
    });

    // Find the description input and enter a value
    const descriptionInput = getByPlaceholderText(
      createNewQueryModal,
      /details about what this query retrieves/i,
    );
    fireEvent.change(descriptionInput, {
      target: { value: 'This is a test description 123' },
    });
    expect((descriptionInput as HTMLInputElement).value).toBe(
      'This is a test description 123',
    );
    // Find and click the Create Query button
    const createButton = getByText(createNewQueryModal, 'Create Query');
    expect(createButton.hasAttribute('disabled')).toBe(false);
    fireEvent.click(createButton);
  },
);

test(
  integrationTest(
    'Query state has normal header actions for existing query name',
  ),
  async () => {
    const mockedQueryEditorStore = TEST__provideMockedQueryEditorStore();
    mockedQueryEditorStore.setExistingQueryName(TEST_QUERY_NAME);
    const { renderResult, queryBuilderState } = await TEST__setUpQueryEditor(
      mockedQueryEditorStore,
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );

    const _class = 'model::Firm';
    const mapping = 'execution::RelationalMapping';
    const runtime = 'execution::Runtime';
    const rawLambda = TEST_DATA__simpleProjectionQuery;
    const _modelClass =
      queryBuilderState.graphManagerState.graph.getClass(_class);

    await act(async () => {
      queryBuilderState.changeClass(_modelClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    const lambda = create_RawLambda(rawLambda.parameters, rawLambda.body);
    await waitFor(() =>
      getByText(queryBuilderSetup, extractElementNameFromPath(mapping)),
    );
    expect(
      getAllByText(queryBuilderSetup, extractElementNameFromPath(runtime))
        .length,
    ).toBe(2);
    await act(async () => {
      queryBuilderState.initializeWithQuery(lambda);
    });

    const executionResult = V1_buildExecutionResult(
      V1_deserializeExecutionResult(TEST_DATA__result),
    );
    await act(async () => {
      queryBuilderState.resultState.setExecutionResult(executionResult);
    });

    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_ACTIONS),
    );
    const queryActionsPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_ACTIONS,
    );

    expect(
      getByTitle(queryActionsPanel, 'Save query').hasAttribute('disabled'),
    ).toBe(false);

    const saveDropdown = await waitFor(() =>
      renderResult.getByTitle('query__editor__save-dropdown'),
    );
    fireEvent.click(saveDropdown);
    const saveAsNewQueryButton = renderResult.getByTitle(
      'query__editor__save-dropdown__save-as',
    );
    expect(saveAsNewQueryButton.hasAttribute('disabled')).toBe(false);
    fireEvent.click(saveAsNewQueryButton);

    const createNewQueryModal = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );
    const renamedQueryInput = getByTitle(createNewQueryModal, 'New Query Name');
    fireEvent.change(renamedQueryInput, {
      target: { value: 'New Query' },
    });
    expect(
      await waitFor(() =>
        getByTitle(
          createNewQueryModal,
          `Query named '${TEST_QUERY_NAME}' already exists`,
        ),
      ),
    ).not.toBeNull();
    fireEvent.change(renamedQueryInput, {
      target: { value: 'MyTestQuery2' },
    });
    expect(
      getByText(createNewQueryModal, 'Create Query').hasAttribute('disabled'),
    ).toBe(true);

    //double-check renaming query through double-clicking name is enabled
    expect(
      await waitFor(() =>
        getByTitle(queryActionsPanel, 'Double-click to rename query'),
      ),
    ).not.toBeNull();
    fireEvent.doubleClick(
      getByTitle(queryActionsPanel, 'Double-click to rename query'),
    );
    const cancelRenamedQueryTitle = getByDisplayValue(
      queryActionsPanel,
      TEST_QUERY_NAME,
    );
    fireEvent.change(cancelRenamedQueryTitle, {
      target: { value: 'MyTestQueryRenamed' },
    });
    fireEvent.keyDown(cancelRenamedQueryTitle, { code: 'Escape' });
    expect(
      await waitFor(() => getByText(queryActionsPanel, TEST_QUERY_NAME)),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query state has normal header actions for nonexisting query name',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryEditor(
      TEST__provideMockedQueryEditorStore(),
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );
    const _class = 'model::Firm';

    const mapping = 'execution::RelationalMapping';
    const runtime = 'execution::Runtime';
    const rawLambda = TEST_DATA__simpleProjectionQuery;
    const _modelClass =
      queryBuilderState.graphManagerState.graph.getClass(_class);

    await act(async () => {
      queryBuilderState.changeClass(_modelClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    const lambda = create_RawLambda(rawLambda.parameters, rawLambda.body);
    await waitFor(() =>
      getByText(queryBuilderSetup, extractElementNameFromPath(mapping)),
    );
    expect(
      getAllByText(queryBuilderSetup, extractElementNameFromPath(runtime))
        .length,
    ).toBe(2);
    await act(async () => {
      queryBuilderState.initializeWithQuery(lambda);
    });

    const executionResult = V1_buildExecutionResult(
      V1_deserializeExecutionResult(TEST_DATA__result),
    );
    await act(async () => {
      queryBuilderState.resultState.setExecutionResult(executionResult);
    });

    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_ACTIONS),
    );

    const saveDropdown = await waitFor(() =>
      renderResult.getByTitle('query__editor__save-dropdown'),
    );
    fireEvent.click(saveDropdown);
    const saveAsNewQueryButton = renderResult.getByTitle(
      'query__editor__save-dropdown__save-as',
    );
    expect(saveAsNewQueryButton.hasAttribute('disabled')).toBe(false);
    fireEvent.click(saveAsNewQueryButton);

    const createNewQueryModal = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );

    expect(
      getByText(createNewQueryModal, 'Create Query').hasAttribute('disabled'),
    ).toBe(true);
  },
);

test(
  integrationTest("Query header actions are disabled if query can't be built"),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryEditor(
      TEST__provideMockedQueryEditorStore(),
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );
    const _class = 'model::Firm';

    const _modelClass =
      queryBuilderState.graphManagerState.graph.getClass(_class);

    await act(async () => {
      queryBuilderState.changeClass(_modelClass);
    });

    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // Drag and drop
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    const filterDropZone = await waitFor(() =>
      getByText(filterPanel, 'Add a filter condition'),
    );
    const dragSource = await waitFor(() =>
      getByText(explorerPanel, 'Legal Name'),
    );
    await dragAndDrop(
      dragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    await dragAndDrop(
      dragSource,
      filterDropZone,
      filterPanel,
      'Add a filter condition',
    );
    await waitFor(() => getByText(filterPanel, 'Legal Name'));
    await waitFor(() => getByText(filterPanel, 'is'));
    await waitFor(() => getByDisplayValue(filterPanel, ''));

    // Verify action buttons are disabled properly and error is shown
    const queryActionsPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_ACTIONS,
    );
    expect(
      getByRole(queryActionsPanel, 'button', {
        name: 'Load Query',
      }).hasAttribute('disabled'),
    ).toBe(false);
    expect(
      getByRole(queryActionsPanel, 'button', {
        name: 'New Query',
      }).hasAttribute('disabled'),
    ).toBe(false);
    expect(
      getByRole(queryActionsPanel, 'button', { name: 'Save' }).hasAttribute(
        'disabled',
      ),
    ).toBe(true);
    const saveDropdown = await waitFor(() =>
      renderResult.getByTitle('query__editor__save-dropdown'),
    );
    fireEvent.click(saveDropdown);
    const saveAsNewQueryButton = renderResult.getByTitle(
      'query__editor__save-dropdown__save-as',
    );
    expect(saveAsNewQueryButton.hasAttribute('disabled')).toBe(true);
    expect(renderResult.getByText('1 issue')).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query header actions are not disabled if query can be built',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryEditor(
      TEST__provideMockedQueryEditorStore(),
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );
    const _class = 'model::Firm';

    const _modelClass =
      queryBuilderState.graphManagerState.graph.getClass(_class);

    await act(async () => {
      queryBuilderState.changeClass(_modelClass);
    });

    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // Drag and drop
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    const filterDropZone = await waitFor(() =>
      getByText(filterPanel, 'Add a filter condition'),
    );
    const dragSource = await waitFor(() =>
      getByText(explorerPanel, 'Legal Name'),
    );
    await dragAndDrop(
      dragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    await dragAndDrop(
      dragSource,
      filterDropZone,
      filterPanel,
      'Add a filter condition',
    );
    await waitFor(() => getByText(filterPanel, 'Legal Name'));
    await waitFor(() => getByText(filterPanel, 'is'));
    await waitFor(() => getByDisplayValue(filterPanel, ''));

    // Enter filter value
    const filterValueInput = getByDisplayValue(filterPanel, '');
    fireEvent.change(filterValueInput, { target: { value: 'test' } });

    // Verify action buttons are disabled properly and no error is shown
    const queryActionsPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_ACTIONS,
    );
    expect(
      getByRole(queryActionsPanel, 'button', {
        name: 'Load Query',
      }).hasAttribute('disabled'),
    ).toBe(false);
    expect(
      getByRole(queryActionsPanel, 'button', {
        name: 'New Query',
      }).hasAttribute('disabled'),
    ).toBe(false);
    expect(
      getByRole(queryActionsPanel, 'button', { name: 'Save' }).hasAttribute(
        'disabled',
      ),
    ).toBe(false);
    const saveDropdown = await waitFor(() =>
      renderResult.getByTitle('query__editor__save-dropdown'),
    );
    fireEvent.click(saveDropdown);
    const saveAsNewQueryButton = renderResult.getByTitle(
      'query__editor__save-dropdown__save-as',
    );
    expect(saveAsNewQueryButton.hasAttribute('disabled')).toBe(false);
    expect(renderResult.queryByText('1 issue')).toBeNull();
  },
);
