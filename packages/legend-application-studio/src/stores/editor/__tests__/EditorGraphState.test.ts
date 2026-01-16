/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  unitTest(
    'Client correctly indexes server-filtered dependency entities with exclusions',
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
          exclusions: [{ projectId: 'org.finos.legend:excluded-lib' }],
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

    // Mock server response - server has already filtered out excluded entities
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

    // Verify client correctly indexes all returned dependencies
    expect(dependencyEntitiesIndex.size).toBe(3);
    expect(dependencyEntitiesIndex.has('org.finos.legend:parent-a')).toBe(true);
    expect(dependencyEntitiesIndex.has('org.finos.legend:parent-b')).toBe(true);
    expect(dependencyEntitiesIndex.has('org.finos.legend:common-lib')).toBe(
      true,
    );

    // Verify entities are correctly mapped
    const parentA = dependencyEntitiesIndex.get('org.finos.legend:parent-a');
    expect(parentA?.entities.length).toBe(1);
    expect(parentA?.entities[0]?.path).toBe('model::ClassA');
    expect(parentA?.groupId).toBe('org.finos.legend');
    expect(parentA?.artifactId).toBe('parent-a');
    expect(parentA?.versionId).toBe('1.0.0');

    const parentB = dependencyEntitiesIndex.get('org.finos.legend:parent-b');
    expect(parentB?.entities.length).toBe(1);
    expect(parentB?.entities[0]?.path).toBe('model::ClassB');

    const commonLib = dependencyEntitiesIndex.get(
      'org.finos.legend:common-lib',
    );
    expect(commonLib?.entities.length).toBe(1);
    expect(commonLib?.entities[0]?.path).toBe('model::CommonClass');

    // Verify excluded-lib is not present (filtered by server)
    expect(dependencyEntitiesIndex.has('org.finos.legend:excluded-lib')).toBe(
      false,
    );
  },
);
