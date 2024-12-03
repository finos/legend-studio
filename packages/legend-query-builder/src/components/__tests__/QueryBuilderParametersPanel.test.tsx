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
  getByRole,
  type RenderResult,
} from '@testing-library/react';
import {
  TEST_DATA__simpleProjection,
  TEST_DATA__simpeDateParameters,
  TEST_DATA__simpeDateParametersForUnsupportedQuery,
  TEST_DATA_simpleProjectionWithCustomDate,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import { TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' with { type: 'json' };
import { createMock, integrationTest } from '@finos/legend-shared/test';
import {
  create_RawLambda,
  Multiplicity,
  PRIMITIVE_TYPE,
  stub_RawLambda,
} from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  TEST__setUpQueryBuilder,
  getCustomSelectorInputValue,
  selectFromCustomSelectorInput,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import {
  MockedMonacoEditorInstance,
  MockedMonacoEditorAPI,
} from '@finos/legend-lego/code-editor/test';
import { guaranteeNonNullable } from '@finos/legend-shared';

export const getParameterNameInput = (
  renderResult: RenderResult,
): HTMLInputElement =>
  getByRole(
    guaranteeNonNullable(
      renderResult.getByText('Parameter Name').parentElement,
    ),
    'textbox',
  );

const getConstantNameInput = (renderResult: RenderResult): HTMLInputElement =>
  getByRole(
    guaranteeNonNullable(renderResult.getByText('Constant Name').parentElement),
    'textbox',
  );

const getConstantValueInput = (renderResult: RenderResult): HTMLInputElement =>
  getByRole(
    guaranteeNonNullable(renderResult.getByText('Value').parentElement),
    'textbox',
  );

test(
  integrationTest(
    'Query builder shows validation error for creating parameter name if existing duplicate parameter name',
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
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    const parametersPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS,
    );

    // Create first parameter
    fireEvent.click(getByTitle(parametersPanel, 'Add Parameter'));
    await waitFor(() => renderResult.getByText('Create Parameter'));
    let parameterNameInput = getParameterNameInput(renderResult);
    fireEvent.change(parameterNameInput, { target: { value: 'var_1' } });
    const createButton = renderResult.getByRole('button', { name: 'Create' });
    fireEvent.click(createButton);

    // Create second parameter
    fireEvent.click(getByTitle(parametersPanel, 'Add Parameter'));
    await waitFor(() => renderResult.getByText('Create Parameter'));
    parameterNameInput = getParameterNameInput(renderResult);
    fireEvent.change(parameterNameInput, { target: { value: 'var_1' } });

    // Check for validation error
    expect(
      await waitFor(() =>
        renderResult.getByText('Parameter name already exists'),
      ),
    ).not.toBeNull();

    expect(renderResult.getByText('Create').hasAttribute('disabled')).toBe(
      true,
    );
  },
);

test(
  integrationTest(
    'Query builder shows validation error for creating parameter name if existing duplicate constant name',
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

    // Create constant
    fireEvent.click(getByTitle(constantsPanel, 'Add Constant'));
    const constantNameInput = getConstantNameInput(renderResult);
    const constantValueInput = getConstantValueInput(renderResult);
    fireEvent.change(constantNameInput, { target: { value: 'c_var_1' } });
    fireEvent.change(constantValueInput, { target: { value: 'test' } });
    await waitFor(() => renderResult.getByText('Create'));
    fireEvent.click(renderResult.getByText('Create'));

    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    const parametersPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS,
    );

    // Create parameter
    fireEvent.click(getByTitle(parametersPanel, 'Add Parameter'));
    await waitFor(() => renderResult.getByText('Create Parameter'));
    const parameterNameInput = getParameterNameInput(renderResult);
    fireEvent.change(parameterNameInput, { target: { value: 'c_var_1' } });

    expect(
      await waitFor(() =>
        renderResult.getByText('Parameter name already exists'),
      ),
    ).not.toBeNull();

    expect(renderResult.getByText('Create').hasAttribute('disabled')).toBe(
      true,
    );
  },
);

test(
  integrationTest(
    'Query builder shows validation error for updating parameter name if existing duplicate parameter name',
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
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    const parametersPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS,
    );

    // Create first parameter
    fireEvent.click(getByTitle(parametersPanel, 'Add Parameter'));
    await waitFor(() => renderResult.getByText('Create Parameter'));
    let parameterNameInput = getParameterNameInput(renderResult);
    fireEvent.change(parameterNameInput, { target: { value: 'var_1' } });
    fireEvent.click(renderResult.getByRole('button', { name: 'Create' }));

    // Create second parameter
    fireEvent.click(getByTitle(parametersPanel, 'Add Parameter'));
    await waitFor(() => renderResult.getByText('Create Parameter'));
    parameterNameInput = getParameterNameInput(renderResult);
    fireEvent.change(parameterNameInput, { target: { value: 'var_2' } });
    fireEvent.click(renderResult.getByRole('button', { name: 'Create' }));

    // Update second parameter name
    fireEvent.click(await waitFor(() => getByText(parametersPanel, 'var_2')));
    await waitFor(() => renderResult.getByText('Update Parameter'));
    parameterNameInput = getParameterNameInput(renderResult);
    fireEvent.change(parameterNameInput, { target: { value: 'var_1' } });

    // Check for validation error
    expect(
      await waitFor(() =>
        renderResult.getByText('Parameter name already exists'),
      ),
    ).not.toBeNull();

    expect(renderResult.getByText('Update').hasAttribute('disabled')).toBe(
      true,
    );
  },
);

test(
  integrationTest(
    'Query builder shows validation error for updating parameter name if existing duplicate constant name',
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

    // Create constant
    fireEvent.click(getByTitle(constantsPanel, 'Add Constant'));
    const constantNameInput = getConstantNameInput(renderResult);
    const constantValueInput = getConstantValueInput(renderResult);
    fireEvent.change(constantNameInput, { target: { value: 'c_var_1' } });
    fireEvent.change(constantValueInput, { target: { value: 'test' } });
    await waitFor(() => renderResult.getByText('Create'));
    fireEvent.click(renderResult.getByText('Create'));

    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    const parametersPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS,
    );

    // Create parameter
    fireEvent.click(getByTitle(parametersPanel, 'Add Parameter'));
    await waitFor(() => renderResult.getByText('Create Parameter'));
    let parameterNameInput = getParameterNameInput(renderResult);
    fireEvent.change(parameterNameInput, { target: { value: 'var_1' } });
    const createButton = renderResult.getByRole('button', { name: 'Create' });
    fireEvent.click(createButton);

    // Update parameter name
    fireEvent.click(getByText(parametersPanel, 'var_1'));
    await waitFor(() => renderResult.getByText('Update Parameter'));
    parameterNameInput = getParameterNameInput(renderResult);
    fireEvent.change(parameterNameInput, { target: { value: 'c_var_1' } });

    // Check for validation error
    expect(
      await waitFor(() =>
        renderResult.getByText('Parameter name already exists'),
      ),
    ).not.toBeNull();

    expect(renderResult.getByText('Update').hasAttribute('disabled')).toBe(
      true,
    );
  },
);

test(
  integrationTest(
    'Query builder uses modal values when creating new parameter',
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
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    const parametersPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS,
    );

    // Create parameter and change values
    fireEvent.click(getByTitle(parametersPanel, 'Add Parameter'));
    await waitFor(() => renderResult.getByText('Create Parameter'));
    const parameterNameInput = getParameterNameInput(renderResult);
    fireEvent.change(parameterNameInput, { target: { value: 'var_2' } });
    // select Number from dropdown
    const typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    selectFromCustomSelectorInput(typeContainer, 'Number');
    // select Optional from dropdown
    const multiplicityContainer = guaranteeNonNullable(
      renderResult.getByText('Multiplicity').parentElement,
    );
    selectFromCustomSelectorInput(multiplicityContainer, '[0..1] - Optional');
    const createButton = renderResult.getByRole('button', { name: 'Create' });
    fireEvent.click(createButton);

    // Check values
    expect(
      await waitFor(() => getByText(parametersPanel, 'var_2')),
    ).not.toBeNull();
    expect(
      await waitFor(() => getByText(parametersPanel, 'Number')),
    ).not.toBeNull();
    expect(
      queryBuilderState.parametersState.parameterStates[0]?.parameter
        .multiplicity,
    ).toBe(Multiplicity.ZERO_ONE);
  },
);

test(
  integrationTest(
    'Query builder updates parameter when Apply button is clicked',
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
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    const parametersPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS,
    );

    // Create parameter
    fireEvent.click(getByTitle(parametersPanel, 'Add Parameter'));
    await waitFor(() => renderResult.getByText('Create Parameter'));
    let parameterNameInput = getParameterNameInput(renderResult);
    fireEvent.change(parameterNameInput, { target: { value: 'var_1' } });
    const createButton = renderResult.getByRole('button', { name: 'Create' });
    fireEvent.click(createButton);

    // Update parameter values
    fireEvent.click(getByText(parametersPanel, 'var_1'));
    await waitFor(() => renderResult.getByText('Update Parameter'));
    parameterNameInput = getParameterNameInput(renderResult);
    fireEvent.change(parameterNameInput, { target: { value: 'var_2' } });
    // select Number from dropdown
    const typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    selectFromCustomSelectorInput(typeContainer, 'Number');
    // select Optional from dropdown
    const multiplicityContainer = guaranteeNonNullable(
      renderResult.getByText('Multiplicity').parentElement,
    );
    selectFromCustomSelectorInput(multiplicityContainer, '[0..1] - Optional');
    fireEvent.click(renderResult.getByRole('button', { name: 'Update' }));

    // Check new values
    expect(
      await waitFor(() => getByText(parametersPanel, 'var_2')),
    ).not.toBeNull();
    expect(
      await waitFor(() => getByText(parametersPanel, 'Number')),
    ).not.toBeNull();
    expect(
      queryBuilderState.parametersState.parameterStates[0]?.parameter
        .multiplicity,
    ).toBe(Multiplicity.ZERO_ONE);
  },
);

test(
  integrationTest(
    "Query builder doesn't update parameter when Cancel button is clicked",
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
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    const parametersPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS,
    );

    // Create parameter
    fireEvent.click(getByTitle(parametersPanel, 'Add Parameter'));
    await waitFor(() => renderResult.getByText('Create Parameter'));
    let parameterNameInput = getParameterNameInput(renderResult);
    fireEvent.change(parameterNameInput, { target: { value: 'var_1' } });
    const createButton = renderResult.getByRole('button', { name: 'Create' });
    fireEvent.click(createButton);

    // Update parameter values
    fireEvent.click(getByText(parametersPanel, 'var_1'));
    await waitFor(() => renderResult.getByText('Update Parameter'));
    parameterNameInput = getParameterNameInput(renderResult);
    fireEvent.change(parameterNameInput, { target: { value: 'var_2' } });
    // select Number from dropdown
    let typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    selectFromCustomSelectorInput(typeContainer, 'Number');
    // select Optional from dropdown
    let multiplicityContainer = guaranteeNonNullable(
      renderResult.getByText('Multiplicity').parentElement,
    );
    selectFromCustomSelectorInput(multiplicityContainer, '[0..1] - Optional');
    fireEvent.click(renderResult.getByRole('button', { name: 'Cancel' }));

    // Check values are the same
    expect(
      await waitFor(() => getByText(parametersPanel, 'var_1')),
    ).not.toBeNull();
    expect(
      await waitFor(() => getByText(parametersPanel, 'String')),
    ).not.toBeNull();
    expect(
      queryBuilderState.parametersState.parameterStates[0]?.parameter
        .multiplicity,
    ).toBe(Multiplicity.ONE);

    // Check modal still contains state values
    fireEvent.click(getByText(parametersPanel, 'var_1'));
    await waitFor(() => renderResult.getByText('Update Parameter'));
    expect(
      await waitFor(() => renderResult.getByDisplayValue('var_1')),
    ).not.toBeNull();
    typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    expect(getCustomSelectorInputValue(typeContainer)).toBe('String');
    multiplicityContainer = guaranteeNonNullable(
      renderResult.getByText('Multiplicity').parentElement,
    );
    expect(getCustomSelectorInputValue(multiplicityContainer)).toBe(
      '[1] - Required',
    );
  },
);

test(integrationTest('Query builder renders custom date label'), async () => {
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
        TEST_DATA_simpleProjectionWithCustomDate.parameters,
        TEST_DATA_simpleProjectionWithCustomDate.body,
      ),
    );
  });

  await waitFor(() =>
    renderResult.getByText('"2 Day(s) Before Previous Day of Week"'),
  );
});

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
    await act(async () => {
      fireEvent.click(renderResult.getByTitle('Show Advanced Menu...'));
    });
    await act(async () => {
      fireEvent.click(renderResult.getByText('Edit Pure'));
    });
    const lambdaEditor = await waitFor(() => renderResult.getByRole('dialog'));
    fireEvent.click(getByText(lambdaEditor, 'Proceed'));
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

test(
  integrationTest(
    'Query builder disables parameter creation and shows validation error if invalid parameter name',
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
      queryBuilderState.setShowParametersPanel(true);
      queryBuilderState.constantState.setShowConstantPanel(true);
    });

    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    const parametersPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS,
    );

    fireEvent.click(getByTitle(parametersPanel, 'Add Parameter'));
    const parameterNameInput = getParameterNameInput(renderResult);
    fireEvent.change(parameterNameInput, {
      target: { value: 'contains space' },
    });
    expect(
      await waitFor(() =>
        renderResult.getByText(
          'Parameter name must be text with no spaces and not start with an uppercase letter or number',
        ),
      ),
    ).not.toBeNull();
    expect(renderResult.getByText('Create').hasAttribute('disabled')).toBe(
      true,
    );
    fireEvent.change(parameterNameInput, {
      target: { value: 'validInput' },
    });
    expect(renderResult.getByText('Create').hasAttribute('disabled')).toBe(
      false,
    );
    fireEvent.change(parameterNameInput, {
      target: { value: 'InvalidInput' },
    });
    expect(
      await waitFor(() =>
        renderResult.getByText(
          'Parameter name must be text with no spaces and not start with an uppercase letter or number',
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
    'Query builder parameter values match when we go to text mode and come back to query state for Unsupported query',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );
    const param1Lambda = TEST_DATA__simpeDateParametersForUnsupportedQuery;
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
    await act(async () => {
      fireEvent.click(renderResult.getByTitle('Show Advanced Menu...'));
    });
    await act(async () => {
      fireEvent.click(renderResult.getByText('Edit Pure'));
    });
    const lambdaEditor = await waitFor(() => renderResult.getByRole('dialog'));
    fireEvent.click(getByText(lambdaEditor, 'Proceed'));
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
