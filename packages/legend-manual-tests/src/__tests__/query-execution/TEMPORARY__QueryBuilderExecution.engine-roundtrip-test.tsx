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
  fireEvent,
  getByText,
  findByText,
  act,
  waitFor,
} from '@testing-library/react';
import {
  TEST_DATA_QueryExecution_ExecutionInput,
  TEST_DATA_QueryExecution_MappingAnalysisResult,
} from './TEST_DATA_QueryBuilder_Query_Execution.js';
import TEST_DATA_QueryBuilder_QueryExecution_Entities from './TEST_DATA_QueryBuilder_QueryExecution_Entities.json' assert { type: 'json' };
import {
  stub_RawLambda,
  create_RawLambda,
  PrimitiveType,
  PrimitiveInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  Multiplicity,
  V1_PureGraphManager,
  V1_buildExecutionResult,
  V1_serializeExecutionResult,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { integrationTest, createSpy } from '@finos/legend-shared/test';
import {
  buildExecutionParameterValues,
  QUERY_BUILDER_TEST_ID,
} from '@finos/legend-query-builder';
import { TEST__setUpQueryBuilder } from '@finos/legend-query-builder/test';
import { ENGINE_TEST_SUPPORT__execute } from '@finos/legend-graph/test';

// NOTE: this should be converted into an end-to-end test
test(integrationTest('test query execution with parameters'), async () => {
  const {
    mappingPath,
    runtimePath,
    entities,
    rawLambda,
    expectedNumberOfParameter,
  } = {
    mappingPath: TEST_DATA_QueryExecution_ExecutionInput.mapping,
    runtimePath: TEST_DATA_QueryExecution_ExecutionInput.runtime.runtime,
    entities: TEST_DATA_QueryBuilder_QueryExecution_Entities,
    rawLambda: TEST_DATA_QueryExecution_ExecutionInput.function,
    expectedNumberOfParameter: 1,
  };
  const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
    entities,
    stub_RawLambda(),
    mappingPath,
    runtimePath,
    TEST_DATA_QueryExecution_MappingAnalysisResult,
  );
  await act(async () => {
    queryBuilderState.initializeWithQuery(
      create_RawLambda(rawLambda.parameters, rawLambda.body),
    );
  });
  expect(queryBuilderState.parametersState.parameterStates.length).toBe(
    expectedNumberOfParameter,
  );
  await act(async () => {
    for (const queryParamState of queryBuilderState.parametersState
      .parameterStates) {
      const value = new PrimitiveInstanceValue(
        GenericTypeExplicitReference.create(
          new GenericType(PrimitiveType.INTEGER),
        ),
      );
      value.multiplicity = Multiplicity.ZERO_ONE;
      value.values = [10000];

      queryParamState.setValue(value);
    }
  });
  const parameterValues = buildExecutionParameterValues(
    queryBuilderState.parametersState.parameterStates,
    queryBuilderState.graphManagerState,
  );
  const executionInput = (
    queryBuilderState.graphManagerState.graphManager as V1_PureGraphManager
  ).createExecutionInput(
    queryBuilderState.graphManagerState.graph,
    guaranteeNonNullable(queryBuilderState.executionContextState.mapping),
    queryBuilderState.resultState.buildExecutionRawLambda(),
    guaranteeNonNullable(queryBuilderState.executionContextState.runtimeValue),
    V1_PureGraphManager.DEV_PROTOCOL_VERSION,
    parameterValues,
  );
  const executionResult = await ENGINE_TEST_SUPPORT__execute(executionInput);
  createSpy(
    queryBuilderState.graphManagerState.graphManager,
    'runQuery',
  ).mockResolvedValue(
    V1_buildExecutionResult(V1_serializeExecutionResult(executionResult)),
  );
  const queryBuilderResultPanel = await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_PANEL),
  );
  await act(async () => {
    fireEvent.click(getByText(queryBuilderResultPanel, 'Run Query'));
  });
  const parameterValueDialog = await waitFor(() =>
    renderResult.getByRole('dialog'),
  );
  await waitFor(() => fireEvent.click(getByText(parameterValueDialog, 'Run')));
  await waitFor(() => findByText(queryBuilderResultPanel, 'Age'));
  const queryBuilderResultAnalytics = await waitFor(() =>
    renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_ANALYTICS,
    ),
  );
  expect(queryBuilderResultAnalytics.innerHTML).toContain('1 row(s)');
  // Test formatting numbers that have more than 4 digits with commas for readability
  expect(
    queryBuilderResultPanel.getElementsByClassName('ag-cell')[0]?.innerHTML,
  ).toContain('10,000');

  // Test drag and drop a new property to Projection panel and ag-grid is updated after re-running query
  const queryBuilderExploreTree = await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
  );
  const FirstNamePropertyNode = getByText(
    queryBuilderExploreTree,
    'First Name',
  );
  await waitFor(() => fireEvent.contextMenu(FirstNamePropertyNode));
  await waitFor(() =>
    fireEvent.click(renderResult.getByText('Add Property to Fetch Structure')),
  );
  const LastNamePropertyNode = getByText(queryBuilderExploreTree, 'Last Name');
  await waitFor(() => fireEvent.contextMenu(LastNamePropertyNode));
  await waitFor(() =>
    fireEvent.click(renderResult.getByText('Add Property to Fetch Structure')),
  );
  const queryBuilderResultPanel1 = await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_PANEL),
  );
  await waitFor(() =>
    findByText(queryBuilderResultPanel1, 'Preview data might be stale'),
  );
  const executionInput1 = (
    queryBuilderState.graphManagerState.graphManager as V1_PureGraphManager
  ).createExecutionInput(
    queryBuilderState.graphManagerState.graph,
    guaranteeNonNullable(queryBuilderState.executionContextState.mapping),
    queryBuilderState.resultState.buildExecutionRawLambda(),
    guaranteeNonNullable(queryBuilderState.executionContextState.runtimeValue),
    V1_PureGraphManager.DEV_PROTOCOL_VERSION,
    parameterValues,
  );
  const executionResult1 = await ENGINE_TEST_SUPPORT__execute(executionInput1);
  createSpy(
    queryBuilderState.graphManagerState.graphManager,
    'runQuery',
  ).mockResolvedValue(
    V1_buildExecutionResult(V1_serializeExecutionResult(executionResult1)),
  );
  await act(async () => {
    fireEvent.click(getByText(queryBuilderResultPanel1, 'Run Query'));
  });
  const parameterValueDialog1 = await waitFor(() =>
    renderResult.getByRole('dialog'),
  );
  // Don't need to reset parameter value as the previous value is saved
  await waitFor(() => fireEvent.click(getByText(parameterValueDialog1, 'Run')));
  const queryBuilderResultAnalytics1 = await waitFor(() =>
    renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_ANALYTICS,
    ),
  );
  expect(queryBuilderResultAnalytics1.innerHTML).toContain('1 row(s)');
  await waitFor(() => findByText(queryBuilderResultPanel1, 'Age'));
  await waitFor(() => findByText(queryBuilderResultPanel1, 'First Name'));
  await waitFor(() => findByText(queryBuilderResultPanel1, 'Last Name'));
  expect(
    Array.from(
      queryBuilderResultPanel1.getElementsByClassName('ag-cell'),
    ).filter((el) => el.getAttribute('col-id') === 'First Name')[0]?.innerHTML,
  ).toContain('John');
  // Test null is rendered successfully
  expect(
    Array.from(
      queryBuilderResultPanel1.getElementsByClassName('ag-cell'),
    ).filter((el) => el.getAttribute('col-id') === 'Last Name')[0]?.innerHTML,
  ).toContain('');
});
