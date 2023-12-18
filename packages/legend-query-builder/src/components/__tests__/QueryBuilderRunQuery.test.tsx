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
import { fireEvent, getByText, act, getByRole } from '@testing-library/react';
import { TEST_DATA__simpleProjection } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import { TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' assert { type: 'json' };
import { guaranteeType } from '@finos/legend-shared';
import { createSpy, integrationTest } from '@finos/legend-shared/test';
import {
  create_RawLambda,
  stub_RawLambda,
  V1_PureGraphManager,
} from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';

const mocked =
  '{"builder": {"_type":"tdsBuilder","columns":[{"name":"Age","type":"Integer","relationalType":"INTEGER"},{"name":"First Name","type":"String","relationalType":"VARCHAR(200)"}]}, "activities": [{"_type":"relational","comment":"","sql":"select"}], "result" : {"columns" : ["Age","First Name"], "rows" : [{"values": [22,"John"]},{"values": [129305879132475986,"Olivia"]},{"values": [1450,"Henry"]},{"values": [55,"https://www.google.com/"]}]}}';
// TODO make more generic. maybe pass string execution result and what we expect to render for each test case
test(
  integrationTest(
    'Query Builder run query and render execution result with integers above javascript max',
  ),
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
    createSpy(pureManager.engine, 'runQueryAndReturnString').mockResolvedValue(
      mocked,
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
    const GOOGLE_LINK = 'https://www.google.com/';
    const knownValues = [
      'First Name',
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
    ];
    knownValues.forEach((val) =>
      expect(getByText(tdsResult, val)).toBeDefined(),
    );

    // test
    const link = getByRole(tdsResult, 'link', {
      name: GOOGLE_LINK,
    });
    expect((link as HTMLAnchorElement).href).toEqual(GOOGLE_LINK);
  },
);
