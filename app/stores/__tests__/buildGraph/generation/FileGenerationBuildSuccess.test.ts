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
import fileGenerationTestData from './FileGenerationTestData.json';
import { Entity } from 'SDLC/entity/Entity';
import { createBrowserHistory } from 'history';
import { unit } from 'Utilities/TestUtil';
import { guaranteeType } from 'Utilities/GeneralUtil';
import { PackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';

const applicationStore = new ApplicationStore(createBrowserHistory());
const editorStore = new EditorStore(applicationStore);

beforeAll(async () => {
  await editorStore.graphState.initializeSystem();
  await editorStore.graphState.graphManager.build(editorStore.graphState.graph, fileGenerationTestData as Entity[]);
});

test(unit('File Generation Graph Success'), () => {
  const graph = editorStore.graphState.graph;
  expect(graph.classes).toHaveLength(3);
  expect(graph.enumerations).toHaveLength(1);
  expect(graph.profiles).toHaveLength(1);
  expect(graph.fileGenerations).toHaveLength(5);
  const fileGeneration = graph.getFileGeneration('model::MyProtobuf');
  expect(graph.generationSpecifications).toHaveLength(1);
  const scope = fileGeneration.scopeElements;
  expect(scope).toHaveLength(1);
  const otherPackage = guaranteeType(scope[0], PackageableElementReference).value;
  expect(otherPackage).toBe(graph.getElement('model::other', true));
});

