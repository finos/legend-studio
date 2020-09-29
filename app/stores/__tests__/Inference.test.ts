/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import 'jest-extended';
import { ApplicationStore } from 'Stores/ApplicationStore';
import { EditorStore } from 'Stores/EditorStore';
import { Entity } from 'SDLC/entity/Entity';
import { unit } from 'Utilities/TestUtil';
import { createBrowserHistory } from 'history';
import { testInferenceDefaultMappingElementID, testImportResolutionMultipleMatchesFound, testReferenceWithoutSection, testReferenceModification } from 'Stores/__tests__/InferenceTestData';
import { graphModelDataToEntities } from 'MM/AbstractPureGraphManager';

test(unit('Infer default mapping element ID'), async () => {
  const editorStore = new EditorStore(new ApplicationStore(createBrowserHistory()));
  await editorStore.graphState.initializeSystem();
  await editorStore.graphState.graphManager.build(editorStore.graphState.graph, testInferenceDefaultMappingElementID as Entity[], { TEMP_retainSection: true });
  const transformedEntities = graphModelDataToEntities(editorStore.graphState.graphManager, editorStore.graphState.getBasicGraphModelData());
  expect(transformedEntities).toEqual(testInferenceDefaultMappingElementID);
});

test(unit('Import resolution throws when multiple matches found'), async () => {
  const editorStore = new EditorStore(new ApplicationStore(createBrowserHistory()));
  await editorStore.graphState.initializeSystem();
  await expect(() => editorStore.graphState.graphManager.build(editorStore.graphState.graph, testImportResolutionMultipleMatchesFound as Entity[], { TEMP_retainSection: true })).rejects.toThrow(`Can't resolve element with path 'A' - multiple matches found [test::A, test2::A]`);
});

test(unit('Reference without section index should resolve all reference to full path during serialization'), async () => {
  const editorStore = new EditorStore(new ApplicationStore(createBrowserHistory()));
  await editorStore.graphState.initializeSystem();
  await editorStore.graphState.graphManager.build(editorStore.graphState.graph, testReferenceWithoutSection.original as Entity[]);
  const transformedEntities = graphModelDataToEntities(editorStore.graphState.graphManager, editorStore.graphState.getBasicGraphModelData());
  expect(transformedEntities.filter(entity => entity.path !== '__internal__::SectionIndex')).toEqual(testReferenceWithoutSection.withoutSection);
});

test(unit('Modified reference should resolve serialization path properly'), async () => {
  // If the reference owner does not change, the serialized path is kept as user input
  let editorStore = new EditorStore(new ApplicationStore(createBrowserHistory()));
  await editorStore.graphState.initializeSystem();
  await editorStore.graphState.graphManager.build(editorStore.graphState.graph, testReferenceModification.original as Entity[], { TEMP_retainSection: true });
  let enumeration = editorStore.graphState.graph.getEnumeration('test::tEnum');
  enumeration.taggedValues[0].setTag(editorStore.graphState.graph.getProfile('test::tProf').getTag('s4'));
  expect(graphModelDataToEntities(editorStore.graphState.graphManager, editorStore.graphState.getBasicGraphModelData())).toEqual(testReferenceModification.sameProfileModification);
  // If the reference owner changes, the serialized path is fully-resolved
  editorStore = new EditorStore(new ApplicationStore(createBrowserHistory()));
  await editorStore.graphState.initializeSystem();
  await editorStore.graphState.graphManager.build(editorStore.graphState.graph, testReferenceModification.original as Entity[], { TEMP_retainSection: true });
  enumeration = editorStore.graphState.graph.getEnumeration('test::tEnum');
  enumeration.taggedValues[0].setTag(editorStore.graphState.graph.getProfile('test2::tProf').getTag('s1'));
  expect(graphModelDataToEntities(editorStore.graphState.graphManager, editorStore.graphState.getBasicGraphModelData())).toEqual(testReferenceModification.differentProfileModification);
});
