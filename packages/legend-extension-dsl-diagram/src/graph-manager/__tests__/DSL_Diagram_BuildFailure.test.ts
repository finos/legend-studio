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
import { ActionState } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import { DSL_Diagram_GraphManagerPreset } from '../DSL_Diagram_GraphManagerPreset.js';
import {
  TEST__getTestGraphManagerState,
  TEST__GraphManagerPluginManager,
} from '@finos/legend-graph/test';

const TEST_DATA__MissingClassInDiagram = [
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'ui::test1::Cat',
    content: {
      _type: 'class',
      name: 'Cat',
      package: 'ui::test1',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'fullName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'age',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
      ],
    },
  },
  {
    classifierPath: 'meta::pure::metamodel::diagram::Diagram',
    path: 'ui::test1::testDiagram',
    content: {
      _type: 'diagram',
      classViews: [
        {
          class: 'ui::test1::NotFound',
          id: '2baa3ad1-37b3-434c-89ab-5ad5df455aa1',
          position: {
            x: 771.9999961853027,
            y: 191.9857940673828,
          },
          rectangle: {
            height: 55,
            width: 112.2861328125,
          },
        },
      ],
      generalizationViews: [],
      name: 'testDiagram',
      package: 'ui::test1',
      propertyViews: [],
    },
  },
];

test(unitTest('Missing class in diagram class view'), async () => {
  const pluginManager = new TEST__GraphManagerPluginManager();
  pluginManager.usePresets([new DSL_Diagram_GraphManagerPreset()]).install();
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });
  await graphManagerState.graphManager.buildSystem(
    graphManagerState.coreModel,
    graphManagerState.systemModel,
    ActionState.create(),
  );
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingClassInDiagram as Entity[],
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(`Can't find type 'ui::test1::NotFound'`);
});
