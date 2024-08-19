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
import { expect, test } from '@jest/globals';
import { waitFor, fireEvent, act, getAllByText } from '@testing-library/react';
import { TEST_DATA__simpleProjectionWithConstantsAndParameters } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import { TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' with { type: 'json' };
import { integrationTest } from '@finos/legend-shared/test';
import { create_RawLambda, stub_RawLambda } from '@finos/legend-graph';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

test(
  integrationTest(
    'Query builder watermark modal saves changes to state when Apply button is clicked',
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
          TEST_DATA__simpleProjectionWithConstantsAndParameters.parameters,
          TEST_DATA__simpleProjectionWithConstantsAndParameters.body,
        ),
      );
    });

    // Open Query Options modal
    const queryOptionsButton = await waitFor(() =>
      renderResult.getByRole('button', { name: 'Set Query Options' }),
    );
    fireEvent.click(queryOptionsButton);
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Enable Watermark' }),
      ),
    );
    const watermarkEditor = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL__WATERMAKR,
    );
    const waterMarkInput = watermarkEditor.getElementsByClassName(
      'value-spec-editor__input',
    )[0];
    expect(waterMarkInput).toBeDefined();
    await waitFor(() =>
      fireEvent.change(guaranteeNonNullable(waterMarkInput), {
        target: { value: 'testValue' },
      }),
    );
    fireEvent.click(renderResult.getByRole('button', { name: 'Apply' }));

    // Verify that value was saved
    const resultModifierPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_RESULT_MODIFIER_PROMPT,
      ),
    );
    await waitFor(() => getAllByText(resultModifierPanel, 'Watermark'));
    await waitFor(() => getAllByText(resultModifierPanel, 'testValue'));
  },
);

test(
  integrationTest(
    "Query builder watermark modal doesn't save changes to state when Cancel button is clicked",
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
          TEST_DATA__simpleProjectionWithConstantsAndParameters.parameters,
          TEST_DATA__simpleProjectionWithConstantsAndParameters.body,
        ),
      );
    });

    // Open Query Options modal, enable and save watermark
    const queryOptionsButton = await waitFor(() =>
      renderResult.getByRole('button', { name: 'Set Query Options' }),
    );
    fireEvent.click(queryOptionsButton);
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Enable Watermark' }),
      ),
    );
    await waitFor(() => renderResult.getByText('Watermark'));
    const watermarkEditor = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL__WATERMAKR,
    );
    const waterMarkInput = watermarkEditor.getElementsByClassName(
      'value-spec-editor__input',
    )[0];
    expect(waterMarkInput).toBeDefined();
    await waitFor(() =>
      fireEvent.change(guaranteeNonNullable(waterMarkInput), {
        target: { value: 'watermarkValue' },
      }),
    );
    fireEvent.click(renderResult.getByRole('button', { name: 'Apply' }));

    // Re-open watermark modal and change value
    fireEvent.click(queryOptionsButton);
    const watermarkValueInput =
      renderResult.getByDisplayValue('watermarkValue');
    fireEvent.change(watermarkValueInput, {
      target: { value: 'testValue' },
    });

    // Click cancel
    fireEvent.click(renderResult.getByRole('button', { name: 'Cancel' }));

    // Re-open watermark modal
    fireEvent.click(queryOptionsButton);

    // Verify that value was not saved
    expect(renderResult.getByDisplayValue('watermarkValue')).not.toBeNull();

    // Disable watermark
    fireEvent.click(renderResult.getByText('Enable Watermark'));

    // Click cancel
    fireEvent.click(renderResult.getByRole('button', { name: 'Cancel' }));

    // Verify that watermark is still enabled
    const resultModifierPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_RESULT_MODIFIER_PROMPT,
      ),
    );
    await waitFor(() => getAllByText(resultModifierPanel, 'Watermark'));
    await waitFor(() => getAllByText(resultModifierPanel, 'watermarkValue'));
  },
);

test(
  integrationTest(
    "Query builder watermark modal resets watermark value when 'Reset' button is clicked",
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
          TEST_DATA__simpleProjectionWithConstantsAndParameters.parameters,
          TEST_DATA__simpleProjectionWithConstantsAndParameters.body,
        ),
      );
    });

    // Open watermark modal
    const queryOptionsButton = await waitFor(() =>
      renderResult.getByRole('button', { name: 'Set Query Options' }),
    );
    fireEvent.click(queryOptionsButton);
    await waitFor(() => renderResult.getByText('Watermark'));

    // Enable watermark and set value
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Enable Watermark' }),
      ),
    );
    const watermarkEditor = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL__WATERMAKR,
    );
    const waterMarkInput = watermarkEditor.getElementsByClassName(
      'value-spec-editor__input',
    )[0];
    expect(waterMarkInput).toBeDefined();
    await waitFor(() =>
      fireEvent.change(guaranteeNonNullable(waterMarkInput), {
        target: { value: 'testValue' },
      }),
    );
    expect(renderResult.getByDisplayValue('testValue')).not.toBeNull();

    // Click reset button
    fireEvent.click(renderResult.getByRole('button', { name: 'Reset' }));

    // Verify that value was reset
    expect(renderResult.queryByText('testValue')).toBeNull();
    expect(renderResult.getByTitle('Invalid String value')).not.toBeNull();
  },
);
