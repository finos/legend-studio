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

import {
  getByDisplayValue,
  waitFor,
  fireEvent,
  getByText,
} from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../EditorComponentTestUtils';
import { STUDIO_TEST_ID } from '../../../StudioTestID';
import type { EditorStore } from '../../../../stores/EditorStore';

let renderResult: RenderResult;

const TEST_DATA_ProjectConfiguration = {
  projectStructureVersion: { version: 10, extensionVersion: 1 },
  projectId: 'PROD-1234',
  projectType: 'PRODUCTION',
  groupId: 'org.finos.legend',
  artifactId: 'dependency-test',
  projectDependencies: [
    {
      projectId: 'PROD-1',
      versionId: {
        majorVersion: 2,
        minorVersion: 0,
        patchVersion: 0,
      },
    },
    {
      projectId: 'org.finos.legend:prod-2',
      versionId: {
        majorVersion: 3,
        minorVersion: 0,
        patchVersion: 0,
      },
    },
  ],
  metamodelDependencies: [],
};

const TEST_DATA_ProjectData = [
  {
    id: 'PROD-1',
    projectId: 'PROD-1',
    groupId: 'org.finos.legend',
    artifactId: 'prod-1',
    versions: ['1.0.0', '2.0.0'],
    latestVersion: '2.0.0',
  },
];

const TEST_DATA_Projects = [
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

const TEST_DATA_DependencyEntities = [
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

const TEST_DATA_latestProjectStructure = { version: 11, extensionVersion: 1 };

let mockedEditorStore: EditorStore;
beforeEach(async () => {
  mockedEditorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(mockedEditorStore, {
    entities: [],
    projectConfiguration: TEST_DATA_ProjectConfiguration,
    latestProjectStructureVersion: TEST_DATA_latestProjectStructure,
    projects: TEST_DATA_Projects,
    projectData: TEST_DATA_ProjectData,
    projectDependency: TEST_DATA_DependencyEntities,
  });
});

test(integrationTest('Test Project Structure'), async () => {
  fireEvent.click(renderResult.getByText('config'));
  await waitFor(() => renderResult.getByText('Project Structure'));
  const editPanel = renderResult.getByTestId(STUDIO_TEST_ID.EDIT_PANEL_CONTENT);
  await waitFor(() => getByText(editPanel, 'PROJECT STRUCTURE VERSION 10.1'));
  await waitFor(() => getByText(editPanel, 'Update to version 11.1'));
  await waitFor(() => getByDisplayValue(editPanel, 'org.finos.legend'));
  await waitFor(() => getByDisplayValue(editPanel, 'dependency-test'));
  // TODO: test update project structure
});

test(integrationTest('Test Project Dependency'), async () => {
  fireEvent.click(renderResult.getByText('config'));
  await waitFor(() => renderResult.getByText('Project Structure'));
  const editPanel = renderResult.getByTestId(STUDIO_TEST_ID.EDIT_PANEL_CONTENT);
  let updateButton = getByText(editPanel, 'Update');
  expect(updateButton.getAttribute('disabled')).not.toBeNull();
  fireEvent.click(getByText(editPanel, 'Project Dependencies'));
  // dependency 1
  await waitFor(() => getByText(editPanel, 'PROD-1'));
  await waitFor(() => getByText(editPanel, 'org.finos.legend:prod-1'));
  await waitFor(() => getByText(editPanel, '2.0.0'));

  // dependency 2
  await waitFor(() => getByText(editPanel, 'PROD-2'));
  await waitFor(() => getByText(editPanel, 'org.finos.legend:prod-2'));
  await waitFor(() => getByText(editPanel, '3.0.0'));
  updateButton = getByText(editPanel, /Update/i);
  expect(updateButton.getAttribute('disabled')).toBeNull();

  const configState = mockedEditorStore.projectConfigurationEditorState;
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
  expect(projectDependenciesToAdd).toHaveLength(1);
  expect(projectDependenciesToRemove).toHaveLength(1);
  expect(projectDependenciesToAdd[0].projectId).toBe('org.finos.legend:prod-1');
  expect(projectDependenciesToRemove[0].projectId).toBe('PROD-1');
});
