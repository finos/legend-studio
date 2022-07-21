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
} from '@finos/legend-studio';
import { DSL_DIAGRAM_TEST_ID } from '../DSLDiagram_TestID.js';
import { DSLDiagram_GraphPreset } from '../../../DSLDiagram_Extension.js';
import { DSLDiagram_LegendStudioApplicationPlugin } from '../DSLDiagram_LegendStudioApplicationPlugin.js';

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
  .usePresets([new DSLDiagram_GraphPreset()])
  .usePlugins([new DSLDiagram_LegendStudioApplicationPlugin()])
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
