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
  getByRole,
  type RenderResult,
} from '@testing-library/react';
import {
  TEST_DATA__simpleProjection,
  TEST_DATA__simpleProjectionWithConstantsAndParameters,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import { TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' assert { type: 'json' };
import { integrationTest } from '@finos/legend-shared/test';
import { create_RawLambda, stub_RawLambda } from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  TEST__setUpQueryBuilder,
  getCustomSelectorInputValue,
  selectFirstOptionFromCustomSelectorInput,
  selectFromCustomSelectorInput,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { CUSTOM_DATE_PICKER_OPTION } from '../shared/CustomDatePicker.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';

const getConstantNameInput = (renderResult: RenderResult): HTMLInputElement =>
  getByRole(
    guaranteeNonNullable(renderResult.getByText('Constant Name').parentElement),
    'textbox',
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
  fireEvent.click(getByRole(executeDialog, 'button', { name: 'Close' }));
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
  fireEvent.click(getByRole(editConstantDiaglog, 'button', { name: 'Cancel' }));

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
    'Query builder shows validation error for creating constant name if existing duplicate constant or parameter name',
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

    // Create first constant
    fireEvent.click(getByTitle(constantsPanel, 'Add Constant'));
    let constantNameInput = getConstantNameInput(renderResult);
    fireEvent.change(constantNameInput, { target: { value: 'c_var_1' } });
    await waitFor(() => renderResult.getByRole('button', { name: 'Create' }));
    fireEvent.click(renderResult.getByRole('button', { name: 'Create' }));

    // Create second constant
    fireEvent.click(getByTitle(constantsPanel, 'Add Constant'));
    constantNameInput = getConstantNameInput(renderResult);

    // Set value to existing constant name
    fireEvent.change(constantNameInput, { target: { value: 'c_var_1' } });

    // Check for validation error
    expect(
      await waitFor(() =>
        renderResult.getByText('Constant name already exists'),
      ),
    ).not.toBeNull();
    expect(
      renderResult
        .getByRole('button', { name: 'Create' })
        .hasAttribute('disabled'),
    ).toBe(true);

    // Set value to existing parameter name
    fireEvent.change(constantNameInput, { target: { value: 'var_1' } });

    // Check for validation error
    expect(
      await waitFor(() =>
        renderResult.getByText('Constant name already exists'),
      ),
    ).not.toBeNull();
    expect(
      renderResult
        .getByRole('button', { name: 'Create' })
        .hasAttribute('disabled'),
    ).toBe(true);
  },
);

test(
  integrationTest(
    'Query builder shows validation error for updating constant name if existing duplicate constant or parameter name',
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

    // Create first constant
    fireEvent.click(getByTitle(constantsPanel, 'Add Constant'));
    let constantNameInput = getConstantNameInput(renderResult);
    fireEvent.change(constantNameInput, { target: { value: 'c_var_1' } });
    await waitFor(() => renderResult.getByRole('button', { name: 'Create' }));
    fireEvent.click(renderResult.getByRole('button', { name: 'Create' }));

    // Create second constant
    fireEvent.click(getByTitle(constantsPanel, 'Add Constant'));
    constantNameInput = getConstantNameInput(renderResult);
    fireEvent.change(constantNameInput, { target: { value: 'c_var_2' } });
    fireEvent.click(renderResult.getByRole('button', { name: 'Create' }));

    // Update second constant name to existing constant name
    fireEvent.click(await waitFor(() => getByText(constantsPanel, 'c_var_2')));
    await waitFor(() => renderResult.getByText('Update Constant'));
    constantNameInput = renderResult.getByDisplayValue(
      'c_var_2',
    ) as HTMLInputElement;
    fireEvent.change(constantNameInput, { target: { value: 'c_var_1' } });

    // Check for validation error
    expect(
      await waitFor(() =>
        renderResult.getByText('Constant name already exists'),
      ),
    ).not.toBeNull();
    expect(
      renderResult
        .getByRole('button', { name: 'Apply' })
        .hasAttribute('disabled'),
    ).toBe(true);

    // Update second constant name to existing parameter name
    fireEvent.change(constantNameInput, { target: { value: 'var_1' } });

    // Check for validation error
    expect(
      await waitFor(() =>
        renderResult.getByText('Constant name already exists'),
      ),
    ).not.toBeNull();
    expect(
      renderResult
        .getByRole('button', { name: 'Apply' })
        .hasAttribute('disabled'),
    ).toBe(true);
  },
);

test(
  integrationTest(
    'Query builder shows validation error for updating derived constant name if existing duplicate constant or parameter name',
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

    // Create first constant
    fireEvent.click(getByTitle(constantsPanel, 'Add Constant'));
    let constantNameInput = getConstantNameInput(renderResult);
    fireEvent.change(constantNameInput, { target: { value: 'c_var_1' } });
    await waitFor(() => renderResult.getByRole('button', { name: 'Create' }));
    fireEvent.click(renderResult.getByRole('button', { name: 'Create' }));

    // Create second constant
    fireEvent.click(getByTitle(constantsPanel, 'Add Constant'));
    constantNameInput = getConstantNameInput(renderResult);
    fireEvent.change(constantNameInput, { target: { value: 'c_var_2' } });
    fireEvent.click(renderResult.getByRole('button', { name: 'Create' }));

    // Convert second constant to derived
    MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
      readOnly: true,
    });
    fireEvent.contextMenu(
      await waitFor(() => getByText(constantsPanel, 'c_var_2')),
    );
    fireEvent.click(renderResult.getByText('Convert To Derivation'));

    // Update second constant name to existing constant name
    fireEvent.click(await waitFor(() => getByText(constantsPanel, 'c_var_2')));
    await waitFor(() => renderResult.getByText('Update Calculated Constants'));
    constantNameInput = renderResult.getByDisplayValue(
      'c_var_2',
    ) as HTMLInputElement;
    fireEvent.change(constantNameInput, { target: { value: 'c_var_1' } });

    // Check for validation error
    expect(
      await waitFor(() =>
        renderResult.getByText('Constant name already exists'),
      ),
    ).not.toBeNull();
    expect(
      renderResult
        .getByRole('button', { name: 'Apply' })
        .hasAttribute('disabled'),
    ).toBe(true);

    // Update second constant name to existing parameter name
    fireEvent.change(constantNameInput, { target: { value: 'var_1' } });

    // Check for validation error
    expect(
      await waitFor(() =>
        renderResult.getByText('Constant name already exists'),
      ),
    ).not.toBeNull();
    expect(
      renderResult
        .getByRole('button', { name: 'Apply' })
        .hasAttribute('disabled'),
    ).toBe(true);
  },
);

test(
  integrationTest('Query builder uses modal values when creating new constant'),
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

    // Create constant and change values
    fireEvent.click(getByTitle(constantsPanel, 'Add Constant'));
    await waitFor(() => renderResult.getByText('Create Constant'));
    const constantNameInput = getConstantNameInput(renderResult);
    fireEvent.change(constantNameInput, { target: { value: 'c_var_2' } });
    // select Number from dropdown
    const typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    selectFromCustomSelectorInput(typeContainer, 'Number');
    // enter value
    const constantValueInput = await waitFor(() =>
      renderResult.getByDisplayValue('0'),
    );
    fireEvent.change(constantValueInput, { target: { value: '5' } });
    const createButton = renderResult.getByRole('button', { name: 'Create' });
    fireEvent.click(createButton);

    // Check values
    expect(
      await waitFor(() => getByText(constantsPanel, 'c_var_2')),
    ).not.toBeNull();
    expect(await waitFor(() => getByText(constantsPanel, '5'))).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder updates constant when Update button is clicked',
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
    await waitFor(() => renderResult.getByText('Create Constant'));
    let constantNameInput = getConstantNameInput(renderResult);
    fireEvent.change(constantNameInput, { target: { value: 'c_var_1' } });
    const createButton = renderResult.getByRole('button', { name: 'Create' });
    fireEvent.click(createButton);

    // Update consant values
    fireEvent.click(getByText(constantsPanel, 'c_var_1'));
    await waitFor(() => renderResult.getByText('Update Constant'));
    constantNameInput = renderResult.getByDisplayValue(
      'c_var_1',
    ) as HTMLInputElement;
    fireEvent.change(constantNameInput, { target: { value: 'c_var_2' } });
    // select Boolean from dropdown
    const typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    selectFromCustomSelectorInput(typeContainer, 'Boolean');
    // set value to true
    const valueToggle = guaranteeNonNullable(
      renderResult.getByText('Value').parentElement?.querySelector('button'),
    );
    fireEvent.click(valueToggle);
    fireEvent.click(renderResult.getByRole('button', { name: 'Apply' }));

    // Check new values
    expect(
      await waitFor(() => getByText(constantsPanel, 'c_var_2')),
    ).not.toBeNull();
    expect(
      await waitFor(() => getByText(constantsPanel, 'true')),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    "Query builder doesn't update constant when Cancel button is clicked",
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
    await waitFor(() => renderResult.getByText('Create Constant'));
    let constantNameInput = getConstantNameInput(renderResult);
    fireEvent.change(constantNameInput, { target: { value: 'c_var_1' } });
    const createButton = renderResult.getByRole('button', { name: 'Create' });
    fireEvent.click(createButton);

    // Update constant values
    fireEvent.click(getByText(constantsPanel, 'c_var_1'));
    await waitFor(() => renderResult.getByText('Update Constant'));
    constantNameInput = renderResult.getByDisplayValue(
      'c_var_1',
    ) as HTMLInputElement;
    fireEvent.change(constantNameInput, { target: { value: 'c_var_2' } });
    // select Number from dropdown
    let typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    selectFromCustomSelectorInput(typeContainer, 'Number');
    // enter number for value
    const constantValueInput = await waitFor(() =>
      renderResult.getByDisplayValue('0'),
    );
    fireEvent.change(constantValueInput, { target: { value: '5' } });
    fireEvent.click(renderResult.getByRole('button', { name: 'Cancel' }));

    // Check values are the same
    expect(
      await waitFor(() => getByText(constantsPanel, 'c_var_1')),
    ).not.toBeNull();
    expect(await waitFor(() => queryByText(constantsPanel, '5'))).toBeNull();

    // Check modal still contains state values
    fireEvent.click(getByText(constantsPanel, 'c_var_1'));
    await waitFor(() => renderResult.getByText('Update Constant'));
    expect(
      await waitFor(() => renderResult.getByDisplayValue('c_var_1')),
    ).not.toBeNull();
    typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    expect(getCustomSelectorInputValue(typeContainer)).toBe('String');
    expect(
      await waitFor(() => renderResult.getByPlaceholderText('(empty)')),
    ).not.toBeNull();
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
    const constantNameInput = getConstantNameInput(renderResult);
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
    expect(
      renderResult
        .getByRole('button', { name: 'Create' })
        .hasAttribute('disabled'),
    ).toBe(true);
    fireEvent.change(constantNameInput, {
      target: { value: 'validInput' },
    });
    expect(
      renderResult
        .getByRole('button', { name: 'Create' })
        .hasAttribute('disabled'),
    ).toBe(false);
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
    expect(
      renderResult
        .getByRole('button', { name: 'Create' })
        .hasAttribute('disabled'),
    ).toBe(true);
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
    });

    // Type in name
    const constantNameInput = getConstantNameInput(renderResult);
    fireEvent.change(constantNameInput, { target: { value: 'c_var_1' } });

    // select Number from dropdown
    const typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    selectFromCustomSelectorInput(typeContainer, 'StrictDate');

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
    fireEvent.keyDown(
      renderResult.getByText(CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE),
      {
        key: 'Escape',
        code: 'Escape',
      },
    );
    await waitFor(() => renderResult.getByRole('button', { name: 'Create' }));
    fireEvent.click(renderResult.getByRole('button', { name: 'Create' }));

    expect(
      await waitFor(() =>
        getByText(constantsPanel, CUSTOM_DATE_PICKER_OPTION.TODAY),
      ),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder constant modal resets numeric value when changing between numeric types',
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
    await waitFor(() => renderResult.getByText('Create Constant'));

    // Set Number type
    const typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    selectFromCustomSelectorInput(typeContainer, 'Number');

    // Set value
    const valueInput = renderResult.getByDisplayValue('0');
    fireEvent.change(valueInput, { target: { value: '5' } });
    expect(
      await waitFor(() => renderResult.getByDisplayValue('5')),
    ).not.toBeNull();

    // Set Integer type
    selectFromCustomSelectorInput(typeContainer, 'Integer');

    // Verify value is reset to 0
    expect(
      await waitFor(() => renderResult.getByDisplayValue('0')),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder constant modal resets string value when changing from numeric type',
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
    await waitFor(() => renderResult.getByText('Create Constant'));

    // Set Number type
    const typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    selectFromCustomSelectorInput(typeContainer, 'Number');

    // Set value
    const valueInput = renderResult.getByDisplayValue('0');
    fireEvent.change(valueInput, { target: { value: '5' } });
    expect(
      await waitFor(() => renderResult.getByDisplayValue('5')),
    ).not.toBeNull();

    // Set String type
    selectFirstOptionFromCustomSelectorInput(typeContainer);

    // Verify value is reset to 0
    expect(
      await waitFor(() => renderResult.getByPlaceholderText('(empty)')),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder constant modal resets numeric value when changing from string type',
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
    await waitFor(() => renderResult.getByText('Create Constant'));

    // Set value
    const valueInput = renderResult.getByPlaceholderText('(empty)');
    fireEvent.change(valueInput, { target: { value: 'test string value' } });
    expect(
      await waitFor(() => renderResult.getByDisplayValue('test string value')),
    ).not.toBeNull();

    // Set Number type
    const typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    selectFromCustomSelectorInput(typeContainer, 'Number');

    // Verify value is reset to 0
    expect(
      await waitFor(() => renderResult.getByDisplayValue('0')),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder constant modal evaluates expressions for numeric type',
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
    await waitFor(() => renderResult.getByText('Create Constant'));

    // Set Number type
    const typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    selectFromCustomSelectorInput(typeContainer, 'Number');

    // Set value
    const valueInput = renderResult.getByDisplayValue('0');
    fireEvent.change(valueInput, { target: { value: '1 + 2' } });
    expect(
      await waitFor(() => renderResult.getByDisplayValue('1 + 2')),
    ).not.toBeNull();
    fireEvent.keyDown(valueInput, {
      key: 'Enter',
      code: 'Enter',
    });

    // Verify expression is evaluated
    expect(
      await waitFor(() => renderResult.getByDisplayValue('3')),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder constant modal resets numeric value if invalid expression is entered',
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
    await waitFor(() => renderResult.getByText('Create Constant'));

    // Set Number type
    const typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    selectFromCustomSelectorInput(typeContainer, 'Number');

    // Set value
    const valueInput = renderResult.getByDisplayValue('0');
    fireEvent.change(valueInput, { target: { value: '1234' } });
    fireEvent.keyDown(valueInput, {
      key: 'Enter',
      code: 'Enter',
    });
    expect(
      await waitFor(() => renderResult.getByDisplayValue('1234')),
    ).not.toBeNull();

    // Set invalid expression
    fireEvent.change(valueInput, { target: { value: 'invalid expression' } });
    expect(
      await waitFor(() => renderResult.getByDisplayValue('invalid expression')),
    ).not.toBeNull();
    fireEvent.keyDown(valueInput, {
      key: 'Enter',
      code: 'Enter',
    });

    // Verify value is reset
    expect(
      await waitFor(() => renderResult.getByDisplayValue('1234')),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder constant modal reset button resets string type constant value',
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
    await waitFor(() => renderResult.getByText('Create Constant'));

    // Set value
    const valueInput = renderResult.getByPlaceholderText('(empty)');
    fireEvent.change(valueInput, { target: { value: 'test string value' } });
    expect(
      await waitFor(() => renderResult.getByDisplayValue('test string value')),
    ).not.toBeNull();

    // Click reset button
    const resetButton = renderResult.getByRole('button', { name: 'Reset' });
    fireEvent.click(resetButton);

    // Verify value is reset
    expect(
      await waitFor(() => renderResult.getByPlaceholderText('(empty)')),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder constant modal reset button resets numeric type constant value',
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
    await waitFor(() => renderResult.getByText('Create Constant'));

    // Set Number type
    const typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    selectFromCustomSelectorInput(typeContainer, 'Number');

    // Set value
    const valueInput = renderResult.getByDisplayValue('0');
    fireEvent.change(valueInput, { target: { value: '1234' } });
    fireEvent.keyDown(valueInput, {
      key: 'Enter',
      code: 'Enter',
    });
    expect(
      await waitFor(() => renderResult.getByDisplayValue('1234')),
    ).not.toBeNull();

    // Click reset button
    const resetButton = renderResult.getByRole('button', { name: 'Reset' });
    fireEvent.click(resetButton);

    // Verify value is reset
    expect(
      await waitFor(() => renderResult.getByDisplayValue('0')),
    ).not.toBeNull();
  },
);
