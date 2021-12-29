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

import { EntityChange } from '@finos/legend-server-sdlc';
import { unitTest } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { TEST__getTestEditorStore } from '../../EditorStoreTestUtils';

const entities = [
  {
    path: 'model::ToDelete',
    content: {
      _type: 'class',
      name: 'ToDelete',
      package: 'model',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::ToModify',
    content: {
      _type: 'class',
      name: 'ToModify',
      package: 'model',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
];

const entityChanges = {
  message: '',
  entityChanges: [
    {
      classifierPath: 'meta::pure::metamodel::type::Class',
      entityPath: 'model::ToModify',
      content: {
        _type: 'class',
        name: 'ToModify',
        package: 'model',
        properties: [
          {
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'myNewProperty',
            type: 'String',
          },
        ],
      },
      type: 'MODIFY',
    },
    {
      classifierPath: 'meta::pure::metamodel::type::Class',
      entityPath: 'model::ToAdd',
      content: {
        _type: 'class',
        name: 'ToAdd',
        package: 'model',
      },
      type: 'CREATE',
    },
    {
      type: 'DELETE',
      entityPath: 'model::ToDelete',
    },
  ],
  revisionId: '6eb09ddbfcfe7b88115e9322907c37fa845c44fe',
};

const changedEntities = [
  {
    path: 'model::ToModify',
    content: {
      _type: 'class',
      name: 'ToModify',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'myNewProperty',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::ToAdd',
    content: {
      _type: 'class',
      name: 'ToAdd',
      package: 'model',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
];

test(unitTest('Apply Entity Changes'), async () => {
  const editorStore = TEST__getTestEditorStore();
  const patchLoaderState = editorStore.localChangesState.patchLoaderState;
  const changed = patchLoaderState.applyEntityChanges(
    entities,
    entityChanges.entityChanges.map((e) =>
      EntityChange.serialization.fromJson(e),
    ),
  );
  expect(changed).toIncludeSameMembers(changedEntities);
});

test(unitTest('Load Entity Changes'), async () => {
  const editorStore = TEST__getTestEditorStore();
  await flowResult(editorStore.graphManagerState.initializeSystem());
  await flowResult(
    editorStore.graphManagerState.graphManager.buildGraph(
      editorStore.graphManagerState.graph,
      entities,
    ),
  );
  const changes = entityChanges.entityChanges.map((e) =>
    EntityChange.serialization.fromJson(e),
  );
  await flowResult(editorStore.graphState.loadEntityChangesToGraph(changes));
  const graph = editorStore.graphManagerState.graph;
  graph.getClass('model::ToAdd');
  expect(graph.getNullableClass('model::ToDelete')).toBeUndefined();
  const modifiedClass = graph.getClass('model::ToModify');
  expect(modifiedClass.properties).toHaveLength(1);
});
