/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import { fireEvent, getByTitle, waitFor } from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import { LegendStudioPluginManager } from '@finos/legend-application-studio';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
  TEST__openElementFromExplorerTree,
} from '@finos/legend-application-studio/test';
import {
  DIAGRAM_INTERACTION_MODE,
  DSL_Diagram_GraphManagerPreset,
} from '@finos/legend-extension-dsl-diagram';
import { DSL_DIAGRAM_TEST_ID } from '../../__lib__/DSL_Diagram_LegendStudioTesting.js';
import { DSL_Diagram_LegendStudioApplicationPlugin } from '../DSL_Diagram_LegendStudioApplicationPlugin.js';
import { DiagramEditorState } from '../../stores/DiagramEditorState.js';

const TEST_DATA__diagramModel = [
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
  {
    path: 'model::PersonDiagram',
    content: {
      _type: 'diagram',
      name: 'PersonDiagram',
      package: 'model',
      classViews: [
        {
          class: 'model::Person',
          id: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
          position: {
            x: 100,
            y: 100,
          },
          rectangle: {
            height: 44,
            width: 120,
          },
        },
      ],
      generalizationViews: [],
      propertyViews: [],
    },
    classifierPath: 'meta::pure::metamodel::diagram::Diagram',
  },
];

const pluginManager = LegendStudioPluginManager.create();
pluginManager
  .usePresets([new DSL_Diagram_GraphManagerPreset()])
  .usePlugins([new DSL_Diagram_LegendStudioApplicationPlugin()])
  .install();

test(
  integrationTest(
    'Diagram editor view, pan, and zoom tools are usable in read-only mode',
  ),
  async () => {
    const MOCK__editorStore = TEST__provideMockedEditorStore({ pluginManager });
    const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      MOCK__editorStore,
      {
        entities: TEST_DATA__diagramModel,
      },
      true,
    );
    await TEST__openElementFromExplorerTree(
      'model::PersonDiagram',
      renderResult,
    );
    await waitFor(() =>
      renderResult.getByTestId(DSL_DIAGRAM_TEST_ID.DIAGRAM_EDITOR),
    );

    const diagramEditorState =
      MOCK__editorStore.tabManagerState.getCurrentEditorState(
        DiagramEditorState,
      );
    expect(diagramEditorState.isReadOnly).toBe(true);
    await waitFor(() =>
      expect(diagramEditorState.isDiagramRendererInitialized).toBe(true),
    );
    const renderer = diagramEditorState.renderer;
    const toolPanel = renderResult.container.querySelector(
      '.diagram-editor__tools',
    ) as HTMLElement;

    // viewing tools should switch the interaction mode
    fireEvent.click(getByTitle(toolPanel, 'Pan Tool (M)'));
    expect(renderer.interactionMode).toBe(DIAGRAM_INTERACTION_MODE.PAN);
    fireEvent.click(getByTitle(toolPanel, 'Zoom In (Z)'));
    expect(renderer.interactionMode).toBe(DIAGRAM_INTERACTION_MODE.ZOOM_IN);
    fireEvent.click(getByTitle(toolPanel, 'Zoom Out (Z)'));
    expect(renderer.interactionMode).toBe(DIAGRAM_INTERACTION_MODE.ZOOM_OUT);
    fireEvent.click(getByTitle(toolPanel, 'View Tool (V)'));
    expect(renderer.interactionMode).toBe(DIAGRAM_INTERACTION_MODE.LAYOUT);

    // editing tools should remain disabled
    expect(getByTitle(toolPanel, 'Property Tool (P)')).toHaveProperty(
      'disabled',
      true,
    );
    expect(getByTitle(toolPanel, 'Inheritance Tool (I)')).toHaveProperty(
      'disabled',
      true,
    );
    expect(getByTitle(toolPanel, 'Add class tool (C)')).toHaveProperty(
      'disabled',
      true,
    );
  },
);
