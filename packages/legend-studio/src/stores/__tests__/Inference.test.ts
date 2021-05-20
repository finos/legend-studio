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

import type { Entity } from '../../models/sdlc/models/entity/Entity';
import { unitTest } from '@finos/legend-studio-shared';
import {
  testInferenceDefaultMappingElementID,
  testImportResolutionMultipleMatchesFound,
  testReferenceWithoutSection,
  testReferenceModification,
} from '../__tests__/InferenceTestData';
import { getTestEditorStore, excludeSectionIndex } from '../StoreTestUtils';

test(unitTest('Infer default mapping element ID'), async () => {
  const editorStore = getTestEditorStore();
  await editorStore.graphState.initializeSystem();
  await editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    testInferenceDefaultMappingElementID as Entity[],
    { TEMPORARY__keepSectionIndex: true },
  );
  const transformedEntities = editorStore.graphState.graph.allElements.map(
    (element) => editorStore.graphState.graphManager.elementToEntity(element),
  );
  expect(transformedEntities).toIncludeSameMembers(
    excludeSectionIndex(testInferenceDefaultMappingElementID as Entity[]),
  );
});

test(
  unitTest('Import resolution throws when multiple matches found'),
  async () => {
    const editorStore = getTestEditorStore();
    await editorStore.graphState.initializeSystem();
    await expect(() =>
      editorStore.graphState.graphManager.buildGraph(
        editorStore.graphState.graph,
        testImportResolutionMultipleMatchesFound as Entity[],
        { TEMPORARY__keepSectionIndex: true },
      ),
    ).rejects.toThrow(
      `Can't resolve element with path 'A' - multiple matches found [test::A, test2::A]`,
    );
  },
);

test(
  unitTest(
    'Reference without section index should resolve all reference to full path during serialization',
  ),
  async () => {
    const editorStore = getTestEditorStore();
    await editorStore.graphState.initializeSystem();
    await editorStore.graphState.graphManager.buildGraph(
      editorStore.graphState.graph,
      testReferenceWithoutSection.original as Entity[],
    );
    const transformedEntities = editorStore.graphState.graph.allElements.map(
      (element) => editorStore.graphState.graphManager.elementToEntity(element),
    );
    expect(transformedEntities).toIncludeSameMembers(
      testReferenceWithoutSection.withoutSection,
    );
  },
);

test(
  unitTest('Modified reference should resolve serialization path properly'),
  async () => {
    // If the reference owner does not change, the serialized path is kept as user input
    let editorStore = getTestEditorStore();
    await editorStore.graphState.initializeSystem();
    await editorStore.graphState.graphManager.buildGraph(
      editorStore.graphState.graph,
      testReferenceModification.original as Entity[],
      { TEMPORARY__keepSectionIndex: true },
    );
    let enumeration =
      editorStore.graphState.graph.getEnumeration('test::tEnum');
    enumeration.taggedValues[0].setTag(
      editorStore.graphState.graph.getProfile('test::tProf').getTag('s4'),
    );
    expect(
      editorStore.graphState.graph.allElements.map((element) =>
        editorStore.graphState.graphManager.elementToEntity(element),
      ),
    ).toIncludeSameMembers(
      excludeSectionIndex(
        testReferenceModification.sameProfileModification as Entity[],
      ),
    );
    // If the reference owner changes, the serialized path is fully-resolved
    editorStore = getTestEditorStore();
    await editorStore.graphState.initializeSystem();
    await editorStore.graphState.graphManager.buildGraph(
      editorStore.graphState.graph,
      testReferenceModification.original as Entity[],
      { TEMPORARY__keepSectionIndex: true },
    );
    enumeration = editorStore.graphState.graph.getEnumeration('test::tEnum');
    enumeration.taggedValues[0].setTag(
      editorStore.graphState.graph.getProfile('test2::tProf').getTag('s1'),
    );
    expect(
      editorStore.graphState.graph.allElements.map((element) =>
        editorStore.graphState.graphManager.elementToEntity(element),
      ),
    ).toIncludeSameMembers(
      excludeSectionIndex(
        testReferenceModification.differentProfileModification as Entity[],
      ),
    );
  },
);
