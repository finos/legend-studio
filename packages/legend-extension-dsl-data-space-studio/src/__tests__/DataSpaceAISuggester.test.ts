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

import { test, expect, describe } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { NetworkClientError, guaranteeNonNullable } from '@finos/legend-shared';
import {
  LegendStudioApplicationPlugin,
  LegendStudioPluginManager,
  type DSL_DataSpace_LegendStudioApplicationPlugin_Extension,
  type DataSpaceDocRequest,
  type DataSpaceDocResponse,
} from '@finos/legend-application-studio';

// ---------------------------------------------------------------------------
// Mock plugin implementing the AI doc suggestion extension
// ---------------------------------------------------------------------------
const MOCK_SUGGESTION: DataSpaceDocResponse = {
  description: 'AI Generated Description for DataSpace',
  confidence: 0.92,
};

class MockDataSpaceAIDocPlugin
  extends LegendStudioApplicationPlugin
  implements DSL_DataSpace_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super('mock-dataspace-ai-doc-suggester', '0.0.1');
  }

  override install(pluginManager: LegendStudioPluginManager): void {
    pluginManager.registerApplicationPlugin(this);
  }

  async getExtraDataSpaceDocumentationAISuggester(
    _request: DataSpaceDocRequest,
    _legendAIUrl: string,
  ): Promise<DataSpaceDocResponse> {
    return MOCK_SUGGESTION;
  }
}

// ---------------------------------------------------------------------------
// Mock plugin whose AI doc suggester always fails
// ---------------------------------------------------------------------------
const MOCK_ERROR_MESSAGE = 'AI service unavailable';

class MockDataSpaceAIDocFailurePlugin
  extends LegendStudioApplicationPlugin
  implements DSL_DataSpace_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super('mock-dataspace-ai-doc-failure', '0.0.1');
  }

  override install(pluginManager: LegendStudioPluginManager): void {
    pluginManager.registerApplicationPlugin(this);
  }

  async getExtraDataSpaceDocumentationAISuggester(
    _request: DataSpaceDocRequest,
    _legendAIUrl: string,
  ): Promise<DataSpaceDocResponse> {
    throw new Error(MOCK_ERROR_MESSAGE);
  }
}

// ---------------------------------------------------------------------------
// Mock plugin whose AI doc suggester fails with 401
// ---------------------------------------------------------------------------
class MockDataSpaceAIDoc401Plugin
  extends LegendStudioApplicationPlugin
  implements DSL_DataSpace_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super('mock-dataspace-ai-doc-401', '0.0.1');
  }

  override install(pluginManager: LegendStudioPluginManager): void {
    pluginManager.registerApplicationPlugin(this);
  }

  async getExtraDataSpaceDocumentationAISuggester(
    _request: DataSpaceDocRequest,
    _legendAIUrl: string,
  ): Promise<DataSpaceDocResponse> {
    throw new NetworkClientError(
      { status: 401, statusText: 'Unauthorized' } as Response,
      undefined,
    );
  }
}

// ---------------------------------------------------------------------------
// Mock plugin whose AI doc suggester fails with 403
// ---------------------------------------------------------------------------
class MockDataSpaceAIDoc403Plugin
  extends LegendStudioApplicationPlugin
  implements DSL_DataSpace_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super('mock-dataspace-ai-doc-403', '0.0.1');
  }

  override install(pluginManager: LegendStudioPluginManager): void {
    pluginManager.registerApplicationPlugin(this);
  }

  async getExtraDataSpaceDocumentationAISuggester(
    _request: DataSpaceDocRequest,
    _legendAIUrl: string,
  ): Promise<DataSpaceDocResponse> {
    throw new NetworkClientError(
      { status: 403, statusText: 'Forbidden' } as Response,
      undefined,
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: find the AI suggester from the plugin manager (mirrors component logic)
// ---------------------------------------------------------------------------
const findAISuggester = (pluginManager: LegendStudioPluginManager) =>
  pluginManager
    .getApplicationPlugins()
    .map((p) =>
      (
        p as DSL_DataSpace_LegendStudioApplicationPlugin_Extension
      ).getExtraDataSpaceDocumentationAISuggester?.bind(p),
    )
    .find(Boolean);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe(
  unitTest('DataSpace AI Documentation Suggester - Plugin Extension'),
  () => {
    test('AI suggester is found when plugin is registered', () => {
      const pluginManager = LegendStudioPluginManager.create();
      new MockDataSpaceAIDocPlugin().install(pluginManager);

      const suggester = findAISuggester(pluginManager);
      expect(suggester).toBeDefined();
    });

    test('AI suggester is undefined when no plugin is registered', () => {
      const pluginManager = LegendStudioPluginManager.create();

      const suggester = findAISuggester(pluginManager);
      expect(suggester).toBeUndefined();
    });

    test('AI suggester returns description and confidence', async () => {
      const pluginManager = LegendStudioPluginManager.create();
      new MockDataSpaceAIDocPlugin().install(pluginManager);

      const suggester = findAISuggester(pluginManager);
      expect(suggester).toBeDefined();

      const request: DataSpaceDocRequest = {
        definitions: 'DataSpace test::MyDataSpace {}',
        data_space_name: 'test::MyDataSpace',
      };
      const result = await guaranteeNonNullable(suggester)(
        request,
        'http://ai.example.com',
      );
      expect(result.description).toBe('AI Generated Description for DataSpace');
      expect(result.confidence).toBe(0.92);
    });

    test('AI suggester request includes data_space_name (not data_product_name)', async () => {
      const pluginManager = LegendStudioPluginManager.create();
      let capturedRequest: DataSpaceDocRequest | undefined;

      class CapturingPlugin
        extends LegendStudioApplicationPlugin
        implements DSL_DataSpace_LegendStudioApplicationPlugin_Extension
      {
        constructor() {
          super('capturing-plugin', '0.0.1');
        }

        override install(pm: LegendStudioPluginManager): void {
          pm.registerApplicationPlugin(this);
        }

        async getExtraDataSpaceDocumentationAISuggester(
          request: DataSpaceDocRequest,
          _legendAIUrl: string,
        ): Promise<DataSpaceDocResponse> {
          capturedRequest = request;
          return { description: 'test', confidence: 1 };
        }
      }

      new CapturingPlugin().install(pluginManager);
      const suggester = findAISuggester(pluginManager);

      await guaranteeNonNullable(suggester)(
        {
          definitions: 'DataSpace my::Space {}',
          data_space_name: 'my::Space',
        },
        'http://ai.example.com',
      );

      const captured = guaranteeNonNullable(capturedRequest);
      expect(captured.data_space_name).toBe('my::Space');
      expect(captured.definitions).toBe('DataSpace my::Space {}');
    });

    test('AI suggester request supports optional model field', async () => {
      const pluginManager = LegendStudioPluginManager.create();
      let capturedRequest: DataSpaceDocRequest | undefined;

      class CapturingPlugin
        extends LegendStudioApplicationPlugin
        implements DSL_DataSpace_LegendStudioApplicationPlugin_Extension
      {
        constructor() {
          super('capturing-model-plugin', '0.0.1');
        }

        override install(pm: LegendStudioPluginManager): void {
          pm.registerApplicationPlugin(this);
        }

        async getExtraDataSpaceDocumentationAISuggester(
          request: DataSpaceDocRequest,
          _legendAIUrl: string,
        ): Promise<DataSpaceDocResponse> {
          capturedRequest = request;
          return { description: 'test', confidence: 1 };
        }
      }

      new CapturingPlugin().install(pluginManager);
      const suggester = findAISuggester(pluginManager);

      await guaranteeNonNullable(suggester)(
        {
          definitions: 'DataSpace my::Space {}',
          data_space_name: 'my::Space',
          model: 'gpt-4',
        },
        'http://ai.example.com',
      );

      expect(guaranteeNonNullable(capturedRequest).model).toBe('gpt-4');
    });
  },
);

describe(
  unitTest('DataSpace AI Documentation Suggester - Error Handling'),
  () => {
    test('AI suggester propagates generic errors', async () => {
      const pluginManager = LegendStudioPluginManager.create();
      new MockDataSpaceAIDocFailurePlugin().install(pluginManager);

      const suggester = findAISuggester(pluginManager);
      expect(suggester).toBeDefined();

      await expect(
        guaranteeNonNullable(suggester)(
          {
            definitions: 'DataSpace test::Space {}',
            data_space_name: 'test::Space',
          },
          'http://ai.example.com',
        ),
      ).rejects.toThrow(MOCK_ERROR_MESSAGE);
    });

    test('AI suggester throws NetworkClientError on 401', async () => {
      const pluginManager = LegendStudioPluginManager.create();
      new MockDataSpaceAIDoc401Plugin().install(pluginManager);

      const suggester = guaranteeNonNullable(findAISuggester(pluginManager));

      try {
        await suggester(
          {
            definitions: 'DataSpace test::Space {}',
            data_space_name: 'test::Space',
          },
          'http://ai.example.com',
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkClientError);
        expect((error as NetworkClientError).response.status).toBe(401);
      }
    });

    test('AI suggester throws NetworkClientError on 403', async () => {
      const pluginManager = LegendStudioPluginManager.create();
      new MockDataSpaceAIDoc403Plugin().install(pluginManager);

      const suggester = guaranteeNonNullable(findAISuggester(pluginManager));

      try {
        await suggester(
          {
            definitions: 'DataSpace test::Space {}',
            data_space_name: 'test::Space',
          },
          'http://ai.example.com',
        );
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkClientError);
        expect((error as NetworkClientError).response.status).toBe(403);
      }
    });
  },
);
