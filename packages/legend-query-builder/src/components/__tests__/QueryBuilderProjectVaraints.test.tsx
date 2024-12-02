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

import type { Entity } from '@finos/legend-storage';
import { describe, test, expect } from '@jest/globals';
import {
  act,
  getAllByText,
  getByText,
  queryByText,
  waitFor,
} from '@testing-library/react';
import TEST_DATA__QueryBuilder_Model_SimpleRelational from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelational.json' with { type: 'json' };
import {
  TEST_DATA__projectWithColFunctionCollection,
  TEST_DATA__projectWithColumnNameNotCollection,
  TEST_DATA__projectWithLambdaNotCollection,
  TEST_DATA__projectWithSingleColFunction,
  TEST_DATA__simpleBasicProject,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_ProjectVariants.js';
import { integrationTest } from '@finos/legend-shared/test';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import {
  create_RawLambda,
  extractElementNameFromPath,
  stub_RawLambda,
} from '@finos/legend-graph';
import { TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { guaranteeType } from '@finos/legend-shared';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';

type TestCase = [
  string,
  {
    _class: string;
    entities: Entity[];
    mapping: string;
    runtime: string;
    rawLambda: { parameters?: object; body?: object };
    expectedRawLambda: { parameters?: object; body?: object };
    colLength: number;
    colAlias: string[];
  },
];

const cases: TestCase[] = [
  [
    'Simple basic projection',
    {
      _class: 'model::Firm',
      entities: TEST_DATA__QueryBuilder_Model_SimpleRelational,
      mapping: 'execution::RelationalMapping',
      runtime: 'execution::Runtime',
      rawLambda: TEST_DATA__simpleBasicProject,
      expectedRawLambda: TEST_DATA__simpleBasicProject,
      colLength: 1,
      colAlias: ['Id'],
    },
  ],
  [
    'Simple projection whose lambda (#1 parameter) is not a collection',
    {
      _class: 'model::Firm',
      entities: TEST_DATA__QueryBuilder_Model_SimpleRelational,
      mapping: 'execution::RelationalMapping',
      runtime: 'execution::Runtime',
      rawLambda: TEST_DATA__projectWithLambdaNotCollection,
      expectedRawLambda: TEST_DATA__simpleBasicProject,
      colLength: 1,
      colAlias: ['Id'],
    },
  ],
  [
    'Simple projection whose col names (#2 parameter) is not a collection',
    {
      _class: 'model::Firm',
      entities: TEST_DATA__QueryBuilder_Model_SimpleRelational,
      mapping: 'execution::RelationalMapping',
      runtime: 'execution::Runtime',
      rawLambda: TEST_DATA__projectWithColumnNameNotCollection,
      expectedRawLambda: TEST_DATA__simpleBasicProject,
      colLength: 1,
      colAlias: ['Id'],
    },
  ],
  [
    'Simple projection with single col function',
    {
      _class: 'model::Firm',
      entities: TEST_DATA__QueryBuilder_Model_SimpleRelational,
      mapping: 'execution::RelationalMapping',
      runtime: 'execution::Runtime',
      rawLambda: TEST_DATA__projectWithSingleColFunction,
      expectedRawLambda: TEST_DATA__projectWithColFunctionCollection,
      colLength: 1,
      colAlias: ['Id'],
    },
  ],
  [
    'Simple projection with a col func collection',
    {
      _class: 'model::Firm',
      entities: TEST_DATA__QueryBuilder_Model_SimpleRelational,
      mapping: 'execution::RelationalMapping',
      runtime: 'execution::Runtime',
      rawLambda: TEST_DATA__projectWithColFunctionCollection,
      expectedRawLambda: TEST_DATA__projectWithColFunctionCollection,
      colLength: 1,
      colAlias: ['Id'],
    },
  ],
];

describe(
  integrationTest('Test Query Builder is able to understand project variants'),
  () => {
    test.each(cases)(
      '%s',
      async (testName: TestCase[0], testCase: TestCase[1]) => {
        const {
          _class,
          entities,
          mapping,
          runtime,
          rawLambda,
          expectedRawLambda,
          colLength,
          colAlias,
        } = testCase;
        const { renderResult, queryBuilderState } =
          await TEST__setUpQueryBuilder(
            entities,
            stub_RawLambda(),
            mapping,
            runtime,
            TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
          );

        await act(async () => {
          queryBuilderState.changeClass(
            queryBuilderState.graphManagerState.graph.getClass(_class),
          );
        });
        const setupPanel = await waitFor(() =>
          renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
        );
        await waitFor(() =>
          getByText(setupPanel, extractElementNameFromPath(_class)),
        );
        await waitFor(() =>
          getByText(setupPanel, extractElementNameFromPath(mapping)),
        );
        expect(
          getAllByText(setupPanel, extractElementNameFromPath(runtime)).length,
        ).toBeGreaterThanOrEqual(1);
        await act(async () => {
          queryBuilderState.initializeWithQuery(
            create_RawLambda(rawLambda.parameters, rawLambda.body),
          );
        });
        const tdsState = guaranteeType(
          queryBuilderState.fetchStructureState.implementation,
          QueryBuilderTDSState,
        );
        const projectionCols = await waitFor(() =>
          renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS),
        );
        await Promise.all(
          colAlias.map(async (col) => {
            const result = await waitFor(() =>
              queryByText(projectionCols, col),
            );
            expect(result).not.toBeNull();
          }),
        );
        expect(tdsState.projectionColumns.length).toBe(colLength);

        // Check whether the rawLambda we build is expected
        expect(
          queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
            queryBuilderState.buildQuery(),
          ),
        ).toEqual(expectedRawLambda);
      },
    );
  },
);
