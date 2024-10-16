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

import { DependencyManager, stub_RawLambda } from '@finos/legend-graph';
import { integrationTest } from '@finos/legend-shared/test';
import TEST_DATA_SimpleCalendarModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_Calendar.json' with { type: 'json' };
import { expect, test } from '@jest/globals';
import {
  fireEvent,
  getByText,
  getByTitle,
  waitFor,
} from '@testing-library/dom';
import { act } from 'react';
import { TEST_DATA__ModelCoverageAnalysisResult_Calendar } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Calendar.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  dragAndDrop,
  TEST__setUpQueryBuilder,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import type { EntitiesWithOrigin } from '@finos/legend-storage';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';
import type { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderDerivationProjectionColumnState } from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';

const firstDependencyEntities = {
  groupId: 'group-1',
  artifactId: 'artifact-1',
  versionId: '1.0.0',
  entities: [
    {
      path: 'test::Address',
      content: {
        _type: 'class',
        name: 'Address',
        package: 'test',
        properties: [
          {
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'zipCode',
            type: 'String',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::type::Class',
    },
    {
      classifierPath:
        'meta::pure::metamodel::function::ConcreteFunctionDefinition',
      path: 'domain::testFunction__String_1_',
      content: {
        _type: 'function',
        body: [
          {
            _type: 'string',
            value: '',
          },
        ],
        name: 'testFunction__String_1_',
        package: 'domain',
        parameters: [],
        postConstraints: [],
        preConstraints: [],
        returnMultiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        returnType: 'String',
      },
    },
    {
      classifierPath:
        'meta::pure::metamodel::function::ConcreteFunctionDefinition',
      path: 'domain::my::testFunction2__String_1_',
      content: {
        _type: 'function',
        body: [
          {
            _type: 'string',
            value: '',
          },
        ],
        name: 'testFunction2_String_1__Address_1__String_1_',
        package: 'domain::my',
        parameters: [
          {
            _type: 'var',
            class: 'String',
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'name',
          },
          {
            _type: 'var',
            class: 'test::Address',
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'address',
          },
        ],
        postConstraints: [],
        preConstraints: [],
        returnMultiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        returnType: 'String',
      },
    },
  ],
};

test(
  integrationTest('Query builder successfully renders function explorer tree'),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA_SimpleCalendarModel,
      stub_RawLambda(),
      'test::mapping',
      'test::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_Calendar,
    );

    const dependencyManager = new DependencyManager([]);
    const dependencyEntitiesIndex = new Map<string, EntitiesWithOrigin>();
    dependencyEntitiesIndex.set(
      'group-1:artifact-2:1.0.0',
      firstDependencyEntities,
    );
    const graphManagerState = queryBuilderState.graphManagerState;
    graphManagerState.graph.dependencyManager = dependencyManager;
    await graphManagerState.graphManager.buildDependencies(
      graphManagerState.coreModel,
      graphManagerState.systemModel,
      dependencyManager,
      dependencyEntitiesIndex,
      graphManagerState.dependenciesBuildState,
    );
    expect(graphManagerState.dependenciesBuildState.hasSucceeded).toBe(true);

    const employeeClass =
      queryBuilderState.graphManagerState.graph.getClass('test::Employee');
    await act(async () => {
      queryBuilderState.changeClass(employeeClass);
    });
    fireEvent.click(renderResult.getByText('Advanced'));
    fireEvent.click(renderResult.getByText('Show Function(s)'));
    const queryBuilderFunctionPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FUNCTIONS),
    );
    expect(
      getByText(queryBuilderFunctionPanel, 'test::testYtd():Any[*]'),
    ).not.toBeNull();
    fireEvent.click(
      getByTitle(queryBuilderFunctionPanel, 'Show Options Menu...'),
    );
    fireEvent.click(
      renderResult.getByText('Show functions from dependency projects'),
    );
    expect(
      getByText(queryBuilderFunctionPanel, 'domain::testFunction():String[1]'),
    ).not.toBeNull();
    expect(
      getByText(
        queryBuilderFunctionPanel,
        'domain::my::testFunction2(name:String[1],address:Address[1]):String[1]',
      ),
    ).not.toBeNull();
    fireEvent.click(getByTitle(queryBuilderFunctionPanel, 'View as Tree'));
    expect(getByText(queryBuilderFunctionPanel, 'test')).not.toBeNull();
    fireEvent.click(getByText(queryBuilderFunctionPanel, 'test'));
    expect(
      getByText(queryBuilderFunctionPanel, 'testYtd():Any[*]'),
    ).not.toBeNull();
    expect(getByText(queryBuilderFunctionPanel, 'domain')).not.toBeNull();
    fireEvent.click(getByTitle(queryBuilderFunctionPanel, 'domain'));
    expect(
      getByText(queryBuilderFunctionPanel, 'testFunction():String[1]'),
    ).not.toBeNull();
    fireEvent.click(getByTitle(queryBuilderFunctionPanel, 'my'));
    expect(
      getByText(
        queryBuilderFunctionPanel,
        'testFunction2(name:String[1],address:Address[1]):String[1]',
      ),
    ).not.toBeNull();

    //drag and drop
    MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
      readOnly: true,
    });
    fireEvent.click(getByTitle(queryBuilderFunctionPanel, 'View as List'));
    const tdsProjectionPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
      ),
    );
    const tdsProjectionDropZone = await waitFor(() =>
      getByText(tdsProjectionPanel, 'Add a projection column'),
    );
    const test2Function = await waitFor(() =>
      getByText(
        queryBuilderFunctionPanel,
        'domain::my::testFunction2(name:String[1],address:Address[1]):String[1]',
      ),
    );
    await dragAndDrop(
      test2Function,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );
    // ToDo: figure out how to correctly mock MonacoEditor so that the lambda string
    // will display
    // below logic also tests function call string is generated as expected
    const lambdaString = (
      queryBuilderState.fetchStructureState
        .implementation as QueryBuilderTDSState
    ).tdsColumns
      .filter((t) => t instanceof QueryBuilderDerivationProjectionColumnState)
      .map((t) => t.derivationLambdaEditorState.lambdaString);
    expect(lambdaString.length).toBe(1);
    expect(lambdaString[0]).toBe("x|domain::my::testFunction2('', param1) ");
  },
);
