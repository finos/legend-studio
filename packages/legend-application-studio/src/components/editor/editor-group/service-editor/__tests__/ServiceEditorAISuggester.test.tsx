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
import { act, fireEvent, getByText, waitFor } from '@testing-library/react';
import { integrationTest, createSpy } from '@finos/legend-shared/test';
import { ApplicationStore } from '@finos/legend-application';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import { TEST_DATA__serviceEntities } from './TEST_DATA__ServiceEditor.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import { LegendStudioPluginManager } from '../../../../../application/LegendStudioPluginManager.js';
import { LegendStudioApplicationPlugin } from '../../../../../stores/LegendStudioApplicationPlugin.js';
import type {
  DSL_Service_LegendStudioApplicationPlugin_Extension,
  ServiceDocumentationAISuggester,
} from '../../../../../stores/extensions/DSL_Service_LegendStudioApplicationPlugin_Extension.js';
import { TEST__getLegendStudioApplicationConfig } from '../../../../../stores/__test-utils__/LegendStudioApplicationTestUtils.js';
import { ServiceEditorState } from '../../../../../stores/editor/editor-state/element-editor-state/service/ServiceEditorState.js';

// ---------------------------------------------------------------------------
// Minimal mock plugin that returns a fixed documentation suggestion
// ---------------------------------------------------------------------------
class MockAIDocSuggesterPlugin
  extends LegendStudioApplicationPlugin
  implements DSL_Service_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super('mock-ai-doc-suggester', '0.0.1');
  }

  override install(pluginManager: LegendStudioPluginManager): void {
    pluginManager.registerApplicationPlugin(this);
  }

  getExtraServiceDocumentationAISuggester(): ServiceDocumentationAISuggester {
    return async (
      _serviceGrammar: string,
      _legendAIUrl: string,
    ): Promise<string> => 'AI Generated Documentation';
  }
}

// ---------------------------------------------------------------------------
// Shared setup helper
// ---------------------------------------------------------------------------
const setupEditorWithAI = async (withAIConfig = true) => {
  const pluginManager = LegendStudioPluginManager.create();
  const applicationStore = new ApplicationStore(
    TEST__getLegendStudioApplicationConfig(
      withAIConfig ? { legendAI: { url: 'http://ai.example.com' } } : {},
    ),
    pluginManager,
  );

  const editorStore = TEST__provideMockedEditorStore({
    pluginManager,
    applicationStore,
  });

  if (withAIConfig) {
    new MockAIDocSuggesterPlugin().install(pluginManager);
  }

  MockedMonacoEditorInstance.getValue.mockReturnValue('');

  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(editorStore, {
    entities: TEST_DATA__serviceEntities,
  });

  await TEST__openElementFromExplorerTree(
    'model::RelationalService',
    renderResult,
  );

  const editorGroup = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
  );

  // Mock elementsToPureCode to prevent real network calls in AI suggestion flow
  createSpy(
    editorStore.graphManagerState.graphManager,
    'elementsToPureCode',
  ).mockResolvedValue('Service model::RelationalService {}');

  // Navigate to the General tab
  fireEvent.click(getByText(editorGroup, 'General'));

  return { editorGroup, renderResult, editorStore };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test(
  integrationTest(
    '"Suggest with AI" button is visible when legendAIUrl is configured and a plugin is registered',
  ),
  async () => {
    const { editorGroup } = await setupEditorWithAI(true);

    await waitFor(() => {
      expect(
        editorGroup.querySelector('.service-editor__ai-suggest-btn'),
      ).not.toBeNull();
    });
  },
);

test(
  integrationTest(
    '"Suggest with AI" button is NOT visible when legendAIUrl is not configured',
  ),
  async () => {
    const { editorGroup } = await setupEditorWithAI(false);

    await waitFor(() => {
      expect(
        editorGroup.querySelector('.service-editor__ai-suggest-btn'),
      ).toBeNull();
    });
  },
);

test(
  integrationTest(
    'Clicking "Suggest with AI" fills the documentation textarea inline and shows Apply/Dismiss',
  ),
  async () => {
    const { editorGroup } = await setupEditorWithAI(true);

    const suggestBtn = await waitFor(
      () =>
        editorGroup.querySelector(
          '.service-editor__ai-suggest-btn',
        ) as HTMLButtonElement,
    );

    await act(async () => {
      fireEvent.click(suggestBtn);
    });

    await waitFor(() => {
      // AI suggestion badge replaces the button
      expect(
        editorGroup.querySelector('.service-editor__ai-suggestion-badge'),
      ).not.toBeNull();

      // Textarea shows suggested text with ai-suggested styling
      const textarea = editorGroup.querySelector(
        '.textarea--ai-suggested',
      ) as HTMLTextAreaElement;
      expect(textarea).not.toBeNull();
      expect(textarea.value).toBe('AI Generated Documentation');

      // Apply / Dismiss actions are shown
      expect(
        editorGroup.querySelector('.service-editor__ai-suggestion__actions'),
      ).not.toBeNull();
    });
  },
);

test(
  integrationTest(
    'Clicking "Apply Suggestion" commits the documentation to the service model',
  ),
  async () => {
    const { editorGroup, editorStore } = await setupEditorWithAI(true);

    const suggestBtn = await waitFor(
      () =>
        editorGroup.querySelector(
          '.service-editor__ai-suggest-btn',
        ) as HTMLButtonElement,
    );

    await act(async () => {
      fireEvent.click(suggestBtn);
    });

    const applyBtn = await waitFor(
      () =>
        editorGroup.querySelector(
          '.service-editor__ai-suggestion__apply-btn',
        ) as HTMLButtonElement,
    );

    await act(async () => {
      fireEvent.click(applyBtn);
    });

    await waitFor(() => {
      // Inline suggestion state cleared
      expect(
        editorGroup.querySelector('.service-editor__ai-suggestion-badge'),
      ).toBeNull();
      expect(editorGroup.querySelector('.textarea--ai-suggested')).toBeNull();

      // Documentation committed to the service model
      const serviceState =
        editorStore.tabManagerState.getCurrentEditorState(ServiceEditorState);
      expect(serviceState.service.documentation).toBe(
        'AI Generated Documentation',
      );
    });
  },
);

test(
  integrationTest(
    'Clicking "Dismiss" clears the inline suggestion without applying it',
  ),
  async () => {
    const { editorGroup } = await setupEditorWithAI(true);

    const suggestBtn = await waitFor(
      () =>
        editorGroup.querySelector(
          '.service-editor__ai-suggest-btn',
        ) as HTMLButtonElement,
    );

    await act(async () => {
      fireEvent.click(suggestBtn);
    });

    // Suggestion is showing
    await waitFor(() => {
      expect(
        editorGroup.querySelector('.textarea--ai-suggested'),
      ).not.toBeNull();
    });

    const dismissBtn = await waitFor(
      () =>
        editorGroup.querySelector(
          '.service-editor__ai-suggestion__dismiss-btn',
        ) as HTMLButtonElement,
    );

    await act(async () => {
      fireEvent.click(dismissBtn);
    });

    await waitFor(() => {
      // Suggestion cleared — badge and styled textarea gone
      expect(
        editorGroup.querySelector('.service-editor__ai-suggestion-badge'),
      ).toBeNull();
      expect(editorGroup.querySelector('.textarea--ai-suggested')).toBeNull();

      // "Suggest with AI" button returns
      expect(
        editorGroup.querySelector('.service-editor__ai-suggest-btn'),
      ).not.toBeNull();
    });
  },
);
