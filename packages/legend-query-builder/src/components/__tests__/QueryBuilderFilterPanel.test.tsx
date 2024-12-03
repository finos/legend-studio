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
  getByRole,
  findByDisplayValue,
  findByTitle,
  findAllByText,
  getAllByTitle,
} from '@testing-library/react';
import {
  TEST_DATA__getAllWithOneIntegerIsInConditionFilter,
  TEST_DATA__lambda_simpleConstantWithDatesAndCalcualted,
  TEST_DATA__simpeFilterWithDerivedPropFromParentsUsedInFilter,
  TEST_DATA__simpeFilterWithMilestonedExists,
  TEST_DATA__simpleFilterWithAndCondition,
  TEST_DATA__simpleFilterWithDateTimeWithSeconds,
  TEST_DATA__simpleFilterWithGroupOperationAndExists,
  TEST_DATA__simpleFilterWithThreeNodes,
  TEST_DATA__simpleLambdaWithFirstDayOfYearDateFunction,
  TEST_DATA__getAllWithOneIntegerConditionFilter,
  TEST_DATA_getAllWithOneFloatConditionFilter,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import {
  TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
  TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
  TEST_DATA__ModelCoverageAnalysisResult_NestedSubtype,
  TEST_DATA__ModelCoverageAnalysisResult_QueryExecution_Entities,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDates,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDerivedPropFromParentUsedInFilter,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
} from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import { integrationTest } from '@finos/legend-shared/test';
import {
  create_RawLambda,
  stub_RawLambda,
  PrimitiveInstanceValue,
} from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  TEST__setUpQueryBuilder,
  dragAndDrop,
  selectFirstOptionFromCustomSelectorInput,
  setDerivedPropertyValue,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import TEST_DATA__QueryBuilder_Model_SimpleRelational from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelational.json' with { type: 'json' };
import TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDerivedPropFromParentUsedInFilter from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDerivedPropFromParentUsedInFilter.json' with { type: 'json' };
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' with { type: 'json' };
import TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates.json' with { type: 'json' };
import {
  guaranteeNonNullable,
  getNullableFirstEntry,
  guaranteeType,
} from '@finos/legend-shared';
import TEST_MilestoningModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_Milestoning.json' with { type: 'json' };
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
import TEST_DATA__SimpleSubTypeModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleSubtype.json' with { type: 'json' };
import TEST_DATA__NestedSubTypeModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_NestedSubType.json' with { type: 'json' };
import TEST_DATA_QueryBuilder_QueryExecution_Entities from './TEST_DATA_QueryBuilder_QueryExecution_Entities.json' with { type: 'json' };
import {
  TEST_DATA__nestedFilterWithSubType,
  TEST_DATA__simpleFilterWithSubType,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Roundtrip_TestFilterQueries.js';
import { CUSTOM_DATE_PICKER_OPTION } from '../shared/CustomDatePicker.js';
import {
  FilterValueSpecConditionValueState,
  QueryBuilderFilterTreeConditionNodeData,
} from '../../stores/filter/QueryBuilderFilterState.js';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';

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
        getByText(queryBuilderFilterPanel, '"2023-09-09T13:31:00"'),
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
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_BLOCK,
    );
    expect(nodes.length).toBe(9);
    let containerNodes = queryAllByTestId(
      filterTree,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
    );
    expect(containerNodes.length).toBe(9);

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
    let containerAndNode = guaranteeNonNullable(
      containerNodes.filter((node) => queryByText(node, 'and'))[0],
    );
    getByTitle(containerAndNode, 'Switch Operation');
    testBasicConstantContent('Age', '<', 'integerConst', containerNodes, {
      isConstant: true,
    });
    testBasicConstantContent('Dob Date', '<', 'dateFunction', containerNodes, {
      isConstant: true,
    });
    testBasicConstantContent(
      'Dob Strict Date',
      '>',
      'absoluteDate',
      containerNodes,
      {
        isConstant: true,
      },
    );
    testBasicConstantContent('Dob Time', '>=', 'dateParam', containerNodes);

    // test or block
    const orNode = guaranteeNonNullable(
      nodes.filter(
        (node) =>
          queryByText(node, 'or') !== null && queryByText(node, 'and') === null,
      )[0],
    );
    const containerOrNodes = queryAllByTestId(
      orNode,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
    );
    expect(containerOrNodes.length).toBe(4);
    testBasicConstantContent('Dob Date', '<', 'dateParam', containerOrNodes);
    testBasicConstantContent('Dob Time', '<', 'dateParam', containerOrNodes);
    const strictDateNode = testBasicConstantContent(
      'Dob Strict Date',
      '>',
      'dateParam',
      containerOrNodes,
    );

    // remove single node from or group
    fireEvent.click(getByTitle(strictDateNode, 'Remove'));
    expect(
      queryAllByTestId(
        filterTree,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_BLOCK,
      ).length,
    ).toBe(8);

    // switch operations
    containerAndNode = guaranteeNonNullable(
      containerNodes.filter((node) => queryByText(node, 'and'))[0],
    );
    fireEvent.click(getByTitle(containerAndNode, 'Switch Operation'));
    expect(queryByText(filterTree, 'and')).toBeNull();
    containerNodes = queryAllByTestId(
      filterTree,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
    );
    expect(
      containerNodes.filter((e) => queryByText(e, 'or') !== null).length,
    ).toBe(2);
    const ageFilterCondition = guaranteeNonNullable(
      containerNodes.filter((e) => queryByText(e, 'Age') !== null)[0],
    );
    expect(queryByText(ageFilterCondition, 'integerConst')).not.toBeNull();
    fireEvent.click(getByTitle(ageFilterCondition, 'Reset'));
    fireEvent.click(getByText(ageFilterCondition, '""'));
    expect(queryByDisplayValue(ageFilterCondition, '')).not.toBeNull();
    expect(
      queryByTitle(ageFilterCondition, 'Evaluate Expression (Enter)'),
    ).not.toBeNull();
    // delete all nodes except age
    while (
      queryAllByTestId(
        filterTree,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
      ).length > 1
    ) {
      queryAllByTestId(
        filterTree,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
      ).forEach((_node) => {
        if (
          queryByText(_node, 'Age') === null &&
          queryByTitle(_node, 'Remove') !== null
        ) {
          fireEvent.click(getByTitle(_node, 'Remove'));
        }
      });
    }
    containerNodes = queryAllByTestId(
      filterTree,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
    );
    await waitFor(() => expect(containerNodes.length).toBe(1));
    const ageNode = guaranteeNonNullable(containerNodes[0]);
    expect(getByText(ageNode, 'Age')).not.toBeNull();
    const ageValue = getByText(ageNode, '""');
    // drag and drop
    const constantPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_CONSTANTS),
    );
    const intConst = getByText(constantPanel, 'integerConst');
    await dragAndDrop(intConst, ageValue, filterTree, 'Change Filter Value');
    const alteredNode = getByTestId(
      filterTree,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
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
    `Query builder doesn't allow TDS derivation column in filter panel`,
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelational,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
    );

    MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
      readOnly: false,
    });

    const _personClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Person');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const fetchStructurePanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FETCH_STRUCTURE,
    );
    const filterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
    );
    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );

    // Create derivation column
    fireEvent.click(
      await findByTitle(fetchStructurePanel, 'Add a new derivation'),
    );
    expect(
      await findByText(fetchStructurePanel, '(derivation)'),
    ).not.toBeNull();

    // Drag and drop derivation column to filter panel
    const derivationColumnDragSource = getByText(
      fetchStructurePanel,
      '(derivation)',
    );
    await dragAndDrop(
      derivationColumnDragSource,
      filterPanel,
      filterPanel,
      'Add a filter condition',
    );

    // Verify value is not set and warning is shown
    expect(queryByText(filterPanel, '(derivation)')).toBeNull();
    expect(
      await renderResult.findByText(
        'Dragging and Dropping derivation projection column is not supported.',
      ),
    ).not.toBeNull();

    // Drag and drop proprety as filter condition
    const dropZone = await findByText(filterPanel, 'Add a filter condition');
    const firstNameExplorerNodeDragSource = await findByText(
      explorerPanel,
      'First Name',
    );
    await dragAndDrop(
      firstNameExplorerNodeDragSource,
      dropZone,
      filterPanel,
      'Add a filter condition',
    );
    await findByText(filterPanel, 'First Name');
    await findByText(filterPanel, 'is');
    await findByDisplayValue(filterPanel, '');
    fireEvent.blur(getByDisplayValue(filterPanel, ''));
    await findByText(filterPanel, '""');

    // Try to drag and drop derivation column as filter condition value
    // TODO: get the below mock to work so we can mock the network request call
    // instead of manually setting the derivation column return type. To accomplish
    // this, we will likely need to update the MockedMonacoEditorInstance so we can
    // properly blur the editor input to call the getLambdaReturnType method.
    // createSpy(
    //   queryBuilderState.graphManagerState.graphManager,
    //   'getLambdaReturnType',
    // ).mockResolvedValue('string');
    await act(async () => {
      (
        queryBuilderState.fetchStructureState
          .implementation as QueryBuilderTDSState
      ).derivations[0]?.setLambdaReturnType('String');
    });
    await dragAndDrop(
      derivationColumnDragSource,
      dropZone,
      filterPanel,
      'Change Filter Value',
    );

    // Verify no new filter and warning is shown
    expect(queryByText(filterPanel, '(derivation)')).toBeNull();
    expect(
      await renderResult.findByText(
        'Derivation projection columns are not supported for filter condition values.',
      ),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    `Query builder allows DND explorer property to compatible filter value`,
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
    });
    const filterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
    );
    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );

    // Drag and drop proprety as filter condition
    const dropZone = await findByText(filterPanel, 'Add a filter condition');
    const dragSource = await findByText(explorerPanel, 'First Name');
    await dragAndDrop(
      dragSource,
      dropZone,
      filterPanel,
      'Add a filter condition',
    );
    await findByText(filterPanel, 'First Name');
    await findByText(filterPanel, 'is');
    await findByDisplayValue(filterPanel, '');
    fireEvent.blur(getByDisplayValue(filterPanel, ''));
    await findByText(filterPanel, '""');

    // Drag and drop property as filter condition value
    const lastNameNodeDragSource = await findByText(explorerPanel, 'Last Name');
    await dragAndDrop(
      lastNameNodeDragSource,
      filterPanel,
      filterPanel,
      'Change Filter Value',
    );
    expect(await findByText(filterPanel, 'Last Name')).not.toBeNull();

    // Click reset button to remove filter value
    fireEvent.click(getByTitle(filterPanel, 'Reset'));
    expect(queryByText(filterPanel, 'Last Name')).toBeNull();

    // Drag incompatible value and ensure no placeholder is shown
    const isActiveNodeDragSource = await findByText(explorerPanel, 'Is Active');
    fireEvent.dragStart(isActiveNodeDragSource);
    expect(queryByText(filterPanel, 'Change Filter Value')).toBeNull();
  },
);

test(
  integrationTest(
    `Query builder allows DND fetch structure column to compatible filter value`,
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
    });
    const fetchStructurePanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FETCH_STRUCTURE,
    );
    const filterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
    );
    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );

    // Drag and drop proprety as filter condition
    const dropZone = await findByText(filterPanel, 'Add a filter condition');
    const dragSource = await findByText(explorerPanel, 'First Name');
    await dragAndDrop(
      dragSource,
      dropZone,
      filterPanel,
      'Add a filter condition',
    );
    await findByText(filterPanel, 'First Name');
    await findByText(filterPanel, 'is');
    await findByDisplayValue(filterPanel, '');
    fireEvent.blur(getByDisplayValue(filterPanel, ''));
    await findByText(filterPanel, '""');

    // Drag and drop property to fetch structure
    const lastNameNodeDragSource = await findByText(explorerPanel, 'Last Name');
    await dragAndDrop(
      lastNameNodeDragSource,
      fetchStructurePanel,
      fetchStructurePanel,
      'Add a projection column',
    );
    expect(await findByText(fetchStructurePanel, 'Last Name')).not.toBeNull();

    // Drag and drop fetch structure column as filter condition value
    const lastNameColumnDragSource = await findByText(
      fetchStructurePanel,
      'Last Name',
    );
    await dragAndDrop(
      lastNameColumnDragSource,
      filterPanel,
      filterPanel,
      'Change Filter Value',
    );
    expect(await findByText(filterPanel, 'Last Name')).not.toBeNull();

    // Click reset button to remove filter value
    fireEvent.click(getByTitle(filterPanel, 'Reset'));
    expect(queryByText(filterPanel, 'Last Name')).toBeNull();

    // Drag and drop another property to fetch structure
    const isActiveNodeDragSource = await findByText(explorerPanel, 'Is Active');
    await dragAndDrop(
      isActiveNodeDragSource,
      fetchStructurePanel,
      fetchStructurePanel,
      'Add a projection column',
    );
    expect(await findByText(fetchStructurePanel, 'Is Active')).not.toBeNull();

    // Drag incompatible value from fetch structure and ensure no placeholder is shown
    const isActiveColumnDragSource = await findByText(
      fetchStructurePanel,
      'Is Active',
    );
    fireEvent.dragStart(isActiveColumnDragSource);
    expect(queryByText(filterPanel, 'Change Filter Value')).toBeNull();
  },
);

test(
  integrationTest(
    `Query builder doesn't allow exploded property to have property expression filter condition value`,
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
    const filterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
    );
    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );

    // Expand explorer tree node
    fireEvent.click(await findByText(explorerPanel, 'Employees'));

    // Drag and drop exploded proprety as filter condition
    const dropZone = await findByText(filterPanel, 'Add a filter condition');
    const dragSource = await findByText(explorerPanel, 'First Name');
    await dragAndDrop(
      dragSource,
      dropZone,
      filterPanel,
      'Add a filter condition',
    );

    fireEvent.click(
      await renderResult.findByRole('button', { name: 'Proceed' }),
    );
    await findByText(filterPanel, 'First Name');
    await findByText(filterPanel, 'exists');
    await findByText(filterPanel, 'is');
    await findByDisplayValue(filterPanel, '');
    fireEvent.blur(getByDisplayValue(filterPanel, ''));
    await findByText(filterPanel, '""');

    // Drag and drop property as filter condition value
    const lastNameNodeDragSource = await findByText(explorerPanel, 'Last Name');
    await dragAndDrop(
      lastNameNodeDragSource,
      filterPanel,
      filterPanel,
      'Change Filter Value',
    );
    expect(queryByText(filterPanel, 'Last Name')).toBeNull();
    expect(
      await renderResult.findByText(
        'Collection filter does not support property for filter condition value.',
      ),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    `Query builder doesn't allow filter condition to have exploded property as right side value`,
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
    const filterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
    );
    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );

    // Drag and drop regular proprety as filter condition
    const dropZone = await findByText(filterPanel, 'Add a filter condition');
    const dragSource = await findByText(explorerPanel, 'Legal Name');
    await dragAndDrop(
      dragSource,
      dropZone,
      filterPanel,
      'Add a filter condition',
    );
    await findByText(filterPanel, 'Legal Name');
    await findByText(filterPanel, 'is');
    await findByDisplayValue(filterPanel, '');
    fireEvent.blur(getByDisplayValue(filterPanel, ''));
    await findByText(filterPanel, '""');

    // Expand explorer tree node
    fireEvent.click(await findByText(explorerPanel, 'Employees'));

    // Drag and drop property as filter condition value
    const firstNameNodeDragSource = await findByText(
      explorerPanel,
      'First Name',
    );
    await dragAndDrop(
      firstNameNodeDragSource,
      filterPanel,
      filterPanel,
      'Change Filter Value',
    );
    expect(queryByText(filterPanel, 'First Name')).toBeNull();
    expect(
      await renderResult.findByText(
        'Collection types are not supported for filter condition values.',
      ),
    ).not.toBeNull();
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

    // Dragging filter node doesn't activate main drop zone for filter panel or post-filter panel
    const filterNode = getByText(filterPanel, 'Legal Name');
    fireEvent.dragStart(filterNode);
    expect(queryByText(filterPanel, 'Add filter to main group')).toBeNull();
    expect(
      queryByText(postFilterPanel, 'Add post-filter to main group'),
    ).toBeNull();

    // Dragging TDS column does activate main drop zone for filter panel
    fireEvent.dragStart(fetchStructureDragSource);
    expect(
      await findByText(filterPanel, 'Add filter to main group'),
    ).not.toBeNull();

    // Dragging explorer node does activate main drop zone for filter panel
    fireEvent.dragStart(explorerDragSource);
    expect(
      await findByText(filterPanel, 'Add filter to main group'),
    ).not.toBeNull();
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
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
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
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
      ),
    );
    expect(contentNodes.length).toBe(3);
    const idFilterNode = guaranteeNonNullable(contentNodes[2]);
    await waitFor(() => getByText(idFilterNode, 'Id'));
    await waitFor(() => getByText(idFilterNode, 'is'));
    await waitFor(() => getByDisplayValue(idFilterNode, ''));
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
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
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
    await findByText(legalNameFilterTreeNode, 'Legal Name');
    fireEvent.drop(getByText(legalNameFilterTreeNode, 'Legal Name'));
    fireEvent.click(renderResult.getByText('Proceed'));
    await waitFor(() => getByText(filterPanel, 'Employees'));
    await waitFor(() => getByText(filterPanel, 'First Name'));
    filterTreeNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
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
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
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
      'First Name',
    );
    await waitFor(() => getByText(filterPanel, 'Employees'));
    await waitFor(() => getByText(filterPanel, 'First Name'));
    filterTreeNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
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
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
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
      'Legal Name',
    );
    filterTreeNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
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
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
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
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
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

test(
  integrationTest(
    'Query builder is able to detect a constant that uses meta::pure::functions::date::firstDayOfYear is of type Date and is able to drag and drop this constant varible to a filter node with Date type',
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
        create_RawLambda(
          TEST_DATA__simpleLambdaWithFirstDayOfYearDateFunction.parameters,
          TEST_DATA__simpleLambdaWithFirstDayOfYearDateFunction.body,
        ),
      );
    });
    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    await waitFor(() => getByText(filterPanel, 'Censusdate'));
    const constantPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_CONSTANTS),
    );
    expect(getByText(constantPanel, 'myDate')).not.toBeNull();
    //Drag and drop
    const filterTreeNode = await waitFor(() =>
      renderResult.getAllByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
      ),
    );
    expect(filterTreeNode.length).toBe(1);
    const censusdateFilterTreeNode = guaranteeNonNullable(filterTreeNode[0]);
    const dropZone = await waitFor(() =>
      getByTestId(
        censusdateFilterTreeNode,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_VALUE,
      ),
    );
    const dragSource = await waitFor(() => getByText(constantPanel, 'myDate'));
    await dragAndDrop(
      dragSource,
      dropZone,
      censusdateFilterTreeNode,
      'Change Filter Value',
    );
    await waitFor(() => getByText(filterPanel, 'myDate'));
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
        // Set filter value
        const filterValueInput = await waitFor(() =>
          getByRole(filterPanel, 'textbox'),
        );
        fireEvent.change(filterValueInput, { target: { value: '0' } });
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
    `Query builder loads simple filter when we create milestoning derived property filter condition by DnD and doesn't propagate any milestoning date`,
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
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
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
      getByDisplayValue(guaranteeNonNullable(contentNodes[1]), ''),
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
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
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
    await waitFor(() => getByText(guaranteeNonNullable(contentNodes[2]), '""'));
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[3]), 'Last Name'),
    );
    await waitFor(() => getByText(guaranteeNonNullable(contentNodes[3]), 'is'));
    // Last Name is the most recently added node, so it shows the BasicValueSpecificationEditor
    // instead of the editable (blue underlined) text.
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
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
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
    await waitFor(() => getByText(guaranteeNonNullable(contentNodes[2]), '""'));
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
    // Last Name is the most recently added node, so it shows the BasicValueSpecificationEditor
    // instead of the editable (blue underlined) text.
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
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_NODE_CONTAINER,
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
    await waitFor(() => getByText(guaranteeNonNullable(contentNodes[2]), '""'));
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[3]), 'Hobbies'),
    );
    await waitFor(() =>
      getByText(guaranteeNonNullable(contentNodes[3]), 'exists'),
    );
    await waitFor(() => getByText(guaranteeNonNullable(contentNodes[4]), 'Id'));
    await waitFor(() => getByText(guaranteeNonNullable(contentNodes[4]), 'is'));
    await waitFor(() =>
      getByDisplayValue(guaranteeNonNullable(contentNodes[4]), ''),
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
    const filterValueInput = await waitFor(() =>
      getByDisplayValue(filterPanel, ''),
    );
    // Add filter value
    fireEvent.change(filterValueInput, { target: { value: 'test' } });

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
    const filterValueInput = await waitFor(() =>
      getByRole(filterPanel, 'textbox'),
    );
    fireEvent.change(filterValueInput, { target: { value: '0' } });
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

test(
  integrationTest(
    'Query builder filter supports persisting of is_in and is_not_in filter values',
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
          TEST_DATA__getAllWithOneIntegerIsInConditionFilter.parameters,
          TEST_DATA__getAllWithOneIntegerIsInConditionFilter.body,
        ),
      );
    });

    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    await waitFor(() => getByText(filterPanel, 'is in list of'));
    expect(getByText(filterPanel, 'List(3): 1,2,3'));
    fireEvent.click(getByTitle(filterPanel, 'Choose Operator...'));
    let switchMenu = renderResult.getByRole('menu');
    fireEvent.click(getByText(switchMenu, 'is not in list of'));
    expect(getByText(filterPanel, 'List(3): 1,2,3'));
    fireEvent.click(getByTitle(filterPanel, 'Choose Operator...'));
    switchMenu = renderResult.getByRole('menu');
    fireEvent.click(getByText(switchMenu, 'is'));
    expect(queryByText(filterPanel, '1'));
  },
);

test(
  integrationTest(
    'Query builder is able to process derived properties from parents when building a query',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDerivedPropFromParentUsedInFilter,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::TestRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDerivedPropFromParentUsedInFilter,
    );

    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__simpeFilterWithDerivedPropFromParentsUsedInFilter.parameters,
          TEST_DATA__simpeFilterWithDerivedPropFromParentsUsedInFilter.body,
        ),
      );
    });

    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    await waitFor(() => getByText(filterPanel, 'Derived Prop From Parent'));
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
        guaranteeType(
          getNullableFirstEntry(
            Array.from(queryBuilderState.filterState.nodes.values()),
          ),
          QueryBuilderFilterTreeConditionNodeData,
        ).condition.rightConditionValue,
        FilterValueSpecConditionValueState,
      ).value,
      PrimitiveInstanceValue,
    );

    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    await waitFor(() => getByText(filterPanel, 'Age'));
    await waitFor(() => getByText(filterPanel, 'is'));

    let filterValueDisplay = getByText(filterPanel, '"0"');
    fireEvent.click(filterValueDisplay);
    let inputEl = getByDisplayValue(filterPanel, '0');

    // valid input should be recorded and saved to state
    fireEvent.change(inputEl, { target: { value: '1000' } });
    fireEvent.blur(inputEl);
    expect(filterConditionValue.values[0]).toEqual(1000);
    await waitFor(() => getByText(filterPanel, '"1000"'));

    // expressions should evaluate when evaluate button is clicked
    filterValueDisplay = getByText(filterPanel, '"1000"');
    fireEvent.click(filterValueDisplay);
    inputEl = getByDisplayValue(filterPanel, '1000');
    fireEvent.change(inputEl, { target: { value: '4 * 2' } });
    fireEvent.click(getByTitle(filterPanel, 'Evaluate Expression (Enter)'));
    await waitFor(() => expect(filterConditionValue.values[0]).toEqual(8));
    await waitFor(() => getByDisplayValue(filterPanel, '8'));

    // bad input should be reset to initial value on blur
    fireEvent.change(inputEl, { target: { value: '1asd' } });
    fireEvent.blur(inputEl);
    expect(filterConditionValue.values[0]).toEqual(8);
    await waitFor(() => getByText(filterPanel, '"8"'));
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
        guaranteeType(
          getNullableFirstEntry(
            Array.from(queryBuilderState.filterState.nodes.values()),
          ),
          QueryBuilderFilterTreeConditionNodeData,
        ).condition.rightConditionValue,
        FilterValueSpecConditionValueState,
      ).value,
      PrimitiveInstanceValue,
    );

    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );
    await waitFor(() => getByText(filterPanel, 'Firm/Average Employees Age'));
    await waitFor(() => getByText(filterPanel, 'is'));

    const filterValueDisplay = getByText(filterPanel, '"0"');
    fireEvent.click(filterValueDisplay);
    const inputEl = getByDisplayValue(filterPanel, '0');

    // valid input should be recorded and saved to state
    fireEvent.change(inputEl, { target: { value: '-.1' } });
    fireEvent.blur(inputEl);
    expect(filterConditionValue.values[0]).toEqual(-0.1);
    await waitFor(() => getByText(filterPanel, '"-0.1"'));
  },
);

test(
  integrationTest(
    `Query builder uses null as default value for string filter and shows validation error`,
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
    const filterDropZone = await waitFor(() =>
      getByText(filterPanel, 'Add a filter condition'),
    );
    const dragSource = await waitFor(() =>
      getByText(explorerPanel, 'Legal Name'),
    );
    await dragAndDrop(
      dragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    await dragAndDrop(
      dragSource,
      filterDropZone,
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

    // Verify validation issue
    expect(getByText(filterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);

    // Enter value
    let filterValueInput = getByRole(filterPanel, 'combobox');
    fireEvent.change(filterValueInput, { target: { value: 'test' } });
    await waitFor(() => getByDisplayValue(filterPanel, 'test'));
    fireEvent.blur(filterValueInput);
    expect(getByText(filterPanel, '"test"')).not.toBeNull();

    // Verify no validation issue
    expect(queryByText(filterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);

    // Delete value to set it to empty string
    fireEvent.click(getByText(filterPanel, '"test"'));
    filterValueInput = getByRole(filterPanel, 'combobox');
    fireEvent.change(filterValueInput, { target: { value: '' } });
    fireEvent.blur(filterValueInput);
    await waitFor(() => getByText(filterPanel, '""'));

    // Verify no validation issue
    expect(queryByText(filterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);

    // Click reset button
    fireEvent.click(getByText(filterPanel, '""'));
    filterValueInput = getByRole(filterPanel, 'combobox');
    fireEvent.click(getByTitle(filterPanel, 'Reset'));
    fireEvent.blur(filterValueInput);

    // Verify value is reset
    await waitFor(() => getByText(filterPanel, '""'));

    // Verify validation issue
    expect(getByText(filterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);
  },
);

test(
  integrationTest(
    `Query builder uses false as default value for boolean filter and shows no validation error`,
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
    });
    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
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
    const filterDropZone = await waitFor(() =>
      getByText(filterPanel, 'Add a filter condition'),
    );
    const dragSource = await waitFor(() =>
      getByText(explorerPanel, 'Is Active'),
    );
    await dragAndDrop(
      dragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    await dragAndDrop(
      dragSource,
      filterDropZone,
      filterPanel,
      'Add a filter condition',
    );
    await waitFor(() => getByText(filterPanel, 'Is Active'));
    await waitFor(() => getByText(filterPanel, 'is'));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Verify no validation issues
    expect(queryByText(filterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);
  },
);

test(
  integrationTest(
    `Query builder uses null as default value for numerical filter and shows validation error`,
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
    const filterDropZone = await waitFor(() =>
      getByText(filterPanel, 'Add a filter condition'),
    );
    const dragSource = await waitFor(() => getByText(explorerPanel, 'Id'));
    await dragAndDrop(
      dragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    await dragAndDrop(
      dragSource,
      filterDropZone,
      filterPanel,
      'Add a filter condition',
    );
    await waitFor(() => getByText(filterPanel, 'Id'));
    await waitFor(() => getByText(filterPanel, 'is'));
    await waitFor(() => getByDisplayValue(filterPanel, ''));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Verify validation issue
    expect(getByText(filterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);

    // Enter value
    let filterValueInput = getByRole(filterPanel, 'textbox');
    fireEvent.change(filterValueInput, { target: { value: '123' } });
    fireEvent.blur(filterValueInput);
    expect(getByText(filterPanel, '"123"')).not.toBeNull();

    // Verify no validation issues
    expect(queryByText(filterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);

    // Click reset button
    fireEvent.click(getByText(filterPanel, '"123"'));
    filterValueInput = getByRole(filterPanel, 'textbox');
    fireEvent.click(getByTitle(filterPanel, 'Reset'));
    fireEvent.blur(filterValueInput);

    // Verify value is reset
    await waitFor(() => getByText(filterPanel, '""'));

    // Verify validation issue
    expect(getByText(filterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);
  },
);

test(
  integrationTest(
    `Query builder uses null as default value for date filter and shows validation error`,
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
    });
    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
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
    const filterDropZone = await waitFor(() =>
      getByText(filterPanel, 'Add a filter condition'),
    );
    const dragSource = await waitFor(() =>
      getByText(explorerPanel, 'Dob Date'),
    );
    await dragAndDrop(
      dragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    await dragAndDrop(
      dragSource,
      filterDropZone,
      filterPanel,
      'Add a filter condition',
    );
    await waitFor(() => getByText(filterPanel, 'Dob Date'));
    await waitFor(() => getByText(filterPanel, 'is'));
    await waitFor(() =>
      getByTitle(filterPanel, 'Click to edit and pick from more date options'),
    );
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Verify validation issue
    expect(getByText(filterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);

    // Select value
    const filterValueButton = getByTitle(
      filterPanel,
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
    expect(getByText(filterPanel, '"Today"')).not.toBeNull();
    expect(queryByText(filterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);
  },
);

test(
  integrationTest(
    `Query builder uses null as default value for datetime filter and shows validation error`,
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
    });
    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
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
    const filterDropZone = await waitFor(() =>
      getByText(filterPanel, 'Add a filter condition'),
    );
    const dragSource = await waitFor(() =>
      getByText(explorerPanel, 'Dob Time'),
    );
    await dragAndDrop(
      dragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    await dragAndDrop(
      dragSource,
      filterDropZone,
      filterPanel,
      'Add a filter condition',
    );
    await waitFor(() => getByText(filterPanel, 'Dob Time'));
    await waitFor(() => getByText(filterPanel, 'is'));
    await waitFor(() =>
      getByTitle(filterPanel, 'Click to edit and pick from more date options'),
    );
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Change operation to test operation besides equal
    fireEvent.click(renderResult.getByTitle('Choose Operator...'));
    fireEvent.click(renderResult.getByRole('button', { name: '<=' }));

    // Verify validation issue
    expect(getByText(filterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);

    // Select value
    const filterValueButton = getByTitle(
      filterPanel,
      'Click to edit and pick from more date options',
    );
    fireEvent.click(filterValueButton);
    fireEvent.click(renderResult.getByText(CUSTOM_DATE_PICKER_OPTION.NOW));
    fireEvent.keyDown(
      renderResult.getByText(CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE),
      {
        key: 'Escape',
        code: 'Escape',
      },
    );

    // Verify no validation issues
    expect(getByText(filterPanel, '"Now"')).not.toBeNull();
    expect(queryByText(filterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);
  },
);

test(
  integrationTest(
    `Query builder uses null as default value for enum filter and shows validation error`,
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
    });
    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
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
    const filterDropZone = await waitFor(() =>
      getByText(filterPanel, 'Add a filter condition'),
    );
    const dragSource = await waitFor(() =>
      getByText(explorerPanel, 'Inc Type'),
    );
    await dragAndDrop(
      dragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    await dragAndDrop(
      dragSource,
      filterDropZone,
      filterPanel,
      'Add a filter condition',
    );
    await waitFor(() => getByText(filterPanel, 'Inc Type'));
    await waitFor(() => getByText(filterPanel, 'is'));
    await waitFor(() => getByText(filterPanel, 'Select value'));
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Verify validation issue
    expect(getByText(filterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);

    // Select value
    const filterValueDropdown = guaranteeNonNullable(
      getByText(filterPanel, 'Select value').parentElement?.parentElement,
    );
    selectFirstOptionFromCustomSelectorInput(filterValueDropdown, false, false);

    // Verify no validation issues
    expect(getByText(filterPanel, '"Corp"')).not.toBeNull();
    expect(queryByText(filterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);

    // Click reset button
    fireEvent.click(getByText(filterPanel, '"Corp"'));
    fireEvent.click(getByTitle(filterPanel, 'Reset'));

    // Verify value is reset
    await waitFor(() => getByText(filterPanel, 'Select value'));
    fireEvent.blur(getByText(filterPanel, 'Select value'));
    expect(getByText(filterPanel, '""')).not.toBeNull();

    // Verify validation issue
    expect(getByText(filterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);
  },
);

test(
  integrationTest(
    `Query builder uses empty list as default value for list filter and shows validation error`,
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
    const filterDropZone = await waitFor(() =>
      getByText(filterPanel, 'Add a filter condition'),
    );
    const dragSource = await waitFor(() =>
      getByText(explorerPanel, 'Legal Name'),
    );
    await dragAndDrop(
      dragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    await dragAndDrop(
      dragSource,
      filterDropZone,
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

    // Select "is in list of" operator
    fireEvent.click(getByTitle(filterPanel, 'Choose Operator...'));
    const operatorsMenu = renderResult.getByRole('menu');
    fireEvent.click(getByText(operatorsMenu, 'is in list of'));
    expect(getByText(filterPanel, 'List(empty)'));

    // Verify validation issue
    expect(getByText(filterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);

    // Enter value
    fireEvent.click(getByText(filterPanel, 'List(empty)'));
    const valueInput = getByRole(
      guaranteeNonNullable(getByText(filterPanel, 'Add').parentElement),
      'combobox',
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
    expect(await findByText(filterPanel, 'List(1): test1')).not.toBeNull();
    expect(queryByText(filterPanel, '1 issue')).toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', false);
  },
);

test(
  integrationTest(
    `Query builder converts empty string to empty list when changing operator`,
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
    const filterDropZone = await waitFor(() =>
      getByText(filterPanel, 'Add a filter condition'),
    );
    const dragSource = await waitFor(() =>
      getByText(explorerPanel, 'Legal Name'),
    );
    await dragAndDrop(
      dragSource,
      filterDropZone,
      filterPanel,
      'Add a filter condition',
    );
    await findByText(filterPanel, 'Legal Name');
    await findByText(filterPanel, 'is');
    let valueInput = await findByDisplayValue(filterPanel, '');
    fireEvent.blur(valueInput);
    const contentNodes = await waitFor(() =>
      getAllByTestId(
        filterPanel,
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_TREE_CONDITION_NODE_CONTENT,
      ),
    );
    expect(contentNodes.length).toBe(1);

    // Check for error
    expect(getByText(filterPanel, '1 issue')).not.toBeNull();

    // Enter empty value
    fireEvent.click(getByText(filterPanel, '""'));
    valueInput = await findByDisplayValue(filterPanel, '');
    fireEvent.change(valueInput, { target: { value: 'test' } });
    await findByDisplayValue(filterPanel, 'test');
    fireEvent.change(valueInput, { target: { value: '' } });
    await findByText(filterPanel, '(empty)');
    fireEvent.blur(valueInput);
    await findByText(filterPanel, '""');

    // Check for no error
    expect(queryByText(filterPanel, '1 issue')).toBeNull();

    // Select "is in list of" operator
    fireEvent.click(getByTitle(filterPanel, 'Choose Operator...'));
    const operatorsMenu = renderResult.getByRole('menu');
    fireEvent.click(getByText(operatorsMenu, 'is in list of'));
    expect(getByText(filterPanel, 'List(empty)'));

    // Verify validation issue
    expect(getByText(filterPanel, '1 issue')).not.toBeNull();
    expect(
      renderResult.getByRole('button', { name: 'Run Query' }),
    ).toHaveProperty('disabled', true);
  },
);

test(
  integrationTest(
    'Query builder sets derived property values independently when dragged from explorer',
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
    });

    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );
    const filterPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    );

    // Drag derived property from explorer to filter panel
    const dragSource = await findByText(explorerPanel, 'Prepended Name');
    await dragAndDrop(
      dragSource,
      filterPanel,
      filterPanel,
      'Add a filter condition',
    );
    expect(await findByText(filterPanel, 'Prepended Name')).not.toBeNull();

    // Check for 2 errors
    expect(getByText(filterPanel, '2 issues')).not.toBeNull();

    // Drag derived property from explorer to filter condition value
    await dragAndDrop(
      dragSource,
      filterPanel,
      filterPanel,
      'Change Filter Value',
    );
    expect(await findAllByText(filterPanel, 'Prepended Name')).toHaveLength(2);
    await waitFor(() =>
      expect(
        getAllByTitle(filterPanel, 'Set Derived Property Argument(s)...'),
      ).toHaveLength(2),
    );

    // Check for 2 errors
    expect(getByText(filterPanel, '2 issues')).not.toBeNull();

    // Set left side derived property value
    await setDerivedPropertyValue(
      getAllByTitle(filterPanel, 'Set Derived Property Argument(s)...')[0]!,
      'test1',
      renderResult,
    );

    // Check for 1 error
    expect(await findByText(filterPanel, '1 issue')).not.toBeNull();

    // Set right side derived property value
    await setDerivedPropertyValue(
      getAllByTitle(filterPanel, 'Set Derived Property Argument(s)...')[1]!,
      'test2',
      renderResult,
    );

    // Check no errors
    expect(queryByText(filterPanel, '1 issue')).toBeNull();

    // Verify left side derived property value is unchanged
    fireEvent.click(
      getAllByTitle(filterPanel, 'Set Derived Property Argument(s)...')[0]!,
    );
    const dpModal = await renderResult.findByRole('dialog');
    await findByText(dpModal, 'Derived Property');
    expect(getByDisplayValue(dpModal, 'test1')).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder sets derived property values independently when dragged from fetch structure panel',
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
    });

    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );
    const fetchStructurePanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FETCH_STRUCTURE,
    );
    const filterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
    );

    // Drag derived property from explorer to fetch structure panel
    const explorerNodeDragSource = await findByText(
      explorerPanel,
      'Prepended Name',
    );
    await dragAndDrop(
      explorerNodeDragSource,
      fetchStructurePanel,
      fetchStructurePanel,
      'Add a projection column',
    );
    expect(
      await findByText(fetchStructurePanel, 'Prepended Name'),
    ).not.toBeNull();

    // Check for 1 fetch structure error
    expect(getByText(fetchStructurePanel, '1 issue')).not.toBeNull();

    // Drag derived property from fetch structure panel to filter panel
    const fetchStructureColumnDragSource = await findByText(
      fetchStructurePanel,
      'Prepended Name',
    );
    await dragAndDrop(
      fetchStructureColumnDragSource,
      filterPanel,
      filterPanel,
      'Add a filter condition',
    );
    expect(await findByText(filterPanel, 'Prepended Name')).not.toBeNull();

    // Check for 2 filter errors
    expect(getByText(filterPanel, '2 issues')).not.toBeNull();

    // Drag derived property from feetch structure panel to filter condition value
    await dragAndDrop(
      fetchStructureColumnDragSource,
      filterPanel,
      filterPanel,
      'Change Filter Value',
    );
    expect(await findAllByText(filterPanel, 'Prepended Name')).toHaveLength(2);
    await waitFor(() =>
      expect(
        getAllByTitle(filterPanel, 'Set Derived Property Argument(s)...'),
      ).toHaveLength(2),
    );

    // Check for 2 errors
    expect(getByText(filterPanel, '2 issues')).not.toBeNull();

    // Set fetch structure derived property value
    await setDerivedPropertyValue(
      getByTitle(fetchStructurePanel, 'Set Derived Property Argument(s)...'),
      'test1',
      renderResult,
    );

    // Check for no fetch structure errors
    expect(queryByText(fetchStructurePanel, '1 issue')).toBeNull();

    // Set left side derived property value
    await setDerivedPropertyValue(
      getAllByTitle(filterPanel, 'Set Derived Property Argument(s)...')[0]!,
      'test2',
      renderResult,
    );

    // Check for 1 filter panel error
    expect(await findByText(filterPanel, '1 issue')).not.toBeNull();

    // Set right side derived property value
    await setDerivedPropertyValue(
      getAllByTitle(filterPanel, 'Set Derived Property Argument(s)...')[1]!,
      'test3',
      renderResult,
    );

    // Check no errors
    expect(queryByText(filterPanel, '1 issue')).toBeNull();

    // Verify fetch structure derived property value is unchanged
    fireEvent.click(
      getByTitle(fetchStructurePanel, 'Set Derived Property Argument(s)...'),
    );
    let dpModal = await renderResult.findByRole('dialog');
    await findByText(dpModal, 'Derived Property');
    expect(getByDisplayValue(dpModal, 'test1')).not.toBeNull();
    fireEvent.click(getByRole(dpModal, 'button', { name: 'Done' }));
    await waitFor(() => expect(renderResult.queryByRole('dialog')).toBeNull());

    // Verify left side derived property value is unchanged
    fireEvent.click(
      getAllByTitle(filterPanel, 'Set Derived Property Argument(s)...')[0]!,
    );
    dpModal = await renderResult.findByRole('dialog');
    await findByText(dpModal, 'Derived Property');
    expect(getByDisplayValue(dpModal, 'test2')).not.toBeNull();
  },
);
