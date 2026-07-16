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

import {
  action,
  computed,
  flow,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import {
  type GeneratorFn,
  type PlainObject,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import {
  type LegendAIMessage,
  type LegendAIConfig,
  type LegendAIProductMetadata,
  type LegendAIOrchestratorDataProductCoordinates,
  type LegendAIConversationTurn,
  type LegendAIOperationContext,
  type TDSServiceSchema,
  type LegendAIEntityCandidate,
  type LegendAI_LegendApplicationPlugin_Extension,
  type MessageSetter,
  LegendAIMessageRole,
  LegendAIQuestionIntent,
  LegendAIResolvedEntities,
  TDSServiceSourceType,
  classifyQuestionIntentFast,
  findLegendAIPlugin,
  processQuestionViaOrchestrator,
  handleMetadataQuestion,
  buildMetadataOverview,
  attachMetadataOverview,
  generateAndJudgeSql,
  executeSqlAndReport,
  analyzeOrchestratorResults,
  addThinkingStep,
  completeThinkingSteps,
  finishWithThinkingError,
  classifyError,
  updateLastAssistant,
  buildConversationHistory,
  createMessagePair,
  elapsedSeconds,
  LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
  cleanLlmSqlResponse,
  isValidSqlCorrection,
} from '@finos/legend-lego/legend-ai';
import {
  QueryExplicitExecutionContextInfo,
  extractElementNameFromPath,
} from '@finos/legend-graph';
import { generateGAVCoordinates } from '@finos/legend-storage';
import {
  type V1_DataSpace,
  V1_deserializeDataSpace,
} from '@finos/legend-extension-dsl-data-space/graph';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import { convertAutosuggestResultToSearchResult } from '../../utils/SearchUtils.js';
import {
  type AutosuggestResult,
  DataProductSearchResult,
  DataProductSearchResponse,
  DataProductDetailsType,
  DataProductSearchResultDetailsType,
  FieldSearchType,
  GroupedFieldSearchResponse,
  type GroupedFieldSearchResultEntry,
  LakehouseDataProductSearchResultDetails,
  LakehouseSDLCDataProductSearchResultOrigin,
  LegacyDataProductSearchResultDetails,
  EntitySearchResponse,
  type EntitySearchResult,
} from '@finos/legend-server-marketplace';

export enum MarketplaceAIChatStage {
  IDLE = 'idle',
  SEARCHING = 'searching',
  PRODUCT_SELECTION = 'product-selection',
  QUERYING = 'querying',
  RESULTS = 'results',
}

export interface ScoredProductCandidate {
  product: DataProductSearchResult;
  productSimilarity: number;
  fieldCoverage: number;
  fieldIntersection: number;
  matchedFields: string[];
  missingFields: string[];
  compositeScore: number;
}

const FIELD_COVERAGE_BOOST = 0.6;
const MAX_PRODUCT_SUGGESTIONS = 3;
const MERGED_CANDIDATE_LIMIT = 6;
const PRODUCT_SEARCH_PAGE_SIZE = 6;
const FIELD_SEARCH_PAGE_SIZE = 5;
const MAX_RELEVANT_SERVICES = 5;
const DESCRIPTION_PREVIEW_LENGTH = 200;
const DATASET_SEARCH_PAGE_SIZE = 20;

const DEFAULT_SUGGESTED_QUERIES = [
  'What BVAL bond pricing data is available?',
  'Show me credit risk data products',
  'Find FX rates and currency data',
  'What equity analytics data do we have?',
];

export function unwrapProductDetails(product: DataProductSearchResult): {
  groupId: string;
  artifactId: string;
  versionId: string;
  path: string;
} {
  const details = product.dataProductDetails;
  if (details instanceof LegacyDataProductSearchResultDetails) {
    return {
      groupId: details.groupId,
      artifactId: details.artifactId,
      versionId: details.versionId,
      path: details.path,
    };
  }
  if (details instanceof LakehouseDataProductSearchResultDetails) {
    const origin = details.origin;
    if (origin instanceof LakehouseSDLCDataProductSearchResultOrigin) {
      return {
        groupId: origin.groupId ?? '',
        artifactId: origin.artifactId ?? '',
        versionId: origin.versionId ?? '',
        path: origin.path ?? '',
      };
    }
  }
  return { groupId: '', artifactId: '', versionId: '', path: '' };
}

function toCoordinatesString(
  coords: LegendAIOrchestratorDataProductCoordinates,
): string {
  return generateGAVCoordinates(
    coords.group_id,
    coords.artifact_id,
    coords.version,
  );
}

export class LegendMarketplaceAIChatStore {
  readonly baseStore: LegendMarketplaceBaseStore;

  stage: MarketplaceAIChatStage = MarketplaceAIChatStage.IDLE;
  questionText = '';
  messages: LegendAIMessage[] = [];
  isSending = false;

  suggestedProducts: DataProductSearchResult[] = [];
  scoredCandidates: ScoredProductCandidate[] = [];
  scopeProducts: {
    name: string;
    coordinates: LegendAIOrchestratorDataProductCoordinates;
  }[] = [];
  selectedProduct: DataProductSearchResult | undefined = undefined;
  selectedProductCoordinates:
    | LegendAIOrchestratorDataProductCoordinates
    | undefined = undefined;
  selectedProductMetadata: LegendAIProductMetadata | undefined = undefined;
  pureExecutionContext: QueryExplicitExecutionContextInfo | undefined =
    undefined;
  pendingFallbackQuestion: string | undefined = undefined;
  resolvedProductServices: TDSServiceSchema[] = [];
  lastResolvedEntities: LegendAIResolvedEntities | undefined = undefined;
  lastEntityCandidates: {
    datasetName: string;
    modelPath: string;
    description?: string;
  }[] = [];
  selectedDataProductId: string | undefined = undefined;

  constructor(baseStore: LegendMarketplaceBaseStore) {
    makeObservable(this, {
      stage: observable,
      questionText: observable,
      messages: observable,
      isSending: observable,
      suggestedProducts: observable,
      scoredCandidates: observable,
      scopeProducts: observable,
      selectedProduct: observable,
      selectedProductCoordinates: observable,
      selectedProductMetadata: observable,
      pureExecutionContext: observable,
      pendingFallbackQuestion: observable,
      resolvedProductServices: observable,
      lastResolvedEntities: observable,
      lastEntityCandidates: observable,
      selectedDataProductId: observable,
      setQuestionText: action,
      setStage: action,
      clearChat: action,
      selectDataProduct: action,
      selectAutosuggestProduct: action,
      deselectProduct: action,
      addScopeProduct: action,
      removeScopeProduct: action,
      submitQuery: flow,
      askFollowUp: flow,
      runOrchestratorFallback: flow,
      config: computed,
      plugin: computed,
      isEnabled: computed,
      lastUserMessageText: computed,
      welcomeSuggestedQueries: computed,
    });
    this.baseStore = baseStore;
  }

  get config(): LegendAIConfig {
    return this.baseStore.applicationStore.config.legendAIConfig;
  }

  get plugin(): LegendAI_LegendApplicationPlugin_Extension | undefined {
    return findLegendAIPlugin(
      this.baseStore.pluginManager.getApplicationPlugins(),
    );
  }

  get isEnabled(): boolean {
    return this.config.enabled && this.plugin !== undefined;
  }

  get lastUserMessageText(): string {
    return (
      this.messages.findLast((m) => m.role === LegendAIMessageRole.USER)
        ?.text ?? ''
    );
  }

  get welcomeSuggestedQueries(): string[] {
    return (
      this.baseStore.applicationStore.config.options
        .defaultAISuggestedQueries ?? DEFAULT_SUGGESTED_QUERIES
    );
  }

  setQuestionText(text: string): void {
    this.questionText = text;
  }

  setStage(stage: MarketplaceAIChatStage): void {
    this.stage = stage;
  }

  clearChat(): void {
    this.messages = [];
    this.suggestedProducts = [];
    this.scoredCandidates = [];
    this.selectedProduct = undefined;
    const firstScope = this.scopeProducts[0];
    this.selectedProductCoordinates = firstScope?.coordinates;
    this.selectedProductMetadata = firstScope
      ? {
          name: firstScope.name,
          coordinates: toCoordinatesString(firstScope.coordinates),
          serviceSummaries: [],
        }
      : undefined;
    this.pureExecutionContext = undefined;
    this.pendingFallbackQuestion = undefined;
    this.resolvedProductServices = [];
    this.lastResolvedEntities = undefined;
    this.lastEntityCandidates = [];
    this.selectedDataProductId = undefined;
    this.stage = MarketplaceAIChatStage.IDLE;
    this.questionText = '';
    this.isSending = false;
  }

  private createMessageSetter(): MessageSetter {
    return (updater) => {
      runInAction(() => {
        if (typeof updater === 'function') {
          this.messages = updater(this.messages);
        } else {
          this.messages = updater;
        }
      });
    };
  }

  private buildContextPromise(
    question: string,
    metadata: LegendAIProductMetadata,
    setMessages: MessageSetter,
  ): Promise<void> {
    if (!this.plugin) {
      return Promise.resolve();
    }
    return this.plugin
      .buildDataContextSummary(question, metadata, this.config)
      .then((contextText) => {
        if (contextText) {
          updateLastAssistant(setMessages, () => ({
            dataContext: contextText,
          }));
        }
      })
      .catch(() => {
        /* Non-fatal */
      });
  }

  private buildConversationHistory(): LegendAIConversationTurn[] {
    return buildConversationHistory(this.messages);
  }

  private extractMetadata(
    result: DataProductSearchResult,
    coordinates: LegendAIOrchestratorDataProductCoordinates,
  ): LegendAIProductMetadata {
    const metadata: LegendAIProductMetadata = {
      name: result.dataProductTitle ?? 'Unknown',
      coordinates: toCoordinatesString(coordinates),
      serviceSummaries: [],
      accessPointGroups: [],
    };
    if (result.dataProductDescription !== null) {
      metadata.description = result.dataProductDescription;
    }
    const tags1 = result.tags1;
    const tags2 = result.tags2;
    if (tags1.length > 0 || tags2.length > 0) {
      metadata.tags = [...tags1, ...tags2].map((t) => ({
        profile: 'tag',
        value: t,
      }));
    }
    return metadata;
  }

  private buildTitleFromPath(path: string, artifactId: string): string {
    const parts = path.split('::');
    const filtered = parts.filter(
      (p) =>
        p.toLowerCase() !== 'dataspace' &&
        p.toLowerCase() !== 'model' &&
        !p.toLowerCase().endsWith('dataspace'),
    );
    if (filtered.length > 0) {
      return filtered
        .map((p) =>
          p
            .replaceAll(/(?<lower>[a-z])(?<upper>[A-Z])/g, '$<lower> $<upper>')
            .replace(/^./, (c) => c.toUpperCase()),
        )
        .join(' ');
    }
    return artifactId
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private async multiSignalSearch(
    question: string,
    setMessages: MessageSetter,
  ): Promise<{
    productResults: DataProductSearchResult[];
    fieldResults: GroupedFieldSearchResultEntry[];
  }> {
    const env = this.baseStore.envState.lakehouseEnvironment;

    addThinkingStep(
      setMessages,
      'Searching products and fields in parallel...',
    );

    const [productRaw, fieldRaw] = await Promise.all([
      this.baseStore.marketplaceServerClient.dataProductSearch(
        question,
        env,
        FieldSearchType.HYBRID,
        [],
        PRODUCT_SEARCH_PAGE_SIZE,
        1,
        false,
      ),
      this.baseStore.marketplaceServerClient
        .fieldSearch(env, {
          query: question,
          searchType: FieldSearchType.HYBRID,
          pageSize: FIELD_SEARCH_PAGE_SIZE,
          pageNumber: 1,
        })
        .catch(() => null),
    ]);

    const productResponse =
      DataProductSearchResponse.serialization.fromJson(productRaw);
    const productResults = productResponse.results.filter(
      (r) =>
        r.dataProductDetails instanceof
          LakehouseDataProductSearchResultDetails ||
        r.dataProductDetails instanceof LegacyDataProductSearchResultDetails,
    );

    let fieldResults: GroupedFieldSearchResultEntry[] = [];
    if (fieldRaw) {
      try {
        const fieldResponse =
          GroupedFieldSearchResponse.serialization.fromJson(fieldRaw);
        fieldResults = fieldResponse.results;
      } catch {
        /* Non-fatal: field search is best-effort */
      }
    }

    if (fieldResults.length > 0) {
      addThinkingStep(
        setMessages,
        `Found ${fieldResults.length} matching field${fieldResults.length > 1 ? 's' : ''} across products`,
      );
    }

    return { productResults, fieldResults };
  }

  private deriveProductsFromFieldResults(
    fieldResults: GroupedFieldSearchResultEntry[],
    existingProducts: DataProductSearchResult[],
  ): DataProductSearchResult[] {
    const existingKeys = new Set(
      existingProducts.map((p) => {
        const { groupId, artifactId } = unwrapProductDetails(p);
        return `${groupId}:${artifactId}`;
      }),
    );

    const productFieldCounts = new Map<
      string,
      {
        path: string;
        productType: DataProductSearchResultDetailsType;
        groupId: string;
        artifactId: string;
        versionId: string;
        dataProductId?: string;
        fieldCount: number;
      }
    >();

    for (const dp of fieldResults.flatMap((entry) => entry.dataProducts)) {
      if (!dp.groupId || !dp.artifactId || !dp.versionId) {
        continue;
      }
      const key = `${dp.groupId}:${dp.artifactId}`;
      if (existingKeys.has(key)) {
        continue;
      }
      const existing = productFieldCounts.get(key);
      if (existing) {
        existing.fieldCount += 1;
      } else {
        productFieldCounts.set(key, {
          path: dp.path,
          productType: dp.productType,
          groupId: dp.groupId,
          artifactId: dp.artifactId,
          versionId: dp.versionId,
          ...(dp.dataProductId === undefined
            ? {}
            : { dataProductId: dp.dataProductId }),
          fieldCount: 1,
        });
      }
    }

    const sorted = [...productFieldCounts.values()].sort(
      (a, b) => b.fieldCount - a.fieldCount,
    );

    return sorted
      .slice(0, MAX_PRODUCT_SUGGESTIONS)
      .map((entry) => this.buildDerivedProduct(entry));
  }

  private buildDerivedProduct(entry: {
    path: string;
    productType: DataProductSearchResultDetailsType;
    groupId: string;
    artifactId: string;
    versionId: string;
    dataProductId?: string;
  }): DataProductSearchResult {
    const product = new DataProductSearchResult();
    product.dataProductTitle = this.buildTitleFromPath(
      entry.path,
      entry.artifactId,
    );
    product.dataProductDescription = null;
    product.tags1 = [];
    product.tags2 = [];
    product.tag_score = 0;
    product.similarity = 0;

    if (entry.productType === DataProductSearchResultDetailsType.LEGACY) {
      const details = new LegacyDataProductSearchResultDetails();
      details.groupId = entry.groupId;
      details.artifactId = entry.artifactId;
      details.versionId = entry.versionId;
      details.path = entry.path;
      product.dataProductDetails = details;
    } else {
      const origin = new LakehouseSDLCDataProductSearchResultOrigin();
      origin.groupId = entry.groupId;
      origin.artifactId = entry.artifactId;
      origin.versionId = entry.versionId;
      origin.path = entry.path;
      const details = new LakehouseDataProductSearchResultDetails();
      details.dataProductId = entry.dataProductId ?? '';
      details.deploymentId = 0;
      details.producerEnvironmentName = '';
      details.producerEnvironmentType = undefined;
      details.origin = origin;
      product.dataProductDetails = details;
    }

    return product;
  }

  private computeScoredCandidates(
    productResults: DataProductSearchResult[],
    fieldResults: GroupedFieldSearchResultEntry[],
  ): ScoredProductCandidate[] {
    const allFieldNames = fieldResults.map((f) => f.fieldName);
    const maxSimilarity =
      productResults.length > 0
        ? Math.max(...productResults.map((p) => p.similarity))
        : 1;

    const scoreProduct = (
      product: DataProductSearchResult,
    ): ScoredProductCandidate => {
      const {
        groupId,
        artifactId,
        path: productPath,
      } = unwrapProductDetails(product);

      const matchedFields: string[] = [];
      const missingFields: string[] = [];

      for (const fieldEntry of fieldResults) {
        const inProduct = fieldEntry.dataProducts.some(
          (dp) =>
            dp.path === productPath ||
            (dp.groupId &&
              dp.artifactId &&
              groupId === dp.groupId &&
              artifactId === dp.artifactId) ||
            (productPath.length > 0 && dp.path.includes(productPath)) ||
            (dp.path.length > 0 && productPath.includes(dp.path)),
        );
        if (inProduct) {
          matchedFields.push(fieldEntry.fieldName);
        } else {
          missingFields.push(fieldEntry.fieldName);
        }
      }

      const productSimilarity = product.similarity;
      const normalizedSimilarity =
        maxSimilarity > 0 ? productSimilarity / maxSimilarity : 0;
      const fieldCoverage =
        allFieldNames.length > 0
          ? matchedFields.length / allFieldNames.length
          : 0;
      const fieldIntersection =
        allFieldNames.length > 0 && missingFields.length === 0 ? 1 : 0;

      const compositeScore =
        allFieldNames.length > 0
          ? normalizedSimilarity + FIELD_COVERAGE_BOOST * fieldCoverage
          : normalizedSimilarity;

      return {
        product,
        productSimilarity,
        fieldCoverage,
        fieldIntersection,
        matchedFields,
        missingFields,
        compositeScore,
      };
    };

    // Score product search results
    const productCandidates = productResults.map(scoreProduct);
    productCandidates.sort((a, b) => b.compositeScore - a.compositeScore);

    // Score field-derived products (discovered from field search, not in product search)
    const fieldDerived = this.deriveProductsFromFieldResults(
      fieldResults,
      productResults,
    );
    const fieldCandidates = fieldDerived.map(scoreProduct);
    fieldCandidates.sort((a, b) => b.fieldCoverage - a.fieldCoverage);

    // Merge: interleave top product results with top field-derived results
    // so both signals are represented in the final list
    return this.mergeInterleaved(
      productCandidates,
      fieldCandidates,
      MERGED_CANDIDATE_LIMIT,
    );
  }

  private mergeInterleaved(
    productCandidates: ScoredProductCandidate[],
    fieldCandidates: ScoredProductCandidate[],
    limit: number,
  ): ScoredProductCandidate[] {
    const merged: ScoredProductCandidate[] = [];
    const seenKeys = new Set<string>();
    let pIdx = 0;
    let fIdx = 0;

    const tryAdd = (candidate: ScoredProductCandidate): void => {
      const { groupId, artifactId } = unwrapProductDetails(candidate.product);
      const key = `${groupId}:${artifactId}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        merged.push(candidate);
      }
    };

    while (
      merged.length < limit &&
      (pIdx < productCandidates.length || fIdx < fieldCandidates.length)
    ) {
      // Add 2 from product search, then 1 from field-derived, repeat
      const fromProduct = merged.length % 3 !== 2;
      if (
        pIdx < productCandidates.length &&
        (fromProduct || fIdx >= fieldCandidates.length)
      ) {
        tryAdd(guaranteeNonNullable(productCandidates[pIdx]));
        pIdx++;
      } else if (fIdx < fieldCandidates.length) {
        tryAdd(guaranteeNonNullable(fieldCandidates[fIdx]));
        fIdx++;
      } else {
        break;
      }
    }

    return merged;
  }

  private async llmRerankProducts(
    question: string,
    candidates: ScoredProductCandidate[],
    fieldResults: GroupedFieldSearchResultEntry[],
    setMessages: MessageSetter,
  ): Promise<ScoredProductCandidate[]> {
    const plugin = this.plugin;
    if (!plugin || candidates.length <= MAX_PRODUCT_SUGGESTIONS) {
      return candidates.slice(0, MAX_PRODUCT_SUGGESTIONS);
    }

    addThinkingStep(setMessages, 'Using AI to rank best matching products...');

    const candidateInputs = candidates.map((c) => ({
      title: c.product.dataProductTitle ?? 'Unknown',
      description: c.product.dataProductDescription
        ? c.product.dataProductDescription.slice(0, DESCRIPTION_PREVIEW_LENGTH)
        : '',
      matchedFields: c.matchedFields,
    }));
    const allFieldNames = fieldResults.map((f) => f.fieldName);

    const indices = await plugin.rerankProducts(
      question,
      candidateInputs,
      allFieldNames,
      MAX_PRODUCT_SUGGESTIONS,
      this.config,
    );

    if (indices && indices.length > 0) {
      return this.buildRankedList(indices, candidates, MAX_PRODUCT_SUGGESTIONS);
    }

    return candidates.slice(0, MAX_PRODUCT_SUGGESTIONS);
  }

  private buildRankedList(
    indices: number[],
    candidates: ScoredProductCandidate[],
    limit: number,
  ): ScoredProductCandidate[] {
    const ranked: ScoredProductCandidate[] = [];
    for (const idx of indices) {
      if (ranked.length >= limit) {
        break;
      }
      if (idx >= 0 && idx < candidates.length) {
        ranked.push(guaranteeNonNullable(candidates[idx]));
      }
    }
    for (const c of candidates) {
      if (ranked.length >= limit) {
        break;
      }
      if (!ranked.includes(c)) {
        ranked.push(c);
      }
    }
    return ranked;
  }

  *submitQuery(text: string): GeneratorFn<void> {
    const trimmed = text.trim();
    if (!trimmed || this.isSending || !this.plugin) {
      return;
    }

    this.isSending = true;
    this.questionText = '';
    this.messages = [...this.messages, ...createMessagePair(trimmed)];

    const setMessages = this.createMessageSetter();
    const startTime = Date.now();

    try {
      if (this.selectedProductCoordinates) {
        this.stage = MarketplaceAIChatStage.QUERYING;
        const relevantDatasets = (yield this.enrichWithEntitySearch(
          trimmed,
          setMessages,
        )) as Awaited<ReturnType<typeof this.enrichWithEntitySearch>>;
        yield this.dispatchWithSql2(trimmed, relevantDatasets, setMessages);
        this.stage = MarketplaceAIChatStage.RESULTS;
        return;
      }

      this.stage = MarketplaceAIChatStage.SEARCHING;

      const { productResults, fieldResults } = (yield this.multiSignalSearch(
        trimmed,
        setMessages,
      )) as Awaited<ReturnType<typeof this.multiSignalSearch>>;

      const candidates = this.computeScoredCandidates(
        productResults,
        fieldResults,
      );

      if (candidates.length === 0) {
        completeThinkingSteps(setMessages);
        updateLastAssistant(setMessages, () => ({
          textAnswer:
            'I could not find any data products matching your query. Please try rephrasing or use more specific terms.',
          isProcessing: false,
        }));
        this.stage = MarketplaceAIChatStage.IDLE;
      } else {
        const topCandidates = (yield this.llmRerankProducts(
          trimmed,
          candidates,
          fieldResults,
          setMessages,
        )) as Awaited<ReturnType<typeof this.llmRerankProducts>>;

        const top = guaranteeNonNullable(topCandidates[0]);
        addThinkingStep(
          setMessages,
          `Top candidate: ${top.product.dataProductTitle ?? 'Unknown'} (${(top.compositeScore * 100).toFixed(0)}% composite)`,
        );

        completeThinkingSteps(setMessages);
        this.suggestedProducts = topCandidates.map((c) => c.product);
        this.scoredCandidates = topCandidates;

        const hasFieldInfo =
          fieldResults.length > 0 &&
          topCandidates.some((c) => c.matchedFields.length > 0);

        let message = `I found ${candidates.length} data product${candidates.length > 1 ? 's' : ''} that may contain the data you need.`;
        if (hasFieldInfo) {
          message += ' Field availability is shown for each product.';
        }
        message += ' Please select one to continue:';

        updateLastAssistant(setMessages, () => ({
          textAnswer: message,
          isProcessing: false,
        }));
        this.stage = MarketplaceAIChatStage.PRODUCT_SELECTION;
      }
    } catch (error) {
      assertErrorThrown(error);
      finishWithThinkingError(
        setMessages,
        error.message,
        startTime,
        classifyError(error),
      );
      this.stage = MarketplaceAIChatStage.IDLE;
    } finally {
      this.isSending = false;
    }
  }

  selectDataProduct(result: DataProductSearchResult): void {
    const { groupId, artifactId, versionId, path } =
      unwrapProductDetails(result);
    if (!groupId || !artifactId || !versionId || !path) {
      return;
    }
    const coordinates: LegendAIOrchestratorDataProductCoordinates = {
      data_product: path,
      group_id: groupId,
      artifact_id: artifactId,
      version: versionId,
    };
    this.selectedProduct = result;
    this.selectedProductCoordinates = coordinates;
    this.selectedProductMetadata = this.extractMetadata(result, coordinates);
    this.suggestedProducts = [];
    const details = result.dataProductDetails;
    if (details instanceof LakehouseDataProductSearchResultDetails) {
      this.selectedDataProductId = details.dataProductId;
    } else {
      this.selectedDataProductId = undefined;
    }
  }

  selectAutosuggestProduct(result: AutosuggestResult): void {
    const searchResult = convertAutosuggestResultToSearchResult(result);
    this.selectDataProduct(searchResult);
  }

  deselectProduct(): void {
    this.selectedProduct = undefined;
    this.selectedProductCoordinates = undefined;
    this.selectedProductMetadata = undefined;
    this.pureExecutionContext = undefined;
    this.resolvedProductServices = [];
    this.lastResolvedEntities = undefined;
    this.lastEntityCandidates = [];
    this.selectedDataProductId = undefined;
    this.stage = MarketplaceAIChatStage.PRODUCT_SELECTION;
  }

  addScopeProduct(result: AutosuggestResult): void {
    const details = result.dataProductDetails;

    let groupId: string | undefined;
    let artifactId: string | undefined;
    let versionId: string | undefined;
    let path: string | undefined;

    if (
      details._type === DataProductDetailsType.LAKEHOUSE &&
      details.origin !== undefined
    ) {
      groupId = details.origin.groupId;
      artifactId = details.origin.artifactId;
      versionId = details.origin.versionId;
      path = details.origin.path;
    } else {
      groupId = details.groupId;
      artifactId = details.artifactId;
      versionId = details.versionId;
      path = details.path;
    }

    if (!groupId || !artifactId || !versionId || !path) {
      return;
    }
    const key = generateGAVCoordinates(groupId, artifactId, versionId);
    if (
      this.scopeProducts.some((p) => toCoordinatesString(p.coordinates) === key)
    ) {
      return;
    }
    if (this.scopeProducts.length >= 3) {
      return;
    }
    const coords: LegendAIOrchestratorDataProductCoordinates = {
      data_product: path,
      group_id: groupId,
      artifact_id: artifactId,
      version: versionId,
    };
    this.scopeProducts = [
      ...this.scopeProducts,
      { name: result.dataProductName, coordinates: coords },
    ];
    if (this.scopeProducts.length === 1) {
      this.selectedProductCoordinates = coords;
      this.selectedProductMetadata = {
        name: result.dataProductName,
        description: result.dataProductDescription,
        coordinates: key,
        serviceSummaries: [],
      };
      this.selectedDataProductId = details.dataProductId;
    }
  }

  removeScopeProduct(index: number): void {
    this.scopeProducts = this.scopeProducts.filter((_, i) => i !== index);
    if (this.selectedProduct === undefined) {
      const firstScope = this.scopeProducts[0];
      this.selectedProductCoordinates = firstScope?.coordinates;
      this.selectedProductMetadata = firstScope
        ? {
            name: firstScope.name,
            coordinates: toCoordinatesString(firstScope.coordinates),
            serviceSummaries: [],
          }
        : undefined;
      this.pureExecutionContext = undefined;
      this.resolvedProductServices = [];
      this.lastResolvedEntities = undefined;
      this.lastEntityCandidates = [];
      this.selectedDataProductId = undefined;
    }
  }

  async resolveExecutionContext(setMessages: MessageSetter): Promise<void> {
    const product = this.selectedProduct;
    const coordinates = this.selectedProductCoordinates;
    if (!coordinates) {
      return;
    }

    addThinkingStep(setMessages, 'Resolving execution context...');

    try {
      let dataSpace: V1_DataSpace | undefined;

      if (product) {
        const details = product.dataProductDetails;

        if (details instanceof LegacyDataProductSearchResultDetails) {
          const entity =
            await this.baseStore.depotServerClient.getVersionEntity(
              details.groupId,
              details.artifactId,
              details.versionId,
              details.path,
            );
          dataSpace = V1_deserializeDataSpace(
            entity.content as PlainObject<V1_DataSpace>,
          );
        } else if (
          details instanceof LakehouseDataProductSearchResultDetails &&
          details.origin instanceof
            LakehouseSDLCDataProductSearchResultOrigin &&
          details.origin.groupId &&
          details.origin.artifactId &&
          details.origin.versionId &&
          details.origin.path
        ) {
          const entity =
            await this.baseStore.depotServerClient.getVersionEntity(
              details.origin.groupId,
              details.origin.artifactId,
              details.origin.versionId,
              details.origin.path,
            );
          dataSpace = V1_deserializeDataSpace(
            entity.content as PlainObject<V1_DataSpace>,
          );
        }
      } else {
        const entity = await this.baseStore.depotServerClient.getVersionEntity(
          coordinates.group_id,
          coordinates.artifact_id,
          coordinates.version,
          coordinates.data_product,
        );
        dataSpace = V1_deserializeDataSpace(
          entity.content as PlainObject<V1_DataSpace>,
        );
      }

      if (dataSpace && dataSpace.executionContexts.length > 0) {
        const defaultCtxName = dataSpace.defaultExecutionContext;
        const execCtx =
          dataSpace.executionContexts.find((c) => c.name === defaultCtxName) ??
          guaranteeNonNullable(dataSpace.executionContexts[0]);

        const ctx = new QueryExplicitExecutionContextInfo();
        ctx.mapping = execCtx.mapping.path;
        ctx.runtime = execCtx.defaultRuntime.path;
        runInAction(() => {
          this.pureExecutionContext = ctx;
        });
      }
    } catch (error) {
      assertErrorThrown(error);
      addThinkingStep(
        setMessages,
        `Warning: Could not resolve execution context — ${error.message}`,
      );
    }
  }

  *askFollowUp(text: string): GeneratorFn<void> {
    const trimmed = text.trim();
    if (
      !trimmed ||
      this.isSending ||
      !this.plugin ||
      !this.selectedProductCoordinates
    ) {
      return;
    }

    this.isSending = true;
    this.questionText = '';
    this.messages = [...this.messages, ...createMessagePair(trimmed)];

    const setMessages = this.createMessageSetter();
    const startTime = Date.now();

    try {
      this.stage = MarketplaceAIChatStage.QUERYING;
      const relevantDatasets = (yield this.enrichWithEntitySearch(
        trimmed,
        setMessages,
      )) as Awaited<ReturnType<typeof this.enrichWithEntitySearch>>;
      yield this.dispatchWithSql2(trimmed, relevantDatasets, setMessages);
      this.stage = MarketplaceAIChatStage.RESULTS;
    } catch (error) {
      assertErrorThrown(error);
      finishWithThinkingError(
        setMessages,
        error.message,
        startTime,
        classifyError(error),
      );
    } finally {
      this.isSending = false;
    }
  }

  private async enrichWithEntitySearch(
    question: string,
    setMessages: MessageSetter,
  ): Promise<string[]> {
    const coordinates = this.selectedProductCoordinates;
    if (!coordinates) {
      return [];
    }

    addThinkingStep(
      setMessages,
      'Searching for relevant datasets and fields...',
    );

    try {
      const env = this.baseStore.envState.lakehouseEnvironment;

      const entitySearchOptions = {
        groupId: coordinates.group_id,
        artifactId: coordinates.artifact_id,
        versionId: coordinates.version,
        path: coordinates.data_product,
        ...(this.selectedDataProductId === undefined
          ? {}
          : { dataProductId: this.selectedDataProductId }),
        searchType: FieldSearchType.HYBRID,
        pageSize: DATASET_SEARCH_PAGE_SIZE,
      };

      const [primaryRaw, diversityRaw] = await Promise.all([
        this.baseStore.marketplaceServerClient.entitySearch(
          env,
          question,
          entitySearchOptions,
        ),
        this.baseStore.marketplaceServerClient
          .entitySearch(
            env,
            extractElementNameFromPath(coordinates.data_product),
            entitySearchOptions,
          )
          .catch(() => undefined),
      ]);

      const primaryResponse =
        EntitySearchResponse.serialization.fromJson(primaryRaw);
      const results = primaryResponse.results;

      this.mergeDiversityResults(results, diversityRaw);

      if (results.length > 0) {
        const topDataset = guaranteeNonNullable(results[0]);
        addThinkingStep(
          setMessages,
          `Found ${results.length} relevant dataset${results.length > 1 ? 's' : ''} — top: ${topDataset.datasetName}`,
        );

        if (this.selectedProductMetadata) {
          const datasetSummaries = results
            .slice(0, MAX_RELEVANT_SERVICES)
            .map((r) => ({
              title: r.datasetName,
              ...(r.datasetDescription === undefined
                ? {}
                : { description: r.datasetDescription }),
            }));

          const existingTitles = new Set(
            this.selectedProductMetadata.serviceSummaries.map((s) => s.title),
          );
          const newSummaries = datasetSummaries.filter(
            (s) => !existingTitles.has(s.title),
          );
          const currentMetadata = this.selectedProductMetadata;
          runInAction(() => {
            this.selectedProductMetadata = {
              ...currentMetadata,
              serviceSummaries: [
                ...currentMetadata.serviceSummaries,
                ...newSummaries,
              ],
            };
          });
        }

        this.buildServicesFromEntitySearch(results, setMessages);

        await this.resolveEntityCandidates(question, results, coordinates);
      }

      return results.map((r) => r.datasetName);
    } catch (error) {
      assertErrorThrown(error);
      addThinkingStep(
        setMessages,
        `Warning: Dataset search unavailable — ${error.message}`,
      );
      return [];
    }
  }

  private async resolveEntityCandidates(
    question: string,
    results: EntitySearchResult[],
    coordinates: LegendAIOrchestratorDataProductCoordinates,
  ): Promise<void> {
    const entitiesWithPaths = results.filter(
      (r) => r.datasetDetails?.modelPath,
    );
    if (entitiesWithPaths.length === 0 || !this.plugin) {
      return;
    }

    const candidates: LegendAIEntityCandidate[] = entitiesWithPaths.map(
      (r) => ({
        datasetName: r.datasetName,
        ...(r.datasetDescription === undefined
          ? {}
          : { description: r.datasetDescription }),
        modelPath: guaranteeNonNullable(r.datasetDetails).modelPath,
        similarityScore: r.similarityScore,
      }),
    );

    runInAction(() => {
      this.lastEntityCandidates = candidates
        .slice(0, MAX_PRODUCT_SUGGESTIONS)
        .map((c) => ({
          datasetName: c.datasetName,
          modelPath: c.modelPath,
          ...(c.description === undefined
            ? {}
            : { description: c.description }),
        }));
    });

    try {
      const resolved = await this.plugin.disambiguateEntity(
        question,
        candidates,
        this.config,
        this.pureExecutionContext,
        coordinates,
      );
      runInAction(() => {
        this.lastResolvedEntities = resolved;
      });
    } catch {
      const topEntity = entitiesWithPaths[0];
      if (topEntity) {
        const resolved = new LegendAIResolvedEntities();
        resolved.rootEntity =
          topEntity.datasetDetails?.modelPath ?? topEntity.datasetName;
        resolved.relatedEntities = entitiesWithPaths
          .slice(1, MAX_RELEVANT_SERVICES + 1)
          .map((r) => r.datasetDetails?.modelPath)
          .filter((p): p is string => p !== undefined);
        runInAction(() => {
          this.lastResolvedEntities = resolved;
        });
      }
    }
  }

  private mergeDiversityResults(
    results: EntitySearchResult[],
    diversityRaw: PlainObject | undefined,
  ): void {
    if (!diversityRaw) {
      return;
    }
    const diversityResponse =
      EntitySearchResponse.serialization.fromJson(diversityRaw);
    const existingPaths = new Set(
      results
        .filter((r) => r.datasetDetails?.modelPath)
        .map((r) => guaranteeNonNullable(r.datasetDetails).modelPath),
    );
    for (const r of diversityResponse.results) {
      if (
        r.datasetDetails?.modelPath &&
        !existingPaths.has(r.datasetDetails.modelPath)
      ) {
        results.push(r);
        existingPaths.add(r.datasetDetails.modelPath);
      }
    }
  }

  private buildServicesFromEntitySearch(
    results: {
      datasetName: string;
      dataProductDetails?: { _type: string };
      datasetDetails?: { modelPath: string };
      relatedFields?: {
        fieldName: string;
        fieldType?: string;
        fieldDescription?: string;
      }[];
    }[],
    setMessages: MessageSetter,
  ): void {
    const coordinates = this.selectedProductCoordinates;
    if (!coordinates) {
      return;
    }

    // Skip service building for legacy dataspaces so the flow routes to the orchestrator instead.
    const firstResult = results[0];
    if (
      firstResult?.dataProductDetails?._type === DataProductDetailsType.LEGACY
    ) {
      return;
    }

    const fallbackPath = coordinates.data_product;

    const services: TDSServiceSchema[] = [];
    let totalColumns = 0;

    for (const result of results) {
      const fields = result.relatedFields ?? [];
      const columns = fields.map((f) => ({
        name: f.fieldName,
        type: f.fieldType ?? 'String',
        ...(f.fieldDescription === undefined
          ? {}
          : { documentation: f.fieldDescription }),
      }));

      totalColumns += columns.length;

      services.push({
        title: result.datasetName,
        pattern: `/${result.datasetName}`,
        columns,
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
        dataProductPath: result.datasetDetails?.modelPath ?? fallbackPath,
      });
    }

    if (services.length > 0) {
      runInAction(() => {
        this.resolvedProductServices = services;
      });

      addThinkingStep(
        setMessages,
        `Loaded ${services.length} relevant dataset${services.length > 1 ? 's' : ''} with ${totalColumns} fields`,
      );
    }
  }

  private getServicesForQuery(
    relevantDatasetNames: string[],
  ): TDSServiceSchema[] {
    if (this.resolvedProductServices.length === 0) {
      return [];
    }

    if (relevantDatasetNames.length === 0) {
      return this.resolvedProductServices.slice(0, MAX_RELEVANT_SERVICES);
    }

    const relevantSet = new Set(
      relevantDatasetNames.map((n) => n.toLowerCase()),
    );

    const relevant: TDSServiceSchema[] = [];

    for (const service of this.resolvedProductServices) {
      if (relevantSet.has(service.title.toLowerCase())) {
        relevant.push(service);
      }
    }

    relevant.sort((a, b) => {
      const aIdx = relevantDatasetNames.findIndex(
        (n) => n.toLowerCase() === a.title.toLowerCase(),
      );
      const bIdx = relevantDatasetNames.findIndex(
        (n) => n.toLowerCase() === b.title.toLowerCase(),
      );
      return aIdx - bIdx;
    });

    return relevant;
  }

  private async handleNoServices(
    question: string,
    setMessages: MessageSetter,
    startTime: number,
    contextPromise: Promise<void>,
  ): Promise<void> {
    addThinkingStep(
      setMessages,
      'No dataset schemas available — entity search did not return results for this data product.',
    );
    completeThinkingSteps(setMessages);
    updateLastAssistant(setMessages, () => ({
      textAnswer:
        'Could not resolve dataset schemas for this data product. You can try the Legend AI Orchestrator to generate a Pure query instead.',
      isProcessing: false,
    }));
    this.offerOrchestratorFallback(question, setMessages, startTime);
    await contextPromise;
  }

  private async handleZeroRows(
    judgedSql: string,
    question: string,
    services: TDSServiceSchema[],
    coordinates: LegendAIOrchestratorDataProductCoordinates,
    metadata: LegendAIProductMetadata,
    context: LegendAIOperationContext,
    timing: { startTime: number; contextPromise: Promise<void> },
  ): Promise<void> {
    const { startTime, contextPromise } = timing;
    const { setMessages } = context;
    const coordinatesStr = toCoordinatesString(coordinates);
    const corrected = await this.attemptZeroRowCorrection(
      judgedSql,
      question,
      services,
      coordinatesStr,
      setMessages,
      coordinates,
    );
    if (corrected) {
      await contextPromise;
      await this.safeAnalyzeResults(
        question,
        corrected.sql,
        corrected.result,
        metadata,
        context,
        startTime,
      );
      return;
    }
    const datasetList = services
      .slice(0, MAX_RELEVANT_SERVICES)
      .map((s) => s.title)
      .join(', ');
    const datasetSuffix =
      services.length > MAX_RELEVANT_SERVICES
        ? ` and ${services.length - MAX_RELEVANT_SERVICES} more`
        : '';
    updateLastAssistant(setMessages, () => ({
      textAnswer: `The SQL 2.0 query executed successfully but returned **0 rows**. The applied filters may not match any records in the available datasets, or the specific values may not exist.\n\n**Queried datasets:** ${datasetList}${datasetSuffix}`,
    }));
    this.offerOrchestratorFallback(question, setMessages, startTime);
    await contextPromise;
  }

  private async dispatchWithSql2(
    question: string,
    relevantDatasetNames: string[],
    setMessages: MessageSetter,
  ): Promise<void> {
    const plugin = this.plugin;
    const coordinates = this.selectedProductCoordinates;
    const metadata = this.selectedProductMetadata;

    if (!plugin || !coordinates || !metadata) {
      return;
    }

    const config = this.config;
    const history = this.buildConversationHistory();
    const context = {
      config,
      plugin,
      history,
      setMessages,
    };

    const services = this.getServicesForQuery(relevantDatasetNames);
    const contextPromise =
      services.length > 0
        ? this.buildContextPromise(question, metadata, setMessages)
        : Promise.resolve();

    const entityNames = [metadata.name, ...services.map((s) => s.title)];
    const fastIntent = classifyQuestionIntentFast(question, true, entityNames);

    // ── Pure METADATA: fast classifier is confident, no data signals ──
    if (
      fastIntent.intent === LegendAIQuestionIntent.METADATA &&
      !fastIntent.ambiguous
    ) {
      await handleMetadataQuestion(
        question,
        metadata,
        context,
        Date.now(),
        services.length > 0,
      );
      return;
    }

    // ── Ambiguous: show both metadata overview + SQL results ──
    if (fastIntent.ambiguous && services.length > 0) {
      await this.handleAmbiguousIntent(
        question,
        services,
        coordinates,
        metadata,
        context,
        contextPromise,
        setMessages,
      );
      return;
    }

    await this.handleLlmJudgeFallback(
      { question, ...fastIntent },
      services,
      coordinates,
      metadata,
      context,
      contextPromise,
      setMessages,
    );
  }

  private async handleLlmJudgeFallback(
    fastIntent: {
      question: string;
      intent: LegendAIQuestionIntent;
      ambiguous: boolean;
    },
    services: TDSServiceSchema[],
    coordinates: LegendAIOrchestratorDataProductCoordinates,
    metadata: LegendAIProductMetadata,
    context: LegendAIOperationContext,
    contextPromise: Promise<void>,
    setMessages: MessageSetter,
  ): Promise<void> {
    if (
      fastIntent.intent === LegendAIQuestionIntent.METADATA ||
      fastIntent.ambiguous
    ) {
      addThinkingStep(
        setMessages,
        services.length > 0
          ? 'Checking product capabilities first and trying a data query if the datasets support it...'
          : 'Checking product capabilities first...',
      );
    }

    const intent = await context.plugin.classifyQuestionIntent(
      fastIntent.question,
      services.length > 0,
      context.config,
    );

    if (intent === LegendAIQuestionIntent.METADATA) {
      await handleMetadataQuestion(
        fastIntent.question,
        metadata,
        context,
        Date.now(),
        services.length > 0,
      );
      return;
    }

    const startTime = Date.now();

    if (services.length === 0) {
      await this.handleNoServices(
        fastIntent.question,
        setMessages,
        startTime,
        contextPromise,
      );
      return;
    }

    await this.runSqlPath(
      fastIntent.question,
      services,
      coordinates,
      metadata,
      context,
      contextPromise,
      setMessages,
    );
  }

  private async handleAmbiguousIntent(
    question: string,
    services: TDSServiceSchema[],
    coordinates: LegendAIOrchestratorDataProductCoordinates,
    metadata: LegendAIProductMetadata,
    context: LegendAIOperationContext,
    contextPromise: Promise<void>,
    setMessages: MessageSetter,
  ): Promise<void> {
    addThinkingStep(
      setMessages,
      'Intent is ambiguous, providing metadata context and querying data...',
    );

    let metadataOverview: string | undefined;
    try {
      addThinkingStep(setMessages, 'Building metadata context...');
      metadataOverview = await buildMetadataOverview(
        question,
        metadata,
        context,
      );
    } catch {
      addThinkingStep(
        setMessages,
        'Could not build metadata context — continuing with data query...',
      );
    }

    try {
      await this.runSqlPath(
        question,
        services,
        coordinates,
        metadata,
        context,
        contextPromise,
        setMessages,
      );
      if (metadataOverview) {
        attachMetadataOverview(setMessages, metadataOverview);
      }
    } catch (queryError) {
      assertErrorThrown(queryError);
      addThinkingStep(
        setMessages,
        'Query failed, answering from product metadata...',
      );
      await handleMetadataQuestion(
        question,
        metadata,
        context,
        Date.now(),
        true,
      );
    }
  }

  /**
   * Core SQL generation → execution → analysis pipeline.
   * Extracted so both the direct DATA_QUERY path and the ambiguous-intent
   * path can reuse it.
   */
  private async runSqlPath(
    question: string,
    services: TDSServiceSchema[],
    coordinates: LegendAIOrchestratorDataProductCoordinates,
    metadata: LegendAIProductMetadata,
    context: LegendAIOperationContext,
    contextPromise: Promise<void>,
    setMessages: MessageSetter,
  ): Promise<void> {
    const { config, plugin } = context;
    const coordinatesStr = toCoordinatesString(coordinates);
    const startTime = Date.now();

    const totalColumns = services.reduce((sum, s) => sum + s.columns.length, 0);
    addThinkingStep(
      setMessages,
      `Generating Alloy SQL 2.0 query with ${services.length} relevant dataset${services.length > 1 ? 's' : ''} (${totalColumns} columns)...`,
    );

    try {
      const judgedSql = await generateAndJudgeSql(
        question,
        services,
        coordinatesStr,
        context,
        startTime,
      );

      if (!judgedSql) {
        this.offerOrchestratorFallback(question, setMessages, startTime);
        await contextPromise;
        return;
      }

      const sqlGenTime = elapsedSeconds(startTime, 2);
      completeThinkingSteps(setMessages);
      updateLastAssistant(setMessages, () => ({
        sql: judgedSql,
        sqlGenTime,
        isExecuting: true,
      }));

      const sqlResult = await executeSqlAndReport(
        judgedSql,
        services,
        config,
        plugin,
        setMessages,
        startTime,
        coordinates,
      );

      if (!sqlResult) {
        this.offerOrchestratorFallback(question, setMessages, startTime);
        await contextPromise;
        return;
      }

      if (sqlResult.rows.length === 0) {
        await this.handleZeroRows(
          judgedSql,
          question,
          services,
          coordinates,
          metadata,
          context,
          { startTime, contextPromise },
        );
        return;
      }

      await contextPromise;
      await this.safeAnalyzeResults(
        question,
        judgedSql,
        sqlResult,
        metadata,
        context,
        startTime,
      );
    } catch (error) {
      assertErrorThrown(error);
      addThinkingStep(setMessages, `SQL 2.0 failed: ${error.message}`);
      const datasetContext =
        services.length > 0
          ? `\n\nAvailable datasets: ${services.map((s) => s.title).join(', ')}`
          : '';
      finishWithThinkingError(
        setMessages,
        `Alloy SQL 2.0 encountered an error: ${error.message}${datasetContext}`,
        startTime,
        classifyError(error),
      );
      this.offerOrchestratorFallback(question, setMessages, startTime);
      await contextPromise;
    }
  }

  private async safeAnalyzeResults(
    question: string,
    sql: string,
    result: Parameters<typeof analyzeOrchestratorResults>[2],
    metadata: LegendAIProductMetadata,
    context: LegendAIOperationContext,
    startTime: number,
  ): Promise<void> {
    try {
      await analyzeOrchestratorResults(
        question,
        sql,
        result,
        metadata,
        context,
        startTime,
      );
    } catch {
      completeThinkingSteps(context.setMessages);
      updateLastAssistant(context.setMessages, () => ({
        isProcessing: false,
        thinkingDuration: elapsedSeconds(startTime),
      }));
    }
  }

  private async attemptZeroRowCorrection(
    currentSql: string,
    question: string,
    services: TDSServiceSchema[],
    coordinatesStr: string,
    setMessages: MessageSetter,
    dataProductCoordinates: LegendAIOrchestratorDataProductCoordinates,
  ): Promise<
    | {
        sql: string;
        result: Awaited<
          ReturnType<
            LegendAI_LegendApplicationPlugin_Extension['executeLakehouseSql']
          >
        >;
      }
    | undefined
  > {
    const config = this.config;
    const plugin = this.plugin;
    if (!plugin) {
      return undefined;
    }
    addThinkingStep(
      setMessages,
      'Query returned 0 rows, attempting filter correction...',
    );
    const prompt = plugin.buildZeroRowCorrectionPrompt(
      currentSql,
      question,
      services,
      coordinatesStr,
    );
    if (!prompt) {
      return undefined;
    }
    const correctionStart = Date.now();
    try {
      const raw = await plugin.callLLM(prompt, config);
      const trimmed = cleanLlmSqlResponse(raw);
      if (!isValidSqlCorrection(trimmed, currentSql)) {
        return undefined;
      }
      addThinkingStep(setMessages, 'Retrying with corrected filters...');
      updateLastAssistant(setMessages, () => ({ sql: trimmed }));
      const retryResult = await plugin.executeLakehouseSql(
        trimmed,
        dataProductCoordinates,
        config,
      );
      if (retryResult.rows.length > 0) {
        const sqlGenTime = elapsedSeconds(correctionStart, 2);
        completeThinkingSteps(setMessages);
        updateLastAssistant(setMessages, () => ({
          sql: trimmed,
          sqlGenTime,
          isExecuting: false,
        }));
        return { sql: trimmed, result: retryResult };
      }
    } catch (correctionError) {
      assertErrorThrown(correctionError);
      addThinkingStep(
        setMessages,
        `Filter correction failed: ${correctionError.message.slice(0, 120)}`,
      );
    }
    return undefined;
  }

  private offerOrchestratorFallback(
    question: string,
    setMessages: MessageSetter,
    startTime: number,
  ): void {
    this.pendingFallbackQuestion = question;
    completeThinkingSteps(setMessages);
    updateLastAssistant(setMessages, () => ({
      fallbackAction: {
        label: 'Ask Legend AI Orchestrator to generate Pure query',
        actionId: LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
      },
      isProcessing: false,
      thinkingDuration: elapsedSeconds(startTime),
    }));
  }

  *runOrchestratorFallback(messageId: string): GeneratorFn<void> {
    const question = this.pendingFallbackQuestion;
    const plugin = this.plugin;
    const coordinates = this.selectedProductCoordinates;
    const metadata = this.selectedProductMetadata;
    if (!question || !plugin || !coordinates || !metadata) {
      return;
    }

    this.isSending = true;

    const setMessages = this.createMessageSetter();
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.role === LegendAIMessageRole.ASSISTANT
          ? {
              ...m,
              fallbackAction: null,
              error: null,
              isProcessing: true,
            }
          : m,
      ),
    );

    try {
      this.stage = MarketplaceAIChatStage.QUERYING;
      const history = this.buildConversationHistory();
      const context = {
        config: this.config,
        plugin,
        history,
        setMessages,
      };

      addThinkingStep(setMessages, 'Switching to Legend AI Orchestrator...');

      if (this.lastEntityCandidates.length > 0) {
        const numbered = this.lastEntityCandidates
          .map((c, i) => `${i + 1}. ${c.modelPath}`)
          .join('  ');
        addThinkingStep(
          setMessages,
          `Found potential root entity classes: ${numbered}`,
        );
        const defaultEntity =
          this.lastResolvedEntities?.rootEntity ??
          this.lastEntityCandidates[0]?.modelPath;
        if (defaultEntity) {
          addThinkingStep(
            setMessages,
            `Picking ${defaultEntity} as root entity to generate Pure query`,
          );
        }
      }

      if (!this.pureExecutionContext) {
        yield this.resolveExecutionContext(setMessages);
      }

      const contextPromise = this.buildContextPromise(
        question,
        metadata,
        setMessages,
      );

      yield Promise.all([
        processQuestionViaOrchestrator(
          question,
          coordinates,
          metadata,
          context,
          this.pureExecutionContext,
          this.lastResolvedEntities,
        ),
        contextPromise,
      ]);

      this.stage = MarketplaceAIChatStage.RESULTS;
      this.pendingFallbackQuestion = undefined;
    } catch (error) {
      assertErrorThrown(error);
      finishWithThinkingError(
        setMessages,
        error.message,
        Date.now(),
        classifyError(error),
      );
    } finally {
      this.isSending = false;
    }
  }
}
