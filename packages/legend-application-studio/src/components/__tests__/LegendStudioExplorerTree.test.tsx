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
import { act, fireEvent, getByText, waitFor } from '@testing-library/react';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { integrationTest, createMock } from '@finos/legend-shared/test';
import {
  TEST__openElementFromExplorerTree,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../editor/__test-utils__/EditorComponentTestUtils.js';
import { GraphCompilationOutcome } from '../../stores/editor/EditorGraphState.js';
import { LEGEND_STUDIO_TEST_ID } from '../../__lib__/LegendStudioTesting.js';
import { extractElementNameFromPath } from '@finos/legend-graph';
import TEST_DATA__ClassQueryBuilder from './TEST_DATA__ClassQueryBuilderModel.json' with { type: 'json' };
import { TEST__buildQueryBuilderMockedEditorStore } from '../__test-utils__/EmbeddedQueryBuilderTestUtils.js';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';

test(integrationTest('Test Explorer tree context menu '), async () => {
  const MOCK__editorStore = TEST__buildQueryBuilderMockedEditorStore();
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    MOCK__editorStore,
    {
      entities: TEST_DATA__ClassQueryBuilder,
    },
  );
  const classPath = 'model::Person';
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

  await waitFor(() =>
    fireEvent.click(getByText(explorerContextMenu, 'Rename')),
  );
  const renameDialog = await waitFor(() => renderResult.getByRole('dialog'));
  const renamerInput = renameDialog.getElementsByClassName(
    'explorer__element-renamer__input',
  )[0];
  expect(renamerInput).toBeDefined();
  expect(renamerInput?.outerHTML).toContain(classPath);
  await waitFor(() =>
    fireEvent.change(guaranteeNonNullable(renamerInput), {
      target: { value: 'model::PersonRenamed' },
    }),
  );
  await act(async () => {
    fireEvent.click(getByText(renameDialog, 'Rename'));
  });
  expect(getByText(projectExplorer, 'PersonRenamed')).not.toBeNull();
});

test(integrationTest('Test Explorer tree is open in viewer mode'), async () => {
  const MOCK__editorStore = TEST__buildQueryBuilderMockedEditorStore();
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    MOCK__editorStore,
    {
      entities: TEST_DATA__ClassQueryBuilder,
    },
    true,
  );
  const classPath = 'model::Person';
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
  await waitFor(() =>
    fireEvent.click(getByText(explorerContextMenu, 'Copy Path')),
  );
});
