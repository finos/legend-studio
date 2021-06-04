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
  simpleProjection,
  projectionWithChainedProperty,
  projectionWithResultSetModifiers,
  getAllWithGroupedFilter,
  getAllWithOneConditionFilter,
  projectWithDerivedProperty,
  fullComplexProjectionQuery,
  firmPersonGraphFetch,
  simpleGraphFetch,
} from './QueryBuilder_TestData';
import ComplexRelationalModel from './QueryBuilder_Model_ComplexRelational.json';
import ComplexM2MModel from './QueryBuilder_Model_ComplexM2M.json';
import COVIDDataSimpleModel from './QueryBuilder_Model_COVID.json';
import SimpleM2MModel from './QueryBuilder_Model_SimpleM2M.json';
import {
  MOBX__enableSpyOrMock,
  MOBX__disableSpyOrMock,
  integrationTest,
} from '@finos/legend-studio-shared';
import { waitFor } from '@testing-library/dom';
import type { PlainObject } from '@finos/legend-studio-shared';
import type { Entity } from '@finos/legend-studio';
import {
  RawLambda,
  setUpEditorWithDefaultSDLCData,
} from '@finos/legend-studio';
import { QUERY_BUILDER_TEST_ID } from '../../QueryBuilder_Constants';
import { QueryBuilderState } from '../../stores/QueryBuilderState';
import { flowResult } from 'mobx';
import {
  lambda_enumerationOperatorFilter,
  lambda_existsChainFilter,
  lambda_existsChainFilterWithCustomVariableName,
  lambda_groupConditionFilter,
  lambda_groupConditionFilter_withMultipleClauseGroup,
  lambda_notOperatorFilter,
  lambda_setOperatorFilter,
  lambda_simpleSingleConditionFilter,
} from './QueryBuilder_Roundtrip_TestFilterQueries';
import {
  lambda_input_filterWithExists,
  lambda_output_filterWithExists,
} from './QueryBuilder_TestFilterQueriesWithExits';
import { buildQueryBuilderMockedEditorStore } from './QueryBuilder_TestUtils';

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
  entities: ComplexRelationalModel,
  targetClassPath: 'model::pure::tests::model::simple::Person',
  className: 'Person',
  mappingName: 'simpleRelationalMapping',
  runtimeName: 'MyRuntime',
};

const graphFetchCtx = {
  entities: ComplexM2MModel,
  targetClassPath: 'model::target::NPerson',
  className: 'NPerson',
  mappingName: 'MyMapping',
  runtimeName: undefined,
};

const relationalFilterCtx = {
  entities: COVIDDataSimpleModel,
  targetClassPath: 'domain::COVIDData',
  className: 'COVIDData',
  mappingName: 'CovidDataMapping',
  runtimeName: 'H2Runtime',
};

const m2mFilterCtx = {
  entities: SimpleM2MModel,
  targetClassPath: 'model::target::_Person',
  className: '_Person',
  mappingName: 'mapping',
  runtimeName: 'runtime',
};

const cases: RoundtripTestCase[] = [
  // projection
  ['Simple projection', projectionCtx, simpleProjection, undefined],
  ['Complex filter', projectionCtx, fullComplexProjectionQuery, undefined],
  [
    'Projection with property chain',
    projectionCtx,
    projectionWithChainedProperty,
    undefined,
  ],
  [
    'Projection with result set modifiers',
    projectionCtx,
    projectionWithResultSetModifiers,
    undefined,
  ],
  [
    'Projection with derived property',
    projectionCtx,
    projectWithDerivedProperty,
    undefined,
  ],
  // graph fetch
  ['Simple graph fetch', graphFetchCtx, simpleGraphFetch, undefined],
  ['Complex graph fetch', graphFetchCtx, firmPersonGraphFetch, undefined],
  // filter
  [
    'Simple filter',
    relationalFilterCtx,
    lambda_simpleSingleConditionFilter,
    undefined,
  ],
  [
    'Filter with a single condition',
    projectionCtx,
    getAllWithOneConditionFilter,
    undefined,
  ],
  // group condition
  [
    'Filter with group condition',
    relationalFilterCtx,
    lambda_groupConditionFilter,
    undefined,
  ],
  [
    'Filter with group condition with multiple clauses',
    relationalFilterCtx,
    lambda_groupConditionFilter_withMultipleClauseGroup,
    undefined,
  ],
  [
    'Filter with complex group conditions',
    projectionCtx,
    getAllWithGroupedFilter,
    undefined,
  ],
  // operator
  [
    'Filter with set operator',
    relationalFilterCtx,
    lambda_setOperatorFilter,
    undefined,
  ],
  [
    'Filter with not() operator',
    relationalFilterCtx,
    lambda_notOperatorFilter,
    undefined,
  ],
  [
    'Filter with enumeration',
    m2mFilterCtx,
    lambda_enumerationOperatorFilter,
    undefined,
  ],
  // exists()
  [
    'Filter with exists() chain',
    m2mFilterCtx,
    lambda_existsChainFilter,
    undefined,
  ],
  [
    'Filter with exists() chain with custom lambda variable name',
    m2mFilterCtx,
    lambda_existsChainFilterWithCustomVariableName,
    undefined,
  ],
  [
    '(auto-fix) Filter with outdated exists()',
    m2mFilterCtx,
    lambda_output_filterWithExists,
    lambda_input_filterWithExists,
  ],
];

describe(
  integrationTest('Query builder lambda processing roundtrip test'),
  () => {
    test.each(cases)('%s', async (testName, context, lambda, inputLambda) => {
      const { entities, targetClassPath, className, mappingName, runtimeName } =
        context;
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
      if (runtimeName) {
        await waitFor(() => getByText(queryBuilderSetup, runtimeName));
      }
      // do the check using input and output lambda
      const rawLambda = inputLambda ?? lambda;
      queryBuilderState.buildWithRawLambda(
        new RawLambda(rawLambda.parameters, rawLambda.body),
      );
      const jsonQuery =
        mockedEditorStore.graphState.graphManager.serializeRawValueSpecification(
          queryBuilderState.getRawLambdaQuery(),
        );
      expect([lambda]).toIncludeSameMembers([jsonQuery]);
    });
  },
);
