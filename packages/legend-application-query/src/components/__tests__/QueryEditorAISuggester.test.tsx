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
import { integrationTest } from '@finos/legend-shared/test';
import { stub_RawLambda } from '@finos/legend-graph';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { ApplicationStore } from '@finos/legend-application';
import {
  TEST__provideMockedQueryEditorStore,
  TEST__setUpQueryEditor,
} from '../__test-utils__/QueryEditorComponentTestUtils.js';
import {
  TEST_DATA__ResultState_entities,
  TEST_DATA__modelCoverageAnalysisResult,
} from './TEST_DATA__QueryBuilder_ResultStateTest.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../../stores/__test-utils__/LegendQueryApplicationTestUtils.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import {
  LegendQueryApplicationPlugin,
  type QueryTitleDescriptionSuggestion,
} from '../../stores/LegendQueryApplicationPlugin.js';
import type { QueryBuilderState } from '@finos/legend-query-builder';

// ---------------------------------------------------------------------------
// Minimal mock plugin that returns a fixed suggestion instantly
// ---------------------------------------------------------------------------
class MockAISuggesterPlugin extends LegendQueryApplicationPlugin {
  constructor() {
    super('mock-ai-suggester', '0.0.1');
  }

  override install(pluginManager: LegendQueryPluginManager): void {
    pluginManager.registerApplicationPlugin(this);
  }

  override getExtraQueryTitleDescriptionAISuggester() {
    return async (
      _queryBuilderState: QueryBuilderState,
      _legendAIUrl: string,
    ): Promise<QueryTitleDescriptionSuggestion> => ({
      title: 'AI Generated Title',
      description: 'AI Generated Description',
    });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test(
  integrationTest(
    'Suggest with AI button is visible when legendAIUrl is configured and a plugin is registered',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    const applicationStore = new ApplicationStore(
      TEST__getTestLegendQueryApplicationConfig({
        legendAI: { url: 'http://ai.example.com' },
      }),
      pluginManager,
    );

    const mockedEditorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
      applicationStore,
      extraPlugins: [new MockAISuggesterPlugin()],
    });

    const { renderResult } = await TEST__setUpQueryEditor(
      mockedEditorStore,
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );

    // Open the Create Query dialog
    await act(async () => {
      mockedEditorStore.queryCreatorState.open();
    });

    const dialog = await waitFor(() => renderResult.getByRole('dialog'));
    expect(
      dialog.querySelector('.query-editor__ai-suggest-btn'),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Suggest with AI button is NOT visible when legendAIUrl is not configured',
  ),
  async () => {
    // Default config has no legendAI.url
    const mockedEditorStore = TEST__provideMockedQueryEditorStore();

    const { renderResult } = await TEST__setUpQueryEditor(
      mockedEditorStore,
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );

    await act(async () => {
      mockedEditorStore.queryCreatorState.open();
    });

    const dialog = await waitFor(() => renderResult.getByRole('dialog'));
    expect(dialog.querySelector('.query-editor__ai-suggest-btn')).toBeNull();
  },
);

test(
  integrationTest(
    'Clicking Suggest with AI fills inputs inline with AI suggestion and shows Apply/Dismiss buttons',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    const applicationStore = new ApplicationStore(
      TEST__getTestLegendQueryApplicationConfig({
        legendAI: { url: 'http://ai.example.com' },
      }),
      pluginManager,
    );

    const mockedEditorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
      applicationStore,
      extraPlugins: [new MockAISuggesterPlugin()],
    });

    const { renderResult } = await TEST__setUpQueryEditor(
      mockedEditorStore,
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );

    await act(async () => {
      mockedEditorStore.queryCreatorState.open();
    });

    const dialog = await waitFor(() => renderResult.getByRole('dialog'));

    // Click the AI suggest button
    const suggestBtn = dialog.querySelector(
      '.query-editor__ai-suggest-btn',
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(suggestBtn);
    });

    // Inputs should be filled inline with AI values and styled as suggestions
    await waitFor(() => {
      expect(
        dialog.querySelector('.query-editor__ai-suggestion-badge'),
      ).not.toBeNull();
      const inputs = dialog.querySelectorAll('.input--ai-suggested');
      expect(inputs).toHaveLength(2);
      expect((inputs[0] as HTMLInputElement).value).toBe('AI Generated Title');
      expect((inputs[1] as HTMLInputElement).value).toBe(
        'AI Generated Description',
      );
      expect(renderResult.getByText('Apply Suggestion')).not.toBeNull();
      expect(renderResult.getByText('Dismiss')).not.toBeNull();
    });
  },
);

test(
  integrationTest(
    'Accepting the AI suggestion fills name and description fields',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    const applicationStore = new ApplicationStore(
      TEST__getTestLegendQueryApplicationConfig({
        legendAI: { url: 'http://ai.example.com' },
      }),
      pluginManager,
    );

    const mockedEditorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
      applicationStore,
      extraPlugins: [new MockAISuggesterPlugin()],
    });

    const { renderResult } = await TEST__setUpQueryEditor(
      mockedEditorStore,
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );

    await act(async () => {
      mockedEditorStore.queryCreatorState.open();
    });

    const dialog = await waitFor(() => renderResult.getByRole('dialog'));

    // Suggest
    const suggestBtn = dialog.querySelector(
      '.query-editor__ai-suggest-btn',
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(suggestBtn);
    });

    // Apply suggestion
    const applyBtn = await waitFor(() =>
      renderResult.getByText('Apply Suggestion'),
    );
    await act(async () => {
      fireEvent.click(applyBtn);
    });

    // Inline suggestion state should be cleared and fields committed to store
    await waitFor(() => {
      expect(
        dialog.querySelector('.query-editor__ai-suggestion-badge'),
      ).toBeNull();
      expect(dialog.querySelectorAll('.input--ai-suggested')).toHaveLength(0);
      expect(mockedEditorStore.queryCreatorState.queryName).toBe(
        'AI Generated Title',
      );
      expect(mockedEditorStore.queryCreatorState.queryDescription).toBe(
        'AI Generated Description',
      );
    });
  },
);
