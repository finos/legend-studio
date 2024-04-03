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
import { waitFor, fireEvent, act } from '@testing-library/react';
import { TEST_DATA__simpleProjectionWithConstantsAndParameters } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import { TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' assert { type: 'json' };
import { integrationTest } from '@finos/legend-shared/test';
import { create_RawLambda, stub_RawLambda } from '@finos/legend-graph';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';

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

    const advancedButton = await waitFor(() =>
      renderResult.getByRole('button', { name: 'Advanced' }),
    );

    // Open watermark modal
    fireEvent.click(advancedButton);
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Show Watermark' }),
      ),
    );
    await waitFor(() => renderResult.getByText('Watermark'));

    // Change watermark value and apply
    fireEvent.click(renderResult.getByText('Enable watermark'));
    const watermarkValueInput =
      renderResult.getByDisplayValue('watermarkValue');
    fireEvent.change(watermarkValueInput, {
      target: { value: 'testValue' },
    });
    fireEvent.click(renderResult.getByRole('button', { name: 'Apply' }));

    // Verify that value was saved
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Used watermark' }),
      ),
    );
    await waitFor(() => renderResult.getByText('Watermark'));
    expect(renderResult.getByDisplayValue('testValue')).not.toBeNull();
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

    const advancedButton = await waitFor(() =>
      renderResult.getByRole('button', { name: 'Advanced' }),
    );

    // Open watermark modal
    fireEvent.click(advancedButton);
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Show Watermark' }),
      ),
    );
    await waitFor(() => renderResult.getByText('Watermark'));

    // Enable and save watermark
    fireEvent.click(renderResult.getByText('Enable watermark'));
    fireEvent.click(renderResult.getByRole('button', { name: 'Apply' }));

    // Re-open watermark modal
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Used watermark' }),
      ),
    );
    await waitFor(() => renderResult.getByText('Watermark'));

    // Change value
    const watermarkValueInput =
      renderResult.getByDisplayValue('watermarkValue');
    fireEvent.change(watermarkValueInput, {
      target: { value: 'testValue' },
    });

    // Click cancel
    fireEvent.click(renderResult.getByRole('button', { name: 'Cancel' }));

    // Re-open watermark modal
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Used watermark' }),
      ),
    );
    await waitFor(() => renderResult.getByText('Watermark'));

    // Verify that value was not saved
    expect(renderResult.getByDisplayValue('watermarkValue')).not.toBeNull();

    // Disable watermark
    fireEvent.click(renderResult.getByText('Enable watermark'));

    // Click cancel
    fireEvent.click(renderResult.getByRole('button', { name: 'Cancel' }));

    // Verify that watermark is still enabled
    expect(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Used watermark' }),
      ),
    ).not.toBeNull();
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

    const advancedButton = await waitFor(() =>
      renderResult.getByRole('button', { name: 'Advanced' }),
    );

    // Open watermark modal
    fireEvent.click(advancedButton);
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Show Watermark' }),
      ),
    );
    await waitFor(() => renderResult.getByText('Watermark'));

    // Enable watermark and set value
    fireEvent.click(renderResult.getByText('Enable watermark'));
    const watermarkValueInput =
      renderResult.getByDisplayValue('watermarkValue');
    fireEvent.change(watermarkValueInput, {
      target: { value: 'testValue' },
    });
    expect(renderResult.getByDisplayValue('testValue')).not.toBeNull();

    // Click reset button
    fireEvent.click(renderResult.getByRole('button', { name: 'Reset' }));

    // Verify that value was reset
    expect(renderResult.getByDisplayValue('watermarkValue')).not.toBeNull();
  },
);
