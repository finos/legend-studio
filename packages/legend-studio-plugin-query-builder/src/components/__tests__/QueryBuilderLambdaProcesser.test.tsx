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
  simpleProjection,
  projectionWithChainedProperty,
  projectionWithResultSetModifiers,
  getAllWithGroupedFilter,
  getAllWithOneConditionFilter,
  unSupportedGetAllWithOneConditionFilter,
  errorInGraphLambda,
  unSupportedFunctionName,
  projectWithDerivedProperty,
  firmPersonGraphFetch,
  simpleGraphFetch,
} from './QueryBuilder_TestData';
import ComplexRelationalModel from './QueryBuilder_Model_ComplexRelational.json';
import ComplexM2MModel from './QueryBuilder_Model_ComplexM2M.json';
import {
  integrationTest,
  guaranteeNonNullable,
  guaranteeType,
  MOBX__enableSpyOrMock,
  MOBX__disableSpyOrMock,
} from '@finos/legend-studio-shared';
import { getAllByText, waitFor } from '@testing-library/dom';
import { QueryBuilderExplorerTreeRootNodeData } from '../../stores/QueryBuilderExplorerState';
import { COLUMN_SORT_TYPE } from '../../stores/QueryResultSetModifierState';
import { FETCH_STRUCTURE_MODE } from '../../stores/QueryBuilderFetchStructureState';
import {
  AbstractPropertyExpression,
  RawLambda,
  setUpEditorWithDefaultSDLCData,
} from '@finos/legend-studio';
import { QUERY_BUILDER_TEST_ID } from '../../QueryBuilder_Constants';
import { QueryBuilderState } from '../../stores/QueryBuilderState';
import { flowResult } from 'mobx';
import { buildQueryBuilderMockedEditorStore } from './QueryBuilder_TestUtils';

const getRawLambda = (jsonRawLambda: {
  parameters?: object;
  body?: object;
}): RawLambda => new RawLambda(jsonRawLambda.parameters, jsonRawLambda.body);

test(
  integrationTest(
    'Query builder state is properly set after processing a projection lambda',
  ),
  async () => {
    const mockedEditorStore = buildQueryBuilderMockedEditorStore();
    const renderResult = await setUpEditorWithDefaultSDLCData(
      mockedEditorStore,
      {
        entities: ComplexRelationalModel,
      },
    );
    const _personClass = mockedEditorStore.graphState.graph.getClass(
      'model::pure::tests::model::simple::Person',
    );
    const _firmClass = mockedEditorStore.graphState.graph.getClass(
      'model::pure::tests::model::simple::Firm',
    );
    MOBX__enableSpyOrMock();
    mockedEditorStore.graphState.globalCompileInFormMode = jest.fn();
    MOBX__disableSpyOrMock();
    const queryBuilderState =
      mockedEditorStore.getEditorExtensionState(QueryBuilderState);
    await flowResult(queryBuilderState.setOpenQueryBuilder(true));
    queryBuilderState.querySetupState.setClass(_personClass);
    queryBuilderState.resetData();
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
      treeData.nodes.get(treeData.rootIds[0]),
      QueryBuilderExplorerTreeRootNodeData,
    );
    const mapping = mockedEditorStore.graphState.graph.getMapping(
      'model::relational::tests::simpleRelationalMapping',
    );
    expect(mapping.getRootSetImplementation(_personClass)).toBe(
      rootNode.setImpl,
    );
    expect(rootNode.mapped).toBe(true);
    // simpleProjection
    queryBuilderState.initWithRawLambda(getRawLambda(simpleProjection));
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
    expect(queryBuilderState.fetchStructureState.projectionColumns.length).toBe(
      2,
    );
    let fistNameCol = guaranteeNonNullable(
      queryBuilderState.fetchStructureState.projectionColumns.find(
        (e) => e.columnName === FIRST_NAME_ALIAS,
      ),
    );
    const firstNameProperty =
      fistNameCol.propertyEditorState.propertyExpression.func;
    expect(firstNameProperty).toBe(_personClass.getProperty('firstName'));
    const lastNameCol = guaranteeNonNullable(
      queryBuilderState.fetchStructureState.projectionColumns.find(
        (e) => e.columnName === LAST_NAME_ALIAS,
      ),
    );
    const lastNameProperty =
      lastNameCol.propertyEditorState.propertyExpression.func;
    expect(lastNameProperty).toBe(_personClass.getProperty('lastName'));
    expect(queryBuilderState.resultSetModifierState.limit).toBeUndefined();
    // chainedProperty
    const CHAINED_PROPERTY_ALIAS = 'Firm/Legal Name';
    queryBuilderState.initWithRawLambda(
      getRawLambda(projectionWithChainedProperty),
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
    expect(queryBuilderState.fetchStructureState.projectionColumns.length).toBe(
      1,
    );
    let legalNameCol = guaranteeNonNullable(
      queryBuilderState.fetchStructureState.projectionColumns.find(
        (e) => e.columnName === CHAINED_PROPERTY_ALIAS,
      ),
    );
    const legalNameColProperty =
      legalNameCol.propertyEditorState.propertyExpression.func;
    expect(legalNameColProperty).toBe(_firmClass.getProperty('legalName'));
    const _firmPropertyExpression = guaranteeType(
      legalNameCol.propertyEditorState.propertyExpression.parametersValues[0],
      AbstractPropertyExpression,
    );
    expect(_firmPropertyExpression.func).toBe(_personClass.getProperty('firm'));
    expect(queryBuilderState.resultSetModifierState.limit).toBeUndefined();
    // result set modifiers
    const RESULT_LIMIT = 500;
    queryBuilderState.initWithRawLambda(
      getRawLambda(projectionWithResultSetModifiers),
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
    expect(queryBuilderState.fetchStructureState.projectionColumns.length).toBe(
      3,
    );
    const resultSetModifierState = queryBuilderState.resultSetModifierState;
    expect(resultSetModifierState.limit).toBe(RESULT_LIMIT);
    expect(resultSetModifierState.distinct).toBe(true);
    expect(resultSetModifierState.sortColumns).toHaveLength(2);
    fistNameCol = guaranteeNonNullable(
      queryBuilderState.fetchStructureState.projectionColumns.find(
        (e) => e.columnName === FIRST_NAME_ALIAS,
      ),
    );
    legalNameCol = guaranteeNonNullable(
      queryBuilderState.fetchStructureState.projectionColumns.find(
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
    queryBuilderState.initWithRawLambda(
      getRawLambda(getAllWithOneConditionFilter),
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
    const filterState = queryBuilderState.filterState;
    expect(filterState.nodes.size).toBe(1);
    expect(queryBuilderState.fetchStructureState.projectionColumns.length).toBe(
      0,
    );
    // filter with group condition
    queryBuilderState.resetData();
    await waitFor(() => renderResult.getByText('Add a filter condition'));
    queryBuilderState.initWithRawLambda(getRawLambda(getAllWithGroupedFilter));
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
    expect(queryBuilderState.filterState.nodes.size).toBe(3);
    expect(queryBuilderState.fetchStructureState.projectionColumns.length).toBe(
      0,
    );
    // projection column with derived property
    queryBuilderState.resetData();
    await waitFor(() => renderResult.getByText('Add a filter condition'));
    queryBuilderState.initWithRawLambda(
      getRawLambda(projectWithDerivedProperty),
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
    expect(queryBuilderState.fetchStructureState.projectionColumns.length).toBe(
      1,
    );
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
    const mockedEditorStore = buildQueryBuilderMockedEditorStore();
    const renderResult = await setUpEditorWithDefaultSDLCData(
      mockedEditorStore,
      {
        entities: ComplexM2MModel,
      },
    );
    const _personClass = mockedEditorStore.graphState.graph.getClass(
      'model::target::NPerson',
    );
    const _firmClass = mockedEditorStore.graphState.graph.getClass(
      'model::target::NFirm',
    );
    MOBX__enableSpyOrMock();
    mockedEditorStore.graphState.globalCompileInFormMode = jest.fn();
    MOBX__disableSpyOrMock();
    const queryBuilderState =
      mockedEditorStore.getEditorExtensionState(QueryBuilderState);
    await flowResult(queryBuilderState.setOpenQueryBuilder(true));
    queryBuilderState.querySetupState.setClass(_personClass);
    queryBuilderState.resetData();
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'NPerson'));
    await waitFor(() => getByText(queryBuilderSetup, 'MyMapping'));
    // simple graph fetch
    queryBuilderState.initWithRawLambda(getRawLambda(simpleGraphFetch));
    expect(queryBuilderState.fetchStructureState.fetchStructureMode).toBe(
      FETCH_STRUCTURE_MODE.GRAPH_FETCH,
    );
    queryBuilderState.initWithRawLambda(getRawLambda(firmPersonGraphFetch));
    expect(queryBuilderState.fetchStructureState.fetchStructureMode).toBe(
      FETCH_STRUCTURE_MODE.GRAPH_FETCH,
    );
    const firmGraphFetchTree = guaranteeNonNullable(
      queryBuilderState.fetchStructureState.graphFetchTreeState.graphFetchTree,
    );
    const firmGraphFetchTreeNode = firmGraphFetchTree.root.graphFetchTreeNode;
    expect(firmGraphFetchTreeNode.class.value).toBe(_firmClass);
  },
  // TODO: add more test when we rework the graph fetch tree
);

test(
  integrationTest(
    'Query builder lambda processer should properly handle unsupported functions',
  ),
  async () => {
    const mockedEditorStore = buildQueryBuilderMockedEditorStore();
    const renderResult = await setUpEditorWithDefaultSDLCData(
      mockedEditorStore,
      {
        entities: ComplexRelationalModel,
      },
    );
    MOBX__enableSpyOrMock();
    mockedEditorStore.graphState.globalCompileInFormMode = jest.fn();
    MOBX__disableSpyOrMock();
    const queryBuilderState =
      mockedEditorStore.getEditorExtensionState(QueryBuilderState);
    await flowResult(queryBuilderState.setOpenQueryBuilder(true));
    queryBuilderState.querySetupState.setClass(
      mockedEditorStore.graphState.graph.getClass(
        'model::pure::tests::model::simple::Person',
      ),
    );
    queryBuilderState.resetData();
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    // ensure form has updated with respect to the new state
    await waitFor(() => getByText(queryBuilderSetup, 'Person'));
    await waitFor(() =>
      getByText(queryBuilderSetup, 'simpleRelationalMapping'),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'MyRuntime'));
    // test various lambdas
    // Unable to update query builder with grammar due to: Function testUnSupported currently not supported
    expect(() =>
      queryBuilderState.buildWithRawLambda(
        getRawLambda(unSupportedGetAllWithOneConditionFilter),
      ),
    ).toThrowError(`Can't process filter expression function`);
    expect(() =>
      queryBuilderState.buildWithRawLambda(getRawLambda(errorInGraphLambda)),
    ).toThrowError(
      "Can't find type 'model::pure::tests::model::simple::NotFound'",
    );
    expect(() =>
      queryBuilderState.buildWithRawLambda(
        getRawLambda(unSupportedFunctionName),
      ),
    ).toThrowError(`Can't process function 'testUnSupported'`);
  },
);
