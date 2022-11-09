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

import { describe, test, expect } from '@jest/globals';
import { act } from '@testing-library/react';
import { TEST_DATA_QueryExecution_ExecutionInput } from './TEST_DATA_QueryBuilder_Query_Execution.js';
import TEST_DATA_QueryBuilder_QueryExecution_Entities from './TEST_DATA_QueryBuilder_QueryExecution_Entities.json';
import {
  stub_RawLambda,
  create_RawLambda,
  ParameterValue,
  PrimitiveType,
  PrimitiveInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  Multiplicity,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import { integrationTest } from '@finos/legend-shared';
import { TEST__setUpQueryBuilder } from '../QueryBuilderComponentTestUtils.js';
import { buildExecutionParameterValues } from '../../stores/shared/LambdaParameterState.js';

type QueryPropertyParameterTestCase = [
  string,
  {
    mappingPath: string;
    runtimePath: string;
    entities: Entity[];
    rawLambda: { parameters?: object; body?: object };
    expectedNumberOfParameter: number;
    expectedNumberOfParameterValues: number;
  },
];

const QUERY_PROPERTY_PARAMETER_CASES: QueryPropertyParameterTestCase[] = [
  [
    'test query execution with parameters',
    {
      mappingPath: TEST_DATA_QueryExecution_ExecutionInput.mapping,
      runtimePath: TEST_DATA_QueryExecution_ExecutionInput.runtime.runtime,
      entities: TEST_DATA_QueryBuilder_QueryExecution_Entities,
      rawLambda: TEST_DATA_QueryExecution_ExecutionInput.function,
      expectedNumberOfParameter: 1,
      expectedNumberOfParameterValues: 1,
    },
  ],
];

describe(integrationTest(`test query execution with parameters`), () => {
  test.each(QUERY_PROPERTY_PARAMETER_CASES)(
    '%s',
    async (
      testName: QueryPropertyParameterTestCase[0],
      testCase: QueryPropertyParameterTestCase[1],
    ) => {
      const {
        mappingPath,
        runtimePath,
        entities,
        rawLambda,
        expectedNumberOfParameter,
        expectedNumberOfParameterValues,
      } = testCase;
      const { queryBuilderState } = await TEST__setUpQueryBuilder(
        entities,
        stub_RawLambda(),
        mappingPath,
        runtimePath,
      );
      await act(async () => {
        queryBuilderState.initializeWithQuery(
          create_RawLambda(rawLambda.parameters, rawLambda.body),
        );
      });
      expect(queryBuilderState.parametersState.parameterStates.length).toBe(
        expectedNumberOfParameter,
      );
      const expectedParameterValues =
        TEST_DATA_QueryExecution_ExecutionInput.parameterValues.map((p) => {
          const parameterValue = new ParameterValue();
          parameterValue.name = p.name;
          parameterValue.value = p.value;
          return parameterValue;
        });
      queryBuilderState.parametersState.parameterStates.forEach(
        (queryParamState) => {
          queryParamState.value = new PrimitiveInstanceValue(
            GenericTypeExplicitReference.create(
              new GenericType(PrimitiveType.STRING),
            ),
          );
          queryParamState.value.multiplicity = Multiplicity.ZERO_ONE;
          (queryParamState.value as PrimitiveInstanceValue).values = ['GS_LTD'];
        },
      );
      const parameterValues = buildExecutionParameterValues(
        queryBuilderState.parametersState.parameterStates,
        queryBuilderState.graphManagerState,
      );
      expect(JSON.stringify(parameterValues)).toEqual(
        JSON.stringify(expectedParameterValues),
      );
      expect(parameterValues.length).toBe(expectedNumberOfParameterValues);
    },
  );
});
