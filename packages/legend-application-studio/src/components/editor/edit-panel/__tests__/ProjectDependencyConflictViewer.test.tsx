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
  waitFor,
  fireEvent,
  getByText,
  findByText,
  getByTitle,
  queryByText,
  queryAllByText,
  queryByTitle,
  queryAllByTitle,
} from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../application/LegendStudioTesting.js';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';
import { TEST_DATA__ProjectDependencyReportWithConflict } from './TEST_DATA__ProjectDependencyReport.js';

let renderResult: RenderResult;

const TEST_DATA__ProjectConfiguration = {
  projectStructureVersion: { version: 10, extensionVersion: 1 },
  projectId: 'PROD-1234',
  groupId: 'org.finos.legend',
  artifactId: 'dependency-test',
  projectDependencies: [
    {
      projectId: 'PROD-1',
      versionId: '2.0.0',
    },
    {
      projectId: 'org.finos.legend:prod-2',
      versionId: '3.0.0',
    },
  ],
  metamodelDependencies: [],
};

const TEST_DATA__ProjectData = [
  {
    id: 'PROD-1',
    projectId: 'PROD-1',
    groupId: 'org.finos.legend',
    artifactId: 'prod-1',
    versions: ['1.0.0', '2.0.0'],
    latestVersion: '2.0.0',
  },
];

const TEST_DATA__Projects = [
  {
    id: 'PROD-1',
    projectId: 'PROD-1',
    groupId: 'org.finos.legend',
    artifactId: 'prod-1',
    versions: ['1.0.0', '2.0.0'],
    latestVersion: '2.0.0',
  },
  {
    id: 'PROD-2',
    projectId: 'PROD-2',
    groupId: 'org.finos.legend',
    artifactId: 'prod-2',
    versions: ['1.0.0', '2.0.0', '3.0.0'],
    latestVersion: '3.0.0',
  },
  {
    id: 'PROD-3',
    projectId: 'PROD-3',
    groupId: 'org.finos.legend',
    artifactId: 'prod-3',
    versions: ['1.0.0', '2.0.0', '3.0.0'],
    latestVersion: '3.0.0',
  },
];

const TEST_DATA__DependencyEntities = [
  {
    groupId: 'org.finos.legend',
    artifactId: 'prod-1',
    versionId: '2.0.0',
    versionedEntity: false,
    entities: [],
  },
  {
    groupId: 'org.finos.legend',
    artifactId: 'prod-2',
    versionId: '3.0.0',
    versionedEntity: false,
    entities: [],
  },
];

const TEST_DATA__latestProjectStructure = { version: 11, extensionVersion: 1 };

let MOCK__editorStore: EditorStore;
beforeEach(async () => {
  MOCK__editorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore, {
    entities: [],
    projectConfiguration: TEST_DATA__ProjectConfiguration,
    latestProjectStructureVersion: TEST_DATA__latestProjectStructure,
    projects: TEST_DATA__Projects,
    projectData: TEST_DATA__ProjectData,
    projectDependency: TEST_DATA__DependencyEntities,
    dependencyReport: TEST_DATA__ProjectDependencyReportWithConflict,
  });
  fireEvent.click(renderResult.getByText('config'));
  const editPanel = await renderResult.findByTestId(
    LEGEND_STUDIO_TEST_ID.EDIT_PANEL_CONTENT,
  );
  const updateButton = getByText(editPanel, 'Update');
  expect(updateButton.getAttribute('disabled')).not.toBeNull();
  await waitFor(() => renderResult.getByText('Project Structure'));
});

test(integrationTest('Test Project Report With Conflicts'), async () => {
  const editPanel = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EDIT_PANEL_CONTENT,
  );
  await findByText(editPanel, 'Project Dependencies');
  fireEvent.click(getByText(editPanel, 'Project Dependencies'));

  // NOTE: We do this check to ensure the async processes is done to avoid warnings.
  // See: https://davidwcai.medium.com/react-testing-library-and-the-not-wrapped-in-act-errors-491a5629193b
  await waitFor(() => getByText(editPanel, 'PROD-1'));

  await findByText(editPanel, 'View Dependency Explorer');
  await findByText(editPanel, 'View Conflicts');

  fireEvent.click(getByText(editPanel, 'View Conflicts'));
  const dependencyExplorer = await waitFor(() =>
    renderResult.getByRole('dialog'),
  );
  await waitFor(() => getByTitle(dependencyExplorer, 'com.company0:artifact0'));
  fireEvent.click(getByTitle(dependencyExplorer, 'com.company0:artifact0'));
  await waitFor(() =>
    getByTitle(dependencyExplorer, 'com.company0:artifact0.2.0.0'),
  );
  await waitFor(() =>
    getByTitle(dependencyExplorer, 'com.company0:artifact0.3.0.0'),
  );
  fireEvent.click(
    getByTitle(dependencyExplorer, 'com.company0:artifact0.2.0.0'),
  );
  await waitFor(() => getByText(dependencyExplorer, 'artifact36'));
  fireEvent.click(getByText(dependencyExplorer, 'artifact36'));
  await waitFor(() => getByText(dependencyExplorer, 'artifact4'));
  fireEvent.click(getByText(dependencyExplorer, 'artifact4'));
  await waitFor(() => getByText(dependencyExplorer, 'artifact0'));
  expect(
    getByTitle(dependencyExplorer, 'com.company0:artifact0:2.0.0'),
  ).toBeDefined();

  // collaspe tree
  fireEvent.click(getByTitle(dependencyExplorer, 'Collapse Tree'));
  expect(queryByText(dependencyExplorer, 'artifact0')).toBeNull();
  fireEvent.click(getByTitle(dependencyExplorer, 'Expand All Conflict Paths'));
  await waitFor(() => queryAllByText(dependencyExplorer, 'artifact11'));
  expect(
    queryAllByTitle(dependencyExplorer, 'com.company0:artifact33:20.0.0'),
  ).toBeDefined();

  fireEvent.click(getByText(dependencyExplorer, 'Explorer'));
  await waitFor(() =>
    queryByTitle(dependencyExplorer, 'com.company3:artifact36:3.0.0'),
  );
  expect(queryAllByText(dependencyExplorer, 'artifact36').length).toBe(2);
  expect(queryByText(dependencyExplorer, '2.0.0')).toBeDefined();
  expect(queryByText(dependencyExplorer, '3.0.0')).toBeDefined();
});
