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

import {
  stub_RawLambda,
  extractElementNameFromPath,
  create_RawLambda,
} from '@finos/legend-graph';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { integrationTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import { test } from '@jest/globals';
import { waitFor, getByText, fireEvent, act } from '@testing-library/react';
import {
  TEST__setUpQueryBuilder,
  dragAndDrop,
} from '../../components/__test-utils__/QueryBuilderComponentTestUtils.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { QueryBuilderTDSState } from '../fetch-structure/tds/QueryBuilderTDSState.js';
import { TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection } from './TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ChangeDetectionModel from './TEST_DATA__QueryBuilder_Model_ChangeDetection.json' with { type: 'json' };
import { TEST_DATA__TestChangeDetectionWithSimpleProject } from './TEST_DATA__QueryBuilder_TestChangeDetection.js';

test(integrationTest('Test change detection'), async () => {
  const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
    TEST_DATA__ChangeDetectionModel as Entity[],
    stub_RawLambda(),
    'my::map',
    'my::runtime',
    TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection,
  );

  await act(async () => {
    queryBuilderState.changeClass(
      queryBuilderState.graphManagerState.graph.getClass('my::Firm'),
    );
  });
  const setupPanel = await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
  );
  await waitFor(() =>
    getByText(setupPanel, extractElementNameFromPath('my::Firm')),
  );
  await waitFor(() =>
    getByText(setupPanel, extractElementNameFromPath('my::map')),
  );
  await waitFor(() =>
    getByText(setupPanel, extractElementNameFromPath('my::runtime')),
  );
  await act(async () => {
    queryBuilderState.initializeWithQuery(
      create_RawLambda(
        TEST_DATA__TestChangeDetectionWithSimpleProject.parameters,
        TEST_DATA__TestChangeDetectionWithSimpleProject.body,
      ),
    );
  });
  const projectionCols = await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS),
  );
  await waitFor(() => getByText(projectionCols, 'Legal Name'));
  await act(async () => {
    guaranteeNonNullable(
      guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      ).projectionColumns[0],
    ).setColumnName('Name');
  });
  await waitFor(() => getByText(projectionCols, 'Name'));
  await act(async () => {
    guaranteeNonNullable(
      guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      ).projectionColumns[0],
    ).setColumnName('Legal Name');
  });
  await waitFor(() => getByText(projectionCols, 'Legal Name'));

  // Test Redo/Undo action in Query Builder
  await act(async () => {
    fireEvent.click(renderResult.getByText('Undo'));
  });
  await waitFor(() => getByText(projectionCols, 'Name'));
  await act(async () => {
    fireEvent.click(renderResult.getByText('Redo'));
  });
  await waitFor(() => getByText(projectionCols, 'Legal Name'));

  const filterPanel = await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL),
  );
  const explorerPanel = await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
  );
  // Drag and drop
  const dropZone = await waitFor(() =>
    getByText(filterPanel, 'Add a filter condition'),
  );
  const dragSource = await waitFor(() =>
    getByText(explorerPanel, 'Legal Name'),
  );
  await dragAndDrop(
    dragSource,
    dropZone,
    filterPanel,
    'Add a filter condition',
  );
  await waitFor(() => getByText(filterPanel, 'Legal Name'));

  // TODO: @YannanGao-gs - update and fix this test

  // await act(async () => {
  //   fireEvent.click(renderResult.getByText('Undo'));
  // });
  // await act(async () => {
  //   fireEvent.click(renderResult.getByText('Redo'));
  // });
  // await waitFor(() => getByText(filterPanel, 'Legal Name'));

  // test undo/redo contextual -> ctrl + z won't close a new open modal
  // await act(async () => {
  //   fireEvent.click(renderResult.getByText('Query Options'));
  // });
  // await act(async () => {
  //   fireEvent.keyDown(document, { key: 'z', code: 'KeyZ', ctrlKey: true });
  // });
  // expect(renderResult.getByText('Result Set Modifier')).not.toBeNull();
  // await act(async () => {
  //   fireEvent.click(renderResult.getByText('Close'));
  // });
  // await waitFor(() => getByText(filterPanel, 'Legal Name'));
});
