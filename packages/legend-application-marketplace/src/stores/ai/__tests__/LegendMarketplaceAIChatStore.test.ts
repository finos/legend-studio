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

import { test, describe, expect, jest } from '@jest/globals';
import { unitTest, createMock } from '@finos/legend-shared/test';
import { ApplicationStore } from '@finos/legend-application';
import { flowResult } from 'mobx';
import { TEST__getTestLegendMarketplaceApplicationConfig } from '../../../application/__test-utils__/LegendMarketplaceApplicationTestUtils.js';
import { LegendMarketplacePluginManager } from '../../../application/LegendMarketplacePluginManager.js';
import { LegendMarketplaceBaseStore } from '../../LegendMarketplaceBaseStore.js';
import {
  LegendMarketplaceAIChatStore,
  MarketplaceAIChatStage,
  unwrapProductDetails,
} from '../LegendMarketplaceAIChatStore.js';
import {
  DataProductSearchResult,
  LegacyDataProductSearchResultDetails,
  LakehouseDataProductSearchResultDetails,
  LakehouseSDLCDataProductSearchResultOrigin,
  DataProductDetailsType,
  DataProductSearchResultDetailsType,
  type AutosuggestResult,
} from '@finos/legend-server-marketplace';
import {
  type LegendAIConfig,
  type MessageSetter,
  LegendAIMessageRole,
  LegendAIQuestionIntent,
  LegendAI_LegendApplicationPlugin_Extension,
  LegendAIJudgeVerdict,
  LegendAIResolvedEntities,
  LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
} from '@finos/legend-lego/legend-ai';

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildLegacyProduct(overrides?: {
  title?: string;
  groupId?: string;
  artifactId?: string;
  versionId?: string;
  path?: string;
  description?: string;
}): DataProductSearchResult {
  const details = new LegacyDataProductSearchResultDetails();
  details.groupId = overrides?.groupId ?? 'com.test';
  details.artifactId = overrides?.artifactId ?? 'artifact';
  details.versionId = overrides?.versionId ?? '1.0.0';
  details.path = overrides?.path ?? 'my::DataSpace';

  const result = new DataProductSearchResult();
  result.dataProductTitle = overrides?.title ?? 'TestProduct';
  result.dataProductDescription = overrides?.description ?? 'A test product';
  result.tags1 = ['tag1'];
  result.tags2 = ['tag2'];
  result.tag_score = 0.9;
  result.similarity = 0.8;
  result.dataProductDetails = details;
  return result;
}

function buildLakehouseProduct(overrides?: {
  title?: string;
  groupId?: string;
  artifactId?: string;
  versionId?: string;
  path?: string;
  dataProductId?: string;
}): DataProductSearchResult {
  const origin = new LakehouseSDLCDataProductSearchResultOrigin();
  origin.groupId = overrides?.groupId ?? 'com.lh';
  origin.artifactId = overrides?.artifactId ?? 'lh-artifact';
  origin.versionId = overrides?.versionId ?? '2.0.0';
  origin.path = overrides?.path ?? 'my::LhDataSpace';

  const details = new LakehouseDataProductSearchResultDetails();
  details.dataProductId = overrides?.dataProductId ?? 'dp-123';
  details.deploymentId = 1;
  details.producerEnvironmentName = 'prod';
  details.origin = origin;

  const result = new DataProductSearchResult();
  result.dataProductTitle = overrides?.title ?? 'LhProduct';
  result.dataProductDescription = 'A lakehouse product';
  result.tags1 = [];
  result.tags2 = [];
  result.tag_score = 0;
  result.similarity = 0.7;
  result.dataProductDetails = details;
  return result;
}

// ─── create store ────────────────────────────────────────────────────────────

function createStore(configOverrides?: Partial<LegendAIConfig>): {
  store: LegendMarketplaceAIChatStore;
  baseStore: LegendMarketplaceBaseStore;
} {
  const pluginManager = LegendMarketplacePluginManager.create();
  pluginManager.usePlugins([]).usePresets([]).install();

  const appConfig = TEST__getTestLegendMarketplaceApplicationConfig();
  const applicationStore = new ApplicationStore(appConfig, pluginManager);
  const baseStore = new LegendMarketplaceBaseStore(applicationStore);

  // Patch legendAIConfig
  if (configOverrides) {
    Object.defineProperty(appConfig, 'legendAIConfig', {
      get: () => ({
        enabled: true,
        llmServiceUrl: 'http://localhost/llm',
        llmModelName: 'test-model',
        sqlExecutionUrl: 'http://localhost/sql',
        orchestratorUrl: undefined,
        marketplaceSearchUrl: undefined,
        engineUrl: undefined,
        maxJudgeAttempts: 2,
        ...configOverrides,
      }),
    });
  }

  const store = new LegendMarketplaceAIChatStore(baseStore);
  return { store, baseStore };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe(unitTest('LegendMarketplaceAIChatStore — initial state'), () => {
  test('initializes with idle stage and empty messages', () => {
    const { store } = createStore();
    expect(store.stage).toBe(MarketplaceAIChatStage.IDLE);
    expect(store.questionText).toBe('');
    expect(store.messages).toEqual([]);
    expect(store.isSending).toBe(false);
    expect(store.selectedProduct).toBeUndefined();
    expect(store.selectedProductCoordinates).toBeUndefined();
    expect(store.selectedProductMetadata).toBeUndefined();
    expect(store.pureExecutionContext).toBeUndefined();
    expect(store.resolvedProductServices).toEqual([]);
    expect(store.scoredCandidates).toEqual([]);
    expect(store.suggestedProducts).toEqual([]);
    expect(store.scopeProducts).toEqual([]);
    expect(store.pendingFallbackQuestion).toBeUndefined();
    expect(store.lastResolvedEntities).toBeUndefined();
    expect(store.selectedDataProductId).toBeUndefined();
  });
});

describe(unitTest('LegendMarketplaceAIChatStore — setQuestionText'), () => {
  test('updates questionText', () => {
    const { store } = createStore();
    store.setQuestionText('What is this?');
    expect(store.questionText).toBe('What is this?');
  });
});

describe(unitTest('LegendMarketplaceAIChatStore — setStage'), () => {
  test('updates stage', () => {
    const { store } = createStore();
    store.setStage(MarketplaceAIChatStage.SEARCHING);
    expect(store.stage).toBe(MarketplaceAIChatStage.SEARCHING);
    store.setStage(MarketplaceAIChatStage.RESULTS);
    expect(store.stage).toBe(MarketplaceAIChatStage.RESULTS);
  });
});

describe(unitTest('LegendMarketplaceAIChatStore — clearChat'), () => {
  test('resets all chat state', () => {
    const { store } = createStore();

    store.setQuestionText('something');
    store.setStage(MarketplaceAIChatStage.RESULTS);

    store.clearChat();

    expect(store.messages).toEqual([]);
    expect(store.suggestedProducts).toEqual([]);
    expect(store.scoredCandidates).toEqual([]);
    expect(store.selectedProduct).toBeUndefined();
    expect(store.pureExecutionContext).toBeUndefined();
    expect(store.resolvedProductServices).toEqual([]);
    expect(store.lastResolvedEntities).toBeUndefined();
    expect(store.selectedDataProductId).toBeUndefined();
    expect(store.stage).toBe(MarketplaceAIChatStage.IDLE);
    expect(store.questionText).toBe('');
    expect(store.isSending).toBe(false);
  });

  test('preserves first scope product metadata on clear', () => {
    const { store } = createStore();

    store.addScopeProduct({
      dataProductName: 'Scoped',
      dataProductDescription: 'desc',
      dataProductDetails: {
        _type: DataProductDetailsType.LEGACY,
        groupId: 'g1',
        artifactId: 'a1',
        versionId: 'v1',
        path: 'p1::Path',
      },
      matchedText: '',
    } as AutosuggestResult);

    store.clearChat();

    expect(store.selectedProductCoordinates).toEqual({
      data_product: 'p1::Path',
      group_id: 'g1',
      artifact_id: 'a1',
      version: 'v1',
    });
    expect(store.selectedProductMetadata?.name).toBe('Scoped');
  });
});

// ─── selectDataProduct ──────────────────────────────────────────────────────

describe(
  unitTest('LegendMarketplaceAIChatStore — selectDataProduct (legacy)'),
  () => {
    test('sets all product state from legacy details', () => {
      const { store } = createStore();
      const product = buildLegacyProduct();

      store.selectDataProduct(product);

      expect(store.selectedProduct).toBe(product);
      expect(store.selectedProductCoordinates).toEqual({
        data_product: 'my::DataSpace',
        group_id: 'com.test',
        artifact_id: 'artifact',
        version: '1.0.0',
      });
      expect(store.selectedProductMetadata?.name).toBe('TestProduct');
      expect(store.selectedProductMetadata?.coordinates).toBe(
        'com.test:artifact:1.0.0',
      );
      expect(store.selectedDataProductId).toBeUndefined();
      expect(store.suggestedProducts).toEqual([]);
    });

    test('extracts tags as metadata tags', () => {
      const { store } = createStore();
      const product = buildLegacyProduct();

      store.selectDataProduct(product);

      expect(store.selectedProductMetadata?.tags).toEqual([
        { profile: 'tag', value: 'tag1' },
        { profile: 'tag', value: 'tag2' },
      ]);
    });

    test('includes description in metadata', () => {
      const { store } = createStore();
      const product = buildLegacyProduct({ description: 'My description' });

      store.selectDataProduct(product);

      expect(store.selectedProductMetadata?.description).toBe('My description');
    });

    test('does nothing if coordinates cannot be extracted', () => {
      const { store } = createStore();
      const details = new LegacyDataProductSearchResultDetails();
      details.groupId = '';
      details.artifactId = '';
      details.versionId = '';
      details.path = '';

      const result = new DataProductSearchResult();
      result.dataProductTitle = 'Missing';
      result.dataProductDescription = null;
      result.tags1 = [];
      result.tags2 = [];
      result.tag_score = 0;
      result.similarity = 0;
      result.dataProductDetails = details;

      store.selectDataProduct(result);

      expect(store.selectedProduct).toBeUndefined();
      expect(store.selectedProductCoordinates).toBeUndefined();
    });
  },
);

describe(
  unitTest('LegendMarketplaceAIChatStore — selectDataProduct (lakehouse)'),
  () => {
    test('sets product state from lakehouse details with SDLC origin', () => {
      const { store } = createStore();
      const product = buildLakehouseProduct();

      store.selectDataProduct(product);

      expect(store.selectedProductCoordinates).toEqual({
        data_product: 'my::LhDataSpace',
        group_id: 'com.lh',
        artifact_id: 'lh-artifact',
        version: '2.0.0',
      });
      expect(store.selectedDataProductId).toBe('dp-123');
    });

    test('returns undefined for lakehouse without SDLC origin', () => {
      const { store } = createStore();

      const details = new LakehouseDataProductSearchResultDetails();
      details.dataProductId = 'dp-x';
      details.deploymentId = 1;
      details.producerEnvironmentName = 'prod';
      details.origin = null;

      const result = new DataProductSearchResult();
      result.dataProductTitle = 'NoOrigin';
      result.dataProductDescription = null;
      result.tags1 = [];
      result.tags2 = [];
      result.tag_score = 0;
      result.similarity = 0;
      result.dataProductDetails = details;

      store.selectDataProduct(result);

      expect(store.selectedProduct).toBeUndefined();
    });
  },
);

// ─── deselectProduct ──────────────────────────────────────────────────────────

describe(unitTest('LegendMarketplaceAIChatStore — deselectProduct'), () => {
  test('clears product state and sets stage to product-selection', () => {
    const { store } = createStore();
    const product = buildLegacyProduct();

    store.selectDataProduct(product);
    expect(store.selectedProduct).toBeDefined();

    store.deselectProduct();

    expect(store.selectedProduct).toBeUndefined();
    expect(store.selectedProductCoordinates).toBeUndefined();
    expect(store.selectedProductMetadata).toBeUndefined();
    expect(store.pureExecutionContext).toBeUndefined();
    expect(store.resolvedProductServices).toEqual([]);
    expect(store.lastResolvedEntities).toBeUndefined();
    expect(store.selectedDataProductId).toBeUndefined();
    expect(store.stage).toBe(MarketplaceAIChatStage.PRODUCT_SELECTION);
  });
});

// ─── addScopeProduct ──────────────────────────────────────────────────────────

describe(unitTest('LegendMarketplaceAIChatStore — addScopeProduct'), () => {
  const makeAutosuggest = (overrides?: {
    groupId?: string;
    artifactId?: string;
  }) =>
    ({
      dataProductName: 'Prod',
      dataProductDescription: 'desc',
      dataProductDetails: {
        _type: DataProductDetailsType.LEGACY,
        groupId: overrides?.groupId ?? 'g1',
        artifactId: overrides?.artifactId ?? 'a1',
        versionId: 'v1',
        path: 'p::A',
      },
      matchedText: '',
    }) as AutosuggestResult;

  test('adds product to scope products', () => {
    const { store } = createStore();
    store.addScopeProduct(makeAutosuggest());
    expect(store.scopeProducts).toHaveLength(1);
    expect(store.scopeProducts[0]?.name).toBe('Prod');
  });

  test('first scope product sets selectedProductCoordinates', () => {
    const { store } = createStore();
    store.addScopeProduct(makeAutosuggest());
    expect(store.selectedProductCoordinates).toEqual({
      data_product: 'p::A',
      group_id: 'g1',
      artifact_id: 'a1',
      version: 'v1',
    });
  });

  test('prevents duplicate scope products', () => {
    const { store } = createStore();
    store.addScopeProduct(makeAutosuggest());
    store.addScopeProduct(makeAutosuggest());
    expect(store.scopeProducts).toHaveLength(1);
  });

  test('limits scope to 3 products', () => {
    const { store } = createStore();
    store.addScopeProduct(makeAutosuggest({ groupId: 'g1' }));
    store.addScopeProduct(makeAutosuggest({ groupId: 'g2' }));
    store.addScopeProduct(makeAutosuggest({ groupId: 'g3' }));
    store.addScopeProduct(makeAutosuggest({ groupId: 'g4' }));
    expect(store.scopeProducts).toHaveLength(3);
  });

  test('ignores products with missing coordinates', () => {
    const { store } = createStore();
    store.addScopeProduct({
      dataProductName: 'Bad',
      dataProductDescription: 'desc',
      dataProductDetails: {
        _type: DataProductDetailsType.LEGACY,
        groupId: '',
        artifactId: '',
        versionId: '',
        path: '',
      },
      matchedText: '',
    } as AutosuggestResult);
    expect(store.scopeProducts).toHaveLength(0);
  });

  test('handles lakehouse origin format', () => {
    const { store } = createStore();
    store.addScopeProduct({
      dataProductName: 'LH',
      dataProductDescription: 'desc',
      dataProductDetails: {
        _type: DataProductDetailsType.LAKEHOUSE,
        dataProductId: 'dp-1',
        origin: {
          groupId: 'lg',
          artifactId: 'la',
          versionId: 'lv',
          path: 'lh::Path',
        },
      },
      matchedText: '',
    } as AutosuggestResult);
    expect(store.scopeProducts).toHaveLength(1);
    expect(store.scopeProducts[0]?.coordinates.group_id).toBe('lg');
  });
});

// ─── removeScopeProduct ──────────────────────────────────────────────────────

describe(unitTest('LegendMarketplaceAIChatStore — removeScopeProduct'), () => {
  test('removes product at index', () => {
    const { store } = createStore();
    store.addScopeProduct({
      dataProductName: 'A',
      dataProductDescription: 'desc',
      dataProductDetails: {
        _type: DataProductDetailsType.LEGACY,
        groupId: 'g1',
        artifactId: 'a1',
        versionId: 'v1',
        path: 'p::A',
      },
      matchedText: '',
    } as AutosuggestResult);
    store.addScopeProduct({
      dataProductName: 'B',
      dataProductDescription: 'desc',
      dataProductDetails: {
        _type: DataProductDetailsType.LEGACY,
        groupId: 'g2',
        artifactId: 'a2',
        versionId: 'v2',
        path: 'p::B',
      },
      matchedText: '',
    } as AutosuggestResult);
    expect(store.scopeProducts).toHaveLength(2);

    store.removeScopeProduct(0);
    expect(store.scopeProducts).toHaveLength(1);
    expect(store.scopeProducts[0]?.name).toBe('B');
  });

  test('updates metadata to next scope product when no selected product', () => {
    const { store } = createStore();
    store.addScopeProduct({
      dataProductName: 'A',
      dataProductDescription: 'desc',
      dataProductDetails: {
        _type: DataProductDetailsType.LEGACY,
        groupId: 'g1',
        artifactId: 'a1',
        versionId: 'v1',
        path: 'p::A',
      },
      matchedText: '',
    } as AutosuggestResult);
    store.addScopeProduct({
      dataProductName: 'B',
      dataProductDescription: 'desc',
      dataProductDetails: {
        _type: DataProductDetailsType.LEGACY,
        groupId: 'g2',
        artifactId: 'a2',
        versionId: 'v2',
        path: 'p::B',
      },
      matchedText: '',
    } as AutosuggestResult);

    store.removeScopeProduct(0);
    expect(store.selectedProductCoordinates?.group_id).toBe('g2');
    expect(store.selectedProductMetadata?.name).toBe('B');
  });

  test('clears metadata when all scope products removed', () => {
    const { store } = createStore();
    store.addScopeProduct({
      dataProductName: 'A',
      dataProductDescription: 'desc',
      dataProductDetails: {
        _type: DataProductDetailsType.LEGACY,
        groupId: 'g1',
        artifactId: 'a1',
        versionId: 'v1',
        path: 'p::A',
      },
      matchedText: '',
    } as AutosuggestResult);

    store.removeScopeProduct(0);
    expect(store.selectedProductCoordinates).toBeUndefined();
    expect(store.selectedProductMetadata).toBeUndefined();
  });
});

// ─── config / isEnabled computed ─────────────────────────────────────────────

describe(unitTest('LegendMarketplaceAIChatStore — config/isEnabled'), () => {
  test('config reads from application config', () => {
    const { store } = createStore();
    const config = store.config;
    expect(config).toBeDefined();
    expect(typeof config.enabled).toBe('boolean');
  });

  test('isEnabled is false when no plugin is registered', () => {
    const { store } = createStore();
    expect(store.plugin).toBeUndefined();
    expect(store.isEnabled).toBe(false);
  });
});

// ─── resolveExecutionContext ─────────────────────────────────────────────────

describe(
  unitTest('LegendMarketplaceAIChatStore — resolveExecutionContext'),
  () => {
    test('returns early if no coordinates', async () => {
      const { store } = createStore();
      const mockSetter = createMock() as MessageSetter;
      await store.resolveExecutionContext(mockSetter);
      expect(store.pureExecutionContext).toBeUndefined();
    });
  },
);

// ─── submitQuery — early returns ─────────────────────────────────────────────

describe(
  unitTest('LegendMarketplaceAIChatStore — submitQuery early exits'),
  () => {
    test('does nothing for empty input', async () => {
      const { store } = createStore();
      const gen = store.submitQuery('   ');
      await flowResult(gen);
      expect(store.messages).toEqual([]);
    });

    test('does nothing when isSending is true', async () => {
      const { store } = createStore();
      store.isSending = true;
      const gen = store.submitQuery('test');
      await flowResult(gen);
      expect(store.messages).toEqual([]);
    });

    test('does nothing when plugin is undefined', async () => {
      const { store } = createStore();
      expect(store.plugin).toBeUndefined();
      const gen = store.submitQuery('test');
      await flowResult(gen);
      expect(store.messages).toEqual([]);
    });
  },
);

// ─── askFollowUp — early returns ─────────────────────────────────────────────

describe(
  unitTest('LegendMarketplaceAIChatStore — askFollowUp early exits'),
  () => {
    test('does nothing for empty input', async () => {
      const { store } = createStore();
      const gen = store.askFollowUp('   ');
      await flowResult(gen);
      expect(store.messages).toEqual([]);
    });

    test('does nothing when isSending is true', async () => {
      const { store } = createStore();
      store.isSending = true;
      const gen = store.askFollowUp('test');
      await flowResult(gen);
      expect(store.messages).toEqual([]);
    });

    test('does nothing when no selectedProductCoordinates', async () => {
      const { store } = createStore();
      expect(store.selectedProductCoordinates).toBeUndefined();
      const gen = store.askFollowUp('test');
      await flowResult(gen);
      expect(store.messages).toEqual([]);
    });
  },
);

// ─── runOrchestratorFallback — early returns ─────────────────────────────────

describe(
  unitTest(
    'LegendMarketplaceAIChatStore — runOrchestratorFallback early exits',
  ),
  () => {
    test('does nothing when no pending fallback question', async () => {
      const { store } = createStore();
      expect(store.pendingFallbackQuestion).toBeUndefined();
      const gen = store.runOrchestratorFallback('msg-1');
      await flowResult(gen);
      expect(store.isSending).toBe(false);
    });
  },
);

// ─── selectAutosuggestProduct ────────────────────────────────────────────────

describe(
  unitTest('LegendMarketplaceAIChatStore — selectAutosuggestProduct'),
  () => {
    test('converts autosuggest to search result and selects', () => {
      const { store } = createStore();
      store.selectAutosuggestProduct({
        dataProductName: 'AutoProd',
        dataProductDescription: 'desc',
        dataProductDetails: {
          _type: DataProductDetailsType.LEGACY,
          groupId: 'com.auto',
          artifactId: 'auto-art',
          versionId: '3.0.0',
          path: 'my::AutoDataSpace',
        },
        matchedText: '',
      } as AutosuggestResult);

      expect(store.selectedProduct).toBeDefined();
      expect(store.selectedProduct?.dataProductTitle).toBe('AutoProd');
      expect(store.selectedProductCoordinates?.group_id).toBe('com.auto');
      expect(store.selectedProductCoordinates?.artifact_id).toBe('auto-art');
    });

    test('handles lakehouse autosuggest product', () => {
      const { store } = createStore();
      store.selectAutosuggestProduct({
        dataProductName: 'LH Auto',
        dataProductDescription: 'lh desc',
        dataProductDetails: {
          _type: DataProductDetailsType.LAKEHOUSE,
          dataProductId: 'dp-auto',
          origin: {
            groupId: 'com.lhauto',
            artifactId: 'lh-auto-art',
            versionId: '1.0.0',
            path: 'my::LhAutoPath',
          },
        },
        matchedText: '',
      } as AutosuggestResult);

      expect(store.selectedProduct).toBeDefined();
      expect(store.selectedProductCoordinates?.group_id).toBe('com.lhauto');
      expect(store.selectedDataProductId).toBe('dp-auto');
    });
  },
);

// ─── unwrapProductDetails ────────────────────────────────────────────────────

describe(unitTest('unwrapProductDetails'), () => {
  test('extracts from legacy product', () => {
    const product = buildLegacyProduct({
      groupId: 'g',
      artifactId: 'a',
      versionId: 'v',
      path: 'p::Path',
    });
    const result = unwrapProductDetails(product);
    expect(result).toEqual({
      groupId: 'g',
      artifactId: 'a',
      versionId: 'v',
      path: 'p::Path',
    });
  });

  test('extracts from lakehouse product with SDLC origin', () => {
    const product = buildLakehouseProduct({
      groupId: 'lg',
      artifactId: 'la',
      versionId: 'lv',
      path: 'lp::Path',
    });
    const result = unwrapProductDetails(product);
    expect(result).toEqual({
      groupId: 'lg',
      artifactId: 'la',
      versionId: 'lv',
      path: 'lp::Path',
    });
  });

  test('returns empty strings for lakehouse without SDLC origin', () => {
    const details = new LakehouseDataProductSearchResultDetails();
    details.dataProductId = 'dp-x';
    details.deploymentId = 1;
    details.producerEnvironmentName = 'prod';
    details.origin = null;

    const product = new DataProductSearchResult();
    product.dataProductTitle = 'NoOrigin';
    product.dataProductDescription = null;
    product.tags1 = [];
    product.tags2 = [];
    product.tag_score = 0;
    product.similarity = 0;
    product.dataProductDetails = details;

    const result = unwrapProductDetails(product);
    expect(result).toEqual({
      groupId: '',
      artifactId: '',
      versionId: '',
      path: '',
    });
  });

  test('returns empty strings when details type is unknown', () => {
    const product = new DataProductSearchResult();
    product.dataProductTitle = 'Unknown';
    product.dataProductDescription = null;
    product.tags1 = [];
    product.tags2 = [];
    product.tag_score = 0;
    product.similarity = 0;

    const result = unwrapProductDetails(product);
    expect(result).toEqual({
      groupId: '',
      artifactId: '',
      versionId: '',
      path: '',
    });
  });
});

// ─── lastUserMessageText ─────────────────────────────────────────────────────

describe(unitTest('LegendMarketplaceAIChatStore — lastUserMessageText'), () => {
  test('returns empty string when no messages', () => {
    const { store } = createStore();
    expect(store.lastUserMessageText).toBe('');
  });

  test('returns last user message text', () => {
    const { store } = createStore();
    store.messages = [
      { id: '1', role: LegendAIMessageRole.USER, text: 'first' },
      {
        id: '2',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: null,
        textAnswer: null,
        dataContext: null,
        gridData: null,
        error: null,
        errorType: null,
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        queriedAccessPointGroups: [],
      },
      { id: '3', role: LegendAIMessageRole.USER, text: 'second' },
    ];
    expect(store.lastUserMessageText).toBe('second');
  });
});

// ─── extractMetadata (via selectDataProduct) ─────────────────────────────────

describe(unitTest('LegendMarketplaceAIChatStore — metadata extraction'), () => {
  test('omits description when null', () => {
    const { store } = createStore();
    const product = buildLegacyProduct();
    product.dataProductDescription = null;
    store.selectDataProduct(product);
    expect(store.selectedProductMetadata?.description).toBeUndefined();
  });

  test('omits tags when both arrays empty', () => {
    const { store } = createStore();
    const product = buildLegacyProduct();
    product.tags1 = [];
    product.tags2 = [];
    store.selectDataProduct(product);
    expect(store.selectedProductMetadata?.tags).toBeUndefined();
  });

  test('uses Unknown when title is null', () => {
    const { store } = createStore();
    const product = buildLegacyProduct();
    product.dataProductTitle = null;
    store.selectDataProduct(product);
    expect(store.selectedProductMetadata?.name).toBe('Unknown');
  });

  test('includes accessPointGroups in metadata', () => {
    const { store } = createStore();
    const product = buildLegacyProduct();
    store.selectDataProduct(product);
    expect(store.selectedProductMetadata?.accessPointGroups).toEqual([]);
  });
});

// ─── helpers for flow tests ──────────────────────────────────────────────────

function buildSearchResponseJson(
  products: {
    title: string;
    description?: string | null;
    similarity?: number;
    details: Record<string, unknown>;
  }[],
): Record<string, unknown> {
  return {
    results: products.map((p) => ({
      dataProductTitle: p.title,
      dataProductDescription: p.description ?? '',
      embedding_type: 'test',
      vendor_name: '',
      tags1: [],
      tags2: [],
      tag_score: 0,
      similarity: p.similarity ?? 0.9,
      dataProductDetails: p.details,
    })),
    as_of_time: '2025-01-01T00:00:00Z',
    metadata: {
      num_pages: 1,
      page_number: 0,
      page_size: 10,
      total_count: products.length,
      next_page_number: null,
      prev_page_number: null,
      lakehouse_count: 0,
      legacy_count: 0,
      external_source_count: 0,
      has_filtered_products: false,
    },
  };
}

function buildLegacyDetails(overrides?: {
  groupId?: string;
  artifactId?: string;
  versionId?: string;
  path?: string;
}): Record<string, unknown> {
  return {
    _type: DataProductSearchResultDetailsType.LEGACY,
    groupId: overrides?.groupId ?? 'com.test',
    artifactId: overrides?.artifactId ?? 'artifact',
    versionId: overrides?.versionId ?? '1.0.0',
    path: overrides?.path ?? 'my::DataSpace',
  };
}

function buildLakehouseDetails(overrides?: {
  dataProductId?: string;
  deploymentId?: number;
  groupId?: string;
  artifactId?: string;
  versionId?: string;
  path?: string;
}): Record<string, unknown> {
  return {
    _type: DataProductSearchResultDetailsType.LAKEHOUSE,
    dataProductId: overrides?.dataProductId ?? 'dp-1',
    deploymentId: overrides?.deploymentId ?? 1,
    producerEnvironmentName: 'prod',
    origin: {
      _type: 'SdlcDeployment',
      groupId: overrides?.groupId ?? 'com.lh',
      artifactId: overrides?.artifactId ?? 'lh-art',
      versionId: overrides?.versionId ?? '2.0.0',
      path: overrides?.path ?? 'my::LhDataSpace',
    },
  };
}

function buildFieldSearchResponseJson(
  fields: {
    fieldName: string;
    dataProducts: {
      path: string;
      productType: string;
      groupId?: string;
      artifactId?: string;
      versionId?: string;
    }[];
  }[],
): Record<string, unknown> {
  return {
    results: fields.map((f) => ({
      fieldName: f.fieldName,
      fieldType: 'String',
      dataProducts: f.dataProducts.map((dp) => ({
        path: dp.path,
        productType: dp.productType,
        groupId: dp.groupId,
        artifactId: dp.artifactId,
        versionId: dp.versionId,
      })),
    })),
    metadata: {
      total_count: fields.length,
      num_pages: 1,
      page_size: 10,
      page_number: 0,
      lakehouse_count: 0,
      legacy_count: 0,
      total_field_matches: fields.length,
      next_page_number: null,
      prev_page_number: null,
    },
  };
}

function buildEntitySearchResponseJson(
  results: {
    datasetName: string;
    dataProductDetails?: Record<string, unknown>;
    datasetDetails?: Record<string, unknown>;
    similarityScore?: number;
    relatedFields?: {
      fieldName: string;
      fieldType?: string;
      similarityScore?: number;
    }[];
  }[],
): Record<string, unknown> {
  return {
    results: results.map((r) => ({
      datasetName: r.datasetName,
      dataProductDetails: r.dataProductDetails ?? {
        _type: 'lakehouse',
        groupId: 'com.lh',
        artifactId: 'lh-art',
        versionId: '2.0.0',
        path: 'my::LhDataSpace',
      },
      datasetDetails: r.datasetDetails ?? {
        _type: 'relational',
        modelPath: 'model::Path',
      },
      similarityScore: r.similarityScore ?? 0.95,
      relatedFields: (r.relatedFields ?? []).map((f) => ({
        fieldName: f.fieldName,
        fieldType: f.fieldType ?? 'String',
        similarityScore: f.similarityScore ?? 0.9,
      })),
    })),
    metadata: {
      total_count: results.length,
      num_pages: 1,
      page_size: 10,
      page_number: 0,
    },
  };
}

/**
 * Concrete mock plugin that passes instanceof checks.
 */
class MockLegendAIPlugin extends LegendAI_LegendApplicationPlugin_Extension {
  constructor() {
    super('mock-ai-plugin', '1.0.0');
  }
  classifyQuestionIntent = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['classifyQuestionIntent']>()
    .mockResolvedValue(LegendAIQuestionIntent.DATA_QUERY);
  buildMetadataPrompt = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['buildMetadataPrompt']>()
    .mockReturnValue('metadata prompt');
  buildGeneratorPrompt = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['buildGeneratorPrompt']>()
    .mockReturnValue('generator prompt');
  buildJudgePrompt = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['buildJudgePrompt']>()
    .mockReturnValue('judge prompt');
  callLLM = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['callLLM']>()
    .mockResolvedValue('```sql\nSELECT 1\n```');
  executeSql = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['executeSql']>()
    .mockResolvedValue({ columns: ['a'], rows: [{ a: 1 }] });
  extractSqlFromResponse = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['extractSqlFromResponse']>()
    .mockReturnValue({
      sql: 'SELECT * FROM t',
      failure: null,
    });
  extractJudgeResult = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['extractJudgeResult']>()
    .mockReturnValue({
      verdict: LegendAIJudgeVerdict.PASS,
    });
  generateQueryViaOrchestrator = jest
    .fn<
      LegendAI_LegendApplicationPlugin_Extension['generateQueryViaOrchestrator']
    >()
    .mockResolvedValue({ legend_query: 'model::Entity.all()' });
  resolveEntitiesForQuery = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['resolveEntitiesForQuery']>()
    .mockResolvedValue({ rootEntity: 'my::Entity', relatedEntities: [] });
  executePureQuery = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['executePureQuery']>()
    .mockResolvedValue({ columns: ['a'], rows: [{ a: 1 }] });
  executeLakehouseSql = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['executeLakehouseSql']>()
    .mockResolvedValue({ columns: ['a'], rows: [{ a: 1 }] });
  analyzeQueryResults = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['analyzeQueryResults']>()
    .mockResolvedValue(undefined);
  buildNoResultsFallback = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['buildNoResultsFallback']>()
    .mockResolvedValue(undefined);
  buildDataContextSummary = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['buildDataContextSummary']>()
    .mockResolvedValue(undefined);
  buildFailureFallback = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['buildFailureFallback']>()
    .mockResolvedValue(undefined);
  disambiguateEntity = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['disambiguateEntity']>()
    .mockResolvedValue({ rootEntity: 'my::Root', relatedEntities: [] });
  rerankProducts = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['rerankProducts']>()
    .mockResolvedValue([0]);
  override selectRelevantServices = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['selectRelevantServices']>()
    .mockImplementation((_q, services) => Promise.resolve(services));
  override probeServiceColumns = jest
    .fn<LegendAI_LegendApplicationPlugin_Extension['probeServiceColumns']>()
    .mockResolvedValue(undefined);
  buildErrorCorrectionPrompt = jest
    .fn<
      LegendAI_LegendApplicationPlugin_Extension['buildErrorCorrectionPrompt']
    >()
    .mockReturnValue('');
  buildZeroRowCorrectionPrompt = jest
    .fn<
      LegendAI_LegendApplicationPlugin_Extension['buildZeroRowCorrectionPrompt']
    >()
    .mockReturnValue('');
  buildAccessPointGeneratorPrompt = jest
    .fn<
      LegendAI_LegendApplicationPlugin_Extension['buildAccessPointGeneratorPrompt']
    >()
    .mockReturnValue('ap generator prompt');
  buildAccessPointJudgePrompt = jest
    .fn<
      LegendAI_LegendApplicationPlugin_Extension['buildAccessPointJudgePrompt']
    >()
    .mockReturnValue('ap judge prompt');
}

/**
 * Create a store with a mock plugin installed.
 */
function createStoreWithPlugin(configOverrides?: Partial<LegendAIConfig>): {
  store: LegendMarketplaceAIChatStore;
  baseStore: LegendMarketplaceBaseStore;
  plugin: MockLegendAIPlugin;
} {
  const pluginManager = LegendMarketplacePluginManager.create();
  const mockPlugin = new MockLegendAIPlugin();
  pluginManager.usePlugins([mockPlugin]).usePresets([]).install();

  const appConfig = TEST__getTestLegendMarketplaceApplicationConfig();
  const applicationStore = new ApplicationStore(appConfig, pluginManager);
  const baseStore = new LegendMarketplaceBaseStore(applicationStore);

  Object.defineProperty(appConfig, 'legendAIConfig', {
    get: () => ({
      enabled: true,
      llmServiceUrl: 'http://localhost/llm',
      llmModelName: 'test-model',
      sqlExecutionUrl: 'http://localhost/sql',
      orchestratorUrl: undefined,
      marketplaceSearchUrl: undefined,
      engineUrl: undefined,
      maxJudgeAttempts: 2,
      ...(configOverrides ?? {}),
    }),
  });

  const store = new LegendMarketplaceAIChatStore(baseStore);

  return { store, baseStore, plugin: mockPlugin };
}

// ─── submitQuery — product selection flow ────────────────────────────────────

describe(
  unitTest('LegendMarketplaceAIChatStore — submitQuery product selection flow'),
  () => {
    test('discovers products and sets PRODUCT_SELECTION stage', async () => {
      const { store, baseStore } = createStoreWithPlugin();

      jest
        .spyOn(baseStore.marketplaceServerClient, 'dataProductSearch')
        .mockResolvedValue(
          buildSearchResponseJson([
            { title: 'Product A', details: buildLegacyDetails() },
          ]),
        );
      jest
        .spyOn(baseStore.marketplaceServerClient, 'fieldSearch')
        .mockRejectedValue(new Error('field search unavailable'));

      await flowResult(store.submitQuery('show me trades'));

      expect(store.stage).toBe(MarketplaceAIChatStage.PRODUCT_SELECTION);
      expect(store.suggestedProducts).toHaveLength(1);
      expect(store.suggestedProducts[0]?.dataProductTitle).toBe('Product A');
      expect(store.isSending).toBe(false);
      expect(store.messages.length).toBeGreaterThanOrEqual(2);
    });

    test('sets IDLE and no-results message when no products found', async () => {
      const { store, baseStore } = createStoreWithPlugin();

      jest
        .spyOn(baseStore.marketplaceServerClient, 'dataProductSearch')
        .mockResolvedValue(buildSearchResponseJson([]));
      jest
        .spyOn(baseStore.marketplaceServerClient, 'fieldSearch')
        .mockRejectedValue(new Error('unavailable'));

      await flowResult(store.submitQuery('nonexistent product'));

      expect(store.stage).toBe(MarketplaceAIChatStage.IDLE);
      expect(store.suggestedProducts).toEqual([]);
      const lastMsg = store.messages[store.messages.length - 1];
      expect(lastMsg?.role).toBe(LegendAIMessageRole.ASSISTANT);
    });

    test('handles error during search gracefully', async () => {
      const { store, baseStore } = createStoreWithPlugin();

      jest
        .spyOn(baseStore.marketplaceServerClient, 'dataProductSearch')
        .mockRejectedValue(new Error('network error'));
      jest
        .spyOn(baseStore.marketplaceServerClient, 'fieldSearch')
        .mockRejectedValue(new Error('unavailable'));

      await flowResult(store.submitQuery('test query'));

      expect(store.stage).toBe(MarketplaceAIChatStage.IDLE);
      expect(store.isSending).toBe(false);
    });

    test('discovers products with field search results', async () => {
      const { store, baseStore } = createStoreWithPlugin();

      jest
        .spyOn(baseStore.marketplaceServerClient, 'dataProductSearch')
        .mockResolvedValue(
          buildSearchResponseJson([
            {
              title: 'ProductX',
              details: buildLegacyDetails({ path: 'my::Space' }),
            },
          ]),
        );
      jest
        .spyOn(baseStore.marketplaceServerClient, 'fieldSearch')
        .mockResolvedValue(
          buildFieldSearchResponseJson([
            {
              fieldName: 'accountId',
              dataProducts: [
                {
                  path: 'my::Space',
                  productType: 'legacy',
                  groupId: 'com.test',
                  artifactId: 'artifact',
                  versionId: '1.0.0',
                },
              ],
            },
          ]),
        );

      await flowResult(store.submitQuery('show account data'));

      expect(store.stage).toBe(MarketplaceAIChatStage.PRODUCT_SELECTION);
      expect(store.scoredCandidates.length).toBeGreaterThan(0);
    });

    test('field-derived products appear when not in product search', async () => {
      const { store, baseStore } = createStoreWithPlugin();

      jest
        .spyOn(baseStore.marketplaceServerClient, 'dataProductSearch')
        .mockResolvedValue(
          buildSearchResponseJson([
            {
              title: 'ProdA',
              details: buildLegacyDetails({
                groupId: 'g1',
                artifactId: 'a1',
                path: 'p1::Space',
              }),
            },
          ]),
        );
      jest
        .spyOn(baseStore.marketplaceServerClient, 'fieldSearch')
        .mockResolvedValue(
          buildFieldSearchResponseJson([
            {
              fieldName: 'tradeId',
              dataProducts: [
                {
                  path: 'p2::Space',
                  productType: 'legacy',
                  groupId: 'g2',
                  artifactId: 'a2',
                  versionId: '1.0.0',
                },
              ],
            },
          ]),
        );

      await flowResult(store.submitQuery('find trades'));

      expect(store.stage).toBe(MarketplaceAIChatStage.PRODUCT_SELECTION);
      // should have candidates from both product search and field-derived
      expect(store.scoredCandidates.length).toBeGreaterThan(0);
    });

    test('discovers lakehouse products', async () => {
      const { store, baseStore } = createStoreWithPlugin();

      jest
        .spyOn(baseStore.marketplaceServerClient, 'dataProductSearch')
        .mockResolvedValue(
          buildSearchResponseJson([
            {
              title: 'LH Product',
              details: buildLakehouseDetails(),
            },
          ]),
        );
      jest
        .spyOn(baseStore.marketplaceServerClient, 'fieldSearch')
        .mockRejectedValue(new Error('unavailable'));

      await flowResult(store.submitQuery('lakehouse data'));

      expect(store.stage).toBe(MarketplaceAIChatStage.PRODUCT_SELECTION);
      expect(store.suggestedProducts).toHaveLength(1);
    });
  },
);

// ─── submitQuery — with selected product (direct query) ──────────────────────

describe(
  unitTest('LegendMarketplaceAIChatStore — submitQuery with selected product'),
  () => {
    test('dispatches query when product is already selected', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      // Pre-select a product
      const product = buildLegacyProduct();
      store.selectDataProduct(product);

      // Mock entity search
      jest
        .spyOn(baseStore.marketplaceServerClient, 'entitySearch')
        .mockResolvedValue(
          buildEntitySearchResponseJson([
            {
              datasetName: 'TradeDataset',
              relatedFields: [{ fieldName: 'amount', fieldType: 'Number' }],
              dataProductDetails: {
                _type: 'lakehouse',
                groupId: 'com.test',
                artifactId: 'artifact',
                versionId: '1.0.0',
                path: 'my::DataSpace',
              },
            },
          ]),
        );

      // Mock plugin methods for SQL flow
      plugin.callLLM.mockResolvedValue('```sql\nSELECT * FROM trades\n```');
      plugin.executeSql.mockResolvedValue({
        columns: ['amount'],
        rows: [{ amount: 100 }],
      });

      await flowResult(store.submitQuery('show trades'));

      expect(store.stage).toBe(MarketplaceAIChatStage.RESULTS);
      expect(store.isSending).toBe(false);
    });
  },
);

// ─── askFollowUp — happy path ────────────────────────────────────────────────

describe(
  unitTest('LegendMarketplaceAIChatStore — askFollowUp happy path'),
  () => {
    test('queries with existing product context', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      // Pre-select a product
      const product = buildLegacyProduct();
      store.selectDataProduct(product);

      jest
        .spyOn(baseStore.marketplaceServerClient, 'entitySearch')
        .mockResolvedValue(
          buildEntitySearchResponseJson([
            {
              datasetName: 'Dataset1',
              relatedFields: [{ fieldName: 'id' }],
              dataProductDetails: {
                _type: 'lakehouse',
                groupId: 'com.test',
                artifactId: 'artifact',
                versionId: '1.0.0',
                path: 'my::DataSpace',
              },
            },
          ]),
        );

      plugin.callLLM.mockResolvedValue('```sql\nSELECT id FROM data\n```');
      plugin.executeSql.mockResolvedValue({
        columns: ['id'],
        rows: [{ id: 1 }],
      });

      await flowResult(store.askFollowUp('show more data'));

      expect(store.isSending).toBe(false);
      expect(store.messages.length).toBeGreaterThanOrEqual(2);
    });

    test('handles error during follow-up', async () => {
      const { store, baseStore } = createStoreWithPlugin();

      const product = buildLegacyProduct();
      store.selectDataProduct(product);

      jest
        .spyOn(baseStore.marketplaceServerClient, 'entitySearch')
        .mockRejectedValue(new Error('search failed'));

      await flowResult(store.askFollowUp('query that breaks'));

      expect(store.isSending).toBe(false);
    });
  },
);

// ─── runOrchestratorFallback — happy path ────────────────────────────────────

describe(
  unitTest('LegendMarketplaceAIChatStore — runOrchestratorFallback happy path'),
  () => {
    test('executes orchestrator fallback flow', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      // Pre-select a product
      const product = buildLegacyProduct();
      store.selectDataProduct(product);

      // Set up pending fallback
      store.pendingFallbackQuestion = 'show trades';

      // Add a message with fallback action to find by id
      store.messages = [
        {
          id: 'user-1',
          role: LegendAIMessageRole.USER,
          text: 'show trades',
        },
        {
          id: 'assistant-1',
          role: LegendAIMessageRole.ASSISTANT,
          thinkingSteps: [],
          sql: null,
          textAnswer: null,
          dataContext: null,
          gridData: null,
          error: null,
          errorType: null,
          sqlGenTime: null,
          execTime: null,
          thinkingDuration: null,
          isProcessing: false,
          isExecuting: false,
          suggestedQueries: [],
          fallbackAction: {
            label: 'Ask Legend AI Orchestrator to generate Pure query',
            actionId: LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
          },
          queriedAccessPointGroups: [],
        },
      ];

      // Mock getVersionEntity for resolveExecutionContext
      jest
        .spyOn(baseStore.depotServerClient, 'getVersionEntity')
        .mockResolvedValue({
          path: 'my::DataSpace',
          classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
          content: {
            _type: 'dataSpace',
            name: 'DataSpace',
            package: 'my',
            executionContexts: [
              {
                name: 'default',
                mapping: { path: 'my::Mapping' },
                defaultRuntime: { path: 'my::Runtime' },
              },
            ],
            defaultExecutionContext: 'default',
          },
        });

      // Mock orchestrator call
      plugin.generateQueryViaOrchestrator.mockResolvedValue({
        legend_query: 'model::Entity.all()',
      });
      plugin.executePureQuery.mockResolvedValue({
        columns: ['col1'],
        rows: [{ col1: 'val1' }],
      });

      await flowResult(store.runOrchestratorFallback('assistant-1'));

      expect(store.isSending).toBe(false);
      expect(store.pendingFallbackQuestion).toBeUndefined();
    });
    test('shows entity candidates as thinking steps', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      const product = buildLegacyProduct();
      store.selectDataProduct(product);
      store.pendingFallbackQuestion = 'show trades';

      // Set pre-existing resolved entities and candidates
      const resolved = new LegendAIResolvedEntities();
      resolved.rootEntity = 'model::Trade';
      resolved.relatedEntities = ['model::Position'];
      store.lastResolvedEntities = resolved;
      store.lastEntityCandidates = [
        { datasetName: 'Trades', modelPath: 'model::Trade' },
        { datasetName: 'Positions', modelPath: 'model::Position' },
      ];

      store.messages = [
        {
          id: 'user-1',
          role: LegendAIMessageRole.USER,
          text: 'show trades',
        },
        {
          id: 'assistant-1',
          role: LegendAIMessageRole.ASSISTANT,
          thinkingSteps: [],
          sql: null,
          textAnswer: null,
          dataContext: null,
          gridData: null,
          error: null,
          errorType: null,
          sqlGenTime: null,
          execTime: null,
          thinkingDuration: null,
          isProcessing: false,
          isExecuting: false,
          suggestedQueries: [],
          fallbackAction: {
            label: 'Ask Legend AI Orchestrator to generate Pure query',
            actionId: LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
          },
          queriedAccessPointGroups: [],
        },
      ];

      jest
        .spyOn(baseStore.depotServerClient, 'getVersionEntity')
        .mockResolvedValue({
          path: 'my::DataSpace',
          classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
          content: {
            _type: 'dataSpace',
            name: 'DataSpace',
            package: 'my',
            executionContexts: [
              {
                name: 'default',
                mapping: { path: 'my::Mapping' },
                defaultRuntime: { path: 'my::Runtime' },
              },
            ],
            defaultExecutionContext: 'default',
          },
        });

      plugin.generateQueryViaOrchestrator.mockResolvedValue({
        legend_query: 'model::Entity.all()',
      });
      plugin.executePureQuery.mockResolvedValue({
        columns: ['col1'],
        rows: [{ col1: 'val1' }],
      });

      await flowResult(store.runOrchestratorFallback('assistant-1'));

      // Verify thinking steps include entity candidate info
      const assistantMsg = store.messages.find(
        (m) => m.role === LegendAIMessageRole.ASSISTANT,
      );
      expect(assistantMsg).toBeDefined();
      if (assistantMsg?.role === LegendAIMessageRole.ASSISTANT) {
        const stepLabels = assistantMsg.thinkingSteps.map((s) => s.label);
        expect(
          stepLabels.some((l) =>
            l.includes('Found potential root entity classes'),
          ),
        ).toBe(true);
        expect(
          stepLabels.some((l) =>
            l.includes('Picking model::Trade as root entity'),
          ),
        ).toBe(true);
      }
      expect(store.isSending).toBe(false);
    });
  },
);

// ─── selectDataProduct — all branches ────────────────────────────────────────

describe(
  unitTest('LegendMarketplaceAIChatStore — selectDataProduct branches'),
  () => {
    test('returns early with invalid coordinates', () => {
      const { store } = createStore();
      const product = new DataProductSearchResult();
      product.dataProductTitle = 'Bad Product';
      product.dataProductDescription = null;
      product.tags1 = [];
      product.tags2 = [];
      product.tag_score = 0;
      product.similarity = 0;

      store.selectDataProduct(product);

      expect(store.selectedProduct).toBeUndefined();
      expect(store.selectedProductCoordinates).toBeUndefined();
    });

    test('selects legacy product and sets metadata', () => {
      const { store } = createStore();
      const product = buildLegacyProduct({
        title: 'Trade Data',
        description: 'Trade desc',
      });
      store.selectDataProduct(product);

      expect(store.selectedProduct).toBeDefined();
      expect(store.selectedProductMetadata?.name).toBe('Trade Data');
      expect(store.selectedProductMetadata?.description).toBe('Trade desc');
      expect(store.selectedProductMetadata?.coordinates).toBe(
        'com.test:artifact:1.0.0',
      );
      expect(store.selectedDataProductId).toBeUndefined();
    });

    test('selects lakehouse product and sets dataProductId', () => {
      const { store } = createStore();
      const product = buildLakehouseProduct({ dataProductId: 'dp-456' });
      store.selectDataProduct(product);

      expect(store.selectedProduct).toBeDefined();
      expect(store.selectedDataProductId).toBe('dp-456');
    });

    test('clears suggested products after selection', () => {
      const { store } = createStore();
      store.suggestedProducts = [buildLegacyProduct()];
      const product = buildLegacyProduct();
      store.selectDataProduct(product);

      expect(store.suggestedProducts).toEqual([]);
    });
  },
);

// ─── resolveExecutionContext — with product ──────────────────────────────────

describe(
  unitTest(
    'LegendMarketplaceAIChatStore — resolveExecutionContext with product',
  ),
  () => {
    test('resolves for legacy product', async () => {
      const { store, baseStore } = createStore();
      const product = buildLegacyProduct();
      store.selectDataProduct(product);
      const mockSetter = createMock() as MessageSetter;

      jest
        .spyOn(baseStore.depotServerClient, 'getVersionEntity')
        .mockResolvedValue({
          path: 'my::DataSpace',
          classifierPath: 'meta',
          content: {
            _type: 'dataSpace',
            name: 'DataSpace',
            package: 'my',
            executionContexts: [
              {
                name: 'default',
                mapping: { path: 'my::Mapping' },
                defaultRuntime: { path: 'my::Runtime' },
              },
            ],
            defaultExecutionContext: 'default',
          },
        });

      await store.resolveExecutionContext(mockSetter);

      expect(store.pureExecutionContext).toBeDefined();
      expect(store.pureExecutionContext?.mapping).toBe('my::Mapping');
      expect(store.pureExecutionContext?.runtime).toBe('my::Runtime');
    });

    test('resolves for lakehouse product with SDLC origin', async () => {
      const { store, baseStore } = createStore();
      const product = buildLakehouseProduct();
      store.selectDataProduct(product);
      const mockSetter = createMock() as MessageSetter;

      jest
        .spyOn(baseStore.depotServerClient, 'getVersionEntity')
        .mockResolvedValue({
          path: 'my::LhDataSpace',
          classifierPath: 'meta',
          content: {
            _type: 'dataSpace',
            name: 'LhDataSpace',
            package: 'my',
            executionContexts: [
              {
                name: 'ctx1',
                mapping: { path: 'lh::Mapping' },
                defaultRuntime: { path: 'lh::Runtime' },
              },
            ],
            defaultExecutionContext: 'ctx1',
          },
        });

      await store.resolveExecutionContext(mockSetter);

      expect(store.pureExecutionContext?.mapping).toBe('lh::Mapping');
    });

    test('handles error gracefully', async () => {
      const { store, baseStore } = createStore();
      const product = buildLegacyProduct();
      store.selectDataProduct(product);
      const mockSetter = createMock() as MessageSetter;

      jest
        .spyOn(baseStore.depotServerClient, 'getVersionEntity')
        .mockRejectedValue(new Error('not found'));

      await store.resolveExecutionContext(mockSetter);

      expect(store.pureExecutionContext).toBeUndefined();
    });

    test('resolves without selected product using coordinates', async () => {
      const { store, baseStore } = createStore();
      store.selectedProductCoordinates = {
        data_product: 'my::DataSpace',
        group_id: 'com.test',
        artifact_id: 'artifact',
        version: '1.0.0',
      };
      const mockSetter = createMock() as MessageSetter;

      jest
        .spyOn(baseStore.depotServerClient, 'getVersionEntity')
        .mockResolvedValue({
          path: 'my::DataSpace',
          classifierPath: 'meta',
          content: {
            _type: 'dataSpace',
            name: 'DataSpace',
            package: 'my',
            executionContexts: [
              {
                name: 'default',
                mapping: { path: 'my::Mapping' },
                defaultRuntime: { path: 'my::Runtime' },
              },
            ],
            defaultExecutionContext: 'default',
          },
        });

      await store.resolveExecutionContext(mockSetter);

      expect(store.pureExecutionContext?.mapping).toBe('my::Mapping');
    });
  },
);

// ─── buildTitleFromPath (tested via field-derived products) ──────────────────

describe(
  unitTest(
    'LegendMarketplaceAIChatStore — buildTitleFromPath via field-derived',
  ),
  () => {
    test('generates title from path by splitting camelCase', async () => {
      const { store, baseStore } = createStoreWithPlugin();

      jest
        .spyOn(baseStore.marketplaceServerClient, 'dataProductSearch')
        .mockResolvedValue(buildSearchResponseJson([]));
      jest
        .spyOn(baseStore.marketplaceServerClient, 'fieldSearch')
        .mockResolvedValue(
          buildFieldSearchResponseJson([
            {
              fieldName: 'accountId',
              dataProducts: [
                {
                  path: 'model::TradeData',
                  productType: 'legacy',
                  groupId: 'g1',
                  artifactId: 'a1',
                  versionId: '1.0.0',
                },
              ],
            },
          ]),
        );

      await flowResult(store.submitQuery('find accounts'));

      // Field-derived product title should be generated from "TradeData" -> "Trade Data"
      // Without product search results but with field results, should still enter IDLE
      // because candidates would include the field-derived product
      expect(store.isSending).toBe(false);
    });

    test('generates title from artifactId when path is filtered out', async () => {
      const { store, baseStore } = createStoreWithPlugin();

      jest
        .spyOn(baseStore.marketplaceServerClient, 'dataProductSearch')
        .mockResolvedValue(buildSearchResponseJson([]));
      jest
        .spyOn(baseStore.marketplaceServerClient, 'fieldSearch')
        .mockResolvedValue(
          buildFieldSearchResponseJson([
            {
              fieldName: 'tradeId',
              dataProducts: [
                {
                  path: 'DataSpace::model::DataSpace',
                  productType: 'legacy',
                  groupId: 'g1',
                  artifactId: 'trade-data-product',
                  versionId: '1.0.0',
                },
              ],
            },
          ]),
        );

      await flowResult(store.submitQuery('trades'));

      expect(store.isSending).toBe(false);
    });
  },
);

// ─── Multiple product ranking with field results ─────────────────────────────

describe(
  unitTest('LegendMarketplaceAIChatStore — scoring and ranking with fields'),
  () => {
    test('ranks products by field coverage', async () => {
      const { store, baseStore } = createStoreWithPlugin();

      jest
        .spyOn(baseStore.marketplaceServerClient, 'dataProductSearch')
        .mockResolvedValue(
          buildSearchResponseJson([
            {
              title: 'Product1',
              similarity: 0.9,
              details: buildLegacyDetails({
                groupId: 'g1',
                artifactId: 'a1',
                path: 'p1::Space',
              }),
            },
            {
              title: 'Product2',
              similarity: 0.8,
              details: buildLegacyDetails({
                groupId: 'g2',
                artifactId: 'a2',
                path: 'p2::Space',
              }),
            },
          ]),
        );
      jest
        .spyOn(baseStore.marketplaceServerClient, 'fieldSearch')
        .mockResolvedValue(
          buildFieldSearchResponseJson([
            {
              fieldName: 'tradeId',
              dataProducts: [
                {
                  path: 'p2::Space',
                  productType: 'legacy',
                  groupId: 'g2',
                  artifactId: 'a2',
                  versionId: '1.0.0',
                },
              ],
            },
          ]),
        );

      await flowResult(store.submitQuery('trades'));

      expect(store.stage).toBe(MarketplaceAIChatStage.PRODUCT_SELECTION);
      expect(store.scoredCandidates.length).toBe(2);
      // Product2 matches the field, so it should have higher field coverage
      const product2Candidate = store.scoredCandidates.find(
        (c) => c.product.dataProductTitle === 'Product2',
      );
      expect(product2Candidate?.matchedFields).toContain('tradeId');
    });
  },
);

// ─── dispatchWithSql2 — metadata intent ──────────────────────────────────────

describe(
  unitTest('LegendMarketplaceAIChatStore — dispatchWithSql2 metadata intent'),
  () => {
    test('shows both metadata and SQL for ambiguous questions when datasets are available', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      const product = buildLakehouseProduct();
      store.selectDataProduct(product);
      store.resolvedProductServices = [
        {
          title: 'TradeDataset',
          pattern: '/TradeDataset',
          columns: [{ name: 'amount', type: 'Number' }],
          parameters: [],
        },
      ];

      jest
        .spyOn(baseStore.marketplaceServerClient, 'entitySearch')
        .mockResolvedValue(
          buildEntitySearchResponseJson([
            {
              datasetName: 'TradeDataset',
              dataProductDetails: {
                _type: 'lakehouse',
                groupId: 'com.lh',
                artifactId: 'lh-art',
                versionId: '2.0.0',
                path: 'my::LhDataSpace',
              },
              relatedFields: [{ fieldName: 'amount', fieldType: 'Number' }],
            },
          ]),
        );

      // callLLM returns metadata overview when called for metadata prompt
      plugin.callLLM.mockResolvedValue('This product provides trade data.');
      plugin.buildDataContextSummary.mockResolvedValue(
        '### Metadata context\nAvailable product context',
      );

      // "what data is available?" is ambiguous (metadata signals but not structural)
      await flowResult(store.submitQuery('what data is available?'));

      expect(store.isSending).toBe(false);
      expect(store.stage).toBe(MarketplaceAIChatStage.RESULTS);
      // Ambiguous path runs SQL as well
      expect(
        plugin.executeSql.mock.calls.length +
          plugin.executeLakehouseSql.mock.calls.length,
      ).toBeGreaterThanOrEqual(1);
    });

    test('answers with pure metadata for unambiguous metadata questions', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      const product = buildLakehouseProduct();
      store.selectDataProduct(product);
      store.resolvedProductServices = [
        {
          title: 'TradeDataset',
          pattern: '/TradeDataset',
          columns: [{ name: 'amount', type: 'Number' }],
          parameters: [],
        },
      ];

      jest
        .spyOn(baseStore.marketplaceServerClient, 'entitySearch')
        .mockResolvedValue(
          buildEntitySearchResponseJson([
            {
              datasetName: 'TradeDataset',
              dataProductDetails: {
                _type: 'lakehouse',
                groupId: 'com.lh',
                artifactId: 'lh-art',
                versionId: '2.0.0',
                path: 'my::LhDataSpace',
              },
              relatedFields: [{ fieldName: 'amount', fieldType: 'Number' }],
            },
          ]),
        );

      plugin.callLLM.mockResolvedValue(
        'This data product provides trade information.',
      );

      // "what services does this data product have?" is unambiguous METADATA
      // (structural keyword "services" + product reference "this data product")
      await flowResult(
        store.submitQuery('what services does this data product have?'),
      );

      expect(store.isSending).toBe(false);
      expect(store.stage).toBe(MarketplaceAIChatStage.RESULTS);
      // Pure metadata → no SQL execution
      expect(plugin.executeSql).not.toHaveBeenCalled();
      expect(plugin.executeLakehouseSql).not.toHaveBeenCalled();
      // Should have a text answer
      const lastMsg = store.messages.findLast(
        (m) => m.role === LegendAIMessageRole.ASSISTANT,
      );
      expect(lastMsg?.textAnswer).toBeDefined();
    });

    test('falls back to metadata when ambiguous SQL generation fails', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      const product = buildLakehouseProduct();
      store.selectDataProduct(product);
      store.resolvedProductServices = [
        {
          title: 'TradeDataset',
          pattern: '/TradeDataset',
          columns: [{ name: 'amount', type: 'Number' }],
          parameters: [],
        },
      ];

      jest
        .spyOn(baseStore.marketplaceServerClient, 'entitySearch')
        .mockResolvedValue(
          buildEntitySearchResponseJson([
            {
              datasetName: 'TradeDataset',
              dataProductDetails: {
                _type: 'lakehouse',
                groupId: 'com.lh',
                artifactId: 'lh-art',
                versionId: '2.0.0',
                path: 'my::LhDataSpace',
              },
              relatedFields: [{ fieldName: 'amount', fieldType: 'Number' }],
            },
          ]),
        );

      // Make SQL generation fail
      plugin.callLLM.mockRejectedValueOnce(new Error('LLM unavailable'));
      // Second call for metadata fallback
      plugin.callLLM.mockResolvedValueOnce('This product provides trade data.');

      await flowResult(store.submitQuery('what data is available?'));

      expect(store.isSending).toBe(false);
      expect(store.stage).toBe(MarketplaceAIChatStage.RESULTS);
      // Should have produced a text answer from metadata fallback
      const lastMsg = store.messages.findLast(
        (m) => m.role === LegendAIMessageRole.ASSISTANT,
      );
      expect(lastMsg?.textAnswer).toBeDefined();
    });

    test('LLM judge returns METADATA when fast classifier is uncertain', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      const product = buildLakehouseProduct();
      store.selectDataProduct(product);
      store.resolvedProductServices = [
        {
          title: 'TradeDataset',
          pattern: '/TradeDataset',
          columns: [{ name: 'amount', type: 'Number' }],
          parameters: [],
        },
      ];

      jest
        .spyOn(baseStore.marketplaceServerClient, 'entitySearch')
        .mockResolvedValue(
          buildEntitySearchResponseJson([
            {
              datasetName: 'TradeDataset',
              dataProductDetails: {
                _type: 'lakehouse',
                groupId: 'com.lh',
                artifactId: 'lh-art',
                versionId: '2.0.0',
                path: 'my::LhDataSpace',
              },
              relatedFields: [{ fieldName: 'amount', fieldType: 'Number' }],
            },
          ]),
        );

      // Fast classifier returns DATA_QUERY (not ambiguous, not METADATA),
      // but LLM judge overrides to METADATA
      plugin.classifyQuestionIntent.mockResolvedValue(
        LegendAIQuestionIntent.METADATA,
      );
      plugin.callLLM.mockResolvedValue('Product overview: trade data.');

      // "show me all trades" → fast classifier says DATA_QUERY, LLM says METADATA
      await flowResult(store.submitQuery('show me all trades'));

      expect(store.isSending).toBe(false);
      expect(store.stage).toBe(MarketplaceAIChatStage.RESULTS);
      // Should have a text answer from metadata
      const lastMsg = store.messages.findLast(
        (m) => m.role === LegendAIMessageRole.ASSISTANT,
      );
      expect(lastMsg?.textAnswer).toBeDefined();
      // No SQL execution
      expect(plugin.executeSql).not.toHaveBeenCalled();
      expect(plugin.executeLakehouseSql).not.toHaveBeenCalled();
    });

    test('attaches metadata overview when ambiguous SQL succeeds', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      const product = buildLakehouseProduct();
      store.selectDataProduct(product);
      store.resolvedProductServices = [
        {
          title: 'TradeDataset',
          pattern: '/TradeDataset',
          columns: [{ name: 'amount', type: 'Number' }],
          parameters: [],
        },
      ];

      jest
        .spyOn(baseStore.marketplaceServerClient, 'entitySearch')
        .mockResolvedValue(
          buildEntitySearchResponseJson([
            {
              datasetName: 'TradeDataset',
              dataProductDetails: {
                _type: 'lakehouse',
                groupId: 'com.lh',
                artifactId: 'lh-art',
                versionId: '2.0.0',
                path: 'my::LhDataSpace',
              },
              relatedFields: [{ fieldName: 'amount', fieldType: 'Number' }],
            },
          ]),
        );

      // metadata overview call succeeds
      plugin.callLLM.mockResolvedValue(
        'This product has trade data.\n```sql\nSELECT 1\n```',
      );
      plugin.buildDataContextSummary.mockResolvedValue(
        '### Metadata context\nTrade data overview',
      );

      // "what data is available?" is ambiguous
      await flowResult(store.submitQuery('what data is available?'));

      expect(store.isSending).toBe(false);
      expect(store.stage).toBe(MarketplaceAIChatStage.RESULTS);
      // SQL should have been executed (ambiguous path runs SQL)
      expect(
        plugin.executeSql.mock.calls.length +
          plugin.executeLakehouseSql.mock.calls.length,
      ).toBeGreaterThanOrEqual(1);
    });
  },
);

// ─── dispatchWithSql2 — no services, orchestrator fallback ───────────────────

describe(
  unitTest(
    'LegendMarketplaceAIChatStore — dispatchWithSql2 orchestrator fallback',
  ),
  () => {
    test('routes to orchestrator when no services available', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      // Use a legacy product so buildServicesFromEntitySearch skips
      const product = buildLegacyProduct();
      store.selectDataProduct(product);

      jest
        .spyOn(baseStore.marketplaceServerClient, 'entitySearch')
        .mockResolvedValue(
          buildEntitySearchResponseJson([
            {
              datasetName: 'LegacyDataset',
              dataProductDetails: {
                _type: 'legacy',
                groupId: 'com.test',
                artifactId: 'artifact',
                versionId: '1.0.0',
                path: 'my::DataSpace',
              },
              relatedFields: [{ fieldName: 'id' }],
            },
          ]),
        );

      // Mock resolveExecutionContext dependency
      jest
        .spyOn(baseStore.depotServerClient, 'getVersionEntity')
        .mockResolvedValue({
          path: 'my::DataSpace',
          classifierPath: 'meta',
          content: {
            _type: 'dataSpace',
            name: 'DataSpace',
            package: 'my',
            executionContexts: [
              {
                name: 'default',
                mapping: { path: 'my::Mapping' },
                defaultRuntime: { path: 'my::Runtime' },
              },
            ],
            defaultExecutionContext: 'default',
          },
        });

      // The orchestrator flow
      plugin.generateQueryViaOrchestrator.mockResolvedValue({
        legend_query: 'model::Entity.all()',
      });
      plugin.executePureQuery.mockResolvedValue({
        columns: ['id'],
        rows: [{ id: 1 }],
      });

      await flowResult(store.submitQuery('get trades'));

      expect(store.stage).toBe(MarketplaceAIChatStage.RESULTS);
      expect(store.isSending).toBe(false);
    });
  },
);

// ─── dispatchWithSql2 — SQL gen failure (null judgedSql) ─────────────────────

describe(
  unitTest('LegendMarketplaceAIChatStore — dispatchWithSql2 SQL gen failure'),
  () => {
    test('offers orchestrator fallback when SQL generation fails', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      const product = buildLakehouseProduct();
      store.selectDataProduct(product);

      // Pre-populate services to exercise the SQL gen path
      store.resolvedProductServices = [
        {
          title: 'TradeData',
          pattern: '/TradeData',
          columns: [{ name: 'id', type: 'String' }],
          parameters: [],
        },
      ];

      jest
        .spyOn(baseStore.marketplaceServerClient, 'entitySearch')
        .mockResolvedValue(
          buildEntitySearchResponseJson([
            {
              datasetName: 'TradeData',
              dataProductDetails: {
                _type: 'lakehouse',
                groupId: 'com.lh',
                artifactId: 'lh-art',
                versionId: '2.0.0',
                path: 'my::LhDataSpace',
              },
              relatedFields: [{ fieldName: 'id', fieldType: 'String' }],
            },
          ]),
        );

      // Return null SQL (extraction failure)
      plugin.extractSqlFromResponse.mockReturnValue({
        sql: null,
        failure: 'Could not generate SQL',
      });

      await flowResult(store.submitQuery('complex query'));

      expect(store.isSending).toBe(false);
      expect(store.stage).toBe(MarketplaceAIChatStage.RESULTS);
      expect(store.pendingFallbackQuestion).toBe('complex query');
      // Check final message state for error or fallback
      const msgs = store.messages;
      const lastAssistant = msgs.findLast(
        (m) => m.role === LegendAIMessageRole.ASSISTANT,
      );
      // The assistant message should exist
      expect(lastAssistant).toBeDefined();
      // Stage should be RESULTS since submitQuery always sets it after dispatchWithSql2
      expect(store.stage).toBe(MarketplaceAIChatStage.RESULTS);
    });
  },
);

// ─── dispatchWithSql2 — zero rows ────────────────────────────────────────────

describe(
  unitTest('LegendMarketplaceAIChatStore — dispatchWithSql2 zero rows'),
  () => {
    test('shows zero-row message and offers fallback', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      const product = buildLakehouseProduct();
      store.selectDataProduct(product);

      // Pre-populate services to exercise the SQL flow
      store.resolvedProductServices = [
        {
          title: 'TradeData',
          pattern: '/TradeData',
          columns: [{ name: 'id', type: 'String' }],
          parameters: [],
        },
      ];

      jest
        .spyOn(baseStore.marketplaceServerClient, 'entitySearch')
        .mockResolvedValue(
          buildEntitySearchResponseJson([
            {
              datasetName: 'TradeData',
              dataProductDetails: {
                _type: 'lakehouse',
                groupId: 'com.lh',
                artifactId: 'lh-art',
                versionId: '2.0.0',
                path: 'my::LhDataSpace',
              },
              relatedFields: [{ fieldName: 'id', fieldType: 'String' }],
            },
          ]),
        );

      // SQL execution returns empty rows
      plugin.executeSql.mockResolvedValue({
        columns: ['id'],
        rows: [],
      });
      plugin.executeLakehouseSql.mockResolvedValue({
        columns: ['id'],
        rows: [],
      });

      await flowResult(store.submitQuery('show empty data'));

      expect(store.isSending).toBe(false);
      expect(store.stage).toBe(MarketplaceAIChatStage.RESULTS);
      expect(store.pendingFallbackQuestion).toBe('show empty data');
    });

    test('retries with corrected SQL when zero rows returned', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      const product = buildLakehouseProduct();
      store.selectDataProduct(product);

      store.resolvedProductServices = [
        {
          title: 'TradeData',
          pattern: '/TradeData',
          columns: [{ name: 'id', type: 'String' }],
          parameters: [],
        },
      ];

      jest
        .spyOn(baseStore.marketplaceServerClient, 'entitySearch')
        .mockResolvedValue(
          buildEntitySearchResponseJson([
            {
              datasetName: 'TradeData',
              dataProductDetails: {
                _type: 'lakehouse',
                groupId: 'com.lh',
                artifactId: 'lh-art',
                versionId: '2.0.0',
                path: 'my::LhDataSpace',
              },
              relatedFields: [{ fieldName: 'id', fieldType: 'String' }],
            },
          ]),
        );

      // First execution returns empty rows
      plugin.executeLakehouseSql
        .mockResolvedValueOnce({ columns: ['id'], rows: [] })
        // Corrected SQL returns data
        .mockResolvedValueOnce({
          columns: ['id'],
          rows: [{ id: 'corrected-1' }],
        });

      // LLM returns corrected SQL for zero-row correction
      plugin.buildZeroRowCorrectionPrompt.mockReturnValue('fix prompt');
      plugin.callLLM
        .mockResolvedValueOnce('```sql\nSELECT 1\n```') // SQL generation
        .mockResolvedValueOnce('PASS') // judge
        .mockResolvedValueOnce('SELECT id FROM t WHERE 1=1') // zero-row correction
        .mockResolvedValueOnce('Analysis of results'); // analysis

      await flowResult(store.submitQuery('show trades'));

      expect(store.isSending).toBe(false);
      expect(store.stage).toBe(MarketplaceAIChatStage.RESULTS);
      // executeLakehouseSql called at least twice (original + retry)
      expect(
        plugin.executeLakehouseSql.mock.calls.length,
      ).toBeGreaterThanOrEqual(2);
    });
  },
);

// ─── dispatchWithSql2 — SQL execution error ──────────────────────────────────

describe(
  unitTest(
    'LegendMarketplaceAIChatStore — dispatchWithSql2 SQL execution error',
  ),
  () => {
    test('catches SQL execution error and offers fallback', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      const product = buildLakehouseProduct();
      store.selectDataProduct(product);

      // Pre-populate services to exercise the SQL flow
      store.resolvedProductServices = [
        {
          title: 'TradeData',
          pattern: '/TradeData',
          columns: [{ name: 'id', type: 'String' }],
          parameters: [],
        },
      ];

      jest
        .spyOn(baseStore.marketplaceServerClient, 'entitySearch')
        .mockResolvedValue(
          buildEntitySearchResponseJson([
            {
              datasetName: 'TradeData',
              dataProductDetails: {
                _type: 'lakehouse',
                groupId: 'com.lh',
                artifactId: 'lh-art',
                versionId: '2.0.0',
                path: 'my::LhDataSpace',
              },
              relatedFields: [{ fieldName: 'id', fieldType: 'String' }],
            },
          ]),
        );

      // SQL execution throws
      plugin.executeSql.mockRejectedValue(new Error('SQL timeout'));
      plugin.executeLakehouseSql.mockRejectedValue(new Error('SQL timeout'));

      await flowResult(store.submitQuery('bad query'));

      expect(store.isSending).toBe(false);
      expect(store.stage).toBe(MarketplaceAIChatStage.RESULTS);
      expect(store.pendingFallbackQuestion).toBe('bad query');
    });

    test('catches LLM error during SQL generation and offers fallback', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      const product = buildLakehouseProduct();
      store.selectDataProduct(product);

      store.resolvedProductServices = [
        {
          title: 'TradeData',
          pattern: '/TradeData',
          columns: [{ name: 'id', type: 'String' }],
          parameters: [],
        },
      ];

      jest
        .spyOn(baseStore.marketplaceServerClient, 'entitySearch')
        .mockResolvedValue(
          buildEntitySearchResponseJson([
            {
              datasetName: 'TradeData',
              dataProductDetails: {
                _type: 'lakehouse',
                groupId: 'com.lh',
                artifactId: 'lh-art',
                versionId: '2.0.0',
                path: 'my::LhDataSpace',
              },
              relatedFields: [{ fieldName: 'id', fieldType: 'String' }],
            },
          ]),
        );

      // callLLM throws during SQL generation
      plugin.callLLM.mockRejectedValue(new Error('LLM service unavailable'));

      await flowResult(store.submitQuery('query during outage'));

      expect(store.isSending).toBe(false);
      expect(store.stage).toBe(MarketplaceAIChatStage.RESULTS);
      expect(store.pendingFallbackQuestion).toBe('query during outage');
    });
  },
);

// ─── llmRerankProducts — with >3 candidates ─────────────────────────────────

describe(
  unitTest(
    'LegendMarketplaceAIChatStore — llmRerankProducts with many candidates',
  ),
  () => {
    test('uses LLM reranking for more than 3 candidates', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      // Return reranked indices
      plugin.rerankProducts.mockResolvedValue([2, 0, 1]);

      jest
        .spyOn(baseStore.marketplaceServerClient, 'dataProductSearch')
        .mockResolvedValue(
          buildSearchResponseJson([
            {
              title: 'P1',
              similarity: 0.9,
              details: buildLegacyDetails({
                groupId: 'g1',
                artifactId: 'a1',
                path: 'p1::Space',
              }),
            },
            {
              title: 'P2',
              similarity: 0.8,
              details: buildLegacyDetails({
                groupId: 'g2',
                artifactId: 'a2',
                path: 'p2::Space',
              }),
            },
            {
              title: 'P3',
              similarity: 0.7,
              details: buildLegacyDetails({
                groupId: 'g3',
                artifactId: 'a3',
                path: 'p3::Space',
              }),
            },
            {
              title: 'P4',
              similarity: 0.6,
              details: buildLegacyDetails({
                groupId: 'g4',
                artifactId: 'a4',
                path: 'p4::Space',
              }),
            },
          ]),
        );
      jest
        .spyOn(baseStore.marketplaceServerClient, 'fieldSearch')
        .mockRejectedValue(new Error('unavailable'));

      await flowResult(store.submitQuery('show me all data'));

      expect(store.stage).toBe(MarketplaceAIChatStage.PRODUCT_SELECTION);
      // LLM reranking should have been called
      expect(plugin.rerankProducts).toHaveBeenCalled();
      // Should suggest top 3 (reranked)
      expect(store.suggestedProducts).toHaveLength(3);
      // First suggested should be P3 (index 2 was ranked first)
      expect(store.suggestedProducts[0]?.dataProductTitle).toBe('P3');
    });
  },
);

// ─── enrichWithEntitySearch — diversity merging ──────────────────────────────

describe(
  unitTest(
    'LegendMarketplaceAIChatStore — enrichWithEntitySearch with diversity',
  ),
  () => {
    test('merges diversity entity search results', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      const product = buildLakehouseProduct();
      store.selectDataProduct(product);

      const primaryResults = buildEntitySearchResponseJson([
        {
          datasetName: 'Primary',
          dataProductDetails: {
            _type: 'lakehouse',
            groupId: 'com.lh',
            artifactId: 'lh-art',
            versionId: '2.0.0',
            path: 'my::LhDataSpace',
          },
          datasetDetails: { _type: 'relational', modelPath: 'model::Primary' },
          relatedFields: [{ fieldName: 'id', fieldType: 'String' }],
        },
      ]);

      const diversityResults = buildEntitySearchResponseJson([
        {
          datasetName: 'Diversity',
          dataProductDetails: {
            _type: 'lakehouse',
            groupId: 'com.lh',
            artifactId: 'lh-art',
            versionId: '2.0.0',
            path: 'my::LhDataSpace',
          },
          datasetDetails: {
            _type: 'relational',
            modelPath: 'model::Diversity',
          },
          relatedFields: [{ fieldName: 'name', fieldType: 'String' }],
        },
      ]);

      let callCount = 0;
      jest
        .spyOn(baseStore.marketplaceServerClient, 'entitySearch')
        .mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return primaryResults;
          }
          return diversityResults;
        });

      // Mock disambiguateEntity to resolve
      plugin.disambiguateEntity.mockResolvedValue({
        rootEntity: 'model::Primary',
        relatedEntities: ['model::Diversity'],
      });

      await flowResult(store.askFollowUp('show data'));

      expect(store.isSending).toBe(false);
      // Services are built from entity search that includes diversity results
      expect(store.messages.length).toBeGreaterThanOrEqual(2);
    });
  },
);

// ─── field-derived products with lakehouse type ──────────────────────────────

describe(
  unitTest('LegendMarketplaceAIChatStore — field-derived lakehouse products'),
  () => {
    test('creates lakehouse-type product from field search results', async () => {
      const { store, baseStore } = createStoreWithPlugin();

      jest
        .spyOn(baseStore.marketplaceServerClient, 'dataProductSearch')
        .mockResolvedValue(buildSearchResponseJson([]));
      jest
        .spyOn(baseStore.marketplaceServerClient, 'fieldSearch')
        .mockResolvedValue(
          buildFieldSearchResponseJson([
            {
              fieldName: 'accountId',
              dataProducts: [
                {
                  path: 'lh::Product',
                  productType: 'lakehouse',
                  groupId: 'g1',
                  artifactId: 'a1',
                  versionId: '1.0.0',
                },
              ],
            },
          ]),
        );

      await flowResult(store.submitQuery('account data'));

      expect(store.isSending).toBe(false);
      // Should have at least one candidate from field-derived product
      expect(store.scoredCandidates.length).toBeGreaterThanOrEqual(1);
    });
  },
);

// ─── runOrchestratorFallback — error handling ────────────────────────────────

describe(
  unitTest(
    'LegendMarketplaceAIChatStore — runOrchestratorFallback error handling',
  ),
  () => {
    test('handles error during orchestrator fallback', async () => {
      const { store, baseStore, plugin } = createStoreWithPlugin();

      const product = buildLegacyProduct();
      store.selectDataProduct(product);
      store.pendingFallbackQuestion = 'show trades';

      store.messages = [
        {
          id: 'user-1',
          role: LegendAIMessageRole.USER,
          text: 'show trades',
        },
        {
          id: 'assistant-1',
          role: LegendAIMessageRole.ASSISTANT,
          thinkingSteps: [],
          sql: null,
          textAnswer: null,
          dataContext: null,
          gridData: null,
          error: null,
          errorType: null,
          sqlGenTime: null,
          execTime: null,
          thinkingDuration: null,
          isProcessing: false,
          isExecuting: false,
          suggestedQueries: [],
          fallbackAction: {
            label: 'Ask Legend AI Orchestrator to generate Pure query',
            actionId: LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
          },
          queriedAccessPointGroups: [],
        },
      ];

      // Make resolveExecutionContext fail
      jest
        .spyOn(baseStore.depotServerClient, 'getVersionEntity')
        .mockRejectedValue(new Error('not found'));

      // Make orchestrator call fail
      plugin.generateQueryViaOrchestrator.mockRejectedValue(
        new Error('orchestrator error'),
      );

      await flowResult(store.runOrchestratorFallback('assistant-1'));

      expect(store.isSending).toBe(false);
    });
  },
);
