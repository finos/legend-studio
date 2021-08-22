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

/// <reference types="jest-extended" />
import { getByText } from '@testing-library/react';
import {
  TEST_DATA__malformedFilterExpression,
  TEST_DATA__errorInGraphLambda,
  TEST_DATA__unsupportedFunction,
  TEST_DATA__misplacedTakeFunction,
  TEST_DATA__unsupportedFunctionWithFullPath,
} from './QueryBuilder_FailureTestData';
import TEST_DATA__ComplexRelationalModel from './TEST_DATA__QueryBuilder_Model_ComplexRelational.json';
import type { PlainObject } from '@finos/legend-shared';
import {
  integrationTest,
  MOBX__enableSpyOrMock,
  MOBX__disableSpyOrMock,
} from '@finos/legend-shared';
import { waitFor } from '@testing-library/dom';
import { TEST__setUpEditorWithDefaultSDLCData } from '@finos/legend-studio';
import { QUERY_BUILDER_TEST_ID } from '../../../QueryBuilder_Const';
import { flowResult } from 'mobx';
import { buildQueryBuilderMockedEditorStore } from './QueryBuilder_TestUtils';
import type { Entity } from '@finos/legend-model-storage';
import { RawLambda } from '@finos/legend-graph';
import { QueryBuilder_EditorExtensionState } from '../../../stores/QueryBuilder_EditorExtensionState';

const getRawLambda = (jsonRawLambda: {
  parameters?: object;
  body?: object;
}): RawLambda => new RawLambda(jsonRawLambda.parameters, jsonRawLambda.body);

type TestCase = [
  string,
  {
    entities: PlainObject<Entity>[];
    targetClassPath: string;
    className: string;
    mappingName: string;
    runtimeName: string;
  },
  { parameters?: object; body?: object },
  string,
];

const relationalCtx = {
  entities: TEST_DATA__ComplexRelationalModel,
  targetClassPath: 'model::pure::tests::model::simple::Person',
  className: 'Person',
  mappingName: 'simpleRelationalMapping',
  runtimeName: 'MyRuntime',
};

const cases: TestCase[] = [
  [
    'Graph element resolution issue',
    relationalCtx,
    TEST_DATA__errorInGraphLambda,
    `Can't find type 'model::pure::tests::model::simple::NotFound'`,
  ],
  [
    'Unsupported function',
    relationalCtx,
    TEST_DATA__unsupportedFunction,
    `Can't find expression builder for function 'testUnsupported': no compatible function expression builder available from plugins`,
  ],
  [
    'Unsupported function (with full-path)',
    relationalCtx,
    TEST_DATA__unsupportedFunctionWithFullPath,
    `Can't find expression builder for function 'something::getAll': no compatible function expression builder available from plugins`,
  ],
  [
    'Malformed filter()',
    relationalCtx,
    TEST_DATA__malformedFilterExpression,
    `Can't build filter() expression: filter() expects 1 argument`,
  ],
  [
    'Misplaced take()',
    relationalCtx,
    TEST_DATA__misplacedTakeFunction,
    `Can't process take() expression: only support take() in TDS expression`,
  ],
];

describe(
  integrationTest(
    'Query builder lambda processer should properly handle failure',
  ),
  () => {
    test.each(cases)(
      '%s',
      async (testName, context, lambdaJson, errorMessage) => {
        const {
          entities,
          targetClassPath,
          className,
          mappingName,
          runtimeName,
        } = context;
        const mockedEditorStore = buildQueryBuilderMockedEditorStore();
        const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
          mockedEditorStore,
          {
            entities,
          },
        );
        MOBX__enableSpyOrMock();
        mockedEditorStore.graphState.globalCompileInFormMode = jest.fn();
        MOBX__disableSpyOrMock();
        const queryBuilderExtension = mockedEditorStore.getEditorExtensionState(
          QueryBuilder_EditorExtensionState,
        );
        await flowResult(queryBuilderExtension.setOpenQueryBuilder(true));
        queryBuilderExtension.queryBuilderState.querySetupState.setClass(
          mockedEditorStore.graphManagerState.graph.getClass(targetClassPath),
        );
        queryBuilderExtension.queryBuilderState.resetData();
        const queryBuilderSetup = await waitFor(() =>
          renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
        );
        // ensure form has updated with respect to the new state
        await waitFor(() => getByText(queryBuilderSetup, className));
        await waitFor(() => getByText(queryBuilderSetup, mappingName));
        await waitFor(() => getByText(queryBuilderSetup, runtimeName));
        expect(() =>
          queryBuilderExtension.queryBuilderState.buildStateFromRawLambda(
            getRawLambda(lambdaJson),
          ),
        ).toThrowError(errorMessage);
      },
    );
  },
);
