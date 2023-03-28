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
import {
  TEST_DATA__simpleProjection,
  TEST_DATA__simpeDateParameters,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import { TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json';
import { createMock, integrationTest } from '@finos/legend-shared';
import {
  create_RawLambda,
  PrimitiveType,
  PRIMITIVE_TYPE,
  stub_RawLambda,
} from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../application/QueryBuilderTesting.js';
import { TEST__setUpQueryBuilder } from '../QueryBuilderComponentTestUtils.js';
import { CUSTOM_DATE_PICKER_OPTION } from '../shared/CustomDatePicker.js';
import {
  MockedMonacoEditorInstance,
  MockedMonacoEditorAPI,
} from '@finos/legend-art';

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
      // NOTE: Render result will not currently find the
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

test(integrationTest('Query builder parameter default values'), async () => {
  const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
    TEST_DATA__ComplexRelationalModel,
    stub_RawLambda(),
    'model::relational::tests::simpleRelationalMapping',
    'model::MyRuntime',
    TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
  );
  // Date
  const param1Lambda = TEST_DATA__simpeDateParameters(PRIMITIVE_TYPE.DATE);
  await act(async () => {
    queryBuilderState.initializeWithQuery(
      create_RawLambda(param1Lambda.parameters, param1Lambda.body),
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
  let executeDialog = await waitFor(() => renderResult.getByRole('dialog'));
  expect(getByText(executeDialog, 'Set Parameter Values'));
  expect(getByText(executeDialog, 'var_1')).not.toBeNull();
  expect(getByText(executeDialog, 'Date')).not.toBeNull();
  expect(getByText(executeDialog, 'Now')).not.toBeNull();

  // DateTime
  const param2Lambda = TEST_DATA__simpeDateParameters(PRIMITIVE_TYPE.DATETIME);
  await act(async () => {
    queryBuilderState.initializeWithQuery(
      create_RawLambda(param2Lambda.parameters, param2Lambda.body),
    );
  });

  await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
  );
  const parameter2Panel = renderResult.getByTestId(
    QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS,
  );
  expect(getByText(parameter2Panel, 'var_1')).not.toBeNull();
  expect(getByText(parameter2Panel, 'DateTime')).not.toBeNull();
  fireEvent.click(renderResult.getByText('Run Query'));
  executeDialog = await waitFor(() => renderResult.getByRole('dialog'));
  expect(getByText(executeDialog, 'Set Parameter Values'));
  expect(getByText(executeDialog, 'var_1')).not.toBeNull();
  expect(getByText(executeDialog, 'DateTime')).not.toBeNull();
  expect(getByText(executeDialog, 'Now')).not.toBeNull();

  // StrictDate
  const param3Lambda = TEST_DATA__simpeDateParameters(
    PRIMITIVE_TYPE.STRICTDATE,
  );
  await act(async () => {
    queryBuilderState.initializeWithQuery(
      create_RawLambda(param3Lambda.parameters, param3Lambda.body),
    );
  });

  await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
  );
  const parameter3Panel = renderResult.getByTestId(
    QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS,
  );
  expect(getByText(parameter3Panel, 'var_1')).not.toBeNull();
  expect(getByText(parameter3Panel, 'StrictDate')).not.toBeNull();
  fireEvent.click(renderResult.getByText('Run Query'));
  executeDialog = await waitFor(() => renderResult.getByRole('dialog'));
  expect(getByText(executeDialog, 'Set Parameter Values'));
  expect(getByText(executeDialog, 'var_1')).not.toBeNull();
  expect(getByText(executeDialog, 'StrictDate')).not.toBeNull();
  expect(getByText(executeDialog, 'Today')).not.toBeNull();
});

test(
  integrationTest(
    'Query builder parameter values match when we go to text mode and come back to query state',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );
    const param1Lambda = TEST_DATA__simpeDateParameters(PRIMITIVE_TYPE.DATE);
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(param1Lambda.parameters, param1Lambda.body),
      );
    });
    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
    );
    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    const parameterPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS,
    );
    expect(getByText(parameterPanel, 'var_1')).not.toBeNull();
    fireEvent.click(renderResult.getByText('Run Query'));
    let executeDialog = await waitFor(() => renderResult.getByRole('dialog'));
    expect(getByText(executeDialog, 'Set Parameter Values'));

    const parameterValue = getByText(executeDialog, 'var_1');

    MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
      readOnly: true,
    });
    MockedMonacoEditorAPI.removeAllMarkers.mockReturnValue(null);
    MockedMonacoEditorInstance.onDidFocusEditorWidget.mockReturnValue(null);

    // Here we mimic the toggling to text mode.
    const MOCK__pureCodeToLambda = createMock();
    const MOCK__lambdaToPureCode = createMock();
    queryBuilderState.graphManagerState.graphManager.pureCodeToLambda =
      MOCK__pureCodeToLambda;
    queryBuilderState.graphManagerState.graphManager.lambdasToPureCode =
      MOCK__lambdaToPureCode;
    MOCK__pureCodeToLambda.mockResolvedValue(
      create_RawLambda(param1Lambda.parameters, param1Lambda.body),
    );
    const mockValue = new Map<string, string>();
    mockValue.set('query-builder', 'test');
    MOCK__lambdaToPureCode.mockResolvedValue(mockValue);
    fireEvent.click(renderResult.getByTitle('View Query in Pure'));
    const lambdaEditor = await waitFor(() => renderResult.getByRole('dialog'));
    fireEvent.click(getByText(lambdaEditor, 'Close'));
    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    const paramPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS,
    );
    expect(getByText(paramPanel, 'var_1')).not.toBeNull();
    await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_PANEL,
      ),
    );
    fireEvent.click(renderResult.getByText('Run Query'));
    executeDialog = await waitFor(() => renderResult.getByRole('dialog'));
    expect(getByText(executeDialog, 'Set Parameter Values'));
    expect(getByText(executeDialog, 'var_1')).toStrictEqual(parameterValue);
  },
);
