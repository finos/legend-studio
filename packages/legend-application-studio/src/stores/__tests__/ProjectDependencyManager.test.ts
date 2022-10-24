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

import { test, jest, expect } from '@jest/globals';
import {
  type PlainObject,
  type TEMPORARY__JestMatcher,
  unitTest,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { TEST__getTestEditorStore } from '../EditorStoreTestUtils.js';
import type { Entity } from '@finos/legend-storage';
import { ProjectConfiguration } from '@finos/legend-server-sdlc';
import {
  ProjectVersionEntities,
  type ProjectData,
  type ProjectDependencyInfo,
} from '@finos/legend-server-depot';
import {
  DependencyManager,
  isElementReadOnly,
  PackageableElementReference,
} from '@finos/legend-graph';
import TEST_DATA__M2MGraphEntities from './TEST_DATA__M2MGraphEntities.json';

const testDependingOnDifferentProjectVersions = [
  {
    groupId: 'org.finos.legend',
    artifactId: 'prod-a',
    versionId: '1.0.0',
    versionedEntity: false,
    entities: [],
  },
  {
    groupId: 'org.finos.legend',
    artifactId: 'prod-a',
    versionId: '2.0.0',
    versionedEntity: false,
    entities: [],
  },
];

const testDependingOnMoreThanOneproject = [
  {
    groupId: 'org.finos.legend',
    artifactId: 'prod-a',
    versionId: '2.0.0',
    versionedEntity: false,
    entities: [
      {
        path: 'org::finos::legend::model::ProfileExtensionA',
        content: {
          _type: 'profile',
          name: 'ProfileExtensionA',
          package: 'org::finos::legend::model',
          stereotypes: [],
          tags: ['docs'],
        },
        classifierPath: 'meta::pure::metamodel::extension::Profile',
      },
    ],
  },
  {
    groupId: 'org.finos.legend',
    artifactId: 'prod-b',
    versionId: '2.0.0',
    versionedEntity: false,
    entities: [
      {
        path: 'org::finos::legend::model::ProfileExtensionB',
        content: {
          _type: 'profile',
          name: 'ProfileExtensionB',
          package: 'org::finos::legend::model',
          stereotypes: [],
          tags: ['docs'],
        },
        classifierPath: 'meta::pure::metamodel::extension::Profile',
      },
    ],
  },
  {
    groupId: 'org.finos.legend',
    artifactId: 'prod-c',
    versionId: '3.0.0',
    versionedEntity: false,
    entities: [
      {
        path: 'org::finos::legend::model::ProfileExtensionC',
        content: {
          _type: 'profile',
          name: 'ProfileExtensionC',
          package: 'org::finos::legend::model',
          stereotypes: [],
          tags: ['docs'],
        },
        classifierPath: 'meta::pure::metamodel::extension::Profile',
      },
    ],
  },
];

const TEST_DEPENDENCY_PROJECT_ID = 'UAT-TEST_DEPENDENCY';

const PROJECT_CONFIG = {
  projectStructureVersion: { version: 6, extensionVersion: 1 },
  projectId: TEST_DEPENDENCY_PROJECT_ID,
  groupId: 'com.test',
  artifactId: 'string',
  projectDependencies: [
    {
      projectId: 'PROD_1',
      versionId: '1.0.0',
    },
    {
      projectId: 'groupId:artifactId',
      versionId: '1.0.0',
    },
  ],
  metamodelDependencies: [],
};

const PROJECT_DATA = [
  {
    id: 'PROD_1',
    projectId: 'PROD_1',
    groupId: 'org.finos.legend',
    artifactId: 'my-artifact',
    versions: ['1.0.0'],
    latestVersion: '1.0.0',
  },
];

const MULTI_PROJECT_DATA = [
  {
    id: '1',
    projectId: 'PROD_1',
    groupId: 'org.finos.legend',
    artifactId: 'my-artifact',
    versions: ['1.0.0'],
    latestVersion: '1.0.0',
  },
  {
    id: '2',
    projectId: 'PROD_1',
    groupId: 'org.finos.legend',
    artifactId: 'my-artifact-diff',
    versions: ['1.0.0', '2.0.0'],
    latestVersion: '2.0.0',
  },
];

const DEPENDENCY_INFO_DATA = {
  tree: [],
  conflicts: [
    {
      groupId: 'org.finos.legend',
      artifactId: 'prod-a',
      versions: ['1.0.0', '2.0.0'],
      conflictPaths: [
        'org.finos.legend:prod-a:1.0.0',
        'org.finos.legend:prod-a:2.0.0',
      ],
    },
  ],
};

const FILE_GENERATION_PATH = 'model::myFileGeneration';
const buildFileGenerationDepentOnDependencyElements = (
  dependencyEntities: string[],
): Entity => {
  const fileGeneration = {
    path: FILE_GENERATION_PATH,
    content: {
      _type: 'fileGeneration',
      configurationProperties: [],
      name: 'myFileGeneration',
      package: 'model',
      scopeElements: [...dependencyEntities],
      type: 'testType',
    },
    classifierPath:
      'meta::pure::generation::metamodel::GenerationConfiguration',
  } as Entity;
  return fileGeneration;
};

const testDependencyElements = async (
  entities: Entity[],
  dependencyEntities: PlainObject<ProjectVersionEntities>[],
  projectsData?: PlainObject<ProjectData>[],
  includeDependencyInFileGenerationScopeElements?: boolean,
  dependencyInfo?: PlainObject<ProjectDependencyInfo>,
): Promise<void> => {
  const projectVersionEntities = dependencyEntities.map((e) =>
    ProjectVersionEntities.serialization.fromJson(e),
  );
  const keys = projectVersionEntities.map((e) => e.id);
  const dependencyElementPaths = projectVersionEntities
    .flatMap((e) => e.entities)
    .map((e) => e.path);
  if (includeDependencyInFileGenerationScopeElements) {
    entities.push(
      buildFileGenerationDepentOnDependencyElements(dependencyElementPaths),
    );
  }
  const editorStore = TEST__getTestEditorStore();
  editorStore.projectConfigurationEditorState.setProjectConfiguration(
    ProjectConfiguration.serialization.fromJson(PROJECT_CONFIG),
  );

  jest
    .spyOn(
      guaranteeNonNullable(editorStore.depotServerClient),
      'collectDependencyEntities',
    )
    .mockReturnValue(Promise.resolve(dependencyEntities));
  if (projectsData) {
    jest
      .spyOn(
        guaranteeNonNullable(editorStore.depotServerClient),
        'getProjectById',
      )
      .mockReturnValue(Promise.resolve(projectsData));
  }
  if (dependencyInfo) {
    jest
      .spyOn(
        guaranteeNonNullable(editorStore.depotServerClient),
        'analyzeDependencyTree',
      )
      .mockReturnValue(Promise.resolve(dependencyInfo));
  }
  await editorStore.graphManagerState.initializeSystem();
  const dependencyManager = new DependencyManager([]);
  const dependencyEntitiesIndex =
    await editorStore.graphState.getIndexedDependencyEntities();
  editorStore.graphManagerState.graph.dependencyManager = dependencyManager;
  await editorStore.graphManagerState.graphManager.buildDependencies(
    editorStore.graphManagerState.coreModel,
    editorStore.graphManagerState.systemModel,
    dependencyManager,
    dependencyEntitiesIndex,
    editorStore.graphManagerState.dependenciesBuildState,
  );
  expect(
    editorStore.graphManagerState.dependenciesBuildState.hasSucceeded,
  ).toBe(true);

  await editorStore.graphManagerState.graphManager.buildGraph(
    editorStore.graphManagerState.graph,
    entities,
    editorStore.graphManagerState.graphBuildState,
  );
  expect(editorStore.graphManagerState.graphBuildState.hasSucceeded).toBe(true);

  Array.from(dependencyEntitiesIndex.keys()).forEach((k) =>
    expect(dependencyManager.getModel(k)).toBeDefined(),
  );
  Array.from(keys).forEach((k) =>
    expect(dependencyManager.getModel(k)).toBeDefined(),
  );

  expect(dependencyManager.allOwnElements.length).toBe(
    dependencyElementPaths.length,
  );

  dependencyElementPaths.forEach((e) => {
    const element = dependencyManager.getNullableElement(e);
    guaranteeNonNullable(
      element,
      `element ${e} not found in dependency manager`,
    );
    const elementInGraph = editorStore.graphManagerState.graph.getElement(e);
    guaranteeNonNullable(
      elementInGraph,
      `element ${e} not found in main graph`,
    );
    const elementInMainGraph =
      editorStore.graphManagerState.graph.allOwnElements.find(
        (el) => el.path === e,
      );
    expect(elementInMainGraph).toBeUndefined();
    expect(elementInGraph).toBe(element);
    expect(isElementReadOnly(elementInGraph)).toBe(true);
  });
  if (includeDependencyInFileGenerationScopeElements) {
    const fileGeneration = guaranteeNonNullable(
      editorStore.graphManagerState.graph.getOwnNullableFileGeneration(
        FILE_GENERATION_PATH,
      ),
    );
    dependencyElementPaths.forEach((e) => {
      const elementInGraph = guaranteeNonNullable(
        editorStore.graphManagerState.graph.getElement(e),
      );
      expect(
        fileGeneration.scopeElements.find(
          (el) =>
            el instanceof PackageableElementReference &&
            el.value === elementInGraph,
        ),
      ).toBeDefined();
    });
  }
  const transformedEntities =
    editorStore.graphManagerState.graph.allOwnElements.map((el) =>
      editorStore.graphManagerState.graphManager.elementToEntity(el),
    );
  (expect(entities) as TEMPORARY__JestMatcher).toIncludeSameMembers(
    transformedEntities,
  );
  // Ensure dependency elements are not transformed
  for (const entityPath of dependencyElementPaths) {
    expect(
      transformedEntities.find((el) => el.path === entityPath),
    ).toBeUndefined();
  }
};

const buildProjectVersionEntities = (
  entities: Entity[],
): PlainObject<ProjectVersionEntities>[] => [
  {
    projectId: TEST_DEPENDENCY_PROJECT_ID,
    versionId: '1.0.0',
    entities,
    versionedEntity: false,
  },
];

test(unitTest('Build dependency check'), async () => {
  await testDependencyElements(
    [] as Entity[],
    buildProjectVersionEntities(TEST_DATA__M2MGraphEntities as Entity[]),
    PROJECT_DATA,
    true,
  );
});

test(
  unitTest('Depending on more than one project dependency check'),
  async () => {
    await testDependencyElements(
      [] as Entity[],
      testDependingOnMoreThanOneproject,
      PROJECT_DATA,
      true,
    );
  },
);

test(
  unitTest('Legacy project not returning singular project from depot'),
  async () => {
    await expect(
      testDependencyElements(
        [] as Entity[],
        testDependingOnDifferentProjectVersions,
        MULTI_PROJECT_DATA,
        true,
      ),
    ).rejects.toThrowError(
      "Expected 1 project for project ID 'PROD_1'. Got 2 projects with coordinates 'org.finos.legend:my-artifact', 'org.finos.legend:my-artifact-diff'.",
    );
  },
);

test(
  unitTest('Same project different versions dependency error check'),
  async () => {
    const expectedError =
      'Depending on multiple versions of a project is not supported. Found conflicts:\n' +
      'project:\n' +
      '  org.finos.legend:prod-a\n' +
      'versions:\n' +
      '  1.0.0\n' +
      '  2.0.0\n' +
      'paths:\n' +
      '  1:\n' +
      '  org.finos.legend:prod-a:1.0.0\n' +
      '  2:\n' +
      '  org.finos.legend:prod-a:2.0.0\n';
    await expect(
      testDependencyElements(
        [] as Entity[],
        testDependingOnDifferentProjectVersions,
        PROJECT_DATA,
        true,
        DEPENDENCY_INFO_DATA,
      ),
    ).rejects.toThrowError(expectedError);
  },
);
