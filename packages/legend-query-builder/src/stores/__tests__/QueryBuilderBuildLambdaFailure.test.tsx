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

import { test, expect, describe } from '@jest/globals';
import {
  TEST_DATA__malformedFilterExpression,
  TEST_DATA__errorInGraphLambda,
  TEST_DATA__unsupportedFunction,
  TEST_DATA__misplacedTakeFunction,
  TEST_DATA__unsupportedFunctionWithFullPath,
  TEST_DATA_malformedFilterExpressionWithSubtype,
  TEST_DATA__malformedTodayFunction,
} from './TEST_DATA__QueryBuilder_Failure.js';
import TEST_DATA__ComplexRelationalModel from './TEST_DATA__QueryBuilder_Model_ComplexRelational.json' with { type: 'json' };
import TEST_DATA__PostFilterModel from './TEST_DATA__QueryBuilder_Model_PostFilter.json' with { type: 'json' };
import { integrationTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import { create_RawLambda } from '@finos/legend-graph';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import { QueryBuilder_GraphManagerPreset } from '../../graph-manager/QueryBuilder_GraphManagerPreset.js';
import { ApplicationStore } from '@finos/legend-application';
import { INTERNAL__BasicQueryBuilderState } from '../QueryBuilderState.js';
import {
  TEST__LegendApplicationPluginManager,
  TEST__getGenericApplicationConfig,
} from '../__test-utils__/QueryBuilderStateTestUtils.js';
import TEST_MilestoningModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_Milestoning.json' with { type: 'json' };
import {
  TEST_DATA__simpleGetAllVersionsInRangeWithBiTemporalClass,
  TEST_DATA__simpleGetAllVersionsInRangeWithNonTemporalClass,
  TEST_DATA__simpleGetAllVersionsWithNonTemporalClass,
} from './TEST_DATA__QueryBuilder_Milestoning.js';
import { QueryBuilderAdvancedWorkflowState } from '../query-workflow/QueryBuilderWorkFlowState.js';
import { act } from '@testing-library/react';

type TestCase = [
  string,
  {
    entities: Entity[];
  },
  { parameters?: object; body?: object },
  string,
];

const relationalCtx = {
  entities: TEST_DATA__ComplexRelationalModel,
};

const postFilterCtx = {
  entities: TEST_DATA__PostFilterModel,
};

const milestoningCtx = {
  entities: TEST_MilestoningModel,
};

const cases: TestCase[] = [
  [
    'Graph element resolution issue',
    relationalCtx,
    TEST_DATA__errorInGraphLambda,
    `Can't find element 'model::pure::tests::model::simple::NotFound'`,
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
  [
    'Malformed filter with subtype',
    relationalCtx,
    TEST_DATA_malformedFilterExpressionWithSubtype,
    `Can't find expression builder for function 'subTypes': no compatible function expression builder available from plugins`,
  ],
  [
    'Malformed filter with today',
    postFilterCtx,
    TEST_DATA__malformedTodayFunction,
    `Can't find expression builder for function 'meta::pure::functions::date::todayyy': no compatible function expression builder available from plugins`,
  ],
  [
    'GetAllVersionsInRange() with bitemporal class',
    milestoningCtx,
    TEST_DATA__simpleGetAllVersionsInRangeWithBiTemporalClass,
    `Can't process getAllVersionsInRange() expression: getAllVersionInRange() expects source class to be processing temporal or business temporal milestoned`,
  ],
  [
    'GetAllVersionsInRange() with non-temporal class',
    milestoningCtx,
    TEST_DATA__simpleGetAllVersionsInRangeWithNonTemporalClass,
    `Can't process getAllVersionsInRange() expression: getAllVersionInRange() expects source class to be processing temporal or business temporal milestoned`,
  ],
  [
    'GetAllVersions() with non-temporal class',
    milestoningCtx,
    TEST_DATA__simpleGetAllVersionsWithNonTemporalClass,
    `Can't process getAllVersions() expression: getAllVersions() expects source class to be milestoned`,
  ],
];

describe(
  integrationTest(
    'Query builder lambda processer should properly handle failure',
  ),
  () => {
    test.each(cases)(
      '%s',
      async (
        testName: TestCase[0],
        context: TestCase[1],
        lambdaJson: TestCase[2],
        errorMessage: TestCase[3],
      ) => {
        const { entities } = context;
        const pluginManager = TEST__LegendApplicationPluginManager.create();
        pluginManager
          .usePresets([new QueryBuilder_GraphManagerPreset()])
          .install();
        const applicationStore = new ApplicationStore(
          TEST__getGenericApplicationConfig(),
          pluginManager,
        );
        const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
        await TEST__buildGraphWithEntities(graphManagerState, entities);
        const queryBuilderState = new INTERNAL__BasicQueryBuilderState(
          applicationStore,
          graphManagerState,
          QueryBuilderAdvancedWorkflowState.INSTANCE,
          undefined,
        );
        await act(async () => {
          queryBuilderState.initializeWithQuery(
            create_RawLambda(lambdaJson.parameters, lambdaJson.body),
          );
        });
        expect(
          queryBuilderState.unsupportedQueryState.lambdaError?.message,
        ).toEqual(errorMessage);
      },
    );
  },
);
