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

import { test, expect } from '@jest/globals';
import {
  waitFor,
  fireEvent,
  act,
  getByRole,
  getByText,
} from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import { create_RawLambda, stub_RawLambda } from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import TEST_DATA__QueryBuilder_Model_SimpleRelational from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelational.json' with { type: 'json' };
import { TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import { TEST_DATA__simpeFilterWithMilestonedExists } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';

test(
  integrationTest(
    "Show changes button is disabled when query hasn't changed or can't be built",
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

    // Verify button is disabled
    expect(
      renderResult.getByTitle('Query has not been changed'),
    ).not.toBeNull();
    expect(
      renderResult.getByTitle('Query has not been changed'),
    ).toHaveProperty('disabled', true);

    // Change filter value
    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    const filterValueDisplay = getByText(filterPanel, '"0"');
    fireEvent.click(filterValueDisplay);
    const filterValueInput = getByRole(filterPanel, 'textbox');
    fireEvent.change(filterValueInput, { target: { value: '1234' } });

    // Verify button is enabled
    expect(await renderResult.findByTitle('Show changes')).not.toBeNull();
    expect(await renderResult.findByTitle('Show changes')).toHaveProperty(
      'disabled',
      false,
    );

    // Reset filter value
    fireEvent.click(getByRole(filterPanel, 'button', { name: 'Reset' }));

    // Verify button is disabled
    expect(
      await renderResult.findByTitle('Please fix query errors to show changes'),
    ).not.toBeNull();
    expect(
      await renderResult.findByTitle('Please fix query errors to show changes'),
    ).toHaveProperty('disabled', true);
  },
);
