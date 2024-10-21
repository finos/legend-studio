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
import TEST_DATA__QueryBuilder_Model_SimpleRelational from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelational.json';
import { TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import { TEST_DATA__simpeFilterWithMilestonedExists } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';

test(
  integrationTest(
    "Query builder disables correct advanced options if query can't be built",
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

    // Reset filter value
    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    const filterValueDisplay = getByText(filterPanel, '"0"');
    fireEvent.click(filterValueDisplay);
    fireEvent.click(getByRole(filterPanel, 'button', { name: 'Reset' }));

    // Verify buttons are disabled
    fireEvent.click(renderResult.getByRole('button', { name: 'Advanced' }));
    expect(
      await renderResult.findByRole('button', { name: 'Check Entitlements' }),
    ).not.toBeNull();
    expect(
      await renderResult.findByRole('button', { name: 'Check Entitlements' }),
    ).toHaveProperty('disabled', true);
    expect(
      await renderResult.findByRole('button', { name: 'Edit Pure' }),
    ).not.toBeNull();
    expect(
      await renderResult.findByRole('button', { name: 'Edit Pure' }),
    ).toHaveProperty('disabled', true);
    expect(
      await renderResult.findByRole('button', { name: 'Show Protocol' }),
    ).not.toBeNull();
    expect(
      await renderResult.findByRole('button', { name: 'Show Protocol' }),
    ).toHaveProperty('disabled', true);
    expect(
      await renderResult.findByRole('button', { name: 'Show Pure' }),
    ).not.toBeNull();
    expect(
      await renderResult.findByRole('button', { name: 'Show Pure' }),
    ).toHaveProperty('disabled', true);
  },
);

test(
  integrationTest(
    `Query builder doesn't disable "Show Virtual Assistant" button if flag is false`,
  ),

  async () => {
    const { renderResult } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    // Verify help menu button is enabled
    fireEvent.click(renderResult.getByRole('button', { name: 'Help...' }));
    expect(
      await renderResult.findByRole('button', {
        name: 'Show Virtual Assistant',
      }),
    ).not.toBeNull();
    expect(
      await renderResult.findByRole('button', {
        name: 'Show Virtual Assistant',
      }),
    ).toHaveProperty('disabled', false);
  },
);

test(
  integrationTest(
    'Query builder disables "Show Virtual Assistant" button if flag is true',
  ),

  async () => {
    const { renderResult } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
      {
        TEMPORARY__enableExportToCube: false,
        TEMPORARY__disableQueryBuilderChat: false,
        TEMPORARY__enableGridEnterpriseMode: false,
        TEMPORARY__disableVirtualAssistant: true,
        legendAIServiceURL: '',
        zipkinTraceBaseURL: '',
      },
    );

    // Verify status bar button is disabled
    expect(
      await renderResult.findByTitle('Virtual Assistant is disabled'),
    ).not.toBeNull();
    expect(
      await renderResult.findByTitle('Virtual Assistant is disabled'),
    ).toHaveProperty('disabled', true);

    // Verify help menu button is disabled
    fireEvent.click(renderResult.getByRole('button', { name: 'Help...' }));
    expect(
      await renderResult.findByRole('button', {
        name: 'Show Virtual Assistant',
      }),
    ).not.toBeNull();
    expect(
      await renderResult.findByRole('button', {
        name: 'Show Virtual Assistant',
      }),
    ).toHaveProperty('disabled', true);
  },
);
