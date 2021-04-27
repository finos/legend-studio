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
import type { RenderResult } from '@testing-library/react';
import { fireEvent, getByTitle, getByText } from '@testing-library/react';
import {
  queryBuilderTestData,
  simpleProjection,
  projectionWithChainedProperty,
  projectionWithResultSetModifiers,
  getAllWithGroupedFilter,
  getAllWithOneConditionFilter,
  unSupportedGetAllWithOneConditionFilter,
  errorInGraphLambda,
  unSupportedFunctionName,
  projectWithDerivedProperty,
  fullComplexProjectionQuery,
  m2mTestData,
  firmPersonGraphFetch,
  simpleGraphFetch,
} from './QueryBuilderTestData';
import COVIDDataSimpleModel from './QueryBuilder_Model_COVID.json';
import SimpleM2MModel from './QueryBuilder_Model_SimpleM2M.json';
import {
  integrationTest,
  guaranteeNonNullable,
  guaranteeType,
  MOBX__enableSpyOrMock,
  MOBX__disableSpyOrMock,
} from '@finos/legend-studio-shared';
import { getAllByText, waitFor } from '@testing-library/dom';
import type { PlainObject } from '@finos/legend-studio-shared';
import { QueryBuilderExplorerTreeRootNodeData } from '../../stores/QueryBuilderExplorerState';
import { COLUMN_SORT_TYPE } from '../../stores/QueryResultSetModifierState';
import { FETCH_STRUCTURE_MODE } from '../../stores/QueryBuilderFetchStructureState';
import type { EditorStore, Entity } from '@finos/legend-studio';
import {
  getMockedApplicationStore,
  getTestApplicationConfig,
  PluginManager,
  AbstractPropertyExpression,
  getMockedEditorStore,
  RawLambda,
  setUpEditorWithDefaultSDLCData,
} from '@finos/legend-studio';
import { QUERY_BUILDER_TEST_ID } from '../../QueryBuilder_Constants';
import { QueryBuilderState } from '../../stores/QueryBuilderState';
import { flowResult } from 'mobx';
import { QueryBuilderPlugin } from '../../QueryBuilderPlugin';
import {
  lambda_enumerationOperatorFilter,
  lambda_existsChainFilter,
  lambda_existsChainFilterWithCustomVariableName,
  lambda_groupConditionFilter,
  lambda_groupConditionFilter_withMultipleClauseGroup,
  lambda_notOperatorFilter,
  lambda_setOperatorFilter,
  lambda_simpleSingleConditionFilter,
} from './QueryBuilder_Roundtrip_TestFilterQueries';

let renderResult: RenderResult;

const getRawLambda = (jsonRawLambda: {
  parameters?: object;
  body?: object;
}): RawLambda => new RawLambda(jsonRawLambda.parameters, jsonRawLambda.body);

const init = async (entities: PlainObject<Entity>[]): Promise<EditorStore> => {
  const pluginManager = PluginManager.create();
  pluginManager.usePlugins([new QueryBuilderPlugin()]).install();
  const mockedApplicationStore = getMockedApplicationStore(
    getTestApplicationConfig(),
    pluginManager,
  );
  const mockedEditorStore = getMockedEditorStore(mockedApplicationStore);
  renderResult = await setUpEditorWithDefaultSDLCData(mockedEditorStore, {
    entities,
  });
  return mockedEditorStore;
};

test(
  integrationTest(
    'Validates query builder state after processing a json lambda',
  ),
  async () => {
    const mockedEditorStore = await init(queryBuilderTestData);
    const _personClass = mockedEditorStore.graphState.graph.getClass(
      'model::pure::tests::model::simple::Person',
    );
    const _firmClass = mockedEditorStore.graphState.graph.getClass(
      'model::pure::tests::model::simple::Firm',
    );
    MOBX__enableSpyOrMock();
    mockedEditorStore.graphState.globalCompileInFormMode = jest.fn();
    MOBX__disableSpyOrMock();
    const queryBuilderState = mockedEditorStore.getEditorExtensionState(
      QueryBuilderState,
    );
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
      getByTitle(queryBuilder, 'Configure Result Set Modifiers...'),
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
    'Validates query builder state after processing a graph lambda',
  ),
  async () => {
    const mockedEditorStore = await init(m2mTestData);
    const _personClass = mockedEditorStore.graphState.graph.getClass(
      'demo::other::NPerson',
    );
    const _firmClass = mockedEditorStore.graphState.graph.getClass(
      'demo::other::NFirm',
    );
    MOBX__enableSpyOrMock();
    mockedEditorStore.graphState.globalCompileInFormMode = jest.fn();
    MOBX__disableSpyOrMock();
    const queryBuilderState = mockedEditorStore.getEditorExtensionState(
      QueryBuilderState,
    );
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

test(integrationTest('Test unsupported functions'), async () => {
  const mockedEditorStore = await init(queryBuilderTestData);
  MOBX__enableSpyOrMock();
  mockedEditorStore.graphState.globalCompileInFormMode = jest.fn();
  MOBX__disableSpyOrMock();
  const queryBuilderState = mockedEditorStore.getEditorExtensionState(
    QueryBuilderState,
  );
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
  await waitFor(() => getByText(queryBuilderSetup, 'simpleRelationalMapping'));
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
    queryBuilderState.buildWithRawLambda(getRawLambda(unSupportedFunctionName)),
  ).toThrowError(`Can't process function 'testUnSupported'`);
});

// ------------------------------------------- ROUNDTRIP -----------------------------------------
//
// TODO: consider moving these to state/store directory as these are testing for the state
// rather than the UI (we only use the UI to launch query builder)

const testRoundtrip = (
  jsonRawLambda: { parameters?: object; body?: object },
  mockedEditorStore: EditorStore,
): void => {
  const queryBuilderState = mockedEditorStore.getEditorExtensionState(
    QueryBuilderState,
  );
  queryBuilderState.buildWithRawLambda(getRawLambda(jsonRawLambda));
  const jsonQuery = mockedEditorStore.graphState.graphManager.serializeRawValueSpecification(
    queryBuilderState.getRawLambdaQuery(),
  );
  expect([jsonRawLambda]).toIncludeSameMembers([jsonQuery]);
};

test(integrationTest('Roundtrip for projection'), async () => {
  const mockedEditorStore = await init(queryBuilderTestData);
  MOBX__enableSpyOrMock();
  mockedEditorStore.graphState.globalCompileInFormMode = jest.fn();
  MOBX__disableSpyOrMock();
  const queryBuilderState = mockedEditorStore.getEditorExtensionState(
    QueryBuilderState,
  );
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
  await waitFor(() => getByText(queryBuilderSetup, 'simpleRelationalMapping'));
  await waitFor(() => getByText(queryBuilderSetup, 'MyRuntime'));
  // test various lambdas
  testRoundtrip(simpleProjection, mockedEditorStore);
  testRoundtrip(projectionWithChainedProperty, mockedEditorStore);
  testRoundtrip(projectionWithResultSetModifiers, mockedEditorStore);
  testRoundtrip(getAllWithOneConditionFilter, mockedEditorStore);
  testRoundtrip(getAllWithGroupedFilter, mockedEditorStore);
  testRoundtrip(projectWithDerivedProperty, mockedEditorStore);
  testRoundtrip(fullComplexProjectionQuery, mockedEditorStore);
});

test(integrationTest('Roundtrip for graph fetch tree'), async () => {
  // Graph Fetch
  const mockedEditorStore = await init(m2mTestData);
  MOBX__enableSpyOrMock();
  mockedEditorStore.graphState.globalCompileInFormMode = jest.fn();
  MOBX__disableSpyOrMock();
  const queryBuilderState = mockedEditorStore.getEditorExtensionState(
    QueryBuilderState,
  );
  await flowResult(queryBuilderState.setOpenQueryBuilder(true));
  queryBuilderState.querySetupState.setClass(
    mockedEditorStore.graphState.graph.getClass('demo::other::NPerson'),
  );
  queryBuilderState.resetData();
  const queryBuilderSetup = await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
  );
  // ensure form has updated with respect to the new state
  await waitFor(() => getByText(queryBuilderSetup, 'NPerson'));
  await waitFor(() => getByText(queryBuilderSetup, 'MyMapping'));
  testRoundtrip(simpleGraphFetch, mockedEditorStore);
  testRoundtrip(firmPersonGraphFetch, mockedEditorStore);
});

test(
  integrationTest('Roundtrip for filter expression (relational)'),
  async () => {
    const mockedEditorStore = await init(COVIDDataSimpleModel);
    MOBX__enableSpyOrMock();
    mockedEditorStore.graphState.globalCompileInFormMode = jest.fn();
    MOBX__disableSpyOrMock();
    const queryBuilderState = mockedEditorStore.getEditorExtensionState(
      QueryBuilderState,
    );
    await flowResult(queryBuilderState.setOpenQueryBuilder(true));
    queryBuilderState.querySetupState.setClass(
      mockedEditorStore.graphState.graph.getClass('domain::COVIDData'),
    );
    queryBuilderState.resetData();
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    // ensure form has updated with respect to the new state
    await waitFor(() => getByText(queryBuilderSetup, 'COVIDData'));
    await waitFor(() => getByText(queryBuilderSetup, 'CovidDataMapping'));
    await waitFor(() => getByText(queryBuilderSetup, 'H2Runtime'));
    // test various lambdas
    testRoundtrip(lambda_simpleSingleConditionFilter, mockedEditorStore);
    testRoundtrip(lambda_notOperatorFilter, mockedEditorStore);
    testRoundtrip(lambda_setOperatorFilter, mockedEditorStore);
    testRoundtrip(lambda_groupConditionFilter, mockedEditorStore);
    testRoundtrip(
      lambda_groupConditionFilter_withMultipleClauseGroup,
      mockedEditorStore,
    );
  },
);

test(integrationTest('Roundtrip for filter expression (M2M)'), async () => {
  const mockedEditorStore = await init(SimpleM2MModel);
  MOBX__enableSpyOrMock();
  mockedEditorStore.graphState.globalCompileInFormMode = jest.fn();
  MOBX__disableSpyOrMock();
  const queryBuilderState = mockedEditorStore.getEditorExtensionState(
    QueryBuilderState,
  );
  await flowResult(queryBuilderState.setOpenQueryBuilder(true));
  queryBuilderState.querySetupState.setClass(
    mockedEditorStore.graphState.graph.getClass('model::target::_Person'),
  );
  queryBuilderState.resetData();
  const queryBuilderSetup = await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
  );
  // ensure form has updated with respect to the new state
  await waitFor(() => getByText(queryBuilderSetup, '_Person'));
  await waitFor(() => getByText(queryBuilderSetup, 'mapping'));
  await waitFor(() => getByText(queryBuilderSetup, 'runtime'));
  // test various lambdas
  testRoundtrip(lambda_enumerationOperatorFilter, mockedEditorStore);
  testRoundtrip(lambda_existsChainFilter, mockedEditorStore);
  testRoundtrip(
    lambda_existsChainFilterWithCustomVariableName,
    mockedEditorStore,
  );
});
