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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { TEST__getTestEditorStore } from '../__test-utils__/EditorStoreTestUtils.js';
import { flowResult } from 'mobx';
import { type EntityDiff, EntityChangeType } from '@finos/legend-server-sdlc';
import { Class, getClassProperty } from '@finos/legend-graph';
import { property_setName } from '../../graph-modifier/DomainGraphModifierHelper.js';
import {
  graph_addElement,
  graph_deleteElement,
} from '../../graph-modifier/GraphModifierHelper.js';

const entities = [
  {
    path: 'model::ClassA',
    content: {
      _type: 'class',
      name: 'ClassA',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'prop',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
];

test(unitTest('Change detection works properly'), async () => {
  const editorStore = TEST__getTestEditorStore();

  await editorStore.graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });
  await editorStore.graphManagerState.initializeSystem();
  await editorStore.graphManagerState.graphManager.buildGraph(
    editorStore.graphManagerState.graph,
    entities,
    editorStore.graphManagerState.graphBuildState,
  );

  // set original hash
  editorStore.changeDetectionState.workspaceLocalLatestRevisionState.setEntityHashesIndex(
    await editorStore.graphManagerState.graphManager.buildHashesIndex(entities),
  );

  // check hash
  await flowResult(editorStore.changeDetectionState.computeLocalChanges(true));
  expect(
    editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes
      .length,
  ).toEqual(0);

  // make some modification and recheck hash
  const _class = editorStore.graphManagerState.graph.getClass('model::ClassA');

  // modify
  property_setName(getClassProperty(_class, 'prop'), 'prop1');

  await flowResult(editorStore.changeDetectionState.computeLocalChanges(true));
  expect(
    editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes
      .length,
  ).toEqual(1);
  let change = editorStore.changeDetectionState
    .workspaceLocalLatestRevisionState.changes[0] as EntityDiff;
  expect(change.entityChangeType).toEqual(EntityChangeType.MODIFY);
  expect(change.oldPath).toEqual(_class.path);
  property_setName(getClassProperty(_class, 'prop1'), 'prop'); // reset

  // add
  const newClass = new Class('ClassB');
  graph_addElement(
    editorStore.graphManagerState.graph,
    newClass,
    undefined,
    editorStore.changeDetectionState.observerContext,
  );

  await flowResult(editorStore.changeDetectionState.computeLocalChanges(true));
  expect(
    editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes
      .length,
  ).toEqual(1);
  change = editorStore.changeDetectionState.workspaceLocalLatestRevisionState
    .changes[0] as EntityDiff;
  expect(change.entityChangeType).toEqual(EntityChangeType.CREATE);
  expect(change.newPath).toEqual(newClass.path);
  graph_deleteElement(editorStore.graphManagerState.graph, newClass); // reset

  // delete
  graph_deleteElement(editorStore.graphManagerState.graph, _class);

  await flowResult(editorStore.changeDetectionState.computeLocalChanges(true));
  expect(
    editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes
      .length,
  ).toEqual(1);
  change = editorStore.changeDetectionState.workspaceLocalLatestRevisionState
    .changes[0] as EntityDiff;
  expect(change.entityChangeType).toEqual(EntityChangeType.DELETE);
  expect(change.oldPath).toEqual(_class.path);
});
