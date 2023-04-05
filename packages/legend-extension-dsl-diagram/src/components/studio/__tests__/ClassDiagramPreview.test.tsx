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

import { test } from '@jest/globals';
import { waitFor } from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
  TEST__openElementFromExplorerTree,
  LegendStudioPluginManager,
} from '@finos/legend-application-studio';
import { DSL_DIAGRAM_TEST_ID } from '../../../application/studio/DSL_Diagram_LegendStudioTesting.js';
import { DSL_Diagram_GraphManagerPreset } from '../../../DSL_Diagram_Extension.js';
import { DSL_Diagram_LegendStudioApplicationPlugin } from '../DSL_Diagram_LegendStudioApplicationPlugin.js';

const TEST_DATA__dummyModel = [
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
          name: 'name',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
];

const pluginManager = LegendStudioPluginManager.create();
pluginManager
  .usePresets([new DSL_Diagram_GraphManagerPreset()])
  .usePlugins([new DSL_Diagram_LegendStudioApplicationPlugin()])
  .install();

test(integrationTest('Class diagram preview shows up properly'), async () => {
  const MOCK__editorStore = TEST__provideMockedEditorStore({ pluginManager });
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    MOCK__editorStore,
    {
      entities: TEST_DATA__dummyModel,
    },
  );
  await TEST__openElementFromExplorerTree('model::Person', renderResult);
  await waitFor(() =>
    renderResult.getByTestId(DSL_DIAGRAM_TEST_ID.CLASS_DIAGRAM_PREVIEW),
  );
});

const TEST_DATA__dummyModelWithDiagram = [
  {
    path: 'model::Person',
    content: {
      _type: 'class',
      name: 'Person',
      superTypes: [],
      originalMilestonedProperties: [],
      properties: [
        {
          name: 'firstName',
          type: 'String',
          multiplicity: { lowerBound: 1, upperBound: 1 },
          stereotypes: [],
          taggedValues: [],
        },
      ],
      qualifiedProperties: [],
      stereotypes: [],
      taggedValues: [],
      constraints: [],
      package: 'model',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      superTypes: [],
      originalMilestonedProperties: [],
      properties: [
        {
          name: 'employees',
          type: 'model::Person',
          multiplicity: { lowerBound: 0 },
          stereotypes: [],
          taggedValues: [],
        },
      ],
      qualifiedProperties: [],
      stereotypes: [],
      taggedValues: [],
      constraints: [],
      package: 'model',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::MyDiagram',
    content: {
      _type: 'diagram',
      name: 'MyDiagram',
      classViews: [
        {
          rectangle: { width: 134.32373046875, height: 44.0 },
          position: { x: 705.0, y: 279.0 },
          id: '59da4d7e-9e7a-4a90-812a-96feeed9d6c8',
          class: 'model::Firm',
        },
        {
          rectangle: { width: 124.521484375, height: 44.0 },
          position: { x: 708.0, y: 279.0 },
          id: '6fbb5b43-ad37-43bd-8c62-05b124df7fca',
          class: 'model::Person',
        },
      ],
      propertyViews: [
        {
          sourceView: '59da4d7e-9e7a-4a90-812a-96feeed9d6c8',
          targetView: '6fbb5b43-ad37-43bd-8c62-05b124df7fca',
          line: {
            points: [
              { x: 772.161865234375, y: 301.0 },
              { x: 770.2607421875, y: 301.0 },
            ],
          },
          property: { property: 'employees', class: 'model::Firm' },
        },
      ],
      generalizationViews: [],
      package: 'model',
    },
    classifierPath: 'meta::pure::metamodel::diagram::Diagram',
  },
];

test(integrationTest('Diagram editor shows up properly'), async () => {
  const MOCK__editorStore = TEST__provideMockedEditorStore({ pluginManager });
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    MOCK__editorStore,
    {
      entities: TEST_DATA__dummyModelWithDiagram,
    },
  );
  await TEST__openElementFromExplorerTree('model::MyDiagram', renderResult);
  await waitFor(() =>
    renderResult.getByTestId(DSL_DIAGRAM_TEST_ID.DIAGRAM_EDITOR),
  );
});
