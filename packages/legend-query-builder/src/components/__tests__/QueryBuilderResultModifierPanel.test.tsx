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

import { beforeEach, describe, test, expect } from '@jest/globals';
import {
  waitFor,
  fireEvent,
  getByText,
  act,
  type RenderResult,
  findByText,
  findByRole,
  findAllByTestId,
  queryByText,
  findAllByText,
  findByLabelText,
  findByDisplayValue,
  queryByDisplayValue,
} from '@testing-library/react';
import { TEST_DATA__simpleProjection } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import { TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' with { type: 'json' };
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { integrationTest } from '@finos/legend-shared/test';
import { create_RawLambda, stub_RawLambda } from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';

describe('QueryBuilderResultModifierPanel', () => {
  let renderResult: RenderResult,
    queryBuilderState: QueryBuilderState,
    resultModifierPrompt: HTMLElement;

  beforeEach(async () => {
    ({ renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    ));

    const _personClass = queryBuilderState.graphManagerState.graph.getClass(
      'model::pure::tests::model::simple::Person',
    );

    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person'));
    await waitFor(() =>
      getByText(queryBuilderSetup, 'simpleRelationalMapping'),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'MyRuntime'));

    // simpleProjection
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__simpleProjection.parameters,
          TEST_DATA__simpleProjection.body,
        ),
      );
    });

    resultModifierPrompt = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_RESULT_MODIFIER_PROMPT,
    );
  });

  test(
    integrationTest(
      'Query builder result modifier panel sets sort state when Apply is clicked',
    ),
    async () => {
      // Open Query Options panel
      const queryOptionsButton =
        await renderResult.findByText('Set Query Options');
      fireEvent.click(queryOptionsButton);
      const resultModifierPanel = await renderResult.findByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL,
      );

      // Verify initial state
      expect(queryByText(resultModifierPrompt, 'Sort')).toBeNull();
      expect(queryByText(resultModifierPrompt, 'Last Name ASC')).toBeNull();

      // Set sort values
      await findByText(resultModifierPanel, 'Sort and Order');
      const addValueButton = guaranteeNonNullable(
        await renderResult.findByText('Add Value'),
      );
      fireEvent.click(addValueButton);
      expect(
        await findByText(resultModifierPanel, 'Edited First Name'),
      ).not.toBeNull();
      expect(await findByText(resultModifierPanel, 'asc')).not.toBeNull();
      fireEvent.click(addValueButton);
      expect(await findByText(resultModifierPanel, 'Last Name')).not.toBeNull();
      expect(await findAllByText(resultModifierPanel, 'asc')).toHaveLength(2);
      // Remove Edited First Name selection
      const removeButton = guaranteeNonNullable(
        (
          await findAllByTestId(
            resultModifierPanel,
            QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL_SORT_REMOVE_BTN,
          )
        )[0],
      );
      fireEvent.click(removeButton);
      expect(queryByText(resultModifierPanel, 'Edited First Name')).toBeNull();
      expect(await findByText(resultModifierPanel, 'asc')).not.toBeNull();

      const applyButton = await findByRole(resultModifierPanel, 'button', {
        name: 'Apply',
      });
      fireEvent.click(applyButton);

      // Check state
      expect(findByText(resultModifierPrompt, 'Sort')).not.toBeNull();
      expect(findByText(resultModifierPrompt, 'Last Name ASC')).not.toBeNull();
    },
  );

  test(
    integrationTest(
      "Query builder result modifier panel doesn't set sort state when Cancel is clicked",
    ),
    async () => {
      // Open Query Options panel
      const queryOptionsButton =
        await renderResult.findByText('Set Query Options');
      fireEvent.click(queryOptionsButton);
      const resultModifierPanel = await renderResult.findByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL,
      );

      // Verify initial state
      expect(queryByText(resultModifierPrompt, 'Sort')).toBeNull();
      expect(
        queryByText(resultModifierPrompt, 'Edited First Name ASC'),
      ).toBeNull();

      // Set sort values
      await findByText(resultModifierPanel, 'Sort and Order');
      const addValueButton = guaranteeNonNullable(
        await renderResult.findByText('Add Value'),
      );
      fireEvent.click(addValueButton);
      expect(
        await findByText(resultModifierPanel, 'Edited First Name'),
      ).not.toBeNull();
      expect(await findByText(resultModifierPanel, 'asc')).not.toBeNull();

      // Don't apply the changes
      const cancelButton = await findByRole(resultModifierPanel, 'button', {
        name: 'Cancel',
      });
      fireEvent.click(cancelButton);

      // Check new state
      expect(queryByText(resultModifierPrompt, 'Sort')).toBeNull();
      expect(
        queryByText(resultModifierPrompt, 'Edited First Name ASC'),
      ).toBeNull();

      // Verify that panel stays synced with state
      fireEvent.click(queryOptionsButton);
      await findByText(resultModifierPanel, 'Sort and Order');
      expect(queryByText(resultModifierPanel, 'Edited First Name')).toBeNull();
      expect(queryByText(resultModifierPanel, 'asc')).toBeNull();
    },
  );

  test(
    integrationTest(
      "Query builder result modifier panel doesn't update sort order when Cancel button is clicked",
    ),
    async () => {
      // Open Query Options panel
      const queryOptionsButton =
        await renderResult.findByText('Set Query Options');
      fireEvent.click(queryOptionsButton);
      const resultModifierPanel = await renderResult.findByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL,
      );

      // Set sort values
      await findByText(resultModifierPanel, 'Sort and Order');
      const addValueButton = guaranteeNonNullable(
        await renderResult.findByText('Add Value'),
      );
      fireEvent.click(addValueButton);
      expect(
        await findByText(resultModifierPanel, 'Edited First Name'),
      ).not.toBeNull();
      expect(await findByText(resultModifierPanel, 'asc')).not.toBeNull();
      const applyButton = await findByRole(resultModifierPanel, 'button', {
        name: 'Apply',
      });
      fireEvent.click(applyButton);

      // Check state
      expect(findByText(resultModifierPrompt, 'Sort')).not.toBeNull();
      expect(
        findByText(resultModifierPrompt, 'Edited First Name ASC'),
      ).not.toBeNull();

      // Open Query Options panel
      fireEvent.click(queryOptionsButton);

      // Change asc to desc
      const orderDropdownButton = guaranteeNonNullable(
        (await findByText(resultModifierPanel, 'asc')).nextElementSibling,
      );
      fireEvent.click(orderDropdownButton);
      const sortByOperator = await renderResult.findByRole('button', {
        name: 'Choose SortBy Operator...',
      });
      fireEvent.click(sortByOperator);
      expect(findByText(resultModifierPanel, 'desc')).not.toBeNull();

      // Don't apply the changes
      const cancelButton = await findByRole(resultModifierPanel, 'button', {
        name: 'Cancel',
      });
      fireEvent.click(cancelButton);

      // Check new state
      expect(await findByText(resultModifierPrompt, 'Sort')).not.toBeNull();
      expect(
        await findByText(resultModifierPrompt, 'Edited First Name ASC'),
      ).not.toBeNull();
      expect(queryByText(resultModifierPrompt, 'DESC')).toBeNull();
    },
  );

  test(
    integrationTest(
      'Query builder result modifier panel sets eliminate duplicate rows when Apply is clicked',
    ),
    async () => {
      // Open Query Options panel
      const queryOptionsButton =
        await renderResult.findByText('Set Query Options');
      fireEvent.click(queryOptionsButton);
      const resultModifierPanel = await renderResult.findByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL,
      );

      // Verify initial state
      expect(
        queryByText(resultModifierPrompt, 'Eliminate Duplicate Rows'),
      ).toBeNull();
      expect(queryByText(resultModifierPrompt, 'Yes')).toBeNull();

      // Toggle eliminate duplicate rows
      const eliminateDuplicateRowsToggle = await findByText(
        resultModifierPanel,
        'Remove duplicate rows from the results',
      );
      fireEvent.click(eliminateDuplicateRowsToggle);
      const applyButton = await renderResult.findByRole('button', {
        name: 'Apply',
      });
      fireEvent.click(applyButton);

      // Check new state
      expect(
        await findByText(resultModifierPrompt, 'Eliminate Duplicate Rows'),
      ).not.toBeNull();
      expect(await findByText(resultModifierPrompt, 'Yes')).not.toBeNull();
    },
  );

  test(
    integrationTest(
      "Query builder result modifier panel doesn't set eliminate duplicate rows when Cancel is clicked",
    ),
    async () => {
      // Open Query Options panel
      const queryOptionsButton =
        await renderResult.findByText('Set Query Options');
      fireEvent.click(queryOptionsButton);
      const resultModifierPanel = await renderResult.findByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL,
      );

      // Verify initial state
      expect(
        queryByText(resultModifierPrompt, 'Eliminate Duplicate Rows'),
      ).toBeNull();
      expect(queryByText(resultModifierPrompt, 'Yes')).toBeNull();

      // Toggle eliminate duplicate rows
      const eliminateDuplicateRowsToggleText = await findByText(
        resultModifierPanel,
        'Remove duplicate rows from the results',
      );
      const eliminateDuplicateRowsToggleButton = guaranteeNonNullable(
        eliminateDuplicateRowsToggleText.parentElement?.firstElementChild,
      );
      fireEvent.click(eliminateDuplicateRowsToggleButton);
      expect(
        eliminateDuplicateRowsToggleButton.classList.contains(
          'panel__content__form__section__toggler__btn--toggled',
        ),
      ).toBe(true);

      // Don't apply changes
      const cancelButton = await renderResult.findByRole('button', {
        name: 'Cancel',
      });
      fireEvent.click(cancelButton);

      // Check new state
      expect(
        queryByText(resultModifierPrompt, 'Eliminate Duplicate Rows'),
      ).toBeNull();
      expect(queryByText(resultModifierPrompt, 'Yes')).toBeNull();

      // Verify that panel stays synced with state
      fireEvent.click(queryOptionsButton);
      expect(
        eliminateDuplicateRowsToggleButton.classList.contains(
          'panel__content__form__section__toggler__btn--toggled',
        ),
      ).toBe(false);
    },
  );

  test(
    integrationTest(
      'Query builder result modifier panel sets limit results when Apply is clicked',
    ),
    async () => {
      // Open Query Options panel
      const queryOptionsButton =
        await renderResult.findByText('Set Query Options');
      fireEvent.click(queryOptionsButton);
      const resultModifierPanel = await renderResult.findByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL,
      );

      // Verify initial state
      expect(queryByText(resultModifierPrompt, 'Max Rows')).toBeNull();
      expect(queryByText(resultModifierPrompt, '12345')).toBeNull();

      // Set result limit and verify only numbers are allowed
      const limitResultsInput = guaranteeType(
        await findByLabelText(resultModifierPanel, 'Limit Results'),
        HTMLInputElement,
      );
      fireEvent.change(limitResultsInput, {
        target: { value: '12.3-4+5' },
      });
      expect(limitResultsInput.value).toBe('12345');
      const applyButton = await renderResult.findByRole('button', {
        name: 'Apply',
      });
      fireEvent.click(applyButton);

      // Check new state
      expect(await findByText(resultModifierPrompt, 'Max Rows')).not.toBeNull();
      expect(await findByText(resultModifierPrompt, '12345')).not.toBeNull();
    },
  );

  test(
    integrationTest(
      "Query builder result modifier panel doesn't set limit results when Cancel is clicked",
    ),
    async () => {
      // Open Query Options panel
      const queryOptionsButton =
        await renderResult.findByText('Set Query Options');
      fireEvent.click(queryOptionsButton);
      const resultModifierPanel = await renderResult.findByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL,
      );

      // Verify initial state
      expect(queryByText(resultModifierPrompt, 'Max Rows')).toBeNull();
      expect(queryByText(resultModifierPrompt, '12345')).toBeNull();

      // Set result limit and verify only numbers are allowed
      const limitResultsInput = guaranteeType(
        await findByLabelText(resultModifierPanel, 'Limit Results'),
        HTMLInputElement,
      );
      fireEvent.change(limitResultsInput, {
        target: { value: '12345' },
      });
      expect(limitResultsInput.value).toBe('12345');

      // Don't apply changes
      const cancelButton = await renderResult.findByRole('button', {
        name: 'Cancel',
      });
      fireEvent.click(cancelButton);

      // Check new state
      expect(queryByText(resultModifierPrompt, 'Max Rows')).toBeNull();
      expect(queryByText(resultModifierPrompt, '12345')).toBeNull();

      // Verify that panel stays synced with state
      fireEvent.click(queryOptionsButton);
      expect(limitResultsInput.value).toBe('');
    },
  );

  test(
    integrationTest(
      'Query builder result modifier panel sets slice when Apply is clicked',
    ),
    async () => {
      // Open Query Options panel
      const queryOptionsButton =
        await renderResult.findByText('Set Query Options');
      fireEvent.click(queryOptionsButton);
      const resultModifierPanel = await renderResult.findByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL,
      );

      // Verify initial state
      expect(queryByText(resultModifierPrompt, 'Slice')).toBeNull();
      expect(queryByText(resultModifierPrompt, '1234,2000')).toBeNull();

      // Set slice
      const sliceStartInput = guaranteeNonNullable(
        await findByLabelText(resultModifierPanel, 'Slice'),
      );
      const sliceEndInput = guaranteeNonNullable(
        sliceStartInput.parentElement?.parentElement?.nextElementSibling?.nextElementSibling?.querySelector(
          'input',
        ),
      );
      fireEvent.change(sliceStartInput, {
        target: { value: '1.2+3-4' },
      });
      fireEvent.change(sliceEndInput, {
        target: { value: '2000' },
      });
      const applyButton = await renderResult.findByRole('button', {
        name: 'Apply',
      });
      fireEvent.click(applyButton);

      // Check new state
      expect(await findByText(resultModifierPrompt, 'Slice')).not.toBeNull();
      expect(
        await findByText(resultModifierPrompt, '1234,2000'),
      ).not.toBeNull();
    },
  );

  test(
    integrationTest(
      "Query builder result modifier panel doesn't set slice when Cancel is clicked",
    ),
    async () => {
      // Open Query Options panel
      const queryOptionsButton =
        await renderResult.findByText('Set Query Options');
      fireEvent.click(queryOptionsButton);
      const resultModifierPanel = await renderResult.findByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL,
      );

      // Verify initial state
      expect(queryByText(resultModifierPrompt, 'Slice')).toBeNull();
      expect(queryByText(resultModifierPrompt, '10,20')).toBeNull();

      // Set result limit and verify only numbers are allowed
      const sliceStartInput = guaranteeNonNullable(
        await findByLabelText(resultModifierPanel, 'Slice'),
      ) as HTMLInputElement;
      const sliceEndInput = guaranteeNonNullable(
        sliceStartInput.parentElement?.parentElement?.nextElementSibling?.nextElementSibling?.querySelector(
          'input',
        ),
      );
      fireEvent.change(sliceStartInput, {
        target: { value: '10' },
      });
      fireEvent.change(sliceEndInput, {
        target: { value: '20' },
      });
      expect(
        await findByDisplayValue(resultModifierPanel, '10'),
      ).not.toBeNull();
      expect(
        await findByDisplayValue(resultModifierPanel, '20'),
      ).not.toBeNull();

      // Don't apply changes
      const cancelButton = await renderResult.findByRole('button', {
        name: 'Cancel',
      });
      fireEvent.click(cancelButton);

      // Check new state
      expect(queryByText(resultModifierPrompt, 'Slice')).toBeNull();
      expect(queryByText(resultModifierPrompt, '10,20')).toBeNull();

      // Verify that panel stays synced with state
      fireEvent.click(queryOptionsButton);
      expect(queryByDisplayValue(resultModifierPanel, '10')).toBeNull();
      expect(queryByDisplayValue(resultModifierPanel, '20')).toBeNull();
    },
  );

  test(
    integrationTest(
      'Query builder result modifier panel disables Apply button when slice is invalid',
    ),
    async () => {
      // Open Query Options panel
      const queryOptionsButton =
        await renderResult.findByText('Set Query Options');
      fireEvent.click(queryOptionsButton);
      const resultModifierPanel = await renderResult.findByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL,
      );

      // Set invalid slice (only start value)
      const sliceStartInput = guaranteeNonNullable(
        await findByLabelText(resultModifierPanel, 'Slice'),
      ) as HTMLInputElement;
      fireEvent.change(sliceStartInput, {
        target: { value: '10' },
      });

      // Check apply button is disabled
      const applyButton = (await renderResult.findByRole('button', {
        name: 'Apply',
      })) as HTMLButtonElement;
      expect(applyButton.disabled).toBe(true);

      // Set valid slice (start and end values)
      const sliceEndInput = guaranteeNonNullable(
        sliceStartInput.parentElement?.parentElement?.nextElementSibling?.nextElementSibling?.querySelector(
          'input',
        ),
      );
      fireEvent.change(sliceEndInput, {
        target: { value: '20' },
      });

      // Check apply button is enabled
      expect(applyButton.disabled).toBe(false);

      // Set invalid slice (end value same as start value)
      fireEvent.change(sliceEndInput, {
        target: { value: '10' },
      });

      // Check apply button is disabled
      expect(applyButton.disabled).toBe(true);

      // Set invalid slice (only end value)
      fireEvent.change(sliceStartInput, {
        target: { value: '' },
      });

      // Check apply button is disabled
      expect(applyButton.disabled).toBe(true);
    },
  );
});
