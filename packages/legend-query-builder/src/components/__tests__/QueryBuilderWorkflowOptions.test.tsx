/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { describe, expect, test } from '@jest/globals';
import { act, type RenderResult, waitFor } from '@testing-library/react';
import { create_RawLambda, stub_RawLambda } from '@finos/legend-graph';
import { integrationTest } from '@finos/legend-shared/test';
import { TEST_DATA__simpleProjection } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import { TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' with { type: 'json' };
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  QueryBuilderAdvancedWorkflowState,
  type QueryBuilderWorkflowState,
} from '../../stores/query-workflow/QueryBuilderWorkFlowState.js';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';

/**
 * A workflow that embeds the query builder for a part of a query, as a
 * Legend Cube data space source does: no header menus, aggregates or query
 * options, which the embedding application does after the query builder's
 * part
 */
class TEST__EmbeddedWorkflowState extends QueryBuilderAdvancedWorkflowState {
  override get showHeaderMenus(): boolean {
    return false;
  }

  override get showProjectionAggregation(): boolean {
    return false;
  }

  override get showQueryOptions(): boolean {
    return false;
  }
}

/** The query builder on a simple projection of people, with the workflow */
const renderProjection = async (
  workflowState: QueryBuilderWorkflowState,
): Promise<RenderResult> => {
  const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
    TEST_DATA__ComplexRelationalModel,
    stub_RawLambda(),
    'model::relational::tests::simpleRelationalMapping',
    'model::MyRuntime',
    TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    workflowState,
  );
  await act(async () => {
    queryBuilderState.initializeWithQuery(
      create_RawLambda(
        TEST_DATA__simpleProjection.parameters,
        TEST_DATA__simpleProjection.body,
      ),
    );
  });
  await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS),
  );
  return renderResult;
};

describe('The query builder workflow options', () => {
  test(
    integrationTest(
      'Shows the header menus, the aggregate operators and the query options by default',
    ),
    async () => {
      const renderResult = await renderProjection(
        QueryBuilderAdvancedWorkflowState.INSTANCE,
      );
      expect(renderResult.getByTitle('Show Advanced Menu...')).toBeTruthy();
      expect(renderResult.getByTitle('See more options')).toBeTruthy();
      expect(
        renderResult.getAllByTitle('Choose Aggregate Operator...'),
      ).not.toHaveLength(0);
      expect(
        renderResult.getByTestId(
          QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_RESULT_MODIFIER_PROMPT,
        ),
      ).toBeTruthy();
    },
  );

  test(
    integrationTest(
      'Hides the header menus, the aggregate operators and the query options for a workflow that turns them off, keeping the columns and undo',
    ),
    async () => {
      const renderResult = await renderProjection(
        new TEST__EmbeddedWorkflowState(),
      );
      expect(renderResult.queryByTitle('Show Advanced Menu...')).toBeNull();
      expect(renderResult.queryByTitle('See more options')).toBeNull();
      expect(
        renderResult.queryAllByTitle('Choose Aggregate Operator...'),
      ).toHaveLength(0);
      expect(
        renderResult.queryByTestId(
          QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_RESULT_MODIFIER_PROMPT,
        ),
      ).toBeNull();
      // the projection's columns stay, and so do undo and redo
      expect(renderResult.getByText('Edited First Name')).toBeTruthy();
      expect(renderResult.getByTitle('Undo(ctrl + z)')).toBeTruthy();
      expect(renderResult.getByTitle('Redo(ctrl + y)')).toBeTruthy();
    },
  );
});
