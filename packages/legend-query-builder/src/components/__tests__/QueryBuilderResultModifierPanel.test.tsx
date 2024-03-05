/**
 * Copyright (c) 2024-present, Goldman Sachs
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
} from '@testing-library/react';
import { TEST_DATA__simpleProjection } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import { TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' assert { type: 'json' };
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { integrationTest } from '@finos/legend-shared/test';
import { create_RawLambda, stub_RawLambda } from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { COLUMN_SORT_TYPE } from '../../graph/QueryBuilderMetaModelConst.js';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';

describe('QueryBuilderResultModifierPanel', () => {
  let renderResult: RenderResult, queryBuilderState: QueryBuilderState;

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
  });

  test.skip(
    integrationTest(
      'Query builder result modifier panel sets sort state when Apply is clicked',
    ),
    async () => {
      // Open Query Options panel
      const queryOptionsButton = await renderResult.findByText('Query Options');
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
      fireEvent.click(
        await findByText(resultModifierPanel, 'Edited First Name'),
      );
      const dropdownMenu = guaranteeNonNullable(
        document.querySelector('.selector-input--dark__menu'),
      ) as HTMLElement;
      fireEvent.click(await findByText(dropdownMenu, 'Last Name'));
      fireEvent.click(addValueButton);
      expect(
        await findByText(resultModifierPanel, 'Edited First Name'),
      ).not.toBeNull();

      const applyButton = await findByRole(resultModifierPanel, 'button', {
        name: 'Apply ',
      });
      fireEvent.click(applyButton);

      // Check state
      const queryBuilderTDSState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      expect(
        queryBuilderTDSState.resultSetModifierState.sortColumns,
      ).toHaveLength(2);
      expect(
        queryBuilderTDSState.resultSetModifierState.sortColumns[0]?.sortType,
      ).toBe(COLUMN_SORT_TYPE.ASC);
      expect(
        queryBuilderTDSState.resultSetModifierState.sortColumns[0]?.columnState
          .columnName,
      ).toBe('Last Name');
      expect(
        queryBuilderTDSState.resultSetModifierState.sortColumns[1]?.sortType,
      ).toBe(COLUMN_SORT_TYPE.ASC);
      expect(
        queryBuilderTDSState.resultSetModifierState.sortColumns[1]?.columnState
          .columnName,
      ).toBe('Edited First Name');
    },
  );

  test(
    integrationTest(
      'Query builder result modifier panel sets eliminate duplicate rows when Apply is clicked',
    ),
    async () => {
      // Open Query Options panel
      const queryOptionsButton = await renderResult.findByText('Query Options');
      fireEvent.click(queryOptionsButton);
      const resultModifierPanel = await renderResult.findByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL,
      );

      // Verify initial state
      const queryBuilderTDSState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      expect(queryBuilderTDSState.resultSetModifierState.distinct).toBe(false);

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
      expect(queryBuilderTDSState.resultSetModifierState.distinct).toBe(true);
    },
  );

  test(
    integrationTest(
      "Query builder result modifier panel doesn't set eliminate duplicate rows when Cancel is clicked",
    ),
    async () => {
      // Open Query Options panel
      const queryOptionsButton = await renderResult.findByText('Query Options');
      fireEvent.click(queryOptionsButton);
      const resultModifierPanel = await renderResult.findByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL,
      );

      // Verify initial state
      const queryBuilderTDSState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      expect(queryBuilderTDSState.resultSetModifierState.distinct).toBe(false);

      // Toggle eliminate duplicate rows
      const eliminateDuplicateRowsToggleText = await findByText(
        resultModifierPanel,
        'Remove duplicate rows from the results',
      );
      const eliminateDuplicateRowsToggleButton = guaranteeNonNullable(
        eliminateDuplicateRowsToggleText?.parentElement?.firstElementChild,
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
      expect(queryBuilderTDSState.resultSetModifierState.distinct).toBe(false);

      // Verify that panel stays synced with state
      fireEvent.click(queryOptionsButton);
      expect(
        eliminateDuplicateRowsToggleButton.classList.contains(
          'panel__content__form__section__toggler__btn--toggled',
        ),
      ).toBe(false);
    },
  );
});
