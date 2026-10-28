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
} from '@testing-library/react';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { integrationTest } from '@finos/legend-shared/test';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';
import { TEST_DATA__ProjectDependencyReport } from './TEST_DATA__ProjectDependencyReport.js';
import {
  RawProjectDependencyReport,
  buildDependencyReport,
} from '@finos/legend-server-depot';
import { getNewerReleasedVersion } from '../project-configuration-editor/ProjectDependencyEditor.js';

let renderResult: RenderResult;

const TEST_DATA__ProjectConfiguration = {
  projectStructureVersion: { version: 10, extensionVersion: 1 },
  projectId: 'PROD-1234',
  groupId: 'org.finos.legend',
  artifactId: 'dependency-test',
  projectDependencies: [
    {
      projectId: 'org.finos.legend:prod-1',
      versionId: '2.0.0',
    },
    {
      projectId: 'org.finos.legend:prod-2',
      versionId: '3.0.0',
    },
  ],
  metamodelDependencies: [],
};

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

const TEST_DATA__Versions = ['1.0.0', '2.0.0', '3.0.0'];

const TEST_DATA__latestProjectStructure = { version: 11, extensionVersion: 1 };

let MOCK__editorStore: EditorStore;
beforeEach(async () => {
  MOCK__editorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore, {
    entities: [],
    projectConfiguration: TEST_DATA__ProjectConfiguration,
    latestProjectStructureVersion: TEST_DATA__latestProjectStructure,
    projects: TEST_DATA__Projects,
    projectDependency: TEST_DATA__DependencyEntities,
    projectDependencyVersions: TEST_DATA__Versions,
    projectDependencyReport: TEST_DATA__ProjectDependencyReport,
  });
  fireEvent.click(renderResult.getByText('config'));
  const editorGroup = await renderResult.findByTestId(
    LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT,
  );
  const updateButton = getByText(editorGroup, 'Update configuration');
  expect(updateButton.getAttribute('disabled')).not.toBeNull();
  await waitFor(() => renderResult.getByText('Project Structure'));
});

test(integrationTest('Test Project Dependency Editor'), async () => {
  const editorGroup = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT,
  );
  fireEvent.click(getByText(editorGroup, 'Project Dependencies'));

  // dependency 1
  await waitFor(() => getByText(editorGroup, 'PROD-1'));
  await waitFor(() => getByText(editorGroup, 'org.finos.legend:prod-1'));
  await waitFor(() => getByText(editorGroup, '2.0.0'));

  // dependency 2
  await waitFor(() => getByText(editorGroup, 'PROD-2'));
  await waitFor(() => getByText(editorGroup, 'org.finos.legend:prod-2'));
  await waitFor(() => getByText(editorGroup, '3.0.0'));
});

test(integrationTest('Test Project Report'), async () => {
  const editorGroup = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT,
  );
  await findByText(editorGroup, 'Project Dependencies');
  fireEvent.click(getByText(editorGroup, 'Project Dependencies'));

  // NOTE: We do this check to ensure the async processes is done to avoid warnings.
  // See: https://davidwcai.medium.com/react-testing-library-and-the-not-wrapped-in-act-errors-491a5629193b
  await waitFor(() => getByText(editorGroup, 'PROD-1'));

  await findByText(editorGroup, 'Dependency Explorer');
  fireEvent.click(getByText(editorGroup, 'Dependency Explorer'));
  const rootId = 'com.company3:artifact29:2.0.0';
  const dependencyExplorer = await waitFor(() =>
    renderResult.getByRole('dialog'),
  );
  const rootArtifactId = 'artifact29';
  const versionId = '2.0.0';
  expect(getByTitle(dependencyExplorer, rootId)).toBeDefined();
  expect(getByText(dependencyExplorer, rootArtifactId)).toBeDefined();
  expect(getByText(dependencyExplorer, versionId)).toBeDefined();
  // flatten view
  fireEvent.click(getByTitle(dependencyExplorer, 'View as Flatten List'));
  const expectedArtifacts = Array.from(Array(68).keys()).map(
    (i) => `artifact${i}`,
  );
  expectedArtifacts.forEach((artifact) =>
    expect(getByText(dependencyExplorer, artifact)).toBeDefined(),
  );

  // tree view
  fireEvent.click(getByTitle(dependencyExplorer, 'View as Tree'));
  const nestedInTree = 'artifact30';
  expect(queryByText(dependencyExplorer, nestedInTree)).toBeNull();

  // expand all dependencies
  fireEvent.click(getByTitle(dependencyExplorer, 'Expand All Dependencies'));
  expectedArtifacts.forEach((artifact) =>
    expect(queryAllByText(dependencyExplorer, artifact).length).toBeDefined(),
  );

  // collapse tree
  fireEvent.click(getByTitle(dependencyExplorer, 'Collapse Tree'));
  expectedArtifacts.forEach((artifact) => {
    if (artifact !== rootArtifactId) {
      expect(queryByText(dependencyExplorer, artifact)).toBeNull();
    }
  });
  fireEvent.click(getByText(dependencyExplorer, 'Conflicts'));
  expect(getByText(dependencyExplorer, 'No Conflicts')).toBeDefined();
});

test(
  integrationTest(
    'Dependency summary shows the tree and offers newer released versions',
  ),
  async () => {
    const editorGroup = renderResult.getByTestId(
      LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT,
    );
    fireEvent.click(getByText(editorGroup, 'Project Dependencies'));
    await waitFor(() => getByText(editorGroup, 'PROD-1'));

    // 68 distinct projects in the report's tree, no conflicts
    await findByText(editorGroup, '68');
    getByText(editorGroup, 'projects in the tree');
    getByText(editorGroup, 'conflicts');
    expect(queryByText(editorGroup, 'See where they come from')).toBeNull();

    // prod-1 is on 2.0.0 while 3.0.0 is released; prod-2 is already on 3.0.0
    const updateButton = await findByText(editorGroup, '3.0.0 available');
    expect(queryAllByText(editorGroup, /available$/)).toHaveLength(1);
    fireEvent.click(updateButton);
    await waitFor(() =>
      expect(queryByText(editorGroup, '3.0.0 available')).toBeNull(),
    );
    expect(queryAllByText(editorGroup, '3.0.0')).toHaveLength(2);
  },
);

test(integrationTest('Test Building of Dependency Report'), async () => {
  const rawdependencyReport = RawProjectDependencyReport.serialization.fromJson(
    TEST_DATA__ProjectDependencyReport,
  );
  const report = buildDependencyReport(rawdependencyReport);
  const graph = report.graph;
  expect(report.conflicts.length).toBe(0);
  expect(report.conflictInfo.size).toBe(0);
  expect(graph.rootNodes.length).toBe(1);
  expect(graph.nodes.size).toBe(68);
  const rootNode = guaranteeNonNullable(graph.rootNodes[0]);
  const rootId = 'com.company3:artifact29:2.0.0';
  expect(rootNode.id).toBe(rootId);
  expect(rootNode.groupId).toBe('com.company3');
  expect(rootNode.artifactId).toBe('artifact29');
  expect(rootNode.versionId).toBe('2.0.0');
  expect(rootNode.projectId).toBe('PROD-29');
  expect(rootNode.dependencies.length).toBe(5);
  expect(rootNode.dependants.length).toBe(0);
});

test(
  integrationTest('Newer released versions ignore snapshots and prereleases'),
  () => {
    const versions = [
      '1.0.0',
      '2.0.0',
      '2.1.0-rc1',
      '3.0.0-SNAPSHOT',
      'master-SNAPSHOT',
    ];
    expect(getNewerReleasedVersion('1.0.0', versions)).toBe('2.0.0');
    expect(getNewerReleasedVersion('2.0.0', versions)).toBeUndefined();
    // the dependency itself is on a snapshot: nothing to offer
    expect(
      getNewerReleasedVersion('master-SNAPSHOT', versions),
    ).toBeUndefined();
    // numeric, not alphabetical: 10.0.0 is newer than 9.0.0
    expect(getNewerReleasedVersion('9.0.0', ['9.0.0', '10.0.0'])).toBe(
      '10.0.0',
    );
  },
);
