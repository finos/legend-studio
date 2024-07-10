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
  fireEvent,
  getByDisplayValue,
  getByTitle,
  queryAllByTitle,
  getByTestId,
  getAllByTestId,
  getByRole,
  getAllByText,
  findByDisplayValue,
  findByText,
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
  TEST_DATA__ModelCoverageAnalysisResult_QueryExecution_Entities,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDates,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
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
  selectFirstOptionFromCustomSelectorInput,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import TEST_DATA__QueryBuilder_Model_SimpleRelational from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelational.json' assert { type: 'json' };
import TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates.json' assert { type: 'json' };
import TEST_DATA_QueryBuilder_QueryExecution_Entities from './TEST_DATA_QueryBuilder_QueryExecution_Entities.json' assert { type: 'json' };

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
import { QueryBuilderAdvancedWorkflowState } from '../../stores/query-workflow/QueryBuilderWorkFlowState.js';
import { CUSTOM_DATE_PICKER_OPTION } from '../shared/CustomDatePicker.js';

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
        getByText(queryBuilderFilterPanel, '"2023-09-09T16:06:10"'),
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
    let nodeContainers = queryAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTAINER,
    );
    expect(nodeContainers.length).toBe(7);
    const andNode = guaranteeNonNullable(
      nodeContainers.find((n) => queryByText(n, 'and') !== null),
      'Unable to find and node',
    );
    expect(queryByTitle(andNode, 'Switch Operation')).not.toBeNull();
    const orNode = guaranteeNonNullable(
      nodeContainers.find((n) => queryByText(n, 'or') !== null),
      'Unable to find or node',
    );
    expect(queryByTitle(orNode, 'Switch Operation')).not.toBeNull();
    const testUniqueBasicPostFilterCondition = (
      columnname: string,
      operator: string,
      value: string | number,
      elements: HTMLElement[],
      options?: {
        valueIsInput?: boolean;
        shouldHaveResetButton?: boolean;
      },
      extraTitles?: string[],
    ): HTMLElement => {
      const element = guaranteeNonNullable(
        elements.find((n) => queryByText(n, columnname) !== null),
        `Can't find post filter condition with property ${columnname}`,
      );
      expect(getByText(element, columnname)).not.toBeNull();
      expect(getByText(element, operator)).not.toBeNull();
      expect(getByTitle(element, 'Remove')).not.toBeNull();
      expect(getByText(element, `"${value}"`)).not.toBeNull();
      if (options?.valueIsInput) {
        fireEvent.click(getByText(element, `"${value}"`));
        expect(getByDisplayValue(element, value)).not.toBeNull();
      }
      if (options?.shouldHaveResetButton) {
        expect(getByTitle(element, 'Reset')).not.toBeNull();
      }
      expect(getByTitle(element, 'Choose Operator...')).not.toBeNull();
      extraTitles?.forEach((title) =>
        expect(getByTitle(element, title)).not.toBeNull(),
      );
      if (options?.valueIsInput) {
        fireEvent.blur(getByDisplayValue(element, value));
      }
      return element;
    };
    let ageNode = testUniqueBasicPostFilterCondition(
      'Age',
      '>=',
      0,
      nodeContainers,
      { valueIsInput: true, shouldHaveResetButton: true },
      ['Evaluate Expression (Enter)'],
    );
    let firstNameNode = testUniqueBasicPostFilterCondition(
      'First Name',
      'ends with',
      'Testing',
      nodeContainers,
      { valueIsInput: true, shouldHaveResetButton: true },
    );

    let dobTimeNode = testUniqueBasicPostFilterCondition(
      'Dob Time',
      'is',
      '2023-09-30T11:47:13-0400',
      nodeContainers,
      { shouldHaveResetButton: false },
    );
    let dobDateNode = testUniqueBasicPostFilterCondition(
      'Dob Date',
      'is not',
      'One Year Ago',
      nodeContainers,
      { shouldHaveResetButton: false },
    );
    let strictDateNode = testUniqueBasicPostFilterCondition(
      'Dob Strict Date',
      '>',
      '2023-09-30',
      nodeContainers,
      { shouldHaveResetButton: false },
    );
    const constantPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_CONSTANTS),
    );
    const parameterPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    // dnd const `integerConst` -> Age Value
    const intConst = getByText(constantPanel, 'integerConst');
    const intValueDisplay = getByText(ageNode, '"0"');
    await dragAndDrop(
      intConst,
      intValueDisplay,
      postFilterPanel,
      'Change Filter Value',
    );
    nodeContainers = queryAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTAINER,
    );
    ageNode = guaranteeNonNullable(
      nodeContainers.find((e) => queryByText(e, 'Age') !== null),
    );
    expect(getByText(ageNode, 'Age')).not.toBeNull();
    expect(getByText(ageNode, '>=')).not.toBeNull();
    expect(getByText(ageNode, 'integerConst')).not.toBeNull();
    expect(getByText(ageNode, 'C')).not.toBeNull();

    // dnd const `stringConst` -> first Name Value
    const stringConst = getByText(constantPanel, 'stringConst');
    const stringValueDisplay = getByText(firstNameNode, '"Testing"');
    await dragAndDrop(
      stringConst,
      stringValueDisplay,
      postFilterPanel,
      'Change Filter Value',
    );
    nodeContainers = queryAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTAINER,
    );
    firstNameNode = guaranteeNonNullable(
      nodeContainers.find((e) => queryByText(e, 'First Name') !== null),
    );
    expect(getByText(firstNameNode, 'First Name')).not.toBeNull();
    expect(getByText(firstNameNode, 'ends with')).not.toBeNull();
    expect(getByText(firstNameNode, 'stringConst')).not.toBeNull();
    expect(getByText(firstNameNode, 'C')).not.toBeNull();

    // dnd const `dateFunction` -> Date Time Val
    const dateFunctionConst = getByText(constantPanel, 'dateFunction');
    const dateValueDisplay = getByText(
      dobTimeNode,
      '"2023-09-30T11:47:13-0400"',
    );
    await dragAndDrop(
      dateFunctionConst,
      dateValueDisplay,
      dobTimeNode,
      'Change Filter Value',
    );
    dobTimeNode = guaranteeNonNullable(
      nodeContainers.find((e) => queryByText(e, 'Dob Time') !== null),
    );
    expect(getByText(dobTimeNode, 'Dob Time')).not.toBeNull();
    expect(getByText(dobTimeNode, 'is')).not.toBeNull();
    expect(getByText(dobTimeNode, 'dateFunction')).not.toBeNull();
    expect(getByText(dobTimeNode, 'C')).not.toBeNull();

    // dnd const `absolute Date` -> Date Date
    const absoluteDateConst = getByText(constantPanel, 'absoluteDate');
    const dateTimeValueDisplay = getByText(dobDateNode, '"One Year Ago"');
    await dragAndDrop(
      absoluteDateConst,
      dateTimeValueDisplay,
      dobDateNode,
      'Change Filter Value',
    );
    dobDateNode = guaranteeNonNullable(
      nodeContainers.find((e) => queryByText(e, 'Dob Date') !== null),
    );
    expect(getByText(dobDateNode, 'Dob Date')).not.toBeNull();
    expect(getByText(dobDateNode, 'is not')).not.toBeNull();
    expect(getByText(dobDateNode, 'absoluteDate')).not.toBeNull();
    expect(getByText(dobDateNode, 'C')).not.toBeNull();

    // dnd param `dateParam` -> Date Date
    const dateParam = getByText(parameterPanel, 'dateParam');
    const strictDateValueDisplay = getByText(strictDateNode, '"2023-09-30"');
    await dragAndDrop(
      dateParam,
      strictDateValueDisplay,
      strictDateNode,
      'Change Filter Value',
    );
    strictDateNode = guaranteeNonNullable(
      nodeContainers.find((e) => queryByText(e, 'Dob Strict Date') !== null),
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
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
    );
    expect(filterNodes.length).toBe(9);
    // Remove all nodes
    while (
      queryAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
      ).length > 0
    ) {
      queryAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
      ).forEach((_node) => {
        if (queryByTitle(_node, 'Remove') !== null) {
          fireEvent.click(getByTitle(_node, 'Remove'));
        }
      });
    }

    expect(
      queryAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
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
    // check that there is 1 'and' node and 1 'or' node
    nodeContainers = queryAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTAINER,
    );
    expect(
      nodeContainers.filter((n) => queryByText(n, 'and') !== null),
    ).toHaveLength(1);
    expect(
      nodeContainers.filter((n) => queryByText(n, 'or') !== null),
    ).toHaveLength(1);
    // remove ageNode/first name node (should auto remove and node)
    fireEvent.click(getByTitle(ageNode, 'Remove'));
    nodeContainers = queryAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTAINER,
    );
    expect(nodeContainers.length).toBe(6);
    firstNameNode = guaranteeNonNullable(
      nodeContainers.find((n) => queryByText(n, 'First Name')),
    );
    fireEvent.click(getByTitle(firstNameNode, 'Remove'));
    nodeContainers = queryAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTAINER,
    );
    expect(nodeContainers.length).toBe(4);
    // check that there is 1 'or' node and no 'and' node
    expect(
      nodeContainers.filter((n) => queryByText(n, 'and') !== null),
    ).toHaveLength(0);
    expect(
      nodeContainers.filter((n) => queryByText(n, 'or') !== null),
    ).toHaveLength(1);

    // Remove all remaining post-filter nodes
    while (
      queryAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTAINER,
      ).length > 0
    ) {
      queryAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTAINER,
      ).forEach((_node) => {
        if (queryByTitle(_node, 'Remove') !== null) {
          fireEvent.click(getByTitle(_node, 'Remove'));
        }
      });
    }
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
    'is in list of',
    'is not in list of',
  ],
  [PRIMITIVE_TYPE.INTEGER]: [
    'is',
    'is not',
    '<',
    '<=',
    '>',
    '>=',
    'is in list of',
    'is not in list of',
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

    // remove all filter nodes
    while (
      queryAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
      ).length > 0
    ) {
      queryAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
      ).forEach((_node) => {
        if (queryByTitle(_node, 'Remove') !== null) {
          fireEvent.click(getByTitle(_node, 'Remove'));
        }
      });
    }
    expect(
      queryAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
      ),
    ).toHaveLength(0);

    // Remove all post filter nodes
    while (
      queryAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTAINER,
      ).length > 0
    ) {
      queryAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTAINER,
      ).forEach((_node) => {
        if (queryByTitle(_node, 'Remove') !== null) {
          fireEvent.click(getByTitle(_node, 'Remove'));
        }
      });
    }
    expect(
      queryAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTAINER,
      ),
    ).toHaveLength(0);

    // DND First Name from fetch structure to post-filter panel
    const cols = queryAllByTestId(
      tdsPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION_COLUMN,
    );
    expect(cols).toHaveLength(5);
    const firstNameCol = guaranteeNonNullable(
      cols.find((q) => queryByText(q, 'First Name')),
      `Can't find first name projectioncol`,
    );
    let dragSource = firstNameCol;
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
    // Check node is created correctly
    expect(queryByText(postFilterPanel, 'Fist Name'));
    expect(queryByText(postFilterPanel, 'is'));

    // Test is in list of operator
    fireEvent.click(getByTitle(postFilterPanel, 'Choose Operator...'));
    let switchMenu = renderResult.getByRole('menu');
    guaranteeNonNullable(EXPECTED_STRING_TYPES[PRIMITIVE_TYPE.STRING]).forEach(
      (expectedOp) => getByText(switchMenu, expectedOp),
    );
    fireEvent.click(getByText(switchMenu, 'is in list of'));
    expect(queryByText(postFilterPanel, 'List(empty)'));
    // Test doesn't contain operator
    fireEvent.click(getByTitle(postFilterPanel, 'Choose Operator...'));
    fireEvent.click(
      getByText(renderResult.getByRole('menu'), `doesn't contain`),
    );
    fireEvent.click(getByText(postFilterPanel, '""'));
    const inputNode = getByDisplayValue(postFilterPanel, '');
    fireEvent.change(inputNode, {
      target: { value: 'basic string filter test' },
    });
    fireEvent.blur(inputNode);
    getByText(postFilterPanel, '"basic string filter test"');

    // DND Age from fetch structure to First Name node in post-filter panel
    const ageNameCol = guaranteeNonNullable(
      cols.find((q) => queryByText(q, 'Age')),
      `Can't find age projection col`,
    );
    dragSource = ageNameCol;
    fireEvent.dragStart(dragSource);
    fireEvent.dragEnter(postFilterPanel);
    fireEvent.dragOver(postFilterPanel);
    fireEvent.drop(getByText(postFilterPanel, 'First Name'));
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

    // Test operators for int filter are available
    fireEvent.click(getByTitle(ageNodeCreated, 'Choose Operator...'));
    switchMenu = renderResult.getByRole('menu');
    guaranteeNonNullable(EXPECTED_STRING_TYPES[PRIMITIVE_TYPE.INTEGER]).forEach(
      (expectedOp) => getByText(switchMenu, expectedOp),
    );
    fireEvent.click(getByText(switchMenu, 'is'));
    // Test int filter vlaue
    fireEvent.click(getByText(postFilterPanel, '""'));
    const ageInputNode = await findByDisplayValue(postFilterPanel, '');
    fireEvent.change(ageInputNode, {
      target: { value: 55 },
    });
    fireEvent.blur(ageInputNode);
    getByText(postFilterPanel, '"55"');
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

test(
  integrationTest(
    'Query builder allows DND projection column to right side value of compatible post-filter condition',
  ),
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
      tdsState.setShowPostFilterPanel(true);
    });

    const postFilterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
      ),
    );
    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // DND from explorer to projection panel
    const firstNameExplorerDragSource = await waitFor(() =>
      getByText(explorerPanel, 'First Name'),
    );
    const lastNameExplorerDragSource = await waitFor(() =>
      getByText(explorerPanel, 'Last Name'),
    );
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    await dragAndDrop(
      firstNameExplorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    await dragAndDrop(
      lastNameExplorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );

    // DND First Name from projection panel to post-filter panel
    const firstNameTDSDragSource = await waitFor(() =>
      getByText(tdsProjectionPanel, 'First Name'),
    );
    const postFilterDropZone = await waitFor(() =>
      getByText(postFilterPanel, 'Add a post-filter condition'),
    );
    await dragAndDrop(
      firstNameTDSDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    await waitFor(() => getByText(postFilterPanel, 'First Name'));
    await waitFor(() => getByText(postFilterPanel, 'is'));
    let contentNodes = await waitFor(() =>
      getAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // DND Last Name from projection panel to First Name right-side value
    const lastNameTDSDragSource = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Last Name'),
    );
    await dragAndDrop(
      lastNameTDSDragSource,
      postFilterPanel,
      postFilterPanel,
      'Change Filter Value',
    );
    await waitFor(() => getByText(postFilterPanel, 'Last Name'));
    contentNodes = await waitFor(() =>
      getAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // DND First Name from projection panel to First Name right-side value to replace Last Name value
    await dragAndDrop(
      firstNameTDSDragSource,
      postFilterPanel,
      postFilterPanel,
      'Change Filter Value',
    );
    await waitFor(() =>
      expect(getAllByText(postFilterPanel, 'First Name')).toHaveLength(2),
    );
    contentNodes = await waitFor(() =>
      getAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Click remote button to reset the right-side value
    fireEvent.click(getByTitle(postFilterPanel, 'Reset'));
    await waitFor(() => getByText(postFilterPanel, 'First Name'));
  },
);

test(
  integrationTest(
    "Query builder doesn't allow DND projection column to right side value when types are incompatible",
  ),
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
      tdsState.setShowPostFilterPanel(true);
    });

    const postFilterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
      ),
    );
    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // DND from explorer to projection panel
    const firstNameExplorerDragSource = await waitFor(() =>
      getByText(explorerPanel, 'First Name'),
    );
    const ageExplorerDragSource = await waitFor(() =>
      getByText(explorerPanel, 'Age'),
    );
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    await dragAndDrop(
      firstNameExplorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    await dragAndDrop(
      ageExplorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );

    // DND First Name from projection panel to post-filter panel
    const firstNameTDSDragSource = await waitFor(() =>
      getByText(tdsProjectionPanel, 'First Name'),
    );
    const postFilterDropZone = await waitFor(() =>
      getByText(postFilterPanel, 'Add a post-filter condition'),
    );
    await dragAndDrop(
      firstNameTDSDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    await waitFor(() => getByText(postFilterPanel, 'First Name'));
    await waitFor(() => getByText(postFilterPanel, 'is'));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Check that DND Age from projection panel doesn't allow dropping on First Name right-side value
    const ageTDSDragSource = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Age'),
    );
    fireEvent.dragStart(ageTDSDragSource);
    expect(queryByText(postFilterPanel, 'Change Filter Value')).toBeNull();

    // Check that DND First Name from projection panel does show correct placeholder text
    fireEvent.dragStart(firstNameTDSDragSource);
    expect(getByText(postFilterPanel, 'Change Filter Value')).not.toBeNull();

    // DND First Name to right side value
    await dragAndDrop(
      firstNameTDSDragSource,
      postFilterPanel,
      postFilterPanel,
      'Change Filter Value',
    );

    // Check that DND Age from projection panel still doesn't allow dropping on First Name right-side value
    fireEvent.dragStart(ageTDSDragSource);
    expect(queryByText(postFilterPanel, 'Change Filter Value')).toBeNull();
  },
);

test(
  integrationTest(
    'Query builder creates new logical grouping when DND column over existing post-filter condition (but not on the right-side value)',
  ),
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
      tdsState.setShowPostFilterPanel(true);
    });

    const postFilterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
      ),
    );
    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // DND from explorer to projection panel
    const firstNameExplorerDragSource = await waitFor(() =>
      getByText(explorerPanel, 'First Name'),
    );
    const lastNameExplorerDragSource = await waitFor(() =>
      getByText(explorerPanel, 'Last Name'),
    );
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    await dragAndDrop(
      firstNameExplorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    await dragAndDrop(
      lastNameExplorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );

    // DND First Name from projection panel to post-filter panel
    const firstNameTDSDragSource = await waitFor(() =>
      getByText(tdsProjectionPanel, 'First Name'),
    );
    const postFilterDropZone = await waitFor(() =>
      getByText(postFilterPanel, 'Add a post-filter condition'),
    );
    await dragAndDrop(
      firstNameTDSDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    await waitFor(() => getByText(postFilterPanel, 'First Name'));
    await waitFor(() => getByText(postFilterPanel, 'is'));
    let contentNodes = await waitFor(() =>
      getAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // DND Last Name from projection panel to First Name left-side badge
    const lastNameTDSDragSource = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Last Name'),
    );
    await dragAndDrop(
      lastNameTDSDragSource,
      postFilterPanel,
      postFilterPanel,
      'First Name',
    );
    await waitFor(() => getByText(postFilterPanel, 'Last Name'));
    await waitFor(() =>
      expect(getAllByText(postFilterPanel, 'is')).toHaveLength(2),
    );
    await waitFor(() => getByText(postFilterPanel, 'and'));
    contentNodes = await waitFor(() =>
      getAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(3);
  },
);

test(
  integrationTest(
    `Query builder filter and post-filter show correct drop zone placeholders`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    const _firmClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_firmClass);
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      tdsState.setShowPostFilterPanel(true);
    });
    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );
    const postFilterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
      ),
    );
    const fetchStructurePanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FETCH_STRUCTURE,
      ),
    );

    // Drag and drop from explorer to filter
    const filterDropZone = await waitFor(() =>
      getByText(filterPanel, 'Add a filter condition'),
    );
    const explorerDragSource = await waitFor(() =>
      getByText(explorerPanel, 'Legal Name'),
    );
    await dragAndDrop(
      explorerDragSource,
      filterDropZone,
      filterPanel,
      'Add a filter condition',
    );
    await waitFor(() => getByText(filterPanel, 'Legal Name'));
    await waitFor(() => getByText(filterPanel, 'is'));
    await waitFor(() => getByDisplayValue(filterPanel, ''));

    // Drag and drop from explorer to fetch structure
    const tdsDropZone = await findByText(
      fetchStructurePanel,
      'Add a projection column',
    );
    await dragAndDrop(
      explorerDragSource,
      tdsDropZone,
      fetchStructurePanel,
      'Add a projection column',
    );
    await findByText(fetchStructurePanel, 'Legal Name');

    // Drag and drop from fetch structure to post-filter
    const fetchStructureDragSource = getByText(
      fetchStructurePanel,
      'Legal Name',
    );
    const postFilterDropZone = await findByText(
      postFilterPanel,
      'Add a post-filter condition',
    );
    await dragAndDrop(
      fetchStructureDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );

    // Dragging post-filter node doesn't activate main drop zone for filter panel or post-filter panel
    const postFilterNode = getByText(postFilterPanel, 'Legal Name');
    fireEvent.dragStart(postFilterNode);
    expect(queryByText(filterPanel, 'Add filter to main group')).toBeNull();
    expect(
      queryByText(postFilterPanel, 'Add post-filter to main group'),
    ).toBeNull();

    // Dragging TDS column does activate main drop zone for post-filter panel
    fireEvent.dragStart(fetchStructureDragSource);
    expect(
      await findByText(postFilterPanel, 'Add post-filter to main group'),
    ).not.toBeNull();

    // Dragging explorer node doesn't activate main drop zone for post-filter panel
    fireEvent.dragStart(explorerDragSource);
    expect(
      queryByText(postFilterPanel, 'Add post-filter to main group'),
    ).toBeNull();
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
      QueryBuilderAdvancedWorkflowState.INSTANCE,
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

test(
  integrationTest(
    `Query builder uses null as default value for string post-filter and shows validation error`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    const _firmClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_firmClass);
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      tdsState.setShowPostFilterPanel(true);
    });

    const postFilterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
      ),
    );
    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // Drag and drop
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    const postFilterDropZone = await waitFor(() =>
      getByText(postFilterPanel, 'Add a post-filter condition'),
    );
    const explorerDragSource = await waitFor(() =>
      getByText(explorerPanel, 'Legal Name'),
    );
    await dragAndDrop(
      explorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    const tdsDragSource = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Legal Name'),
    );
    await dragAndDrop(
      tdsDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    await waitFor(() => getByText(postFilterPanel, 'Legal Name'));
    await waitFor(() => getByText(postFilterPanel, 'is'));
    await waitFor(() => getByDisplayValue(postFilterPanel, ''));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Verify validation issue
    expect(getByText(postFilterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);

    // Enter value
    const filterValueInput = getByRole(postFilterPanel, 'textbox');
    fireEvent.change(filterValueInput, { target: { value: 'test' } });
    await waitFor(() => getByDisplayValue(postFilterPanel, 'test'));

    // Verify no validation issue
    expect(queryByText(postFilterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);

    // Delete value to set it to empty string
    fireEvent.change(filterValueInput, { target: { value: '' } });
    await waitFor(() => getByDisplayValue(postFilterPanel, ''));

    // Verify no validation issue
    expect(queryByText(postFilterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);

    // Click reset button
    fireEvent.click(getByTitle(postFilterPanel, 'Reset'));

    // Verify value is reset
    await waitFor(() => getByDisplayValue(postFilterPanel, ''));

    // Verify validation issue
    expect(getByText(postFilterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);
  },
);

test(
  integrationTest(
    `Query builder uses false as default value for boolean post-filter and shows no validation error`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    const _personClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Person');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      tdsState.setShowPostFilterPanel(true);
    });

    const postFilterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
      ),
    );
    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // Drag and drop
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    const postFilterDropZone = await waitFor(() =>
      getByText(postFilterPanel, 'Add a post-filter condition'),
    );
    const explorerDragSource = await waitFor(() =>
      getByText(explorerPanel, 'Is Active'),
    );
    await dragAndDrop(
      explorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    const tdsDragSource = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Is Active'),
    );
    await dragAndDrop(
      tdsDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    await waitFor(() => getByText(postFilterPanel, 'Is Active'));
    await waitFor(() => getByText(postFilterPanel, 'is'));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Verify no validation issues
    expect(queryByText(postFilterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);
  },
);

test(
  integrationTest(
    `Query builder uses null as default value for numerical post-filter and shows validation error`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    const _firmClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_firmClass);
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      tdsState.setShowPostFilterPanel(true);
    });

    const postFilterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
      ),
    );
    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // Drag and drop
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    const postFilterDropZone = await waitFor(() =>
      getByText(postFilterPanel, 'Add a post-filter condition'),
    );
    const explorerDragSource = await waitFor(() =>
      getByText(explorerPanel, 'Id'),
    );
    await dragAndDrop(
      explorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    const tdsDragSource = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Id'),
    );
    await dragAndDrop(
      tdsDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    await waitFor(() => getByText(postFilterPanel, 'Id'));
    await waitFor(() => getByText(postFilterPanel, 'is'));
    await waitFor(() => getByDisplayValue(postFilterPanel, ''));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Verify validation issue
    expect(getByText(postFilterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);

    // Enter value
    const filterValueInput = getByRole(postFilterPanel, 'textbox');
    fireEvent.change(filterValueInput, { target: { value: '123' } });

    // Verify no validation issues
    expect(queryByText(postFilterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);

    // Click reset button
    fireEvent.click(getByTitle(postFilterPanel, 'Reset'));

    // Verify value is reset
    await waitFor(() => getByDisplayValue(postFilterPanel, ''));

    // Verify validation issue
    expect(getByText(postFilterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);
  },
);

test(
  integrationTest(
    `Query builder uses null as default value for numerical post-filter on aggregate projection column and shows validation error`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    const _firmClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_firmClass);
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      tdsState.setShowPostFilterPanel(true);
    });

    const postFilterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
      ),
    );
    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // Drag and drop
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    const postFilterDropZone = await waitFor(() =>
      getByText(postFilterPanel, 'Add a post-filter condition'),
    );
    const explorerDragSource = await waitFor(() =>
      getByText(explorerPanel, 'Id'),
    );
    await dragAndDrop(
      explorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );

    fireEvent.click(
      getByTitle(tdsProjectionPanel, 'Choose Aggregate Operator...'),
    );
    fireEvent.click(renderResult.getByText('count'));
    const tdsDragSource = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Id (count)'),
    );
    await dragAndDrop(
      tdsDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    expect(queryBuilderState.canBuildQuery).toBe(false);

    await waitFor(() => getByText(postFilterPanel, 'Id (count)'));
    await waitFor(() => getByText(postFilterPanel, 'is'));
    await waitFor(() => getByDisplayValue(postFilterPanel, ''));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Verify validation issue
    expect(getByText(postFilterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);

    // Enter value
    const filterValueInput = getByRole(postFilterPanel, 'textbox');
    fireEvent.change(filterValueInput, { target: { value: '123' } });

    // Verify no validation issues
    expect(queryBuilderState.canBuildQuery).toBe(true);
    expect(queryByText(postFilterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);

    // Click reset button
    fireEvent.click(getByTitle(postFilterPanel, 'Reset'));

    // Verify value is reset
    await waitFor(() => getByDisplayValue(postFilterPanel, ''));

    // Verify validation issue
    expect(getByText(postFilterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);
  },
);

test(
  integrationTest(
    `Query builder uses null as default value for date post-filter and shows validation error`,
  ),
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
      tdsState.setShowPostFilterPanel(true);
    });

    const postFilterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
      ),
    );
    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // Drag and drop
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    const postFilterDropZone = await waitFor(() =>
      getByText(postFilterPanel, 'Add a post-filter condition'),
    );
    const explorerDragSource = await waitFor(() =>
      getByText(explorerPanel, 'Dob Date'),
    );
    await dragAndDrop(
      explorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    const tdsDragSource = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Dob Date'),
    );
    await dragAndDrop(
      tdsDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    await waitFor(() => getByText(postFilterPanel, 'Dob Date'));
    await waitFor(() => getByText(postFilterPanel, 'is'));
    await waitFor(() =>
      getByTitle(
        postFilterPanel,
        'Click to edit and pick from more date options',
      ),
    );
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Verify validation issue
    expect(getByText(postFilterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);

    // Select value
    const filterValueButton = getByTitle(
      postFilterPanel,
      'Click to edit and pick from more date options',
    );
    fireEvent.click(filterValueButton);
    fireEvent.click(renderResult.getByText(CUSTOM_DATE_PICKER_OPTION.TODAY));
    fireEvent.keyDown(
      renderResult.getByText(CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE),
      {
        key: 'Escape',
        code: 'Escape',
      },
    );

    // Verify no validation issues
    expect(getByText(postFilterPanel, '"Today"')).not.toBeNull();
    expect(queryByText(postFilterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);
  },
);

test(
  integrationTest(
    `Query builder uses null as default value for enum post-filter and shows validation error`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA_QueryBuilder_QueryExecution_Entities,
      stub_RawLambda(),
      'model::RelationalMapping',
      'model::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_QueryExecution_Entities,
    );

    const _firmClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_firmClass);
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      tdsState.setShowPostFilterPanel(true);
    });

    const postFilterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
      ),
    );
    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // Drag and drop
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    const postFilterDropZone = await waitFor(() =>
      getByText(postFilterPanel, 'Add a post-filter condition'),
    );
    const explorerDragSource = await waitFor(() =>
      getByText(explorerPanel, 'Inc Type'),
    );
    await dragAndDrop(
      explorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    const tdsDragSource = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Inc Type'),
    );
    await dragAndDrop(
      tdsDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    await waitFor(() => getByText(postFilterPanel, 'Inc Type'));
    await waitFor(() => getByText(postFilterPanel, 'is'));
    await waitFor(() => getByText(postFilterPanel, 'Select value'));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Verify validation issue
    expect(getByText(postFilterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);

    // Select value
    const filterValueDropdown = guaranteeNonNullable(
      getByText(postFilterPanel, 'Select value').parentElement?.parentElement,
    );
    selectFirstOptionFromCustomSelectorInput(filterValueDropdown, false, false);

    // Verify no validation issues
    expect(getByText(postFilterPanel, '"Corp"')).not.toBeNull();
    expect(queryByText(postFilterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);

    // Click reset button
    fireEvent.click(getByText(postFilterPanel, '"Corp"'));
    fireEvent.click(getByTitle(postFilterPanel, 'Reset'));

    // Verify value is reset
    await waitFor(() => getByText(postFilterPanel, 'Select value'));

    // Verify validation issue
    expect(getByText(postFilterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);
  },
);

test(
  integrationTest(
    `Query builder uses empty list as default value for list post-filter and shows validation error`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    const _firmClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_firmClass);
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      tdsState.setShowPostFilterPanel(true);
    });

    const postFilterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
      ),
    );
    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // Drag and drop
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    const postFilterDropZone = await waitFor(() =>
      getByText(postFilterPanel, 'Add a post-filter condition'),
    );
    const explorerDragSource = await waitFor(() =>
      getByText(explorerPanel, 'Legal Name'),
    );
    await dragAndDrop(
      explorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    const tdsDragSource = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Legal Name'),
    );
    await dragAndDrop(
      tdsDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    await waitFor(() => getByText(postFilterPanel, 'Legal Name'));
    await waitFor(() => getByText(postFilterPanel, 'is'));
    await waitFor(() => getByDisplayValue(postFilterPanel, ''));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Select "is in " operator
    fireEvent.click(getByTitle(postFilterPanel, 'Choose Operator...'));
    const operatorsMenu = renderResult.getByRole('menu');
    fireEvent.click(getByText(operatorsMenu, 'is in list of'));
    expect(getByText(postFilterPanel, 'List(empty)'));

    // Verify validation issue
    expect(getByText(postFilterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);

    // Enter values
    fireEvent.click(getByText(postFilterPanel, 'List(empty)'));
    const valueInput = getByRole(
      guaranteeNonNullable(getByText(postFilterPanel, 'Add').parentElement),
      'textbox',
    );
    fireEvent.change(valueInput, {
      target: { value: 'test1' },
    });
    try {
      fireEvent.blur(valueInput);
    } catch (e: unknown) {
      if (
        !(e instanceof Error) ||
        !e.message.includes(
          'MultiValue: Support for defaultProps will be removed from function components in a future major release',
        )
      ) {
        throw e;
      }
    }

    // Verify no validation issues
    expect(getByText(postFilterPanel, 'List(1): test1')).not.toBeNull();
    expect(queryByText(postFilterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);
  },
);
