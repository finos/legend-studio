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
  getAllByText,
  waitFor,
  fireEvent,
  getByTitle,
  getByText,
  act,
  queryByText,
  getByRole,
  getAllByPlaceholderText,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import {
  TEST_DATA__simpleProjection,
  TEST_DATA__projectionWithChainedProperty,
  TEST_DATA__projectionWithResultSetModifiers,
  TEST_DATA__getAllWithGroupedFilter,
  TEST_DATA__getAllWithOneConditionFilter,
  TEST_DATA__projectWithDerivedProperty,
  TEST_DATA__complexGraphFetch,
  TEST_DATA__simpleGraphFetch,
  TEST_DATA__simpleProjectionWithSubtypeFromSubtypeModel,
  TEST_DATA__simpleProjectWithSubtype,
  TEST_DATA__simpleGraphFetchWithSubtype,
  TEST_DATA__projectionWithDerivation,
  TEST_DATA__simpleProjectionWithSubtypesInDeepLevel,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import {
  TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
} from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' assert { type: 'json' };
import TEST_DATA__ComplexM2MModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexM2M.json' assert { type: 'json' };
import TEST_DATA_SimpleSubtypeModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleSubtype.json' assert { type: 'json' };
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { createMock, integrationTest } from '@finos/legend-shared/test';
import {
  AbstractPropertyExpression,
  create_RawLambda,
  getClassProperty,
  stub_RawLambda,
} from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  QueryBuilderExplorerTreeRootNodeData,
  QueryBuilderExplorerTreeSubTypeNodeData,
} from '../../stores/explorer/QueryBuilderExplorerState.js';
import {
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderGraphFetchTreeState } from '../../stores/fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeState.js';
import {
  TEST__setUpQueryBuilder,
  dragAndDrop,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { FETCH_STRUCTURE_IMPLEMENTATION } from '../../stores/fetch-structure/QueryBuilderFetchStructureImplementationState.js';
import { COLUMN_SORT_TYPE } from '../../graph/QueryBuilderMetaModelConst.js';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';

test(
  integrationTest(
    'Query builder state is properly set after processing a projection lambda',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );

    const _personClass = queryBuilderState.graphManagerState.graph.getClass(
      'model::pure::tests::model::simple::Person',
    );
    const _firmClass = queryBuilderState.graphManagerState.graph.getClass(
      'model::pure::tests::model::simple::Firm',
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
    const treeData = guaranteeNonNullable(
      queryBuilderState.explorerState.treeData,
    );
    const rootNode = guaranteeType(
      treeData.nodes.get(treeData.rootIds[0] as string),
      QueryBuilderExplorerTreeRootNodeData,
    );

    expect(rootNode.mappingData.mapped).toBe(true);

    // simpleProjection
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__simpleProjection.parameters,
          TEST_DATA__simpleProjection.body,
        ),
      );
    });

    // check fetch-structure
    let projectionCols = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS),
    );
    const FIRST_NAME_ALIAS = 'Edited First Name';
    const LAST_NAME_ALIAS = 'Last Name';
    expect(
      await waitFor(() => queryByText(projectionCols, FIRST_NAME_ALIAS)),
    ).not.toBeNull();
    expect(
      await waitFor(() => queryByText(projectionCols, LAST_NAME_ALIAS)),
    ).not.toBeNull();
    let tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    expect(tdsState.projectionColumns.length).toBe(2);
    let fistNameCol = guaranteeNonNullable(
      tdsState.projectionColumns.find((e) => e.columnName === FIRST_NAME_ALIAS),
    );
    const firstNameProperty = guaranteeType(
      fistNameCol,
      QueryBuilderSimpleProjectionColumnState,
    ).propertyExpressionState.propertyExpression.func.value;
    expect(firstNameProperty).toBe(getClassProperty(_personClass, 'firstName'));
    const lastNameCol = guaranteeNonNullable(
      tdsState.projectionColumns.find((e) => e.columnName === LAST_NAME_ALIAS),
    );
    const lastNameProperty = guaranteeType(
      lastNameCol,
      QueryBuilderSimpleProjectionColumnState,
    ).propertyExpressionState.propertyExpression.func.value;
    expect(lastNameProperty).toBe(getClassProperty(_personClass, 'lastName'));
    expect(tdsState.resultSetModifierState.limit).toBeUndefined();

    // chainedProperty
    const CHAINED_PROPERTY_ALIAS = 'Firm/Legal Name';
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__projectionWithChainedProperty.parameters,
          TEST_DATA__projectionWithChainedProperty.body,
        ),
      );
    });
    tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    const projectionWithChainedPropertyCols = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS),
    );
    expect(
      await waitFor(() =>
        queryByText(projectionWithChainedPropertyCols, CHAINED_PROPERTY_ALIAS),
      ),
    ).not.toBeNull();
    expect(tdsState.projectionColumns.length).toBe(1);
    let legalNameCol = guaranteeNonNullable(
      tdsState.projectionColumns.find(
        (e) => e.columnName === CHAINED_PROPERTY_ALIAS,
      ),
    );
    const legalNameColProperty = guaranteeType(
      legalNameCol,
      QueryBuilderSimpleProjectionColumnState,
    ).propertyExpressionState.propertyExpression.func.value;
    expect(legalNameColProperty).toBe(
      getClassProperty(_firmClass, 'legalName'),
    );
    const _firmPropertyExpression = guaranteeType(
      guaranteeType(legalNameCol, QueryBuilderSimpleProjectionColumnState)
        .propertyExpressionState.propertyExpression.parametersValues[0],
      AbstractPropertyExpression,
    );
    expect(_firmPropertyExpression.func.value).toBe(
      getClassProperty(_personClass, 'firm'),
    );
    expect(tdsState.resultSetModifierState.limit).toBeUndefined();

    // result set modifiers
    const RESULT_LIMIT = 500;
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__projectionWithResultSetModifiers.parameters,
          TEST_DATA__projectionWithResultSetModifiers.body,
        ),
      );
    });
    tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    projectionCols = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS),
    );
    expect(
      await waitFor(() => queryByText(projectionCols, FIRST_NAME_ALIAS)),
    ).not.toBeNull();
    expect(
      await waitFor(() => queryByText(projectionCols, LAST_NAME_ALIAS)),
    ).not.toBeNull();
    expect(
      await waitFor(() => queryByText(projectionCols, CHAINED_PROPERTY_ALIAS)),
    ).not.toBeNull();
    expect(tdsState.projectionColumns.length).toBe(3);
    const resultSetModifierState = tdsState.resultSetModifierState;
    expect(resultSetModifierState.limit).toBe(RESULT_LIMIT);
    expect(resultSetModifierState.distinct).toBe(true);
    expect(resultSetModifierState.sortColumns).toHaveLength(2);
    fistNameCol = guaranteeNonNullable(
      tdsState.projectionColumns.find((e) => e.columnName === FIRST_NAME_ALIAS),
    );
    legalNameCol = guaranteeNonNullable(
      tdsState.projectionColumns.find(
        (e) => e.columnName === CHAINED_PROPERTY_ALIAS,
      ),
    );
    const firstnameSortState = guaranteeNonNullable(
      resultSetModifierState.sortColumns.find(
        (e) => e.columnState === fistNameCol,
      ),
    );
    expect(firstnameSortState.sortType).toBe(COLUMN_SORT_TYPE.ASC);
    const legalNameColSortState = guaranteeNonNullable(
      resultSetModifierState.sortColumns.find(
        (e) => e.columnState === legalNameCol,
      ),
    );
    expect(legalNameColSortState.sortType).toBe(COLUMN_SORT_TYPE.DESC);
    const queryBuilder = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
    );
    fireEvent.click(getByTitle(queryBuilder, 'Configure Query Options...'));
    const modal = await waitFor(() => renderResult.getByRole('dialog'));

    await waitFor(() => fireEvent.click(getByText(modal, 'Add Value')));

    const sortTypesAsc = await waitFor(() =>
      getAllByText(modal, COLUMN_SORT_TYPE.ASC.toLowerCase()),
    );
    expect(sortTypesAsc).toHaveLength(2);

    const sortTypesDesc = await waitFor(() =>
      getAllByText(modal, COLUMN_SORT_TYPE.DESC.toLowerCase()),
    );
    expect(sortTypesDesc).toHaveLength(1);

    await waitFor(() => getByText(modal, 'Sort and Order'));
    await waitFor(() => getByText(modal, 'Eliminate Duplicate Rows'));
    await waitFor(() => getByText(modal, 'Limit Results'));
    await waitFor(() => getByText(modal, FIRST_NAME_ALIAS));
    await waitFor(() => getByText(modal, CHAINED_PROPERTY_ALIAS));
    expect(
      await waitFor(() =>
        modal.querySelector(`input[value="${RESULT_LIMIT}"]`),
      ),
    ).not.toBeNull();
    fireEvent.click(getByText(modal, 'Apply'));

    // Test text decriptions are correctly added for result set modifiers
    await waitFor(() => renderResult.getByText('Query Options'));
    await waitFor(() => renderResult.getByText('Max Rows'));
    await waitFor(() => renderResult.getByText('500'));
    await waitFor(() => renderResult.getByText('Eliminate Duplicate Rows'));
    await waitFor(() => renderResult.getByText('Yes'));
    await waitFor(() => renderResult.getByText('Sort'));
    await waitFor(() => renderResult.getByText(`${FIRST_NAME_ALIAS} ASC`));
    await waitFor(() =>
      renderResult.getByText(`${CHAINED_PROPERTY_ALIAS} DESC`),
    );

    // Clear all projection columns
    fireEvent.click(getByTitle(queryBuilder, 'Clear all projection columns'));
    const closeModal = await waitFor(() => renderResult.getByRole('dialog'));
    fireEvent.click(getByText(closeModal, 'Proceed'));
    await waitFor(() => renderResult.getByText('Set Query Options'));
    const queryBuilderResultModifierPrompt = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_RESULT_MODIFIER_PROMPT,
      ),
    );
    expect(
      queryByText(queryBuilderResultModifierPrompt, 'Max Rows'),
    ).toBeNull();
    expect(
      queryByText(queryBuilderResultModifierPrompt, 'Eliminate Duplicate Rows'),
    ).toBeNull();
    expect(queryByText(queryBuilderResultModifierPrompt, 'Sort')).toBeNull();

    // filter with simple condition
    await waitFor(() => renderResult.getByText('Add a filter condition'));
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__getAllWithOneConditionFilter.parameters,
          TEST_DATA__getAllWithOneConditionFilter.body,
        ),
      );
    });
    tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    let filterValue = 'testFirstName';
    let filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    await waitFor(() => getByText(filterPanel, `"${filterValue}"`));

    await waitFor(() => getByText(filterPanel, 'First Name'));
    await waitFor(() => getByText(filterPanel, 'is'));
    expect(queryBuilderState.filterState.nodes.size).toBe(1);
    expect(tdsState.projectionColumns.length).toBe(0);

    // filter with group condition
    await act(async () => {
      queryBuilderState.resetQueryResult();
      queryBuilderState.resetQueryContent();
    });
    await waitFor(() => renderResult.getByText('Add a filter condition'));
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__getAllWithGroupedFilter.parameters,
          TEST_DATA__getAllWithGroupedFilter.body,
        ),
      );
    });
    tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    await waitFor(() =>
      expect(getAllByText(filterPanel, 'is')).toHaveLength(2),
    );
    await waitFor(() => getByText(filterPanel, 'or'));
    filterValue = 'lastNameTest';
    await waitFor(() => getByText(filterPanel, `"${filterValue}"`));
    await waitFor(() => getByText(filterPanel, 'First Name'));
    const lastNameFilterValue = 'lastNameTest';
    await waitFor(() => getByText(filterPanel, `"${lastNameFilterValue}"`));
    await waitFor(() => getByText(filterPanel, 'Last Name'));
    expect(queryBuilderState.filterState.nodes.size).toBe(3);
    expect(tdsState.projectionColumns.length).toBe(0);

    // projection column with derived property
    await act(async () => {
      queryBuilderState.resetQueryResult();
      queryBuilderState.resetQueryContent();
    });
    await waitFor(() => renderResult.getByText('Add a filter condition'));
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__projectWithDerivedProperty.parameters,
          TEST_DATA__projectWithDerivedProperty.body,
        ),
      );
    });
    tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    projectionCols = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS),
    );
    expect(
      await waitFor(() => queryByText(projectionCols, 'Full Name With Title')),
    ).not.toBeNull();
    expect(tdsState.projectionColumns.length).toBe(1);
    fireEvent.click(
      getByTitle(projectionCols, 'Set Derived Property Argument(s)...'),
    );
    const dpModal = await waitFor(() => renderResult.getByRole('dialog'));
    await waitFor(() => getByText(dpModal, 'Derived Property'));
    await waitFor(() => getByText(dpModal, 'Name With Title'));
    await waitFor(() => getByText(dpModal, 'title'));
    expect(
      await waitFor(() => dpModal.querySelector(`input[value="Mr."]`)),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder allows editing simple column name upon clicking column name',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );

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
    const treeData = guaranteeNonNullable(
      queryBuilderState.explorerState.treeData,
    );
    const rootNode = guaranteeType(
      treeData.nodes.get(treeData.rootIds[0] as string),
      QueryBuilderExplorerTreeRootNodeData,
    );

    expect(rootNode.mappingData.mapped).toBe(true);

    // simpleProjection
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__simpleProjection.parameters,
          TEST_DATA__simpleProjection.body,
        ),
      );
    });

    // check fetch-structure
    const projectionCols = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS),
    );
    const LAST_NAME_ALIAS = 'Last Name';
    expect(
      await waitFor(() => queryByText(projectionCols, LAST_NAME_ALIAS)),
    ).not.toBeNull();
    let tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    let lastNameCol = guaranteeNonNullable(
      tdsState.projectionColumns.find((e) => e.columnName === LAST_NAME_ALIAS),
    );
    let lastNameProperty = guaranteeType(
      lastNameCol,
      QueryBuilderSimpleProjectionColumnState,
    ).propertyExpressionState.propertyExpression.func.value;
    expect(lastNameProperty).toBe(getClassProperty(_personClass, 'lastName'));

    // edit column name
    const lastNameColumnName = guaranteeNonNullable(
      await waitFor(() => queryByText(projectionCols, LAST_NAME_ALIAS)),
    );
    fireEvent.click(lastNameColumnName);
    const lastNameColumnNameInput = guaranteeNonNullable(
      await waitFor(() =>
        projectionCols.querySelector(`input[value="${LAST_NAME_ALIAS}"]`),
      ),
    );
    fireEvent.change(lastNameColumnNameInput, {
      target: { value: 'Edited Last Name' },
    });
    fireEvent.blur(lastNameColumnNameInput);

    // check fetch-structure
    expect(
      await waitFor(() => queryByText(projectionCols, 'Edited Last Name')),
    ).not.toBeNull();
    tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    lastNameCol = guaranteeNonNullable(
      tdsState.projectionColumns.find(
        (e) => e.columnName === 'Edited Last Name',
      ),
    );
    lastNameProperty = guaranteeType(
      lastNameCol,
      QueryBuilderSimpleProjectionColumnState,
    ).propertyExpressionState.propertyExpression.func.value;
    expect(lastNameProperty).toBe(getClassProperty(_personClass, 'lastName'));
  },
);

test(
  integrationTest(
    'Query builder column names automatically change to be unique when an aggregation is added',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );

    const _personClass = queryBuilderState.graphManagerState.graph.getClass(
      'model::pure::tests::model::simple::Person',
    );

    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });

    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // Drag and drop column
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    const dragSource = await waitFor(() =>
      getByText(explorerPanel, 'First Name'),
    );
    await dragAndDrop(
      dragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );

    // check fetch-structure
    const FIRST_NAME_ALIAS = 'First Name';
    expect(
      await waitFor(() => queryByText(tdsProjectionPanel, FIRST_NAME_ALIAS)),
    ).not.toBeNull();
    fireEvent.click(
      getByTitle(tdsProjectionPanel, 'Choose Aggregate Operator...'),
    );
    fireEvent.click(renderResult.getByText('count'));

    expect(
      await waitFor(() => queryByText(tdsProjectionPanel, FIRST_NAME_ALIAS)),
    ).toBeNull();
    expect(
      await waitFor(() =>
        queryByText(tdsProjectionPanel, `${FIRST_NAME_ALIAS} (count)`),
      ),
    ).not.toBeNull();

    fireEvent.click(
      getByTitle(tdsProjectionPanel, 'Choose Aggregate Operator...'),
    );
    fireEvent.click(renderResult.getByText('(none)'));
    expect(
      await waitFor(() =>
        queryByText(tdsProjectionPanel, `${FIRST_NAME_ALIAS} (count)`),
      ),
    ).toBeNull();
    expect(
      await waitFor(() => queryByText(tdsProjectionPanel, FIRST_NAME_ALIAS)),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder resets simple column name if user edits it and clears the name',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );

    const _personClass = queryBuilderState.graphManagerState.graph.getClass(
      'model::pure::tests::model::simple::Person',
    );

    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });

    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // Drag and drop column
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    const dragSource = await waitFor(() =>
      getByText(explorerPanel, 'First Name'),
    );
    await dragAndDrop(
      dragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );

    // check fetch-structure
    const FIRST_NAME_ALIAS = 'First Name';
    expect(
      await waitFor(() => queryByText(tdsProjectionPanel, FIRST_NAME_ALIAS)),
    ).not.toBeNull();

    // edit column name
    const firstNameColumnName = guaranteeNonNullable(
      await waitFor(() => queryByText(tdsProjectionPanel, FIRST_NAME_ALIAS)),
    );
    fireEvent.click(firstNameColumnName);
    const firstNameColumnNameInput = guaranteeNonNullable(
      await waitFor(() =>
        tdsProjectionPanel.querySelector(`input[value="${FIRST_NAME_ALIAS}"]`),
      ),
    );
    fireEvent.change(firstNameColumnNameInput, {
      target: { value: '' },
    });
    fireEvent.blur(firstNameColumnNameInput);

    // check that column name is reset
    expect(
      await waitFor(() => getByText(tdsProjectionPanel, FIRST_NAME_ALIAS)),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    "Query builder doesn't update column name in state until user finishes editing",
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );

    const _personClass = queryBuilderState.graphManagerState.graph.getClass(
      'model::pure::tests::model::simple::Person',
    );

    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });

    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // Drag and drop columns
    const FIRST_NAME_ALIAS = 'First Name';
    const LAST_NAME_ALIAS = 'Last Name';
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    let dragSource = await waitFor(() =>
      getByText(explorerPanel, FIRST_NAME_ALIAS),
    );
    await dragAndDrop(
      dragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    dragSource = await waitFor(() => getByText(explorerPanel, LAST_NAME_ALIAS));
    await dragAndDrop(
      dragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );

    // check fetch-structure
    expect(
      await waitFor(() => queryByText(tdsProjectionPanel, FIRST_NAME_ALIAS)),
    ).not.toBeNull();
    expect(
      await waitFor(() => queryByText(tdsProjectionPanel, LAST_NAME_ALIAS)),
    ).not.toBeNull();

    // edit column name
    const firstNameColumnName = guaranteeNonNullable(
      await waitFor(() => queryByText(tdsProjectionPanel, FIRST_NAME_ALIAS)),
    );
    fireEvent.click(firstNameColumnName);
    const firstNameColumnNameInput = guaranteeNonNullable(
      await waitFor(() =>
        tdsProjectionPanel.querySelector(`input[value="${FIRST_NAME_ALIAS}"]`),
      ),
    );
    fireEvent.change(firstNameColumnNameInput, {
      target: { value: LAST_NAME_ALIAS },
    });

    // check that there is no error
    expect(renderResult.queryByText('1 issue')).toBeNull();

    // finish editing
    fireEvent.blur(firstNameColumnNameInput);

    // check that there is an error
    expect(renderResult.getByText('1 issue')).not.toBeNull();
  },
);

test(integrationTest('Query builder trims column name'), async () => {
  const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
    TEST_DATA__ComplexRelationalModel,
    stub_RawLambda(),
    'model::relational::tests::simpleRelationalMapping',
    'model::MyRuntime',
    TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
  );

  const _personClass = queryBuilderState.graphManagerState.graph.getClass(
    'model::pure::tests::model::simple::Person',
  );

  await act(async () => {
    queryBuilderState.changeClass(_personClass);
  });

  const tdsProjectionPanel = await waitFor(() =>
    renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
    ),
  );
  const explorerPanel = await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
  );

  // Drag and drop column
  const tdsProjectionDropZone = await waitFor(() =>
    getByText(tdsProjectionPanel, 'Add a projection column'),
  );
  const dragSource = await waitFor(() =>
    getByText(explorerPanel, 'First Name'),
  );
  await dragAndDrop(
    dragSource,
    tdsProjectionDropZone,
    tdsProjectionPanel,
    'Add a projection column',
  );

  // check fetch-structure
  const FIRST_NAME_ALIAS = 'First Name';
  expect(
    await waitFor(() => queryByText(tdsProjectionPanel, FIRST_NAME_ALIAS)),
  ).not.toBeNull();

  // edit column name
  const firstNameColumnName = guaranteeNonNullable(
    await waitFor(() => queryByText(tdsProjectionPanel, FIRST_NAME_ALIAS)),
  );
  fireEvent.click(firstNameColumnName);
  const firstNameColumnNameInput = guaranteeNonNullable(
    await waitFor(() =>
      tdsProjectionPanel.querySelector(`input[value="${FIRST_NAME_ALIAS}"]`),
    ),
  );
  fireEvent.change(firstNameColumnNameInput, {
    target: { value: '  Test  ' },
  });
  fireEvent.blur(firstNameColumnNameInput);

  // check that column name is trimmed
  expect(
    await waitFor(() => getByText(tdsProjectionPanel, 'Test')),
  ).not.toBeNull();
  expect(
    guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    ).tdsColumns[0]?.columnName,
  ).toBe('Test');
});

test(
  integrationTest(
    'Query builder allows editing derivation column name upon clicking column name',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );

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
    const treeData = guaranteeNonNullable(
      queryBuilderState.explorerState.treeData,
    );
    const rootNode = guaranteeType(
      treeData.nodes.get(treeData.rootIds[0] as string),
      QueryBuilderExplorerTreeRootNodeData,
    );

    expect(rootNode.mappingData.mapped).toBe(true);

    MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
      readOnly: true,
    });

    // projectionWithDerivation
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__projectionWithDerivation.parameters,
          TEST_DATA__projectionWithDerivation.body,
        ),
      );
    });

    // check fetch-structure
    const projectionCols = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS),
    );
    const FIRST_NAME_WITH_AGE_ALIAS = 'First Name with Age';
    expect(
      await waitFor(() =>
        queryByText(projectionCols, FIRST_NAME_WITH_AGE_ALIAS),
      ),
    ).not.toBeNull();
    const tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    const firstNameWithAgeCol = guaranteeNonNullable(
      tdsState.projectionColumns.find(
        (e) => e.columnName === FIRST_NAME_WITH_AGE_ALIAS,
      ),
    );
    guaranteeType(
      firstNameWithAgeCol,
      QueryBuilderDerivationProjectionColumnState,
    );

    // edit column name
    const firstNameWithAgeColumnName = guaranteeNonNullable(
      await waitFor(() =>
        queryByText(projectionCols, FIRST_NAME_WITH_AGE_ALIAS),
      ),
    );
    fireEvent.click(firstNameWithAgeColumnName);
    const firstNameWithAgeColumnNameInput = guaranteeNonNullable(
      await waitFor(() =>
        projectionCols.querySelector(
          `input[value="${FIRST_NAME_WITH_AGE_ALIAS}"]`,
        ),
      ),
    );
    fireEvent.change(firstNameWithAgeColumnNameInput, {
      target: { value: 'Edited First Name with Age' },
    });
    fireEvent.blur(firstNameWithAgeColumnNameInput);

    // check fetch-structure
    expect(
      await waitFor(() =>
        queryByText(projectionCols, 'Edited First Name with Age'),
      ),
    ).not.toBeNull();
    expect(
      await waitFor(() =>
        tdsState.projectionColumns.find(
          (e) => e.columnName === 'Edited First Name with Age',
        ),
      ),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder resets derivation column name if user edits it and clears the name',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );

    const _personClass = queryBuilderState.graphManagerState.graph.getClass(
      'model::pure::tests::model::simple::Person',
    );

    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });

    const fetchStructurePanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FETCH_STRUCTURE,
      ),
    );

    // Add derivation column
    fireEvent.click(getByTitle(fetchStructurePanel, 'Add a new derivation'));

    // edit column name
    const derivationColumnName = guaranteeNonNullable(
      await waitFor(() => queryByText(fetchStructurePanel, '(derivation)')),
    );
    fireEvent.click(derivationColumnName);
    const derivationColumnNameInput = guaranteeNonNullable(
      await waitFor(() =>
        fetchStructurePanel.querySelector(`input[value="(derivation)"]`),
      ),
    );
    fireEvent.change(derivationColumnNameInput, {
      target: { value: '' },
    });
    fireEvent.blur(derivationColumnNameInput);

    // check that the column name is reset
    expect(
      await waitFor(() => getByText(fetchStructurePanel, '(derivation)')),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder property info tooltip highlights property in explorer when path button is clicked',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );

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
    const treeData = guaranteeNonNullable(
      queryBuilderState.explorerState.treeData,
    );
    const rootNode = guaranteeType(
      treeData.nodes.get(treeData.rootIds[0] as string),
      QueryBuilderExplorerTreeRootNodeData,
    );

    expect(rootNode.mappingData.mapped).toBe(true);

    // simpleProjection
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__simpleProjection.parameters,
          TEST_DATA__simpleProjection.body,
        ),
      );
    });

    // collapse explorer tree
    const LAST_NAME_ALIAS = 'Last Name';
    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );
    expect(
      await waitFor(() => queryByText(explorerPanel, LAST_NAME_ALIAS)),
    ).not.toBeNull();
    const explorerPanelPersonNode = guaranteeNonNullable(
      await waitFor(() => queryByText(explorerPanel, 'Person')),
    );
    fireEvent.click(explorerPanelPersonNode);
    expect(
      await waitFor(() => queryByText(explorerPanel, LAST_NAME_ALIAS)),
    ).toBeNull();

    // show tooltip
    const MOCK__ScrollIntoView = createMock();
    window.HTMLElement.prototype.scrollIntoView = MOCK__ScrollIntoView;
    const projectionCols = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS,
    );
    const lastNameExpressionInfoTooltipIcon = guaranteeNonNullable(
      await waitFor(
        () =>
          queryByText(projectionCols, LAST_NAME_ALIAS)?.closest(
            '.query-builder__projection__column__value',
          )?.previousElementSibling?.firstChild,
      ),
    );
    fireEvent.click(lastNameExpressionInfoTooltipIcon);
    const tooltip = await renderResult.findByRole('tooltip');
    const pathShowInTreeButton = guaranteeNonNullable(
      await waitFor(() =>
        queryByText(tooltip, 'Path')?.parentElement?.querySelector('button'),
      ),
    );
    fireEvent.click(pathShowInTreeButton);

    // check that explorer node is highlighted
    expect(
      await waitFor(() => queryByText(explorerPanel, LAST_NAME_ALIAS)),
    ).not.toBeNull();
    expect(
      await waitFor(
        () =>
          queryByText(explorerPanel, LAST_NAME_ALIAS)?.parentElement?.classList,
      ),
    ).toContain('query-builder-explorer-tree__node__label--highlight');
    expect(MOCK__ScrollIntoView).toHaveBeenCalledTimes(1);
  },
);

test(
  integrationTest('Query builder loads simple projection query when we DnD it'),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );
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
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    const projectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );

    // Drag and drop to the projection panel
    const dropZone = await waitFor(() =>
      getByText(projectionPanel, 'Add a projection column'),
    );
    const dragSource = await waitFor(() => getByText(explorerPanel, 'Age'));
    await dragAndDrop(
      dragSource,
      dropZone,
      projectionPanel,
      'Add a projection column',
    );
    await waitFor(() => getByText(projectionPanel, 'Age'));
    const tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    expect(tdsState.projectionColumns.length).toBe(1);
    const LAST_NAME_ALIAS = 'Last Name';
    const lastNameNode = await waitFor(() =>
      getByText(explorerPanel, LAST_NAME_ALIAS),
    );
    await dragAndDrop(
      lastNameNode,
      dropZone,
      projectionPanel,
      'Add a projection column',
    );
    await waitFor(() => getByText(projectionPanel, LAST_NAME_ALIAS));
    expect(tdsState.projectionColumns.length).toBe(2);
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with subtype',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA_SimpleSubtypeModel,
      stub_RawLambda(),
      'model::NewMapping',
      'model::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
    );
    const _legalEntityClass =
      queryBuilderState.graphManagerState.graph.getClass('model::LegalEntity');
    await act(async () => {
      queryBuilderState.changeClass(_legalEntityClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'LegalEntity'));
    await waitFor(() => getAllByText(queryBuilderSetup, 'NewMapping'));

    // check subclass display in the explorer tree
    const treeData = guaranteeNonNullable(
      queryBuilderState.explorerState.treeData,
    );
    const rootNode = guaranteeType(
      treeData.nodes.get(treeData.rootIds[0] as string),
      QueryBuilderExplorerTreeRootNodeData,
    );
    expect(rootNode.mappingData.mapped).toBe(true);
    const subTypeNodes = [...treeData.nodes.values()].filter(
      (node) => node instanceof QueryBuilderExplorerTreeSubTypeNodeData,
    );
    expect(subTypeNodes.length).toBe(1);
    expect(guaranteeNonNullable(subTypeNodes[0]).mappingData.mapped).toBe(true);
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );
    await waitFor(() => getByText(explorerPanel, '@Firm'));

    //check that you can add properties to fetch structure for sub-class
    fireEvent.click(getByText(explorerPanel, '@Firm'));
    await waitFor(() => getByText(explorerPanel, 'Employees'));
    const subNodeElement = getByText(explorerPanel, 'Employees');
    fireEvent.contextMenu(subNodeElement);
    fireEvent.click(
      renderResult.getByText('Add Properties to Fetch Structure'),
    );
    const tdsStateOne = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    expect(tdsStateOne.projectionColumns.length).toBe(2);

    //check that you can add properties to fetch structure for root class
    fireEvent.click(getByText(explorerPanel, 'LegalEntity'));
    await waitFor(() => getByText(explorerPanel, 'LegalEntity'));
    const rootNodeElement = getByText(explorerPanel, 'LegalEntity');
    fireEvent.contextMenu(rootNodeElement);
    fireEvent.click(
      renderResult.getByText('Add Properties to Fetch Structure'),
    );
    expect(tdsStateOne.projectionColumns.length).toBe(3);
    expect(tdsStateOne.projectionColumns[2]?.columnName).toBe('Name');

    //check that you do not add properties that already exist
    fireEvent.click(getByText(explorerPanel, 'LegalEntity'));
    await waitFor(() => getByText(explorerPanel, 'LegalEntity'));
    const rootNodeElementTwo = getByText(explorerPanel, 'LegalEntity');
    fireEvent.contextMenu(rootNodeElementTwo);
    fireEvent.click(
      renderResult.getByText('Add Properties to Fetch Structure'),
    );
    expect(tdsStateOne.projectionColumns.length).toBe(3);

    // simpleProjection with subType
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithSubtypeFromSubtypeModel.parameters,
          TEST_DATA__simpleProjectionWithSubtypeFromSubtypeModel.body,
        ),
      );
    });

    // check fetch-structure
    const tdsStateTwo = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    expect(tdsStateTwo.projectionColumns.length).toBe(1);
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a graph-fetch lambda',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexM2MModel,
      stub_RawLambda(),
      'model::MyMapping',
      'model::MyRuntime',
    );

    const _personClass = queryBuilderState.graphManagerState.graph.getClass(
      'model::target::NPerson',
    );
    const _firmClass = queryBuilderState.graphManagerState.graph.getClass(
      'model::target::NFirm',
    );

    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'NPerson'));
    await waitFor(() => getByText(queryBuilderSetup, 'MyMapping'));

    // simple graph fetch
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__simpleGraphFetch.parameters,
          TEST_DATA__simpleGraphFetch.body,
        ),
      );
    });

    // switch to complex graph fetch
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__complexGraphFetch.parameters,
          TEST_DATA__complexGraphFetch.body,
        ),
      );
    });
    const graphFetchTreeState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderGraphFetchTreeState,
    );

    // check fetch-structure
    const firmGraphFetchTree = guaranteeNonNullable(
      graphFetchTreeState.treeData,
    );
    const firmGraphFetchTreeNode = firmGraphFetchTree.tree;
    expect(firmGraphFetchTreeNode.class.value).toBe(_firmClass);
  },
);

test(integrationTest('Query builder query cancellation'), async () => {
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
  });

  await waitFor(() => renderResult.getByText('Run Query'));
  fireEvent.click(renderResult.getByText('Run Query'));
  // NOTE: this could potentially be a flaky since if things happen too fast, the `Stop` button might not show up at all
  // we'd probably should mock the execution call to have better control
  fireEvent.click(await waitFor(() => renderResult.getByText('Stop')));
  await waitFor(() => renderResult.getByText('Run Query'));
});

test(
  integrationTest(
    'Query builder state is properly set after creating a projection query with subType when propery mapping points to class mapping of subType',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA_SimpleSubtypeModel,
      stub_RawLambda(),
      'model::NewMapping',
      'model::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
    );
    const _personClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Person');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Person'));

    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    //Add properties to fetch-structure
    const element = await waitFor(() => getByText(explorerPanel, 'Address'));
    fireEvent.contextMenu(element);
    fireEvent.click(
      renderResult.getByText('Add Properties to Fetch Structure'),
    );
    const tdsStateOne = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    expect(tdsStateOne.projectionColumns.length).toBe(3);
    const fetchStructure = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS),
    );
    await waitFor(() => getByText(fetchStructure, 'Address/@(Colony)Id'));
    await waitFor(() =>
      getByText(fetchStructure, 'Address/@(Colony)Street Name'),
    );
    await waitFor(() => getByText(fetchStructure, 'Address/@(Colony)Zipcode'));

    expect(
      queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
        queryBuilderState.buildQuery(),
      ),
    ).toStrictEqual(TEST_DATA__simpleProjectWithSubtype);
  },
);

test(
  integrationTest(
    'Query builder state is properly set after creating a projection query with subType when deep-level ( > 1 layer) propery mapping points to class mapping of subType',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA_SimpleSubtypeModel,
      stub_RawLambda(),
      'model::NewMapping',
      'model::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
    );
    const _firmClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_firmClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Firm'));

    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );
    //Add properties to fetch-structure
    fireEvent.click(getByText(explorerPanel, 'Employees'));
    const element = await waitFor(() => getByText(explorerPanel, 'Address'));
    fireEvent.contextMenu(element);
    fireEvent.click(
      renderResult.getByText('Add Properties to Fetch Structure'),
    );
    const tdsStateOne = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    expect(tdsStateOne.projectionColumns.length).toBe(3);
    const fetchStructure = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS),
    );
    await waitFor(() =>
      getByText(fetchStructure, 'Employees/Address/@(Colony)Id'),
    );
    await waitFor(() =>
      getByText(fetchStructure, 'Employees/Address/@(Colony)Street Name'),
    );
    await waitFor(() =>
      getByText(fetchStructure, 'Employees/Address/@(Colony)Zipcode'),
    );

    act(() => {
      expect(
        queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
          queryBuilderState.buildQuery(),
        ),
      ).toStrictEqual(TEST_DATA__simpleProjectionWithSubtypesInDeepLevel);
    });
  },
);

test(
  integrationTest(
    'Query builder state is properly set after creating a graph fetch query with subType when propery mapping points to class mapping of subType',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA_SimpleSubtypeModel,
      stub_RawLambda(),
      'model::NewMapping',
      'model::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
    );
    const _personClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Person');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Person'));

    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    await act(async () => {
      queryBuilderState.fetchStructureState.changeImplementation(
        FETCH_STRUCTURE_IMPLEMENTATION.GRAPH_FETCH,
      );
    });

    //Add properties to fetch-structure
    const element = await waitFor(() => getByText(explorerPanel, 'Address'));
    fireEvent.contextMenu(element);
    fireEvent.click(
      renderResult.getByText('Add Properties to Fetch Structure'),
    );
    const fetchStructure = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_GRAPH_FETCH),
    );
    await waitFor(() => getByText(fetchStructure, 'Colony'));
    await waitFor(() => getByText(fetchStructure, 'id'));
    await waitFor(() => getByText(fetchStructure, 'streetName'));
    await waitFor(() => getByText(fetchStructure, 'zipcode'));

    expect(
      queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
        queryBuilderState.buildQuery(),
      ),
    ).toStrictEqual(TEST_DATA__simpleGraphFetchWithSubtype);
  },
);

test(
  integrationTest(
    "Query builder doesn't show 'No Projection Columns' message when first opened",
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
      queryBuilderState.initializeWithQuery(create_RawLambda([], []));
    });
    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );

    // Verify no columns in fetch structure
    const tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    expect(tdsState.projectionColumns).toHaveLength(0);
    // Verify no error message is shown
    expect(renderResult.queryByText('1 issue')).toBeNull();
  },
);

test(
  integrationTest(
    "Query builder shows 'No Projection Columns' message when fetch structure is empty and undo is still possible",
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );
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
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    const projectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );

    // Drag and drop to the projection panel
    const dropZone = await waitFor(() =>
      getByText(projectionPanel, 'Add a projection column'),
    );
    const dragSource = await waitFor(() => getByText(explorerPanel, 'Age'));
    await dragAndDrop(
      dragSource,
      dropZone,
      projectionPanel,
      'Add a projection column',
    );

    // Verify column is present and no error message
    expect(
      await waitFor(() => getByText(projectionPanel, 'Age')),
    ).not.toBeNull();
    expect(renderResult.queryByText('1 issue')).toBeNull();

    // Delete the column
    fireEvent.click(renderResult.getByRole('button', { name: 'Remove' }));

    // Verify no column and error message
    expect(await waitFor(() => queryByText(projectionPanel, 'Age'))).toBeNull();
    expect(renderResult.getByText('1 issue')).not.toBeNull();

    // Drag and drop to the projection panel again
    await dragAndDrop(
      dragSource,
      dropZone,
      projectionPanel,
      'Add a projection column',
    );
    await waitFor(() => getByText(projectionPanel, 'Age'));

    // Verify column is present and no error message
    expect(
      await waitFor(() => getByText(projectionPanel, 'Age')),
    ).not.toBeNull();
    expect(renderResult.queryByText('1 issue')).toBeNull();

    // Delete the column
    fireEvent.click(renderResult.getByRole('button', { name: 'Remove' }));

    // Verify no column and error message
    expect(await waitFor(() => queryByText(projectionPanel, 'Age'))).toBeNull();
    expect(renderResult.getByText('1 issue')).not.toBeNull();

    // Click undo and check column is present and no error message
    fireEvent.click(renderResult.getByText('Undo'));
    expect(
      await waitFor(() => getByText(projectionPanel, 'Age')),
    ).not.toBeNull();
    expect(renderResult.queryByText('1 issue')).toBeNull();

    // Click undo and check no column and error message
    fireEvent.click(renderResult.getByText('Undo'));
    expect(await waitFor(() => queryByText(projectionPanel, 'Age'))).toBeNull();
    expect(renderResult.getByText('1 issue')).not.toBeNull();

    // Click undo and check column is present and no error message
    fireEvent.click(renderResult.getByText('Undo'));
    expect(
      await waitFor(() => getByText(projectionPanel, 'Age')),
    ).not.toBeNull();
    expect(renderResult.queryByText('1 issue')).toBeNull();

    // Click undo last possible time and check no column and no error message
    fireEvent.click(renderResult.getByText('Undo'));
    expect(await waitFor(() => queryByText(projectionPanel, 'Age'))).toBeNull();
    expect(renderResult.queryByText('1 issue')).toBeNull();
  },
);

test(
  integrationTest(
    'Query builder derived property required parameter is null when added to fetch structure',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );

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

    // Drag and drop derived property into fetch structure panel
    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    const dragSource = await waitFor(() =>
      getByText(explorerPanel, 'Name With Title'),
    );
    await dragAndDrop(
      dragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );

    // Check for validation issue
    expect(
      await waitFor(() => renderResult.getByText('1 issue')),
    ).not.toBeNull();
    expect(
      guaranteeNonNullable(renderResult.getByText('1 issue').parentElement)
        .title,
    ).toContain(
      'Derived property parameter value for Name With Title is missing',
    );
    expect(
      await renderResult.findByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);

    // Set parameter value
    fireEvent.click(
      renderResult.getByTitle('Set Derived Property Argument(s)...'),
    );
    let dpModal = await waitFor(() => renderResult.getByRole('dialog'));
    await waitFor(() => getByText(dpModal, 'Derived Property'));
    await waitFor(() => getByText(dpModal, 'Name With Title'));
    await waitFor(() => getByText(dpModal, 'title'));
    const valueInput = guaranteeNonNullable(dpModal.querySelector('input'));
    fireEvent.change(valueInput, {
      target: { value: 'Mr.' },
    });
    fireEvent.click(getByRole(dpModal, 'button', { name: 'Done' }));
    await waitForElementToBeRemoved(() =>
      renderResult.getByText('Derived Property'),
    );

    // Check for no validation issue
    expect(await waitFor(() => renderResult.queryByText('1 issue'))).toBeNull();
    expect(
      await renderResult.findByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);

    // Reset parameter value
    fireEvent.click(
      renderResult.getByTitle('Set Derived Property Argument(s)...'),
    );
    dpModal = await waitFor(() => renderResult.getByRole('dialog'));
    await waitFor(() => getByText(dpModal, 'Derived Property'));
    await waitFor(() => getByText(dpModal, 'Name With Title'));
    await waitFor(() => getByText(dpModal, 'title'));
    fireEvent.click(renderResult.getByRole('button', { name: 'Reset' }));
    fireEvent.click(getByRole(dpModal, 'button', { name: 'Done' }));
    await waitForElementToBeRemoved(() =>
      renderResult.getByText('Derived Property'),
    );

    // Check for validation issue
    expect(
      await waitFor(() => renderResult.getByText('1 issue')),
    ).not.toBeNull();
    expect(
      guaranteeNonNullable(renderResult.getByText('1 issue').parentElement)
        .title,
    ).toContain(
      'Derived property parameter value for Name With Title is missing',
    );
    expect(
      await renderResult.findByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);
  },
);

test(
  integrationTest(
    'Query builder derived property optional parameter is valid and has default value when added to fetch structure',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );

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

    // Drag and drop derived property into fetch structure panel
    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    const dragSource = await waitFor(() =>
      getByText(explorerPanel, 'Name With Prefix And Suffix'),
    );
    await dragAndDrop(
      dragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );

    // Check for no validation issue
    expect(await waitFor(() => renderResult.queryByText('1 issue'))).toBeNull();
    expect(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Run Query' }),
      ),
    ).toHaveProperty('disabled', false);

    // Check that the derived property has the default value (empty string)
    fireEvent.click(
      renderResult.getByTitle('Set Derived Property Argument(s)...'),
    );
    const dpModal = await waitFor(() => renderResult.getByRole('dialog'));
    await waitFor(() => getByText(dpModal, 'Derived Property'));
    await waitFor(() => getByText(dpModal, 'Name With Prefix And Suffix'));
    await waitFor(() => getByText(dpModal, 'prefix'));
    await waitFor(() => getByText(dpModal, 'suffixes'));
    expect(
      await waitFor(() => getAllByPlaceholderText(dpModal, '(empty)')),
    ).toHaveLength(2);
  },
);

test(
  integrationTest('Query builder percentile operator is correctly loaded'),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );
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
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    const projectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );

    // Drag and drop to the projection panel
    const dropZone = await waitFor(() =>
      getByText(projectionPanel, 'Add a projection column'),
    );
    const dragSource = await waitFor(() => getByText(explorerPanel, 'Age'));
    await dragAndDrop(
      dragSource,
      dropZone,
      projectionPanel,
      'Add a projection column',
    );
    await waitFor(() => getByText(projectionPanel, 'Age'));
    const tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    expect(tdsState.projectionColumns.length).toBe(1);
    fireEvent.click(renderResult.getByTitle('Choose Aggregate Operator...'));
    fireEvent.click(renderResult.getByText('percentile'));
    expect(getByText(projectionPanel, 'percentile')).not.toBeNull();
    expect(getByText(projectionPanel, '...')).not.toBeNull();
    fireEvent.click(renderResult.getByText('...'));

    const percentilePanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PERCENTILE_PANEL,
    );
    const percentileInput = percentilePanel.getElementsByClassName(
      'query-builder__projection__column__aggregate__operator__percentile__input',
    )[0];
    expect(percentileInput).toBeDefined();
    await waitFor(() =>
      fireEvent.change(guaranteeNonNullable(percentileInput), {
        target: { value: '50' },
      }),
    );
    await waitFor(() => getByText(projectionPanel, '50'));
  },
);
