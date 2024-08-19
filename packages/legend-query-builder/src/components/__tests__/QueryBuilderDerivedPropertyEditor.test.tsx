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

import { stub_RawLambda, create_RawLambda } from '@finos/legend-graph';
import { integrationTest } from '@finos/legend-shared/test';
import { test, expect } from '@jest/globals';
import {
  waitFor,
  fireEvent,
  getByText,
  queryAllByAltText,
  getAllByTitle,
  getByRole,
  act,
} from '@testing-library/react';
import TEST_DATA__QueryBuilder_Model_SimpleRelational from './TEST_DATA__QueryBuilder_Model_SimpleRelational.json' with { type: 'json' };
import { TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalResult } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  TEST__setUpQueryBuilder,
  selectFromCustomSelectorInput,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { TEST_DATA__simpleProjection } from './TEST_DATA__QueryBuilder_DerivedPropertyEditor.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

test(
  integrationTest(
    'Query builder shows supported parameters in derived property editor',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalResult,
    );
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__simpleProjection.parameters,
          TEST_DATA__simpleProjection.body,
        ),
      );
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Firm'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));
    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS),
    );
    const tdsPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS,
    );
    fireEvent.click(
      guaranteeNonNullable(
        getAllByTitle(tdsPanel, 'Set Derived Property Argument(s)...')[0],
      ),
    );
    const modal = await waitFor(() => renderResult.getByRole('dialog'));
    expect(
      await waitFor(() => getByText(modal, 'Derived Property')),
    ).not.toBeNull();
    expect(
      await waitFor(() => getByText(modal, 'Available parameters')),
    ).not.toBeNull();

    // check whether supported parameters are shown in the editor or not
    expect(
      await waitFor(() => getByText(modal, 'businessDate')), // Date type parameter
    ).not.toBeNull();
    expect(
      await waitFor(() => getByText(modal, 'strictDateParam')), // StrictDate type parameter
    ).not.toBeNull();
    const stringParam = await waitFor(() => queryAllByAltText(modal, 'var_1')); // String type parameter
    expect(stringParam.length).toBe(0);
  },
);

test(
  integrationTest(
    'Query builder properly resets optional Enum parameter in derived property editor',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalResult,
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
    const tdsPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS,
    );
    fireEvent.click(
      guaranteeNonNullable(
        getAllByTitle(tdsPanel, 'Set Derived Property Argument(s)...')[1],
      ),
    );
    const modal = await waitFor(() => renderResult.getByRole('dialog'));
    expect(
      await waitFor(() => getByText(modal, 'Derived Property')),
    ).not.toBeNull();

    // Check for default value
    expect(await waitFor(() => getByText(modal, 'Corp'))).not.toBeNull();

    // Select new value
    selectFromCustomSelectorInput(modal, 'LLC');
    expect(await waitFor(() => getByText(modal, 'LLC'))).not.toBeNull();

    // Reset value
    fireEvent.click(getByRole(modal, 'button', { name: 'Reset' }));
    expect(await waitFor(() => getByText(modal, 'Corp'))).not.toBeNull();
  },
);
