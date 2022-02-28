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

import { unitTest } from '@finos/legend-shared';
import { TEST__getTestEditorStore } from '../EditorStoreTestUtils';
import { flowResult } from 'mobx';
import { type EntityDiff, EntityChangeType } from '@finos/legend-server-sdlc';
import { Class } from '@finos/legend-graph';

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
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
];

test(unitTest('Change detection works properly'), async () => {
  const editorStore = TEST__getTestEditorStore();

  await flowResult(editorStore.graphManagerState.initializeSystem());
  await flowResult(
    editorStore.graphManagerState.graphManager.buildGraph(
      editorStore.graphManagerState.graph,
      entities,
    ),
  );

  // set original hash
  const protocolHashesIndex =
    await editorStore.graphManagerState.graphManager.buildHashesIndex(entities);
  editorStore.changeDetectionState.workspaceLocalLatestRevisionState.setEntityHashesIndex(
    protocolHashesIndex,
  );

  // check hash
  await flowResult(editorStore.graphManagerState.precomputeHashes());
  await flowResult(editorStore.changeDetectionState.computeLocalChanges(true));
  expect(
    editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes
      .length,
  ).toEqual(0);

  // make some modification and recheck hash
  const _class = editorStore.graphManagerState.graph.getClass('model::ClassA');

  // modify
  _class.getProperty('prop').setName('prop1');

  await flowResult(editorStore.graphManagerState.precomputeHashes());
  await flowResult(editorStore.changeDetectionState.computeLocalChanges(true));
  expect(
    editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes
      .length,
  ).toEqual(1);
  let change = editorStore.changeDetectionState
    .workspaceLocalLatestRevisionState.changes[0] as EntityDiff;
  expect(change.entityChangeType).toEqual(EntityChangeType.MODIFY);
  expect(change.oldPath).toEqual(_class.path);
  _class.getProperty('prop1').setName('prop'); // reset

  // add
  const newClass = new Class('ClassB');
  editorStore.graphManagerState.graph.addElement(newClass);

  await flowResult(editorStore.graphManagerState.precomputeHashes());
  await flowResult(editorStore.changeDetectionState.computeLocalChanges(true));
  expect(
    editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes
      .length,
  ).toEqual(1);
  change = editorStore.changeDetectionState.workspaceLocalLatestRevisionState
    .changes[0] as EntityDiff;
  expect(change.entityChangeType).toEqual(EntityChangeType.CREATE);
  expect(change.newPath).toEqual(newClass.path);
  editorStore.graphManagerState.graph.deleteElement(newClass); // reset

  // delete
  editorStore.graphManagerState.graph.deleteElement(_class);

  await flowResult(editorStore.graphManagerState.precomputeHashes());
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
