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
  waitFor,
  act,
  getByText,
  queryAllByTestId,
  queryByText,
  queryByTitle,
  queryByDisplayValue,
  fireEvent,
  getByDisplayValue,
  getByTitle,
  queryAllByTitle,
  getByTestId,
} from '@testing-library/react';
import {
  TEST_DATA__lambda_WithDerivedProjectColumnsUsingConstAndParams,
  TEST_DATA__lambda_builtPostFilterQuery,
  TEST_DATA__lambda_expectedModifiedPostFilterQuery,
  TEST_DATA__lambda_postFilterQueryWithRightValAsCol,
  TEST_DATA__lambda_returnTypeSimple,
  TEST_DATA__lambda_returnTypeWithConst,
  TEST_DATA__lambda_returnTypeWithConstAndParam,
  TEST_DATA__lambda_returnTypeWithParam,
  TEST_DATA__lambda_simpleConstantWithDatesAndCalcualted,
  TEST_DATA__simplePostFilterWithDateTimeWithSeconds,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import {
  TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDates,
} from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' assert { type: 'json' };
import { integrationTest } from '@finos/legend-shared/test';
import {
  Core_GraphManagerPreset,
  PRIMITIVE_TYPE,
  RawLambda,
  create_RawLambda,
  stub_RawLambda,
} from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  TEST__setUpQueryBuilder,
  dragAndDrop,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates.json' assert { type: 'json' };
import {
  filterByType,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderDerivationProjectionColumnState } from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import {
  TEST__LegendApplicationPluginManager,
  TEST__getGenericApplicationConfig,
} from '../../stores/__test-utils__/QueryBuilderStateTestUtils.js';
import { QueryBuilder_GraphManagerPreset } from '../../graph-manager/QueryBuilder_GraphManagerPreset.js';
import { ApplicationStore } from '@finos/legend-application';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import { INTERNAL__BasicQueryBuilderState } from '../../stores/QueryBuilderState.js';

test(
  integrationTest('Query builder loads simple post-filter with DateTime value'),
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
          undefined,
          TEST_DATA__simplePostFilterWithDateTimeWithSeconds.body,
        ),
      );
    });
    const queryBuilderFilterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
      ),
    );

    expect(
      await waitFor(() =>
        getByText(queryBuilderFilterPanel, '2023-09-09T16:06:10'),
      ),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder loads grouped post filter panels using constants',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates,
      stub_RawLambda(),
      'model::RelationalMapping',
      'model::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDates,
    );

    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__lambda_simpleConstantWithDatesAndCalcualted.parameters,
          TEST_DATA__lambda_simpleConstantWithDatesAndCalcualted.body,
        ),
      );
    });

    // gather all nodes
    const postFilterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
      ),
    );
    let nodeContents = queryAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
    );
    expect(nodeContents.length).toBe(7);
    const andNode = guaranteeNonNullable(
      nodeContents.find((n) => queryByText(n, 'and') !== null),
      'Unable to find and node',
    );
    expect(queryByTitle(andNode, 'Switch Operation')).not.toBeNull();
    let orNode = guaranteeNonNullable(
      nodeContents.find((n) => queryByText(n, 'or') !== null),
      'Unable to find or node',
    );
    expect(queryByTitle(orNode, 'Switch Operation')).not.toBeNull();
    const testUniqueBasicPostFilterCondition = (
      columnname: string,
      operator: string,
      value: string | number,
      elements: HTMLElement[],
      options?: {
        valueIsInput?: true;
      },
      extraTitles?: string[],
    ): HTMLElement => {
      const element = guaranteeNonNullable(
        elements.find((n) => queryByText(n, columnname) !== null),
        `Can't find post filter condition with property ${columnname}`,
      );
      expect(queryByText(element, columnname)).not.toBeNull();
      expect(queryByText(element, operator)).not.toBeNull();
      expect(queryByTitle(element, 'Remove')).not.toBeNull();
      expect(queryByTitle(element, 'Reset')).not.toBeNull();
      expect(queryByTitle(element, 'Choose Operator...')).not.toBeNull();
      if (options?.valueIsInput) {
        expect(queryByDisplayValue(element, value)).not.toBeNull();
      } else {
        expect(queryByText(element, value)).not.toBeNull();
      }
      extraTitles?.forEach((title) =>
        expect(queryByTitle(element, title)).not.toBeNull(),
      );
      return element;
    };
    let ageNode = testUniqueBasicPostFilterCondition(
      'Age',
      '>=',
      0,
      nodeContents,
      { valueIsInput: true },
      ['Evaluate Expression (Enter)'],
    );
    let firstNameNode = testUniqueBasicPostFilterCondition(
      'First Name',
      'ends with',
      'Testing',
      nodeContents,
      { valueIsInput: true },
    );

    let dobTimeNode = testUniqueBasicPostFilterCondition(
      'Dob Time',
      'is',
      '2023-09-30T11:47:13-0400',
      nodeContents,
    );
    let dobDateNode = testUniqueBasicPostFilterCondition(
      'Dob Date',
      'is not',
      'One Year Ago',
      nodeContents,
    );
    let strictDateNode = testUniqueBasicPostFilterCondition(
      'Dob Strict Date',
      '>',
      '2023-09-30',
      nodeContents,
    );
    const constantPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_CONSTANTS),
    );
    const parameterPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    // dnd const `integerConst` -> Age Value
    const intConst = getByText(constantPanel, 'integerConst');
    const displayValue = getByDisplayValue(ageNode, 0);
    await dragAndDrop(
      intConst,
      displayValue,
      postFilterPanel,
      'Change Filter Value',
    );
    nodeContents = queryAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
    );
    ageNode = guaranteeNonNullable(
      nodeContents.find((e) => queryByText(e, 'Age') !== null),
    );
    expect(getByText(ageNode, 'Age')).not.toBeNull();
    expect(getByText(ageNode, '>=')).not.toBeNull();
    expect(getByText(ageNode, 'integerConst')).not.toBeNull();
    expect(getByText(ageNode, 'C')).not.toBeNull();

    // dnd const `stringConst` -> first Name Value
    const stringConst = getByText(constantPanel, 'stringConst');
    const stringValue = getByDisplayValue(firstNameNode, 'Testing');
    await dragAndDrop(
      stringConst,
      stringValue,
      postFilterPanel,
      'Change Filter Value',
    );
    nodeContents = queryAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
    );
    firstNameNode = guaranteeNonNullable(
      nodeContents.find((e) => queryByText(e, 'First Name') !== null),
    );
    expect(getByText(firstNameNode, 'First Name')).not.toBeNull();
    expect(getByText(firstNameNode, 'ends with')).not.toBeNull();
    expect(getByText(firstNameNode, 'stringConst')).not.toBeNull();
    expect(getByText(firstNameNode, 'C')).not.toBeNull();

    // dnd const `dateFunction` -> Date Time Val
    const dateFunctionConst = getByText(constantPanel, 'dateFunction');
    const dateVal = getByText(dobTimeNode, '2023-09-30T11:47:13-0400');
    await dragAndDrop(
      dateFunctionConst,
      dateVal,
      postFilterPanel,
      'Change Filter Value',
    );
    dobTimeNode = guaranteeNonNullable(
      nodeContents.find((e) => queryByText(e, 'Dob Time') !== null),
    );
    expect(getByText(dobTimeNode, 'Dob Time')).not.toBeNull();
    expect(getByText(dobTimeNode, 'is')).not.toBeNull();
    expect(getByText(dobTimeNode, 'dateFunction')).not.toBeNull();
    expect(getByText(dobTimeNode, 'C')).not.toBeNull();

    // dnd const `absolute Date` -> Date Date
    const absoluteDateConst = getByText(constantPanel, 'absoluteDate');
    const dateTimeVal = getByText(dobDateNode, 'One Year Ago');
    await dragAndDrop(
      absoluteDateConst,
      dateTimeVal,
      postFilterPanel,
      'Change Filter Value',
    );
    dobDateNode = guaranteeNonNullable(
      nodeContents.find((e) => queryByText(e, 'Dob Date') !== null),
    );
    expect(getByText(dobDateNode, 'Dob Date')).not.toBeNull();
    expect(getByText(dobDateNode, 'is not')).not.toBeNull();
    expect(getByText(dobDateNode, 'absoluteDate')).not.toBeNull();
    expect(getByText(dobDateNode, 'C')).not.toBeNull();

    // dnd param `dateParam` -> Date Date
    const dateParam = getByText(parameterPanel, 'dateParam');
    const strictDateVal = getByText(strictDateNode, '2023-09-30');
    await dragAndDrop(
      dateParam,
      strictDateVal,
      postFilterPanel,
      'Change Filter Value',
    );
    strictDateNode = guaranteeNonNullable(
      nodeContents.find((e) => queryByText(e, 'Dob Strict Date') !== null),
    );
    expect(getByText(strictDateNode, 'Dob Strict Date')).not.toBeNull();
    expect(getByText(strictDateNode, '>')).not.toBeNull();
    expect(getByText(strictDateNode, 'dateParam')).not.toBeNull();

    // remove all filter nodes
    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    const filterNodes = queryAllByTestId(
      filterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
    );
    expect(filterNodes.length).toBe(9);
    // click removal of top level nodes will remove all nodes
    fireEvent.click(
      getByTitle(
        guaranteeNonNullable(
          filterNodes.find(
            (e) => queryByText(e, 'and'),
            `Can't find 'and' condition in filter tree`,
          ),
        ),
        'Remove',
      ),
    );
    expect(
      queryAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ).length,
    ).toBe(0);
    expect(queryByText(filterPanel, 'Add a filter condition')).not.toBeNull();

    const tdsPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS),
    );
    const removeCols = queryAllByTitle(
      tdsPanel,
      `This column is used and can't be removed`,
    );
    expect(removeCols.length).toBe(5);
    expect(TEST_DATA__lambda_expectedModifiedPostFilterQuery).toEqual(
      queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
        queryBuilderState.buildQuery(),
      ),
    );
    // remove ageNode/ first name node (should auto remove or node)
    fireEvent.click(getByTitle(ageNode, 'Remove'));
    nodeContents = queryAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
    );
    expect(nodeContents.length).toBe(6);
    firstNameNode = guaranteeNonNullable(
      nodeContents.find((n) => queryByText(n, 'First Name')),
    );
    fireEvent.click(getByTitle(firstNameNode, 'Remove'));
    nodeContents = queryAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
    );
    expect(nodeContents.length).toBe(4);
    orNode = guaranteeNonNullable(
      nodeContents.find((n) => queryByText(n, 'or') !== null),
      'Unable to find or node',
    );
    // click remove on top remove or node should clear all conditions
    fireEvent.click(getByTitle(orNode, 'Remove'));
    expect(
      queryAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      ),
    ).toHaveLength(0);
    expect(
      queryByText(postFilterPanel, 'Add a post-filter condition'),
    ).not.toBeNull();

    expect(
      queryAllByTitle(
        renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS),
        `This column is used and can't be removed`,
      ),
    ).toHaveLength(0);
  },
);

const EXPECTED_STRING_TYPES: Record<string, string[]> = {
  [PRIMITIVE_TYPE.STRING]: [
    'is',
    'is not',
    'starts with',
    `doesn't start with`,
    'contains',
    `doesn't contain`,
    'ends with',
    `doesn't end with`,
    'is in',
    'is not in',
  ],
  [PRIMITIVE_TYPE.INTEGER]: [
    'is',
    'is not',
    '<',
    '<=',
    '>',
    '>=',
    'is in',
    'is not in',
  ],
};

test(
  integrationTest(
    'Query builder builds post filter and shows correct operations',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates,
      stub_RawLambda(),
      'model::RelationalMapping',
      'model::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDates,
    );

    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__lambda_simpleConstantWithDatesAndCalcualted.parameters,
          TEST_DATA__lambda_simpleConstantWithDatesAndCalcualted.body,
        ),
      );
    });

    // gather all nodes
    const postFilterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
      ),
    );

    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    const tdsPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS),
    );
    fireEvent.click(
      getByTitle(
        guaranteeNonNullable(
          queryAllByTestId(
            filterPanel,
            QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
          ).find((node) => queryByText(node, 'and') !== null),
        ),
        'Remove',
      ),
    );
    expect(
      queryAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ),
    ).toHaveLength(0);
    fireEvent.click(
      getByTitle(
        guaranteeNonNullable(
          queryAllByTestId(
            postFilterPanel,
            QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
          ).find((node) => queryByText(node, 'and') !== null),
        ),
        'Remove',
      ),
    );
    expect(
      queryAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      ),
    ).toHaveLength(0);
    const cols = queryAllByTestId(
      tdsPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION_COLUMN,
    );
    expect(cols).toHaveLength(5);
    const firstNameCol = guaranteeNonNullable(
      cols.find((q) => queryByText(q, 'First Name')),
      `Can't find first name projectioncol`,
    );
    let dragSource = getByTitle(firstNameCol, 'Drag Element');
    const postFilterDrop = getByText(
      postFilterPanel,
      `Add a post-filter condition`,
    );
    fireEvent.dragStart(dragSource);
    fireEvent.dragEnter(postFilterDrop);
    fireEvent.dragOver(postFilterDrop);
    fireEvent.drop(getByText(postFilterPanel, 'Add a post-filter condition'));
    expect(
      queryAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      ),
    ).toHaveLength(1);
    expect(queryByText(postFilterPanel, 'Fist Name'));
    expect(queryByText(postFilterPanel, 'is'));

    fireEvent.click(getByTitle(postFilterPanel, 'Choose Operator...'));
    let switchMenu = renderResult.getByRole('menu');
    guaranteeNonNullable(EXPECTED_STRING_TYPES[PRIMITIVE_TYPE.STRING]).forEach(
      (expectedOp) => getByText(switchMenu, expectedOp),
    );
    fireEvent.click(getByText(switchMenu, 'is in'));
    expect(queryByText(postFilterPanel, 'List(empty)'));
    fireEvent.click(getByTitle(postFilterPanel, 'Choose Operator...'));
    fireEvent.click(
      getByText(renderResult.getByRole('menu'), `doesn't contain`),
    );
    const inputNode = getByDisplayValue(postFilterPanel, '');
    fireEvent.change(inputNode, {
      target: { value: 'basic string filter test' },
    });
    getByDisplayValue(postFilterPanel, 'basic string filter test');
    const ageNameCol = guaranteeNonNullable(
      cols.find((q) => queryByText(q, 'Age')),
      `Can't find age projection col`,
    );
    dragSource = getByTitle(ageNameCol, 'Drag Element');
    fireEvent.dragStart(dragSource);
    fireEvent.dragEnter(postFilterPanel);
    fireEvent.dragOver(postFilterPanel);
    fireEvent.drop(getByText(postFilterPanel, 'Add New Logical Group'));
    const postFilterNodes = queryAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
    );
    expect(postFilterNodes).toHaveLength(3);
    guaranteeNonNullable(
      postFilterNodes.find((e) => queryByText(e, 'and') !== null),
      `Expected an 'and' post filter node to be created`,
    );
    const ageNodeCreated = guaranteeNonNullable(
      postFilterNodes.find((e) => queryByText(e, 'Age') !== null),
      `Expected an 'Age' post filter node to be created`,
    );
    fireEvent.click(getByTitle(ageNodeCreated, 'Choose Operator...'));
    switchMenu = renderResult.getByRole('menu');
    guaranteeNonNullable(EXPECTED_STRING_TYPES[PRIMITIVE_TYPE.INTEGER]).forEach(
      (expectedOp) => getByText(switchMenu, expectedOp),
    );
    const ageInupNode = getByDisplayValue(postFilterPanel, 0);
    fireEvent.change(ageInupNode, {
      target: { value: 55 },
    });
    getByDisplayValue(postFilterPanel, 55);
    expect(
      queryByTitle(firstNameCol, `This column is used and can't be removed`),
    ).not.toBeNull();
    expect(
      queryByTitle(ageNameCol, `This column is used and can't be removed`),
    ).not.toBeNull();
    expect(TEST_DATA__lambda_builtPostFilterQuery).toEqual(
      queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
        queryBuilderState.buildQuery(),
      ),
    );
  },
);

test(
  integrationTest(
    'Query builder renders correctly condition with right side as column state',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates,
      stub_RawLambda(),
      'model::RelationalMapping',
      'model::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDates,
    );

    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__lambda_postFilterQueryWithRightValAsCol.parameters,
          TEST_DATA__lambda_postFilterQueryWithRightValAsCol.body,
        ),
      );
    });

    // gather all nodes
    const postFilterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
      ),
    );

    const node = getByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
    );
    expect(queryByText(node, 'First Name')).not.toBeNull();
    expect(queryByText(node, 'Last Name')).not.toBeNull();
    expect(queryByText(node, 'starts with')).not.toBeNull();
  },
);

type LambdaReturnTypeTestCase = [
  string,
  string,
  { parameters?: object; body?: object },
];

const cases: LambdaReturnTypeTestCase[] = [
  [
    'simple derived projection column',
    'simple',
    TEST_DATA__lambda_returnTypeSimple,
  ],
  [
    'derived property with const',
    'withConst',
    TEST_DATA__lambda_returnTypeWithConst,
  ],
  [
    'derived property with param',
    'withParam',
    TEST_DATA__lambda_returnTypeWithParam,
  ],
  [
    'derived property with const and param',
    'withBoth',
    TEST_DATA__lambda_returnTypeWithConstAndParam,
  ],
];

test(
  integrationTest(
    'Derived Projection Columns Lambdas are build correctly to fetch correct return type',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();
    pluginManager
      .usePresets([
        new Core_GraphManagerPreset(),
        new QueryBuilder_GraphManagerPreset(),
      ])
      .install();
    const applicationStore = new ApplicationStore(
      TEST__getGenericApplicationConfig(),
      pluginManager,
    );
    const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
    await TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates,
    );
    const queryBuilderState = new INTERNAL__BasicQueryBuilderState(
      applicationStore,
      graphManagerState,
      undefined,
    );
    // do the check using input and output lambda
    queryBuilderState.initializeWithQuery(
      new RawLambda(
        TEST_DATA__lambda_WithDerivedProjectColumnsUsingConstAndParams.parameters,
        TEST_DATA__lambda_WithDerivedProjectColumnsUsingConstAndParams.body,
      ),
    );
    const derivedProjCols = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    ).projectionColumns.filter(
      filterByType(QueryBuilderDerivationProjectionColumnState),
    );
    cases.forEach((_c) => {
      const colName = _c[1];
      const expectedLambda = _c[2];
      const actualLambda = guaranteeNonNullable(
        derivedProjCols.find((col) => col.columnName === colName),
        `Unable to find derived projection column '${colName}'`,
      ).getIsolatedRawLambda();
      const jsonQuery =
        queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
          actualLambda,
        );
      expect(expectedLambda).toEqual(jsonQuery);
    });
  },
);
