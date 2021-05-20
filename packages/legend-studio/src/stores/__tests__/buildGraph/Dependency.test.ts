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

import type { Entity } from '../../../models/sdlc/models/entity/Entity';
import type { PlainObject } from '@finos/legend-studio-shared';
import { unitTest, guaranteeNonNullable } from '@finos/legend-studio-shared';
import {
  simpleDebuggingCase,
  testAutoImportsWithAny,
  testAutoImportsWithSystemProfiles,
} from '../roundtrip/RoundtripTestData';
import m2mGraphEntities from './M2MGraphEntitiesTestData.json';
import { ProjectConfiguration } from '../../../models/sdlc/models/configuration/ProjectConfiguration';
import { waitFor } from '@testing-library/dom';
import { getTestEditorStore } from '../../StoreTestUtils';
import { simpleCoreModelData } from './CoreTestData';
import { DependencyManager } from '../../../models/metamodels/pure/graph/DependencyManager';
import { PackageableElementReference } from '../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import { ProjectVersionEntities } from '../../../models/metadata/models/ProjectVersionEntities';

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
  dependencyEntities: PlainObject<ProjectVersionEntities>[],
  includeDependencyInFileGenerationScopeElements?: boolean,
): Promise<void> => {
  const projectVersionEntities = dependencyEntities.map((e) =>
    ProjectVersionEntities.serialization.fromJson(e),
  );
  const keys = projectVersionEntities.map((e) => e.projectId);
  const dependencyElementPaths = projectVersionEntities
    .map((e) => e.entities)
    .flat()
    .map((e) => e.path);
  if (includeDependencyInFileGenerationScopeElements) {
    entities.push(
      buildFileGenerationDepentOnDependencyElements(dependencyElementPaths),
    );
  }
  const editorStore = getTestEditorStore();
  editorStore.projectConfigurationEditorState.setProjectConfiguration(
    ProjectConfiguration.serialization.fromJson(PROJECT_CONFIG),
  );
  // mock version entities api return
  jest
    .spyOn(
      guaranteeNonNullable(
        editorStore.applicationStore.networkClientManager.metadataClient,
      ),
      'getDependencyEntities',
    )
    .mockResolvedValue(dependencyEntities);
  await editorStore.graphState.initializeSystem();
  const dependencyManager = new DependencyManager([]);
  const dependencyMap =
    await editorStore.graphState.getProjectDependencyEntities();
  editorStore.graphState.graph.setDependencyManager(dependencyManager);
  await editorStore.graphState.graphManager.buildDependencies(
    editorStore.graphState.coreModel,
    editorStore.graphState.systemModel,
    dependencyManager,
    dependencyMap,
  );
  await waitFor(() =>
    expect(editorStore.graphState.graph.dependencyManager.isBuilt).toBeTrue(),
  );

  await editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    entities,
    { TEMPORARY__keepSectionIndex: true },
  );
  await waitFor(() => expect(editorStore.graphState.graph.isBuilt).toBeTrue());
  Array.from(dependencyMap.keys()).forEach((k) =>
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
    const elementInMainGraph = editorStore.graphState.graph.allElements.find(
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
  const transformedEntities = editorStore.graphState.graph.allElements.map(
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
): PlainObject<ProjectVersionEntities>[] => [
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
    buildProjectVersionEntities(m2mGraphEntities as Entity[]),
    true,
  );
  await testDependencyElements(
    [] as Entity[],
    buildProjectVersionEntities(simpleDebuggingCase as Entity[]),
    true,
  );
});

test(unitTest('Auto-imports dependency check'), async () => {
  await testDependencyElements(
    [] as Entity[],
    buildProjectVersionEntities(testAutoImportsWithSystemProfiles as Entity[]),
    true,
  );
  await testDependencyElements(
    [] as Entity[],
    buildProjectVersionEntities(testAutoImportsWithAny as Entity[]),
    true,
  );
});

test(unitTest('Core model dependency check'), async () => {
  await testDependencyElements(
    [] as Entity[],
    buildProjectVersionEntities(simpleCoreModelData as Entity[]),
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
