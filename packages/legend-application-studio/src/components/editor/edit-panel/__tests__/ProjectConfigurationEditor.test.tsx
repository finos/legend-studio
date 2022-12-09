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
import { integrationTest } from '@finos/legend-shared';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../EditorComponentTestUtils.js';
import { TEST_DATA__ProjectDependencyInfo } from './TEST_DATA__ProjectDependencyInfo.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../LegendStudioTestID.js';
import type { EditorStore } from '../../../../stores/EditorStore.js';
import type { ProjectDependency } from '@finos/legend-server-sdlc';
import { ProjectConfigurationEditorState } from '../../../../stores/editor-state/ProjectConfigurationEditorState.js';

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
    dependencyReport: TEST_DATA__ProjectDependencyInfo,
  });
  fireEvent.click(renderResult.getByText('config'));
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

// TODO: readd test when dependency explorer complete
test.skip(integrationTest('Test Project DependencyInfo'), async () => {
  const editPanel = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EDIT_PANEL_CONTENT,
  );
  fireEvent.click(getByText(editPanel, 'Project Dependencies'));
  await waitFor(() => getByText(editPanel, 'View Dependency Tree'));
  const currentEditorStore =
    MOCK__editorStore.tabManagerState.getCurrentEditorState(
      ProjectConfigurationEditorState,
    );
  await waitFor(() => getByText(editPanel, 'View Conflicts'));
  const dependencyReport = currentEditorStore.dependencyReport;
  expect(dependencyReport).toBeDefined();
});

test(integrationTest('Test Project Dependency'), async () => {
  const editPanel = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EDIT_PANEL_CONTENT,
  );
  const updateButton = getByText(editPanel, 'Update');
  fireEvent.click(getByText(editPanel, 'Project Dependencies'));

  // dependency 1
  await waitFor(() => getByText(editPanel, 'PROD-1'));
  await waitFor(() => getByText(editPanel, 'org.finos.legend:prod-1'));
  await waitFor(() => getByText(editPanel, '2.0.0'));

  // dependency 2
  await waitFor(() => getByText(editPanel, 'PROD-2'));
  await waitFor(() => getByText(editPanel, 'org.finos.legend:prod-2'));
  await waitFor(() => getByText(editPanel, '3.0.0'));

  const configState = MOCK__editorStore.projectConfigurationEditorState;
  const projectDependenciesToAdd =
    configState.currentProjectConfiguration.projectDependencies.filter(
      (dep) =>
        !configState.originalConfig.projectDependencies.find(
          (originalProjDep) => originalProjDep.hashCode === dep.hashCode,
        ),
    );
  const projectDependenciesToRemove =
    configState.originalConfig.projectDependencies.filter(
      (originalProjDep) =>
        !configState.currentProjectConfiguration.projectDependencies.find(
          (dep) => dep.hashCode === originalProjDep.hashCode,
        ),
    );
  expect(updateButton.getAttribute('disabled')).toBeNull();
  expect(projectDependenciesToAdd).toHaveLength(1);
  expect(projectDependenciesToRemove).toHaveLength(1);
  expect((projectDependenciesToAdd[0] as ProjectDependency).projectId).toBe(
    'org.finos.legend:prod-1',
  );
  expect((projectDependenciesToRemove[0] as ProjectDependency).projectId).toBe(
    'PROD-1',
  );
});
