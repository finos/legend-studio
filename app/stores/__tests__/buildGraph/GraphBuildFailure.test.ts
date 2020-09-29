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

import { ApplicationStore } from 'Stores/ApplicationStore';
import { EditorStore } from 'Stores/EditorStore';
import { testMissingSuperType, testMissingProfile, testMissingProperty, testMissingStereoType, testMissingTagValue, testMissingTargetClassinMapping, testMissingSetImp, testMissingClassInDiagram, testMissingClassMapping, testMissingClassMappingWithTargetId } from './GraphBuildFailureTestData';
import { Entity } from 'SDLC/entity/Entity';
import { unit } from 'Utilities/TestUtil';
import { createBrowserHistory } from 'history';

let editorStore: EditorStore;

beforeEach(async () => {
  editorStore = new EditorStore(new ApplicationStore(createBrowserHistory()));
});

test(unit('Missing super type'), async () => {
  const buildGraph = editorStore.graphState.graphManager.build(editorStore.graphState.graph, testMissingSuperType as Entity[]);
  await expect(buildGraph).rejects.toThrowError(`Can't find supertype 'ui::mapping::editor::domain::Organism' of class 'ui::mapping::editor::domain::Animal'`);
});

test(unit('Missing profile'), async () => {
  const buildGraph = editorStore.graphState.graphManager.build(editorStore.graphState.graph, testMissingProfile as Entity[]);
  await expect(buildGraph).rejects.toThrowError(`Can't find profile 'ui::mapping::editor::domain::ProfileTest'`);
});

test(unit('Missing class property'), async () => {
  const buildGraph = editorStore.graphState.graphManager.build(editorStore.graphState.graph, testMissingProperty as Entity[]);
  await expect(buildGraph).rejects.toThrowError(`Can't find type 'ui::mapping::editor::domain::NotFound'`);
});

test(unit('Missing stereotype'), async () => {
  const buildGraph = editorStore.graphState.graphManager.build(editorStore.graphState.graph, testMissingStereoType as Entity[]);
  await expect(buildGraph).rejects.toThrowError(`Can't find stereotype 'missingStereotype' in profile 'ui::meta::pure::profiles::temporal'`);
});

test(unit('Missing tagged value'), async () => {
  const buildGraph = editorStore.graphState.graphManager.build(editorStore.graphState.graph, testMissingTagValue as Entity[]);
  await expect(buildGraph).rejects.toThrowError(`Can't find tag 'missingTag' in profile 'ui::meta::pure::profiles::temporal'`);
});

test(unit('Missing class in Pure Instance class mapping'), async () => {
  const buildGraph = editorStore.graphState.graphManager.build(editorStore.graphState.graph, testMissingTargetClassinMapping as Entity[]);
  await expect(buildGraph).rejects.toThrowError(`Can't find type 'ui::mapping::editor::domain::Target_Something'`);
});

test(unit('Missing class mapping'), async () => {
  const buildGraph = editorStore.graphState.graphManager.build(editorStore.graphState.graph, testMissingClassMapping as Entity[]);
  await expect(buildGraph).rejects.toThrowError(`Can't find any class mapping for class 'ui::Employeer' in mapping 'ui::myMap'`);
});

test(unit('Missing class mapping with ID'), async () => {
  const buildGraph = editorStore.graphState.graphManager.build(editorStore.graphState.graph, testMissingClassMappingWithTargetId as Entity[]);
  await expect(buildGraph).rejects.toThrowError(`Can't find class mapping with ID 'notFound' in mapping 'ui::myMap'`);
});

// TODO This test is skipped because we don't support include mappings. We don't fail yet
// Unskip when include mappings support is added
test.skip(unit('Missing set implementation'), async () => {
  const buildGraph = editorStore.graphState.graphManager.build(editorStore.graphState.graph, testMissingSetImp as Entity[]);
  await expect(buildGraph).rejects.toThrowError(`Can't find set implementation 'targetClassAMissing'`);
});

test(unit('Missing class in diagram class view'), async () => {
  const buildGraph = editorStore.graphState.graphManager.build(editorStore.graphState.graph, testMissingClassInDiagram as Entity[]);
  await expect(buildGraph).rejects.toThrowError(`Can't find type 'ui::mapping::editor::domain::NotFound'`);
});
