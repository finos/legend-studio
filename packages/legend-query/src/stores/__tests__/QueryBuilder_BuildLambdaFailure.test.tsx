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
import {
  TEST_DATA__malformedFilterExpression,
  TEST_DATA__errorInGraphLambda,
  TEST_DATA__unsupportedFunction,
  TEST_DATA__misplacedTakeFunction,
  TEST_DATA__unsupportedFunctionWithFullPath,
} from './QueryBuilder_FailureTestData';
import TEST_DATA__ComplexRelationalModel from './TEST_DATA__QueryBuilder_Model_ComplexRelational.json';
import { integrationTest } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-model-storage';
import {
  RawLambda,
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph';
import { QueryPluginManager } from '../../application/QueryPluginManager';
import { Query_GraphPreset } from '../../models/Query_GraphPreset';
import { TEST__getTestApplicationStore } from '@finos/legend-application';
import { QueryBuilderState } from '../QueryBuilderState';

const getRawLambda = (jsonRawLambda: {
  parameters?: object;
  body?: object;
}): RawLambda => new RawLambda(jsonRawLambda.parameters, jsonRawLambda.body);

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
        const { entities } = context;
        const pluginManager = QueryPluginManager.create();
        pluginManager.usePresets([new Query_GraphPreset()]).install();
        const applicationStore = TEST__getTestApplicationStore();
        const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
        await TEST__buildGraphWithEntities(graphManagerState, entities);
        const queryBuilderState = new QueryBuilderState(
          applicationStore,
          graphManagerState,
        );
        expect(() =>
          queryBuilderState.buildStateFromRawLambda(getRawLambda(lambdaJson)),
        ).toThrowError(errorMessage);
      },
    );
  },
);
