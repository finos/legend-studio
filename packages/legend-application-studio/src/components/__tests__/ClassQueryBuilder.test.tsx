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

import { describe, test, expect } from '@jest/globals';
import { fireEvent, getByText, waitFor } from '@testing-library/react';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { integrationTest, createMock } from '@finos/legend-shared/test';
import { QUERY_BUILDER_TEST_ID } from '@finos/legend-query-builder';
import {
  TEST__openElementFromExplorerTree,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../editor/__test-utils__/EditorComponentTestUtils.js';
import { GraphCompilationOutcome } from '../../stores/editor/EditorGraphState.js';
import { LEGEND_STUDIO_TEST_ID } from '../../__lib__/LegendStudioTesting.js';
import { queryClass } from '../editor/editor-group/uml-editor/ClassQueryBuilder.js';
import { extractElementNameFromPath } from '@finos/legend-graph';
import TEST_DATA__ClassQueryBuilder from './TEST_DATA__ClassQueryBuilderModel.json' with { type: 'json' };
import { TEST__buildQueryBuilderMockedEditorStore } from '../__test-utils__/EmbeddedQueryBuilderTestUtils.js';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';

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

        const MOCK__GlobalCompileInFormModeFn = createMock();
        MOCK__editorStore.graphEditorMode.globalCompile =
          MOCK__GlobalCompileInFormModeFn;
        MOCK__editorStore.graphState.setMostRecentCompilationOutcome(
          GraphCompilationOutcome.SUCCEEDED,
        );

        MOCK__editorStore.graphManagerState.graphManager.analyzeMappingModelCoverage =
          createMock();
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
