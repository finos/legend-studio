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
import { test } from '@jest/globals';
import TEST_DATA__DSL_DataSpace_AnalyticsResult from './TEST_DATA__DSL_DataSpace_AnalyticsResult.json' with { type: 'json' };
import TEST_DATA__DSL_DataSpace_Entities from './TEST_DATA__DSL_DataSpace_Entities.json' with { type: 'json' };
import TEST_DATA__DSL_DataSpace_Artifacts from './TEST_DATA__DSL_DataSpace_Artifacts.json' with { type: 'json' };
import {
  TEST__provideMockedQueryEditorStore,
  TEST_QUERY_NAME,
  TEST__setUpDataSpaceExistingQueryEditor,
} from '../__test-utils__/QueryEditorComponentTestUtils.js';
import { DSL_DataSpace_GraphManagerPreset } from '@finos/legend-extension-dsl-data-space/graph';
import { act } from 'react';
import { QUERY_BUILDER_TEST_ID } from '@finos/legend-query-builder';
import { fireEvent, getByText, waitFor } from '@testing-library/dom';
import { DSL_DataSpace_LegendApplicationPlugin } from '@finos/legend-extension-dsl-data-space/application';

test(
  integrationTest('Load Existing DataSpace Query in Query Editor'),
  async () => {
    const mockedQueryEditorStore = TEST__provideMockedQueryEditorStore({
      extraPlugins: [new DSL_DataSpace_LegendApplicationPlugin()],
      extraPresets: [new DSL_DataSpace_GraphManagerPreset()],
    });
    mockedQueryEditorStore.setExistingQueryName(TEST_QUERY_NAME);
    const { renderResult, queryBuilderState } =
      await TEST__setUpDataSpaceExistingQueryEditor(
        mockedQueryEditorStore,
        TEST_DATA__DSL_DataSpace_AnalyticsResult,
        'domain::COVIDDatapace',
        'dummyContext',
        stub_RawLambda(),
        'mapping::CovidDataMapping',
        TEST_DATA__DSL_DataSpace_Entities,
      );
    const _class = 'domain::COVIDData';
    const _modelClass =
      queryBuilderState.graphManagerState.graph.getClass(_class);
    await act(async () => {
      queryBuilderState.changeClass(_modelClass);
    });
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );
    await waitFor(() => getByText(explorerPanel, 'Cases'));
    await waitFor(() => getByText(explorerPanel, 'Case Type'));
    const templateQueryPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TEMPLATE_QUERY_PANE,
      ),
    );
    const templateQueryIndicator = await waitFor(() =>
      getByText(templateQueryPanel, /Templates\s*\(\s*3\s*\)/),
    );
    fireEvent.click(templateQueryIndicator);
    await waitFor(() =>
      renderResult.getByText('this is template with function pointer'),
    );
    await waitFor(() =>
      renderResult.getByText('this is template with service'),
    );
    await waitFor(() =>
      renderResult.getByText('this is template with inline query'),
    );
    await act(async () => {
      fireEvent.click(renderResult.getByTitle('See more options'));
    });
    await act(async () => {
      fireEvent.click(renderResult.getByText('About Dataspace'));
    });
    const aboutDataSpaceModal = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );
    await waitFor(() => getByText(aboutDataSpaceModal, 'COVID Sample Data'));
    await waitFor(() => getByText(aboutDataSpaceModal, 'dummyContext'));
    await waitFor(() => getByText(aboutDataSpaceModal, 'CovidDataMapping'));
    await waitFor(() => getByText(aboutDataSpaceModal, 'H2Runtime'));

    // TODO: below is for testing dataspace quick start module
    // const openDataSpaceButton = await waitFor(() =>
    //   renderResult.getByTitle('Open advanced search for data space...'),
    // );
    // await waitFor(() => fireEvent.click(openDataSpaceButton));
    // const dataspaceViewModal = await waitFor(() =>
    //   renderResult.getByRole('dialog'),
    // );
    // await waitFor(() => getByText(dataspaceViewModal, 'Quick Start'));
    // // check 3 templates are displayed in quick start panel
    // await waitFor(() => getByText(dataspaceViewModal, 'this is template with function pointer'));
    // await waitFor(() => getByText(dataspaceViewModal, 'this is template with service'));
    // await waitFor(() => getByText(dataspaceViewModal, 'this is template with inline query'));
  },
);

test(
  integrationTest(
    'Load Existing DataSpace Query with minimal graph in Query Editor',
  ),
  async () => {
    const mockedQueryEditorStore = TEST__provideMockedQueryEditorStore({
      extraPlugins: [new DSL_DataSpace_LegendApplicationPlugin()],
      extraPresets: [new DSL_DataSpace_GraphManagerPreset()],
    });
    mockedQueryEditorStore.setExistingQueryName(TEST_QUERY_NAME);
    const { renderResult, queryBuilderState } =
      await TEST__setUpDataSpaceExistingQueryEditor(
        mockedQueryEditorStore,
        TEST_DATA__DSL_DataSpace_AnalyticsResult,
        'domain::COVIDDatapace',
        'dummyContext',
        stub_RawLambda(),
        'mapping::CovidDataMapping',
        [],
        true,
        TEST_DATA__DSL_DataSpace_Artifacts,
      );

    const _class = 'domain::COVIDData';
    const _modelClass =
      queryBuilderState.graphManagerState.graph.getClass(_class);
    await act(async () => {
      queryBuilderState.changeClass(_modelClass);
    });
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );
    await waitFor(() => getByText(explorerPanel, 'Cases'));
    await waitFor(() => getByText(explorerPanel, 'Case Type'));
    const templateQueryPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TEMPLATE_QUERY_PANE,
      ),
    );
    const templateQueryIndicator = await waitFor(() =>
      getByText(templateQueryPanel, /Templates\s*\(\s*3\s*\)/),
    );
    fireEvent.click(templateQueryIndicator);
    await waitFor(() =>
      renderResult.getByText('this is template with function pointer'),
    );
    await waitFor(() =>
      renderResult.getByText('this is template with service'),
    );
    await waitFor(() =>
      renderResult.getByText('this is template with inline query'),
    );
    await act(async () => {
      fireEvent.click(renderResult.getByTitle('See more options'));
    });
    await act(async () => {
      fireEvent.click(renderResult.getByText('About Dataspace'));
    });
    const aboutDataSpaceModal = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );
    await waitFor(() => getByText(aboutDataSpaceModal, 'COVID Sample Data'));
    await waitFor(() => getByText(aboutDataSpaceModal, 'dummyContext'));
    await waitFor(() => getByText(aboutDataSpaceModal, 'CovidDataMapping'));
    await waitFor(() => getByText(aboutDataSpaceModal, 'H2Runtime'));
  },
);
