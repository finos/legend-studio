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
import { fireEvent, getByTitle, getByText, act } from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared';
import { getByDisplayValue, waitFor } from '@testing-library/dom';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { Query_GraphPreset } from '../../models/Query_GraphPreset.js';
import {
  TEST__provideMockedLegendQueryStore,
  TEST__setUpQueryEditor,
} from '../QueryComponentTestUtils.js';
import TEST_DATA__QueryBuilder_Model_PropertySearch from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_PropertySearch.json';
import { stub_RawLambda } from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../QueryBuilder_TestID.js';
import { Mocked_ModelCoverageAnalyticsResult_SimpleRelationalModel } from '../../stores/__tests__/TEST_DATA__Mocked_ModelCoverageAnalyticsResult.js';

test(
  integrationTest(
    'Query builder property search state is properly set after processing a simple getAll()',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new Query_GraphPreset()]).install();
    const mockedQueryStore = TEST__provideMockedLegendQueryStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      mockedQueryStore,
      TEST_DATA__QueryBuilder_Model_PropertySearch,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      Mocked_ModelCoverageAnalyticsResult_SimpleRelationalModel,
    );
    const queryBuilderState = mockedQueryStore.queryBuilderState;
    const _firmClass =
      mockedQueryStore.graphManagerState.graph.getClass('my::Firm');

    act(() => {
      queryBuilderState.changeClass(_firmClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Firm'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));
    const queryBuilder = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
    );
    fireEvent.click(getByTitle(queryBuilder, 'Search for property'));
    const searchPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL,
      ),
    );
    const searchInput = getByDisplayValue(searchPanel, '');
    fireEvent.change(searchInput, { target: { value: 'name' } });
    await waitFor(() => getByDisplayValue(searchPanel, 'name'));
    expect(
      queryBuilderState.explorerState.propertySearchPanelState.searchText,
    ).toBe('name');
    expect(
      queryBuilderState.explorerState.propertySearchPanelState
        .searchedMappedPropertyNodes.length,
    ).toBe(3);
    fireEvent.click(getByTitle(searchPanel, 'Clear'));
    expect(
      queryBuilderState.explorerState.propertySearchPanelState
        .searchedMappedPropertyNodes.length,
    ).toBe(0);
  },
);
