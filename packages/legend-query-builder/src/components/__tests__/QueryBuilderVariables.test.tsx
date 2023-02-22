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
  getByTitle,
  act,
  getByText,
} from '@testing-library/react';
import { TEST_DATA__simpleProjection } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import { TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json';
import { integrationTest } from '@finos/legend-shared';
import {
  create_RawLambda,
  PrimitiveType,
  stub_RawLambda,
} from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../QueryBuilder_TestID.js';
import { TEST__setUpQueryBuilder } from '../QueryBuilderComponentTestUtils.js';
import { CUSTOM_DATE_PICKER_OPTION } from '../shared/CustomDatePicker.js';

test(
  integrationTest(
    'Query builder shows validation error for constant name if existing duplicate parameter name',
  ),
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
          TEST_DATA__simpleProjection.parameters,
          TEST_DATA__simpleProjection.body,
        ),
      );
      // Note: Render result will not currently find the
      // 'show constant(s)' panel so we will directly force
      // the panel to show for now
      queryBuilderState.constantState.setShowConstantPanel(true);
    });

    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_CONSTANTS),
    );
    const constantsPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_CONSTANTS,
    );

    fireEvent.click(getByTitle(constantsPanel, 'Add Constant'));

    await act(async () => {
      if (!queryBuilderState.constantState.selectedConstant) {
        return;
      }
    });
    const constantNameInput = renderResult.getByDisplayValue('c_var_1');
    fireEvent.change(constantNameInput, { target: { value: 'var_1' } });
    expect(
      await waitFor(() =>
        renderResult.getByText('Constant Name Already Exists'),
      ),
    ).not.toBeNull();
    expect(renderResult.getByText('Create').hasAttribute('disabled')).toBe(
      true,
    );
  },
);

test(
  integrationTest(
    'Query builder shows validation error for parameter name if existing duplicate constant name',
  ),
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
        create_RawLambda(undefined, TEST_DATA__simpleProjection.body),
      );
      // Note: Render result will not currently find the
      // 'show parameter(s)' panel so we will directly force
      // the panel to show for now
      queryBuilderState.setShowParametersPanel(true);
      queryBuilderState.constantState.setShowConstantPanel(true);
    });

    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_CONSTANTS),
    );
    const constantsPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_CONSTANTS,
    );
    fireEvent.click(getByTitle(constantsPanel, 'Add Constant'));

    const constantNameInput = renderResult.getByDisplayValue('c_var_1');
    fireEvent.change(constantNameInput, { target: { value: 'var_1' } });
    await waitFor(() => renderResult.getByText('Create'));
    fireEvent.click(renderResult.getByText('Create'));

    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    const parametersPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS,
    );

    fireEvent.click(getByTitle(parametersPanel, 'Add Parameter'));

    expect(
      await waitFor(() =>
        renderResult.getByText('Parameter Name Already Exists'),
      ),
    ).not.toBeNull();

    expect(renderResult.getByText('Create').hasAttribute('disabled')).toBe(
      true,
    );
  },
);

test(
  integrationTest(
    'Query builder shows humanized date label value for constant variable with type Date',
  ),
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
          TEST_DATA__simpleProjection.parameters,
          TEST_DATA__simpleProjection.body,
        ),
      );
      queryBuilderState.constantState.setShowConstantPanel(true);
    });

    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_CONSTANTS),
    );
    const constantsPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_CONSTANTS,
    );
    fireEvent.click(getByTitle(constantsPanel, 'Add Constant'));

    await act(async () => {
      if (!queryBuilderState.constantState.selectedConstant) {
        return;
      }
      queryBuilderState.constantState.selectedConstant.changeValSpecType(
        PrimitiveType.STRICTDATE,
      );
    });

    await waitFor(() =>
      renderResult.getByTitle('Click to edit and pick from more date options'),
    );
    fireEvent.click(
      renderResult.getByTitle('Click to edit and pick from more date options'),
    );

    await waitFor(() =>
      renderResult.getByText(CUSTOM_DATE_PICKER_OPTION.TODAY),
    );
    fireEvent.click(renderResult.getByText(CUSTOM_DATE_PICKER_OPTION.TODAY));

    await waitFor(() => renderResult.getByText('Create'));
    fireEvent.click(renderResult.getByText('Create'));

    expect(
      await waitFor(() =>
        getByText(constantsPanel, CUSTOM_DATE_PICKER_OPTION.TODAY),
      ),
    ).not.toBeNull();
  },
);
