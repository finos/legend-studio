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
import { act, fireEvent, getByText, waitFor } from '@testing-library/react';
import {
  TEST_DATA__modelCoverageAnalysisResult,
  TEST_DATA__result,
  TEST_DATA__ResultState_entities,
  TEST_DATA__simpleProjectionQuery,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_ResultStateTest.js';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { QUERY_BUILDER_TEST_ID } from '../../application/QueryBuilderTesting.js';
import {
  MockedMonacoEditorAPI,
  MockedMonacoEditorInstance,
} from '@finos/legend-lego/code-editor/test';

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
        getByText(queryBuilderSetup, extractElementNameFromPath(runtime)),
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
        fireEvent.click(renderResult.getByTitle('View Query in Pure'));
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
