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
  fireEvent,
  getByText,
  act,
  getByRole,
  queryAllByText,
  findByText,
  getByTitle,
  queryByText,
} from '@testing-library/react';
import {
  TEST_DATA__projectionWithSimpleDerivationAndAggregation,
  TEST_DATA__simpleProjection,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import TEST_DATA__QueryBuilder_Model_SimpleRelational from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelational.json';
import {
  TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists,
} from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' with { type: 'json' };
import { guaranteeType } from '@finos/legend-shared';
import { createSpy, integrationTest } from '@finos/legend-shared/test';
import {
  create_RawLambda,
  stub_RawLambda,
  V1_EXECUTION_RESULT,
  V1_PureGraphManager,
} from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { filterByOrOutValues } from '../result/tds/QueryBuilderTDSResultShared.js';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';

const GOOGLE_LINK = 'https://www.google.com/';
const mockedResult = {
  builder: {
    _type: 'tdsBuilder',
    columns: [
      { name: 'Age', type: 'Integer', relationalType: 'INTEGER' },
      {
        name: 'Edited First Name',
        type: 'String',
        relationalType: 'VARCHAR(200)',
      },
      { name: 'Last Reported Flag', type: 'Boolean', relationalType: 'BIT' },
    ],
  },
  activities: [{ _type: 'relational', comment: '', sql: 'select' }],
  result: {
    columns: ['Age', 'Edited First Name', 'Last Reported Flag'],
    rows: [
      { values: [22, 'John', true] },
      { values: ['129305879132475986', 'Olivia', false] },
      { values: [1450, 'Henry', true] },
      { values: [55, GOOGLE_LINK, null] },
    ],
  },
};
// TODO make more generic. maybe pass string execution result and what we expect to render for each test case
test(
  integrationTest('Query Builder run query and render execution result'),
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
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__simpleProjection.parameters,
          TEST_DATA__simpleProjection.body,
        ),
      );
    });
    fireEvent.click(renderResult.getByText('Run Query'));
    const param = renderResult.getByRole('dialog');
    const graphManager = queryBuilderState.graphManagerState.graphManager;
    const pureManager = guaranteeType(graphManager, V1_PureGraphManager);
    const executionResultMap = new Map<string, string>();
    executionResultMap.set(V1_EXECUTION_RESULT, JSON.stringify(mockedResult));
    createSpy(pureManager.engine, 'runQueryAndReturnMap').mockResolvedValue(
      executionResultMap,
    );
    // await
    await act(async () => {
      fireEvent.click(getByText(param, 'Run'));
    });
    const result = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_PANEL,
    );
    expect(getByText(result, 'Run Query')).toBeDefined();
    expect(getByText(result, '4 row(s)', { exact: false })).toBeDefined();
    const tdsResult = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_VALUES_TDS,
    );
    const knownValues = [
      'Edited First Name',
      'John',
      'Henry',
      'Olivia',
      GOOGLE_LINK,
      'Age',
      '22',
      '55',
      // edge cases: show big int, ints should be separated by commas
      '129305879132475986',
      '1,450',
      'false',
    ];
    knownValues.forEach((val) =>
      expect(getByText(tdsResult, val)).toBeDefined(),
    );

    expect(queryAllByText(tdsResult, 'true')).toHaveLength(2);

    // test
    const link = getByRole(tdsResult, 'link', {
      name: GOOGLE_LINK,
    });
    expect((link as HTMLAnchorElement).href).toEqual(GOOGLE_LINK);

    const henryFilter = getByText(tdsResult, 'Henry');
    fireEvent.mouseDown(henryFilter);
    const state = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );

    await act(async () => {
      await filterByOrOutValues(
        queryBuilderState.applicationStore,
        queryBuilderState.resultState.mousedOverCell,
        true,
        state,
      );
    });
    const filterPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
    );

    expect(await findByText(filterPanel, 'First Name')).not.toBeNull();
    expect(await findByText(filterPanel, 'is')).not.toBeNull();
    expect(await findByText(filterPanel, '"Henry"')).not.toBeNull();

    // remove post-filter
    fireEvent.click(getByTitle(filterPanel, 'Remove'));
    expect(queryByText(filterPanel, 'First Name')).toBeNull();
    expect(queryByText(filterPanel, 'is')).toBeNull();
    expect(queryByText(filterPanel, '"Henry"')).toBeNull();

    // re-add post-filter
    await act(async () => {
      await filterByOrOutValues(
        queryBuilderState.applicationStore,
        queryBuilderState.resultState.mousedOverCell,
        true,
        state,
      );
    });
    expect(await findByText(filterPanel, 'First Name')).not.toBeNull();
    expect(await findByText(filterPanel, 'is')).not.toBeNull();
    expect(await findByText(filterPanel, '"Henry"')).not.toBeNull();
  },
);

const mockedResultForFilterTest = {
  builder: {
    _type: 'tdsBuilder',
    columns: [
      { name: 'Id', type: 'Integer', relationalType: 'INTEGER' },
      { name: '(derivation)', type: 'String', relationalType: 'VARCHAR(200)' },
      {
        name: 'Employees/First Name',
        type: 'String',
        relationalType: 'VARCHAR(200)',
      },
      {
        name: 'Id (sum)',
        type: 'Integer',
        relationalType: 'INTEGER',
      },
    ],
  },
  activities: [{ _type: 'relational', comment: '', sql: 'select' }],
  result: {
    columns: ['Id', '(derivation)', 'Employees/First Name', 'Id (sum)'],
    rows: [
      { values: [22, 'test derivation 1', 'John', 45] },
      { values: [23, 'test derivation 2', 'Olivia', 46] },
    ],
  },
};
test(
  integrationTest(
    'Query Builder result panel "filter by" creates filter for simple projection and post-filter for others',
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
    });
    MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
      readOnly: false,
    });
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__projectionWithSimpleDerivationAndAggregation.parameters,
          TEST_DATA__projectionWithSimpleDerivationAndAggregation.body,
        ),
      );
    });

    // Mock result
    const graphManager = queryBuilderState.graphManagerState.graphManager;
    const pureManager = guaranteeType(graphManager, V1_PureGraphManager);
    const executionResultMap = new Map<string, string>();
    executionResultMap.set(
      V1_EXECUTION_RESULT,
      JSON.stringify(mockedResultForFilterTest),
    );
    createSpy(pureManager.engine, 'runQueryAndReturnMap').mockResolvedValue(
      executionResultMap,
    );

    // Mock derivation return type
    createSpy(graphManager, 'getLambdaReturnType').mockReturnValue(
      Promise.resolve('String'),
    );

    // Run query
    await act(async () => {
      fireEvent.click(renderResult.getByText('Run Query'));
    });
    const resultPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_PANEL,
    );

    // Verify results are present
    expect(getByText(resultPanel, 'Run Query')).toBeDefined();
    expect(getByText(resultPanel, '2 row(s)', { exact: false })).toBeDefined();

    // Create filter with id column
    const tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    const tdsResult = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_VALUES_TDS,
    );
    fireEvent.mouseDown(getByText(tdsResult, 22));
    fireEvent.mouseUp(getByText(tdsResult, 22));

    await act(async () => {
      await filterByOrOutValues(
        queryBuilderState.applicationStore,
        queryBuilderState.resultState.mousedOverCell,
        true,
        tdsState,
      );
    });
    const filterPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
    );

    expect(await findByText(filterPanel, 'Id')).not.toBeNull();
    expect(await findByText(filterPanel, 'is')).not.toBeNull();
    expect(await findByText(filterPanel, '"22"')).not.toBeNull();

    // Add to existing ID filter
    fireEvent.mouseDown(getByText(tdsResult, 23));
    fireEvent.mouseUp(getByText(tdsResult, 23));
    await act(async () => {
      await filterByOrOutValues(
        queryBuilderState.applicationStore,
        queryBuilderState.resultState.mousedOverCell,
        true,
        tdsState,
      );
    });
    expect(await findByText(filterPanel, 'is in list of')).not.toBeNull();
    expect(await findByText(filterPanel, 'List(2): 22,23')).not.toBeNull();

    // Remove filter
    fireEvent.click(getByTitle(filterPanel, 'Remove'));
    expect(queryByText(filterPanel, 'Id')).toBeNull();

    // Create not in filter with id column
    fireEvent.mouseDown(getByText(tdsResult, 22));
    fireEvent.mouseOver(getByText(tdsResult, 23));
    fireEvent.mouseUp(getByText(tdsResult, 23));
    await act(async () => {
      await filterByOrOutValues(
        queryBuilderState.applicationStore,
        queryBuilderState.resultState.mousedOverCell,
        false,
        tdsState,
      );
    });
    expect(await findByText(filterPanel, 'Id')).not.toBeNull();
    expect(await findByText(filterPanel, 'is not in list of')).not.toBeNull();
    expect(await findByText(filterPanel, 'List(2): 22,23')).not.toBeNull();

    // Remove filter
    fireEvent.click(getByTitle(filterPanel, 'Remove'));
    expect(queryByText(filterPanel, 'Id')).toBeNull();

    // Create post-filter with derivation column
    fireEvent.mouseDown(getByText(tdsResult, 'test derivation 1'));
    fireEvent.mouseOver(getByText(tdsResult, 'test derivation 2'));
    fireEvent.mouseUp(getByText(tdsResult, 'test derivation 2'));

    await act(async () => {
      await filterByOrOutValues(
        queryBuilderState.applicationStore,
        queryBuilderState.resultState.mousedOverCell,
        true,
        tdsState,
      );
    });

    const postFilterPanel = renderResult.getByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
    );

    expect(await findByText(postFilterPanel, '(derivation)')).not.toBeNull();
    expect(await findByText(postFilterPanel, 'is in list of')).not.toBeNull();
    expect(
      await findByText(
        postFilterPanel,
        'List(2): test derivation 1,test derivation 2',
      ),
    ).not.toBeNull();

    // Remove filter
    fireEvent.click(getByTitle(postFilterPanel, 'Remove'));
    expect(queryByText(postFilterPanel, '(derivation)')).toBeNull();

    // Create post-filter not in filter with derivation column
    fireEvent.mouseDown(getByText(tdsResult, 'test derivation 1'));
    fireEvent.mouseOver(getByText(tdsResult, 'test derivation 2'));

    await act(async () => {
      await filterByOrOutValues(
        queryBuilderState.applicationStore,
        queryBuilderState.resultState.mousedOverCell,
        false,
        tdsState,
      );
    });

    expect(await findByText(postFilterPanel, '(derivation)')).not.toBeNull();
    expect(
      await findByText(postFilterPanel, 'is not in list of'),
    ).not.toBeNull();
    expect(
      await findByText(
        postFilterPanel,
        'List(2): test derivation 1,test derivation 2',
      ),
    ).not.toBeNull();

    // Remove filter
    fireEvent.click(getByTitle(postFilterPanel, 'Remove'));
    expect(queryByText(postFilterPanel, '(derivation)')).toBeNull();

    // Create post-filter with exploded column
    fireEvent.mouseDown(getByText(tdsResult, 'John'));
    fireEvent.mouseOver(getByText(tdsResult, 'Olivia'));

    await act(async () => {
      await filterByOrOutValues(
        queryBuilderState.applicationStore,
        queryBuilderState.resultState.mousedOverCell,
        true,
        tdsState,
      );
    });

    expect(
      await findByText(postFilterPanel, 'Employees/First Name'),
    ).not.toBeNull();
    expect(await findByText(postFilterPanel, 'is in list of')).not.toBeNull();
    expect(
      await findByText(postFilterPanel, 'List(2): John,Olivia'),
    ).not.toBeNull();

    // Remove filter
    fireEvent.click(getByTitle(postFilterPanel, 'Remove'));
    expect(queryByText(postFilterPanel, 'Employees/First Name')).toBeNull();

    // Create post-filter with aggregation column
    fireEvent.mouseDown(getByText(tdsResult, 45));
    fireEvent.mouseOver(getByText(tdsResult, 46));

    await act(async () => {
      await filterByOrOutValues(
        queryBuilderState.applicationStore,
        queryBuilderState.resultState.mousedOverCell,
        true,
        tdsState,
      );
    });

    expect(await findByText(postFilterPanel, 'Id (sum)')).not.toBeNull();
    expect(await findByText(postFilterPanel, 'is in list of')).not.toBeNull();
    expect(await findByText(postFilterPanel, 'List(2): 45,46')).not.toBeNull();

    // Remove filter
    fireEvent.click(getByTitle(postFilterPanel, 'Remove'));
    expect(queryByText(postFilterPanel, 'Id (sum)')).toBeNull();
  },
);
