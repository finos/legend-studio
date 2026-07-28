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
import { integrationTest, createSpy } from '@finos/legend-shared/test';
import { NetworkClientError } from '@finos/legend-shared';
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
  type QueryTitleDescriptionAISuggestionRequest,
} from '../../stores/LegendQueryApplicationPlugin.js';
import { LEGEND_QUERY_APP_EVENT } from '../../__lib__/LegendQueryEvent.js';

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
      _request: QueryTitleDescriptionAISuggestionRequest,
      _legendAIUrl: string,
    ): Promise<QueryTitleDescriptionSuggestion> => ({
      title: 'AI Generated Title',
      description: 'AI Generated Description',
    });
  }
}

// ---------------------------------------------------------------------------
// Mock plugin whose suggester always fails
// ---------------------------------------------------------------------------
const MOCK_AI_SUGGESTER_ERROR_MESSAGE = 'AI service unavailable';

class MockAISuggesterFailurePlugin extends LegendQueryApplicationPlugin {
  constructor() {
    super('mock-ai-suggester-failure', '0.0.1');
  }

  override install(pluginManager: LegendQueryPluginManager): void {
    pluginManager.registerApplicationPlugin(this);
  }

  override getExtraQueryTitleDescriptionAISuggester() {
    return async (
      _request: QueryTitleDescriptionAISuggestionRequest,
      _legendAIUrl: string,
    ): Promise<QueryTitleDescriptionSuggestion> => {
      throw new Error(MOCK_AI_SUGGESTER_ERROR_MESSAGE);
    };
  }
}

// ---------------------------------------------------------------------------
// Mock plugin whose suggester fails with a 401 NetworkClientError
// ---------------------------------------------------------------------------
class MockAISuggester401FailurePlugin extends LegendQueryApplicationPlugin {
  constructor() {
    super('mock-ai-suggester-401-failure', '0.0.1');
  }

  override install(pluginManager: LegendQueryPluginManager): void {
    pluginManager.registerApplicationPlugin(this);
  }

  override getExtraQueryTitleDescriptionAISuggester() {
    return async (
      _request: QueryTitleDescriptionAISuggestionRequest,
      _legendAIUrl: string,
    ): Promise<QueryTitleDescriptionSuggestion> => {
      throw new NetworkClientError(
        { status: 401, statusText: 'Unauthorized' } as Response,
        undefined,
      );
    };
  }
}

// ---------------------------------------------------------------------------
// Mock plugin whose suggester fails with a 403 NetworkClientError
// ---------------------------------------------------------------------------
class MockAISuggester403FailurePlugin extends LegendQueryApplicationPlugin {
  constructor() {
    super('mock-ai-suggester-403-failure', '0.0.1');
  }

  override install(pluginManager: LegendQueryPluginManager): void {
    pluginManager.registerApplicationPlugin(this);
  }

  override getExtraQueryTitleDescriptionAISuggester() {
    return async (
      _request: QueryTitleDescriptionAISuggestionRequest,
      _legendAIUrl: string,
    ): Promise<QueryTitleDescriptionSuggestion> => {
      throw new NetworkClientError(
        { status: 403, statusText: 'Forbidden' } as Response,
        undefined,
      );
    };
  }
}

// ---------------------------------------------------------------------------
// Tests — AI suggestion for Save (Rename) Query dialog
// ---------------------------------------------------------------------------

test(
  integrationTest(
    'Suggest with AI button is visible in Rename dialog when legendAIUrl is configured and a plugin is registered',
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

    // Mock searchQueries to prevent URL errors from debounced search
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'searchQueries',
    ).mockResolvedValue([]);

    // Open the Rename Query dialog
    await act(async () => {
      mockedEditorStore.updateState.setIsQueryRenameDialogOpen(true);
    });

    const dialog = await waitFor(() => renderResult.getByRole('dialog'));
    expect(
      dialog.querySelector('.query-editor__ai-suggest-btn'),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Suggest with AI button is NOT visible in Rename dialog when legendAIUrl is not configured',
  ),
  async () => {
    const mockedEditorStore = TEST__provideMockedQueryEditorStore();

    const { renderResult } = await TEST__setUpQueryEditor(
      mockedEditorStore,
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );

    // Mock searchQueries to prevent URL errors from debounced search
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'searchQueries',
    ).mockResolvedValue([]);

    // Open the Rename Query dialog
    await act(async () => {
      mockedEditorStore.updateState.setIsQueryRenameDialogOpen(true);
    });

    const dialog = await waitFor(() => renderResult.getByRole('dialog'));
    expect(dialog.querySelector('.query-editor__ai-suggest-btn')).toBeNull();
  },
);

test(
  integrationTest(
    'Clicking Suggest with AI in Rename dialog fills inputs inline with AI suggestion and shows Apply/Dismiss buttons',
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

    const { renderResult, queryBuilderState } = await TEST__setUpQueryEditor(
      mockedEditorStore,
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );

    // Set up source element so buildQuery() works
    const _modelClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeSourceElement(_modelClass);
    });

    // Mock lambdaToPureCode (called by buildAISuggestionRequest)
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'lambdaToPureCode',
    ).mockResolvedValue('|test::query');

    // Mock valueSpecificationToPureCode (called for parameter values)
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'valueSpecificationToPureCode',
    ).mockResolvedValue("'test'");

    // Mock searchQueries to prevent URL errors from debounced search
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'searchQueries',
    ).mockResolvedValue([]);

    // Open the Rename Query dialog
    await act(async () => {
      mockedEditorStore.updateState.setIsQueryRenameDialogOpen(true);
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
      expect((inputs[1] as HTMLTextAreaElement).value).toBe(
        'AI Generated Description',
      );
      expect(renderResult.getByText('Apply Suggestion')).not.toBeNull();
      expect(renderResult.getByText('Dismiss')).not.toBeNull();
    });
  },
);

test(
  integrationTest(
    'Accepting the AI suggestion in Rename dialog fills name and description fields',
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

    const { renderResult, queryBuilderState } = await TEST__setUpQueryEditor(
      mockedEditorStore,
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );

    // Set up source element so buildQuery() works
    const _modelClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeSourceElement(_modelClass);
    });

    // Mock lambdaToPureCode (called by buildAISuggestionRequest)
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'lambdaToPureCode',
    ).mockResolvedValue('|test::query');

    // Mock valueSpecificationToPureCode (called for parameter values)
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'valueSpecificationToPureCode',
    ).mockResolvedValue("'test'");

    // Mock searchQueries to prevent URL errors from debounced search
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'searchQueries',
    ).mockResolvedValue([]);

    // Open the Rename Query dialog
    await act(async () => {
      mockedEditorStore.updateState.setIsQueryRenameDialogOpen(true);
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

    // Inline suggestion state should be cleared and fields committed
    await waitFor(() => {
      expect(
        dialog.querySelector('.query-editor__ai-suggestion-badge'),
      ).toBeNull();
      expect(dialog.querySelectorAll('.input--ai-suggested')).toHaveLength(0);
      // After applying, the input should show the AI-suggested title
      const nameInput = dialog.querySelector(
        'input[title="Query Name"]',
      ) as HTMLInputElement;
      expect(nameInput.value).toBe('AI Generated Title');
      const descInput = dialog.querySelector(
        'textarea[title="Query Description"]',
      ) as HTMLTextAreaElement;
      expect(descInput.value).toBe('AI Generated Description');
    });
  },
);

test(
  integrationTest(
    'Dismissing the AI suggestion in Rename dialog restores original values',
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

    const { renderResult, queryBuilderState } = await TEST__setUpQueryEditor(
      mockedEditorStore,
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );

    // Set up source element so buildQuery() works
    const _modelClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeSourceElement(_modelClass);
    });

    // Mock lambdaToPureCode (called by buildAISuggestionRequest)
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'lambdaToPureCode',
    ).mockResolvedValue('|test::query');

    // Mock valueSpecificationToPureCode (called for parameter values)
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'valueSpecificationToPureCode',
    ).mockResolvedValue("'test'");

    // Mock searchQueries to prevent URL errors from debounced search
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'searchQueries',
    ).mockResolvedValue([]);

    // Open the Rename Query dialog
    await act(async () => {
      mockedEditorStore.updateState.setIsQueryRenameDialogOpen(true);
    });

    const dialog = await waitFor(() => renderResult.getByRole('dialog'));

    // Capture original name from lightQuery
    const originalName = mockedEditorStore.lightQuery.name;

    // Suggest
    const suggestBtn = dialog.querySelector(
      '.query-editor__ai-suggest-btn',
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(suggestBtn);
    });

    // Wait for suggestion to appear
    await waitFor(() => {
      expect(
        dialog.querySelector('.query-editor__ai-suggestion-badge'),
      ).not.toBeNull();
    });

    // Dismiss suggestion
    const dismissBtn = renderResult.getByText('Dismiss');
    await act(async () => {
      fireEvent.click(dismissBtn);
    });

    // Suggestion state should be cleared and original values restored
    await waitFor(() => {
      expect(
        dialog.querySelector('.query-editor__ai-suggestion-badge'),
      ).toBeNull();
      expect(dialog.querySelectorAll('.input--ai-suggested')).toHaveLength(0);
      const nameInput = dialog.querySelector(
        'input[title="Query Name"]',
      ) as HTMLInputElement;
      expect(nameInput.value).toBe(originalName);
      // The AI suggest button should reappear
      expect(
        dialog.querySelector('.query-editor__ai-suggest-btn'),
      ).not.toBeNull();
    });
  },
);

test(
  integrationTest(
    'Failure of the AI suggestion in Rename dialog is logged via telemetry',
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
      extraPlugins: [new MockAISuggesterFailurePlugin()],
    });

    const { renderResult, queryBuilderState } = await TEST__setUpQueryEditor(
      mockedEditorStore,
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );

    // Set up source element so buildQuery() works
    const _modelClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeSourceElement(_modelClass);
    });

    // Mock lambdaToPureCode (called by buildAISuggestionRequest)
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'lambdaToPureCode',
    ).mockResolvedValue('|test::query');

    // Mock valueSpecificationToPureCode (called for parameter values)
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'valueSpecificationToPureCode',
    ).mockResolvedValue("'test'");

    // Mock searchQueries to prevent URL errors from debounced search
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'searchQueries',
    ).mockResolvedValue([]);

    // Spy on telemetry
    const logEventSpy = createSpy(
      applicationStore.telemetryService,
      'logEvent',
    );

    // Open the Rename Query dialog
    await act(async () => {
      mockedEditorStore.updateState.setIsQueryRenameDialogOpen(true);
    });

    const dialog = await waitFor(() => renderResult.getByRole('dialog'));

    // Click the AI suggest button (which will fail)
    const suggestBtn = dialog.querySelector(
      '.query-editor__ai-suggest-btn',
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(suggestBtn);
    });

    // Failure telemetry should be logged with the error message
    await waitFor(() => {
      expect(logEventSpy).toHaveBeenCalledWith(
        LEGEND_QUERY_APP_EVENT.LEGENDAI_QUERY_SUGGEST__FAILURE,
        { errorMessage: MOCK_AI_SUGGESTER_ERROR_MESSAGE },
      );
    });
  },
);

test(
  integrationTest(
    'AI suggestion 401 failure appends entitlement documentation URL to error message',
  ),
  async () => {
    const MOCK_DOC_URL = 'https://docs.example.com/entitlements';

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
      extraPlugins: [new MockAISuggester401FailurePlugin()],
    });

    const { renderResult, queryBuilderState } = await TEST__setUpQueryEditor(
      mockedEditorStore,
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );

    // Set up source element so buildQuery() works
    const _modelClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeSourceElement(_modelClass);
    });

    // Mock lambdaToPureCode (called by buildAISuggestionRequest)
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'lambdaToPureCode',
    ).mockResolvedValue('|test::query');

    // Mock valueSpecificationToPureCode (called for parameter values)
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'valueSpecificationToPureCode',
    ).mockResolvedValue("'test'");

    // Mock searchQueries to prevent URL errors from debounced search
    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'searchQueries',
    ).mockResolvedValue([]);

    // Mock documentationService to return a doc entry with a URL
    createSpy(
      applicationStore.documentationService,
      'getDocEntry',
    ).mockReturnValue({
      key: 'legend-ai.how-to-get-entitlements',
      url: MOCK_DOC_URL,
    });

    // Spy on notificationService to verify the enriched error message
    const notifySpy = createSpy(
      applicationStore.notificationService,
      'notifyIllegalState',
    );

    // Open the Rename Query dialog
    await act(async () => {
      mockedEditorStore.updateState.setIsQueryRenameDialogOpen(true);
    });

    const dialog = await waitFor(() => renderResult.getByRole('dialog'));

    // Click the AI suggest button (which will fail with 401)
    const suggestBtn = dialog.querySelector(
      '.query-editor__ai-suggest-btn',
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(suggestBtn);
    });

    // The error message shown to the user should include the documentation URL
    await waitFor(() => {
      expect(notifySpy).toHaveBeenCalledWith(
        expect.stringContaining(MOCK_DOC_URL),
      );
    });
  },
);

test(
  integrationTest(
    'AI suggestion 403 failure appends entitlement documentation URL to error message',
  ),
  async () => {
    const MOCK_DOC_URL = 'https://docs.example.com/entitlements';

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
      extraPlugins: [new MockAISuggester403FailurePlugin()],
    });

    const { renderResult, queryBuilderState } = await TEST__setUpQueryEditor(
      mockedEditorStore,
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );

    const _modelClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeSourceElement(_modelClass);
    });

    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'lambdaToPureCode',
    ).mockResolvedValue('|test::query');

    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'valueSpecificationToPureCode',
    ).mockResolvedValue("'test'");

    createSpy(
      mockedEditorStore.graphManagerState.graphManager,
      'searchQueries',
    ).mockResolvedValue([]);

    createSpy(
      applicationStore.documentationService,
      'getDocEntry',
    ).mockReturnValue({
      key: 'legend-ai.how-to-get-entitlements',
      url: MOCK_DOC_URL,
    });

    const notifySpy = createSpy(
      applicationStore.notificationService,
      'notifyIllegalState',
    );

    await act(async () => {
      mockedEditorStore.updateState.setIsQueryRenameDialogOpen(true);
    });

    const dialog = await waitFor(() => renderResult.getByRole('dialog'));

    const suggestBtn = dialog.querySelector(
      '.query-editor__ai-suggest-btn',
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(suggestBtn);
    });

    await waitFor(() => {
      expect(notifySpy).toHaveBeenCalledWith(
        expect.stringContaining(MOCK_DOC_URL),
      );
    });
  },
);
