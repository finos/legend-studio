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
  unsupportedGetAllWithOneConditionFilter,
  errorInGraphLambda,
  unsupportedFunction,
  misplacedTakeFunction,
  unsupportedFunctionWithFullPath,
} from './QueryBuilder_FailureTestData';
import ComplexRelationalModel from './QueryBuilder_Model_ComplexRelational.json';
import type { PlainObject } from '@finos/legend-studio-shared';
import {
  integrationTest,
  MOBX__enableSpyOrMock,
  MOBX__disableSpyOrMock,
} from '@finos/legend-studio-shared';
import { waitFor } from '@testing-library/dom';
import type { Entity } from '@finos/legend-studio';
import {
  RawLambda,
  setUpEditorWithDefaultSDLCData,
} from '@finos/legend-studio';
import { QUERY_BUILDER_TEST_ID } from '../../QueryBuilder_Constants';
import { QueryBuilderState } from '../../stores/QueryBuilderState';
import { flowResult } from 'mobx';
import { buildQueryBuilderMockedEditorStore } from './QueryBuilder_TestUtils';

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
  entities: ComplexRelationalModel,
  targetClassPath: 'model::pure::tests::model::simple::Person',
  className: 'Person',
  mappingName: 'simpleRelationalMapping',
  runtimeName: 'MyRuntime',
};

const cases: TestCase[] = [
  [
    'Graph element resolution issue',
    relationalCtx,
    errorInGraphLambda,
    `Can't find type 'model::pure::tests::model::simple::NotFound'`,
  ],
  [
    'Unsupported function',
    relationalCtx,
    unsupportedFunction,
    `Can't build expression with unsupported function 'testUnSupported'`,
  ],
  [
    'Unsupported function (with full-path)',
    relationalCtx,
    unsupportedFunctionWithFullPath,
    `Can't build expression with unsupported function 'something::getAll'`,
  ],
  [
    'Malformed filter() function',
    relationalCtx,
    unsupportedGetAllWithOneConditionFilter,
    `Can't build filter expression function`,
  ],
  [
    'Misplaced take() function',
    relationalCtx,
    misplacedTakeFunction,
    `Can't build 'take()' expression. Only support 'take()' in TDS expression`,
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
        const renderResult = await setUpEditorWithDefaultSDLCData(
          mockedEditorStore,
          {
            entities,
          },
        );
        MOBX__enableSpyOrMock();
        mockedEditorStore.graphState.globalCompileInFormMode = jest.fn();
        MOBX__disableSpyOrMock();
        const queryBuilderState =
          mockedEditorStore.getEditorExtensionState(QueryBuilderState);
        await flowResult(queryBuilderState.setOpenQueryBuilder(true));
        queryBuilderState.querySetupState.setClass(
          mockedEditorStore.graphState.graph.getClass(targetClassPath),
        );
        queryBuilderState.resetData();
        const queryBuilderSetup = await waitFor(() =>
          renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
        );
        // ensure form has updated with respect to the new state
        await waitFor(() => getByText(queryBuilderSetup, className));
        await waitFor(() => getByText(queryBuilderSetup, mappingName));
        await waitFor(() => getByText(queryBuilderSetup, runtimeName));
        expect(() =>
          queryBuilderState.buildStateFromRawLambda(getRawLambda(lambdaJson)),
        ).toThrowError(errorMessage);
      },
    );
  },
);
