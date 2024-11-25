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

import { test } from '@jest/globals';
import { fireEvent, getByText, waitFor } from '@testing-library/react';
import { integrationTest, createMock } from '@finos/legend-shared/test';
import { QUERY_BUILDER_TEST_ID } from '@finos/legend-query-builder';
import {
  TEST__openElementFromExplorerTree,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../editor/__test-utils__/EditorComponentTestUtils.js';
import { GraphCompilationOutcome } from '../../stores/editor/EditorGraphState.js';
import { LEGEND_STUDIO_TEST_ID } from '../../__lib__/LegendStudioTesting.js';
import { TEST__buildQueryBuilderMockedEditorStore } from '../__test-utils__/EmbeddedQueryBuilderTestUtils.js';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';

const entities = [
  {
    path: 'model::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::MyMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'model::Person',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'model::Person',
                property: 'name',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                    property: 'name',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
          srcClass: 'model::Person',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'MyMapping',
      package: 'model',
      tests: [
        {
          assert: {
            _type: 'expectedOutputMappingTestAssert',
            expectedOutput: '{}',
          },
          inputData: [
            {
              _type: 'object',
              data: '{"name":"name 81"}',
              inputType: 'JSON',
              sourceClass: 'model::Person',
            },
          ],
          name: 'test_1',
          query: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'getAll',
                parameters: [
                  {
                    _type: 'packageableElementPtr',
                    fullPath: 'model::Person',
                  },
                ],
              },
            ],
            parameters: [],
          },
        },
      ],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'model::MyService',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: '',
      execution: {
        _type: 'pureSingleExecution',
        func: {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'getAll',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'model::Person',
                },
              ],
            },
          ],
          parameters: [],
        },
        mapping: 'model::MyMapping',
        runtime: {
          _type: 'engineRuntime',
          connections: [
            {
              store: {
                path: 'ModelStore',
                type: 'STORE',
              },
              storeConnections: [
                {
                  connection: {
                    _type: 'JsonModelConnection',
                    class: 'model::Person',
                    url: 'data:application/json,%7B%7D',
                  },
                  id: 'connection_1',
                },
              ],
            },
          ],
          mappings: [
            {
              path: 'model::MyMapping',
              type: 'MAPPING',
            },
          ],
        },
      },
      name: 'MyService',
      owners: [],
      package: 'model',
      pattern: '/e7548fc1-cac3-4056-b95c-f50892f4fc6c',
      test: {
        _type: 'singleExecutionTest',
        asserts: [],
        data: '',
      },
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
];

test(integrationTest('Open query builder by querying a class'), async () => {
  const MOCK__editorStore = TEST__buildQueryBuilderMockedEditorStore();
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    MOCK__editorStore,
    { entities },
  );

  const MOCK__GlobalCompileInFormModeFn = createMock();
  MOCK__editorStore.graphEditorMode.globalCompile =
    MOCK__GlobalCompileInFormModeFn;
  MOCK__editorStore.graphState.setMostRecentCompilationOutcome(
    GraphCompilationOutcome.SUCCEEDED,
  );
  MOCK__editorStore.graphManagerState.graphManager.analyzeMappingModelCoverage =
    createMock();
  MockedMonacoEditorInstance.getValue.mockReturnValue('');

  await TEST__openElementFromExplorerTree('model::Person', renderResult);

  const projectExplorer = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EXPLORER_TREES,
  );
  const elementInExplorer = getByText(projectExplorer, 'Person');
  fireEvent.contextMenu(elementInExplorer);

  const explorerContextMenu = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EXPLORER_CONTEXT_MENU,
  );

  fireEvent.click(getByText(explorerContextMenu, 'Query...'));
  await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
  );
});

test(
  integrationTest('Open query builder by editing query of a mapping execution'),
  async () => {
    const MOCK__editorStore = TEST__buildQueryBuilderMockedEditorStore();
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      MOCK__editorStore,
      { entities },
    );

    const MOCK__GlobalCompileInFormModeFn = createMock();
    MOCK__editorStore.graphEditorMode.globalCompile =
      MOCK__GlobalCompileInFormModeFn;
    MOCK__editorStore.graphState.setMostRecentCompilationOutcome(
      GraphCompilationOutcome.SUCCEEDED,
    );
    MOCK__editorStore.graphManagerState.graphManager.lambdasToPureCode =
      createMock();
    MOCK__editorStore.graphManagerState.graphManager.analyzeMappingModelCoverage =
      createMock();
    MockedMonacoEditorInstance.getValue.mockReturnValue('');

    await TEST__openElementFromExplorerTree('model::MyMapping', renderResult);

    const mappingExplorer = renderResult.getByTestId(
      LEGEND_STUDIO_TEST_ID.MAPPING_EXPLORER,
    );
    const classMappingInExplorer = getByText(mappingExplorer, 'Person');
    fireEvent.contextMenu(classMappingInExplorer);

    fireEvent.click(renderResult.getByText('Query'));
    await waitFor(() => renderResult.getByTitle('Edit query...'));
    fireEvent.click(renderResult.getByTitle('Edit query...'));

    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
    );
  },
);

test(
  integrationTest('Open query builder by editing query of a mapping test'),
  async () => {
    const MOCK__editorStore = TEST__buildQueryBuilderMockedEditorStore();
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      MOCK__editorStore,
      { entities },
    );

    const MOCK__GlobalCompileInFormModeFn = createMock();
    MOCK__editorStore.graphEditorMode.globalCompile =
      MOCK__GlobalCompileInFormModeFn;
    MOCK__editorStore.graphState.setMostRecentCompilationOutcome(
      GraphCompilationOutcome.SUCCEEDED,
    );
    MOCK__editorStore.graphManagerState.graphManager.lambdasToPureCode =
      createMock();
    MOCK__editorStore.graphManagerState.graphManager.analyzeMappingModelCoverage =
      createMock();
    MockedMonacoEditorInstance.getValue.mockReturnValue('');

    await TEST__openElementFromExplorerTree('model::MyMapping', renderResult);
    fireEvent.click(renderResult.getByText('test_1'));
    await waitFor(() => renderResult.getByText('Edit Query'));
    fireEvent.click(renderResult.getByText('Edit Query'));

    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
    );
  },
);

test(
  integrationTest('Open query builder by editing query of a service'),
  async () => {
    const MOCK__editorStore = TEST__buildQueryBuilderMockedEditorStore();
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      MOCK__editorStore,
      { entities },
    );

    const MOCK__GlobalCompileInFormModeFn = createMock();
    MOCK__editorStore.graphEditorMode.globalCompile =
      MOCK__GlobalCompileInFormModeFn;
    MOCK__editorStore.graphState.setMostRecentCompilationOutcome(
      GraphCompilationOutcome.SUCCEEDED,
    );
    MOCK__editorStore.graphManagerState.graphManager.lambdasToPureCode =
      createMock();
    MOCK__editorStore.graphManagerState.graphManager.analyzeMappingModelCoverage =
      createMock();
    MockedMonacoEditorInstance.getValue.mockReturnValue('');

    await TEST__openElementFromExplorerTree('model::MyService', renderResult);
    fireEvent.click(renderResult.getByText('Execution'));
    await waitFor(() => renderResult.getByText('Edit Query'));
    fireEvent.click(renderResult.getByText('Edit Query'));

    await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
    );
  },
);
