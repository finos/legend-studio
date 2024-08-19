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
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import TEST_DATA_SimpleCalendarModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_Calendar.json' with { type: 'json' };
import { stub_RawLambda, create_RawLambda } from '@finos/legend-graph';
import { createMock, integrationTest } from '@finos/legend-shared/test';
import { waitFor, getAllByText, act } from '@testing-library/react';
import {
  TEST_DATA__ModelCoverageAnalysisResult_Calendar,
  TEST_DATA__simpleDerivationWithCalendarAggregation,
  TEST_DATA__simpleProjectionWithCalendarAggregation,
  TEST_DATA__simpleProjectionWithCalendarAggregationWithDateFunction,
  TEST_DATA__simpleProjectionWithCalendarAggregationWithNestedDateColumn,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Calendar.js';
import { QueryBuilderExplorerTreeRootNodeData } from '../../stores/explorer/QueryBuilderExplorerState.js';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { QUERY_BUILDER_CALENDAR_TYPE } from '../../graph-manager/QueryBuilderConst.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  MockedMonacoEditorInstance,
  MockedMonacoEditorAPI,
} from '@finos/legend-lego/code-editor/test';

const YTD = 'Year to Date';
const CME = 'Current Month Estimate';

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with calendar aggregation',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA_SimpleCalendarModel,
      stub_RawLambda(),
      'test::mapping',
      'test::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_Calendar,
    );
    const employeeClass =
      queryBuilderState.graphManagerState.graph.getClass('test::Employee');
    await act(async () => {
      queryBuilderState.changeClass(employeeClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Employee'));

    await waitFor(() => getAllByText(queryBuilderSetup, 'mapping'));
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
          TEST_DATA__simpleProjectionWithCalendarAggregation.parameters,
          TEST_DATA__simpleProjectionWithCalendarAggregation.body,
        ),
      );
    });

    const tdsStateOne = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );

    // check calendar aggregation function
    expect(tdsStateOne.aggregationState.columns.length).toBe(1);
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction,
    ).toBeDefined();
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction?.calendarType,
    ).toBe(QUERY_BUILDER_CALENDAR_TYPE.NY);
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction?.getLabel(),
    ).toBe(YTD);
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction?.dateColumn
        ?.func.value.name,
    ).toBe('hireDate');
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with calendar aggregation with end date today',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA_SimpleCalendarModel,
      stub_RawLambda(),
      'test::mapping',
      'test::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_Calendar,
    );
    const employeeClass =
      queryBuilderState.graphManagerState.graph.getClass('test::Employee');
    await act(async () => {
      queryBuilderState.changeClass(employeeClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Employee'));
    await waitFor(() => getAllByText(queryBuilderSetup, 'mapping'));
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
          TEST_DATA__simpleProjectionWithCalendarAggregationWithDateFunction.parameters,
          TEST_DATA__simpleProjectionWithCalendarAggregationWithDateFunction.body,
        ),
      );
    });

    const tdsStateOne = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );

    // check calendar aggregation function
    expect(tdsStateOne.aggregationState.columns.length).toBe(1);
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction,
    ).toBeDefined();
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction?.calendarType,
    ).toBe(QUERY_BUILDER_CALENDAR_TYPE.NY);
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction?.getLabel(),
    ).toBe(YTD);
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction?.dateColumn
        ?.func.value.name,
    ).toBe('hireDate');
    await waitFor(() => renderResult.getByText('Today'));
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with calendar aggregation with nested date column',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA_SimpleCalendarModel,
      stub_RawLambda(),
      'test::mapping',
      'test::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_Calendar,
    );
    const employeeClass =
      queryBuilderState.graphManagerState.graph.getClass('test::Employee');
    await act(async () => {
      queryBuilderState.changeClass(employeeClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Employee'));
    await waitFor(() => getAllByText(queryBuilderSetup, 'mapping'));
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
          TEST_DATA__simpleProjectionWithCalendarAggregationWithNestedDateColumn.parameters,
          TEST_DATA__simpleProjectionWithCalendarAggregationWithNestedDateColumn.body,
        ),
      );
    });

    const tdsStateOne = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );

    // check calendar aggregation function
    expect(tdsStateOne.aggregationState.columns.length).toBe(1);
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction,
    ).toBeDefined();
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction?.calendarType,
    ).toBe(QUERY_BUILDER_CALENDAR_TYPE.NY);
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction?.getLabel(),
    ).toBe(YTD);
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction?.dateColumn
        ?.func.value.name,
    ).toBe('openingDate');

    const queryBuilderTDSPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS),
    );
    await waitFor(() => getAllByText(queryBuilderTDSPanel, 'Year to Date')); // check calendar function
    await waitFor(() => getAllByText(queryBuilderTDSPanel, 'NY')); // check calendar type
    await waitFor(() =>
      getAllByText(queryBuilderTDSPanel, 'Firm/Opening Date'),
    ); // check date column
  },
);

test(
  integrationTest(
    'Query builder removes calendar aggregation operations when we disable calendar',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA_SimpleCalendarModel,
      stub_RawLambda(),
      'test::mapping',
      'test::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_Calendar,
    );
    const employeeClass =
      queryBuilderState.graphManagerState.graph.getClass('test::Employee');
    await act(async () => {
      queryBuilderState.changeClass(employeeClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Employee'));
    await waitFor(() => getAllByText(queryBuilderSetup, 'mapping'));
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
          TEST_DATA__simpleProjectionWithCalendarAggregation.parameters,
          TEST_DATA__simpleProjectionWithCalendarAggregation.body,
        ),
      );
    });

    const tdsStateOne = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );

    // check calendar aggregation function
    expect(tdsStateOne.aggregationState.columns.length).toBe(1);
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction,
    ).toBeDefined();
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction?.calendarType,
    ).toBe(QUERY_BUILDER_CALENDAR_TYPE.NY);
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction?.getLabel(),
    ).toBe(YTD);
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction?.dateColumn
        ?.func.value.name,
    ).toBe('hireDate');

    // disable calendar
    await act(async () => {
      tdsStateOne.aggregationState.disableCalendar();
    });

    // check that calendar aggregations are removed
    expect(tdsStateOne.aggregationState.columns.length).toBe(1);
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction,
    ).toBeUndefined();
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with calendar aggregation having derivation column',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA_SimpleCalendarModel,
      stub_RawLambda(),
      'test::mapping',
      'test::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_Calendar,
    );
    const employeeClass =
      queryBuilderState.graphManagerState.graph.getClass('test::Employee');
    await act(async () => {
      queryBuilderState.changeClass(employeeClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Employee'));
    await waitFor(() => getAllByText(queryBuilderSetup, 'mapping'));
    const treeData = guaranteeNonNullable(
      queryBuilderState.explorerState.treeData,
    );
    const rootNode = guaranteeType(
      treeData.nodes.get(treeData.rootIds[0] as string),
      QueryBuilderExplorerTreeRootNodeData,
    );

    expect(rootNode.mappingData.mapped).toBe(true);

    // mock monaco editor
    MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
      readOnly: true,
    });
    MockedMonacoEditorAPI.removeAllMarkers.mockReturnValue(null);
    MockedMonacoEditorInstance.onDidFocusEditorWidget.mockReturnValue(null);
    const MOCK__pureCodeToLambda = createMock();
    const MOCK__lambdaToPureCode = createMock();
    queryBuilderState.graphManagerState.graphManager.pureCodeToLambda =
      MOCK__pureCodeToLambda;
    queryBuilderState.graphManagerState.graphManager.lambdasToPureCode =
      MOCK__lambdaToPureCode;
    const mockValue = new Map<string, string>();
    mockValue.set('query-builder', 'test');
    MOCK__lambdaToPureCode.mockResolvedValue(mockValue);

    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__simpleDerivationWithCalendarAggregation.parameters,
          TEST_DATA__simpleDerivationWithCalendarAggregation.body,
        ),
      );
    });

    const tdsStateOne = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );

    // check calendar aggregation function
    expect(tdsStateOne.aggregationState.columns.length).toBe(1);
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction,
    ).toBeDefined();
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction?.calendarType,
    ).toBe(QUERY_BUILDER_CALENDAR_TYPE.LDN);
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction?.getLabel(),
    ).toBe(CME);
    expect(
      tdsStateOne.aggregationState.columns[0]?.calendarFunction?.dateColumn
        ?.func.value.name,
    ).toBe('hireDate');
  },
);
