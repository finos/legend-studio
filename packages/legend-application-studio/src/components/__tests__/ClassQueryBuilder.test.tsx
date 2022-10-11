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

import { describe, test, jest, expect } from '@jest/globals';
import { fireEvent, getByText, waitFor } from '@testing-library/react';
import {
  type TEMPORARY__JestMock,
  integrationTest,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { MockedMonacoEditorInstance } from '@finos/legend-art';
import { QUERY_BUILDER_TEST_ID } from '@finos/legend-query-builder';
import {
  TEST__openElementFromExplorerTree,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../EditorComponentTestUtils.js';
import { FormModeCompilationOutcome } from '../../stores/EditorGraphState.js';
import { LEGEND_STUDIO_TEST_ID } from '../LegendStudioTestID.js';
import { queryClass } from '../editor/edit-panel/uml-editor/ClassQueryBuilder.js';
import { extractElementNameFromPath } from '@finos/legend-graph';
import TEST_DATA__ClassQueryBuilder from './TEST_DATA__ClassQueryBuilderModel.json';
import { TEST__buildQueryBuilderMockedEditorStore } from './EmbeddedQueryBuilderTestUtils.js';

type TestCase = [
  string,
  {
    classPath: string;
    hasProcessingDate: boolean;
    hasBusinessDate: boolean;
    noOfParameters: number;
  },
];

const cases: TestCase[] = [
  [
    'Open query builder by querying a processing temporal milestoned class',
    {
      classPath: 'model::Person_ProcessingTemporal',
      hasProcessingDate: true,
      hasBusinessDate: false,
      noOfParameters: 1,
    },
  ],
  [
    'Open query builder by querying a bitemporal class',
    {
      classPath: 'model::Person_Bitemporal',
      hasProcessingDate: true,
      hasBusinessDate: true,
      noOfParameters: 2,
    },
  ],
  [
    'Open query builder by querying a business temporal milestoned class',
    {
      classPath: 'model::Person_BusinessTemporal',
      hasProcessingDate: false,
      hasBusinessDate: true,
      noOfParameters: 1,
    },
  ],
];

describe(
  integrationTest('Test querying of milestoned classes from explorer tree'),
  () => {
    test.each(cases)(
      '%s',
      async (testName: TestCase[0], testCase: TestCase[1]) => {
        const {
          classPath,
          hasProcessingDate,
          hasBusinessDate,
          noOfParameters,
        } = testCase;
        const MOCK__editorStore = TEST__buildQueryBuilderMockedEditorStore();
        const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
          MOCK__editorStore,
          {
            entities: TEST_DATA__ClassQueryBuilder,
          },
        );

        const MockedGlobalCompileInFormModeFn = jest.fn<TEMPORARY__JestMock>();
        MOCK__editorStore.graphState.globalCompileInFormMode =
          MockedGlobalCompileInFormModeFn;
        MockedGlobalCompileInFormModeFn.mockReturnValue(
          Promise.resolve(FormModeCompilationOutcome.SUCCEEDED),
        );
        MOCK__editorStore.graphManagerState.graphManager.analyzeMappingModelCoverage =
          jest.fn<TEMPORARY__JestMock>();
        MockedMonacoEditorInstance.getValue.mockReturnValue('');

        await TEST__openElementFromExplorerTree(classPath, renderResult);

        const projectExplorer = renderResult.getByTestId(
          LEGEND_STUDIO_TEST_ID.EXPLORER_TREES,
        );
        const elementInExplorer = getByText(
          projectExplorer,
          extractElementNameFromPath(classPath),
        );
        fireEvent.contextMenu(elementInExplorer);

        const explorerContextMenu = renderResult.getByTestId(
          LEGEND_STUDIO_TEST_ID.EXPLORER_CONTEXT_MENU,
        );

        fireEvent.click(getByText(explorerContextMenu, 'Query...'));
        const queryBuilder = await waitFor(() =>
          renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
        );
        await waitFor(() =>
          getByText(queryBuilder, extractElementNameFromPath(classPath)),
        );
        const queryBuilderState =
          MOCK__editorStore.embeddedQueryBuilderState.queryBuilderState;
        const _personClass = queryBuilderState?.class;
        await waitFor(() =>
          queryClass(guaranteeNonNullable(_personClass), MOCK__editorStore),
        );
        expect(
          queryBuilderState?.milestoningState.processingDate !== undefined,
        ).toBe(hasProcessingDate);
        expect(
          queryBuilderState?.milestoningState.businessDate !== undefined,
        ).toBe(hasBusinessDate);
        expect(queryBuilderState?.parametersState.parameterStates.length).toBe(
          noOfParameters,
        );
      },
    );
  },
);
