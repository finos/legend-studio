/**
 * Copyright (c) 2025-present, Goldman Sachs
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
import { guaranteeNonNullable } from '@finos/legend-shared';
import { unitTest, createSpy } from '@finos/legend-shared/test';
import { TEST__getTestEditorStore } from '../__test-utils__/EditorStoreTestUtils.js';
import { ProjectConfiguration } from '@finos/legend-server-sdlc';

test(
  unitTest('BFS exclusion filtering excludes only within parent subtree'),
  async () => {
    const editorStore = TEST__getTestEditorStore();

    const projectConfig = ProjectConfiguration.serialization.fromJson({
      projectStructureVersion: { version: 11, extensionVersion: 1 },
      projectId: 'test-project',
      groupId: 'org.finos.legend',
      artifactId: 'my-project',
      projectDependencies: [
        {
          projectId: 'org.finos.legend:parent-a',
          versionId: '1.0.0',
          exclusions: [{ projectId: 'org.finos.legend:common-lib' }],
        },
        {
          projectId: 'org.finos.legend:parent-b',
          versionId: '1.0.0',
        },
      ],
      metamodelDependencies: [],
      runDependencies: [],
    });

    editorStore.projectConfigurationEditorState.setProjectConfiguration(
      projectConfig,
    );

    createSpy(
      guaranteeNonNullable(editorStore.depotServerClient),
      'collectDependencyEntities',
    ).mockResolvedValue([
      {
        groupId: 'org.finos.legend',
        artifactId: 'parent-a',
        versionId: '1.0.0',
        id: 'org.finos.legend:parent-a:1.0.0',
        versionedEntity: false,
        entities: [
          {
            path: 'model::ClassA',
            content: {
              _type: 'class',
              name: 'ClassA',
              package: 'model',
            },
            classifierPath: 'meta::pure::metamodel::type::Class',
          },
        ],
      },
      {
        groupId: 'org.finos.legend',
        artifactId: 'parent-b',
        versionId: '1.0.0',
        id: 'org.finos.legend:parent-b:1.0.0',
        versionedEntity: false,
        entities: [
          {
            path: 'model::ClassB',
            content: {
              _type: 'class',
              name: 'ClassB',
              package: 'model',
            },
            classifierPath: 'meta::pure::metamodel::type::Class',
          },
        ],
      },
      {
        groupId: 'org.finos.legend',
        artifactId: 'common-lib',
        versionId: '1.0.0',
        id: 'org.finos.legend:common-lib:1.0.0',
        versionedEntity: false,
        entities: [
          {
            path: 'model::CommonClass',
            content: {
              _type: 'class',
              name: 'CommonClass',
              package: 'model',
            },
            classifierPath: 'meta::pure::metamodel::type::Class',
          },
        ],
      },
    ]);

    createSpy(
      guaranteeNonNullable(editorStore.depotServerClient),
      'analyzeDependencyTree',
    ).mockResolvedValue({
      graph: {
        rootIds: [
          'org.finos.legend:parent-a:1.0.0',
          'org.finos.legend:parent-b:1.0.0',
        ],
        nodes: {
          'org.finos.legend:parent-a:1.0.0': {
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'parent-a',
              versionId: '1.0.0',
            },
            parentIds: [],
            childIds: ['org.finos.legend:common-lib:1.0.0'],
          },
          'org.finos.legend:parent-b:1.0.0': {
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'parent-b',
              versionId: '1.0.0',
            },
            parentIds: [],
            childIds: ['org.finos.legend:common-lib:1.0.0'],
          },
          'org.finos.legend:common-lib:1.0.0': {
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'common-lib',
              versionId: '1.0.0',
            },
            parentIds: [
              'org.finos.legend:parent-a:1.0.0',
              'org.finos.legend:parent-b:1.0.0',
            ],
            childIds: [],
          },
        },
      },
      conflicts: [],
    });

    const dependencyEntitiesIndex =
      await editorStore.graphState.getIndexedDependencyEntities();

    expect(dependencyEntitiesIndex.size).toBe(3);

    expect(dependencyEntitiesIndex.has('org.finos.legend:parent-a')).toBe(true);
    expect(dependencyEntitiesIndex.has('org.finos.legend:parent-b')).toBe(true);
    expect(dependencyEntitiesIndex.has('org.finos.legend:common-lib')).toBe(
      true,
    );

    const commonLibEntities = dependencyEntitiesIndex.get(
      'org.finos.legend:common-lib',
    );
    expect(commonLibEntities?.entities.length).toBe(1);
    expect(commonLibEntities?.entities[0]?.path).toBe('model::CommonClass');
  },
);

test(
  unitTest('BFS exclusion filtering is applied transitively within subtree'),
  async () => {
    const editorStore = TEST__getTestEditorStore();

    const projectConfig = ProjectConfiguration.serialization.fromJson({
      projectStructureVersion: { version: 11, extensionVersion: 1 },
      projectId: 'test-project',
      groupId: 'org.finos.legend',
      artifactId: 'my-project',
      projectDependencies: [
        {
          projectId: 'org.finos.legend:parent-lib',
          versionId: '1.0.0',
          exclusions: [{ projectId: 'org.finos.legend:middle-lib' }],
        },
      ],
      metamodelDependencies: [],
      runDependencies: [],
    });

    editorStore.projectConfigurationEditorState.setProjectConfiguration(
      projectConfig,
    );

    createSpy(
      guaranteeNonNullable(editorStore.depotServerClient),
      'collectDependencyEntities',
    ).mockResolvedValue([
      {
        groupId: 'org.finos.legend',
        artifactId: 'parent-lib',
        versionId: '1.0.0',
        id: 'org.finos.legend:parent-lib:1.0.0',
        versionedEntity: false,
        entities: [
          {
            path: 'model::ParentClass',
            content: {
              _type: 'class',
              name: 'ParentClass',
              package: 'model',
            },
            classifierPath: 'meta::pure::metamodel::type::Class',
          },
        ],
      },
      {
        groupId: 'org.finos.legend',
        artifactId: 'middle-lib',
        versionId: '1.0.0',
        id: 'org.finos.legend:middle-lib:1.0.0',
        versionedEntity: false,
        entities: [
          {
            path: 'model::MiddleClass',
            content: {
              _type: 'class',
              name: 'MiddleClass',
              package: 'model',
            },
            classifierPath: 'meta::pure::metamodel::type::Class',
          },
        ],
      },
      {
        groupId: 'org.finos.legend',
        artifactId: 'leaf-lib',
        versionId: '1.0.0',
        id: 'org.finos.legend:leaf-lib:1.0.0',
        versionedEntity: false,
        entities: [
          {
            path: 'model::LeafClass',
            content: {
              _type: 'class',
              name: 'LeafClass',
              package: 'model',
            },
            classifierPath: 'meta::pure::metamodel::type::Class',
          },
        ],
      },
    ]);

    createSpy(
      guaranteeNonNullable(editorStore.depotServerClient),
      'analyzeDependencyTree',
    ).mockResolvedValue({
      graph: {
        rootIds: ['org.finos.legend:parent-lib:1.0.0'],
        nodes: {
          'org.finos.legend:parent-lib:1.0.0': {
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'parent-lib',
              versionId: '1.0.0',
            },
            parentIds: [],
            childIds: ['org.finos.legend:middle-lib:1.0.0'],
          },
          'org.finos.legend:middle-lib:1.0.0': {
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'middle-lib',
              versionId: '1.0.0',
            },
            parentIds: ['org.finos.legend:parent-lib:1.0.0'],
            childIds: ['org.finos.legend:leaf-lib:1.0.0'],
          },
          'org.finos.legend:leaf-lib:1.0.0': {
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'leaf-lib',
              versionId: '1.0.0',
            },
            parentIds: ['org.finos.legend:middle-lib:1.0.0'],
            childIds: [],
          },
        },
      },
      conflicts: [],
    });

    const dependencyEntitiesIndex =
      await editorStore.graphState.getIndexedDependencyEntities();

    expect(dependencyEntitiesIndex.size).toBe(3);

    const parentLib = dependencyEntitiesIndex.get(
      'org.finos.legend:parent-lib',
    );
    expect(parentLib?.entities.length).toBe(1);

    const middleLib = dependencyEntitiesIndex.get(
      'org.finos.legend:middle-lib',
    );
    expect(middleLib?.entities.length).toBe(1);

    const leafLib = dependencyEntitiesIndex.get('org.finos.legend:leaf-lib');
    expect(leafLib?.entities.length).toBe(1);
  },
);

test(
  unitTest(
    'BFS exclusion filtering handles multiple versions and prefers non-excluded',
  ),
  async () => {
    const editorStore = TEST__getTestEditorStore();

    const projectConfig = ProjectConfiguration.serialization.fromJson({
      projectStructureVersion: { version: 11, extensionVersion: 1 },
      projectId: 'test-project',
      groupId: 'org.finos.legend',
      artifactId: 'my-project',
      projectDependencies: [
        {
          projectId: 'org.finos.legend:parent-a',
          versionId: '1.0.0',
        },
        {
          projectId: 'org.finos.legend:parent-b',
          versionId: '1.0.0',
          exclusions: [{ projectId: 'org.finos.legend:shared-lib' }],
        },
      ],
      metamodelDependencies: [],
      runDependencies: [],
    });

    editorStore.projectConfigurationEditorState.setProjectConfiguration(
      projectConfig,
    );

    createSpy(
      guaranteeNonNullable(editorStore.depotServerClient),
      'collectDependencyEntities',
    ).mockResolvedValue([
      {
        groupId: 'org.finos.legend',
        artifactId: 'parent-a',
        versionId: '1.0.0',
        id: 'org.finos.legend:parent-a:1.0.0',
        versionedEntity: false,
        entities: [],
      },
      {
        groupId: 'org.finos.legend',
        artifactId: 'parent-b',
        versionId: '1.0.0',
        id: 'org.finos.legend:parent-b:1.0.0',
        versionedEntity: false,
        entities: [],
      },
      {
        groupId: 'org.finos.legend',
        artifactId: 'shared-lib',
        versionId: '2.0.0',
        id: 'org.finos.legend:shared-lib:2.0.0',
        versionedEntity: false,
        entities: [
          {
            path: 'model::SharedClass',
            content: {
              _type: 'class',
              name: 'SharedClass',
              package: 'model',
              properties: [
                {
                  name: 'newProperty',
                  type: 'String',
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                },
              ],
            },
            classifierPath: 'meta::pure::metamodel::type::Class',
          },
        ],
      },
      {
        groupId: 'org.finos.legend',
        artifactId: 'shared-lib',
        versionId: '1.0.0',
        id: 'org.finos.legend:shared-lib:1.0.0',
        versionedEntity: false,
        entities: [
          {
            path: 'model::SharedClass',
            content: {
              _type: 'class',
              name: 'SharedClass',
              package: 'model',
              properties: [],
            },
            classifierPath: 'meta::pure::metamodel::type::Class',
          },
        ],
      },
    ]);

    createSpy(
      guaranteeNonNullable(editorStore.depotServerClient),
      'analyzeDependencyTree',
    ).mockResolvedValue({
      graph: {
        rootIds: [
          'org.finos.legend:parent-a:1.0.0',
          'org.finos.legend:parent-b:1.0.0',
        ],
        nodes: {
          'org.finos.legend:parent-a:1.0.0': {
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'parent-a',
              versionId: '1.0.0',
            },
            parentIds: [],
            childIds: ['org.finos.legend:shared-lib:2.0.0'],
          },
          'org.finos.legend:parent-b:1.0.0': {
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'parent-b',
              versionId: '1.0.0',
            },
            parentIds: [],
            childIds: ['org.finos.legend:shared-lib:1.0.0'],
          },
          'org.finos.legend:shared-lib:2.0.0': {
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'shared-lib',
              versionId: '2.0.0',
            },
            parentIds: ['org.finos.legend:parent-a:1.0.0'],
            childIds: [],
          },
          'org.finos.legend:shared-lib:1.0.0': {
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'shared-lib',
              versionId: '1.0.0',
            },
            parentIds: ['org.finos.legend:parent-b:1.0.0'],
            childIds: [],
          },
        },
      },
      conflicts: [],
    });

    const dependencyEntitiesIndex =
      await editorStore.graphState.getIndexedDependencyEntities();

    expect(dependencyEntitiesIndex.size).toBe(3);
    expect(dependencyEntitiesIndex.has('org.finos.legend:shared-lib')).toBe(
      true,
    );

    const sharedLib = dependencyEntitiesIndex.get(
      'org.finos.legend:shared-lib',
    );
    expect(sharedLib?.versionId).toBe('2.0.0');
  },
);

test(
  unitTest('BFS exclusion filtering merges entities from multiple versions'),
  async () => {
    const editorStore = TEST__getTestEditorStore();

    const projectConfig = ProjectConfiguration.serialization.fromJson({
      projectStructureVersion: { version: 11, extensionVersion: 1 },
      projectId: 'test-project',
      groupId: 'org.finos.legend',
      artifactId: 'my-project',
      projectDependencies: [
        {
          projectId: 'org.finos.legend:parent-a',
          versionId: '1.0.0',
        },
        {
          projectId: 'org.finos.legend:parent-b',
          versionId: '1.0.0',
        },
      ],
      metamodelDependencies: [],
      runDependencies: [],
    });

    editorStore.projectConfigurationEditorState.setProjectConfiguration(
      projectConfig,
    );

    createSpy(
      guaranteeNonNullable(editorStore.depotServerClient),
      'collectDependencyEntities',
    ).mockResolvedValue([
      {
        groupId: 'org.finos.legend',
        artifactId: 'parent-a',
        versionId: '1.0.0',
        id: 'org.finos.legend:parent-a:1.0.0',
        versionedEntity: false,
        entities: [],
      },
      {
        groupId: 'org.finos.legend',
        artifactId: 'parent-b',
        versionId: '1.0.0',
        id: 'org.finos.legend:parent-b:1.0.0',
        versionedEntity: false,
        entities: [],
      },
      {
        groupId: 'org.finos.legend',
        artifactId: 'shared-lib',
        versionId: '2.0.0',
        id: 'org.finos.legend:shared-lib:2.0.0',
        versionedEntity: false,
        entities: [
          {
            path: 'model::ClassA',
            content: {
              _type: 'class',
              name: 'ClassA',
              package: 'model',
            },
            classifierPath: 'meta::pure::metamodel::type::Class',
          },
        ],
      },
      {
        groupId: 'org.finos.legend',
        artifactId: 'shared-lib',
        versionId: '1.0.0',
        id: 'org.finos.legend:shared-lib:1.0.0',
        versionedEntity: false,
        entities: [
          {
            path: 'model::ClassB',
            content: {
              _type: 'class',
              name: 'ClassB',
              package: 'model',
            },
            classifierPath: 'meta::pure::metamodel::type::Class',
          },
        ],
      },
    ]);

    createSpy(
      guaranteeNonNullable(editorStore.depotServerClient),
      'analyzeDependencyTree',
    ).mockResolvedValue({
      graph: {
        rootIds: [
          'org.finos.legend:parent-a:1.0.0',
          'org.finos.legend:parent-b:1.0.0',
        ],
        nodes: {
          'org.finos.legend:parent-a:1.0.0': {
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'parent-a',
              versionId: '1.0.0',
            },
            parentIds: [],
            childIds: ['org.finos.legend:shared-lib:2.0.0'],
          },
          'org.finos.legend:parent-b:1.0.0': {
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'parent-b',
              versionId: '1.0.0',
            },
            parentIds: [],
            childIds: ['org.finos.legend:shared-lib:1.0.0'],
          },
          'org.finos.legend:shared-lib:2.0.0': {
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'shared-lib',
              versionId: '2.0.0',
            },
            parentIds: ['org.finos.legend:parent-a:1.0.0'],
            childIds: [],
          },
          'org.finos.legend:shared-lib:1.0.0': {
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'shared-lib',
              versionId: '1.0.0',
            },
            parentIds: ['org.finos.legend:parent-b:1.0.0'],
            childIds: [],
          },
        },
      },
      conflicts: [],
    });

    const dependencyEntitiesIndex =
      await editorStore.graphState.getIndexedDependencyEntities();

    const sharedLib = dependencyEntitiesIndex.get(
      'org.finos.legend:shared-lib',
    );
    expect(sharedLib?.entities.length).toBe(2);

    const entityPaths = sharedLib?.entities.map((e) => e.path) ?? [];
    expect(entityPaths).toContain('model::ClassA');
    expect(entityPaths).toContain('model::ClassB');
  },
);
