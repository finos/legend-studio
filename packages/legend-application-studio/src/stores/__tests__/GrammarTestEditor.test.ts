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
import { unitTest } from '@finos/legend-shared';
import { TEST__getTestEditorStore } from '../EditorStoreTestUtils.js';

const entities = [
  {
    path: 'model::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firstName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::testFunc_String_1__String_1__String_1_',
    content: {
      _type: 'function',
      body: [
        {
          _type: 'string',
          value: '',
        },
      ],
      name: 'testFunc_String_1__String_1__String_1_',
      package: 'model',
      parameters: [
        {
          _type: 'var',
          class: 'String',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'param1',
        },
        {
          _type: 'var',
          class: 'String',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'param2',
        },
      ],
      postConstraints: [],
      preConstraints: [],
      returnMultiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      returnType: 'String',
      stereotypes: [
        {
          profile: 'meta::pure::profiles::doc',
          value: 'deprecated',
        },
      ],
      taggedValues: [
        {
          tag: {
            profile: 'meta::pure::profiles::doc',
            value: 'doc',
          },
          value: 'test',
        },
      ],
    },
    classifierPath:
      'meta::pure::metamodel::function::ConcreteFunctionDefinition',
  },
];

// NOTE: this should be converted into an end-to-end test
test(unitTest('Test Grammar Element Type Label Regex String'), async () => {
  const editorStore = TEST__getTestEditorStore();

  await editorStore.graphManagerState.initializeSystem();
  await editorStore.graphManagerState.graphManager.buildGraph(
    editorStore.graphManagerState.graph,
    entities,
    editorStore.graphManagerState.graphBuildState,
  );

  const _class = editorStore.graphManagerState.graph.getClass('model::Person');
  const _function = editorStore.graphManagerState.graph.getFunction(
    'model::testFunc_String_1__String_1__String_1_',
  );
  editorStore.grammarTextEditorState.setCurrentElementLabelRegexString(
    _function,
  );
  expect(
    editorStore.grammarTextEditorState.currentElementLabelRegexString,
  ).toBe(
    '^([^\\S\\n])*function(\\s+<<.*>>)?(\\s+\\{.*\\})?\\s+model::testFunc\\(param1: String\\[1\\], param2: String\\[1\\]\\): String\\[1\\][\\s\\n]',
  );
  editorStore.grammarTextEditorState.setCurrentElementLabelRegexString(_class);
  expect(
    editorStore.grammarTextEditorState.currentElementLabelRegexString,
  ).toBe(
    '^([^\\S\\n])*Class(\\s+<<.*>>)?(\\s+\\{.*\\})?\\s+model::Person[\\s\\n]',
  );
});
