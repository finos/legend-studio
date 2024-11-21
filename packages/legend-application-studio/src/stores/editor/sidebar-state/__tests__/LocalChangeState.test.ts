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
import { applyEntityChanges, EntityChange } from '@finos/legend-server-sdlc';
import {
  type TEMPORARY__JestMatcher,
  unitTest,
} from '@finos/legend-shared/test';
import { flowResult } from 'mobx';
import { TEST__getTestEditorStore } from '../../__test-utils__/EditorStoreTestUtils.js';

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

test(unitTest('Apply entity changes'), async () => {
  const changed = applyEntityChanges(
    entities,
    entityChanges.entityChanges.map((e) =>
      EntityChange.serialization.fromJson(e),
    ),
  );
  (expect(changed) as TEMPORARY__JestMatcher).toIncludeSameMembers(
    changedEntities,
  );
});

test(unitTest('Load entity changes'), async () => {
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
  const changes = entityChanges.entityChanges.map((e) =>
    EntityChange.serialization.fromJson(e),
  );
  await flowResult(
    editorStore.graphState.loadEntityChangesToGraph(changes, undefined),
  );
  const graph = editorStore.graphManagerState.graph;
  graph.getClass('model::ToAdd');
  expect(graph.getNullableClass('model::ToDelete')).toBeUndefined();
  const modifiedClass = graph.getClass('model::ToModify');
  expect(modifiedClass.properties).toHaveLength(1);
});
