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

import { test, describe, expect } from '@jest/globals';
import { createMock, integrationTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import {
  create_RawLambda,
  extractElementNameFromPath,
  type RawMappingModelCoverageAnalysisResult,
  stub_RawLambda,
  V1_buildExecutionResult,
  V1_serializeExecutionResult,
} from '@finos/legend-graph';
import {
  act,
  fireEvent,
  getAllByText,
  getByText,
  getByTitle,
  queryByText,
  waitFor,
  type RenderResult,
} from '@testing-library/react';
import {
  TEST_DATA__modelCoverageAnalysisResult,
  TEST_DATA__result,
  TEST_DATA__ResultState_entities,
  TEST_DATA__simpleProjectionQuery,
  TEST_DATA__UnSupportedSimpleProjectionQuery,
  TEST_DATA__NoReturnData__result,
  TEST_DATA__RoundingData__result,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_ResultStateTest.js';
import TEST_DATA_QueryBuilder_QueryExecution_Entities from './TEST_DATA_QueryBuilder_QueryExecution_Entities.json' assert { type: 'json' };
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  MockedMonacoEditorAPI,
  MockedMonacoEditorInstance,
} from '@finos/legend-lego/code-editor/test';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import { TEST_DATA__ModelCoverageAnalysisResult_QueryExecution_Entities } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';

type ResultStateTestCase = [
  string,
  {
    entities: Entity[];
    _class: string;
    mapping: string;
    runtime: string;
    result: { builder: object; result: object };
    rawMappingModelCoverageAnalysisResult: RawMappingModelCoverageAnalysisResult;
    rawLambda: { parameters?: object; body?: object };
  },
];

const cases: ResultStateTestCase[] = [
  [
    'Simple check on result state when we go to text mode and come back to query builder state',
    {
      entities: TEST_DATA__ResultState_entities,
      _class: 'model::Firm',
      mapping: 'execution::RelationalMapping',
      runtime: 'execution::Runtime',
      result: TEST_DATA__result,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__modelCoverageAnalysisResult,
      rawLambda: TEST_DATA__simpleProjectionQuery,
    },
  ],
  [
    'Simple check on result state when we go to text mode and come back to query builder state when query is unsupported',
    {
      entities: TEST_DATA__ResultState_entities,
      _class: 'model::Firm',
      mapping: 'execution::RelationalMapping',
      runtime: 'execution::Runtime',
      result: TEST_DATA__result,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__modelCoverageAnalysisResult,
      rawLambda: TEST_DATA__UnSupportedSimpleProjectionQuery,
    },
  ],
];

describe(integrationTest('Query builder result state'), () => {
  test.each(cases)(
    '%s',
    async (
      testName: ResultStateTestCase[0],
      context: ResultStateTestCase[1],
    ) => {
      const {
        entities,
        _class,
        mapping,
        runtime,
        result,
        rawMappingModelCoverageAnalysisResult,
        rawLambda,
      } = context;
      const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
        entities,
        stub_RawLambda(),
        mapping,
        runtime,
        rawMappingModelCoverageAnalysisResult,
      );

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
        expect(
          getAllByText(queryBuilderSetup, extractElementNameFromPath(runtime))
            .length,
        ).toBe(2),
      );
      await act(async () => {
        queryBuilderState.initializeWithQuery(lambda);
      });

      const executionResult = V1_buildExecutionResult(
        V1_serializeExecutionResult(result),
      );
      await act(async () => {
        queryBuilderState.resultState.setExecutionResult(executionResult);
      });

      // Test filter out/by after sorting column
      // original order
      // Employees/First Name, Employees/Last Name, Legal Name
      // Doe, John, FirmA
      // Smith, Tim, Apple
      const queryBuilderResultPanel = await waitFor(() =>
        renderResult.getByTestId(
          QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_PANEL,
        ),
      );
      const rows = await waitFor(() => renderResult.getAllByRole('row'));
      const firstRow = rows.filter(
        (r) => r.getAttribute('row-index') === '0',
      )[0];
      const secondRow = rows.filter(
        (r) => r.getAttribute('row-index') === '1',
      )[0];
      expect(firstRow?.innerHTML).toContain('Doe');
      expect(firstRow?.innerHTML).toContain('John');
      expect(firstRow?.innerHTML).toContain('FirmA');
      expect(secondRow?.innerHTML).toContain('Smith');
      expect(secondRow?.innerHTML).toContain('Tim');
      expect(secondRow?.innerHTML).toContain('Apple');

      // click ag-grid column header (e.g. (Legal Name) ) to sort in ASC
      // Employees/First Name, Employees/Last Name, Legal Name
      // Smith, Tim, Apple
      // Doe, John, FirmA
      await act(async () => {
        fireEvent.click(getByText(queryBuilderResultPanel, 'Legal Name'));
      });
      const rows1 = await waitFor(() => renderResult.getAllByRole('row'));
      const firstRow1 = rows1.filter(
        (r) => r.getAttribute('row-index') === '0',
      )[0];
      const secondRow1 = rows1.filter(
        (r) => r.getAttribute('row-index') === '1',
      )[0];
      expect(firstRow1?.innerHTML).toContain('Smith');
      expect(firstRow1?.innerHTML).toContain('Tim');
      expect(firstRow1?.innerHTML).toContain('Apple');
      expect(secondRow1?.innerHTML).toContain('Doe');
      expect(secondRow1?.innerHTML).toContain('John');
      expect(secondRow1?.innerHTML).toContain('FirmA');

      // Here we mimic the toggling to text mode.
      MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
        readOnly: true,
      });
      MockedMonacoEditorAPI.removeAllMarkers.mockReturnValue(null);
      MockedMonacoEditorInstance.onDidFocusEditorWidget.mockReturnValue(null);
      const MOCK__pureCodeToLambda = createMock();
      const MOCK__lambdaToPureCode = createMock();
      queryBuilderState.graphManagerState.graphManager.pureCodeToLambda =
        MOCK__pureCodeToLambda;
      queryBuilderState.graphManagerState.graphManager.lambdasToPureCode =
        MOCK__lambdaToPureCode;
      MOCK__pureCodeToLambda.mockResolvedValue(lambda);
      const mockValue = new Map<string, string>();
      mockValue.set('query-builder', 'test');
      MOCK__lambdaToPureCode.mockResolvedValue(mockValue);

      await act(async () => {
        fireEvent.click(renderResult.getByTitle('Show Advanced Menu...'));
      });
      await act(async () => {
        fireEvent.click(renderResult.getByText('Edit Pure'));
      });
      const lambdaEditor = await waitFor(() =>
        renderResult.getByRole('dialog'),
      );

      await act(async () => {
        fireEvent.click(getByText(lambdaEditor, 'Close'));
      });
      expect(queryBuilderState.resultState.executionResult).toEqual(
        executionResult,
      );
    },
  );
});

const testQueryBuilderStateSetup = async (): Promise<{
  renderResult: RenderResult;
  queryBuilderState: QueryBuilderState;
}> => {
  const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
    TEST_DATA_QueryBuilder_QueryExecution_Entities,
    stub_RawLambda(),
    'model::RelationalMapping',
    'model::Runtime',
    TEST_DATA__modelCoverageAnalysisResult,
  );

  const _modelClass =
    queryBuilderState.graphManagerState.graph.getClass('model::Firm');

  await act(async () => {
    queryBuilderState.changeClass(_modelClass);
  });
  const queryBuilderSetup = await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
  );
  const lambda = create_RawLambda(
    TEST_DATA__simpleProjectionQuery.parameters,
    TEST_DATA__simpleProjectionQuery.body,
  );
  await waitFor(() =>
    getByText(
      queryBuilderSetup,
      extractElementNameFromPath('execution::RelationalMapping'),
    ),
  );
  await waitFor(() =>
    expect(
      getAllByText(
        queryBuilderSetup,
        extractElementNameFromPath('execution::Runtime'),
      ).length,
    ).toBe(2),
  );
  await act(async () => {
    queryBuilderState.initializeWithQuery(lambda);
  });
  return { renderResult, queryBuilderState };
};

describe(integrationTest('Query builder export button'), () => {
  test('Check that "Others..." button is disabled if no plugins with extraQueryUsageConfigurations are present', async () => {
    const { renderResult, queryBuilderState } =
      await testQueryBuilderStateSetup();
    const executionResult = V1_buildExecutionResult(
      V1_serializeExecutionResult(TEST_DATA__result),
    );
    await act(async () => {
      queryBuilderState.resultState.setExecutionResult(executionResult);
    });

    const exportButton = await waitFor(() => renderResult.getByText('Export'));
    await act(async () => {
      fireEvent.click(exportButton);
    });
    const viewQueryUsageButton = await waitFor(() =>
      renderResult.getByText('Others...').closest('button'),
    );
    expect(viewQueryUsageButton).not.toBeNull();
    expect(viewQueryUsageButton!.getAttribute('disabled')).toBeDefined();
  });
});

test(
  integrationTest('Query builder displays no return data error in grid'),
  async () => {
    const { renderResult, queryBuilderState } =
      await testQueryBuilderStateSetup();

    const executionResult = V1_buildExecutionResult(
      V1_serializeExecutionResult(TEST_DATA__NoReturnData__result),
    );
    await act(async () => {
      queryBuilderState.resultState.setExecutionResult(executionResult);
    });
    const resultPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_PANEL,
      ),
    );
    expect(queryByText(resultPanel, 'Query returned no data')).not.toBeNull();
  },
);

test(
  integrationTest('Query builder displays rounding warning in grid'),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA_QueryBuilder_QueryExecution_Entities,
      stub_RawLambda(),
      'model::RelationalMapping',
      'model::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_QueryExecution_Entities,
    );
    const _firmClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_firmClass);
    });
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );
    const element = await waitFor(() => getByText(explorerPanel, 'Firm'));
    fireEvent.contextMenu(element);
    fireEvent.click(
      renderResult.getByText('Add Properties to Fetch Structure'),
    );
    const executionResult = V1_buildExecutionResult(
      V1_serializeExecutionResult(TEST_DATA__RoundingData__result),
    );
    await act(async () => {
      queryBuilderState.resultState.setExecutionResult(executionResult);
    });
    const customHeader = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_GRID_CUSTOM_HEADER,
    );
    expect(customHeader).toBeDefined();
    expect(
      getByTitle(
        customHeader,
        'some values have been rounded using en-us format in this preview grid (defaults to max 4 decimal places)',
      ),
    ).not.toBeNull();
  },
);
