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

import { test, expect, jest } from '@jest/globals';
import {
  act,
  findByText,
  fireEvent,
  getByText,
  waitFor,
} from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import { ApplicationStore } from '@finos/legend-application';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import TEST_DATA__LHDataProduct from './TEST_DATA__LHDataProduct.json' with { type: 'json' };
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import { LegendStudioPluginManager } from '../../../../../application/LegendStudioPluginManager.js';
import { LegendStudioApplicationPlugin } from '../../../../../stores/LegendStudioApplicationPlugin.js';
import type {
  DSL_DataProduct_LegendStudioApplicationPlugin_Extension,
  DataProductDocRequest,
  DataProductDocResponse,
} from '../../../../../stores/extensions/DSL_DataProduct_LegendStudioApplicationPlugin_Extension.js';
import { TEST__getLegendStudioApplicationConfig } from '../../../../../stores/__test-utils__/LegendStudioApplicationTestUtils.js';
import { Core_GraphManagerPreset } from '@finos/legend-graph';
import { QueryBuilder_GraphManagerPreset } from '@finos/legend-query-builder';
import { guaranteeNonNullable } from '@finos/legend-shared';

// ---------------------------------------------------------------------------
// Global mocks
// ---------------------------------------------------------------------------
jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

// ---------------------------------------------------------------------------
// Mock AI suggestion response
// ---------------------------------------------------------------------------
const MOCK_AI_SUGGESTION: DataProductDocResponse = {
  data_product: {
    title: 'AI Suggested Title',
    description: 'AI Suggested Description',
    confidence: 0.95,
  },
  access_point_groups: [
    {
      name: 'group1',
      title: 'AI Group 1 Title',
      description: 'AI Group 1 Description',
      confidence: 0.9,
    },
    {
      name: 'group2',
      title: 'AI Group 2 Title',
      description: 'AI Group 2 Description',
      confidence: 0.85,
    },
  ],
  access_points: [
    {
      group: 'group1',
      name: 'ap1',
      title: 'AI AP1 Title',
      description: 'AI AP1 Description',
      confidence: 0.88,
    },
    {
      group: 'group2',
      name: 'ap2',
      title: 'AI AP2 Title',
      description: 'AI AP2 Description',
      confidence: 0.82,
    },
  ],
};

// ---------------------------------------------------------------------------
// Mock plugin implementing the AI doc suggestion extension
// ---------------------------------------------------------------------------
class MockDataProductAIDocPlugin
  extends LegendStudioApplicationPlugin
  implements DSL_DataProduct_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super('mock-data-product-ai-doc-suggester', '0.0.1');
  }

  override install(pluginManager: LegendStudioPluginManager): void {
    pluginManager.registerApplicationPlugin(this);
  }

  getExtraDataProductDocumentationAISuggester(
    _request: DataProductDocRequest,
    _legendAIUrl: string,
  ): Promise<DataProductDocResponse> {
    return Promise.resolve(MOCK_AI_SUGGESTION);
  }
}

// ---------------------------------------------------------------------------
// Mock plugin that always throws (simulates a permission/network error)
// ---------------------------------------------------------------------------
class MockFailingDataProductAIDocPlugin
  extends LegendStudioApplicationPlugin
  implements DSL_DataProduct_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super('mock-failing-data-product-ai-doc-suggester', '0.0.1');
  }

  override install(pluginManager: LegendStudioPluginManager): void {
    pluginManager.registerApplicationPlugin(this);
  }

  getExtraDataProductDocumentationAISuggester(
    _request: DataProductDocRequest,
    _legendAIUrl: string,
  ): Promise<DataProductDocResponse> {
    return Promise.reject(
      new Error('Permission denied: you do not have access to AI.'),
    );
  }
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------
const setupEditorWithAI = async (
  withAIConfig = true,
  extraLegendAI?: { enghubDocUrl?: string; enthubRequestAccessUrl?: string },
  failingSuggester = false,
) => {
  const pluginManager = LegendStudioPluginManager.create();
  pluginManager
    .usePresets([
      new QueryBuilder_GraphManagerPreset(),
      new Core_GraphManagerPreset(),
    ])
    .install();

  const legendAIConfig = withAIConfig
    ? { url: 'http://ai.example.com', ...extraLegendAI }
    : extraLegendAI
      ? extraLegendAI
      : undefined;
  const applicationStore = new ApplicationStore(
    TEST__getLegendStudioApplicationConfig(
      legendAIConfig ? { legendAI: legendAIConfig } : {},
    ),
    pluginManager,
  );

  const editorStore = TEST__provideMockedEditorStore({
    pluginManager,
    applicationStore,
  });

  if (failingSuggester) {
    new MockFailingDataProductAIDocPlugin().install(pluginManager);
  } else if (withAIConfig) {
    new MockDataProductAIDocPlugin().install(pluginManager);
  }

  MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
    readOnly: true,
  });

  // Mock graphToPureCode so the AI suggestion flow doesn't need a real engine
  jest
    .spyOn(editorStore.graphManagerState.graphManager, 'graphToPureCode')
    .mockResolvedValue('// mock pure code');

  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(editorStore, {
    entities: TEST_DATA__LHDataProduct,
  });

  await TEST__openElementFromExplorerTree(
    'model::sampleDataProduct',
    renderResult,
  );

  const editorGroup = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
  );

  // Navigate to the APG tab where the AI suggest button lives
  fireEvent.click(getByText(editorGroup, 'APG'));

  return { editorGroup, renderResult, editorStore };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test(
  integrationTest(
    '"Suggest with AI" button is visible when legendAIUrl is configured and plugin is registered',
  ),
  async () => {
    const { editorGroup } = await setupEditorWithAI(true);

    await findByText(editorGroup, 'Suggest with AI');
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
        editorGroup.querySelector(
          'button[title="Use AI to suggest title and descriptions for this access point group"]',
        ),
      ).toBeNull();
    });
  },
);

test(
  integrationTest('Clicking "Suggest with AI" shows Apply/Dismiss buttons'),
  async () => {
    const { editorGroup } = await setupEditorWithAI(true);

    const suggestBtn = await findByText(editorGroup, 'Suggest with AI');

    await act(async () => {
      fireEvent.click(suggestBtn);
    });

    await findByText(editorGroup, 'Apply');
    await findByText(editorGroup, 'Dismiss');
  },
);

test(
  integrationTest(
    'Clicking "Apply" applies metadata to the selected access point group',
  ),
  async () => {
    const { editorGroup, editorStore } = await setupEditorWithAI(true);

    const suggestBtn = await findByText(editorGroup, 'Suggest with AI');

    await act(async () => {
      fireEvent.click(suggestBtn);
    });

    const applyBtn = await findByText(editorGroup, 'Apply');

    await act(async () => {
      fireEvent.click(applyBtn);
    });

    const dataProduct = editorStore.graphManagerState.graph.getOwnDataProduct(
      'model::sampleDataProduct',
    );
    // Only the selected group (group1) should be updated
    const group0 = guaranteeNonNullable(dataProduct.accessPointGroups[0]);
    expect(group0.title).toBe('AI Group 1 Title');
    expect(group0.description).toBe('AI Group 1 Description');
    // Data product level title/description should NOT change
    expect(dataProduct.title).toBe('My Data Product');
    expect(dataProduct.description).toBe('sample for testing');
  },
);

test(
  integrationTest(
    'Clicking "Apply" applies metadata to access points in the selected group',
  ),
  async () => {
    const { editorGroup, editorStore } = await setupEditorWithAI(true);

    const suggestBtn = await findByText(editorGroup, 'Suggest with AI');

    await act(async () => {
      fireEvent.click(suggestBtn);
    });

    const applyBtn = await findByText(editorGroup, 'Apply');

    await act(async () => {
      fireEvent.click(applyBtn);
    });

    const dataProduct = editorStore.graphManagerState.graph.getOwnDataProduct(
      'model::sampleDataProduct',
    );

    // Only ap1 in the selected group (group1) should be updated
    const apGroup = dataProduct.accessPointGroups[0];
    const ap0 = apGroup?.accessPoints[0];
    expect(ap0?.title).toBe('AI AP1 Title');
    expect(ap0?.description).toBe('AI AP1 Description');
  },
);

test(
  integrationTest(
    'Clicking "Dismiss" clears AI suggestion without applying it',
  ),
  async () => {
    const { editorGroup, editorStore } = await setupEditorWithAI(true);

    const suggestBtn = await findByText(editorGroup, 'Suggest with AI');

    await act(async () => {
      fireEvent.click(suggestBtn);
    });

    const dismissBtn = await findByText(editorGroup, 'Dismiss');

    await act(async () => {
      fireEvent.click(dismissBtn);
    });

    // "Suggest with AI" button should reappear
    await findByText(editorGroup, 'Suggest with AI');

    // Group metadata should NOT have changed
    const dataProduct = editorStore.graphManagerState.graph.getOwnDataProduct(
      'model::sampleDataProduct',
    );
    const unchangedGroup = dataProduct.accessPointGroups[0];
    expect(unchangedGroup?.title).toBeUndefined();
    expect(unchangedGroup?.description).toBe('my first access point group');
  },
);

// ---------------------------------------------------------------------------
// Unauthorized / error + doc-link tests
// ---------------------------------------------------------------------------

test(
  integrationTest(
    '"Suggest with AI" button is shown disabled with doc links when no legendAIUrl but doc URLs are configured',
  ),
  async () => {
    const { editorGroup } = await setupEditorWithAI(false, {
      enghubDocUrl: 'http://docs.example.com',
      enthubRequestAccessUrl: 'http://access.example.com',
    });

    await waitFor(() => {
      const btn = editorGroup.querySelector(
        '.data-product-editor__ai-suggest-btn',
      ) as HTMLButtonElement;
      expect(btn).not.toBeNull();
      expect(btn.disabled).toBe(true);

      expect(
        editorGroup.querySelector('.data-product-editor__ai-error__links'),
      ).not.toBeNull();
      expect(
        editorGroup.querySelectorAll('.data-product-editor__ai-error__link'),
      ).toHaveLength(2);
    });
  },
);

test(
  integrationTest(
    'Error message and doc links appear inline when AI suggestion call fails',
  ),
  async () => {
    const { editorGroup } = await setupEditorWithAI(
      true,
      {
        enghubDocUrl: 'http://docs.example.com',
        enthubRequestAccessUrl: 'http://access.example.com',
      },
      true,
    );

    const suggestBtn = await findByText(editorGroup, 'Suggest with AI');

    await act(async () => {
      fireEvent.click(suggestBtn);
    });

    await waitFor(() => {
      expect(
        editorGroup.querySelector('.data-product-editor__ai-error__message'),
      ).not.toBeNull();
      expect(
        editorGroup.querySelector('.data-product-editor__ai-error__links'),
      ).not.toBeNull();
    });
  },
);
