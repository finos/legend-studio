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
import fs from 'fs';
/**
 * Previously, these exports rely on ES module interop to expose `default` export
 * properly. But since we use `ESM` for Typescript resolution now, we lose this
 * so we have to workaround by importing these and re-export them from CJS
 *
 * TODO: remove these when the package properly work with Typescript's nodenext
 * module resolution
 *
 * @workaround ESM
 * See https://github.com/microsoft/TypeScript/issues/49298
 * See https://github.com/axios/axios/pull/5104
 */
import { default as axios, type AxiosResponse } from 'axios';
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
  V1_ExecuteInput,
  V1_PureGraphManager,
  V1_buildExecutionResult,
  V1_serializeExecutionResult,
} from '@finos/legend-graph';
import {
  ContentType,
  HttpHeader,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { integrationTest, createSpy } from '@finos/legend-shared/test';
import {
  buildExecutionParameterValues,
  QUERY_BUILDER_TEST_ID,
} from '@finos/legend-query-builder';
import { TEST__setUpQueryBuilder } from '@finos/legend-query-builder/test';

const engineConfig = JSON.parse(
  fs.readFileSync(resolve(__dirname, '../../../engine-config.json'), {
    encoding: 'utf-8',
  }),
) as object;
const ENGINE_SERVER_PORT = (engineConfig as any).server.connector // eslint-disable-line @typescript-eslint/no-explicit-any
  .port as number;
const ENGINE_SERVER_URL = `http://localhost:${ENGINE_SERVER_PORT}/api`;

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
      value.values = [20];

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
  const executionResult = await axios.post<
    unknown,
    AxiosResponse<{ elements: object[] }>
  >(
    `${ENGINE_SERVER_URL}/pure/v1/execution/execute`,
    V1_ExecuteInput.serialization.toJson(executionInput),
    {
      headers: {
        [HttpHeader.CONTENT_TYPE]: ContentType.APPLICATION_JSON,
      },
    },
  );
  createSpy(
    queryBuilderState.graphManagerState.graphManager,
    'runQuery',
  ).mockResolvedValue(
    V1_buildExecutionResult(V1_serializeExecutionResult(executionResult.data)),
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
  await waitFor(() =>
    fireEvent.change(
      guaranteeNonNullable(
        parameterValueDialog.getElementsByClassName(
          'value-spec-editor__input',
        )[0],
      ),
      {
        target: { value: 20 },
      },
    ),
  );
  await waitFor(() => fireEvent.click(getByText(parameterValueDialog, 'Run')));
  await waitFor(() => findByText(queryBuilderResultPanel, 'Age'));
  expect(
    queryBuilderResultPanel.getElementsByClassName(
      'query-builder__result__analytics',
    )[0]?.innerHTML,
  ).toContain('1 row(s)');
  expect(
    queryBuilderResultPanel.getElementsByClassName('ag-cell')[0]?.innerHTML,
  ).toContain('20');
});
