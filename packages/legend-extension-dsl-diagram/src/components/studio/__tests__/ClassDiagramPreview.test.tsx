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
import { integrationTest } from '@finos/legend-shared/test';
import { LegendStudioPluginManager } from '@finos/legend-application-studio';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
  TEST__openElementFromExplorerTree,
} from '@finos/legend-application-studio/test';
import { DSL_DIAGRAM_TEST_ID } from '../../../__lib__/studio/DSL_Diagram_LegendStudioTesting.js';
import { DSL_Diagram_GraphManagerPreset } from '../../../graph-manager/DSL_Diagram_GraphManagerPreset.js';
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
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
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
