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
import type { Entity } from '@finos/legend-model-storage';
import { DSLDiagram_GraphPreset } from '../../DSLDiagram_Extension';
import {
  TEST__getTestGraphManagerState,
  TEST__GraphPluginManager,
} from '@finos/legend-graph';

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
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'age',
          type: 'Integer',
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
  const pluginManager = new TEST__GraphPluginManager();
  pluginManager.usePresets([new DSLDiagram_GraphPreset()]).install();
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager);

  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingClassInDiagram as Entity[],
    ),
  ).rejects.toThrowError(`Can't find type 'ui::test1::NotFound'`);
});
