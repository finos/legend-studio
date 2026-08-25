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
  guaranteeType,
  LogEvent,
} from '@finos/legend-shared';
import {
  type LegendAIMessage,
  type LegendAIAssistantMessage,
  type LegendAIFallbackAction,
  type LegendAIPriorSqlFailure,
  type LegendAIPythonQueryCode,
  type LegendAIConfig,
  type LegendAIProductMetadata,
  type LegendAIOrchestratorDataProductCoordinates,
  type LegendAIConversationTurn,
  type LegendAIOperationContext,
  type TDSServiceSchema,
  type LegendAIEntityCandidate,
  type LegendAI_LegendApplicationPlugin_Extension,
  type MessageSetter,
  type LegendAIPythonCodegenRequest,
  type LegendAIDataCubeQueryTranslationRequest,
  type LegendAIModelContext,
  LegendAIMessageRole,
  LegendAIErrorType,
  LegendAIPythonCodeStatus,
  LegendAIQuestionIntent,
  LegendAIResolvedEntities,
  TDSServiceSourceType,
  classifyQuestionIntentFast,
  findLegendAIPlugin,
  processQuestion,
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
  createAssistantMessage,
  buildOrchestratorFallbackAction,
  DATA_PRODUCT_ACCESSOR_PREFIX,
  elapsedSeconds,
  accessPointName,
  LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
  cleanLlmSqlResponse,
  isValidSqlCorrection,
} from '@finos/legend-lego/legend-ai';
import {
  type V1_AccessPointGroup,
  type V1_RelationType,
  type V1_DataProductArtifact,
  type V1_EntitlementsDataProductDetails,
  type GraphManagerState,
  QueryExplicitExecutionContextInfo,
  extractElementNameFromPath,
  V1_PureGraphManager,
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import { EXTERNAL_APPLICATION_NAVIGATION__generateNewDataCubeUrl } from '@finos/legend-application';
import type { NormalizedDocumentationEntry } from '@finos/legend-lego/model-documentation';
import {
  type Entity,
  type ProjectGAVCoordinates,
  generateGAVCoordinates,
} from '@finos/legend-storage';
import {
  type V1_DataSpace,
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  V1_deserializeDataSpace,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  type DataSpaceSchemaSource,
  extractTDSServicesFromDataSpaceSource,
  extractMetadataFromDataSpaceAnalysis,
  buildDataSpaceModelContextFromSource,
} from '@finos/legend-extension-dsl-data-space/application';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import { buildGraphForDataProduct } from '../../utils/LakehouseUtils.js';
import {
  buildLakehouseDataCubeSourceData,
  extractTDSServicesFromDataProductSource,
  buildAccessPointModel,
  fetchAccessPointRelationTypes,
  selectAccessPointsMissingRelationType,
  fetchDataProductArtifact,
  getDataProductFromDetails,
  normalizeDataProductElementDocs,
  resolveUserIngestEnv,
  DATAPRODUCT_TYPE,
  DataProductTelemetryHelper,
  PRODUCT_INTEGRATION_TYPE,
} from '@finos/legend-extension-dsl-data-product';
import {
  getIngestDeploymentServerConfigName,
  IngestDeploymentServerConfig,
} from '@finos/legend-server-lakehouse';
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
  SearchType,
} from '@finos/legend-server-marketplace';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';

export enum MarketplaceAIChatStage {
  IDLE = 'idle',
  SEARCHING = 'searching',
  PRODUCT_SELECTION = 'product-selection',
  QUERYING = 'querying',
  RESULTS = 'results',
}

interface AccessPointScope {
  services: TDSServiceSchema[];
  config: LegendAIConfig;
  details: V1_EntitlementsDataProductDetails | undefined;
  productPath: string | undefined;
  environmentName: string | undefined;
}

interface DataSpaceScope {
  services: TDSServiceSchema[];
  metadata: LegendAIProductMetadata;
  modelContext: LegendAIModelContext | undefined;
  pureExecutionContext: QueryExplicitExecutionContextInfo | undefined;
}

type PythonCodeEntry =
  | { status: LegendAIPythonCodeStatus.LOADING }
  | {
      status: LegendAIPythonCodeStatus.READY;
      code: string;
      notebookUrl?: string;
    }
  | { status: LegendAIPythonCodeStatus.ERROR; error: string };

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
const MAX_SCOPE_PRODUCTS = 3;
const MERGED_CANDIDATE_LIMIT = 6;
const PRODUCT_CANDIDATES_PER_FIELD_CANDIDATE = 2;
const PRODUCT_SEARCH_PAGE_SIZE = 6;
const FIELD_SEARCH_PAGE_SIZE = 5;
const MAX_RELEVANT_SERVICES = 5;
const DESCRIPTION_PREVIEW_LENGTH = 200;
const MAX_FALLBACK_REASON_PREVIEW = 200;
const DATASET_SEARCH_PAGE_SIZE = 20;

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

/**
 * Reads the execution contexts a depot entity carries. Only a dataspace has
 * them, so any other element the coordinates resolve to yields none.
 */
function deserializeDataSpaceEntity(
  entity: PlainObject<Entity>,
): V1_DataSpace | undefined {
  return entity.classifierPath === DATA_SPACE_ELEMENT_CLASSIFIER_PATH
    ? V1_deserializeDataSpace(entity.content as PlainObject<V1_DataSpace>)
    : undefined;
}

const buildPriorFailure = (
  fallback: LegendAIFallbackAction,
): LegendAIPriorSqlFailure | undefined =>
  fallback.failedReason === undefined
    ? undefined
    : {
        failedReason: fallback.failedReason,
        ...(fallback.failedSql === undefined
          ? {}
          : { failedSql: fallback.failedSql }),
      };

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
  private tokenProvider: (() => string | undefined) | undefined = undefined;
  private readonly accessPointScopeCache = new Map<
    string,
    AccessPointScope | undefined
  >();
  private readonly dataSpaceScopeCache = new Map<
    string,
    DataSpaceScope | undefined
  >();
  pythonCodeByMessageId = new Map<string, PythonCodeEntry>();
  private lastResolvedLakehouseConfig: LegendAIConfig | undefined = undefined;
  resolvedOpenInDataCube:
    | ((
        accessPointName: string,
        environmentName: string,
        extraSourceData?: Record<string, unknown>,
      ) => void)
    | undefined = undefined;
  resolvedEnvironmentName: string | undefined = undefined;

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
      pythonCodeByMessageId: observable,
      resolvedOpenInDataCube: observable.ref,
      resolvedEnvironmentName: observable,
      setQuestionText: action,
      generatePythonCode: flow,
      openInDataCube: flow,
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
      scopedCoordinatesString: computed,
      welcomeSuggestedQueries: computed,
      supportsPython: computed,
      supportsDataCube: computed,
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

  get scopedCoordinatesString(): string {
    return this.selectedProductCoordinates
      ? toCoordinatesString(this.selectedProductCoordinates)
      : '';
  }

  // Scope caches key on the product too: one project can publish several data
  // products at the same coordinates.
  private get scopeCacheKey(): string {
    const coordinates = this.selectedProductCoordinates;
    return coordinates
      ? `${toCoordinatesString(coordinates)}:${coordinates.data_product}`
      : '';
  }

  get welcomeSuggestedQueries(): string[] {
    return (
      this.baseStore.applicationStore.config.options
        .defaultAISuggestedQueries ?? []
    );
  }

  setQuestionText(text: string): void {
    this.questionText = text;
  }

  setStage(stage: MarketplaceAIChatStage): void {
    this.stage = stage;
  }

  logCopySql(): void {
    LegendMarketplaceTelemetryHelper.logEvent_AIAgentCopySql(
      this.baseStore.applicationStore.telemetryService,
    );
  }

  logSuggestedQueryClicked(): void {
    LegendMarketplaceTelemetryHelper.logEvent_AIAgentSuggestedQueryClicked(
      this.baseStore.applicationStore.telemetryService,
    );
  }

  logGeneratePython(): void {
    LegendMarketplaceTelemetryHelper.logEvent_AIAgentGeneratePython(
      this.baseStore.applicationStore.telemetryService,
    );
  }

  logCopyPython(): void {
    LegendMarketplaceTelemetryHelper.logEvent_AIAgentCopyPython(
      this.baseStore.applicationStore.telemetryService,
    );
  }

  logOpenInDataCube(): void {
    LegendMarketplaceTelemetryHelper.logEvent_AIAgentOpenInDataCube(
      this.baseStore.applicationStore.telemetryService,
    );
  }

  get supportsPython(): boolean {
    const plugin = this.plugin;
    return (
      plugin !== undefined &&
      this.resolvedProductServices.some((s) => plugin.supportsPythonCodegen(s))
    );
  }

  get supportsDataCube(): boolean {
    const plugin = this.plugin;
    return (
      plugin !== undefined &&
      this.resolvedProductServices.some((s) => plugin.supportsOpenInDataCube(s))
    );
  }

  // Resolves the access point a message queried by name, falling back to the
  // first resolved service.
  /**
   * The service an action applies to. Falls back to one the action actually
   * supports, so the button's availability and its target cannot disagree.
   */
  private serviceForMessage(
    msg: LegendAIAssistantMessage,
    supports: (service: TDSServiceSchema) => boolean,
  ): TDSServiceSchema | undefined {
    const services = this.resolvedProductServices;
    const queried = new Set(
      msg.queriedAccessPoints.map((n) => n.toLowerCase()),
    );
    return (
      services.find((s) => queried.has(accessPointName(s).toLowerCase())) ??
      services.find(supports)
    );
  }

  // The user question that produced a given assistant message.
  private questionForMessage(messageId: string): string | undefined {
    const index = this.messages.findIndex((m) => m.id === messageId);
    for (let i = index - 1; i >= 0; i--) {
      const m = this.messages[i];
      if (m?.role === LegendAIMessageRole.USER) {
        return m.text;
      }
    }
    return undefined;
  }

  *generatePythonCode(messageId: string): GeneratorFn<void> {
    const plugin = this.plugin;
    const msg = this.messages.find((m) => m.id === messageId);
    if (!plugin || !msg || msg.role !== LegendAIMessageRole.ASSISTANT) {
      return;
    }
    const service = this.serviceForMessage(msg, (candidate) =>
      plugin.supportsPythonCodegen(candidate),
    );
    if (!service) {
      return;
    }
    this.logGeneratePython();
    this.pythonCodeByMessageId.set(messageId, {
      status: LegendAIPythonCodeStatus.LOADING,
    });
    const question = this.questionForMessage(messageId);
    const request: LegendAIPythonCodegenRequest = {
      service,
      config: this.lastResolvedLakehouseConfig ?? this.config,
      ...(this.selectedProductCoordinates
        ? { dataProductCoordinates: this.selectedProductCoordinates }
        : {}),
      ...(question === undefined ? {} : { question }),
      ...(msg.sql === null ? {} : { sql: msg.sql }),
    };
    try {
      const code = (yield plugin.generatePythonQueryCodeAsync(request)) as
        | LegendAIPythonQueryCode
        | undefined;
      if (code === undefined) {
        this.pythonCodeByMessageId.set(messageId, {
          status: LegendAIPythonCodeStatus.ERROR,
          error: 'Python code is not available for this query.',
        });
        return;
      }
      this.pythonCodeByMessageId.set(messageId, {
        status: LegendAIPythonCodeStatus.READY,
        code: code.code,
        ...(code.notebookUrl === undefined
          ? {}
          : { notebookUrl: code.notebookUrl }),
      });
    } catch (error) {
      assertErrorThrown(error);
      this.pythonCodeByMessageId.set(messageId, {
        status: LegendAIPythonCodeStatus.ERROR,
        error: error.message,
      });
    }
  }

  *openInDataCube(messageId: string): GeneratorFn<void> {
    const plugin = this.plugin;
    const msg = this.messages.find((m) => m.id === messageId);
    if (
      !plugin ||
      !msg ||
      msg.role !== LegendAIMessageRole.ASSISTANT ||
      msg.sql === null
    ) {
      return;
    }
    const service = this.serviceForMessage(msg, (candidate) =>
      plugin.supportsOpenInDataCube(candidate),
    );
    const launchInDataCube = this.resolvedOpenInDataCube;
    const environmentName = this.resolvedEnvironmentName;
    if (!service || !launchInDataCube || !environmentName) {
      this.baseStore.applicationStore.notificationService.notifyWarning(
        'Unable to open DataCube: no resolved lakehouse environment for this product.',
      );
      return;
    }
    this.logOpenInDataCube();
    const question = this.questionForMessage(messageId);
    const request: LegendAIDataCubeQueryTranslationRequest = {
      sql: msg.sql,
      service,
      dataProductPath: this.selectedProductCoordinates?.data_product ?? '',
      config: this.lastResolvedLakehouseConfig ?? this.config,
      ...(question === undefined ? {} : { question }),
    };
    let pureQuery: string | undefined;
    try {
      pureQuery = (yield plugin.translateAccessPointSqlToDataCubeQuery(
        request,
      )) as string | undefined;
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.warn(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_DATACUBE_TRANSLATE_FAILURE,
        ),
        error,
      );
    }
    const apName = accessPointName(service);
    let extraSourceData: Record<string, unknown> | undefined;
    if (pureQuery?.startsWith(DATA_PRODUCT_ACCESSOR_PREFIX)) {
      extraSourceData = { query: pureQuery };
    } else {
      this.baseStore.applicationStore.logService.debug(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_DATACUBE_TRANSLATE_FAILURE,
        ),
        `Open in DataCube: no usable translated query; opening the default access point`,
      );
    }
    try {
      launchInDataCube(apName, environmentName, extraSourceData);
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.notificationService.notifyError(error);
    }
  }

  // Logs a question-asked telemetry event (length only — never the question text).
  private logQuestionAsked(text: string, isFollowUp: boolean): void {
    LegendMarketplaceTelemetryHelper.logEvent_AIAgentQuestionAsked(
      this.baseStore.applicationStore.telemetryService,
      text.trim().length,
      isFollowUp,
      this.scopeProducts.length,
    );
  }

  // Logs the outcome of the last assistant turn (enum + row count + duration —
  // never the answer text or row values).
  private logResponseReceived(startTime: number): void {
    const last = this.messages.at(-1);
    const assistant =
      last?.role === LegendAIMessageRole.ASSISTANT ? last : undefined;
    const rowCount = assistant?.gridData?.rowData.length ?? 0;
    let outcome: 'error' | 'data' | 'text' | 'empty';
    if (assistant?.error) {
      outcome = 'error';
    } else if (rowCount > 0) {
      outcome = 'data';
    } else if (assistant?.textAnswer) {
      outcome = 'text';
    } else {
      outcome = 'empty';
    }
    LegendMarketplaceTelemetryHelper.logEvent_AIAgentResponseReceived(
      this.baseStore.applicationStore.telemetryService,
      outcome,
      rowCount,
      (Date.now() - startTime) / 1000,
    );
  }

  clearChat(): void {
    LegendMarketplaceTelemetryHelper.logEvent_AIAgentClearChat(
      this.baseStore.applicationStore.telemetryService,
    );
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
    this.pythonCodeByMessageId.clear();
    this.resolvedOpenInDataCube = undefined;
    this.resolvedEnvironmentName = undefined;
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
        SearchType.HYBRID,
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

    // Data spaces come back from the search API with a null `dataProductTitle`;
    // derive a readable name from their path so recommendations never render as
    // "Unknown Product".
    for (const result of productResults) {
      if (!result.dataProductTitle) {
        const { artifactId, path } = unwrapProductDetails(result);
        result.dataProductTitle = this.buildTitleFromPath(path, artifactId);
      }
    }

    let fieldResults: GroupedFieldSearchResultEntry[] = [];
    if (fieldRaw) {
      try {
        const fieldResponse =
          GroupedFieldSearchResponse.serialization.fromJson(fieldRaw);
        fieldResults = fieldResponse.results;
      } catch (error) {
        assertErrorThrown(error);
        this.baseStore.applicationStore.logService.warn(
          LogEvent.create(
            LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_FIELD_SEARCH_PARSE_FAILURE,
          ),
          error,
        );
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

  /**
   * Interleaves both candidate sources so field-derived products always get a
   * slot: {@link PRODUCT_CANDIDATES_PER_FIELD_CANDIDATE} from search, then one field.
   */
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
      const fromProduct =
        merged.length % (PRODUCT_CANDIDATES_PER_FIELD_CANDIDATE + 1) <
        PRODUCT_CANDIDATES_PER_FIELD_CANDIDATE;
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
    this.logQuestionAsked(trimmed, false);

    try {
      if (this.selectedProductCoordinates) {
        this.stage = MarketplaceAIChatStage.QUERYING;
        yield this.runScopedDataQuery(trimmed, setMessages);
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
      this.logResponseReceived(startTime);
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
    this.resolvedOpenInDataCube = undefined;
    this.resolvedEnvironmentName = undefined;
    this.lastResolvedLakehouseConfig = undefined;
    this.pureExecutionContext = undefined;
    this.accessPointScopeCache.clear();
    this.dataSpaceScopeCache.clear();
    const details = result.dataProductDetails;
    if (details instanceof LakehouseDataProductSearchResultDetails) {
      this.selectedDataProductId = details.dataProductId;
    } else {
      this.selectedDataProductId = undefined;
    }
    LegendMarketplaceTelemetryHelper.logEvent_AIAgentScopeAdded(
      this.baseStore.applicationStore.telemetryService,
      this.scopeProducts.length,
    );
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
    this.accessPointScopeCache.clear();
    this.dataSpaceScopeCache.clear();
    this.pythonCodeByMessageId.clear();
    this.resolvedOpenInDataCube = undefined;
    this.resolvedEnvironmentName = undefined;
    this.lastResolvedLakehouseConfig = undefined;
    this.lastResolvedEntities = undefined;
    this.lastEntityCandidates = [];
    this.selectedDataProductId = undefined;
    this.stage = MarketplaceAIChatStage.PRODUCT_SELECTION;
    LegendMarketplaceTelemetryHelper.logEvent_AIAgentScopeRemoved(
      this.baseStore.applicationStore.telemetryService,
      this.scopeProducts.length,
    );
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
    if (this.scopeProducts.length >= MAX_SCOPE_PRODUCTS) {
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
    LegendMarketplaceTelemetryHelper.logEvent_AIAgentScopeAdded(
      this.baseStore.applicationStore.telemetryService,
      this.scopeProducts.length,
    );
  }

  removeScopeProduct(index: number): void {
    this.scopeProducts = this.scopeProducts.filter((_, i) => i !== index);
    LegendMarketplaceTelemetryHelper.logEvent_AIAgentScopeRemoved(
      this.baseStore.applicationStore.telemetryService,
      this.scopeProducts.length,
    );
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

  setTokenProvider(provider: () => string | undefined): void {
    this.tokenProvider = provider;
  }

  /**
   * Opens an access point in DataCube, building the lakehouse-consumer source
   * data from the product's entitlements details rather than a viewer state.
   */
  private openAccessPointInDataCube(
    details: V1_EntitlementsDataProductDetails,
    productPath: string,
    apName: string,
    environmentName: string,
    extraSourceData?: Record<string, unknown>,
  ): void {
    const sourceData = {
      ...buildLakehouseDataCubeSourceData(
        details,
        productPath,
        apName,
        environmentName,
      ),
      ...extraSourceData,
    };
    try {
      DataProductTelemetryHelper.logEvent_OpenIntegratedProduct(
        this.baseStore.applicationStore.telemetryService,
        {
          origin:
            details.origin instanceof V1_SdlcDeploymentDataProductOrigin
              ? {
                  type: DATAPRODUCT_TYPE.SDLC,
                  groupId: details.origin.group,
                  artifactId: details.origin.artifact,
                  versionId: details.origin.version,
                }
              : { type: DATAPRODUCT_TYPE.ADHOC },
          deploymentId: details.deploymentId,
          name: details.dataProduct.name,
          productIntegrationType: PRODUCT_INTEGRATION_TYPE.DATA_CUBE,
          accessPointPath: apName,
          environmentClassification: details.lakehouseEnvironment?.type,
        },
        undefined,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.warn(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_OPEN_DATACUBE_FAILURE,
        ),
        error,
      );
    }
    this.baseStore.applicationStore.navigationService.navigator.visitAddress(
      EXTERNAL_APPLICATION_NAVIGATION__generateNewDataCubeUrl(
        this.baseStore.applicationStore.config.datacubeApplicationUrl,
        sourceData,
        { addUrlSafeBase64Characters: true },
      ),
    );
  }

  // The two calls resolveUserIngestEnv needs, fetched independently: losing the
  // user's entitlement environments still lets the classification filter resolve.
  private async resolveIngestEnvironment(
    details: V1_EntitlementsDataProductDetails,
  ): Promise<IngestDeploymentServerConfig | undefined> {
    const token = this.tokenProvider?.();
    const [summaries, userEnvs] = await Promise.all([
      this.fetchIngestEnvOrLogFailure(() =>
        this.baseStore.lakehousePlatformServerClient.getIngestEnvironmentSummaries(
          token,
        ),
      ),
      this.fetchIngestEnvOrLogFailure(() =>
        this.baseStore.lakehouseContractServerClient.getUserEntitlementEnvs(
          this.baseStore.applicationStore.identityService.currentUser,
          token,
        ),
      ),
    ]);
    if (!summaries) {
      return undefined;
    }
    return resolveUserIngestEnv(
      details,
      summaries.map((raw: PlainObject<IngestDeploymentServerConfig>) =>
        IngestDeploymentServerConfig.serialization.fromJson(raw),
      ),
      userEnvs?.users,
    );
  }

  private async fetchIngestEnvOrLogFailure<T>(
    request: () => Promise<T>,
  ): Promise<T | undefined> {
    try {
      return await request();
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.warn(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_ACCESS_POINT_RESOLUTION_FAILURE,
        ),
        `Unable to resolve the lakehouse ingest environment: ${error.message}`,
      );
      return undefined;
    }
  }

  // Malformed protocol docs can throw while normalizing; losing documentation
  // must not cost the caller its services, environment and DataCube launcher.
  private buildElementDocs(
    artifact: V1_DataProductArtifact | undefined,
    graphManagerState: GraphManagerState,
  ): NormalizedDocumentationEntry[] {
    if (!artifact?.nativeModelAccess) {
      return [];
    }
    try {
      return normalizeDataProductElementDocs(
        artifact.nativeModelAccess.elementDocs,
        graphManagerState,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.warn(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_ACCESS_POINT_RESOLUTION_FAILURE,
        ),
        `Unable to normalize data product element documentation: ${error.message}`,
      );
      return [];
    }
  }

  // Only products whose artifact does not cover an access point need the engine;
  // an ad hoc product has no artifact at all, so its graph is built first.
  private async loadRelationTypesFromEngine(
    accessPointGroups: V1_AccessPointGroup[],
    artifact: V1_DataProductArtifact | undefined,
    details: V1_EntitlementsDataProductDetails,
    projectGAV: ProjectGAVCoordinates | undefined,
    graphManagerState: GraphManagerState,
    graphManager: V1_PureGraphManager,
  ): Promise<Map<string, V1_RelationType>> {
    const missing = selectAccessPointsMissingRelationType(
      accessPointGroups,
      artifact,
    );
    if (missing.length === 0) {
      return new Map<string, V1_RelationType>();
    }
    try {
      if (projectGAV === undefined) {
        await buildGraphForDataProduct(
          details,
          graphManagerState,
          graphManager,
          this.baseStore,
        );
      }
      return await fetchAccessPointRelationTypes(
        missing,
        buildAccessPointModel(projectGAV, graphManagerState),
        this.baseStore.engineServerClient,
        (accessPointId, error) =>
          this.baseStore.applicationStore.logService.warn(
            LogEvent.create(
              LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_ACCESS_POINT_RESOLUTION_FAILURE,
            ),
            `Unable to type access point ${accessPointId} through the engine: ${error.message}`,
          ),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.warn(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_ACCESS_POINT_RESOLUTION_FAILURE,
        ),
        `Unable to resolve access point relation types from the engine: ${error.message}`,
      );
      return new Map<string, V1_RelationType>();
    }
  }

  // A product with no generated artifact still yields sample query services and
  // an environment, so a missing artifact must not fail the whole resolution.
  private async loadDataProductArtifact(
    projectGAV: ProjectGAVCoordinates,
    dataProductPath: string,
  ): Promise<V1_DataProductArtifact | undefined> {
    try {
      return await fetchDataProductArtifact(
        this.baseStore.depotServerClient,
        projectGAV,
        dataProductPath,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.warn(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_ACCESS_POINT_RESOLUTION_FAILURE,
        ),
        `Unable to fetch the data product artifact: ${error.message}`,
      );
      return undefined;
    }
  }

  /**
   * Reads the entitlements record the chat's product selection points at, which
   * must identify exactly one deployed data product.
   */
  private async resolveEntitlementsDetails(
    searchDetails: LakehouseDataProductSearchResultDetails,
  ): Promise<V1_EntitlementsDataProductDetails> {
    const matches =
      V1_entitlementsDataProductDetailsResponseToDataProductDetails(
        await this.baseStore.lakehouseContractServerClient.getDataProductByIdAndDID(
          searchDetails.dataProductId,
          searchDetails.deploymentId,
          this.tokenProvider?.(),
        ),
      );
    if (matches.length > 1) {
      throw new Error(
        `Multiple data products found for ID ${searchDetails.dataProductId} and DID ${searchDetails.deploymentId}`,
      );
    }
    return guaranteeNonNullable(
      matches[0],
      `No data products found for ID ${searchDetails.dataProductId} and DID ${searchDetails.deploymentId}`,
    );
  }

  /**
   * Resolves access point schemas for the product picked inside the chat from
   * the product element and its artifact, with no product viewer involved.
   */
  async resolveAccessPointServices(): Promise<{
    services: TDSServiceSchema[];
    details: V1_EntitlementsDataProductDetails | undefined;
    productPath: string | undefined;
    environmentName: string | undefined;
  }> {
    const empty = {
      services: [],
      details: undefined,
      productPath: undefined,
      environmentName: undefined,
    };
    const searchDetails = this.selectedProduct?.dataProductDetails;
    if (
      !(searchDetails instanceof LakehouseDataProductSearchResultDetails) ||
      !searchDetails.dataProductId
    ) {
      return empty;
    }
    try {
      const graphManagerState =
        await this.baseStore.createInitializedGraphManagerState();
      const graphManager = guaranteeType(
        graphManagerState.graphManager,
        V1_PureGraphManager,
        'GraphManager must be a V1_PureGraphManager',
      );
      const details = await this.resolveEntitlementsDetails(searchDetails);
      const product = guaranteeNonNullable(
        await getDataProductFromDetails(
          details,
          graphManager,
          this.baseStore.depotServerClient,
        ),
        `Unable to resolve the data product element for ID ${searchDetails.dataProductId} and DID ${searchDetails.deploymentId}`,
      );
      const projectGAV =
        details.origin instanceof V1_SdlcDeploymentDataProductOrigin
          ? {
              groupId: details.origin.group,
              artifactId: details.origin.artifact,
              versionId: details.origin.version,
            }
          : undefined;
      const artifact = projectGAV
        ? await this.loadDataProductArtifact(projectGAV, product.path)
        : undefined;
      const engineRelationTypes = await this.loadRelationTypesFromEngine(
        product.accessPointGroups,
        artifact,
        details,
        projectGAV,
        graphManagerState,
        graphManager,
      );

      const resolvedUserEnv = await this.resolveIngestEnvironment(details);
      let environmentName: string | undefined;
      if (resolvedUserEnv) {
        environmentName = getIngestDeploymentServerConfigName(resolvedUserEnv);
        this.lastResolvedLakehouseConfig = {
          ...this.config,
          ...(environmentName ? { lakehouseEnvironment: environmentName } : {}),
          lakehouseEnvironmentClassification:
            resolvedUserEnv.environmentClassification,
        };
      }

      return {
        services: await extractTDSServicesFromDataProductSource({
          productPath: product.path,
          accessPointGroups: product.accessPointGroups.map((apg) => ({
            id: apg.id,
            title: apg.title,
            accessPoints: apg.accessPoints.map((accessPoint) => ({
              accessPoint,
              relationType: engineRelationTypes.get(accessPoint.id),
            })),
          })),
          artifact,
          sampleQueries: artifact?.nativeModelAccess?.sampleQueries ?? [],
          elementDocs: this.buildElementDocs(artifact, graphManagerState),
          graphManagerState,
        }),
        details,
        productPath: product.path,
        environmentName,
      };
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.warn(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_ACCESS_POINT_RESOLUTION_FAILURE,
        ),
        `Unable to resolve access point schemas for the selected data product: ${error.message}`,
      );
      return empty;
    }
  }

  // Resolves a dataspace's TDS executables, model context, metadata, and
  // execution context so the shared engine runs the orchestrator/TDS loop.
  async resolveDataSpaceContext(): Promise<DataSpaceScope | undefined> {
    const product = this.selectedProduct;
    const coordinates = this.selectedProductCoordinates;
    if (!product || !coordinates) {
      return undefined;
    }
    const { groupId, artifactId, versionId, path } =
      unwrapProductDetails(product);
    if (!groupId || !artifactId || !versionId || !path) {
      return undefined;
    }
    try {
      const graphManagerState =
        await this.baseStore.createInitializedGraphManagerState();
      const analysisResult = await this.baseStore.analyzeLegacyDataProduct(
        groupId,
        artifactId,
        versionId,
        path,
        graphManagerState,
      );
      const executionContext = analysisResult.defaultExecutionContext;
      const source: DataSpaceSchemaSource = {
        analysisResult,
        executionContext,
        graphManagerState,
      };
      const services = await extractTDSServicesFromDataSpaceSource(source);
      const pureExecutionContext = new QueryExplicitExecutionContextInfo();
      pureExecutionContext.mapping = executionContext.mapping.path;
      pureExecutionContext.runtime = executionContext.defaultRuntime.path;
      return {
        services,
        metadata: extractMetadataFromDataSpaceAnalysis(
          analysisResult,
          toCoordinatesString(coordinates),
          services,
        ),
        modelContext: buildDataSpaceModelContextFromSource(source, services),
        pureExecutionContext,
      };
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.warn(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_DATASPACE_CONTEXT_RESOLUTION_FAILURE,
        ),
        error,
      );
      return undefined;
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
          dataSpace = deserializeDataSpaceEntity(entity);
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
          dataSpace = deserializeDataSpaceEntity(entity);
        }
      } else {
        const entity = await this.baseStore.depotServerClient.getVersionEntity(
          coordinates.group_id,
          coordinates.artifact_id,
          coordinates.version,
          coordinates.data_product,
        );
        dataSpace = deserializeDataSpaceEntity(entity);
      }

      const executionContexts = dataSpace?.executionContexts ?? [];
      if (executionContexts.length === 0) {
        this.baseStore.applicationStore.logService.debug(
          LogEvent.create(
            LEGEND_MARKETPLACE_APP_EVENT.AI_EXECUTION_CONTEXT_RESOLUTION_FAILURE,
          ),
          `No execution context for ${coordinates.data_product}: the coordinates did not resolve to a dataspace`,
        );
        return;
      }
      const defaultCtxName = dataSpace?.defaultExecutionContext;
      const execCtx =
        executionContexts.find((c) => c.name === defaultCtxName) ??
        guaranteeNonNullable(executionContexts[0]);

      const ctx = new QueryExplicitExecutionContextInfo();
      ctx.mapping = guaranteeNonNullable(
        execCtx.mapping,
        `Execution context '${execCtx.name}' does not have a mapping`,
      ).path;
      ctx.runtime = guaranteeNonNullable(
        execCtx.defaultRuntime,
        `Execution context '${execCtx.name}' does not have a default runtime`,
      ).path;
      runInAction(() => {
        this.pureExecutionContext = ctx;
      });
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.error(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.AI_EXECUTION_CONTEXT_RESOLUTION_FAILURE,
        ),
        error,
      );
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
    this.logQuestionAsked(trimmed, true);

    try {
      this.stage = MarketplaceAIChatStage.QUERYING;
      yield this.runScopedDataQuery(trimmed, setMessages);
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
      this.logResponseReceived(startTime);
    }
  }

  private get isAccessPointScope(): boolean {
    const details = this.selectedProduct?.dataProductDetails;
    return (
      details instanceof LakehouseDataProductSearchResultDetails &&
      Boolean(details.dataProductId)
    );
  }

  /**
   * Answers a question scoped to the selected product: access-point products use
   * the access-point pipeline; everything else uses entity-search/orchestrator.
   */
  private async runScopedDataQuery(
    trimmed: string,
    setMessages: MessageSetter,
  ): Promise<void> {
    await this.runScopedDataQueryInner(trimmed, setMessages);
    await this.maybeAutoRouteToOrchestrator(trimmed, setMessages);
  }

  /**
   * When a scoped SQL answer dead-ends (0 rows / execution or generation
   * failure), auto-routes to the Legend AI Orchestrator via the SQL-path fallback.
   */
  private async maybeAutoRouteToOrchestrator(
    question: string,
    setMessages: MessageSetter,
  ): Promise<void> {
    if (!this.config.orchestratorUrl || !this.selectedProductCoordinates) {
      return;
    }
    const last = this.messages.findLast(
      (m) => m.role === LegendAIMessageRole.ASSISTANT,
    );
    const fallback = last?.fallbackAction;
    if (
      !last ||
      !fallback ||
      fallback.actionId !== LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID ||
      fallback.failedReason === undefined
    ) {
      return;
    }
    this.finalizeFallbackMessage(last.id, setMessages);
    await this.runOrchestratorFlow(
      question,
      setMessages,
      buildPriorFailure(fallback),
    );
  }

  private async runScopedDataQueryInner(
    trimmed: string,
    setMessages: MessageSetter,
  ): Promise<void> {
    if (await this.tryRunAccessPointScopedQuery(trimmed, setMessages)) {
      return;
    }
    if (await this.tryRunDataSpaceScopedQuery(trimmed, setMessages)) {
      return;
    }
    const relevantDatasets = await this.enrichWithEntitySearch(
      trimmed,
      setMessages,
    );
    await this.dispatchWithSql2(trimmed, relevantDatasets, setMessages);
  }

  // Resolves the access-point scope for the selected product, caching the
  // outcome — including "not an access-point scope" — per product.
  private async resolveAccessPointScope(): Promise<
    AccessPointScope | undefined
  > {
    const cacheKey = this.scopeCacheKey;
    if (this.accessPointScopeCache.has(cacheKey)) {
      const cached = this.accessPointScopeCache.get(cacheKey);
      this.lastResolvedLakehouseConfig = cached?.config;
      return cached;
    }
    const resolved = await this.resolveAccessPointServices();
    const scope: AccessPointScope | undefined =
      resolved.services.length === 0
        ? undefined
        : {
            services: resolved.services,
            config: this.lastResolvedLakehouseConfig ?? this.config,
            details: resolved.details,
            productPath: resolved.productPath,
            environmentName: resolved.environmentName,
          };
    this.accessPointScopeCache.set(cacheKey, scope);
    return scope;
  }

  // Answers an access-point-scoped question via the shared pipeline. Returns
  // false when this product is not a resolvable access-point scope.
  private async tryRunAccessPointScopedQuery(
    trimmed: string,
    setMessages: MessageSetter,
  ): Promise<boolean> {
    const coordinates = this.selectedProductCoordinates;
    const metadata = this.selectedProductMetadata;
    const plugin = this.plugin;
    if (!coordinates || !metadata || !plugin || !this.isAccessPointScope) {
      return false;
    }
    const scope = await this.resolveAccessPointScope();
    if (!scope) {
      return false;
    }
    const details = scope.details;
    const productPath = scope.productPath;
    runInAction(() => {
      this.resolvedProductServices = scope.services;
      this.resolvedOpenInDataCube =
        details && productPath
          ? (apName, environmentName, extraSourceData): void =>
              this.openAccessPointInDataCube(
                details,
                productPath,
                apName,
                environmentName,
                extraSourceData,
              )
          : undefined;
      this.resolvedEnvironmentName = scope.environmentName;
    });
    await processQuestion(
      trimmed,
      scope.services,
      this.scopedCoordinatesString,
      metadata,
      {
        config: scope.config,
        plugin,
        history: buildConversationHistory(this.messages),
        setMessages,
      },
      coordinates,
      this.pureExecutionContext,
    );
    return true;
  }

  // Resolves the dataspace scope for the selected product, caching the outcome
  // — including "not a dataspace" — per product.
  private async resolveDataSpaceScope(): Promise<DataSpaceScope | undefined> {
    const cacheKey = this.scopeCacheKey;
    if (this.dataSpaceScopeCache.has(cacheKey)) {
      return this.dataSpaceScopeCache.get(cacheKey);
    }
    const resolved = await this.resolveDataSpaceContext();
    const scope = resolved?.services.length ? resolved : undefined;
    this.dataSpaceScopeCache.set(cacheKey, scope);
    return scope;
  }

  // Answers a dataspace-scoped question via the shared pipeline. Returns false
  // when this product is not a resolvable dataspace scope.
  private async tryRunDataSpaceScopedQuery(
    trimmed: string,
    setMessages: MessageSetter,
  ): Promise<boolean> {
    const coordinates = this.selectedProductCoordinates;
    const plugin = this.plugin;
    if (!coordinates || !plugin || this.isAccessPointScope) {
      return false;
    }
    const scope = await this.resolveDataSpaceScope();
    if (!scope) {
      return false;
    }
    runInAction(() => {
      this.resolvedProductServices = scope.services;
      this.selectedProductMetadata = scope.metadata;
      this.pureExecutionContext = scope.pureExecutionContext;
      this.resolvedOpenInDataCube = undefined;
      this.resolvedEnvironmentName = undefined;
    });
    await processQuestion(
      trimmed,
      scope.services,
      this.scopedCoordinatesString,
      scope.metadata,
      {
        config: this.config,
        plugin,
        history: buildConversationHistory(this.messages),
        setMessages,
      },
      coordinates,
      scope.pureExecutionContext,
      scope.modelContext,
    );
    return true;
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
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.warn(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_ENTITY_DISAMBIGUATION_FAILURE,
        ),
        error,
      );
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
      sql: judgedSql,
      textAnswer: `The SQL 2.0 query executed successfully but returned **0 rows**. The applied filters may not match any records in the available datasets, or the specific values may not exist.\n\n**Queried datasets:** ${datasetList}${datasetSuffix}`,
    }));
    this.offerOrchestratorFallback(question, setMessages, startTime, {
      reason: 'The SQL query executed successfully but returned 0 rows.',
      sql: judgedSql,
    });
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
        this.offerOrchestratorFallback(question, setMessages, startTime, {
          reason: 'SQL generation did not produce a valid query.',
        });
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
        this.offerOrchestratorFallback(question, setMessages, startTime, {
          reason: 'The SQL query failed to execute.',
          sql: judgedSql,
        });
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
      this.offerOrchestratorFallback(question, setMessages, startTime, {
        reason: `Alloy SQL 2.0 encountered an error: ${error.message}`,
      });
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
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.warn(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.AI_RESULT_ANALYSIS_FAILURE,
        ),
        error,
      );
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
    failure?: { reason: string; sql?: string },
  ): void {
    this.pendingFallbackQuestion = question;
    completeThinkingSteps(setMessages);
    updateLastAssistant(setMessages, () => ({
      fallbackAction: buildOrchestratorFallbackAction(
        failure
          ? {
              failedReason: failure.reason,
              ...(failure.sql === undefined ? {} : { failedSql: failure.sql }),
            }
          : undefined,
      ),
      isProcessing: false,
      thinkingDuration: elapsedSeconds(startTime),
    }));
  }

  /**
   * Derives the orchestrator question and any prior SQL-failure context from a
   * clicked assistant message, independent of transient store state.
   */
  private deriveFallbackContext(messageId: string): {
    question: string | undefined;
    priorFailure: LegendAIPriorSqlFailure | undefined;
    resolvedEntities: LegendAIResolvedEntities | undefined;
  } {
    const assistantMsg = this.messages.find(
      (m) => m.role === LegendAIMessageRole.ASSISTANT && m.id === messageId,
    );
    const fallback =
      assistantMsg?.role === LegendAIMessageRole.ASSISTANT
        ? assistantMsg.fallbackAction
        : undefined;
    return {
      question:
        this.questionForMessage(messageId) ?? this.pendingFallbackQuestion,
      priorFailure: fallback ? buildPriorFailure(fallback) : undefined,
      resolvedEntities: fallback?.resolvedEntities,
    };
  }

  /**
   * Clears the dead-end fallback button from a message (keeping its failed SQL
   * visible) and appends a fresh assistant bubble for the orchestrator flow.
   */
  private finalizeFallbackMessage(
    messageId: string,
    setMessages: MessageSetter,
  ): void {
    setMessages((prev) => [
      ...prev.map((m) =>
        m.id === messageId && m.role === LegendAIMessageRole.ASSISTANT
          ? {
              ...m,
              sql: m.sql ?? m.fallbackAction?.failedSql ?? null,
              fallbackAction: null,
              isProcessing: false,
            }
          : m,
      ),
      createAssistantMessage(),
    ]);
  }

  /**
   * Runs the Legend AI Orchestrator against the current assistant bubble,
   * threading any prior SQL-failure context into the Pure query generation.
   */
  private async runOrchestratorFlow(
    question: string,
    setMessages: MessageSetter,
    priorFailure?: LegendAIPriorSqlFailure,
    preResolvedEntities?: LegendAIResolvedEntities,
  ): Promise<void> {
    const plugin = this.plugin;
    const coordinates = this.selectedProductCoordinates;
    const metadata = this.selectedProductMetadata;
    if (!plugin || !coordinates || !metadata) {
      finishWithThinkingError(
        setMessages,
        'Legend AI Orchestrator is not available for this product.',
        Date.now(),
        LegendAIErrorType.GENERAL,
      );
      return;
    }

    try {
      runInAction(() => {
        this.stage = MarketplaceAIChatStage.QUERYING;
      });
      const context = {
        config: this.config,
        plugin,
        history: this.buildConversationHistory(),
        setMessages,
      };

      addThinkingStep(setMessages, 'Switching to Legend AI Orchestrator...');
      if (priorFailure?.failedReason !== undefined) {
        addThinkingStep(
          setMessages,
          `Carrying over the failed SQL attempt as context: ${priorFailure.failedReason.slice(0, MAX_FALLBACK_REASON_PREVIEW)}`,
        );
      }

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
        await this.resolveExecutionContext(setMessages);
      }

      const contextPromise = this.buildContextPromise(
        question,
        metadata,
        setMessages,
      );

      await Promise.all([
        processQuestionViaOrchestrator(
          question,
          coordinates,
          metadata,
          context,
          this.pureExecutionContext,
          preResolvedEntities ?? this.lastResolvedEntities,
          undefined,
          priorFailure,
        ),
        contextPromise,
      ]);

      runInAction(() => {
        this.stage = MarketplaceAIChatStage.RESULTS;
        this.pendingFallbackQuestion = undefined;
      });
    } catch (error) {
      assertErrorThrown(error);
      finishWithThinkingError(
        setMessages,
        error.message,
        Date.now(),
        classifyError(error),
      );
    }
  }

  *runOrchestratorFallback(messageId: string): GeneratorFn<void> {
    const { question, priorFailure, resolvedEntities } =
      this.deriveFallbackContext(messageId);
    if (!question) {
      return;
    }
    this.isSending = true;
    const setMessages = this.createMessageSetter();
    this.finalizeFallbackMessage(messageId, setMessages);
    try {
      yield this.runOrchestratorFlow(
        question,
        setMessages,
        priorFailure,
        resolvedEntities,
      );
    } finally {
      this.isSending = false;
    }
  }
}
