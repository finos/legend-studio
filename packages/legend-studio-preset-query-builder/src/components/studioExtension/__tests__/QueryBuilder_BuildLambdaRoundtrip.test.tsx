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
  TEST_DATA__simpleProjection,
  TEST_DATA__projectionWithChainedProperty,
  TEST_DATA__projectionWithResultSetModifiers,
  TEST_DATA__getAllWithGroupedFilter,
  TEST_DATA__getAllWithOneConditionFilter,
  TEST_DATA__projectWithDerivedProperty,
  TEST_DATA__fullComplexProjectionQuery,
  TEST_DATA__complexGraphFetch,
  TEST_DATA__simpleGraphFetch,
} from './QueryBuilder_TestData';
import TEST_DATA__ComplexRelationalModel from './TEST_DATA__QueryBuilder_Model_ComplexRelational.json';
import TEST_DATA__ComplexM2MModel from './TEST_DATA__QueryBuilder_Model_ComplexM2M.json';
import TEST_DATA__COVIDDataSimpleModel from './TEST_DATA__QueryBuilder_Model_COVID.json';
import TEST_DATA__SimpleM2MModel from './TEST_DATA__QueryBuilder_Model_SimpleM2M.json';
import {
  MOBX__enableSpyOrMock,
  MOBX__disableSpyOrMock,
  integrationTest,
} from '@finos/legend-shared';
import { waitFor } from '@testing-library/dom';
import type { PlainObject } from '@finos/legend-shared';
import { TEST__setUpEditorWithDefaultSDLCData } from '@finos/legend-studio';
import { QUERY_BUILDER_TEST_ID } from '../../../QueryBuilder_Const';
import { flowResult } from 'mobx';
import {
  TEST_DATA__lambda_enumerationOperatorFilter,
  TEST_DATA__lambda_existsChainFilter,
  TEST_DATA__lambda_existsChainFilterWithCustomVariableName,
  TEST_DATA__lambda_groupConditionFilter,
  TEST_DATA__lambda_groupConditionFilter_withMultipleClauseGroup,
  TEST_DATA__lambda_notOperatorFilter,
  TEST_DATA__lambda_setOperatorFilter,
  TEST_DATA__lambda_simpleSingleConditionFilter,
} from './QueryBuilder_Roundtrip_TestFilterQueries';
import {
  TEST_DATA__lambda_input_filterWithExists,
  lambda_output_filterWithExists,
} from './QueryBuilder_TestFilterQueriesWithExists';
import {
  TEST_DATA__lambda_input_graphFetchWithFullPathFunctions,
  TEST_DATA__lambda_output_graphFetchWithFullPathFunctions,
  TEST_DATA__lambda_input_filterWithFullPathFunctions,
  TEST_DATA__lambda_output_filterWithFullPathFunctions,
  TEST_DATA__lambda_input_projectionWithFullPathFunctions,
  TEST_DATA__lambda_output_projectionWithFullPathFunctions,
} from './QueryBuilder_TestQueriesWithFullPathFunctions';
import { TEST__buildQueryBuilderMockedEditorStore } from './QueryBuilder_TestUtils';
import type { Entity } from '@finos/legend-model-storage';
import { RawLambda } from '@finos/legend-graph';
import { QueryBuilder_EditorExtensionState } from '../../../stores/QueryBuilder_EditorExtensionState';

type RoundtripTestCase = [
  string,
  {
    entities: PlainObject<Entity>[];
    targetClassPath: string;
    className: string;
    mappingName: string;
    runtimeName: string | undefined;
  },
  { parameters?: object; body?: object },
  { parameters?: object; body?: object } | undefined,
];

const projectionCtx = {
  entities: TEST_DATA__ComplexRelationalModel,
  targetClassPath: 'model::pure::tests::model::simple::Person',
  className: 'Person',
  mappingName: 'simpleRelationalMapping',
  runtimeName: 'MyRuntime',
};

const graphFetchCtx = {
  entities: TEST_DATA__ComplexM2MModel,
  targetClassPath: 'model::target::NPerson',
  className: 'NPerson',
  mappingName: 'MyMapping',
  runtimeName: undefined,
};

const relationalFilterCtx = {
  entities: TEST_DATA__COVIDDataSimpleModel,
  targetClassPath: 'domain::COVIDData',
  className: 'COVIDData',
  mappingName: 'CovidDataMapping',
  runtimeName: 'H2Runtime',
};

const m2mFilterCtx = {
  entities: TEST_DATA__SimpleM2MModel,
  targetClassPath: 'model::target::_Person',
  className: '_Person',
  mappingName: 'mapping',
  runtimeName: 'runtime',
};

const cases: RoundtripTestCase[] = [
  // projection
  ['Simple projection', projectionCtx, TEST_DATA__simpleProjection, undefined],
  [
    'Complex filter',
    projectionCtx,
    TEST_DATA__fullComplexProjectionQuery,
    undefined,
  ],
  [
    'Projection with property chain',
    projectionCtx,
    TEST_DATA__projectionWithChainedProperty,
    undefined,
  ],
  [
    'Projection with result set modifiers',
    projectionCtx,
    TEST_DATA__projectionWithResultSetModifiers,
    undefined,
  ],
  [
    'Projection with derived property',
    projectionCtx,
    TEST_DATA__projectWithDerivedProperty,
    undefined,
  ],
  [
    '(auto-fix) Projection with full-path functions',
    projectionCtx,
    TEST_DATA__lambda_output_projectionWithFullPathFunctions,
    TEST_DATA__lambda_input_projectionWithFullPathFunctions,
  ],
  // graph fetch
  ['Simple graph fetch', graphFetchCtx, TEST_DATA__simpleGraphFetch, undefined],
  [
    'Complex graph fetch',
    graphFetchCtx,
    TEST_DATA__complexGraphFetch,
    undefined,
  ],
  [
    '(auto-fix) Graph-fetch with full-path functions',
    graphFetchCtx,
    TEST_DATA__lambda_output_graphFetchWithFullPathFunctions,
    TEST_DATA__lambda_input_graphFetchWithFullPathFunctions,
  ],
  // filter
  [
    'Simple filter',
    relationalFilterCtx,
    TEST_DATA__lambda_simpleSingleConditionFilter,
    undefined,
  ],
  [
    'Filter with a single condition',
    projectionCtx,
    TEST_DATA__getAllWithOneConditionFilter,
    undefined,
  ],
  // group condition
  [
    'Filter with group condition',
    relationalFilterCtx,
    TEST_DATA__lambda_groupConditionFilter,
    undefined,
  ],
  [
    'Filter with group condition with multiple clauses',
    relationalFilterCtx,
    TEST_DATA__lambda_groupConditionFilter_withMultipleClauseGroup,
    undefined,
  ],
  [
    'Filter with complex group conditions',
    projectionCtx,
    TEST_DATA__getAllWithGroupedFilter,
    undefined,
  ],
  // operator
  [
    'Filter with set operator',
    relationalFilterCtx,
    TEST_DATA__lambda_setOperatorFilter,
    undefined,
  ],
  [
    'Filter with not() operator',
    relationalFilterCtx,
    TEST_DATA__lambda_notOperatorFilter,
    undefined,
  ],
  [
    'Filter with enumeration',
    m2mFilterCtx,
    TEST_DATA__lambda_enumerationOperatorFilter,
    undefined,
  ],
  // exists()
  [
    'Filter with exists() chain',
    m2mFilterCtx,
    TEST_DATA__lambda_existsChainFilter,
    undefined,
  ],
  [
    'Filter with exists() chain with custom lambda variable name',
    m2mFilterCtx,
    TEST_DATA__lambda_existsChainFilterWithCustomVariableName,
    undefined,
  ],
  [
    '(auto-fix) Filter with outdated exists()',
    m2mFilterCtx,
    lambda_output_filterWithExists,
    TEST_DATA__lambda_input_filterWithExists,
  ],
  [
    '(auto-fix) Filter with full-path functions',
    m2mFilterCtx,
    TEST_DATA__lambda_output_filterWithFullPathFunctions,
    TEST_DATA__lambda_input_filterWithFullPathFunctions,
  ],
];

describe(
  integrationTest('Query builder lambda processing roundtrip test'),
  () => {
    test.each(cases)('%s', async (testName, context, lambda, inputLambda) => {
      const { entities, targetClassPath, className, mappingName, runtimeName } =
        context;
      const mockedEditorStore = TEST__buildQueryBuilderMockedEditorStore();
      const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
        mockedEditorStore,
        {
          entities,
        },
      );

      MOBX__enableSpyOrMock();
      mockedEditorStore.graphState.globalCompileInFormMode = jest.fn();
      MOBX__disableSpyOrMock();

      const queryBuilderExtensionState =
        mockedEditorStore.getEditorExtensionState(
          QueryBuilder_EditorExtensionState,
        );
      await flowResult(queryBuilderExtensionState.setOpenQueryBuilder(true));
      queryBuilderExtensionState.queryBuilderState.querySetupState.setClass(
        mockedEditorStore.graphManagerState.graph.getClass(targetClassPath),
      );
      queryBuilderExtensionState.queryBuilderState.resetData();
      const queryBuilderSetup = await waitFor(() =>
        renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
      );
      // ensure form has updated with respect to the new state
      await waitFor(() => getByText(queryBuilderSetup, className));
      await waitFor(() => getByText(queryBuilderSetup, mappingName));
      if (runtimeName) {
        await waitFor(() => getByText(queryBuilderSetup, runtimeName));
      }
      // do the check using input and output lambda
      const rawLambda = inputLambda ?? lambda;
      queryBuilderExtensionState.queryBuilderState.buildStateFromRawLambda(
        new RawLambda(rawLambda.parameters, rawLambda.body),
      );
      const jsonQuery =
        mockedEditorStore.graphManagerState.graphManager.serializeRawValueSpecification(
          queryBuilderExtensionState.queryBuilderState.getQuery(),
        );
      expect([lambda]).toIncludeSameMembers([jsonQuery]);
    });
  },
);
