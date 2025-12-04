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
import { type PlainObject, guaranteeNonNullable } from '@finos/legend-shared';
import { unitTest, createSpy } from '@finos/legend-shared/test';
import { TEST__getTestEditorStore } from '../__test-utils__/EditorStoreTestUtils.js';
import type { Entity } from '@finos/legend-storage';
import {
  ProjectConfiguration,
  ProjectDependencyExclusion,
} from '@finos/legend-server-sdlc';
import {
  type RawProjectDependencyReport,
  ProjectVersionEntities,
  type StoreProjectData,
} from '@finos/legend-server-depot';
import {
  DependencyManager,
  isElementReadOnly,
  PackageableElementReference,
  getClassProperty,
} from '@finos/legend-graph';
import TEST_DATA__M2MGraphEntities from './TEST_DATA__M2MGraphEntities.json' with { type: 'json' };
import { TEST_DATA__ProjectDependencyReportWithConflict } from '../../../components/editor/editor-group/__tests__/TEST_DATA__ProjectDependencyReport.js';
import type { EditorStore } from '../EditorStore.js';
import {
  TEST_DATA__projectVersionDependencyEntities,
  TEST_DATA__dependencyMainGraphEntities,
  TEST_DATA__dependencyMainGraphEntities2,
  TEST_DATA__projectsData,
} from './TEST_DATA__ProjectDependencyManager.js';
import { flowResult } from 'mobx';

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
      projectId: 'groupId:my-artifact',
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
  projectsData?: PlainObject<StoreProjectData>[],
  includeDependencyInFileGenerationScopeElements?: boolean,
  dependencyInfo?: PlainObject<RawProjectDependencyReport>,
): Promise<EditorStore> => {
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

  createSpy(
    guaranteeNonNullable(editorStore.depotServerClient),
    'collectDependencyEntities',
  ).mockResolvedValue(dependencyEntities);
  if (dependencyInfo) {
    createSpy(
      guaranteeNonNullable(editorStore.depotServerClient),
      'analyzeDependencyTree',
    ).mockResolvedValue(dependencyInfo);
  }
  await editorStore.graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });
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
  // Ensure dependency elements are not transformed
  for (const entityPath of dependencyElementPaths) {
    expect(
      transformedEntities.find((el) => el.path === entityPath),
    ).toBeUndefined();
  }
  return editorStore;
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
  unitTest('Same project different versions dependency error check'),
  async () => {
    const expectedError =
      'Depending on multiple versions of a project is not supported. Found conflicts:\n';
    await expect(
      testDependencyElements(
        [] as Entity[],
        testDependingOnDifferentProjectVersions,
        PROJECT_DATA,
        true,
        TEST_DATA__ProjectDependencyReportWithConflict,
      ),
    ).rejects.toThrowError(expectedError);
  },
);

test(
  unitTest(
    'Test clean up of dependency manager when loading entities into current graph',
  ),
  async () => {
    const editorStore = await testDependencyElements(
      TEST_DATA__dependencyMainGraphEntities,
      TEST_DATA__projectVersionDependencyEntities,
      TEST_DATA__projectsData,
    );
    const graph = editorStore.graphManagerState.graph;
    const dependencyManager = graph.dependencyManager;
    expect(graph.dependencyManager.allOwnElements.length).toBe(10);
    expect(graph.allOwnElements.length).toBe(1);
    const _firm = graph.dependencyManager.getOwnNullableClass('model::Firm');
    expect(_firm).toBeDefined();
    const firm = guaranteeNonNullable(_firm);
    const _person =
      graph.dependencyManager.getOwnNullableClass('model::Person');
    expect(_person).toBeDefined();
    const person = guaranteeNonNullable(_person);
    expect(firm.propertiesFromAssociations.length).toBe(1);
    expect(person.propertiesFromAssociations.length).toBe(1);
    getClassProperty(firm, 'mainPerson');
    getClassProperty(person, 'mainFirm');
    // load association 1/2
    await flowResult(
      editorStore.graphState.loadEntityChangesToGraph(
        [],
        TEST_DATA__dependencyMainGraphEntities2 as Entity[],
      ),
    );
    expect(firm.propertiesFromAssociations.length).toBe(2);
    expect(person.propertiesFromAssociations.length).toBe(2);
    const association1Name = 'model::MainAssociation';
    const association2Name = 'model::MainAssociation2';
    const association1 =
      editorStore.graphManagerState.graph.getOwnNullableAssociation(
        association1Name,
      );
    expect(association1).toBeDefined();
    const association2 =
      editorStore.graphManagerState.graph.getOwnNullableAssociation(
        association2Name,
      );
    expect(association2).toBeDefined();
    getClassProperty(firm, 'mainPerson');
    getClassProperty(person, 'mainFirm');
    getClassProperty(firm, 'mainPerson2');
    getClassProperty(person, 'mainFirm2');
    // clear current graph
    await flowResult(editorStore.graphState.loadEntityChangesToGraph([], []));
    expect(editorStore.graphManagerState.graph.allOwnElements.length).toBe(0);
    expect(firm.propertiesFromAssociations.length).toBe(0);
    expect(person.propertiesFromAssociations.length).toBe(0);
    expect(
      editorStore.graphManagerState.graph.getOwnNullableAssociation(
        association1Name,
      ),
    ).toBeUndefined();
    expect(
      editorStore.graphManagerState.graph.getOwnNullableAssociation(
        association2Name,
      ),
    ).toBeUndefined();
    // dependencyMananger should be the same after loading and updating applicaton
    expect(editorStore.graphManagerState.graph.dependencyManager).toBe(
      dependencyManager,
    );
    expect(dependencyManager.allOwnElements.length).toBe(10);
  },
);

// Dependency exclusion tests

test(unitTest('Add exclusion by coordinate'), () => {
  const editorStore = TEST__getTestEditorStore();
  const projectConfig = ProjectConfiguration.serialization.fromJson({
    projectStructureVersion: { version: 6, extensionVersion: 1 },
    projectId: 'test-project',
    groupId: 'com.test',
    artifactId: 'test-artifact',
    projectDependencies: [
      {
        projectId: 'org.finos.legend:my-artifact',
        versionId: '1.0.0',
      },
    ],
    metamodelDependencies: [],
  });
  editorStore.projectConfigurationEditorState.setProjectConfiguration(
    projectConfig,
  );

  const dependencyEditorState =
    editorStore.projectConfigurationEditorState.projectDependencyEditorState;

  dependencyEditorState.addExclusionByCoordinate(
    'org.finos.legend:my-artifact',
    'org.example:excluded-lib',
  );

  const exclusions = dependencyEditorState.getExclusions(
    'org.finos.legend:my-artifact',
  );

  expect(exclusions.length).toBe(1);
  expect(exclusions[0]?.projectId).toBe('org.example:excluded-lib');
  expect(exclusions[0]?.groupId).toBe('org.example');
  expect(exclusions[0]?.artifactId).toBe('excluded-lib');
  expect(exclusions[0]?.coordinate).toBe('org.example:excluded-lib');
});

test(unitTest('Add exclusion by ProjectDependencyExclusion object'), () => {
  const editorStore = TEST__getTestEditorStore();
  const projectConfig = ProjectConfiguration.serialization.fromJson({
    projectStructureVersion: { version: 6, extensionVersion: 1 },
    projectId: 'test-project',
    groupId: 'com.test',
    artifactId: 'test-artifact',
    projectDependencies: [
      {
        projectId: 'org.finos.legend:my-artifact',
        versionId: '1.0.0',
      },
    ],
    metamodelDependencies: [],
  });
  editorStore.projectConfigurationEditorState.setProjectConfiguration(
    projectConfig,
  );

  const dependencyEditorState =
    editorStore.projectConfigurationEditorState.projectDependencyEditorState;

  const exclusion = new ProjectDependencyExclusion('org.example:excluded-lib');

  dependencyEditorState.addExclusion('org.finos.legend:my-artifact', exclusion);

  const exclusions = dependencyEditorState.getExclusions(
    'org.finos.legend:my-artifact',
  );

  expect(exclusions.length).toBe(1);
  expect(exclusions[0]?.projectId).toBe('org.example:excluded-lib');
});

test(unitTest('Prevent duplicate exclusions'), () => {
  const editorStore = TEST__getTestEditorStore();
  const projectConfig = ProjectConfiguration.serialization.fromJson({
    projectStructureVersion: { version: 6, extensionVersion: 1 },
    projectId: 'test-project',
    groupId: 'com.test',
    artifactId: 'test-artifact',
    projectDependencies: [
      {
        projectId: 'org.finos.legend:my-artifact',
        versionId: '1.0.0',
      },
    ],
    metamodelDependencies: [],
  });
  editorStore.projectConfigurationEditorState.setProjectConfiguration(
    projectConfig,
  );

  const dependencyEditorState =
    editorStore.projectConfigurationEditorState.projectDependencyEditorState;

  dependencyEditorState.addExclusionByCoordinate(
    'org.finos.legend:my-artifact',
    'org.example:excluded-lib',
  );
  dependencyEditorState.addExclusionByCoordinate(
    'org.finos.legend:my-artifact',
    'org.example:excluded-lib',
  );

  const exclusions = dependencyEditorState.getExclusions(
    'org.finos.legend:my-artifact',
  );

  expect(exclusions.length).toBe(1);
});

test(unitTest('Add multiple exclusions to same dependency'), () => {
  const editorStore = TEST__getTestEditorStore();
  const projectConfig = ProjectConfiguration.serialization.fromJson({
    projectStructureVersion: { version: 6, extensionVersion: 1 },
    projectId: 'test-project',
    groupId: 'com.test',
    artifactId: 'test-artifact',
    projectDependencies: [
      {
        projectId: 'org.finos.legend:my-artifact',
        versionId: '1.0.0',
      },
    ],
    metamodelDependencies: [],
  });
  editorStore.projectConfigurationEditorState.setProjectConfiguration(
    projectConfig,
  );

  const dependencyEditorState =
    editorStore.projectConfigurationEditorState.projectDependencyEditorState;

  dependencyEditorState.addExclusionByCoordinate(
    'org.finos.legend:my-artifact',
    'org.example:excluded-lib-1',
  );
  dependencyEditorState.addExclusionByCoordinate(
    'org.finos.legend:my-artifact',
    'org.example:excluded-lib-2',
  );
  dependencyEditorState.addExclusionByCoordinate(
    'org.finos.legend:my-artifact',
    'com.other:another-lib',
  );

  const exclusions = dependencyEditorState.getExclusions(
    'org.finos.legend:my-artifact',
  );

  expect(exclusions.length).toBe(3);
  expect(exclusions[0]?.coordinate).toBe('org.example:excluded-lib-1');
  expect(exclusions[1]?.coordinate).toBe('org.example:excluded-lib-2');
  expect(exclusions[2]?.coordinate).toBe('com.other:another-lib');
});

test(unitTest('Remove exclusion by coordinate'), () => {
  const editorStore = TEST__getTestEditorStore();
  const projectConfig = ProjectConfiguration.serialization.fromJson({
    projectStructureVersion: { version: 6, extensionVersion: 1 },
    projectId: 'test-project',
    groupId: 'com.test',
    artifactId: 'test-artifact',
    projectDependencies: [
      {
        projectId: 'org.finos.legend:my-artifact',
        versionId: '1.0.0',
      },
    ],
    metamodelDependencies: [],
  });
  editorStore.projectConfigurationEditorState.setProjectConfiguration(
    projectConfig,
  );

  const dependencyEditorState =
    editorStore.projectConfigurationEditorState.projectDependencyEditorState;

  dependencyEditorState.addExclusionByCoordinate(
    'org.finos.legend:my-artifact',
    'org.example:excluded-lib',
  );

  let exclusions = dependencyEditorState.getExclusions(
    'org.finos.legend:my-artifact',
  );
  expect(exclusions.length).toBe(1);

  dependencyEditorState.removeExclusionByCoordinate(
    'org.finos.legend:my-artifact',
    'org.example:excluded-lib',
  );

  exclusions = dependencyEditorState.getExclusions(
    'org.finos.legend:my-artifact',
  );
  expect(exclusions.length).toBe(0);
});

test(unitTest('Get exclusion coordinates returns correct format'), () => {
  const editorStore = TEST__getTestEditorStore();
  const projectConfig = ProjectConfiguration.serialization.fromJson({
    projectStructureVersion: { version: 6, extensionVersion: 1 },
    projectId: 'test-project',
    groupId: 'com.test',
    artifactId: 'test-artifact',
    projectDependencies: [
      {
        projectId: 'org.finos.legend:my-artifact',
        versionId: '1.0.0',
      },
    ],
    metamodelDependencies: [],
  });
  editorStore.projectConfigurationEditorState.setProjectConfiguration(
    projectConfig,
  );

  const dependencyEditorState =
    editorStore.projectConfigurationEditorState.projectDependencyEditorState;

  dependencyEditorState.addExclusionByCoordinate(
    'org.finos.legend:my-artifact',
    'org.example:excluded-1',
  );
  dependencyEditorState.addExclusionByCoordinate(
    'org.finos.legend:my-artifact',
    'com.test:excluded-2',
  );

  const coordinates = dependencyEditorState.getExclusionCoordinates(
    'org.finos.legend:my-artifact',
  );

  expect(coordinates.length).toBe(2);
  expect(coordinates[0]).toBe('org.example:excluded-1');
  expect(coordinates[1]).toBe('com.test:excluded-2');
});

test(unitTest('Sync exclusions to project dependency'), () => {
  const editorStore = TEST__getTestEditorStore();
  const projectConfig = ProjectConfiguration.serialization.fromJson({
    projectStructureVersion: { version: 6, extensionVersion: 1 },
    projectId: 'test-project',
    groupId: 'com.test',
    artifactId: 'test-artifact',
    projectDependencies: [
      {
        projectId: 'org.finos.legend:my-artifact',
        versionId: '1.0.0',
      },
    ],
    metamodelDependencies: [],
  });
  editorStore.projectConfigurationEditorState.setProjectConfiguration(
    projectConfig,
  );

  const dependencyEditorState =
    editorStore.projectConfigurationEditorState.projectDependencyEditorState;

  dependencyEditorState.addExclusionByCoordinate(
    'org.finos.legend:my-artifact',
    'org.example:excluded-1',
  );
  dependencyEditorState.addExclusionByCoordinate(
    'org.finos.legend:my-artifact',
    'org.example:excluded-2',
  );

  dependencyEditorState.syncExclusionsToProjectDependency(
    'org.finos.legend:my-artifact',
  );

  const projectDependency = projectConfig.projectDependencies.find(
    (dep) => dep.projectId === 'org.finos.legend:my-artifact',
  );

  expect(projectDependency).toBeDefined();
  expect(projectDependency?.exclusions).toBeDefined();
  expect(projectDependency?.exclusions?.length).toBe(2);
  expect(projectDependency?.exclusions?.[0]?.coordinate).toBe(
    'org.example:excluded-1',
  );
  expect(projectDependency?.exclusions?.[1]?.coordinate).toBe(
    'org.example:excluded-2',
  );
});

test(unitTest('Sync empty exclusions sets undefined on dependency'), () => {
  const editorStore = TEST__getTestEditorStore();
  const projectConfig = ProjectConfiguration.serialization.fromJson({
    projectStructureVersion: { version: 6, extensionVersion: 1 },
    projectId: 'test-project',
    groupId: 'com.test',
    artifactId: 'test-artifact',
    projectDependencies: [
      {
        projectId: 'org.finos.legend:my-artifact',
        versionId: '1.0.0',
        exclusions: [
          {
            projectId: 'org.example:to-be-removed',
          },
        ],
      },
    ],
    metamodelDependencies: [],
  });
  editorStore.projectConfigurationEditorState.setProjectConfiguration(
    projectConfig,
  );

  const dependencyEditorState =
    editorStore.projectConfigurationEditorState.projectDependencyEditorState;

  dependencyEditorState.removeExclusionByCoordinate(
    'org.finos.legend:my-artifact',
    'org.example:to-be-removed',
  );

  dependencyEditorState.syncExclusionsToProjectDependency(
    'org.finos.legend:my-artifact',
  );

  const projectDependency = projectConfig.projectDependencies.find(
    (dep) => dep.projectId === 'org.finos.legend:my-artifact',
  );

  expect(projectDependency).toBeDefined();
  expect(projectDependency?.exclusions).toBeUndefined();
});

test(
  unitTest('Fetch dependency report with exclusions included in coordinates'),
  async () => {
    const editorStore = TEST__getTestEditorStore();
    const projectConfig = ProjectConfiguration.serialization.fromJson({
      projectStructureVersion: { version: 6, extensionVersion: 1 },
      projectId: 'test-project',
      groupId: 'com.test',
      artifactId: 'test-artifact',
      projectDependencies: [
        {
          projectId: 'org.finos.legend:my-artifact',
          versionId: '1.0.0',
        },
      ],
      metamodelDependencies: [],
    });
    editorStore.projectConfigurationEditorState.setProjectConfiguration(
      projectConfig,
    );

    const dependencyEditorState =
      editorStore.projectConfigurationEditorState.projectDependencyEditorState;

    // Add exclusions
    dependencyEditorState.addExclusionByCoordinate(
      'org.finos.legend:my-artifact',
      'org.example:excluded-lib',
    );
    dependencyEditorState.addExclusionByCoordinate(
      'org.finos.legend:my-artifact',
      'com.other:another-excluded',
    );

    dependencyEditorState.syncExclusionsToProjectDependency(
      'org.finos.legend:my-artifact',
    );

    const analyzeDependencyTreeSpy = createSpy(
      guaranteeNonNullable(editorStore.depotServerClient),
      'analyzeDependencyTree',
    ).mockResolvedValue({
      graph: {
        rootNodes: ['org.finos.legend:my-artifact:1.0.0'],
        nodes: {
          'org.finos.legend:my-artifact:1.0.0': {
            id: 'org.finos.legend:my-artifact:1.0.0',
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'my-artifact',
              versionId: '1.0.0',
            },
            parentIds: [],
            childIds: ['com.other:included-lib:2.0.0'],
          },
          'com.other:included-lib:2.0.0': {
            id: 'com.other:included-lib:2.0.0',
            data: {
              groupId: 'com.other',
              artifactId: 'included-lib',
              versionId: '2.0.0',
            },
            parentIds: ['org.finos.legend:my-artifact:1.0.0'],
            childIds: [],
          },
        },
      },
      conflicts: [],
    });

    await editorStore.graphManagerState.graphManager.initialize({
      env: 'test',
      tabSize: 2,
      clientConfig: {},
    });

    await flowResult(dependencyEditorState.fetchDependencyReport());

    expect(analyzeDependencyTreeSpy).toHaveBeenCalled();
    const callArgs = analyzeDependencyTreeSpy.mock.calls[0];
    expect(callArgs).toBeDefined();
    const coordinatesArray = callArgs?.[0];
    expect(Array.isArray(coordinatesArray)).toBe(true);
    expect(coordinatesArray?.length).toBe(1);

    const coordinates = coordinatesArray?.[0];
    expect(coordinates).toBeDefined();
    expect(coordinates?.groupId).toBe('org.finos.legend');
    expect(coordinates?.artifactId).toBe('my-artifact');
    expect(coordinates?.versionId).toBe('1.0.0');

    // Verify exclusions are included in the request coordinates
    expect(coordinates?.exclusions).toBeDefined();
    const exclusions = Array.isArray(coordinates?.exclusions)
      ? coordinates.exclusions
      : [];
    expect(exclusions.length).toBe(2);
    expect(exclusions[0]?.groupId).toBe('org.example');
    expect(exclusions[0]?.artifactId).toBe('excluded-lib');
    expect(exclusions[1]?.groupId).toBe('com.other');
    expect(exclusions[1]?.artifactId).toBe('another-excluded');

    const mockResolvedValue = (await analyzeDependencyTreeSpy.mock.results[0]
      ?.value) as PlainObject<RawProjectDependencyReport>;
    expect(mockResolvedValue).toBeDefined();
    expect(mockResolvedValue.graph).toBeDefined();
    const graphNodes = (mockResolvedValue.graph as PlainObject).nodes as
      | Record<string, PlainObject>
      | undefined;
    const nodeIds = graphNodes ? Object.keys(graphNodes) : [];

    // Excluded dependencies should NOT appear in the dependency tree
    expect(nodeIds.some((id) => id.includes('org.example:excluded-lib'))).toBe(
      false,
    );
    expect(
      nodeIds.some((id) => id.includes('com.other:another-excluded')),
    ).toBe(false);

    expect(nodeIds.some((id) => id.includes('com.other:included-lib'))).toBe(
      true,
    );
  },
);

test(unitTest('Exclusions across multiple project dependencies'), async () => {
  const editorStore = TEST__getTestEditorStore();
  const projectConfig = ProjectConfiguration.serialization.fromJson({
    projectStructureVersion: { version: 6, extensionVersion: 1 },
    projectId: 'test-project',
    groupId: 'com.test',
    artifactId: 'test-artifact',
    projectDependencies: [
      {
        projectId: 'org.finos.legend:artifact-a',
        versionId: '1.0.0',
      },
      {
        projectId: 'org.finos.legend:artifact-b',
        versionId: '2.0.0',
      },
    ],
    metamodelDependencies: [],
  });
  editorStore.projectConfigurationEditorState.setProjectConfiguration(
    projectConfig,
  );

  const dependencyEditorState =
    editorStore.projectConfigurationEditorState.projectDependencyEditorState;

  dependencyEditorState.addExclusionByCoordinate(
    'org.finos.legend:artifact-a',
    'com.example:excluded-from-a',
  );

  dependencyEditorState.addExclusionByCoordinate(
    'org.finos.legend:artifact-b',
    'com.example:excluded-from-b',
  );
  dependencyEditorState.addExclusionByCoordinate(
    'org.finos.legend:artifact-b',
    'org.other:another-excluded',
  );

  dependencyEditorState.syncExclusionsToProjectDependency(
    'org.finos.legend:artifact-a',
  );
  dependencyEditorState.syncExclusionsToProjectDependency(
    'org.finos.legend:artifact-b',
  );

  const analyzeDependencyTreeSpy = createSpy(
    guaranteeNonNullable(editorStore.depotServerClient),
    'analyzeDependencyTree',
  ).mockResolvedValue({
    graph: {
      rootNodes: [
        'org.finos.legend:artifact-a:1.0.0',
        'org.finos.legend:artifact-b:2.0.0',
      ],
      nodes: {
        'org.finos.legend:artifact-a:1.0.0': {
          id: 'org.finos.legend:artifact-a:1.0.0',
          data: {
            groupId: 'org.finos.legend',
            artifactId: 'artifact-a',
            versionId: '1.0.0',
          },
          parentIds: [],
          childIds: [],
        },
        'org.finos.legend:artifact-b:2.0.0': {
          id: 'org.finos.legend:artifact-b:2.0.0',
          data: {
            groupId: 'org.finos.legend',
            artifactId: 'artifact-b',
            versionId: '2.0.0',
          },
          parentIds: [],
          childIds: [],
        },
      },
    },
    conflicts: [],
  });

  await editorStore.graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });

  await flowResult(dependencyEditorState.fetchDependencyReport());

  // Verify both dependencies were sent with their respective exclusions
  const callArgs = analyzeDependencyTreeSpy.mock.calls[0];
  const coordinatesArray = callArgs?.[0];
  expect(coordinatesArray?.length).toBe(2);

  const coordsA = coordinatesArray?.find(
    (c: PlainObject) => c.artifactId === 'artifact-a',
  );
  expect(coordsA).toBeDefined();
  const exclusionsA = Array.isArray(coordsA?.exclusions)
    ? coordsA.exclusions
    : [];
  expect(exclusionsA.length).toBe(1);
  expect(exclusionsA[0]?.artifactId).toBe('excluded-from-a');

  const coordsB = coordinatesArray?.find(
    (c: PlainObject) => c.artifactId === 'artifact-b',
  );
  expect(coordsB).toBeDefined();
  const exclusionsB = Array.isArray(coordsB?.exclusions)
    ? coordsB.exclusions
    : [];
  expect(exclusionsB.length).toBe(2);
  expect(exclusionsB[0]?.artifactId).toBe('excluded-from-b');
  expect(exclusionsB[1]?.artifactId).toBe('another-excluded');
});

test(
  unitTest('Remove exclusion and verify updated dependency report request'),
  async () => {
    const editorStore = TEST__getTestEditorStore();
    const projectConfig = ProjectConfiguration.serialization.fromJson({
      projectStructureVersion: { version: 6, extensionVersion: 1 },
      projectId: 'test-project',
      groupId: 'com.test',
      artifactId: 'test-artifact',
      projectDependencies: [
        {
          projectId: 'org.finos.legend:my-artifact',
          versionId: '1.0.0',
        },
      ],
      metamodelDependencies: [],
    });
    editorStore.projectConfigurationEditorState.setProjectConfiguration(
      projectConfig,
    );

    const dependencyEditorState =
      editorStore.projectConfigurationEditorState.projectDependencyEditorState;

    dependencyEditorState.addExclusionByCoordinate(
      'org.finos.legend:my-artifact',
      'org.example:to-keep',
    );
    dependencyEditorState.addExclusionByCoordinate(
      'org.finos.legend:my-artifact',
      'org.example:to-remove',
    );

    dependencyEditorState.syncExclusionsToProjectDependency(
      'org.finos.legend:my-artifact',
    );

    const analyzeDependencyTreeSpy = createSpy(
      guaranteeNonNullable(editorStore.depotServerClient),
      'analyzeDependencyTree',
    ).mockResolvedValue({
      graph: {
        rootNodes: ['org.finos.legend:my-artifact:1.0.0'],
        nodes: {
          'org.finos.legend:my-artifact:1.0.0': {
            id: 'org.finos.legend:my-artifact:1.0.0',
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'my-artifact',
              versionId: '1.0.0',
            },
            parentIds: [],
            childIds: [],
          },
        },
      },
      conflicts: [],
    });

    await editorStore.graphManagerState.graphManager.initialize({
      env: 'test',
      tabSize: 2,
      clientConfig: {},
    });

    // First fetch with two exclusions
    await flowResult(dependencyEditorState.fetchDependencyReport());

    let callArgs = analyzeDependencyTreeSpy.mock.calls[0];
    let coordinates = callArgs?.[0]?.[0];
    let exclusions = Array.isArray(coordinates?.exclusions)
      ? coordinates.exclusions
      : [];
    expect(exclusions.length).toBe(2);

    // Now remove one exclusion
    dependencyEditorState.removeExclusionByCoordinate(
      'org.finos.legend:my-artifact',
      'org.example:to-remove',
    );

    dependencyEditorState.syncExclusionsToProjectDependency(
      'org.finos.legend:my-artifact',
    );

    await flowResult(dependencyEditorState.fetchDependencyReport());

    // Verify only one exclusion is sent now
    callArgs = analyzeDependencyTreeSpy.mock.calls[1];
    coordinates = callArgs?.[0]?.[0];
    exclusions = Array.isArray(coordinates?.exclusions)
      ? coordinates.exclusions
      : [];
    expect(exclusions.length).toBe(1);
    expect(exclusions[0]?.artifactId).toBe('to-keep');
  },
);

test(
  unitTest(
    'Exclusions resolve version conflicts by excluding conflicting transitive dependency',
  ),
  async () => {
    const editorStore = TEST__getTestEditorStore();
    const projectConfig = ProjectConfiguration.serialization.fromJson({
      projectStructureVersion: { version: 6, extensionVersion: 1 },
      projectId: 'test-project',
      groupId: 'com.test',
      artifactId: 'test-artifact',
      projectDependencies: [
        {
          projectId: 'org.finos.legend:my-artifact',
          versionId: '1.0.0',
        },
      ],
      metamodelDependencies: [],
    });
    editorStore.projectConfigurationEditorState.setProjectConfiguration(
      projectConfig,
    );

    const dependencyEditorState =
      editorStore.projectConfigurationEditorState.projectDependencyEditorState;

    dependencyEditorState.addExclusionByCoordinate(
      'org.finos.legend:my-artifact',
      'com.conflict:problematic-lib',
    );

    dependencyEditorState.syncExclusionsToProjectDependency(
      'org.finos.legend:my-artifact',
    );

    const analyzeDependencyTreeSpy = createSpy(
      guaranteeNonNullable(editorStore.depotServerClient),
      'analyzeDependencyTree',
    ).mockResolvedValue({
      graph: {
        rootNodes: ['org.finos.legend:my-artifact:1.0.0'],
        nodes: {
          'org.finos.legend:my-artifact:1.0.0': {
            id: 'org.finos.legend:my-artifact:1.0.0',
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'my-artifact',
              versionId: '1.0.0',
            },
            parentIds: [],
            childIds: ['com.other:safe-lib:1.0.0'],
          },
          'com.other:safe-lib:1.0.0': {
            id: 'com.other:safe-lib:1.0.0',
            data: {
              groupId: 'com.other',
              artifactId: 'safe-lib',
              versionId: '1.0.0',
            },
            parentIds: ['org.finos.legend:my-artifact:1.0.0'],
            childIds: [],
          },
        },
      },
      conflicts: [],
    });

    await editorStore.graphManagerState.graphManager.initialize({
      env: 'test',
      tabSize: 2,
      clientConfig: {},
    });

    await flowResult(dependencyEditorState.fetchDependencyReport());

    const mockResolvedValue = (await analyzeDependencyTreeSpy.mock.results[0]
      ?.value) as PlainObject<RawProjectDependencyReport>;

    // Verify no conflicts in the report
    const conflicts = mockResolvedValue.conflicts as unknown[] | undefined;
    expect(conflicts?.length ?? 0).toBe(0);

    const graphNodes = (mockResolvedValue.graph as PlainObject).nodes as
      | Record<string, PlainObject>
      | undefined;
    const nodeIds = graphNodes ? Object.keys(graphNodes) : [];
    expect(
      nodeIds.some((id) => id.includes('com.conflict:problematic-lib')),
    ).toBe(false);

    expect(nodeIds.some((id) => id.includes('com.other:safe-lib'))).toBe(true);
  },
);

test(
  unitTest(
    'Exclusion validation rejects invalid exclusions that would cause compilation errors',
  ),
  async () => {
    const editorStore = TEST__getTestEditorStore();
    const projectConfig = ProjectConfiguration.serialization.fromJson({
      projectStructureVersion: { version: 11, extensionVersion: 1 },
      projectId: 'test-project',
      groupId: 'org.finos.legend',
      artifactId: 'my-project',
      projectDependencies: [],
      metamodelDependencies: [],
      runDependencies: [],
    });

    editorStore.projectConfigurationEditorState.setProjectConfiguration(
      projectConfig,
    );

    const dependencyEditorState =
      editorStore.projectConfigurationEditorState.projectDependencyEditorState;

    await editorStore.graphManagerState.graphManager.initialize({
      env: 'test',
      tabSize: 2,
      clientConfig: {},
    });
    await editorStore.graphManagerState.initializeSystem();

    const compileEntitiesSpy = createSpy(
      editorStore.graphManagerState.graphManager,
      'compileEntities',
    );
    compileEntitiesSpy.mockRejectedValue(
      new Error("Can't find type 'model::RequiredClass'"),
    );

    createSpy(
      guaranteeNonNullable(editorStore.depotServerClient),
      'collectDependencyEntities',
    ).mockResolvedValue([]);

    createSpy(
      guaranteeNonNullable(editorStore.depotServerClient),
      'analyzeDependencyTree',
    ).mockResolvedValue({
      graph: {
        rootIds: [],
        nodes: {},
      },
      conflicts: [],
    });

    const exclusionCoordinate = 'org.finos.legend:some-lib';
    const validationResult = await flowResult(
      dependencyEditorState.validateExclusion(exclusionCoordinate),
    );

    expect(validationResult.isValid).toBe(false);
    expect(validationResult.compilationErrors.length).toBeGreaterThan(0);
  },
);

test(
  unitTest(
    'Exclusion validation allows valid exclusions that do not break compilation',
  ),
  async () => {
    const dependencyWithUnusedEntities = [
      {
        groupId: 'org.finos.legend',
        artifactId: 'unused-lib',
        versionId: '1.0.0',
        versionedEntity: false,
        entities: [
          {
            path: 'model::UnusedClass',
            content: {
              _type: 'class',
              name: 'UnusedClass',
              package: 'model',
              properties: [],
            },
            classifierPath: 'meta::pure::metamodel::type::Class',
          },
        ],
      },
    ];

    const projectEntities: Entity[] = [
      {
        path: 'model::MyClass',
        content: {
          _type: 'class',
          name: 'MyClass',
          package: 'model',
          properties: [
            {
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
              type: 'String',
            },
          ],
        },
        classifierPath: 'meta::pure::metamodel::type::Class',
      },
    ];

    const editorStore = TEST__getTestEditorStore();
    const projectConfig = ProjectConfiguration.serialization.fromJson({
      projectStructureVersion: { version: 11, extensionVersion: 1 },
      projectId: 'test-project',
      groupId: 'org.finos.legend',
      artifactId: 'my-project',
      projectDependencies: [
        {
          projectId: 'org.finos.legend:unused-lib',
          versionId: '1.0.0',
        },
      ],
      metamodelDependencies: [],
      runDependencies: [],
    });

    editorStore.projectConfigurationEditorState.setProjectConfiguration(
      projectConfig,
    );

    const dependencyEditorState =
      editorStore.projectConfigurationEditorState.projectDependencyEditorState;

    createSpy(
      guaranteeNonNullable(editorStore.depotServerClient),
      'collectDependencyEntities',
    ).mockResolvedValue(dependencyWithUnusedEntities);

    createSpy(
      guaranteeNonNullable(editorStore.depotServerClient),
      'analyzeDependencyTree',
    ).mockResolvedValue({
      graph: {
        rootIds: ['org.finos.legend:unused-lib:1.0.0'],
        nodes: {
          'org.finos.legend:unused-lib:1.0.0': {
            data: {
              groupId: 'org.finos.legend',
              artifactId: 'unused-lib',
              versionId: '1.0.0',
            },
            parentIds: [],
            childIds: [],
          },
        },
      },
      conflicts: [],
    });

    await editorStore.graphManagerState.graphManager.initialize({
      env: 'test',
      tabSize: 2,
      clientConfig: {},
    });
    await editorStore.graphManagerState.initializeSystem();

    const dependencyManager = new DependencyManager([]);
    editorStore.graphManagerState.graph.dependencyManager = dependencyManager;

    const dependencyEntitiesIndex =
      await editorStore.graphState.getIndexedDependencyEntities();
    await editorStore.graphManagerState.graphManager.buildDependencies(
      editorStore.graphManagerState.coreModel,
      editorStore.graphManagerState.systemModel,
      dependencyManager,
      dependencyEntitiesIndex,
      editorStore.graphManagerState.dependenciesBuildState,
    );

    await editorStore.graphManagerState.graphManager.buildGraph(
      editorStore.graphManagerState.graph,
      projectEntities,
      editorStore.graphManagerState.graphBuildState,
    );

    const compileEntitiesSpy = createSpy(
      editorStore.graphManagerState.graphManager,
      'compileEntities',
    );
    compileEntitiesSpy.mockResolvedValue(undefined);

    const exclusionCoordinate = 'org.finos.legend:unused-lib';
    const validationResult = await flowResult(
      dependencyEditorState.validateExclusion(exclusionCoordinate),
    );

    expect(validationResult.isValid).toBe(true);
    expect(validationResult.compilationErrors.length).toBe(0);
  },
);
