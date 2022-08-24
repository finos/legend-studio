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

import { expect, test, describe } from '@jest/globals';
import {
  guaranteeType,
  integrationTest,
  type TEMPORARY__JestMatcher,
} from '@finos/legend-shared';
import TEST_DATA__PostFilterModel from './TEST_DATA__QueryBuilder_Model_PostFilter.json';
import TEST_DATA__COVIDDataSimpleModel from './TEST_DATA__QueryBuilder_Model_COVID.json';
import { RawLambda } from '@finos/legend-graph';
import { TEST_DATA__lambda_simpleSingleConditionFilter } from './TEST_DATA__QueryBuilder_Roundtrip_TestFilterQueries.js';
import { QueryBuilderFilterTreeConditionNodeData } from '../filter/QueryBuilderFilterState.js';
import { TEST_DATA__lambda_derivationPostFilter } from './TEST_DATA__QueryBuilder_Roundtrip_TestPostFilterQueries.js';
import { QueryBuilderPostFilterTreeConditionNodeData } from '../fetch-structure/projection/post-filter/QueryBuilderPostFilterState.js';
import type { Entity } from '@finos/legend-storage';
import type { QueryBuilderState } from '../QueryBuilderState.js';
import {
  TEST_DATA__lambda_expected_typeahead_filter,
  TEST_DATA__lambda_expected_typeahead_postFilter,
  TEST_DATA__lambda_expected_typeahead_postFilter_with_derivation,
  TEST_DATA__lambda_typeahead_simple_postFilter,
} from './TEST_DATA__QueryBuilder_TestTypeaheadSearch.js';
import { TEST_setUpQueryBuilderState } from '../QueryBuilderTestUtils.js';
import {
  buildProjectionColumnTypeaheadQuery,
  buildPropertyTypeaheadQuery,
} from '../QueryBuilderTypeaheadHelper.js';

type TypeaheadTestCase = [
  string,
  {
    entities: Entity[];
  },
  { parameters?: object; body?: object },
  { parameters?: object; body?: object },
  boolean,
];

const cases: TypeaheadTestCase[] = [
  [
    'Simple typeahead search on filter',
    {
      entities: TEST_DATA__COVIDDataSimpleModel,
    },
    TEST_DATA__lambda_simpleSingleConditionFilter,
    TEST_DATA__lambda_expected_typeahead_filter,
    false,
  ],
  [
    'Simple typeahead search on post-filter',
    {
      entities: TEST_DATA__PostFilterModel,
    },
    TEST_DATA__lambda_typeahead_simple_postFilter,
    TEST_DATA__lambda_expected_typeahead_postFilter,
    true,
  ],
  [
    'Simple typeahead search on post-filter with derivation column',
    {
      entities: TEST_DATA__PostFilterModel,
    },
    TEST_DATA__lambda_derivationPostFilter,
    TEST_DATA__lambda_expected_typeahead_postFilter_with_derivation,
    true,
  ],
];

describe(integrationTest('Query builder type ahead'), () => {
  test.each(cases)(
    '%s',
    async (
      testName: TypeaheadTestCase[0],
      context: TypeaheadTestCase[1],
      lambda: TypeaheadTestCase[2],
      expectedTypeaheadLambda: TypeaheadTestCase[3],
      testPostFilter: TypeaheadTestCase[4],
    ) => {
      const { entities } = context;
      const queryBuilderState = await TEST_setUpQueryBuilderState(
        entities,
        new RawLambda(lambda.parameters, lambda.body),
      );

      let typeaheadQueryState: QueryBuilderState;
      if (testPostFilter) {
        const postFilterNode = guaranteeType(
          queryBuilderState.fetchStructureState.projectionState.postFilterState.getRootNode(),
          QueryBuilderPostFilterTreeConditionNodeData,
        );
        typeaheadQueryState = buildProjectionColumnTypeaheadQuery(
          queryBuilderState,
          postFilterNode.condition.columnState,
          postFilterNode.condition.value,
        );
      } else {
        const filterNode = guaranteeType(
          queryBuilderState.filterState.getRootNode(),
          QueryBuilderFilterTreeConditionNodeData,
        );
        typeaheadQueryState = buildPropertyTypeaheadQuery(
          queryBuilderState,
          filterNode.condition.propertyExpressionState.propertyExpression,
          filterNode.condition.value,
        );
      }
      const jsonQuery =
        queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
          typeaheadQueryState.resultState.buildExecutionRawLambda(),
        );
      (
        expect([expectedTypeaheadLambda]) as TEMPORARY__JestMatcher
      ).toIncludeSameMembers([jsonQuery]);
    },
  );
});
