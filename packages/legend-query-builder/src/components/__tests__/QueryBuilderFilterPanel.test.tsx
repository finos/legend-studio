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

import { expect, test, describe } from '@jest/globals';
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
  TEST_DATA__simpleFilterWithThreeNodes,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import {
  TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
  TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
  TEST_DATA__ModelCoverageAnalysisResult_NestedSubtype,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDates,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
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
import TEST_MilestoningModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_Milestoning.json' assert { type: 'json' };
import {
  TEST_DATA__simpleFilterWithBiTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleFilterWithBiTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleFilterWithBiTemporalSourceAndProcessingTemporalTarget,
  TEST_DATA__simpleFilterWithBusinessTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleFilterWithBusinessTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleFilterWithBusinessTemporalSourceAndProcessingTemporalTarget,
  TEST_DATA__simpleFilterWithNonTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleFilterWithNonTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleFilterWithNonTemporalSourceAndProcessingTemporalTarget,
  TEST_DATA__simpleFilterWithProcessingTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleFilterWithProcessingTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleFilterWithProcessingTemporalSourceAndProcessingTemporalTarget,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Milestoning.js';
import type { Entity } from '@finos/legend-storage';
import TEST_DATA__SimpleSubTypeModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleSubtype.json' assert { type: 'json' };
import TEST_DATA__NestedSubTypeModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_NestedSubType.json' assert { type: 'json' };
import {
  TEST_DATA__nestedFilterWithSubType,
  TEST_DATA__simpleFilterWithSubType,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Roundtrip_TestFilterQueries.js';

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

test(
  integrationTest(
    `Query builder loads simple filter when we rearrange filter node to create new group condition`,
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
          TEST_DATA__simpleFilterWithThreeNodes.parameters,
          TEST_DATA__simpleFilterWithThreeNodes.body,
        ),
      );
    });

    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    await waitFor(() => getByText(filterPanel, 'Employees'));
    await waitFor(() => getByText(filterPanel, 'First Name'));
    await waitFor(() => getByText(filterPanel, 'Id'));
    await waitFor(() => getByText(filterPanel, 'Legal Name'));

    let filterTreeNodes = await waitFor(() =>
      renderResult.getAllByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(filterTreeNodes.length).toBe(5);

    // Drag and drop
    const legalNameFilterTreeNode = guaranteeNonNullable(
      filterTreeNodes.find((n) => queryByText(n, 'Legal Name') !== null),
    );
    const idFilterTreeNode = guaranteeNonNullable(
      filterTreeNodes.find((n) => queryByText(n, 'Id') !== null),
    );
    const dropZone = await waitFor(() =>
      getByTestId(
        legalNameFilterTreeNode,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_CONTENT,
      ),
    );
    const dragSource = await waitFor(() =>
      getByTestId(
        idFilterTreeNode,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_CONTENT,
      ),
    );
    await dragAndDrop(
      dragSource,
      dropZone,
      legalNameFilterTreeNode,
      'Add New Logical Group',
    );
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
      getByText(guaranteeNonNullable(filterTreeNodes[1]), 'and'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[2]), 'Legal Name'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[3]), 'Id'),
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
    `Query builder loads simple filter when we create filter conditions using context menu options`,
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

    // Creating filter using context options
    await waitFor(() => getByTitle(filterPanel, 'Show Filter Options Menu...'));
    fireEvent.click(getByTitle(filterPanel, 'Show Filter Options Menu...'));
    await waitFor(() => renderResult.getByText('Create Condition'));
    fireEvent.click(renderResult.getByText('Create Condition'));

    let dragSource = await waitFor(() => getByText(explorerPanel, 'Id'));
    let dropZone = await waitFor(() => getByText(filterPanel, 'blank'));
    await dragAndDrop(dragSource, dropZone, dropZone, 'Create Condition');

    let filterTreeNodes = await waitFor(() =>
      renderResult.getAllByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(filterTreeNodes.length).toBe(2);
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[0]), 'and'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[1]), 'Id'),
    );

    const andNode = guaranteeNonNullable(
      filterTreeNodes.find((n) => queryByText(n, 'and') !== null),
    );
    fireEvent.contextMenu(andNode);
    fireEvent.click(renderResult.getByText('Add New Condition'));
    dragSource = await waitFor(() => getByText(explorerPanel, 'Legal Name'));
    dropZone = await waitFor(() => getByText(filterPanel, 'blank'));
    await dragAndDrop(dragSource, dropZone, dropZone, 'Create Condition');
    filterTreeNodes = await waitFor(() =>
      renderResult.getAllByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(filterTreeNodes.length).toBe(3);
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[0]), 'and'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[1]), 'Id'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[2]), 'Legal Name'),
    );

    // Creating Logical Group
    fireEvent.contextMenu(andNode);
    fireEvent.click(renderResult.getByText('Remove'));
    expect(getByText(filterPanel, 'Add a filter condition')).not.toBeNull();

    await waitFor(() => getByTitle(filterPanel, 'Show Filter Options Menu...'));
    fireEvent.click(getByTitle(filterPanel, 'Show Filter Options Menu...'));
    await waitFor(() => renderResult.getByText('Create Logical Group'));
    fireEvent.click(renderResult.getByText('Create Logical Group'));

    dragSource = await waitFor(() => getByText(explorerPanel, 'Id'));
    const dropZones = await waitFor(() => getAllByText(filterPanel, 'blank'));
    expect(dropZones.length).toBe(2);
    dropZone = guaranteeNonNullable(dropZones[0]);
    await dragAndDrop(dragSource, dropZone, dropZone, 'Create Condition');

    dragSource = await waitFor(() => getByText(explorerPanel, 'Legal Name'));
    dropZone = guaranteeNonNullable(dropZones[1]);
    await dragAndDrop(dragSource, dropZone, dropZone, 'Create Condition');
    filterTreeNodes = await waitFor(() =>
      renderResult.getAllByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(filterTreeNodes.length).toBe(3);
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[0]), 'and'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[1]), 'Id'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(filterTreeNodes[2]), 'Legal Name'),
    );
  },
);

type MilestoningDragAndDropTestCase = [
  string,
  {
    mappingPath: string;
    runtimePath: string;
    classPath: string;
    entities: Entity[];
    mappingAnalysis: object;
    propertyClassName: string;
    propertyName: string;
    filterNodeName: string;
    expectedDerivedPropertyParameters: string[];
    expectedRawLambda: { parameters?: object; body?: object };
  },
];

const MILESTONING_FILTER_DND_TEST_CASES: MilestoningDragAndDropTestCase[] = [
  [
    'Query builder loads simple filter when we DnD filter node and both source and target are business temporal',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      mappingAnalysis: TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
      propertyClassName: 'Business Temporal',
      propertyName: 'Firm ID',
      filterNodeName: 'Business Temporal/Firm ID',
      expectedDerivedPropertyParameters: ['businessDate'],
      expectedRawLambda:
        TEST_DATA__simpleFilterWithBusinessTemporalSourceAndBusinessTemporalTarget,
    },
  ],
  [
    'Query builder loads simple filter when we DnD filter node and source is business temporal, target is processing temporal',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      mappingAnalysis: TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
      propertyClassName: 'Processing Temporal',
      propertyName: 'Firm ID',
      filterNodeName: 'Processing Temporal/Firm ID',
      expectedDerivedPropertyParameters: ['processingDate'],
      expectedRawLambda:
        TEST_DATA__simpleFilterWithBusinessTemporalSourceAndProcessingTemporalTarget,
    },
  ],
  [
    'Query builder loads simple filter when we DnD filter node and source is business temporal, target is biTemporal',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      mappingAnalysis: TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
      propertyClassName: 'Bi Temporal',
      propertyName: 'Firm ID',
      filterNodeName: 'Bi Temporal/Firm ID',
      expectedDerivedPropertyParameters: ['processingDate', 'businessDate'],
      expectedRawLambda:
        TEST_DATA__simpleFilterWithBusinessTemporalSourceAndBiTemporalTarget,
    },
  ],
  [
    'Query builder loads simple filter when we DnD filter node and source is processing temporal, target is business Temporal',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person2',
      entities: TEST_MilestoningModel,
      mappingAnalysis: TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
      propertyClassName: 'Business Temporal',
      propertyName: 'Firm ID',
      filterNodeName: 'Business Temporal/Firm ID',
      expectedDerivedPropertyParameters: ['businessDate'],
      expectedRawLambda:
        TEST_DATA__simpleFilterWithProcessingTemporalSourceAndBusinessTemporalTarget,
    },
  ],
  [
    'Query builder loads simple filter when we DnD filter node and source is processing temporal, target is processing temporal',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person2',
      entities: TEST_MilestoningModel,
      mappingAnalysis: TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
      propertyClassName: 'Processing Temporal',
      propertyName: 'Firm ID',
      filterNodeName: 'Processing Temporal/Firm ID',
      expectedDerivedPropertyParameters: ['processingDate'],
      expectedRawLambda:
        TEST_DATA__simpleFilterWithProcessingTemporalSourceAndProcessingTemporalTarget,
    },
  ],
  [
    'Query builder loads simple filter when we DnD filter node and source is processing temporal, target is biTemporal',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person2',
      entities: TEST_MilestoningModel,
      mappingAnalysis: TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
      propertyClassName: 'Bi Temporal',
      propertyName: 'Firm ID',
      filterNodeName: 'Bi Temporal/Firm ID',
      expectedDerivedPropertyParameters: ['processingDate', 'businessDate'],
      expectedRawLambda:
        TEST_DATA__simpleFilterWithProcessingTemporalSourceAndBiTemporalTarget,
    },
  ],
  [
    'Query builder loads simple filter when we DnD filter node and source is biTemporal, target is business temporal',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person1',
      entities: TEST_MilestoningModel,
      mappingAnalysis: TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
      propertyClassName: 'Business Temporal',
      propertyName: 'Firm ID',
      filterNodeName: 'Business Temporal/Firm ID',
      expectedDerivedPropertyParameters: ['businessDate'],
      expectedRawLambda:
        TEST_DATA__simpleFilterWithBiTemporalSourceAndBusinessTemporalTarget,
    },
  ],
  [
    'Query builder loads simple filter when we DnD filter node and source is biTemporal, target is processing temporal',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person1',
      entities: TEST_MilestoningModel,
      mappingAnalysis: TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
      propertyClassName: 'Processing Temporal',
      propertyName: 'Firm ID',
      filterNodeName: 'Processing Temporal/Firm ID',
      expectedDerivedPropertyParameters: ['processingDate'],
      expectedRawLambda:
        TEST_DATA__simpleFilterWithBiTemporalSourceAndProcessingTemporalTarget,
    },
  ],
  [
    'Query builder loads simple filter when we DnD filter node and source is biTemporal, target is biTemporal',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person1',
      entities: TEST_MilestoningModel,
      mappingAnalysis: TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
      propertyClassName: 'Bi Temporal',
      propertyName: 'Firm ID',
      filterNodeName: 'Bi Temporal/Firm ID',
      expectedDerivedPropertyParameters: ['processingDate', 'businessDate'],
      expectedRawLambda:
        TEST_DATA__simpleFilterWithBiTemporalSourceAndBiTemporalTarget,
    },
  ],
  [
    'Query builder loads simple filter when we DnD filter node and source is non-Temporal, target is business temporal',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Firm',
      entities: TEST_MilestoningModel,
      mappingAnalysis: TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
      propertyClassName: 'Business Temporal',
      propertyName: 'Firm ID',
      filterNodeName: 'Business Temporal/Firm ID',
      expectedDerivedPropertyParameters: ['businessDate'],
      expectedRawLambda:
        TEST_DATA__simpleFilterWithNonTemporalSourceAndBusinessTemporalTarget,
    },
  ],
  [
    'Query builder loads simple filter when we DnD filter node and source is non-Temporal, target is processing temporal',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Firm',
      entities: TEST_MilestoningModel,
      mappingAnalysis: TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
      propertyClassName: 'Processing Temporal',
      propertyName: 'Firm ID',
      filterNodeName: 'Processing Temporal/Firm ID',
      expectedDerivedPropertyParameters: ['processingDate'],
      expectedRawLambda:
        TEST_DATA__simpleFilterWithNonTemporalSourceAndProcessingTemporalTarget,
    },
  ],
  [
    'Query builder loads simple filter when we DnD filter node and source is non-Temporal, target is biTemporal',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Firm',
      entities: TEST_MilestoningModel,
      mappingAnalysis: TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
      propertyClassName: 'Bi Temporal',
      propertyName: 'Firm ID',
      filterNodeName: 'Bi Temporal/Firm ID',
      expectedDerivedPropertyParameters: ['processingDate', 'businessDate'],
      expectedRawLambda:
        TEST_DATA__simpleFilterWithNonTemporalSourceAndBiTemporalTarget,
    },
  ],
];

describe(
  integrationTest('Milestoning filter DnD query is properly built'),
  () => {
    test.each(MILESTONING_FILTER_DND_TEST_CASES)(
      '%s',
      async (
        testName: MilestoningDragAndDropTestCase[0],
        testCase: MilestoningDragAndDropTestCase[1],
      ) => {
        const {
          mappingPath,
          runtimePath,
          classPath,
          entities,
          mappingAnalysis,
          propertyClassName,
          propertyName,
          filterNodeName,
          expectedDerivedPropertyParameters,
          expectedRawLambda,
        } = testCase;
        const { renderResult, queryBuilderState } =
          await TEST__setUpQueryBuilder(
            entities,
            stub_RawLambda(),
            mappingPath,
            runtimePath,
            mappingAnalysis,
          );

        const _class =
          queryBuilderState.graphManagerState.graph.getClass(classPath);
        await act(async () => {
          queryBuilderState.changeClass(_class);
        });
        const filterPanel = await waitFor(() =>
          renderResult.getByTestId(
            QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
          ),
        );
        const explorerPanel = await waitFor(() =>
          renderResult.getByTestId(
            QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
          ),
        );

        // Drag and drop
        const dropZone = await waitFor(() =>
          getByText(filterPanel, 'Add a filter condition'),
        );
        await waitFor(() => getByText(explorerPanel, propertyClassName));
        fireEvent.click(getByText(explorerPanel, propertyClassName));
        const sources = await waitFor(() =>
          getAllByText(explorerPanel, propertyName),
        );
        expect(sources.length).toBe(2);
        const dragSource = guaranteeNonNullable(sources[1]);
        await dragAndDrop(
          dragSource,
          dropZone,
          filterPanel,
          'Add a filter condition',
        );
        await waitFor(() => getByText(filterPanel, filterNodeName));
        await waitFor(() => getByText(filterPanel, 'is'));
        await waitFor(() => getByDisplayValue(filterPanel, 0));
        const contentNodes = await waitFor(() =>
          getAllByTestId(
            filterPanel,
            QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_CONTENT,
          ),
        );
        expect(contentNodes.length).toBe(1);
        await waitFor(() =>
          getByTitle(filterPanel, 'Set Derived Property Argument(s)...'),
        );
        fireEvent.click(
          getByTitle(filterPanel, 'Set Derived Property Argument(s)...'),
        );
        const dpModal = await waitFor(() => renderResult.getByRole('dialog'));
        await waitFor(() => getByText(dpModal, 'Derived Property'));
        expectedDerivedPropertyParameters.forEach((p) =>
          getAllByText(dpModal, p),
        );
        fireEvent.click(getByText(dpModal, 'Done'));

        // Check whether the rawLambda we build is expected
        expect(
          queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
            queryBuilderState.buildQuery(),
          ),
        ).toEqual(expectedRawLambda);
      },
    );
  },
);

test(
  integrationTest(
    `Query builder loads simple filter when we create milestoning derived property filter condition by DnD and doesn't propagate any milestoning date `,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
    );

    const _class =
      queryBuilderState.graphManagerState.graph.getClass('my::Person1');
    await act(async () => {
      queryBuilderState.changeClass(_class);
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

    const dragSource = await waitFor(() => getByText(explorerPanel, 'Prop'));
    await dragAndDrop(
      dragSource,
      dropZone,
      filterPanel,
      'Add a filter condition',
    );
    await waitFor(() => getByText(filterPanel, 'Prop'));
    await waitFor(() => getByText(filterPanel, 'is'));
    await waitFor(() => getByDisplayValue(filterPanel, ''));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);
    await waitFor(() =>
      getByTitle(filterPanel, 'Set Derived Property Argument(s)...'),
    );
    fireEvent.click(
      getByTitle(filterPanel, 'Set Derived Property Argument(s)...'),
    );
    const dpModal = await waitFor(() => renderResult.getByRole('dialog'));
    await waitFor(() => getByText(dpModal, 'Derived Property'));
    await waitFor(() => getByDisplayValue(dpModal, ''));

    fireEvent.click(getByText(dpModal, 'Done'));
  },
);

test(
  integrationTest(
    `Query builder loads simple filter when we create milestoning property exists filter condition by DnD`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    const _class =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_class);
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

    await waitFor(() => getByText(explorerPanel, 'Address'));
    fireEvent.click(getByText(explorerPanel, 'Address'));
    const dragSource = await waitFor(() => getByText(explorerPanel, 'Pincode'));
    fireEvent.dragStart(dragSource);
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    await findByText(filterPanel, 'Add a filter condition');
    fireEvent.drop(getByText(filterPanel, 'Add a filter condition'));
    fireEvent.click(renderResult.getByText('Proceed'));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(2);
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[0]), 'Address'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[0]), 'exists'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[1]), 'Pincode'),
    );
    await waitFor(() => getByText(guaranteeNonNullable(contentNodes[1]), 'is'));
    await waitFor(() =>
      getByDisplayValue(guaranteeNonNullable(contentNodes[1]), '0'),
    );
    await waitFor(() =>
      getByTitle(filterPanel, 'Set Derived Property Argument(s)...'),
    );
    fireEvent.click(
      getByTitle(filterPanel, 'Set Derived Property Argument(s)...'),
    );
    const dpModal = await waitFor(() => renderResult.getByRole('dialog'));
    await waitFor(() => getByText(dpModal, 'Derived Property'));
    expect(getAllByText(dpModal, 'businessDate').length).toBe(3);

    fireEvent.click(getByText(dpModal, 'Done'));
  },
);

test(
  integrationTest(
    `Query builder loads simple filter when we create group condition within single exists by DnD`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    const _class =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_class);
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

    await waitFor(() => getByText(explorerPanel, 'Employees'));
    fireEvent.click(getByText(explorerPanel, 'Employees'));
    let dragSource = await waitFor(() =>
      getByText(explorerPanel, 'First Name'),
    );
    fireEvent.dragStart(dragSource);
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    await findByText(filterPanel, 'Add a filter condition');
    fireEvent.drop(getByText(filterPanel, 'Add a filter condition'));
    fireEvent.click(renderResult.getByText('Proceed'));

    dragSource = await waitFor(() => getByText(explorerPanel, 'Last Name'));
    const filterTree = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE),
    );
    dropZone = filterTree;
    fireEvent.dragStart(dragSource);
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    await findByText(filterPanel, 'Add to Exists Group');
    fireEvent.drop(getByText(filterPanel, 'Add to Exists Group'));
    fireEvent.click(renderResult.getByText('Proceed'));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(4);
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[0]), 'Employees'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[0]), 'exists'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[1]), 'and'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[2]), 'First Name'),
    );
    await waitFor(() => getByText(guaranteeNonNullable(contentNodes[2]), 'is'));
    await waitFor(() =>
      getByDisplayValue(guaranteeNonNullable(contentNodes[2]), ''),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[3]), 'Last Name'),
    );
    await waitFor(() => getByText(guaranteeNonNullable(contentNodes[3]), 'is'));
    await waitFor(() =>
      getByDisplayValue(guaranteeNonNullable(contentNodes[3]), ''),
    );
  },
);

test(
  integrationTest(
    `Query builder loads simple filter when we create multiple exists from group condition by DnD`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    const _class =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_class);
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

    await waitFor(() => getByText(explorerPanel, 'Employees'));
    fireEvent.click(getByText(explorerPanel, 'Employees'));
    let dragSource = await waitFor(() =>
      getByText(explorerPanel, 'First Name'),
    );
    fireEvent.dragStart(dragSource);
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    await findByText(filterPanel, 'Add a filter condition');
    fireEvent.drop(getByText(filterPanel, 'Add a filter condition'));
    fireEvent.click(renderResult.getByText('Proceed'));

    dragSource = await waitFor(() => getByText(explorerPanel, 'Last Name'));
    const filterTree = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE),
    );
    dropZone = filterTree;
    fireEvent.dragStart(dragSource);
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    await findByText(filterPanel, 'Add filter to main group');
    fireEvent.drop(getByText(filterPanel, 'Add filter to main group'));
    fireEvent.click(renderResult.getByText('Proceed'));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(5);
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[0]), 'and'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[1]), 'Employees'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[1]), 'exists'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[2]), 'First Name'),
    );
    await waitFor(() => getByText(guaranteeNonNullable(contentNodes[2]), 'is'));
    await waitFor(() =>
      getByDisplayValue(guaranteeNonNullable(contentNodes[2]), ''),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[3]), 'Employees'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[3]), 'exists'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[4]), 'Last Name'),
    );
    await waitFor(() => getByText(guaranteeNonNullable(contentNodes[4]), 'is'));
    await waitFor(() =>
      getByDisplayValue(guaranteeNonNullable(contentNodes[4]), ''),
    );
  },
);

test(
  integrationTest(
    `Query builder loads simple filter when we create multiple exists from group condition by DnD`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    const _class =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_class);
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

    await waitFor(() => getByText(explorerPanel, 'Employees'));
    fireEvent.click(getByText(explorerPanel, 'Employees'));
    let dragSource = await waitFor(() =>
      getByText(explorerPanel, 'First Name'),
    );
    fireEvent.dragStart(dragSource);
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    await findByText(filterPanel, 'Add a filter condition');
    fireEvent.drop(getByText(filterPanel, 'Add a filter condition'));
    fireEvent.click(renderResult.getByText('Proceed'));

    dragSource = await waitFor(() => getByText(explorerPanel, 'Last Name'));
    const filterTree = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE),
    );
    dropZone = filterTree;
    fireEvent.dragStart(dragSource);
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    await findByText(filterPanel, 'Add filter to main group');
    fireEvent.drop(getByText(filterPanel, 'Add filter to main group'));
    fireEvent.click(renderResult.getByText('Proceed'));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(5);
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[0]), 'and'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[1]), 'Employees'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[1]), 'exists'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[2]), 'First Name'),
    );
    await waitFor(() => getByText(guaranteeNonNullable(contentNodes[2]), 'is'));
    await waitFor(() =>
      getByDisplayValue(guaranteeNonNullable(contentNodes[2]), ''),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[3]), 'Employees'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[3]), 'exists'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[4]), 'Last Name'),
    );
    await waitFor(() => getByText(guaranteeNonNullable(contentNodes[4]), 'is'));
    await waitFor(() =>
      getByDisplayValue(guaranteeNonNullable(contentNodes[4]), ''),
    );
  },
);

test(
  integrationTest(
    `Query builder loads simple filter when we create nested exists by DnD`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    const _class =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_class);
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

    await waitFor(() => getByText(explorerPanel, 'Employees'));
    fireEvent.click(getByText(explorerPanel, 'Employees'));
    let dragSource = await waitFor(() =>
      getByText(explorerPanel, 'First Name'),
    );
    fireEvent.dragStart(dragSource);
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    await findByText(filterPanel, 'Add a filter condition');
    fireEvent.drop(getByText(filterPanel, 'Add a filter condition'));
    fireEvent.click(renderResult.getByText('Proceed'));

    await waitFor(() => getByText(explorerPanel, 'Hobbies'));
    fireEvent.click(getByText(explorerPanel, 'Hobbies'));
    const sources = await waitFor(() => getAllByText(explorerPanel, 'Id'));
    expect(sources.length).toBe(2);
    dragSource = guaranteeNonNullable(sources[1]);
    const filterTree = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE),
    );
    dropZone = filterTree;
    fireEvent.dragStart(dragSource);
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    await findByText(filterPanel, 'Add to Exists Group');
    fireEvent.drop(getByText(filterPanel, 'Add to Exists Group'));
    fireEvent.click(renderResult.getByText('Proceed'));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(5);
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[0]), 'Employees'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[0]), 'exists'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[1]), 'and'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[2]), 'First Name'),
    );
    await waitFor(() => getByText(guaranteeNonNullable(contentNodes[2]), 'is'));
    await waitFor(() =>
      getByDisplayValue(guaranteeNonNullable(contentNodes[2]), ''),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[3]), 'Hobbies'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[3]), 'exists'),
    );
    await waitFor(() => getByText(guaranteeNonNullable(contentNodes[4]), 'Id'));
    await waitFor(() => getByText(guaranteeNonNullable(contentNodes[4]), 'is'));
    await waitFor(() =>
      getByDisplayValue(guaranteeNonNullable(contentNodes[4]), '0'),
    );
  },
);

test(
  integrationTest(
    `Query builder loads simple subType filter node when we DnD it`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__SimpleSubTypeModel,
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
    await waitFor(() => getByText(explorerPanel, 'Address'));
    fireEvent.click(getByText(explorerPanel, 'Address'));
    const dragSource = await waitFor(() => getByText(explorerPanel, 'Id'));
    await dragAndDrop(
      dragSource,
      dropZone,
      filterPanel,
      'Add a filter condition',
    );
    await waitFor(() => getByText(filterPanel, 'Address/@(Colony)Id'));
    await waitFor(() => getByText(filterPanel, 'is'));
    await waitFor(() => getByDisplayValue(filterPanel, ''));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Check whether the rawLambda we build is expected
    expect(
      queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
        queryBuilderState.buildQuery(),
      ),
    ).toEqual(TEST_DATA__simpleFilterWithSubType);
  },
);

test(
  integrationTest(
    `Query builder loads nested subType filter node when we DnD it`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__NestedSubTypeModel,
      stub_RawLambda(),
      'model::NewMapping',
      'model::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_NestedSubtype,
    );

    const _personClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Person');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
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
    await waitFor(() => getByText(explorerPanel, 'Address'));
    fireEvent.click(getByText(explorerPanel, 'Address'));
    await waitFor(() => getByText(explorerPanel, '@Address Type 1'));
    fireEvent.click(getByText(explorerPanel, '@Address Type 1'));
    const dragSource = await waitFor(() => getByText(explorerPanel, 'Zipcode'));
    await dragAndDrop(
      dragSource,
      dropZone,
      filterPanel,
      'Add a filter condition',
    );
    await waitFor(() =>
      getByText(filterPanel, 'Address/@(Address Type 1)Zipcode'),
    );
    await waitFor(() => getByText(filterPanel, 'is'));
    await waitFor(() => getByDisplayValue(filterPanel, '0'));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Check whether the rawLambda we build is expected
    expect(
      queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
        queryBuilderState.buildQuery(),
      ),
    ).toEqual(TEST_DATA__nestedFilterWithSubType);
  },
);
