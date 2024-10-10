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

import { stub_RawLambda } from '@finos/legend-graph';
import { integrationTest } from '@finos/legend-shared/test';
import TEST_DATA_SimpleCalendarModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_Calendar.json' with { type: 'json' };
import { expect, test } from '@jest/globals';
import {
  fireEvent,
  getByText,
  getByTitle,
  waitFor,
} from '@testing-library/dom';
import { act } from 'react';
import { TEST_DATA__ModelCoverageAnalysisResult_Calendar } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Calendar.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';

test(
  integrationTest('Query builder successfully renders function explorer tree'),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA_SimpleCalendarModel,
      stub_RawLambda(),
      'test::mapping',
      'test::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_Calendar,
    );

    const employeeClass =
      queryBuilderState.graphManagerState.graph.getClass('test::Employee');
    await act(async () => {
      queryBuilderState.changeClass(employeeClass);
    });
    queryBuilderState.setShowFunctionsExplorerPanel(true);
    const queryBuilderFunctionPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FUNCTIONS),
    );
    expect(
      getByText(queryBuilderFunctionPanel, 'test::testYtd():Any[*]'),
    ).not.toBeNull();
    fireEvent.click(getByTitle(queryBuilderFunctionPanel, 'View as Tree'));
    expect(getByText(queryBuilderFunctionPanel, 'test')).not.toBeNull();
    fireEvent.click(getByTitle(queryBuilderFunctionPanel, 'test'));
    expect(
      getByText(queryBuilderFunctionPanel, 'testYtd():Any[*]'),
    ).not.toBeNull();
  },
);
