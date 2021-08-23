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

import { unitTest, guaranteeNonNullable } from '@finos/legend-shared';
import {
  TEST_DATA__simpleDebuggingCase,
  TEST_DATA__AutoImportsWithAny,
  TEST_DATA__AutoImportsWithSystemProfiles,
} from '../roundtrip/RoundtripTestData';
import TEST_DATA__m2mGraphEntities from './TEST_DATA__M2MGraphEntities.json';
import {
  TEST__buildGraphBasic,
  TEST__getTestEditorStore,
} from '../../EditorStoreTestUtils';
import { TEST_DATA__SimpleGraph } from './CoreTestData';
import { waitFor } from '@testing-library/dom';
import { flowResult } from 'mobx';
import type { Entity } from '@finos/legend-model-storage';

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
  const editorStore = TEST__getTestEditorStore();
  await TEST__buildGraphBasic(entities, editorStore, {
    TEMPORARY__keepSectionIndex: true,
  });
  await waitFor(() =>
    expect(
      editorStore.graphManagerState.graph.buildState.hasSucceeded,
    ).toBeTrue(),
  );
  // build generation graph
  const generatedEntitiesMap = new Map<string, Entity[]>();
  generatedEntitiesMap.set(PARENT_ELEMENT_PATH, generatedEntities);
  await flowResult(
    editorStore.graphManagerState.graphManager.buildGenerations(
      editorStore.graphManagerState.graph,
      generatedEntitiesMap,
    ),
  );

  expect(
    editorStore.graphManagerState.graph.generationModel.allOwnElements.length,
  ).toBe(generatedElementPaths.length);
  const parentElement = guaranteeNonNullable(
    editorStore.graphManagerState.graph.getElement(PARENT_ELEMENT_PATH),
  );
  generatedElementPaths.forEach((e) => {
    const element =
      editorStore.graphManagerState.graph.generationModel.getOwnNullableElement(
        e,
      );
    guaranteeNonNullable(
      element,
      `Element '${e}' not found in generated model manager`,
    );
    const elementInGraph = editorStore.graphManagerState.graph.getElement(e);
    guaranteeNonNullable(
      elementInGraph,
      `Element '${e}' not found in main graph`,
    );
    const elementInMainGraph =
      editorStore.graphManagerState.graph.allOwnElements.find(
        (el) => el.path === e,
      );
    expect(elementInMainGraph).toBeUndefined();
    expect(elementInGraph).toBe(element);
    expect(elementInGraph.isReadOnly).toBeTrue();
    expect(elementInGraph.generationParentElement).toBe(parentElement);
  });

  const transformedEntities =
    editorStore.graphManagerState.graph.allOwnElements.map((el) =>
      editorStore.graphManagerState.graphManager.elementToEntity(el),
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
  await testGeneratedElements(
    [] as Entity[],
    TEST_DATA__m2mGraphEntities as Entity[],
  );
  await testGeneratedElements(
    [] as Entity[],
    TEST_DATA__simpleDebuggingCase as Entity[],
  );
});

test(unitTest('Auto-imports generation check'), async () => {
  await testGeneratedElements(
    [] as Entity[],
    TEST_DATA__AutoImportsWithSystemProfiles as Entity[],
  );
  await testGeneratedElements(
    [] as Entity[],
    TEST_DATA__AutoImportsWithAny as Entity[],
  );
});

test(unitTest('Core model generations check'), async () => {
  await testGeneratedElements(
    [] as Entity[],
    TEST_DATA__SimpleGraph as Entity[],
  );
});
