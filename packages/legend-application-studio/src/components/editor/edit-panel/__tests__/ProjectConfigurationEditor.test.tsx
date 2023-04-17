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
import {
  type RenderResult,
  getByDisplayValue,
  waitFor,
  fireEvent,
  getByText,
} from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../__test-utils__/EditorComponentTestUtils.js';
import { TEST_DATA__EmptyProjectDependencyReport } from './TEST_DATA__ProjectDependencyReport.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../application/LegendStudioTesting.js';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';

let renderResult: RenderResult;

const TEST_DATA__ProjectConfiguration = {
  projectStructureVersion: { version: 10, extensionVersion: 1 },
  projectId: 'PROD-1234',
  groupId: 'org.finos.legend',
  artifactId: 'dependency-test',
  projectDependencies: [],
  metamodelDependencies: [],
};

const TEST_DATA__latestProjectStructure = { version: 11, extensionVersion: 1 };

let MOCK__editorStore: EditorStore;
beforeEach(async () => {
  MOCK__editorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore, {
    entities: [],
    projectConfiguration: TEST_DATA__ProjectConfiguration,
    latestProjectStructureVersion: TEST_DATA__latestProjectStructure,
    dependencyReport: TEST_DATA__EmptyProjectDependencyReport,
  });
  fireEvent.click(renderResult.getByTitle('Project Configuration Panel'));
  const editPanel = await renderResult.findByTestId(
    LEGEND_STUDIO_TEST_ID.EDIT_PANEL_CONTENT,
  );
  const updateButton = getByText(editPanel, 'Update');
  expect(updateButton.getAttribute('disabled')).not.toBeNull();
  await waitFor(() => renderResult.getByText('Project Structure'));
});

test(integrationTest('Test Project Structure'), async () => {
  const editPanel = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EDIT_PANEL_CONTENT,
  );
  await waitFor(() => getByText(editPanel, 'PROJECT STRUCTURE VERSION 10.1'));
  await waitFor(() => getByText(editPanel, 'Update to version 11.1'));
  await waitFor(() => getByDisplayValue(editPanel, 'org.finos.legend'));
  await waitFor(() => getByDisplayValue(editPanel, 'dependency-test'));
  // TODO: test update project structure
});
