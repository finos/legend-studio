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
  getByText,
  getByPlaceholderText,
  getByTitle,
  getAllByTitle,
  queryByText,
  getByDisplayValue,
} from '@testing-library/react';
import {
  TEST_DATA__simpleProjection,
  TEST_DATA__simpleProjectionWithConstantsAndParameters,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import { TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' assert { type: 'json' };
import { integrationTest } from '@finos/legend-shared/test';
import {
  PrimitiveType,
  create_RawLambda,
  stub_RawLambda,
} from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { QueryBuilderSimpleConstantExpressionState } from '../../stores/QueryBuilderConstantsState.js';
import { CUSTOM_DATE_PICKER_OPTION } from '../shared/CustomDatePicker.js';

test(integrationTest('Query builder parameter default values'), async () => {
  const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
    TEST_DATA__ComplexRelationalModel,
    stub_RawLambda(),
    'model::relational::tests::simpleRelationalMapping',
    'model::MyRuntime',
    TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
  );
  // Date
  await act(async () => {
    queryBuilderState.initializeWithQuery(
      create_RawLambda(
        TEST_DATA__simpleProjectionWithConstantsAndParameters.parameters,
        TEST_DATA__simpleProjectionWithConstantsAndParameters.body,
      ),
    );
  });
  await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
  );
  const parameterPanel = renderResult.getByTestId(
    QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS,
  );
  expect(getByText(parameterPanel, 'var_1')).not.toBeNull();
  fireEvent.click(renderResult.getByText('Run Query'));
  const executeDialog = await waitFor(() => renderResult.getByRole('dialog'));
  expect(getByText(executeDialog, 'Set Parameter Values'));
  expect(getByText(executeDialog, 'var_1')).not.toBeNull();
  expect(getByPlaceholderText(executeDialog, '(empty)')).not.toBeNull();
  fireEvent.click(getByText(executeDialog, 'Close'));
  // constants
  const constantPanel = renderResult.getByTestId(
    QUERY_BUILDER_TEST_ID.QUERY_BUILDER_CONSTANTS,
  );
  expect(getByText(constantPanel, 'c1'));
  expect(getByText(constantPanel, 'value1'));
  expect(getByText(constantPanel, 'complex'));
  expect(getByTitle(constantPanel, 'Calculated Constant'));
  fireEvent.contextMenu(getByText(constantPanel, 'value1'));
  fireEvent.click(renderResult.getByText('Edit'));
  const editConstantDiaglog = await waitFor(() =>
    renderResult.getByRole('dialog'),
  );
  getByText(editConstantDiaglog, 'Update Constant');
  getByDisplayValue(editConstantDiaglog, 'c1');
  getByDisplayValue(editConstantDiaglog, 'value1');
  fireEvent.click(getByText(editConstantDiaglog, 'Close'));

  // conert to derivation
  fireEvent.contextMenu(getByText(constantPanel, 'c1'));
  fireEvent.click(renderResult.getByText('Convert To Derivation'));
  expect(getAllByTitle(constantPanel, 'Calculated Constant')).toHaveLength(2);
  expect(queryByText(constantPanel, 'value1')).toBeNull();
  // edit delete
  fireEvent.contextMenu(getByText(constantPanel, 'c1'));
  fireEvent.click(renderResult.getByText('Remove'));
  expect(getAllByTitle(constantPanel, 'Calculated Constant')).toHaveLength(1);
  fireEvent.contextMenu(getByText(constantPanel, 'complex'));
  fireEvent.click(renderResult.getByText('Remove'));
  expect(queryByText(constantPanel, 'Calculated Constant')).toBeNull();
  getByText(constantPanel, 'Add a Constant');
});

test(
  integrationTest(
    'Query builder shows validation error for creating constant name if existing duplicate parameter name',
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
      // NOTE: Render result will not currently find the
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
        renderResult.getByText('Constant name already exists'),
      ),
    ).not.toBeNull();
    expect(renderResult.getByText('Create').hasAttribute('disabled')).toBe(
      true,
    );
  },
);

test(
  integrationTest(
    'Query builder disables constant creation and shows validation error if invalid constant name',
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
    });
    const constantNameInput = renderResult.getByDisplayValue('c_var_1');
    fireEvent.change(constantNameInput, {
      target: { value: '1startsWithNumber' },
    });
    expect(
      await waitFor(() =>
        renderResult.getByText(
          'Constant name must be text with no spaces and not start with an uppercase letter or number',
        ),
      ),
    ).not.toBeNull();
    expect(renderResult.getByText('Create').hasAttribute('disabled')).toBe(
      true,
    );
    fireEvent.change(constantNameInput, {
      target: { value: 'validInput' },
    });
    expect(renderResult.getByText('Create').hasAttribute('disabled')).toBe(
      false,
    );
    fireEvent.change(constantNameInput, {
      target: { value: 'invalidInput!' },
    });
    expect(
      await waitFor(() =>
        renderResult.getByText(
          'Constant name must be text with no spaces and not start with an uppercase letter or number',
        ),
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
      const selectedConstant = queryBuilderState.constantState.selectedConstant;
      if (
        selectedConstant instanceof QueryBuilderSimpleConstantExpressionState
      ) {
        selectedConstant.changeValSpecType(PrimitiveType.STRICTDATE);
      }
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
