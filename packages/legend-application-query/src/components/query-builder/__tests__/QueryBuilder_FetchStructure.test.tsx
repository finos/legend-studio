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
} from '../../../stores/query-builder/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import {
  TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
} from '../../../stores/query-builder/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../../stores/query-builder/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json';
import TEST_DATA__ComplexM2MModel from '../../../stores/query-builder/__tests__/TEST_DATA__QueryBuilder_Model_ComplexM2M.json';
import TEST_DATA_SimpleSubtypeModel from '../../../stores/query-builder/__tests__/TEST_DATA__QueryBuilder_Model_SimpleSubtype.json';
import {
  integrationTest,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import {
  AbstractPropertyExpression,
  create_RawLambda,
  getClassProperty,
  stub_RawLambda,
} from '@finos/legend-graph';
import {
  TEST__provideMockedQueryEditorStore,
  TEST__setUpQueryEditor,
} from '../../QueryEditorComponentTestUtils.js';
import { QUERY_BUILDER_TEST_ID } from '../QueryBuilder_TestID.js';
import {
  QueryBuilderExplorerTreeRootNodeData,
  QueryBuilderExplorerTreeSubTypeNodeData,
} from '../../../stores/query-builder/explorer/QueryBuilderExplorerState.js';
import { QueryBuilderSimpleProjectionColumnState } from '../../../stores/query-builder/fetch-structure/projection/QueryBuilderProjectionColumnState.js';
import { COLUMN_SORT_TYPE } from '../../../stores/query-builder/fetch-structure/projection/QueryResultSetModifierState.js';
import { LegendQueryPluginManager } from '../../../application/LegendQueryPluginManager.js';
import { QueryBuilder_GraphManagerPreset } from '../../../graphManager/QueryBuilder_GraphManagerPreset.js';
import { QueryBuilderProjectionState } from '../../../stores/query-builder/fetch-structure/projection/QueryBuilderProjectionState.js';
import { QueryBuilderGraphFetchTreeState } from '../../../stores/query-builder/fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeState.js';

test(
  integrationTest(
    'Query builder state is properly set after processing a projection lambda',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const { renderResult, queryBuilderState } = await TEST__setUpQueryEditor(
      MOCK__editorStore,
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
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjection.parameters,
          TEST_DATA__simpleProjection.body,
        ),
      );
    });

    // check fetch-structure
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
    let projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
    );
    expect(projectionState.columns.length).toBe(2);
    let fistNameCol = guaranteeNonNullable(
      projectionState.columns.find((e) => e.columnName === FIRST_NAME_ALIAS),
    );
    const firstNameProperty = guaranteeType(
      fistNameCol,
      QueryBuilderSimpleProjectionColumnState,
    ).propertyExpressionState.propertyExpression.func;
    expect(firstNameProperty).toBe(getClassProperty(_personClass, 'firstName'));
    const lastNameCol = guaranteeNonNullable(
      projectionState.columns.find((e) => e.columnName === LAST_NAME_ALIAS),
    );
    const lastNameProperty = guaranteeType(
      lastNameCol,
      QueryBuilderSimpleProjectionColumnState,
    ).propertyExpressionState.propertyExpression.func;
    expect(lastNameProperty).toBe(getClassProperty(_personClass, 'lastName'));
    expect(projectionState.resultSetModifierState.limit).toBeUndefined();

    // chainedProperty
    const CHAINED_PROPERTY_ALIAS = 'Firm/Legal Name';
    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__projectionWithChainedProperty.parameters,
          TEST_DATA__projectionWithChainedProperty.body,
        ),
      );
    });
    projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
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
    expect(projectionState.columns.length).toBe(1);
    let legalNameCol = guaranteeNonNullable(
      projectionState.columns.find(
        (e) => e.columnName === CHAINED_PROPERTY_ALIAS,
      ),
    );
    const legalNameColProperty = guaranteeType(
      legalNameCol,
      QueryBuilderSimpleProjectionColumnState,
    ).propertyExpressionState.propertyExpression.func;
    expect(legalNameColProperty).toBe(
      getClassProperty(_firmClass, 'legalName'),
    );
    const _firmPropertyExpression = guaranteeType(
      guaranteeType(legalNameCol, QueryBuilderSimpleProjectionColumnState)
        .propertyExpressionState.propertyExpression.parametersValues[0],
      AbstractPropertyExpression,
    );
    expect(_firmPropertyExpression.func).toBe(
      getClassProperty(_personClass, 'firm'),
    );
    expect(projectionState.resultSetModifierState.limit).toBeUndefined();

    // result set modifiers
    const RESULT_LIMIT = 500;
    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__projectionWithResultSetModifiers.parameters,
          TEST_DATA__projectionWithResultSetModifiers.body,
        ),
      );
    });
    projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
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
    expect(projectionState.columns.length).toBe(3);
    const resultSetModifierState = projectionState.resultSetModifierState;
    expect(resultSetModifierState.limit).toBe(RESULT_LIMIT);
    expect(resultSetModifierState.distinct).toBe(true);
    expect(resultSetModifierState.sortColumns).toHaveLength(2);
    fistNameCol = guaranteeNonNullable(
      projectionState.columns.find((e) => e.columnName === FIRST_NAME_ALIAS),
    );
    legalNameCol = guaranteeNonNullable(
      projectionState.columns.find(
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
    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__getAllWithOneConditionFilter.parameters,
          TEST_DATA__getAllWithOneConditionFilter.body,
        ),
      );
    });
    projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
    );
    let filterValue = 'testFirstName';
    let filterPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER),
    );
    await waitFor(() => getByText(filterPanel, filterValue));

    await waitFor(() => getByText(filterPanel, 'First Name'));
    await waitFor(() => getByText(filterPanel, 'is'));
    const filterState = queryBuilderState.filterState;
    expect(filterState.nodes.size).toBe(1);
    expect(projectionState.columns.length).toBe(0);

    // filter with group condition
    act(() => {
      queryBuilderState.resetQueryResult();
      queryBuilderState.resetQueryContent();
    });
    await waitFor(() => renderResult.getByText('Add a filter condition'));
    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__getAllWithGroupedFilter.parameters,
          TEST_DATA__getAllWithGroupedFilter.body,
        ),
      );
    });
    projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
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
    expect(projectionState.columns.length).toBe(0);

    // projection column with derived property
    act(() => {
      queryBuilderState.resetQueryResult();
      queryBuilderState.resetQueryContent();
    });
    await waitFor(() => renderResult.getByText('Add a filter condition'));
    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__projectWithDerivedProperty.parameters,
          TEST_DATA__projectWithDerivedProperty.body,
        ),
      );
    });
    projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
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
    expect(projectionState.columns.length).toBe(1);
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
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const { renderResult, queryBuilderState } = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_DATA_SimpleSubtypeModel,
      stub_RawLambda(),
      'model::NewMapping',
      'model::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
    );
    const _legalEntityClass =
      MOCK__editorStore.graphManagerState.graph.getClass('model::LegalEntity');
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

    // simpleProjection with subType
    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithSubtypeFromSubtypeModel.parameters,
          TEST_DATA__simpleProjectionWithSubtypeFromSubtypeModel.body,
        ),
      );
    });

    // check fetch-structure
    const projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
    );
    expect(projectionState.columns.length).toBe(1);
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a graph-fetch lambda',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const { renderResult, queryBuilderState } = await TEST__setUpQueryEditor(
      MOCK__editorStore,
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
    act(() => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleGraphFetch.parameters,
          TEST_DATA__simpleGraphFetch.body,
        ),
      );
    });

    // switch to complex graph fetch
    await act(async () => {
      queryBuilderState.initialize(
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
