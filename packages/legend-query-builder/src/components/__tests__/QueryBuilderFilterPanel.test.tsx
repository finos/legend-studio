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

import { expect, test } from '@jest/globals';
import {
  waitFor,
  fireEvent,
  getByTitle,
  getByText,
  act,
  getAllByText,
  queryByText,
  queryAllByTestId,
  queryByTitle,
  queryByDisplayValue,
  getByDisplayValue,
  getByTestId,
  getAllByTestId,
  findByText,
} from '@testing-library/react';
import {
  TEST_DATA__lambda_simpleConstantWithDatesAndCalcualted,
  TEST_DATA__simpeFilterWithMilestonedExists,
  TEST_DATA__simpleFilterWithAndCondition,
  TEST_DATA__simpleFilterWithDateTimeWithSeconds,
  TEST_DATA__simpleFilterWithGroupOperationAndExists,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import {
  TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDates,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
} from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import { integrationTest } from '@finos/legend-shared/test';
import { create_RawLambda, stub_RawLambda } from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  TEST__setUpQueryBuilder,
  dragAndDrop,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import TEST_DATA__QueryBuilder_Model_SimpleRelational from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelational.json';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' assert { type: 'json' };
import TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates.json' assert { type: 'json' };
import { guaranteeNonNullable } from '@finos/legend-shared';

test(
  integrationTest(
    'Query builder loads simple exists filter node which is milestoned',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__simpeFilterWithMilestonedExists.parameters,
          TEST_DATA__simpeFilterWithMilestonedExists.body,
        ),
      );
    });

    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    await waitFor(() => getByText(filterPanel, 'Pincode'));
    await waitFor(() =>
      getByTitle(filterPanel, 'Set Derived Property Argument(s)...'),
    );
    fireEvent.click(
      getByTitle(filterPanel, 'Set Derived Property Argument(s)...'),
    );
    const dpModal = await waitFor(() => renderResult.getByRole('dialog'));
    await waitFor(() => getByText(dpModal, 'Derived Property'));
    await waitFor(() => getAllByText(dpModal, 'businessDate'));
  },
);

test(
  integrationTest('Query builder loads simple filter with DateTime value'),
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
          TEST_DATA__simpleFilterWithDateTimeWithSeconds.body,
        ),
      );
    });
    const queryBuilderFilterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );

    expect(
      await waitFor(() =>
        getByText(queryBuilderFilterPanel, '2023-09-09T13:31:00'),
      ),
    ).not.toBeNull();
  },
);

test(
  integrationTest('Query builder loads grouped filter panels using constants'),
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
    const filterTree = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE),
    );
    const nodes = queryAllByTestId(
      filterTree,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE,
    );
    expect(nodes.length).toBe(9);
    let contentNodes = queryAllByTestId(
      filterTree,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
    );
    expect(contentNodes.length).toBe(9);

    const testBasicConstantContent = (
      property: string,
      operator: string,
      value: string,
      elements: HTMLElement[],
      options?: {
        isParam?: boolean;
        isConstant?: boolean;
      },
    ): HTMLElement => {
      const element = guaranteeNonNullable(
        elements.find(
          (n) =>
            queryByText(n, property) !== null && queryByText(n, value) !== null,
        ),
        `Can't find filter condition with property ${property} and value with ${value}`,
      );
      expect(queryByText(element, property)).not.toBeNull();
      expect(queryByText(element, operator)).not.toBeNull();
      expect(queryByTitle(element, 'Remove')).not.toBeNull();
      expect(queryByTitle(element, 'Reset')).not.toBeNull();
      expect(queryByTitle(element, 'Choose Operator...')).not.toBeNull();
      if (options?.isConstant) {
        expect(queryByText(element, 'C')).not.toBeNull();
      }
      return element;
    };
    // test and block
    let contentAndNode = guaranteeNonNullable(
      contentNodes.filter((node) => queryByText(node, 'and'))[0],
    );
    getByTitle(contentAndNode, 'Switch Operation');
    getByTitle(contentAndNode, 'Remove');
    testBasicConstantContent('Age', '<', 'integerConst', contentNodes, {
      isConstant: true,
    });
    testBasicConstantContent('Dob Date', '<', 'dateFunction', contentNodes, {
      isConstant: true,
    });
    testBasicConstantContent(
      'Dob Strict Date',
      '>',
      'absoluteDate',
      contentNodes,
      {
        isConstant: true,
      },
    );
    testBasicConstantContent('Dob Time', '>=', 'dateParam', contentNodes);

    // test or block

    const orNode = guaranteeNonNullable(
      nodes.filter(
        (node) =>
          queryByText(node, 'or') !== null && queryByText(node, 'and') === null,
      )[0],
    );
    const contentOrNodes = queryAllByTestId(
      orNode,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
    );
    expect(contentOrNodes.length).toBe(4);
    testBasicConstantContent('Dob Date', '<', 'dateParam', contentOrNodes);
    testBasicConstantContent('Dob Time', '<', 'dateParam', contentOrNodes);
    const strictDateNode = testBasicConstantContent(
      'Dob Strict Date',
      '>',
      'dateParam',
      contentOrNodes,
    );
    // operations

    // remove single node from or group
    fireEvent.click(getByTitle(strictDateNode, 'Remove'));
    expect(
      queryAllByTestId(
        filterTree,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE,
      ).length,
    ).toBe(8);
    // remove or group
    let contentOrNode = guaranteeNonNullable(
      contentOrNodes.find((e) => queryByText(e, 'or') !== null),
    );
    fireEvent.click(getByTitle(contentOrNode, 'Remove'));
    contentNodes = queryAllByTestId(
      filterTree,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
    );
    expect(contentNodes.length).toBe(5);
    contentAndNode = guaranteeNonNullable(
      contentNodes.filter((node) => queryByText(node, 'and'))[0],
    );

    // switch operations
    fireEvent.click(getByTitle(contentAndNode, 'Switch Operation'));
    expect(queryByText(filterTree, 'and')).toBeNull();
    contentNodes = queryAllByTestId(
      filterTree,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
    );
    contentOrNode = guaranteeNonNullable(
      contentNodes.find((e) => queryByText(e, 'or') !== null),
    );
    const ageFilterCondition = guaranteeNonNullable(
      contentNodes.filter((e) => queryByText(e, 'Age') !== null)[0],
    );
    expect(queryByText(ageFilterCondition, 'integerConst')).not.toBeNull();
    fireEvent.click(getByTitle(ageFilterCondition, 'Reset'));
    expect(queryByDisplayValue(ageFilterCondition, 0)).not.toBeNull();
    expect(
      queryByTitle(ageFilterCondition, 'Evaluate Expression (Enter)'),
    ).not.toBeNull();
    // delete all nodes expect age (should auto delete or node)
    queryAllByTestId(
      filterTree,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
    ).forEach((_node) => {
      if (
        queryByText(_node, 'or') === null &&
        queryByText(_node, 'Age') === null
      ) {
        fireEvent.click(getByTitle(_node, 'Remove'));
      }
    });
    contentNodes = queryAllByTestId(
      filterTree,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
    );
    expect(contentNodes.length).toBe(1);
    const ageNode = guaranteeNonNullable(contentNodes[0]);
    expect(getByText(ageNode, 'Age')).not.toBeNull();
    const ageValue = getByDisplayValue(ageNode, 0);
    // drag and drop
    const constantPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_CONSTANTS),
    );
    const intConst = getByText(constantPanel, 'integerConst');
    await dragAndDrop(intConst, ageValue, filterTree, 'Change Filter Value');
    const alteredNode = getByTestId(
      filterTree,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
    );
    // check node has been altered by dropped constant
    expect(getByText(alteredNode, 'Age')).not.toBeNull();
    expect(getByText(alteredNode, '<')).not.toBeNull();
    expect(getByText(alteredNode, 'integerConst')).not.toBeNull();
    expect(getByText(alteredNode, 'C')).not.toBeNull();
  },
);

test(
  integrationTest(`Query builder loads simple filter node when we DnD it`),
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
    });
    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // Drag and drop
    const dropZone = await waitFor(() =>
      getByText(filterPanel, 'Add a filter condition'),
    );
    const dragSource = await waitFor(() =>
      getByText(explorerPanel, 'Legal Name'),
    );
    await dragAndDrop(
      dragSource,
      dropZone,
      filterPanel,
      'Add a filter condition',
    );
    await waitFor(() => getByText(filterPanel, 'Legal Name'));
    await waitFor(() => getByText(filterPanel, 'is'));
    await waitFor(() => getByDisplayValue(filterPanel, ''));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);
  },
);

test(
  integrationTest(
    `Query builder loads simple filter with 'AND' condition when we DnD`,
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
    });
    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // Drag and drop
    let dropZone = await waitFor(() =>
      getByText(filterPanel, 'Add a filter condition'),
    );
    let dragSource = await waitFor(() =>
      getByText(explorerPanel, 'Legal Name'),
    );
    await dragAndDrop(
      dragSource,
      dropZone,
      filterPanel,
      'Add a filter condition',
    );
    await waitFor(() => getByText(filterPanel, 'Legal Name'));
    await waitFor(() => getByText(filterPanel, 'is'));
    await waitFor(() => getByDisplayValue(filterPanel, ''));
    let contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    const filterTree = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE),
    );
    dropZone = filterTree;
    dragSource = await waitFor(() => getByText(explorerPanel, 'Id'));
    await dragAndDrop(
      dragSource,
      dropZone,
      filterPanel,
      'Add filter to main group',
    );
    await waitFor(() => getByText(filterPanel, 'Id'));
    contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(3);
    const idFilterNode = guaranteeNonNullable(contentNodes[2]);
    await waitFor(() => getByText(idFilterNode, 'Id'));
    await waitFor(() => getByText(idFilterNode, 'is'));
    await waitFor(() => getByDisplayValue(idFilterNode, '0'));
  },
);

test(
  integrationTest(
    `Query builder loads simple exists filter node when we DnD it to create new group condition with property that doesn't require exists`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__simpleFilterWithAndCondition.parameters,
          TEST_DATA__simpleFilterWithAndCondition.body,
        ),
      );
    });

    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );
    await waitFor(() => getByText(filterPanel, 'Legal Name'));
    await waitFor(() => getByText(filterPanel, 'Id'));

    let filterTreeNodes = await waitFor(() =>
      renderResult.getAllByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(filterTreeNodes.length).toBe(3);

    // Drag and drop
    const legalNameFilterTreeNode = guaranteeNonNullable(
      filterTreeNodes.find((n) => queryByText(n, 'Legal Name') !== null),
    );
    const dropZone = await waitFor(() =>
      getByTestId(
        legalNameFilterTreeNode,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_CONTENT,
      ),
    );
    await waitFor(() => getByText(explorerPanel, 'Employees'));
    fireEvent.click(getByText(explorerPanel, 'Employees'));
    const dragSource = await waitFor(() =>
      getByText(explorerPanel, 'First Name'),
    );
    fireEvent.dragStart(dragSource);
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    await findByText(legalNameFilterTreeNode, 'Add New Logical Group');
    fireEvent.drop(getByText(legalNameFilterTreeNode, 'Add New Logical Group'));
    fireEvent.click(renderResult.getByText('Proceed'));
    await waitFor(() => getByText(filterPanel, 'Employees'));
    await waitFor(() => getByText(filterPanel, 'First Name'));
    filterTreeNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(filterTreeNodes.length).toBe(6);
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[0]), 'and'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[1]), 'Id'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[2]), 'and'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[3]), 'Legal Name'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[4]), 'Employees'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[4]), 'exists'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[5]), 'First Name'),
    );
  },
);

test(
  integrationTest(
    `Query builder loads simple filter node when we DnD it to create new group condition with property that requires exists`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__simpleFilterWithGroupOperationAndExists.parameters,
          TEST_DATA__simpleFilterWithGroupOperationAndExists.body,
        ),
      );
    });

    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );
    await waitFor(() => getByText(filterPanel, 'Employees'));
    await waitFor(() => getByText(filterPanel, 'First Name'));
    await waitFor(() => getByText(filterPanel, 'Id'));

    let filterTreeNodes = await waitFor(() =>
      renderResult.getAllByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(filterTreeNodes.length).toBe(4);

    // Drag and drop
    const firstNameFilterTreeNode = guaranteeNonNullable(
      filterTreeNodes.find((n) => queryByText(n, 'First Name') !== null),
    );
    const dropZone = await waitFor(() =>
      getByTestId(
        firstNameFilterTreeNode,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_CONTENT,
      ),
    );
    const dragSource = await waitFor(() =>
      getByText(explorerPanel, 'Legal Name'),
    );
    await dragAndDrop(
      dragSource,
      dropZone,
      firstNameFilterTreeNode,
      'Add New Logical Group',
    );
    await waitFor(() => getByText(filterPanel, 'Employees'));
    await waitFor(() => getByText(filterPanel, 'First Name'));
    filterTreeNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(filterTreeNodes.length).toBe(6);
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[0]), 'and'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[1]), 'Id'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[2]), 'and'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[3]), 'Employees'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[3]), 'exists'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[4]), 'First Name'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[5]), 'Legal Name'),
    );
  },
);
