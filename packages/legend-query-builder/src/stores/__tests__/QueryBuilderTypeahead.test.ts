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
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { integrationTest } from '@finos/legend-shared/test';
import TEST_DATA__PostFilterModel from './TEST_DATA__QueryBuilder_Model_PostFilter.json' assert { type: 'json' };
import TEST_DATA__COVIDDataSimpleModel from './TEST_DATA__QueryBuilder_Model_COVID.json' assert { type: 'json' };
import TEST_DATA__MilestoningSimpleModel from './TEST_DATA__QueryBuilder_Model_SimpleMilestoning.json' assert { type: 'json' };
import { RawLambda } from '@finos/legend-graph';
import {
  TEST_DATA__lambda_simpleSingleConditionFilter,
  TEST_DATA__simpleSingleConditionMilestoningFilter,
} from './TEST_DATA__QueryBuilder_Roundtrip_TestFilterQueries.js';
import { TEST_DATA__lambda_derivationPostFilter } from './TEST_DATA__QueryBuilder_Roundtrip_TestPostFilterQueries.js';
import {
  FilterValueSpecConditionValueState,
  QueryBuilderFilterTreeConditionNodeData,
} from '../filter/QueryBuilderFilterState.js';
import {
  PostFilterValueSpecConditionValueState,
  QueryBuilderPostFilterTreeConditionNodeData,
} from '../fetch-structure/tds/post-filter/QueryBuilderPostFilterState.js';
import type { Entity } from '@finos/legend-storage';
import {
  TEST_DATA__lambda_expected_typeahead_filter,
  TEST_DATA__lambda_expected_typeahead_filter_milestoning,
  TEST_DATA__lambda_expected_typeahead_postFilter,
  TEST_DATA__lambda_expected_typeahead_postFilter_milestoning,
  TEST_DATA__lambda_expected_typeahead_postFilter_with_derivation,
  TEST_DATA__lambda_typeahead_simple_postFilter,
  TEST_DATA__lambda_typeahead_simple_postFilter_milestoning,
} from './TEST_DATA__QueryBuilder_TestTypeaheadSearch.js';
import { TEST__setUpQueryBuilderState } from '../__test-utils__/QueryBuilderStateTestUtils.js';
import { QueryBuilderProjectionColumnState } from '../fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import { QueryBuilderAggregateColumnState } from '../fetch-structure/tds/aggregation/QueryBuilderAggregationState.js';
import {
  buildProjectionColumnTypeaheadQuery,
  buildPropertyTypeaheadQuery,
} from '../QueryBuilderTypeaheadHelper.js';
import { QueryBuilderTDSState } from '../fetch-structure/tds/QueryBuilderTDSState.js';

type TypeaheadTestCase = [
  string,
  {
    entities: Entity[];
  },
  { parameters?: object; body?: object },
  { parameters?: object; body?: object },
];

const FILTER_CASES: TypeaheadTestCase[] = [
  [
    'Simple typeahead search on filter',
    {
      entities: TEST_DATA__COVIDDataSimpleModel,
    },
    TEST_DATA__lambda_simpleSingleConditionFilter,
    TEST_DATA__lambda_expected_typeahead_filter,
  ],
  [
    'Simple typeahead search on filter with milestoned field',
    {
      entities: TEST_DATA__MilestoningSimpleModel,
    },
    TEST_DATA__simpleSingleConditionMilestoningFilter,
    TEST_DATA__lambda_expected_typeahead_filter_milestoning,
  ],
];

describe(integrationTest('Query builder type ahead: filter'), () => {
  test.each(FILTER_CASES)(
    '%s',
    async (
      testName: TypeaheadTestCase[0],
      context: TypeaheadTestCase[1],
      lambda: TypeaheadTestCase[2],
      expectedTypeaheadLambda: TypeaheadTestCase[3],
    ) => {
      const { entities } = context;
      const queryBuilderState = await TEST__setUpQueryBuilderState(
        entities,
        new RawLambda(lambda.parameters, lambda.body),
      );
      const filterNode = guaranteeType(
        queryBuilderState.filterState.getRootNode(),
        QueryBuilderFilterTreeConditionNodeData,
      );
      const filterNodeRightConditionValue = guaranteeType(
        filterNode.condition.rightConditionValue,
        FilterValueSpecConditionValueState,
      );
      const jsonQuery =
        queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
          buildPropertyTypeaheadQuery(
            queryBuilderState,
            filterNode.condition.propertyExpressionState.propertyExpression,
            filterNodeRightConditionValue.value,
          ),
        );
      expect(expectedTypeaheadLambda).toEqual(jsonQuery);
      // Check that we haven't modified actual lambda in the process of building lambda for typeahead search
      expect(lambda).toEqual(
        queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
          queryBuilderState.buildQuery(),
        ),
      );
    },
  );
});

const POST_FILTER_CASES: TypeaheadTestCase[] = [
  [
    'Simple typeahead search on post-filter',
    {
      entities: TEST_DATA__PostFilterModel,
    },
    TEST_DATA__lambda_typeahead_simple_postFilter,
    TEST_DATA__lambda_expected_typeahead_postFilter,
  ],
  [
    'Simple typeahead search on post-filter with derivation column',
    {
      entities: TEST_DATA__PostFilterModel,
    },
    TEST_DATA__lambda_derivationPostFilter,
    TEST_DATA__lambda_expected_typeahead_postFilter_with_derivation,
  ],
  [
    'Simple typeahead search on post-filter with milestoned field',
    {
      entities: TEST_DATA__MilestoningSimpleModel,
    },
    TEST_DATA__lambda_typeahead_simple_postFilter_milestoning,
    TEST_DATA__lambda_expected_typeahead_postFilter_milestoning,
  ],
];

describe(integrationTest('Query builder type ahead: post-filter'), () => {
  test.each(POST_FILTER_CASES)(
    '%s',
    async (
      testName: TypeaheadTestCase[0],
      context: TypeaheadTestCase[1],
      lambda: TypeaheadTestCase[2],
      expectedTypeaheadLambda: TypeaheadTestCase[3],
    ) => {
      const { entities } = context;
      const queryBuilderState = await TEST__setUpQueryBuilderState(
        entities,
        new RawLambda(lambda.parameters, lambda.body),
      );

      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      const postFilterNode = guaranteeType(
        tdsState.postFilterState.getRootNode(),
        QueryBuilderPostFilterTreeConditionNodeData,
      );
      const columnState =
        postFilterNode.condition.leftConditionValue instanceof
          QueryBuilderProjectionColumnState ||
        postFilterNode.condition.leftConditionValue instanceof
          QueryBuilderAggregateColumnState
          ? postFilterNode.condition.leftConditionValue
          : undefined;
      const jsonQuery =
        queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
          buildProjectionColumnTypeaheadQuery(
            queryBuilderState,
            guaranteeNonNullable(columnState),
            guaranteeType(
              postFilterNode.condition.rightConditionValue,
              PostFilterValueSpecConditionValueState,
            ).value,
          ),
        );
      expect(expectedTypeaheadLambda).toEqual(jsonQuery);
      // Check that we haven't modified actual lambda in the process of building lambda for typeahead search
      expect(lambda).toEqual(
        queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
          queryBuilderState.buildQuery(),
        ),
      );
    },
  );
});
