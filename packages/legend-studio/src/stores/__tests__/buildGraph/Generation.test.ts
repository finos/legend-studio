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
import { unitTest, guaranteeNonNullable } from '@finos/legend-studio-shared';
import {
  simpleDebuggingCase,
  testAutoImportsWithAny,
  testAutoImportsWithSystemProfiles,
} from '../roundtrip/RoundtripTestData';
import m2mGraphEntities from './M2MGraphEntitiesTestData.json';
import { getTestEditorStore } from '../../StoreTestUtils';
import { simpleCoreModelData } from './CoreTestData';
import { waitFor } from '@testing-library/dom';

const PARENT_ELEMENT_PATH = 'model::myFileGeneration';
const buildParentElement = (): Entity => {
  const fileGeneration = {
    path: PARENT_ELEMENT_PATH,
    content: {
      _type: 'fileGeneration',
      configurationProperties: [],
      name: 'myFileGeneration',
      package: 'model',
      scopeElements: [],
      type: 'testType',
    },
    classifierPath:
      'meta::pure::generation::metamodel::GenerationConfiguration',
  } as Entity;
  return fileGeneration;
};

const testGeneratedElements = async (
  entities: Entity[],
  generatedEntities: Entity[],
): Promise<void> => {
  entities.push(buildParentElement());
  const generatedElementPaths = generatedEntities.map((e) => e.path);
  const editorStore = getTestEditorStore();
  await editorStore.graphState.initializeSystem();
  // build main graph
  await editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    entities,
    { TEMPORARY__keepSectionIndex: true },
  );
  await waitFor(() => expect(editorStore.graphState.graph.isBuilt).toBeTrue());
  // build generation graph
  const generatedEntitiesMap = new Map<string, Entity[]>();
  generatedEntitiesMap.set(PARENT_ELEMENT_PATH, generatedEntities);
  await editorStore.graphState.graphManager.buildGenerations(
    editorStore.graphState.graph,
    generatedEntitiesMap,
  );

  expect(editorStore.graphState.graph.generationModel.allElements.length).toBe(
    generatedElementPaths.length,
  );
  const parentElement = guaranteeNonNullable(
    editorStore.graphState.graph.getElement(PARENT_ELEMENT_PATH),
  );
  generatedElementPaths.forEach((e) => {
    const element =
      editorStore.graphState.graph.generationModel.getNullableElement(e);
    guaranteeNonNullable(
      element,
      `element ${e} not found in generated model manager`,
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
    expect(elementInGraph.generationParentElement).toBe(parentElement);
  });

  const transformedEntities = editorStore.graphState.graph.allElements.map(
    (el) => editorStore.graphState.graphManager.elementToEntity(el),
  );
  expect(entities).toIncludeSameMembers(transformedEntities);
  // Ensure generated elements are not transformed
  for (const entityPath of generatedElementPaths) {
    expect(
      transformedEntities.find((el) => el.path === entityPath),
    ).toBeUndefined();
  }
};

test(unitTest('M2M graph generation check'), async () => {
  await testGeneratedElements([] as Entity[], m2mGraphEntities as Entity[]);
  await testGeneratedElements([] as Entity[], simpleDebuggingCase as Entity[]);
});

test(unitTest('Auto-imports generation check'), async () => {
  await testGeneratedElements(
    [] as Entity[],
    testAutoImportsWithSystemProfiles as Entity[],
  );
  await testGeneratedElements(
    [] as Entity[],
    testAutoImportsWithAny as Entity[],
  );
});

test(unitTest('Core model generations check'), async () => {
  await testGeneratedElements([] as Entity[], simpleCoreModelData as Entity[]);
});
