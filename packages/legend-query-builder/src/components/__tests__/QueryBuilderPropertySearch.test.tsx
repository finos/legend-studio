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
  fireEvent,
  getByTitle,
  act,
  findByDisplayValue,
  getByPlaceholderText,
  findByText,
} from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import TEST_DATA__QueryBuilder_Model_PropertySearch from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_PropertySearch.json' assert { type: 'json' };
import { stub_RawLambda } from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { TEST_DATA__ModelCoverageAnalysisResult_SimpleRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';

test(
  integrationTest(
    'Query builder property search state is properly set after processing a simple getAll()',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_PropertySearch,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelational,
    );

    await act(async () => {
      queryBuilderState.changeClass(
        queryBuilderState.graphManagerState.graph.getClass('my::Firm'),
      );
    });

    const queryBuilderSetupPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP,
    );
    await findByText(queryBuilderSetupPanel, 'Firm');
    await findByText(queryBuilderSetupPanel, 'map');
    await findByText(queryBuilderSetupPanel, 'runtime');

    const queryBuilder = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER,
    );

    // Type search term to open property search panel
    const searchInput = getByPlaceholderText(
      queryBuilder,
      'One or more terms, ESC to clear',
    );
    fireEvent.change(searchInput, { target: { value: 'name' } });
    await findByDisplayValue(queryBuilder, 'name');
    await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL,
    );
    expect(queryBuilderState.explorerState.propertySearchState.searchText).toBe(
      'name',
    );

    await act(async () => {
      queryBuilderState.explorerState.propertySearchState.setSearchText('Name');
      queryBuilderState.explorerState.propertySearchState.search();
    });

    expect(
      queryBuilderState.explorerState.propertySearchState.searchResults.length,
    ).toBe(3);
    fireEvent.click(getByTitle(queryBuilder, 'Clear'));
    expect(
      queryBuilderState.explorerState.propertySearchState.searchResults.length,
    ).toBe(0);
  },
);
