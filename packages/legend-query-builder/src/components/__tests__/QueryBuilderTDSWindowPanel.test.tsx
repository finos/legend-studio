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
  fireEvent,
  getByTitle,
  act,
  getByDisplayValue,
  getByText,
  getAllByText,
  findByText,
  findByDisplayValue,
} from '@testing-library/react';
import {
  TEST_DATA__simpleProjection,
  TEST_DATA_projectionWithWindowFunction,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import {
  TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDates,
} from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates.json' assert { type: 'json' };
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' assert { type: 'json' };
import { integrationTest } from '@finos/legend-shared/test';
import { create_RawLambda, stub_RawLambda } from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  TEST__setUpQueryBuilder,
  dragAndDrop,
  selectFirstOptionFromCustomSelectorInput,
  selectFromCustomSelectorInput,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';

test(
  integrationTest('Window column editor shows correct placeholder text'),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates,
      stub_RawLambda(),
      'model::RelationalMapping',
      'model::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDates,
    );

    const _personClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Person');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      tdsState.setShowWindowFuncPanel(true);
    });

    const windowFunctionPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY,
    );
    const tdsProjectionPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
    );
    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );

    // DND from explorer to projection panel
    const ageExplorerDragSource = await findByText(explorerPanel, 'Age');
    const firstNameExplorerDragSource = await findByText(
      explorerPanel,
      'First Name',
    );
    const tdsProjectionDropZone = await findByText(
      tdsProjectionPanel,
      'Add a projection column',
    );
    await dragAndDrop(
      ageExplorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    await dragAndDrop(
      firstNameExplorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    const ageTDSDragSource = await findByText(tdsProjectionPanel, 'Age');
    const firstNameTDSDragSource = await findByText(
      tdsProjectionPanel,
      'First Name',
    );

    // DND Age from projection panel to window function panel
    const windowFunctionDropZone = await findByText(
      windowFunctionPanel,
      'Add Window Function Column',
    );
    await dragAndDrop(
      ageTDSDragSource,
      windowFunctionDropZone,
      windowFunctionPanel,
      'Add Window Function Column',
    );
    await findByText(windowFunctionPanel, 'Age');
    await findByDisplayValue(windowFunctionPanel, 'sum of Age');

    // DND First Name from projection panel to window function panel
    await dragAndDrop(
      firstNameTDSDragSource,
      windowFunctionDropZone,
      windowFunctionPanel,
      'Add new window function column',
    );
    await findByText(windowFunctionPanel, 'First Name');
    await findByDisplayValue(windowFunctionPanel, 'sum of First Name');
  },
);

test(
  integrationTest(
    'Window column editor shows error if window column has same name as projection column',
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
      // 'Show Window Function(s)' panel so we will directly force
      // the panel to show for now
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      tdsState.setShowWindowFuncPanel(true);
    });

    await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY,
    );
    const windowFunctionPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY,
    );

    // Create window function
    fireEvent.click(
      getByTitle(windowFunctionPanel, 'Create Window Function Column'),
    );
    await renderResult.findByText('Create Window Function Column');
    const createButton = renderResult.getByRole('button', { name: 'Create' });
    fireEvent.click(createButton);

    // Update window function name
    const windowFunctionNameInput = getByDisplayValue(
      windowFunctionPanel,
      'sum of Edited First Name',
    );
    fireEvent.change(windowFunctionNameInput, {
      target: { value: 'Edited First Name' },
    });

    // Check for validation error
    expect(await findByText(windowFunctionPanel, '1 issue')).not.toBeNull();
    const fetchStructurePanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FETCH_STRUCTURE,
    );
    expect(await findByText(fetchStructurePanel, '1 issue')).not.toBeNull();
    expect(
      renderResult
        .getByRole('button', { name: 'Run Query' })
        .hasAttribute('disabled'),
    ).toBe(true);
  },
);

test(
  integrationTest(
    'Window column editor shows error if window column has same name as another window column',
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
      // 'Show Window Function(s)' panel so we will directly force
      // the panel to show for now
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      tdsState.setShowWindowFuncPanel(true);
    });

    await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY,
    );
    const windowFunctionPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY,
    );

    // Create window function
    fireEvent.click(
      getByTitle(windowFunctionPanel, 'Create Window Function Column'),
    );
    await renderResult.findByText('Create Window Function Column');
    fireEvent.click(renderResult.getByRole('button', { name: 'Create' }));

    // Create second window function (change name so we can click Create button)
    fireEvent.click(
      getByTitle(windowFunctionPanel, 'Create Window Function Column'),
    );
    await renderResult.findByText('Create Window Function Column');
    const columnNameContainer = guaranteeNonNullable(
      renderResult.getByText('Window Function Column Name').parentElement,
    );
    let windowFunctionNameInput = getByDisplayValue(
      columnNameContainer,
      'sum of Edited First Name',
    );
    fireEvent.change(windowFunctionNameInput, {
      target: { value: 'sum of Edited First Name 2' },
    });
    fireEvent.click(renderResult.getByRole('button', { name: 'Create' }));

    // Update window function name in panel
    windowFunctionNameInput = getByDisplayValue(
      windowFunctionPanel,
      'sum of Edited First Name 2',
    );
    fireEvent.change(windowFunctionNameInput, {
      target: { value: 'sum of Edited First Name' },
    });

    // Check for validation error
    expect(await renderResult.findByText('1 issue')).not.toBeNull();
    expect(
      renderResult
        .getByRole('button', { name: 'Run Query' })
        .hasAttribute('disabled'),
    ).toBe(true);
  },
);

test(
  integrationTest(
    "Window column modal editor doesn't allow same name as projection column",
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
      // 'Show Window Function(s)' panel so we will directly force
      // the panel to show for now
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      tdsState.setShowWindowFuncPanel(true);
    });

    await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY,
    );
    const windowFunctionPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY,
    );

    // Create window function and change name
    fireEvent.click(
      getByTitle(windowFunctionPanel, 'Create Window Function Column'),
    );
    await renderResult.findByText('Create Window Function Column');
    const windowFunctionNameInput = renderResult.getByDisplayValue(
      'sum of Edited First Name',
    );
    fireEvent.change(windowFunctionNameInput, {
      target: { value: 'Edited First Name' },
    });

    // Check for validation error
    expect(
      renderResult
        .getByRole('button', { name: 'Create' })
        .hasAttribute('disabled'),
    ).toBe(true);
  },
);

test(
  integrationTest(
    "Window column modal editor doesn't allow same name as another window column",
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
      // 'Show Window Function(s)' panel so we will directly force
      // the panel to show for now
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      tdsState.setShowWindowFuncPanel(true);
    });

    await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY,
    );
    const windowFunctionPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY,
    );

    // Create window function
    fireEvent.click(
      getByTitle(windowFunctionPanel, 'Create Window Function Column'),
    );
    await renderResult.findByText('Create Window Function Column');
    fireEvent.click(renderResult.getByRole('button', { name: 'Create' }));

    // Create another window function (should have same name by default)
    fireEvent.click(
      getByTitle(windowFunctionPanel, 'Create Window Function Column'),
    );
    await renderResult.findByText('Create Window Function Column');

    // Check for validation error
    expect(
      renderResult
        .getByRole('button', { name: 'Create' })
        .hasAttribute('disabled'),
    ).toBe(true);
  },
);

test(
  integrationTest(
    'Query builder window function shows validation error if invalid column order',
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
          TEST_DATA_projectionWithWindowFunction.parameters,
          TEST_DATA_projectionWithWindowFunction.body,
        ),
      );
    });

    const tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    tdsState.setShowWindowFuncPanel(true);

    await act(async () => {
      tdsState.windowState.moveColumn(1, 0);
    });

    const windowPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY,
    );

    expect(getAllByText(windowPanel, '1 issue')).not.toBeNull();

    expect(
      (
        queryBuilderState.fetchStructureState
          .implementation as QueryBuilderTDSState
      ).windowState.windowValidationIssues.length,
    ).toBe(1);

    expect(
      (
        queryBuilderState.fetchStructureState
          .implementation as QueryBuilderTDSState
      ).windowState.invalidWindowColumnNames[0]?.invalidColumnName,
    ).toBe('sum sum Age');
  },
);

test(
  integrationTest(
    "Window column modal editor doesn't apply changes to state when Cancel button is clicked",
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
      // 'Show Window Function(s)' panel so we will directly force
      // the panel to show for now
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      tdsState.setShowWindowFuncPanel(true);
    });

    await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY,
    );
    const windowFunctionPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY,
    );

    // Create window function
    fireEvent.click(
      getByTitle(windowFunctionPanel, 'Create Window Function Column'),
    );
    await renderResult.findByText('Create Window Function Column');
    const addValueButton = renderResult.getByRole('button', {
      name: 'Add Value',
    });
    fireEvent.click(addValueButton);
    let sortByDropdown = renderResult.getByTitle(
      'Choose Window Function SortBy Operator...',
    );
    fireEvent.click(sortByDropdown);
    fireEvent.click(renderResult.getByText('asc'));
    const createButton = renderResult.getByRole('button', { name: 'Create' });
    fireEvent.click(createButton);

    // Check for values
    expect(getAllByText(windowFunctionPanel, 'Edited First Name')).toHaveLength(
      2,
    );
    expect(getByText(windowFunctionPanel, 'sum')).not.toBeNull();
    expect(getByText(windowFunctionPanel, '(1)')).not.toBeNull();
    expect(getByText(windowFunctionPanel, 'asc')).not.toBeNull();
    expect(
      getByDisplayValue(windowFunctionPanel, 'sum of Edited First Name'),
    ).not.toBeNull();

    // Open edit modal
    const editButton = guaranteeNonNullable(
      getByDisplayValue(windowFunctionPanel, 'sum of Edited First Name')
        .parentElement?.parentElement?.nextElementSibling?.firstElementChild,
    );
    fireEvent.click(editButton);
    await renderResult.findByText('Update Window Function Column');
    // Change operator
    const windowOperatorContainer = guaranteeNonNullable(
      renderResult.getByText('Window Operator').parentElement,
    );
    selectFromCustomSelectorInput(windowOperatorContainer, 'Last Name');
    const operatorDropdown = guaranteeNonNullable(
      renderResult.getAllByTitle('Choose Window Function Operator...')[1],
    );
    fireEvent.click(operatorDropdown);
    fireEvent.click(renderResult.getByText('count'));
    // Change window column
    const windowColumnContainer = guaranteeNonNullable(
      renderResult.getByText('Window Columns').parentElement,
    );
    selectFirstOptionFromCustomSelectorInput(windowColumnContainer);
    // Change sort by
    const sortByContainer = guaranteeNonNullable(
      renderResult.getByText('Sort By').parentElement,
    );
    selectFirstOptionFromCustomSelectorInput(sortByContainer);
    sortByDropdown = guaranteeNonNullable(
      renderResult.getAllByTitle(
        'Choose Window Function SortBy Operator...',
      )[1],
    );
    fireEvent.click(sortByDropdown);
    fireEvent.click(renderResult.getByText('desc'));
    // Change name
    const windowFunctionNameInput =
      renderResult.getByDisplayValue('count of Last Name');
    fireEvent.change(windowFunctionNameInput, {
      target: { value: 'Last Name' },
    });

    // Click cancel
    fireEvent.click(renderResult.getByRole('button', { name: 'Cancel' }));

    // Check that values are the same
    expect(getAllByText(windowFunctionPanel, 'Edited First Name')).toHaveLength(
      2,
    );
    expect(getByText(windowFunctionPanel, 'sum')).not.toBeNull();
    expect(getByText(windowFunctionPanel, '(1)')).not.toBeNull();
    expect(getByText(windowFunctionPanel, 'asc')).not.toBeNull();
    expect(
      getByDisplayValue(windowFunctionPanel, 'sum of Edited First Name'),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Window column modal editor applies changes to state when Apply button is clicked',
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
      // 'Show Window Function(s)' panel so we will directly force
      // the panel to show for now
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      tdsState.setShowWindowFuncPanel(true);
    });

    await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY,
    );
    const windowFunctionPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY,
    );

    // Create window function
    fireEvent.click(
      getByTitle(windowFunctionPanel, 'Create Window Function Column'),
    );
    await renderResult.findByText('Create Window Function Column');
    let windowOperatorContainer = guaranteeNonNullable(
      renderResult.getByText('Window Operator').parentElement,
    );
    expect(
      getByText(windowOperatorContainer, 'Edited First Name'),
    ).not.toBeNull();
    const addValueButton = renderResult.getByRole('button', {
      name: 'Add Value',
    });
    fireEvent.click(addValueButton);
    let windowColumnContainer = guaranteeNonNullable(
      renderResult.getByText('Window Columns').parentElement,
    );
    expect(
      getByText(windowColumnContainer, 'Edited First Name'),
    ).not.toBeNull();
    let sortByDropdown = renderResult.getByTitle(
      'Choose Window Function SortBy Operator...',
    );
    fireEvent.click(sortByDropdown);
    fireEvent.click(renderResult.getByText('asc'));
    let sortByContainer = guaranteeNonNullable(
      renderResult.getByText('Sort By').parentElement,
    );
    expect(getByText(sortByContainer, 'Edited First Name')).not.toBeNull();
    const createButton = renderResult.getByRole('button', { name: 'Create' });
    fireEvent.click(createButton);

    // Check for values
    expect(getAllByText(windowFunctionPanel, 'Edited First Name')).toHaveLength(
      2,
    );
    expect(getByText(windowFunctionPanel, 'sum')).not.toBeNull();
    expect(getByText(windowFunctionPanel, '(1)')).not.toBeNull();
    expect(getByText(windowFunctionPanel, 'asc')).not.toBeNull();
    expect(
      getByDisplayValue(windowFunctionPanel, 'sum of Edited First Name'),
    ).not.toBeNull();

    // Open edit modal
    const editButton = guaranteeNonNullable(
      getByDisplayValue(windowFunctionPanel, 'sum of Edited First Name')
        .parentElement?.parentElement?.nextElementSibling?.firstElementChild,
    );
    fireEvent.click(editButton);
    await renderResult.findByText('Update Window Function Column');
    // Change operator
    windowOperatorContainer = guaranteeNonNullable(
      renderResult.getByText('Window Operator').parentElement,
    );
    selectFromCustomSelectorInput(windowOperatorContainer, 'Last Name');
    expect(getByText(windowOperatorContainer, 'Last Name')).not.toBeNull();
    const operatorDropdown = guaranteeNonNullable(
      renderResult.getAllByTitle('Choose Window Function Operator...')[1],
    );
    fireEvent.click(operatorDropdown);
    fireEvent.click(renderResult.getByText('count'));
    expect(getByText(windowOperatorContainer, 'count')).not.toBeNull();
    // Change window column
    windowColumnContainer = guaranteeNonNullable(
      renderResult.getByText('Window Columns').parentElement,
    );
    selectFirstOptionFromCustomSelectorInput(windowColumnContainer);
    expect(getByText(windowColumnContainer, 'Last Name')).not.toBeNull();
    // Change sort by
    sortByContainer = guaranteeNonNullable(
      renderResult.getByText('Sort By').parentElement,
    );
    selectFromCustomSelectorInput(sortByContainer, 'Last Name');
    expect(getByText(sortByContainer, 'Last Name')).not.toBeNull();
    sortByDropdown = guaranteeNonNullable(
      renderResult.getAllByTitle(
        'Choose Window Function SortBy Operator...',
      )[1],
    );
    fireEvent.click(sortByDropdown);
    fireEvent.click(renderResult.getByText('desc'));
    expect(getByText(sortByContainer, 'desc')).not.toBeNull();
    // Change name
    const windowFunctionNameInput =
      renderResult.getByDisplayValue('count of Last Name');
    fireEvent.change(windowFunctionNameInput, {
      target: { value: 'Last Name Count' },
    });
    expect(renderResult.getByDisplayValue('Last Name Count')).not.toBeNull();

    // Click apply
    fireEvent.click(renderResult.getByRole('button', { name: 'Apply' }));

    // Check that values are the same
    expect(getAllByText(windowFunctionPanel, 'Last Name')).toHaveLength(2);
    expect(getByText(windowFunctionPanel, 'count')).not.toBeNull();
    expect(getByText(windowFunctionPanel, '(1)')).not.toBeNull();
    expect(getByText(windowFunctionPanel, 'desc')).not.toBeNull();
    expect(
      getByDisplayValue(windowFunctionPanel, 'Last Name Count'),
    ).not.toBeNull();

    // Open modal again to check that window column is applied
    fireEvent.click(editButton);
    expect(getByText(windowColumnContainer, 'Last Name')).not.toBeNull();
  },
);
