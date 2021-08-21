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

import type { PlainObject } from '@finos/legend-shared';
import { unitTest, guaranteeNonNullable } from '@finos/legend-shared';
import {
  TEST_DATA__simpleDebuggingCase,
  TEST_DATA__AutoImportsWithAny,
  TEST_DATA__AutoImportsWithSystemProfiles,
} from '../roundtrip/RoundtripTestData';
import TEST_DATA__m2mGraphEntities from './TEST_DATA__M2MGraphEntities.json';
import { waitFor } from '@testing-library/dom';
import { TEST__getTestEditorStore } from '../../StoreTestUtils';
import { TEST_DATA__SimpleGraph } from './CoreTestData';
import { flowResult } from 'mobx';
import type { Entity } from '@finos/legend-model-storage';
import { ProjectConfiguration } from '@finos/legend-server-sdlc';
import { DeprecatedProjectVersionEntities } from '@finos/legend-server-depot';
import {
  DependencyManager,
  PackageableElementReference,
} from '@finos/legend-graph';

const testDependingOnDifferentProjectVersions = [
  {
    projectId: 'PROD-A',
    versionId: '1.0.0',
    versionedEntity: false,
    entities: [],
  },
  {
    projectId: 'PROD-A',
    versionId: '2.0.0',
    versionedEntity: false,
    entities: [],
  },
];

const testDependingOnMoreThanOneproject = [
  {
    projectId: 'PROD-A',
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
    projectId: 'PROD-B',
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
    projectId: 'PROD-C',
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
  projectType: 'PROTOTYPE',
  groupId: 'com.test',
  artifactId: 'string',
  projectDependencies: [
    {
      projectId: 'PROD_1',
      versionId: {
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
      },
    },
  ],
  metamodelDependencies: [],
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
  dependencyEntities: PlainObject<DeprecatedProjectVersionEntities>[],
  includeDependencyInFileGenerationScopeElements?: boolean,
): Promise<void> => {
  const projectVersionEntities = dependencyEntities.map((e) =>
    DeprecatedProjectVersionEntities.serialization.fromJson(e),
  );
  const keys = projectVersionEntities.map((e) => e.projectId);
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
  // mock version entities api return
  jest
    .spyOn(
      guaranteeNonNullable(editorStore.depotServerClient),
      'getProjectVersionsDependencyEntities',
    )
    .mockResolvedValue(dependencyEntities);
  await flowResult(editorStore.graphState.initializeSystem());
  const dependencyManager = new DependencyManager([]);
  const dependencyEntitiesMap = await flowResult(
    editorStore.graphState.getConfigurationProjectDependencyEntities(),
  );
  editorStore.graphState.graph.setDependencyManager(dependencyManager);
  await flowResult(
    editorStore.graphState.graphManager.buildDependencies(
      editorStore.graphState.coreModel,
      editorStore.graphState.systemModel,
      dependencyManager,
      dependencyEntitiesMap,
    ),
  );
  await waitFor(() =>
    expect(
      editorStore.graphState.graph.dependencyManager.buildState.hasSucceeded,
    ).toBeTrue(),
  );

  await flowResult(
    editorStore.graphState.graphManager.buildGraph(
      editorStore.graphState.graph,
      entities,
      { TEMPORARY__keepSectionIndex: true },
    ),
  );
  await waitFor(() =>
    expect(editorStore.graphState.graph.buildState.hasSucceeded).toBeTrue(),
  );
  Array.from(dependencyEntitiesMap.keys()).forEach((k) =>
    expect(dependencyManager.getModel(k)).toBeDefined(),
  );
  Array.from(keys).forEach((k) =>
    expect(dependencyManager.getModel(k)).toBeDefined(),
  );
  expect(dependencyManager.allElements.length).toBe(
    dependencyElementPaths.length,
  );

  dependencyElementPaths.forEach((e) => {
    const element = dependencyManager.getNullableElement(e);
    guaranteeNonNullable(
      element,
      `element ${e} not found in dependency manager`,
    );
    const elementInGraph = editorStore.graphState.graph.getElement(e);
    guaranteeNonNullable(
      elementInGraph,
      `element ${e} not found in main graph`,
    );
    const elementInMainGraph = editorStore.graphState.graph.allOwnElements.find(
      (el) => el.path === e,
    );
    expect(elementInMainGraph).toBeUndefined();
    expect(elementInGraph).toBe(element);
    expect(elementInGraph.isReadOnly).toBeTrue();
  });
  if (includeDependencyInFileGenerationScopeElements) {
    const fileGeneration = guaranteeNonNullable(
      editorStore.graphState.graph.getOwnFileGeneration(FILE_GENERATION_PATH),
    );
    dependencyElementPaths.forEach((e) => {
      const elementInGraph = guaranteeNonNullable(
        editorStore.graphState.graph.getElement(e),
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
  const transformedEntities = editorStore.graphState.graph.allOwnElements.map(
    (el) => editorStore.graphState.graphManager.elementToEntity(el),
  );
  expect(entities).toIncludeSameMembers(transformedEntities);
  // Ensure dependency elements are not transformed
  for (const entityPath of dependencyElementPaths) {
    expect(
      transformedEntities.find((el) => el.path === entityPath),
    ).toBeUndefined();
  }
};

const buildProjectVersionEntities = (
  entities: Entity[],
): PlainObject<DeprecatedProjectVersionEntities>[] => [
  {
    projectId: TEST_DEPENDENCY_PROJECT_ID,
    versionId: '1.0.0',
    entities,
    versionedEntity: false,
  },
];

test(unitTest('M2M graph dependency check'), async () => {
  await testDependencyElements(
    [] as Entity[],
    buildProjectVersionEntities(TEST_DATA__m2mGraphEntities as Entity[]),
    true,
  );
  await testDependencyElements(
    [] as Entity[],
    buildProjectVersionEntities(TEST_DATA__simpleDebuggingCase as Entity[]),
    true,
  );
});

test(unitTest('Auto-imports dependency check'), async () => {
  await testDependencyElements(
    [] as Entity[],
    buildProjectVersionEntities(
      TEST_DATA__AutoImportsWithSystemProfiles as Entity[],
    ),
    true,
  );
  await testDependencyElements(
    [] as Entity[],
    buildProjectVersionEntities(TEST_DATA__AutoImportsWithAny as Entity[]),
    true,
  );
});

test(unitTest('Core model dependency check'), async () => {
  await testDependencyElements(
    [] as Entity[],
    buildProjectVersionEntities(TEST_DATA__SimpleGraph as Entity[]),
    true,
  );
});

test(
  unitTest('Depending on more than one project dependency check'),
  async () => {
    await testDependencyElements(
      [] as Entity[],
      testDependingOnMoreThanOneproject,
      true,
    );
  },
);

test(
  unitTest('Same project different versions dependency error check'),
  async () => {
    await expect(
      testDependencyElements(
        [] as Entity[],
        testDependingOnDifferentProjectVersions,
        true,
      ),
    ).rejects.toThrowError(
      "Depending on multiple versions of a project is not supported. Found dependency on project 'PROD-A' with versions: 1.0.0, 2.0.0.",
    );
  },
);
