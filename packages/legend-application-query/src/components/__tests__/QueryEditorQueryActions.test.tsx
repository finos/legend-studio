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
  V1_serializeExecutionResult,
} from '@finos/legend-graph';
import {
  act,
  fireEvent,
  getByDisplayValue,
  getByText,
  getByTitle,
  waitFor,
} from '@testing-library/react';
import {
  TEST_QUERY_NAME,
  TEST__provideMockedQueryEditorStore,
  TEST__setUpQueryEditor,
} from '../__test-utils__/QueryEditorComponentTestUtils.js';
import { QUERY_BUILDER_TEST_ID } from '@finos/legend-query-builder';
import {
  TEST_DATA__ResultState_entities,
  TEST_DATA__result,
  TEST_DATA__modelCoverageAnalysisResult,
  TEST_DATA__simpleProjectionQuery,
} from './TEST_DATA__QueryBuilder_ResultStateTest.js';
import { QUERY_EDITOR_TEST_ID } from '../../__lib__/LegendQueryTesting.js';

test(
  integrationTest(
    'Query state has normal header actions for existing query name',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryEditor(
      TEST__provideMockedQueryEditorStore(),
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
      { existingQueryName: true },
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
    await waitFor(() =>
      getByText(queryBuilderSetup, extractElementNameFromPath(runtime)),
    );
    await act(async () => {
      queryBuilderState.initializeWithQuery(lambda);
    });

    const executionResult = V1_buildExecutionResult(
      V1_serializeExecutionResult(TEST_DATA__result),
    );
    await act(async () => {
      queryBuilderState.resultState.setExecutionResult(executionResult);
    });

    await waitFor(() =>
      renderResult.getByTestId(QUERY_EDITOR_TEST_ID.QUERY_EDITOR_ACTIONS),
    );
    const queryActionsPanel = renderResult.getByTestId(
      QUERY_EDITOR_TEST_ID.QUERY_EDITOR_ACTIONS,
    );

    expect(
      getByTitle(queryActionsPanel, 'Save query').hasAttribute('disabled'),
    ).toBe(false);

    expect(
      getByTitle(queryActionsPanel, 'Save as new query').hasAttribute(
        'disabled',
      ),
    ).toBe(false);

    fireEvent.click(getByTitle(queryActionsPanel, 'Save as new query'));

    const createNewQueryModal = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );
    const renamedQueryInput = getByDisplayValue(
      createNewQueryModal,
      'New Query',
    );
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
    await waitFor(() =>
      getByText(queryBuilderSetup, extractElementNameFromPath(runtime)),
    );
    await act(async () => {
      queryBuilderState.initializeWithQuery(lambda);
    });

    const executionResult = V1_buildExecutionResult(
      V1_serializeExecutionResult(TEST_DATA__result),
    );
    await act(async () => {
      queryBuilderState.resultState.setExecutionResult(executionResult);
    });

    await waitFor(() =>
      renderResult.getByTestId(QUERY_EDITOR_TEST_ID.QUERY_EDITOR_ACTIONS),
    );
    const queryActionsPanel = renderResult.getByTestId(
      QUERY_EDITOR_TEST_ID.QUERY_EDITOR_ACTIONS,
    );

    expect(
      getByTitle(queryActionsPanel, 'Save as new query').hasAttribute(
        'disabled',
      ),
    ).toBe(false);

    fireEvent.click(getByTitle(queryActionsPanel, 'Save as new query'));

    const createNewQueryModal = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );

    expect(
      getByText(createNewQueryModal, 'Create Query').hasAttribute('disabled'),
    ).toBe(false);
  },
);
