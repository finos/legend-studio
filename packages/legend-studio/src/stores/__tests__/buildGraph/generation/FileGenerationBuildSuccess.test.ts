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

import fileGenerationTestData from './FileGenerationTestData.json';
import type { Entity } from '../../../../models/sdlc/models/entity/Entity';
import { guaranteeType, unitTest } from '@finos/legend-studio-shared';
import { getTestEditorStore } from '../../../StoreTestUtils';
import { PackageableElementReference } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';

const editorStore = getTestEditorStore();

beforeAll(async () => {
  await editorStore.graphState.initializeSystem();
  await editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    fileGenerationTestData as Entity[],
  );
});

test(unitTest('File Generation Graph Success'), () => {
  const graph = editorStore.graphState.graph;
  expect(graph.classes).toHaveLength(3);
  expect(graph.enumerations).toHaveLength(1);
  expect(graph.profiles).toHaveLength(1);
  expect(graph.functions).toHaveLength(1);
  expect(graph.fileGenerations).toHaveLength(3);
  const fileGeneration = graph.getFileGeneration('model::MyProtobuf');
  expect(graph.generationSpecifications).toHaveLength(1);
  const scope = fileGeneration.scopeElements;
  expect(scope).toHaveLength(1);
  const otherPackage = guaranteeType(
    scope[0],
    PackageableElementReference,
  ).value;
  expect(otherPackage).toBe(graph.getElement('model::other', true));
});

test(unitTest('Generated Function paths are valid'), () => {
  const functionGen = editorStore.graphState.graph.getFunction(
    'model::functionFullPath_Firm_1__Firm_MANY__Firm_$1_MANY$__String_1__Boolean_1_',
  );
  const entity =
    editorStore.graphState.graphManager.elementToEntity(functionGen);
  expect(entity.path).toBe('model::functionFullPath');
});
