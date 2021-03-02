/**
 * Copyright 2020 Goldman Sachs
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
import { unitTest, guaranteeNonNullable } from '@finos/legend-studio-shared';
import {
  simpleDebuggingCase,
  testAutoImportsWithAny,
  testAutoImportsWithSystemProfiles,
} from '../roundtrip/RoundtripTestData';
import m2mGraphEntities from './M2MGraphEntitiesTestData.json';
import type { ProjectDependencyMetadata } from '../../../models/sdlc/models/configuration/ProjectDependency';
import { ProjectConfiguration } from '../../../models/sdlc/models/configuration/ProjectConfiguration';
import { waitFor } from '@testing-library/dom';
import { getTestEditorStore } from '../../StoreTestUtils';
import { simpleCoreModelData } from './CoreTestData';
import { DependencyManager } from '../../../models/metamodels/pure/graph/DependencyManager';
import { PackageableElementReference } from '../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';

const addDependencyEntities = (
  dependencyEntities: Entity[],
  dependencies: Map<string, ProjectDependencyMetadata>,
  projectId?: string,
): void => {
  const config = new ProjectConfiguration();
  config.projectId = projectId ?? 'UAT-TEST_DEPENDENCY';
  const dependencyMetaData = {
    entities: dependencyEntities,
    config,
    processVersionPackage: false,
  };
  dependencies.set(config.projectId, dependencyMetaData);
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
  dependencyEntities: Entity[],
  includeDependencyInFileGenerationScopeElements?: boolean,
): Promise<void> => {
  const dependencyElementPaths = dependencyEntities.map((e) => e.path);
  if (includeDependencyInFileGenerationScopeElements) {
    entities.push(
      buildFileGenerationDepentOnDependencyElements(dependencyElementPaths),
    );
  }
  const editorStore = getTestEditorStore();
  await editorStore.graphState.initializeSystem();
  const dependencyManager = new DependencyManager([]);
  const dependencyMap = new Map<string, ProjectDependencyMetadata>();
  addDependencyEntities(dependencyEntities, dependencyMap);
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

test(unitTest('M2M graph dependency check'), async () => {
  await testDependencyElements(
    [] as Entity[],
    m2mGraphEntities as Entity[],
    true,
  );
  await testDependencyElements(
    [] as Entity[],
    simpleDebuggingCase as Entity[],
    true,
  );
});

test(unitTest('Auto-imports dependency check'), async () => {
  await testDependencyElements(
    [] as Entity[],
    testAutoImportsWithSystemProfiles as Entity[],
    true,
  );
  await testDependencyElements(
    [] as Entity[],
    testAutoImportsWithAny as Entity[],
    true,
  );
});

test(unitTest('Core model dependency check'), async () => {
  await testDependencyElements(
    [] as Entity[],
    simpleCoreModelData as Entity[],
    true,
  );
});
