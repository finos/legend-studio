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
import { resolve } from 'path';
import {
  fireEvent,
  getByText,
  findByText,
  act,
  waitFor,
  getByTitle,
} from '@testing-library/react';
import {
  TEST_DATA_QueryExecution_ExecutionInput,
  TEST_DATA_QueryExecution_MappingAnalysisResult,
  TEST_DATA_QueryExecution_PreviewData_ExecutionInput,
} from './TEST_DATA_QueryBuilder_Query_Execution.js';
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
  V1_deserializeExecutionResult,
  type TDSResultCellData,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { integrationTest, createSpy } from '@finos/legend-shared/test';
import {
  buildExecutionParameterValues,
  QUERY_BUILDER_TEST_ID,
} from '@finos/legend-query-builder';
import { TEST__setUpQueryBuilder } from '@finos/legend-query-builder/test';
import { ENGINE_TEST_SUPPORT__execute } from '@finos/legend-graph/test';
import { generateModelEntitesFromModelGrammar } from '../utils/testUtils.js';

// NOTE: this should be converted into an end-to-end test
test(integrationTest('test query execution with parameters'), async () => {
  const {
    mappingPath,
    runtimePath,
    modelFileDir,
    modelFilePath,
    rawLambda,
    expectedNumberOfParameter,
  } = {
    mappingPath: 'model::RelationalMapping',
    runtimePath: 'model::Runtime',
    modelFileDir: 'model',
    modelFilePath: 'TEST_DATA_QueryBuilder_Query_Execution_model.pure',
    rawLambda: TEST_DATA_QueryExecution_ExecutionInput,
    expectedNumberOfParameter: 1,
  };
  const entities = await generateModelEntitesFromModelGrammar(
    resolve(__dirname, modelFileDir),
    modelFilePath,
    undefined,
  );
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
  const executionInput = await (
    queryBuilderState.graphManagerState.graphManager as V1_PureGraphManager
  ).createExecutionInput(
    queryBuilderState.graphManagerState.graph,
    guaranteeNonNullable(queryBuilderState.executionContextState.mapping),
    queryBuilderState.resultState.buildExecutionRawLambda(),
    guaranteeNonNullable(queryBuilderState.executionContextState.runtimeValue),
    V1_PureGraphManager.DEV_PROTOCOL_VERSION,
    {
      parameterValues,
    },
  );
  const executionResult = await ENGINE_TEST_SUPPORT__execute(executionInput);
  createSpy(
    queryBuilderState.graphManagerState.graphManager,
    'runQuery',
  ).mockResolvedValue({
    executionResult: V1_buildExecutionResult(
      V1_deserializeExecutionResult(executionResult),
    ),
  });
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
  const executionInput1 = await (
    queryBuilderState.graphManagerState.graphManager as V1_PureGraphManager
  ).createExecutionInput(
    queryBuilderState.graphManagerState.graph,
    guaranteeNonNullable(queryBuilderState.executionContextState.mapping),
    queryBuilderState.resultState.buildExecutionRawLambda(),
    guaranteeNonNullable(queryBuilderState.executionContextState.runtimeValue),
    V1_PureGraphManager.DEV_PROTOCOL_VERSION,
    {
      parameterValues,
    },
  );
  const executionResult1 = await ENGINE_TEST_SUPPORT__execute(executionInput1);
  createSpy(
    queryBuilderState.graphManagerState.graphManager,
    'runQuery',
  ).mockResolvedValue({
    executionResult: V1_buildExecutionResult(
      V1_deserializeExecutionResult(executionResult1),
    ),
  });
  await act(async () => {
    fireEvent.click(getByText(queryBuilderResultPanel1, 'Run Query'));
  });
  const parameterValueDialog1 = await waitFor(() =>
    renderResult.getByRole('dialog'),
  );
  // Don't need to reset parameter value as the previous value is saved
  await act(async () => {
    fireEvent.click(getByText(parameterValueDialog1, 'Run'));
  });
  const queryBuilderResultAnalytics1 = await waitFor(() =>
    renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_ANALYTICS,
    ),
  );
  expect(queryBuilderResultAnalytics1.innerHTML).toContain('1 row(s)');

  await waitFor(() => findByText(queryBuilderResultPanel1, 'Age'));
  await waitFor(() => findByText(queryBuilderResultPanel1, 'First Name'));
  await waitFor(() => findByText(queryBuilderResultPanel1, 'Last Name'));

  await waitFor(() =>
    queryBuilderResultPanel1.getElementsByClassName('ag-cell'),
  );
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

test(integrationTest('test preview-data query execution'), async () => {
  const { mappingPath, runtimePath, modelFileDir, modelFilePath, rawLambda } = {
    mappingPath: 'model::RelationalMapping',
    runtimePath: 'model::Runtime',
    modelFileDir: 'model',
    modelFilePath: 'TEST_DATA_QueryBuilder_Query_Execution_model.pure',
    rawLambda: TEST_DATA_QueryExecution_PreviewData_ExecutionInput,
  };
  const entities = await generateModelEntitesFromModelGrammar(
    resolve(__dirname, modelFileDir),
    modelFilePath,
    undefined,
  );
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
  const executionInput = await (
    queryBuilderState.graphManagerState.graphManager as V1_PureGraphManager
  ).createExecutionInput(
    queryBuilderState.graphManagerState.graph,
    guaranteeNonNullable(queryBuilderState.executionContextState.mapping),
    queryBuilderState.resultState.buildExecutionRawLambda(),
    guaranteeNonNullable(queryBuilderState.executionContextState.runtimeValue),
    V1_PureGraphManager.DEV_PROTOCOL_VERSION,
  );
  const executionResult = await ENGINE_TEST_SUPPORT__execute(executionInput);
  createSpy(
    queryBuilderState.graphManagerState.graphManager,
    'runQuery',
  ).mockResolvedValue({
    executionResult: V1_buildExecutionResult(
      V1_deserializeExecutionResult(executionResult),
    ),
  });
  const explorerPanel = await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
  );
  const ageRow = await waitFor(() => findByText(explorerPanel, 'Age'));
  if (ageRow.parentElement) {
    expect(ageRow.parentElement).not.toBeNull();
    expect(ageRow.parentElement.parentElement).not.toBeNull();
    await act(async () => {
      fireEvent.click(
        getByTitle(
          guaranteeNonNullable(
            guaranteeNonNullable(ageRow.parentElement).parentElement,
          ),
          'Preview Data',
        ),
      );
    });
    await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PREVIEW_DATA_MODAL,
      ),
    );
  }
});

test(
  integrationTest(
    'test cell selection stats bar computes numeric stats for selected cells',
  ),
  async () => {
    const { mappingPath, runtimePath, modelFileDir, modelFilePath, rawLambda } =
      {
        mappingPath: 'model::RelationalMapping',
        runtimePath: 'model::Runtime',
        modelFileDir: 'model',
        modelFilePath: 'TEST_DATA_QueryBuilder_Query_Execution_model.pure',
        rawLambda: TEST_DATA_QueryExecution_PreviewData_ExecutionInput,
      };
    const entities = await generateModelEntitesFromModelGrammar(
      resolve(__dirname, modelFileDir),
      modelFilePath,
      undefined,
    );
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
    const executionInput = await (
      queryBuilderState.graphManagerState.graphManager as V1_PureGraphManager
    ).createExecutionInput(
      queryBuilderState.graphManagerState.graph,
      guaranteeNonNullable(queryBuilderState.executionContextState.mapping),
      queryBuilderState.resultState.buildExecutionRawLambda(),
      guaranteeNonNullable(
        queryBuilderState.executionContextState.runtimeValue,
      ),
      V1_PureGraphManager.DEV_PROTOCOL_VERSION,
    );
    const executionResult = await ENGINE_TEST_SUPPORT__execute(executionInput);
    createSpy(
      queryBuilderState.graphManagerState.graphManager,
      'runQuery',
    ).mockResolvedValue({
      executionResult: V1_buildExecutionResult(
        V1_deserializeExecutionResult(executionResult),
      ),
    });
    const queryBuilderResultPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_PANEL,
      ),
    );
    await act(async () => {
      fireEvent.click(getByText(queryBuilderResultPanel, 'Run Query'));
    });
    await findByText(queryBuilderResultPanel, 'Age', undefined, {
      timeout: 8000,
    });

    // `runQuery` clears the cell selection — populate it after the grid renders.
    const selectedCells: TDSResultCellData[] = [
      {
        value: 10,
        columnName: 'Age',
        coordinates: { rowIndex: 0, colIndex: 0 },
      },
      {
        value: 20,
        columnName: 'Age',
        coordinates: { rowIndex: 1, colIndex: 0 },
      },
      {
        value: 30,
        columnName: 'Age',
        coordinates: { rowIndex: 2, colIndex: 0 },
      },
      {
        value: 40,
        columnName: 'Age',
        coordinates: { rowIndex: 3, colIndex: 0 },
      },
    ];
    await act(async () => {
      queryBuilderState.resultState.setSelectedCells(selectedCells);
    });

    // Wait for Phase 2 (200ms debounce + rAF) to populate numeric stats
    const statsBar = await waitFor(
      () => {
        const el = queryBuilderResultPanel.querySelector(
          '.query-builder__result__tds-grid__stats-bar',
        );
        expect(el).not.toBeNull();
        expect(el?.textContent).toContain('Sum:');
        return el as HTMLElement;
      },
      { timeout: 2000 },
    );

    const text = statsBar.textContent ?? '';
    expect(text).toContain('Count:4');
    expect(text).toContain('Unique Count:4');
    expect(text).toContain('Empty Count:0');
    expect(text).toContain('Min:10');
    expect(text).toContain('Max:40');
    expect(text).toContain('Sum:100');
    expect(text).toContain('Avg:25');
  },
);

test(
  integrationTest(
    'test result overflow warning when query produces more rows than preview limit',
  ),
  async () => {
    const { mappingPath, runtimePath, modelFileDir, modelFilePath, rawLambda } =
      {
        mappingPath: 'model::RelationalMapping',
        runtimePath: 'model::Runtime',
        modelFileDir: 'model',
        modelFilePath: 'TEST_DATA_QueryBuilder_Query_Execution_model.pure',
        rawLambda: TEST_DATA_QueryExecution_PreviewData_ExecutionInput,
      };
    const entities = await generateModelEntitesFromModelGrammar(
      resolve(__dirname, modelFileDir),
      modelFilePath,
      undefined,
    );
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
    // Lower the preview limit below the engine row count (the test data
    // contains 11 Person rows) so processExecutionResult flags overflow.
    const overflowLimit = 2;
    await act(async () => {
      queryBuilderState.resultState.setPreviewLimit(overflowLimit);
    });

    // Mirror the runQuery flow's `withDataOverflowCheck: true` so the lambda
    // sent to the engine resolves to take(previewLimit + 1) — i.e. one row
    // beyond the limit, which is what processExecutionResult uses to detect
    // overflow.
    const executionInput = await (
      queryBuilderState.graphManagerState.graphManager as V1_PureGraphManager
    ).createExecutionInput(
      queryBuilderState.graphManagerState.graph,
      guaranteeNonNullable(queryBuilderState.executionContextState.mapping),
      queryBuilderState.resultState.buildExecutionRawLambda({
        withDataOverflowCheck: true,
      }),
      guaranteeNonNullable(
        queryBuilderState.executionContextState.runtimeValue,
      ),
      V1_PureGraphManager.DEV_PROTOCOL_VERSION,
    );
    const executionResult = await ENGINE_TEST_SUPPORT__execute(executionInput);
    createSpy(
      queryBuilderState.graphManagerState.graphManager,
      'runQuery',
    ).mockResolvedValue({
      executionResult: V1_buildExecutionResult(
        V1_deserializeExecutionResult(executionResult),
      ),
    });

    const queryBuilderResultPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_PANEL,
      ),
    );
    await act(async () => {
      fireEvent.click(getByText(queryBuilderResultPanel, 'Run Query'));
    });
    await findByText(queryBuilderResultPanel, 'Age', undefined, {
      timeout: 8000,
    });

    expect(queryBuilderState.resultState.isExecutionResultOverflowing).toBe(
      true,
    );

    await findByText(
      queryBuilderResultPanel,
      'Data below is not complete - query produces more rows than the set grid preview limit',
    );

    // The info-icon title surfaces the active preview limit
    const infoIcon = queryBuilderResultPanel.querySelector(
      '[title*="The preview limit is set to"]',
    );
    expect(infoIcon).not.toBeNull();
    expect(infoIcon?.getAttribute('title')).toContain(
      `The preview limit is set to ${overflowLimit}`,
    );
  },
);
