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

import { test, expect, beforeEach } from '@jest/globals';
import { createSpy, integrationTest } from '@finos/legend-shared/test';
import {
  type RenderResult,
  getAllByText,
  waitFor,
  getByText,
  fireEvent,
  getByTitle,
  getByPlaceholderText,
} from '@testing-library/react';
import {
  TEST_DATA__ModelToModelMapping,
  TEST_DATA__ModelToModelMappingAnalysis,
} from './TEST_DATA__ModelToModelMapping.js';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import type { EditorStore } from '../../../../../stores/editor/EditorStore.js';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';
import { createGraphFetchQueryFromMappingAnalysis } from '../../../../../stores/editor/editor-state/element-editor-state/mapping/testable/MappingTestingHelper.js';

let renderResult: RenderResult;
let MOCK__editorStore: EditorStore;

beforeEach(async () => {
  MOCK__editorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore, {
    entities: TEST_DATA__ModelToModelMapping,
  });
});

test(integrationTest('Mapping test editor functionality'), async () => {
  await TEST__openElementFromExplorerTree(
    'mapping::ModelToModelMapping',
    renderResult,
  );
  const editorGroupHeader = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP__HEADER_TABS),
  );
  await waitFor(() => getByText(editorGroupHeader, 'ModelToModelMapping'));
  const mappingExplorer = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.MAPPING_EXPLORER),
  );
  await waitFor(() => getByText(mappingExplorer, '_Firm'));
  await waitFor(() => getByText(mappingExplorer, '_Person'));
  await waitFor(() => getByText(mappingExplorer, 'IncType'));
  const editorGroup = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.MAPPING_EDITOR),
  );
  fireEvent.click(getByText(editorGroup, 'Test Suites'));
  await waitFor(() => getAllByText(editorGroup, 'Add Test Suite'));
  expect(getAllByText(editorGroup, 'Add Test Suite')).toHaveLength(2);
  fireEvent.click(getByTitle(editorGroup, 'Add Mapping Suite'));
  const createNewSuite = await waitFor(() => renderResult.getByRole('dialog'));
  await waitFor(() => getByText(createNewSuite, 'Create Mapping Test Suite'));
  await waitFor(() => getByText(createNewSuite, 'Test Suite Name'));
  await waitFor(() => getByText(createNewSuite, 'Test Name'));
  await waitFor(() => getByText(createNewSuite, 'Class Mapping'));
  expect(getByText(createNewSuite, 'Create').hasAttribute('disabled')).toBe(
    true,
  );
  await waitFor(() =>
    getByTitle(createNewSuite, 'Suite Name and Test Name Required'),
  );
  await waitFor(() => getByText(createNewSuite, 'model::target::_Firm'));
  await waitFor(() => getByText(createNewSuite, '_Firm'));

  // inputs
  const suiteInput = getByPlaceholderText(createNewSuite, 'Suite Name');

  fireEvent.change(suiteInput, {
    target: { value: 'my Suite' },
  });
  await waitFor(() => getByText(createNewSuite, `ID can't contain spaces`));

  fireEvent.change(suiteInput, {
    target: { value: '' },
  });
  await waitFor(() => getByText(createNewSuite, `ID is required`));

  fireEvent.change(suiteInput, {
    target: { value: 'FirmSuite' },
  });

  const testInput = getByPlaceholderText(createNewSuite, 'Test Name');

  fireEvent.change(testInput, {
    target: { value: 'my test' },
  });
  await waitFor(() => getByText(createNewSuite, `ID can't contain spaces`));

  fireEvent.change(testInput, {
    target: { value: '' },
  });
  await waitFor(() => getByText(createNewSuite, `ID is required`));

  fireEvent.change(testInput, {
    target: { value: 'FirmTest' },
  });
  expect(getByText(createNewSuite, 'Create').hasAttribute('disabled')).toBe(
    false,
  );

  MockedMonacoEditorInstance.getValue.mockReturnValue('');
  const mapping = MOCK__editorStore.graphManagerState.graph.getMapping(
    'mapping::ModelToModelMapping',
  );
  createSpy(
    MOCK__editorStore.graphManagerState.graphManager,
    'analyzeMappingModelCoverage',
  ).mockResolvedValue(
    MOCK__editorStore.graphManagerState.graphManager.buildMappingModelCoverageAnalysisResult(
      TEST_DATA__ModelToModelMappingAnalysis,
      mapping,
    ),
  );
});

const expectedGraphFetchLambda = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'serialize',
      parameters: [
        {
          _type: 'func',
          function: 'graphFetch',
          parameters: [
            {
              _type: 'func',
              function: 'getAll',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'model::target::_Firm',
                },
              ],
            },
            {
              _type: 'classInstance',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              type: 'rootGraphFetchTree',
              value: {
                _type: 'rootGraphFetchTree',
                class: 'model::target::_Firm',
                subTrees: [
                  {
                    _type: 'propertyGraphFetchTree',
                    parameters: [],
                    property: 'employees',
                    subTrees: [
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'fullName',
                        subTrees: [],
                        subTypeTrees: [],
                      },
                    ],
                    subTypeTrees: [],
                  },
                  {
                    _type: 'propertyGraphFetchTree',
                    parameters: [],
                    property: 'name',
                    subTrees: [],
                    subTypeTrees: [],
                  },
                  {
                    _type: 'propertyGraphFetchTree',
                    parameters: [],
                    property: 'myLegalName',
                    subTrees: [],
                    subTypeTrees: [],
                  },
                ],
                subTypeTrees: [],
              },
            },
          ],
        },
        {
          _type: 'classInstance',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          type: 'rootGraphFetchTree',
          value: {
            _type: 'rootGraphFetchTree',
            class: 'model::target::_Firm',
            subTrees: [
              {
                _type: 'propertyGraphFetchTree',
                parameters: [],
                property: 'employees',
                subTrees: [
                  {
                    _type: 'propertyGraphFetchTree',
                    parameters: [],
                    property: 'fullName',
                    subTrees: [],
                    subTypeTrees: [],
                  },
                ],
                subTypeTrees: [],
              },
              {
                _type: 'propertyGraphFetchTree',
                parameters: [],
                property: 'name',
                subTrees: [],
                subTypeTrees: [],
              },
              {
                _type: 'propertyGraphFetchTree',
                parameters: [],
                property: 'myLegalName',
                subTrees: [],
                subTypeTrees: [],
              },
            ],
            subTypeTrees: [],
          },
        },
      ],
    },
  ],
  parameters: [],
};
test(integrationTest('Mapping test - create graph fetch query'), async () => {
  const mapping = MOCK__editorStore.graphManagerState.graph.getMapping(
    'mapping::ModelToModelMapping',
  );
  const _class = MOCK__editorStore.graphManagerState.graph.getClass(
    'model::target::_Firm',
  );
  const analysis =
    MOCK__editorStore.graphManagerState.graphManager.buildMappingModelCoverageAnalysisResult(
      TEST_DATA__ModelToModelMappingAnalysis,
      mapping,
    );

  const rawLambda = createGraphFetchQueryFromMappingAnalysis(
    _class,
    MOCK__editorStore.graphManagerState,
    analysis,
  );
  const jsonQuery =
    MOCK__editorStore.graphManagerState.graphManager.serializeRawValueSpecification(
      rawLambda,
    );
  expect(expectedGraphFetchLambda).toEqual(jsonQuery);
});
