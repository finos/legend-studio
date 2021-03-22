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

import type { EditorStore } from '../../EditorStore';
import {
  testMissingSuperType,
  testMissingProfile,
  testMissingProperty,
  testMissingStereoType,
  testMissingTagValue,
  testMissingTargetClassinMapping,
  testMissingSetImp,
  testMissingClassInDiagram,
  testMissingClassMapping,
  testMissingClassMappingWithTargetId,
} from './GraphBuildFailureTestData';
import type { Entity } from '../../../models/sdlc/models/entity/Entity';
import { unitTest } from '@finos/legend-studio-shared';
import { getTestEditorStore } from '../../StoreTestUtils';

let editorStore: EditorStore;

beforeEach(async () => {
  editorStore = getTestEditorStore();
});

test(unitTest('Missing super type'), async () => {
  const buildGraph = editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    testMissingSuperType as Entity[],
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find supertype 'ui::test1::Organism' of class 'ui::test1::Animal'`,
  );
});

test(unitTest('Missing profile'), async () => {
  const buildGraph = editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    testMissingProfile as Entity[],
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find profile 'ui::test1::ProfileTest'`,
  );
});

test(unitTest('Missing class property'), async () => {
  const buildGraph = editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    testMissingProperty as Entity[],
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find type 'ui::test1::NotFound'`,
  );
});

test(unitTest('Missing stereotype'), async () => {
  const buildGraph = editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    testMissingStereoType as Entity[],
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find stereotype 'missingStereotype' in profile 'ui::meta::pure::profiles::TestProfile'`,
  );
});

test(unitTest('Missing tagged value'), async () => {
  const buildGraph = editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    testMissingTagValue as Entity[],
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find tag 'missingTag' in profile 'ui::meta::pure::profiles::TestProfile'`,
  );
});

test(unitTest('Missing class in Pure Instance class mapping'), async () => {
  const buildGraph = editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    testMissingTargetClassinMapping as Entity[],
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find type 'ui::test1::Target_Something'`,
  );
});

test(unitTest('Missing class mapping'), async () => {
  const buildGraph = editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    testMissingClassMapping as Entity[],
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find any class mapping for class 'ui::Employeer' in mapping 'ui::myMap'`,
  );
});

test(unitTest('Missing class mapping with ID'), async () => {
  const buildGraph = editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    testMissingClassMappingWithTargetId as Entity[],
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find class mapping with ID 'notFound' in mapping 'ui::myMap'`,
  );
});

// TODO This test is skipped because we don't support include mappings. We don't fail yet
// Unskip when include mappings support is added
test.skip(unitTest('Missing set implementation'), async () => {
  const buildGraph = editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    testMissingSetImp as Entity[],
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find set implementation 'targetClassAMissing'`,
  );
});

test(unitTest('Missing class in diagram class view'), async () => {
  const buildGraph = editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    testMissingClassInDiagram as Entity[],
  );
  await expect(buildGraph).rejects.toThrowError(
    `Can't find type 'ui::test1::NotFound'`,
  );
});
