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

import { expect, test } from '@jest/globals';
import {
  waitFor,
  fireEvent,
  getByTitle,
  getByText,
  act,
  getAllByText,
} from '@testing-library/react';
import {
  TEST_DATA__simpeFilterWithMilestonedExists,
  TEST_DATA__simpleFilterWithDateTimeWithSeconds,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import {
  TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
} from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import { integrationTest } from '@finos/legend-shared/test';
import { create_RawLambda, stub_RawLambda } from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import TEST_DATA__QueryBuilder_Model_SimpleRelational from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelational.json';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' assert { type: 'json' };

test(
  integrationTest(
    'Query builder loads simple exists filter node which is milestoned',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__simpeFilterWithMilestonedExists.parameters,
          TEST_DATA__simpeFilterWithMilestonedExists.body,
        ),
      );
    });

    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER),
    );
    await waitFor(() => getByText(filterPanel, 'Pincode'));
    await waitFor(() =>
      getByTitle(filterPanel, 'Set Derived Property Argument(s)...'),
    );
    fireEvent.click(
      getByTitle(filterPanel, 'Set Derived Property Argument(s)...'),
    );
    const dpModal = await waitFor(() => renderResult.getByRole('dialog'));
    await waitFor(() => getByText(dpModal, 'Derived Property'));
    await waitFor(() => getAllByText(dpModal, 'businessDate'));
  },
);

test(
  integrationTest('Query builder loads simple filter with DateTime value'),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          undefined,
          TEST_DATA__simpleFilterWithDateTimeWithSeconds.body,
        ),
      );
    });
    const queryBuilderFilterPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER),
    );

    expect(
      await waitFor(() =>
        getByText(queryBuilderFilterPanel, '2023-09-09T13:31:00'),
      ),
    ).not.toBeNull();
  },
);
