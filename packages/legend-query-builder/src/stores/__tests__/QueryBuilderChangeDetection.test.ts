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
import {
  guaranteeNonNullable,
  guaranteeType,
  integrationTest,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import { expect, test } from '@jest/globals';
import { waitFor, getByText } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { TEST__setUpQueryBuilder } from '../../components/QueryBuilderComponentTestUtils.js';
import { QUERY_BUILDER_TEST_ID } from '../../components/QueryBuilder_TestID.js';
import { QueryBuilderProjectionState } from '../fetch-structure/projection/QueryBuilderProjectionState.js';
import { TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection } from './TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ChangeDetectionModel from './TEST_DATA__QueryBuilder_Model_ChangeDetection.json';
import { TEST_DATA__TestChangeDetectionWithSimpleProject } from './TEST_DATA__QueryBuilder_TestChangeDetection.js';

test(integrationTest('Test change detection'), () => {
  async () => {
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
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROJECTION),
    );
    await waitFor(() => getByText(projectionCols, 'Legal Name'));
    guaranteeNonNullable(
      guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderProjectionState,
      ).columns[0],
    ).setColumnName('Name');
    await waitFor(() => getByText(projectionCols, 'Name'));
    expect(queryBuilderState.changeDetectionState.hasChanged).toBeTruthy();
    guaranteeNonNullable(
      guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderProjectionState,
      ).columns[0],
    ).setColumnName('Legal Name');
    await waitFor(() => getByText(projectionCols, 'Legal Name'));
    expect(queryBuilderState.hashCode).toBe(
      queryBuilderState.changeDetectionState.initialHashCode,
    );
  };
});
