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

import { test, describe, expect } from '@jest/globals';
import {
  guaranteeType,
  integrationTest,
  type TEMPORARY__JestMatcher,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import {
  TEST_DATA__PreviewData_entities,
  TEST_DATA__PreviewData_lambda_non_numeric,
  TEST_DATA__PreviewData_lambda_numeric,
  TEST_DATA__PreviewData_modelCoverageAnalysisResult,
} from './TEST_DATA__QueryBuilder_PreviewDataTest.js';
import {
  buildPropertyExpressionFromExplorerTreeNodeData,
  QueryBuilderExplorerTreePropertyNodeData,
} from '../explorer/QueryBuilderExplorerState.js';
import {
  buildNonNumericPreviewDataQuery,
  buildNumericPreviewDataQuery,
} from '../QueryBuilderPreviewDataHelper.js';
import { TEST_setUpQueryBuilderState } from '../QueryBuilderTestUtils.js';
import type { RawMappingModelCoverageAnalysisResult } from '@finos/legend-graph';

type PreviewDataTestCase = [
  string,
  {
    entities: Entity[];
    _class: string;
    mapping: string;
    rawMappingModelCoverageAnalysisResult: RawMappingModelCoverageAnalysisResult;
  },
  string,
  { parameters?: object; body?: object },
  boolean,
];

const cases: PreviewDataTestCase[] = [
  [
    'Simple preview data on non-numeric property',
    {
      entities: TEST_DATA__PreviewData_entities,
      _class: 'model::Person',
      mapping: 'model::RelationalMapping',
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__PreviewData_modelCoverageAnalysisResult,
    },
    'lastName',
    TEST_DATA__PreviewData_lambda_non_numeric,
    false,
  ],
  [
    'Simple preview data on numeric property',
    {
      entities: TEST_DATA__PreviewData_entities,
      _class: 'model::Person',
      mapping: 'model::RelationalMapping',
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__PreviewData_modelCoverageAnalysisResult,
    },
    'age',
    TEST_DATA__PreviewData_lambda_numeric,
    true,
  ],
];

describe(integrationTest('Query builder preview data'), () => {
  test.each(cases)(
    '%s',
    async (
      testName: PreviewDataTestCase[0],
      context: PreviewDataTestCase[1],
      nodeId: PreviewDataTestCase[2],
      expectedTypeaheadLambda: PreviewDataTestCase[3],
      numeric: PreviewDataTestCase[4],
    ) => {
      const {
        entities,
        _class,
        mapping,
        rawMappingModelCoverageAnalysisResult,
      } = context;
      const queryBuilderState = await TEST_setUpQueryBuilderState(
        entities,
        undefined,
        {
          _class,
          mapping,
        },
        rawMappingModelCoverageAnalysisResult,
      );
      const propertyNode = guaranteeType(
        queryBuilderState.explorerState.nonNullableTreeData.nodes.get(nodeId),
        QueryBuilderExplorerTreePropertyNodeData,
      );

      const propertyExpression =
        buildPropertyExpressionFromExplorerTreeNodeData(
          queryBuilderState.explorerState.nonNullableTreeData,
          propertyNode,
          queryBuilderState.graphManagerState.graph,
          queryBuilderState.explorerState.propertySearchPanelState
            .allMappedPropertyNodes,
        );
      const rawLambda = numeric
        ? buildNumericPreviewDataQuery(queryBuilderState, propertyExpression)
        : buildNonNumericPreviewDataQuery(
            queryBuilderState,
            propertyExpression,
          );

      const jsonQuery =
        queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
          rawLambda,
        );
      (
        expect([expectedTypeaheadLambda]) as TEMPORARY__JestMatcher
      ).toIncludeSameMembers([jsonQuery]);
    },
  );
});
