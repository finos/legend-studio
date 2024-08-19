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

import { test, expect, describe } from '@jest/globals';
import {
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
  getByRole,
  findByDisplayValue,
  findByText,
  findByTitle,
  findAllByTestId,
  findAllByText,
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
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' with { type: 'json' };
import { integrationTest } from '@finos/legend-shared/test';
import {
  type DataType,
  type RawMappingModelCoverageAnalysisResult,
  Core_GraphManagerPreset,
  Enumeration,
  PRIMITIVE_TYPE,
  PrimitiveType,
  RawLambda,
  create_RawLambda,
  stub_RawLambda,
} from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  TEST__setUpQueryBuilder,
  dragAndDrop,
  selectFirstOptionFromCustomSelectorInput,
  selectFromCustomSelectorInput,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import TEST_DATA__QueryBuilder_Model_SimpleRelational from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelational.json' with { type: 'json' };
import TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates.json' with { type: 'json' };
import TEST_DATA_QueryBuilder_QueryExecution_Entities from './TEST_DATA_QueryBuilder_QueryExecution_Entities.json' with { type: 'json' };

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
import type { Entity } from '@finos/legend-storage';
import {
  getConstantNameInput,
  getConstantValueInput,
} from './QueryBuilderConstantsPanel.test.js';
import { getParameterNameInput } from './QueryBuilderParametersPanel.test.js';

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
    const queryBuilderFilterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
    );

    expect(
      await findByText(queryBuilderFilterPanel, '"2023-09-09T16:06:10"'),
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
    const postFilterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
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
    const constantPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_CONSTANTS,
    );
    const parameterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS,
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
    const filterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
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

    const tdsPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS,
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
    const postFilterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
    );

    const filterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
    );
    const tdsPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS,
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
    const postFilterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
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

    const postFilterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
    );
    const tdsProjectionPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
    );
    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );

    // DND from explorer to projection panel
    const firstNameExplorerDragSource = await findByText(
      explorerPanel,
      'First Name',
    );
    const lastNameExplorerDragSource = await findByText(
      explorerPanel,
      'Last Name',
    );
    const tdsProjectionDropZone = await findByText(
      tdsProjectionPanel,
      'Add a projection column',
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
    const firstNameTDSDragSource = await findByText(
      tdsProjectionPanel,
      'First Name',
    );
    const postFilterDropZone = await findByText(
      postFilterPanel,
      'Add a post-filter condition',
    );
    await dragAndDrop(
      firstNameTDSDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    await findByText(postFilterPanel, 'First Name');
    await findByText(postFilterPanel, 'is');
    let contentNodes = await findAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
    );
    expect(contentNodes.length).toBe(1);

    // DND Last Name from projection panel to First Name right-side value
    const lastNameTDSDragSource = await findByText(
      tdsProjectionPanel,
      'Last Name',
    );
    await dragAndDrop(
      lastNameTDSDragSource,
      postFilterPanel,
      postFilterPanel,
      'Change Filter Value',
    );
    await findByText(postFilterPanel, 'Last Name');
    contentNodes = await findAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
    );
    expect(contentNodes.length).toBe(1);

    // DND First Name from projection panel to First Name right-side value to replace Last Name value
    await dragAndDrop(
      firstNameTDSDragSource,
      postFilterPanel,
      postFilterPanel,
      'Change Filter Value',
    );
    expect(await findAllByText(postFilterPanel, 'First Name')).toHaveLength(2);
    contentNodes = await findAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
    );
    expect(contentNodes.length).toBe(1);

    // Click remote button to reset the right-side value
    fireEvent.click(getByTitle(postFilterPanel, 'Reset'));
    await findByText(postFilterPanel, 'First Name');
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

    const postFilterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
    );
    const tdsProjectionPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
    );
    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );

    // DND from explorer to projection panel
    const firstNameExplorerDragSource = await findByText(
      explorerPanel,
      'First Name',
    );
    const ageExplorerDragSource = await findByText(explorerPanel, 'Age');
    const tdsProjectionDropZone = await findByText(
      tdsProjectionPanel,
      'Add a projection column',
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
    const firstNameTDSDragSource = await findByText(
      tdsProjectionPanel,
      'First Name',
    );
    const postFilterDropZone = await findByText(
      postFilterPanel,
      'Add a post-filter condition',
    );
    await dragAndDrop(
      firstNameTDSDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    await findByText(postFilterPanel, 'First Name');
    await findByText(postFilterPanel, 'is');
    const contentNodes = await findAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
    );
    expect(contentNodes.length).toBe(1);

    // Check that DND Age from projection panel doesn't allow dropping on First Name right-side value
    const ageTDSDragSource = await findByText(tdsProjectionPanel, 'Age');
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
    'Query builder allows DND window function column to right side value of compatible post-filter condition',
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
      tdsState.setShowWindowFuncPanel(true);
    });

    const postFilterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
    );
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

    // DND Age from projection panel to post-filter panel
    const ageTDSDragSource = await findByText(tdsProjectionPanel, 'Age');
    const postFilterDropZone = await findByText(
      postFilterPanel,
      'Add a post-filter condition',
    );
    await dragAndDrop(
      ageTDSDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    await findByText(postFilterPanel, 'Age');
    await findByText(postFilterPanel, 'is');

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

    // Verify that window function column can be removed
    expect(
      getByTitle(windowFunctionPanel, 'Remove').hasAttribute('disabled'),
    ).toBe(false);

    // DND sum of Age from window function panel to post-filter condition value
    const sumOfAgeDragSource = await findByTitle(
      windowFunctionPanel,
      'Drag Element',
    );
    await dragAndDrop(
      sumOfAgeDragSource,
      postFilterPanel,
      postFilterPanel,
      'Change Filter Value',
    );
    await findByText(postFilterPanel, 'sum of Age');

    // Verify that window function column can not be removed
    expect(
      getByTitle(
        windowFunctionPanel,
        "This column is used in the post filter and can't be removed",
      ).hasAttribute('disabled'),
    ).toBe(true);

    // Click reset button to reset the right-side value
    fireEvent.click(getByTitle(postFilterPanel, 'Reset'));
    expect(queryByText(postFilterPanel, 'sum of Age')).toBeNull();

    // Verify that window function column can be removed
    expect(
      getByTitle(windowFunctionPanel, 'Remove').hasAttribute('disabled'),
    ).toBe(false);
  },
);

test(
  integrationTest(
    "Query builder doesn't allow DND window function column to right side value when types are incompatible",
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
      tdsState.setShowWindowFuncPanel(true);
    });

    const postFilterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
    );
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
    const firstNameExplorerDragSource = await findByText(
      explorerPanel,
      'First Name',
    );
    const tdsProjectionDropZone = await findByText(
      tdsProjectionPanel,
      'Add a projection column',
    );
    await dragAndDrop(
      firstNameExplorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );

    // DND First Name from projection panel to post-filter panel
    const firstNameTDSDragSource = await findByText(
      tdsProjectionPanel,
      'First Name',
    );
    const postFilterDropZone = await findByText(
      postFilterPanel,
      'Add a post-filter condition',
    );
    await dragAndDrop(
      firstNameTDSDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    await findByText(postFilterPanel, 'First Name');
    await findByText(postFilterPanel, 'is');

    // DND First Name from projection panel to window function panel
    const windowFunctionDropZone = await findByText(
      windowFunctionPanel,
      'Add Window Function Column',
    );
    await dragAndDrop(
      firstNameTDSDragSource,
      windowFunctionDropZone,
      windowFunctionPanel,
      'Add Window Function Column',
    );
    await findByText(windowFunctionPanel, 'First Name');
    await findByDisplayValue(windowFunctionPanel, 'sum of First Name');

    // Check that DND sum of First Name from window function panel doesn't allow dropping on First Name right-side value
    const sumOfFirstNameDragSource = await findByTitle(
      windowFunctionPanel,
      'Drag Element',
    );
    fireEvent.dragStart(sumOfFirstNameDragSource);
    expect(queryByText(postFilterPanel, 'Change Filter Value')).toBeNull();

    // Check that DND First Name from projection panel does show correct placeholder text
    fireEvent.dragStart(firstNameTDSDragSource);
    expect(getByText(postFilterPanel, 'Change Filter Value')).not.toBeNull();
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

    const postFilterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
    );
    const tdsProjectionPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
    );
    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );

    // DND from explorer to projection panel
    const firstNameExplorerDragSource = await findByText(
      explorerPanel,
      'First Name',
    );
    const lastNameExplorerDragSource = await findByText(
      explorerPanel,
      'Last Name',
    );
    const tdsProjectionDropZone = await findByText(
      tdsProjectionPanel,
      'Add a projection column',
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
    const firstNameTDSDragSource = await findByText(
      tdsProjectionPanel,
      'First Name',
    );
    const postFilterDropZone = await findByText(
      postFilterPanel,
      'Add a post-filter condition',
    );
    await dragAndDrop(
      firstNameTDSDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    await findByText(postFilterPanel, 'First Name');
    await findByText(postFilterPanel, 'is');
    let contentNodes = await findAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
    );
    expect(contentNodes.length).toBe(1);

    // DND Last Name from projection panel to First Name left-side badge
    const lastNameTDSDragSource = await findByText(
      tdsProjectionPanel,
      'Last Name',
    );
    await dragAndDrop(
      lastNameTDSDragSource,
      postFilterPanel,
      postFilterPanel,
      'First Name',
    );
    await findByText(postFilterPanel, 'Last Name');
    expect(await findAllByText(postFilterPanel, 'is')).toHaveLength(2);
    await findByText(postFilterPanel, 'and');
    contentNodes = await findAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
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
    const filterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
    );
    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );
    const postFilterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
    );
    const fetchStructurePanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FETCH_STRUCTURE,
    );

    // Drag and drop from explorer to filter
    const filterDropZone = await findByText(
      filterPanel,
      'Add a filter condition',
    );
    const explorerDragSource = await findByText(explorerPanel, 'Legal Name');
    await dragAndDrop(
      explorerDragSource,
      filterDropZone,
      filterPanel,
      'Add a filter condition',
    );
    await findByText(filterPanel, 'Legal Name');
    await findByText(filterPanel, 'is');
    await findByDisplayValue(filterPanel, '');

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
    'Query builder shows error when constant and parameter types become invalid',
  ),
  async () => {
    // Set up query
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
      queryBuilderState.setShowParametersPanel(true);
      queryBuilderState.constantState.setShowConstantPanel(true);
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      tdsState.setShowPostFilterPanel(true);
    });

    // DND property from explorer panel to fetch structure panel
    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );
    const fetchStructurePanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FETCH_STRUCTURE,
    );
    const explorerDragSource = await findByText(explorerPanel, 'Legal Name');
    const fetchStructureDropZone = await findByText(
      fetchStructurePanel,
      'Add a projection column',
    );
    await dragAndDrop(
      explorerDragSource,
      fetchStructureDropZone,
      fetchStructurePanel,
      'Add a projection column',
    );
    await findByText(fetchStructurePanel, 'Legal Name');

    // DND property from fetch structure panel to post-filter panel
    const fetchStructureDragSource = await findByText(
      fetchStructurePanel,
      'Legal Name',
    );
    const postFilterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
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
    await findByText(postFilterPanel, 'Legal Name');
    await findByText(postFilterPanel, 'is');

    // Create constant of type string
    const constantsPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_CONSTANTS,
    );
    fireEvent.click(getByTitle(constantsPanel, 'Add Constant'));
    const constantNameInput = getConstantNameInput(renderResult);
    let constantValueInput = getConstantValueInput(renderResult);
    fireEvent.change(constantNameInput, { target: { value: 'c_var_1' } });
    fireEvent.change(constantValueInput, { target: { value: 'test' } });
    fireEvent.click(renderResult.getByRole('button', { name: 'Create' }));

    // Drag and drop constant to post-filter panel value
    const constantDragSource = await findByText(constantsPanel, 'c_var_1');
    await dragAndDrop(
      constantDragSource,
      postFilterPanel,
      postFilterPanel,
      'Change Filter Value',
    );

    // Verify no validation error
    expect(queryByText(postFilterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);

    // Change constant type
    fireEvent.click(getByText(constantsPanel, 'c_var_1'));
    let typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    selectFromCustomSelectorInput(typeContainer, 'Number');
    constantValueInput = getConstantValueInput(renderResult);
    fireEvent.change(constantValueInput, { target: { value: '5' } });
    fireEvent.click(renderResult.getByRole('button', { name: 'Apply' }));

    // Verify 1 validation error
    expect(getByText(postFilterPanel, '1 issue')).not.toBeNull();
    expect(
      getByTitle(
        postFilterPanel,
        'Filter value for Legal Name is missing or invalid',
        { exact: false },
      ),
    ).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);

    // Create parameter of type string
    const parametersPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS,
    );
    fireEvent.click(getByTitle(parametersPanel, 'Add Parameter'));
    const parameterNameInput = getParameterNameInput(renderResult);
    fireEvent.change(parameterNameInput, { target: { value: 'p_var_1' } });
    fireEvent.click(renderResult.getByRole('button', { name: 'Create' }));

    // Drag and drop parameter to post-filter panel value
    const parameterDragSource = await findByText(parametersPanel, 'p_var_1');
    await dragAndDrop(
      parameterDragSource,
      postFilterPanel,
      postFilterPanel,
      'Change Filter Value',
    );

    // Verify no validation error
    expect(queryByText(postFilterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);

    // Change parameter type
    fireEvent.click(getByText(parametersPanel, 'p_var_1'));
    typeContainer = guaranteeNonNullable(
      renderResult.getByText('Type').parentElement,
    );
    selectFromCustomSelectorInput(typeContainer, 'Number');
    fireEvent.click(renderResult.getByRole('button', { name: 'Update' }));

    // Verify 1 validation error
    expect(getByText(postFilterPanel, '1 issue')).not.toBeNull();
    expect(
      getByTitle(
        postFilterPanel,
        'Filter value for Legal Name is missing or invalid',
        { exact: false },
      ),
    ).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);
  },
);

type PostFilterPanelDefaultValueTestCase = {
  testName: string;
  querySetup: {
    entities: Entity[];
    modelCoverageAnalysisResult: RawMappingModelCoverageAnalysisResult;
    mapping: string;
    runtime: string;
  };
  testClass: string;
  property: string;
  propertyType: DataType;
  valueToSet: string | CUSTOM_DATE_PICKER_OPTION;
  allowEmptyValue?: boolean;
  aggregate?: string;
};

const POST_FILTER_PANEL_DEFAULT_VALUE_TEST_CASES: PostFilterPanelDefaultValueTestCase[] =
  [
    {
      testName: `Query builder uses null as default value for string post-filter and shows validation error`,
      querySetup: {
        entities: TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates,
        modelCoverageAnalysisResult:
          TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDates,
        mapping: 'model::RelationalMapping',
        runtime: 'model::Runtime',
      },
      testClass: 'model::Person',
      property: 'First Name',
      propertyType: PrimitiveType.STRING,
      valueToSet: 'test',
      allowEmptyValue: true,
    },
    {
      testName: `Query builder uses null as default value for numerical post-filter and shows validation error`,
      querySetup: {
        entities: TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates,
        modelCoverageAnalysisResult:
          TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDates,
        mapping: 'model::RelationalMapping',
        runtime: 'model::Runtime',
      },
      testClass: 'model::Person',
      property: 'Age',
      propertyType: PrimitiveType.INTEGER,
      valueToSet: '123',
    },
    {
      testName: `Query builder uses null as default value for numerical post-filter on aggregate projection column and shows validation error`,
      querySetup: {
        entities: TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates,
        modelCoverageAnalysisResult:
          TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDates,
        mapping: 'model::RelationalMapping',
        runtime: 'model::Runtime',
      },
      testClass: 'model::Person',
      property: 'Age',
      propertyType: PrimitiveType.INTEGER,
      valueToSet: '123',
      aggregate: 'count',
    },
    {
      testName: `Query builder uses null as default value for date post-filter and shows validation error`,
      querySetup: {
        entities: TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates,
        modelCoverageAnalysisResult:
          TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDates,
        mapping: 'model::RelationalMapping',
        runtime: 'model::Runtime',
      },
      testClass: 'model::Person',
      property: 'Dob Date',
      propertyType: PrimitiveType.DATE,
      valueToSet: CUSTOM_DATE_PICKER_OPTION.TODAY,
    },
    {
      testName: `Query builder uses null as default value for enum post-filter and shows validation error`,
      querySetup: {
        entities: TEST_DATA_QueryBuilder_QueryExecution_Entities,
        modelCoverageAnalysisResult:
          TEST_DATA__ModelCoverageAnalysisResult_QueryExecution_Entities,
        mapping: 'model::RelationalMapping',
        runtime: 'model::Runtime',
      },
      testClass: 'model::Firm',
      property: 'Inc Type',
      propertyType: Enumeration.prototype,
      valueToSet: 'Corp',
    },
  ];

describe(integrationTest('Post-filter default values are properly set'), () => {
  test.each(POST_FILTER_PANEL_DEFAULT_VALUE_TEST_CASES)(
    '$testName',
    async (testCase: PostFilterPanelDefaultValueTestCase) => {
      const {
        testClass,
        querySetup: { entities, mapping, runtime, modelCoverageAnalysisResult },
        property,
        propertyType,
        valueToSet,
        allowEmptyValue,
        aggregate,
      } = testCase;
      const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
        entities,
        stub_RawLambda(),
        mapping,
        runtime,
        modelCoverageAnalysisResult,
      );

      // Set up the query builder
      const _class =
        queryBuilderState.graphManagerState.graph.getClass(testClass);
      await act(async () => {
        queryBuilderState.changeClass(_class);
        const tdsState = guaranteeType(
          queryBuilderState.fetchStructureState.implementation,
          QueryBuilderTDSState,
        );
        tdsState.setShowPostFilterPanel(true);
      });

      const postFilterPanel = await renderResult.findByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
      );
      const tdsProjectionPanel = await renderResult.findByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      );
      const explorerPanel = await renderResult.findByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
      );

      // Drag and drop property to fetch structure panel and post-filter panel
      const explorerDragSource = await findByText(explorerPanel, property);
      const tdsProjectionDropZone = await findByText(
        tdsProjectionPanel,
        'Add a projection column',
      );
      await dragAndDrop(
        explorerDragSource,
        tdsProjectionDropZone,
        tdsProjectionPanel,
        'Add a projection column',
      );

      if (aggregate) {
        fireEvent.click(
          getByTitle(tdsProjectionPanel, 'Choose Aggregate Operator...'),
        );
        fireEvent.click(renderResult.getByText(aggregate));
      }

      // Drag and drop proerty to post-filter panel
      const tdsDragSource = await findByText(
        tdsProjectionPanel,
        `${property}${aggregate ? ` (${aggregate})` : ''}`,
      );
      const postFilterDropZone = await findByText(
        postFilterPanel,
        'Add a post-filter condition',
      );
      await dragAndDrop(
        tdsDragSource,
        postFilterDropZone,
        postFilterPanel,
        'Add a post-filter condition',
      );
      await findByText(
        postFilterPanel,
        `${property}${aggregate ? ` (${aggregate})` : ''}`,
      );
      await findByText(postFilterPanel, 'is');
      if (propertyType === PrimitiveType.DATE) {
        await findByTitle(
          postFilterPanel,
          'Click to edit and pick from more date options',
        );
      } else if (propertyType === Enumeration.prototype) {
        await findByText(postFilterPanel, 'Select value');
      } else {
        await findByDisplayValue(postFilterPanel, '');
      }
      const contentNodes = await findAllByTestId(
        postFilterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
      );
      expect(contentNodes.length).toBe(1);

      // Verify validation issue
      expect(getByText(postFilterPanel, '1 issue')).not.toBeNull();
      expect(
        renderResult.getByRole('button', { name: 'Run Query' }),
      ).toHaveProperty('disabled', true);

      // Enter value
      if (propertyType === PrimitiveType.DATE) {
        const filterValueButton = getByTitle(
          postFilterPanel,
          'Click to edit and pick from more date options',
        );
        fireEvent.click(filterValueButton);
        fireEvent.click(renderResult.getByText(valueToSet));
        fireEvent.keyDown(
          renderResult.getByText(CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE),
          {
            key: 'Escape',
            code: 'Escape',
          },
        );
        expect(getByText(postFilterPanel, `"${valueToSet}"`)).not.toBeNull();
      } else if (propertyType === Enumeration.prototype) {
        const filterValueDropdown = guaranteeNonNullable(
          getByText(postFilterPanel, 'Select value').parentElement
            ?.parentElement,
        );
        selectFirstOptionFromCustomSelectorInput(
          filterValueDropdown,
          false,
          false,
        );
        expect(getByText(postFilterPanel, `"${valueToSet}"`)).not.toBeNull();
      } else {
        const filterValueInput = getByRole(postFilterPanel, 'textbox');
        fireEvent.change(filterValueInput, {
          target: { value: valueToSet },
        });
        await findByDisplayValue(postFilterPanel, valueToSet);
      }

      // Verify no validation issue
      expect(queryByText(postFilterPanel, '1 issue')).toBeNull();
      expect(
        renderResult.getByRole('button', { name: 'Run Query' }),
      ).toHaveProperty('disabled', false);

      if (allowEmptyValue) {
        // Delete value to set it to empty string
        const filterValueInput = getByRole(postFilterPanel, 'textbox');
        fireEvent.change(filterValueInput, { target: { value: '' } });
        await findByDisplayValue(postFilterPanel, '');

        // Verify no validation issue
        expect(queryByText(postFilterPanel, '1 issue')).toBeNull();
        expect(
          renderResult.getByRole('button', { name: 'Run Query' }),
        ).toHaveProperty('disabled', false);
      }

      if (propertyType !== PrimitiveType.DATE) {
        if (propertyType === Enumeration.prototype) {
          fireEvent.click(getByText(postFilterPanel, `"${valueToSet}"`));
        }

        // Click reset button
        fireEvent.click(getByTitle(postFilterPanel, 'Reset'));

        // Verify value is reset
        if (propertyType === Enumeration.prototype) {
          await findByText(postFilterPanel, 'Select value');
        } else {
          await findByDisplayValue(postFilterPanel, '');
        }

        // Verify validation issue
        expect(getByText(postFilterPanel, '1 issue')).not.toBeNull();
        expect(
          renderResult.getByRole('button', { name: 'Run Query' }),
        ).toHaveProperty('disabled', true);
      }
    },
  );
});

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

    const postFilterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
    );
    const tdsProjectionPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
    );
    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );

    // Drag and drop
    const tdsProjectionDropZone = await findByText(
      tdsProjectionPanel,
      'Add a projection column',
    );
    const postFilterDropZone = await findByText(
      postFilterPanel,
      'Add a post-filter condition',
    );
    const explorerDragSource = await findByText(explorerPanel, 'Is Active');
    await dragAndDrop(
      explorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    const tdsDragSource = await findByText(tdsProjectionPanel, 'Is Active');
    await dragAndDrop(
      tdsDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    await findByText(postFilterPanel, 'Is Active');
    await findByText(postFilterPanel, 'is');
    const contentNodes = await findAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
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

    const postFilterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
    );
    const tdsProjectionPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
    );
    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );

    // Drag and drop
    const tdsProjectionDropZone = await findByText(
      tdsProjectionPanel,
      'Add a projection column',
    );
    const postFilterDropZone = await findByText(
      postFilterPanel,
      'Add a post-filter condition',
    );
    const explorerDragSource = await findByText(explorerPanel, 'Legal Name');
    await dragAndDrop(
      explorerDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    const tdsDragSource = await findByText(tdsProjectionPanel, 'Legal Name');
    await dragAndDrop(
      tdsDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );
    await findByText(postFilterPanel, 'Legal Name');
    await findByText(postFilterPanel, 'is');
    await findByDisplayValue(postFilterPanel, '');
    const contentNodes = await findAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
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
