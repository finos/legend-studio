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

/// <reference types="jest-extended" />
import { fireEvent, getByTitle, getByText } from '@testing-library/react';
import {
  TEST_DATA__simpleProjection,
  TEST_DATA__projectionWithChainedProperty,
  TEST_DATA__projectionWithResultSetModifiers,
  TEST_DATA__getAllWithGroupedFilter,
  TEST_DATA__getAllWithOneConditionFilter,
  TEST_DATA__projectWithDerivedProperty,
  TEST_DATA__complexGraphFetch,
  TEST_DATA__simpleGraphFetch,
} from './QueryBuilder_TestData';
import TEST_DATA__ComplexRelationalModel from './TEST_DATA__QueryBuilder_Model_ComplexRelational.json';
import TEST_DATA__ComplexM2MModel from './TEST_DATA__QueryBuilder_Model_ComplexM2M.json';
import {
  integrationTest,
  guaranteeNonNullable,
  guaranteeType,
  MOBX__enableSpyOrMock,
  MOBX__disableSpyOrMock,
} from '@finos/legend-shared';
import { getAllByText, waitFor } from '@testing-library/dom';
import { TEST__setUpEditorWithDefaultSDLCData } from '@finos/legend-studio';
import { flowResult } from 'mobx';
import { TEST__buildQueryBuilderMockedEditorStore } from './QueryBuilder_TestUtils';

import {
  QueryBuilderExplorerTreeRootNodeData,
  FETCH_STRUCTURE_MODE,
  QUERY_BUILDER_TEST_ID,
  COLUMN_SORT_TYPE,
  QueryBuilderSimpleProjectionColumnState,
} from '@finos/legend-query';
import {
  AbstractPropertyExpression,
  getRootSetImplementation,
  RawLambda,
} from '@finos/legend-graph';
import { QueryBuilder_EditorExtensionState } from '../../stores/QueryBuilder_EditorExtensionState';

const getRawLambda = (jsonRawLambda: {
  parameters?: object;
  body?: object;
}): RawLambda => new RawLambda(jsonRawLambda.parameters, jsonRawLambda.body);

test(
  integrationTest(
    'Query builder state is properly set after processing a projection lambda',
  ),
  async () => {
    const mockedEditorStore = TEST__buildQueryBuilderMockedEditorStore();
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      mockedEditorStore,
      {
        entities: TEST_DATA__ComplexRelationalModel,
      },
    );

    const _personClass = mockedEditorStore.graphManagerState.graph.getClass(
      'model::pure::tests::model::simple::Person',
    );
    const _firmClass = mockedEditorStore.graphManagerState.graph.getClass(
      'model::pure::tests::model::simple::Firm',
    );

    MOBX__enableSpyOrMock();
    mockedEditorStore.graphState.globalCompileInFormMode = jest.fn();
    MOBX__disableSpyOrMock();

    const queryBuilderExtension = mockedEditorStore.getEditorExtensionState(
      QueryBuilder_EditorExtensionState,
    );
    await flowResult(queryBuilderExtension.setOpenQueryBuilder(true));
    queryBuilderExtension.queryBuilderState.querySetupState.setClass(
      _personClass,
    );
    queryBuilderExtension.queryBuilderState.resetData();
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person'));
    await waitFor(() =>
      getByText(queryBuilderSetup, 'simpleRelationalMapping'),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'MyRuntime'));
    const treeData = guaranteeNonNullable(
      queryBuilderExtension.queryBuilderState.explorerState.treeData,
    );
    const rootNode = guaranteeType(
      treeData.nodes.get(treeData.rootIds[0]),
      QueryBuilderExplorerTreeRootNodeData,
    );
    const mapping = mockedEditorStore.graphManagerState.graph.getMapping(
      'model::relational::tests::simpleRelationalMapping',
    );
    expect(getRootSetImplementation(mapping, _personClass)).toBe(
      rootNode.setImpl,
    );
    expect(rootNode.mapped).toBe(true);

    // simpleProjection
    queryBuilderExtension.queryBuilderState.initialize(
      getRawLambda(TEST_DATA__simpleProjection),
    );
    let projectionCols = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROJECTION),
    );
    const FIRST_NAME_ALIAS = 'Edited First Name';
    const LAST_NAME_ALIAS = 'Last Name';
    expect(
      await waitFor(() =>
        projectionCols.querySelector(`input[value="${FIRST_NAME_ALIAS}"]`),
      ),
    ).not.toBeNull();
    expect(
      await waitFor(() =>
        projectionCols.querySelector(`input[value="${LAST_NAME_ALIAS}"]`),
      ),
    ).not.toBeNull();
    expect(
      queryBuilderExtension.queryBuilderState.fetchStructureState
        .projectionState.columns.length,
    ).toBe(2);
    let fistNameCol = guaranteeNonNullable(
      queryBuilderExtension.queryBuilderState.fetchStructureState.projectionState.columns.find(
        (e) => e.columnName === FIRST_NAME_ALIAS,
      ),
    );
    const firstNameProperty = guaranteeType(
      fistNameCol,
      QueryBuilderSimpleProjectionColumnState,
    ).propertyExpressionState.propertyExpression.func;
    expect(firstNameProperty).toBe(_personClass.getProperty('firstName'));
    const lastNameCol = guaranteeNonNullable(
      queryBuilderExtension.queryBuilderState.fetchStructureState.projectionState.columns.find(
        (e) => e.columnName === LAST_NAME_ALIAS,
      ),
    );
    const lastNameProperty = guaranteeType(
      lastNameCol,
      QueryBuilderSimpleProjectionColumnState,
    ).propertyExpressionState.propertyExpression.func;
    expect(lastNameProperty).toBe(_personClass.getProperty('lastName'));
    expect(
      queryBuilderExtension.queryBuilderState.resultSetModifierState.limit,
    ).toBeUndefined();

    // chainedProperty
    const CHAINED_PROPERTY_ALIAS = 'Firm/Legal Name';
    queryBuilderExtension.queryBuilderState.initialize(
      getRawLambda(TEST_DATA__projectionWithChainedProperty),
    );
    const projectionWithChainedPropertyCols = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROJECTION),
    );
    expect(
      await waitFor(() =>
        projectionWithChainedPropertyCols.querySelector(
          `input[value="${CHAINED_PROPERTY_ALIAS}"]`,
        ),
      ),
    ).not.toBeNull();
    expect(
      queryBuilderExtension.queryBuilderState.fetchStructureState
        .projectionState.columns.length,
    ).toBe(1);
    let legalNameCol = guaranteeNonNullable(
      queryBuilderExtension.queryBuilderState.fetchStructureState.projectionState.columns.find(
        (e) => e.columnName === CHAINED_PROPERTY_ALIAS,
      ),
    );
    const legalNameColProperty = guaranteeType(
      legalNameCol,
      QueryBuilderSimpleProjectionColumnState,
    ).propertyExpressionState.propertyExpression.func;
    expect(legalNameColProperty).toBe(_firmClass.getProperty('legalName'));
    const _firmPropertyExpression = guaranteeType(
      guaranteeType(legalNameCol, QueryBuilderSimpleProjectionColumnState)
        .propertyExpressionState.propertyExpression.parametersValues[0],
      AbstractPropertyExpression,
    );
    expect(_firmPropertyExpression.func).toBe(_personClass.getProperty('firm'));
    expect(
      queryBuilderExtension.queryBuilderState.resultSetModifierState.limit,
    ).toBeUndefined();

    // result set modifiers
    const RESULT_LIMIT = 500;
    queryBuilderExtension.queryBuilderState.initialize(
      getRawLambda(TEST_DATA__projectionWithResultSetModifiers),
    );
    projectionCols = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROJECTION),
    );
    expect(
      await waitFor(() =>
        projectionCols.querySelector(`input[value="${FIRST_NAME_ALIAS}"]`),
      ),
    ).not.toBeNull();
    expect(
      await waitFor(() =>
        projectionCols.querySelector(`input[value="${LAST_NAME_ALIAS}"]`),
      ),
    ).not.toBeNull();
    expect(
      await waitFor(() =>
        projectionCols.querySelector(
          `input[value="${CHAINED_PROPERTY_ALIAS}"]`,
        ),
      ),
    ).not.toBeNull();
    expect(
      queryBuilderExtension.queryBuilderState.fetchStructureState
        .projectionState.columns.length,
    ).toBe(3);
    const resultSetModifierState =
      queryBuilderExtension.queryBuilderState.resultSetModifierState;
    expect(resultSetModifierState.limit).toBe(RESULT_LIMIT);
    expect(resultSetModifierState.distinct).toBe(true);
    expect(resultSetModifierState.sortColumns).toHaveLength(2);
    fistNameCol = guaranteeNonNullable(
      queryBuilderExtension.queryBuilderState.fetchStructureState.projectionState.columns.find(
        (e) => e.columnName === FIRST_NAME_ALIAS,
      ),
    );
    legalNameCol = guaranteeNonNullable(
      queryBuilderExtension.queryBuilderState.fetchStructureState.projectionState.columns.find(
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
    fireEvent.click(
      getByTitle(queryBuilder, 'Configure result set modifiers...'),
    );
    const modal = await waitFor(() => renderResult.getByRole('dialog'));
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
    fireEvent.click(getByText(modal, 'Close'));

    // filter with simple condition
    await waitFor(() => renderResult.getByText('Add a filter condition'));
    queryBuilderExtension.queryBuilderState.initialize(
      getRawLambda(TEST_DATA__getAllWithOneConditionFilter),
    );
    let filterValue = 'testFirstName';
    let filterPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER),
    );
    expect(
      await waitFor(() =>
        filterPanel.querySelector(`input[value="${filterValue}"]`),
      ),
    ).not.toBeNull();
    await waitFor(() => getByText(filterPanel, 'First Name'));
    await waitFor(() => getByText(filterPanel, 'is'));
    const filterState = queryBuilderExtension.queryBuilderState.filterState;
    expect(filterState.nodes.size).toBe(1);
    expect(
      queryBuilderExtension.queryBuilderState.fetchStructureState
        .projectionState.columns.length,
    ).toBe(0);

    // filter with group condition
    queryBuilderExtension.queryBuilderState.resetData();
    await waitFor(() => renderResult.getByText('Add a filter condition'));
    queryBuilderExtension.queryBuilderState.initialize(
      getRawLambda(TEST_DATA__getAllWithGroupedFilter),
    );
    filterPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER),
    );
    await waitFor(() =>
      expect(getAllByText(filterPanel, 'is')).toHaveLength(2),
    );
    await waitFor(() => getByText(filterPanel, 'or'));
    filterValue = 'lastNameTest';
    expect(
      await waitFor(() =>
        filterPanel.querySelector(`input[value="${filterValue}"]`),
      ),
    ).not.toBeNull();
    await waitFor(() => getByText(filterPanel, 'First Name'));
    const lastNameFilterValue = 'lastNameTest';
    expect(
      await waitFor(() =>
        filterPanel.querySelector(`input[value="${lastNameFilterValue}"]`),
      ),
    ).not.toBeNull();
    await waitFor(() => getByText(filterPanel, 'Last Name'));
    expect(queryBuilderExtension.queryBuilderState.filterState.nodes.size).toBe(
      3,
    );
    expect(
      queryBuilderExtension.queryBuilderState.fetchStructureState
        .projectionState.columns.length,
    ).toBe(0);

    // projection column with derived property
    queryBuilderExtension.queryBuilderState.resetData();
    await waitFor(() => renderResult.getByText('Add a filter condition'));
    queryBuilderExtension.queryBuilderState.initialize(
      getRawLambda(TEST_DATA__projectWithDerivedProperty),
    );
    projectionCols = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROJECTION),
    );
    expect(
      await waitFor(() =>
        projectionCols.querySelector(`input[value="Full Name With Title"]`),
      ),
    ).not.toBeNull();
    await waitFor(() => getByText(projectionCols, 'Name With Title'));
    expect(
      queryBuilderExtension.queryBuilderState.fetchStructureState
        .projectionState.columns.length,
    ).toBe(1);
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
    'Query builder state is properly set after processing a graph-fetch lambda',
  ),
  async () => {
    const mockedEditorStore = TEST__buildQueryBuilderMockedEditorStore();
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      mockedEditorStore,
      {
        entities: TEST_DATA__ComplexM2MModel,
      },
    );
    const _personClass = mockedEditorStore.graphManagerState.graph.getClass(
      'model::target::NPerson',
    );
    const _firmClass = mockedEditorStore.graphManagerState.graph.getClass(
      'model::target::NFirm',
    );

    MOBX__enableSpyOrMock();
    mockedEditorStore.graphState.globalCompileInFormMode = jest.fn();
    MOBX__disableSpyOrMock();

    const queryBuilderExtension = mockedEditorStore.getEditorExtensionState(
      QueryBuilder_EditorExtensionState,
    );
    await flowResult(queryBuilderExtension.setOpenQueryBuilder(true));
    queryBuilderExtension.queryBuilderState.querySetupState.setClass(
      _personClass,
    );
    queryBuilderExtension.queryBuilderState.resetData();
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'NPerson'));
    await waitFor(() => getByText(queryBuilderSetup, 'MyMapping'));

    // simple graph fetch
    queryBuilderExtension.queryBuilderState.initialize(
      getRawLambda(TEST_DATA__simpleGraphFetch),
    );
    expect(
      queryBuilderExtension.queryBuilderState.fetchStructureState
        .fetchStructureMode,
    ).toBe(FETCH_STRUCTURE_MODE.GRAPH_FETCH);
    queryBuilderExtension.queryBuilderState.initialize(
      getRawLambda(TEST_DATA__complexGraphFetch),
    );
    expect(
      queryBuilderExtension.queryBuilderState.fetchStructureState
        .fetchStructureMode,
    ).toBe(FETCH_STRUCTURE_MODE.GRAPH_FETCH);
    const firmGraphFetchTree = guaranteeNonNullable(
      queryBuilderExtension.queryBuilderState.fetchStructureState
        .graphFetchTreeState.treeData,
    );
    const firmGraphFetchTreeNode = firmGraphFetchTree.tree;
    expect(firmGraphFetchTreeNode.class.value).toBe(_firmClass);
  },
  // TODO: add more test when we rework the graph fetch tree
);
