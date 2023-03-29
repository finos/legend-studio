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
  getByDisplayValue,
  getAllByTitle,
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
  TEST_DATA__getAllWithOneIntegerConditionFilter,
  TEST_DATA_getAllWithOneFloatConditionFilter,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import {
  TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
} from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json';
import TEST_DATA__ComplexM2MModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexM2M.json';
import TEST_DATA_SimpleSubtypeModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleSubtype.json';
import {
  integrationTest,
  guaranteeNonNullable,
  guaranteeType,
  getNullableFirstElement,
} from '@finos/legend-shared';
import {
  AbstractPropertyExpression,
  PrimitiveInstanceValue,
  create_RawLambda,
  getClassProperty,
  stub_RawLambda,
} from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../application/QueryBuilderTesting.js';
import {
  QueryBuilderExplorerTreeRootNodeData,
  QueryBuilderExplorerTreeSubTypeNodeData,
} from '../../stores/explorer/QueryBuilderExplorerState.js';
import { QueryBuilderSimpleProjectionColumnState } from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import { COLUMN_SORT_TYPE } from '../../stores/fetch-structure/tds/QueryResultSetModifierState.js';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderGraphFetchTreeState } from '../../stores/fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeState.js';
import { TEST__setUpQueryBuilder } from '../QueryBuilderComponentTestUtils.js';
import { QueryBuilderFilterTreeConditionNodeData } from '../../stores/filter/QueryBuilderFilterState.js';

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
      await waitFor(() =>
        projectionCols.querySelector(`input[value="${FIRST_NAME_ALIAS}"]`),
      ),
    ).not.toBeNull();
    expect(
      await waitFor(() =>
        projectionCols.querySelector(`input[value="${LAST_NAME_ALIAS}"]`),
      ),
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
        projectionWithChainedPropertyCols.querySelector(
          `input[value="${CHAINED_PROPERTY_ALIAS}"]`,
        ),
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
    fireEvent.click(
      getByTitle(queryBuilder, 'Configure result set modifiers...'),
    );
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
    fireEvent.click(getByText(modal, 'Close'));

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
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER),
    );
    await waitFor(() => getByText(filterPanel, filterValue));

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
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER),
    );
    await waitFor(() =>
      expect(getAllByText(filterPanel, 'is')).toHaveLength(2),
    );
    await waitFor(() => getByText(filterPanel, 'or'));
    filterValue = 'lastNameTest';
    await waitFor(() => getByText(filterPanel, filterValue));
    await waitFor(() => getByText(filterPanel, 'First Name'));
    const lastNameFilterValue = 'lastNameTest';
    await waitFor(() => getByText(filterPanel, lastNameFilterValue));
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
      await waitFor(() =>
        projectionCols.querySelector(`input[value="Full Name With Title"]`),
      ),
    ).not.toBeNull();
    await waitFor(() => getByText(projectionCols, 'Name With Title'));
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

test(
  integrationTest(
    'Query builder filter supports special numeric values (integer)',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );

    await waitFor(() => renderResult.getByText('Add a filter condition'));
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__getAllWithOneIntegerConditionFilter.parameters,
          TEST_DATA__getAllWithOneIntegerConditionFilter.body,
        ),
      );
    });

    const filterConditionValue = guaranteeType(
      guaranteeType(
        getNullableFirstElement(
          Array.from(queryBuilderState.filterState.nodes.values()),
        ),
        QueryBuilderFilterTreeConditionNodeData,
      ).condition.value,
      PrimitiveInstanceValue,
    );

    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER),
    );
    await waitFor(() => getByText(filterPanel, 'Age'));
    await waitFor(() => getByText(filterPanel, 'is'));

    const inputEl = getByDisplayValue(filterPanel, '0');

    // valid input should be recorded and saved to state
    // await act(() => fireEvent.change(inputEl, { target: { value: '1000' } }));
    fireEvent.change(inputEl, { target: { value: '1000' } });
    expect(filterConditionValue.values[0]).toEqual(1000);
    await waitFor(() => getByDisplayValue(filterPanel, '1000'));

    // bad input should be reset to initial value on blur
    fireEvent.change(inputEl, { target: { value: '1asd' } });
    fireEvent.blur(inputEl);
    expect(filterConditionValue.values[0]).toEqual(1000);
    await waitFor(() => getByDisplayValue(filterPanel, '1000'));
  },
);

test(
  integrationTest(
    'Query builder filter supports special numeric values (float)',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );

    await waitFor(() => renderResult.getByText('Add a filter condition'));
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA_getAllWithOneFloatConditionFilter.parameters,
          TEST_DATA_getAllWithOneFloatConditionFilter.body,
        ),
      );
    });

    const filterConditionValue = guaranteeType(
      guaranteeType(
        getNullableFirstElement(
          Array.from(queryBuilderState.filterState.nodes.values()),
        ),
        QueryBuilderFilterTreeConditionNodeData,
      ).condition.value,
      PrimitiveInstanceValue,
    );

    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER),
    );
    await waitFor(() => getByText(filterPanel, 'Firm/Average Employees Age'));
    await waitFor(() => getByText(filterPanel, 'is'));

    const inputEl = getByDisplayValue(filterPanel, '0');

    // valid input should be recorded and saved to state
    fireEvent.change(inputEl, { target: { value: '-.1' } });
    expect(filterConditionValue.values[0]).toEqual(-0.1);
    await waitFor(() => getByDisplayValue(filterPanel, '-.1'));
  },
);

test(
  integrationTest(
    'Query builder window function shows validation error if existing duplicate column name',
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
      // 'show window-funcs' panel so we will directly force
      // the panel to show for now
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      tdsState.setShowWindowFuncPanel(true);
    });

    await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY,
      ),
    );
    const windowPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY,
    );
    fireEvent.click(getByTitle(windowPanel, 'Create Window Function Column'));

    await waitFor(() => renderResult.getByText('Create'));

    fireEvent.click(renderResult.getByText('Create'));

    fireEvent.click(getByTitle(windowPanel, 'Create Window Function Column'));

    await waitFor(() => renderResult.getByText('Create'));

    fireEvent.click(renderResult.getByText('Create'));

    await waitFor(() => renderResult.getByText('Run Query'));

    expect(getAllByTitle(windowPanel, 'Duplicated column')).not.toBeNull();

    expect(
      (
        queryBuilderState.fetchStructureState
          .implementation as QueryBuilderTDSState
      ).windowState.validationIssues?.length === 1,
    );
  },
);
