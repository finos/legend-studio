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

import { expect, test, beforeEach } from '@jest/globals';
import {
  type RenderResult,
  waitFor,
  fireEvent,
  getByText,
  findByText,
} from '@testing-library/react';
import { createMock, integrationTest } from '@finos/legend-shared/test';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import { TEST_DATA__ProjectDependencyReport } from '../../editor-group/__tests__/TEST_DATA__ProjectDependencyReport.js';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

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
    entities: [
      {
        path: 'model::ClassB',
        content: {
          _type: 'class',
          name: 'ClassB',
          package: 'model',
          properties: [
            {
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'prop1',
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
    ],
  },
  {
    groupId: 'org.finos.legend',
    artifactId: 'prod-2',
    versionId: '3.0.0',
    versionedEntity: false,
    entities: [
      {
        path: 'test::ClassC',
        content: {
          _type: 'class',
          name: 'ClassC',
          package: 'test',
          properties: [
            {
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'prop',
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
    ],
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
    projectDependency: TEST_DATA__DependencyEntities,
    projectDependencyReport: TEST_DATA__ProjectDependencyReport,
  });
});

test(integrationTest('Test navigation of dependency tree'), async () => {
  window.open = createMock();
  const explorerTree = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EXPLORER_TREES,
  );

  // expanding dependency tree
  await waitFor(() => findByText(explorerTree, 'dependencies'));
  fireEvent.click(getByText(explorerTree, 'dependencies'));

  // expanding first dependency
  await waitFor(() => findByText(explorerTree, 'org.finos.legend:prod-1'));
  fireEvent.click(getByText(explorerTree, 'org.finos.legend:prod-1'));
  await waitFor(() => findByText(explorerTree, 'model'));
  fireEvent.click(getByText(explorerTree, 'model'));
  await waitFor(() => findByText(explorerTree, 'ClassB'));

  // expanding second dependency
  await waitFor(() => findByText(explorerTree, 'org.finos.legend:prod-2'));
  fireEvent.click(getByText(explorerTree, 'org.finos.legend:prod-2'));
  await waitFor(() => findByText(explorerTree, 'test'));
  fireEvent.click(getByText(explorerTree, 'test'));
  await waitFor(() => findByText(explorerTree, 'ClassC'));

  const dependencyTreeData = guaranteeNonNullable(
    MOCK__editorStore.explorerTreeState.dependencyTreeData?.nodes,
  );

  const dependencyTreeDataKeys = [...dependencyTreeData.keys()];
  expect(
    dependencyTreeDataKeys.includes('@dependency__org.finos.legend:prod-1'),
  ).toBe(true);
  expect(
    dependencyTreeDataKeys.includes('@dependency__org.finos.legend:prod-2'),
  ).toBe(true);

  fireEvent.contextMenu(
    await findByText(explorerTree, 'org.finos.legend:prod-1'),
  );

  const explorerContextMenu = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EXPLORER_CONTEXT_MENU,
  );

  const viewProject = await waitFor(() =>
    getByText(explorerContextMenu, 'View Project'),
  );
  fireEvent.click(viewProject);
  expect(window.open).toHaveBeenCalledWith(
    'http://localhost/test/view/archive/org.finos.legend:prod-1:2.0.0',
    '_blank',
  );
  fireEvent.click(viewProject);
});
