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

import type { DataGridColumnDefinition } from '../data-grid/index.js';
import {
  type TDSRowDataType,
  type QueryExplicitExecutionContextInfo,
  type AbstractPureGraphManager,
  type GraphManagerState,
  buildLambdaVariableExpressions,
  VariableExpression,
  extractElementNameFromPath,
} from '@finos/legend-graph';
import { filterByType } from '@finos/legend-shared';
import type { LegendApplicationPlugin } from '@finos/legend-application';
import {
  LegendAI_LegendApplicationPlugin_Extension,
  type LegendAIOrchestratorDataProductCoordinates,
} from './LegendAI_LegendApplicationPlugin_Extension.js';

export class TDSColumnSchema {
  name!: string;
  type?: string;
  documentation?: string;
  sampleValues?: string;
  /** Whether this column is nullable (multiplicity lowerBound === 0). */
  nullable?: boolean;
  /** Physical relational type (e.g. 'VARCHAR(100)', 'DECIMAL(18,4)'). */
  relationalType?: string;
}

export class TDSParameterSchema {
  name!: string;
  type?: string;
  required?: boolean;
}

/**
 * Describes a hardcoded filter constraint baked into a service lambda.
 * These are equality checks, isEmpty/isNotEmpty checks, or isNotNull
 * guards that are applied before the TDS result is returned.
 */
export interface TDSServicePreFilter {
  /** Dot-separated property path (e.g. 'FeSecCoveragePublic.SymCoveragePublicEquities.SymSecEntityPublic.fsymId'). */
  property: string;
  /** The comparison operator. */
  operator: 'equal' | 'isEmpty' | 'isNotEmpty' | 'isNotNull';
  /** The literal value for equality comparisons. */
  value?: string | number | boolean;
}

export enum TDSServiceSourceType {
  SERVICE = 'service',
  ACCESS_POINT = 'accessPoint',
}

export class TDSServiceSchema {
  title!: string;
  description?: string;
  pattern!: string;
  columns!: TDSColumnSchema[];
  parameters!: string[];
  /**
   * Rich parameter metadata including type and multiplicity.
   * When populated, downstream consumers can use this for richer
   * prompts and user-facing hints. Falls back to `parameters` names.
   */
  parameterSchemas?: TDSParameterSchema[];
  /**
   * Indicates the source of this service schema.
   * - SERVICE: traditional DataSpace service executable (uses `FROM service(...)` SQL syntax)
   * - ACCESS_POINT: data product access point (uses `FROM p(...)` SQL syntax with lakehouse runtime)
   */
  sourceType?: TDSServiceSourceType;
  /** Full data product path (e.g. 'my::package::DataProduct'), used with `p()` syntax for access points. */
  dataProductPath?: string;
  /**
   * Set to true when parameter extraction from the service query failed.
   * Downstream consumers can use this to warn users that required parameters
   * may not be detected automatically.
   */
  parameterExtractionFailed?: boolean;
  /** Access point group title this AP belongs to. */
  accessPointGroupTitle?: string;
  /** Raw DDL script (CREATE VIEW/TABLE) from the access point resource builder. */
  ddlScript?: string;
  /**
   * Hardcoded filter constraints extracted from the service lambda.
   * These indicate pre-applied conditions the AI must not contradict.
   */
  preFilters?: TDSServicePreFilter[];
}

export class LegendAIConfig {
  enabled!: boolean;
  llmServiceUrl!: string | undefined;
  llmModelName!: string | undefined;
  llmModelOptions?: string[];
  sqlExecutionUrl!: string | undefined;
  orchestratorUrl!: string | undefined;
  marketplaceSearchUrl!: string | undefined;
  engineUrl!: string | undefined;
  orchestratorAuthToken?: string;
  maxJudgeAttempts?: number;
  /** Lakehouse runtime environment name (e.g. 'prod', 'uat'). Defaults to 'prod' when not set. */
  lakehouseEnvironment?: string;
  /** URL to EngHub documentation for Legend AI setup. */
  enghubDocUrl?: string;
  /** URL to EntHub request access page for the AI coverage app. */
  enthubRequestAccessUrl?: string;
}

export const DEFAULT_LEGEND_AI_CONFIG: LegendAIConfig = Object.freeze({
  enabled: false,
  llmServiceUrl: undefined,
  llmModelName: undefined,
  sqlExecutionUrl: undefined,
  orchestratorUrl: undefined,
  marketplaceSearchUrl: undefined,
  engineUrl: undefined,
});

/** Runtime environment name that indicates production. */
export const LAKEHOUSE_ENV_PROD = 'prod';
/** EngHub coverage app name for production. */
export const COVERAGE_NAME_PROD = 'legend-ai';
/** EngHub coverage app name for non-production (sandbox). */
export const COVERAGE_NAME_SANDBOX = 'Legend-AI-Sandbox';

/**
 * Delimiter used in TDS column `doc` fields to separate human-readable
 * documentation from sample values.  Shared across DataProduct and
 * DataSpace parsers.
 */
export const TDS_SAMPLE_VALUES_DELIMITER = '-- e.g.';

export function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Action ID used to offer the Legend AI Orchestrator as a fallback. */
export const LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID =
  'orchestrator-fallback';

export function findLegendAIPlugin(
  plugins: LegendApplicationPlugin[],
): LegendAI_LegendApplicationPlugin_Extension | undefined {
  return plugins.find(
    (p): p is LegendAI_LegendApplicationPlugin_Extension =>
      p instanceof LegendAI_LegendApplicationPlugin_Extension,
  );
}

export class LegendAIGridData {
  columnDefs!: DataGridColumnDefinition[];
  rowData!: TDSRowDataType[];
}

export function buildColumnDefsFromNames(
  columns: string[],
): DataGridColumnDefinition[] {
  return columns.map((col) => ({
    colId: col,
    headerName: col,
    field: col,
  }));
}

export enum LegendAIThinkingStepStatus {
  ACTIVE = 'active',
  DONE = 'done',
  ERROR = 'error',
}

export class LegendAIThinkingStep {
  id!: string;
  label!: string;
  status!: LegendAIThinkingStepStatus;
}

export enum LegendAIErrorType {
  PERMISSION = 'PERMISSION',
  NETWORK = 'NETWORK',
  EXECUTION = 'EXECUTION',
  GENERATION = 'GENERATION',
  GENERAL = 'GENERAL',
}

export class LegendAIServiceError extends Error {
  override name = 'LegendAIServiceError';
  errorType: LegendAIErrorType;

  constructor(message: string, errorType: LegendAIErrorType) {
    super(message);
    this.errorType = errorType;
  }
}

export class LegendAIUnsupportedEngineShapeError extends LegendAIServiceError {
  override name = 'LegendAIUnsupportedEngineShapeError';

  constructor(hint: string) {
    super(hint, LegendAIErrorType.EXECUTION);
  }
}

export enum LegendAIMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export class LegendAIUserMessage {
  id!: string;
  role!: LegendAIMessageRole.USER;
  text!: string;
}

export interface LegendAIFallbackAction {
  label: string;
  actionId: string;
}

export enum LegendAIMessageFeedbackRating {
  THUMBS_UP = 'thumbs_up',
  THUMBS_DOWN = 'thumbs_down',
}

export interface LegendAIMessageFeedback {
  messageId: string;
  rating: LegendAIMessageFeedbackRating;
  question: string;
  answer?: string;
  sql?: string;
  rowCount?: number;
}

export class LegendAIAssistantMessage {
  id!: string;
  role!: LegendAIMessageRole.ASSISTANT;
  thinkingSteps!: LegendAIThinkingStep[];
  sql!: string | null;
  textAnswer!: string | null;
  dataContext!: string | null;
  gridData!: LegendAIGridData | null;
  error!: string | null;
  errorType!: LegendAIErrorType | null;
  sqlGenTime!: string | null;
  execTime!: string | null;
  thinkingDuration!: string | null;
  isProcessing!: boolean;
  isExecuting!: boolean;
  suggestedQueries!: string[];
  fallbackAction!: LegendAIFallbackAction | null;
  queriedAccessPointGroups!: string[];
}

export type LegendAIMessage = LegendAIUserMessage | LegendAIAssistantMessage;

export class LegendAIConversationTurn {
  question!: string;
  sql!: string;
  /**
   * The intent classification of this turn, allowing downstream prompts
   * to differentiate prior metadata answers from SQL query results.
   */
  intent?: LegendAIQuestionIntent;
  /** Number of rows returned by the query, when available. */
  rowCount?: number;
  /** Brief summary of the result (e.g. column names, first few values). */
  resultSummary?: string;
}

export interface LegendAIChatState {
  questionText: string;
  setQuestionText: (text: string) => void;
  isSending: boolean;
  messages: LegendAIMessage[];
  selectedModelName: string | undefined;
  availableModelNames: string[];
  setSelectedModelName: (modelName: string) => void;
  askQuestion: () => void;
  askQuestionWithIntent: (text: string, intent: LegendAIQuestionIntent) => void;
  runFallbackAction: (messageId: string) => void;
  clearChat: () => void;
  expandedThinking: Set<number>;
  toggleThinking: (index: number) => void;
  conversationRef: { readonly current: HTMLDivElement | null };
  selectedScopes: LegendAIScopeItem[];
  toggleScope: (scope: LegendAIScopeItem) => void;
  removeScope: (scopeId: string) => void;
  stopGeneration: () => void;
}

export interface LegendAIScopeItem {
  id: string;
  label: string;
  description?: string;
}

export interface LegendAIServiceSummary {
  title: string;
  description?: string;
  columnNames?: string[];
  parameters?: string[];
}

export interface LegendAIAccessPointInfo {
  title?: string;
  description?: string;
}

export interface LegendAITagInfo {
  profile: string;
  value: string;
}

export class LegendAIAccessPointGroupInfo {
  title!: string;
  description?: string;
  accessPoints!: LegendAIAccessPointInfo[];
}

export interface LegendAIAccessPointRelationship {
  leftAccessPoint: string;
  rightAccessPoint: string;
  sharedColumns: string[];
}

/**
 * Describes a relationship between two TDS services in a DataSpace,
 * derived from model association documentation (elementDocs).
 * Used to generate accurate JOIN hints in LLM prompts.
 */
export interface LegendAIServiceRelationship {
  /** Title of the first service. */
  leftService: string;
  /** Title of the second service. */
  rightService: string;
  /** Column names that can serve as JOIN keys between the services. */
  joinColumns: string[];
  /** Name of the intermediate entity connecting both services (e.g. "Own2Ownermap"). */
  viaEntity?: string;
  /** Cardinality from the connecting entity to the left service (e.g. "1:*"). */
  leftCardinality?: string;
  /** Cardinality from the connecting entity to the right service (e.g. "1:*"). */
  rightCardinality?: string;
}

export class LegendAIProductMetadata {
  name!: string;
  description?: string;
  coordinates!: string;
  serviceSummaries!: LegendAIServiceSummary[];
  accessPointGroups?: LegendAIAccessPointGroupInfo[];
  tags?: LegendAITagInfo[];
  supportInfo?: string;
  /** Inferred cross-access-point relationships based on shared column names. */
  accessPointRelationships?: LegendAIAccessPointRelationship[];
  /** Cross-service relationships derived from model associations (elementDocs). */
  serviceRelationships?: LegendAIServiceRelationship[];
  /** Per-product domain knowledge for LLM context enrichment. */
  domainContext?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Model context for local entity resolution (DataSpaces only)
// ────────────────────────────────────────────────────────────────────────────

export interface LegendAIModelProperty {
  name: string;
  type: string;
  isCollection: boolean;
  isOptional: boolean;
}

export interface LegendAIModelEntity {
  path: string;
  name: string;
  description?: string;
  properties: LegendAIModelProperty[];
  isRootMapped?: boolean;
  isQueryable?: boolean;
  superTypes?: string[];
}

export interface LegendAIModelAssociation {
  name: string;
  leftEntity: string;
  leftProperty: string;
  rightEntity: string;
  rightProperty: string;
}

export interface LegendAIColumnPropertyMapping {
  columnName: string;
  propertyPath: string;
}

export interface LegendAIParameterInfo {
  name: string;
  type: string;
}

export interface LegendAIEnumerationInfo {
  path: string;
  name: string;
  values: string[];
}

export interface LegendAIExecutableInfo {
  title: string;
  description?: string;
  rootEntityPath: string;
  referencedEntityPaths?: string[];
  columns?: string[];
  queryTemplate?: string;
  requiredParameters?: LegendAIParameterInfo[];
  columnPropertyMappings?: LegendAIColumnPropertyMapping[];
}

export interface LegendAIModelContext {
  entities: LegendAIModelEntity[];
  associations: LegendAIModelAssociation[];
  enumerations?: LegendAIEnumerationInfo[];
  executables?: LegendAIExecutableInfo[];
  dataspaceDescription?: string;
}

export enum LegendAIQuestionIntent {
  DATA_QUERY = 'data_query',
  METADATA = 'metadata',
  ORCHESTRATOR = 'orchestrator',
}

export const METADATA_SIGNAL_PATTERNS: readonly RegExp[] = Object.freeze([
  /\b(?:what\s+does\s+this\s+(?:data\s*product|dataspace|data\s*space|product)\s+(?:do|provide|contain|offer|have))\b/,
  /\b(?:describe|explain|summarize|summary|overview)\s+(?:this\s+)?(?:data\s*product|dataspace|data\s*space|product)\b/,
  /\b(?:tell\s+me\s+about)\s+(?:this\s+)?(?:data\s*product|dataspace|data\s*space|product)\b/,
  /\b(?:what\s+(?:services?|endpoints?|access\s*points?|columns?|fields?)\s+(?:are|is|does))\b/,
  /\b(?:list|what\s+are)\s+(?:the\s+)?(?:available\s+)?(?:services?|endpoints?|capabilities)\b/,
  /\b(?:list|what\s+are)\s+(?:the\s+)?(?:available\s+)?access\s*points?\b/,
  /\b(?:who\s+(?:owns?|maintains?|created?|manages?|supports?))\b/,
  /\b(?:owner(?:ship)?|maintainer|contact\s+(?:info|email|team|details)|support\s+(?:info|email|team))\b/,
  /\b(?:classifications?|tags?|stereotypes?)\s+(?:of|for|on)\s+(?:this|the)\b/,
  /\bsummarize\s+what\s+(?:you|this|it)\s+(?:have|has|provide|offers?|contains?)\b/,
  /\bwhat\s+(?:do\s+you|does\s+it|does\s+this)\s+(?:have|provide|offer|contain)\b/,
  /\b(?:how\s+many)\s+(?:services?|endpoints?|access\s*points?|columns?|fields?)\b/,
  /\b(?:what\s+(?:type|kind|format))\s+(?:of|is)\b/,
  /^(?:summarize|describe|explain|overview)\b/,
  /\b(?:summary|overview|description)\s+(?:of|about)\b/,
  /\bwhat\s+(?:is|are)\s+(?:this|the|it)\b/,
  /\btell\s+me\s+(?:about|more)\b/,
  /\bwhat\s+(?:\S+\s+)*(?:provides?|offers?|contains?|includes?)\s*$/,
  /\bhow\s+does\s+(?:\S+\s+)*(?:work|function|operate)\b/,
  /\bwhat\s+can\s+(?:i|we|you)\b/,
  /\b(?:used\s+for|meant\s+for|designed\s+for|purpose\s+of)\b/,
  /\b(?:help\s+me\s+(?:understand|with))\b/,
  /\bwhat\s+(?:information|data|content|datasets?)\s+(?:is|are|does)\b/,
  /\b(?:what\s+does)\s+\S+(?:\s+\S+)*\s+(?:do|provide|offer|contain|include|cover)\b/,
  /\b(?:how\s+are)\s+(?:these|the|those|this)\s+(?:\S+\s+)*(?:related|connected|linked|different|similar)\b/,
  /\b(?:relationship|similarities|differences)\s+(?:between|across|among)\b/,
  /\b(?:can\s+(?:we|i|you)\s+(?:join|combine|link|relate|connect))\s+(?:these|the|those|them)\b/,
]);

export const DATA_QUERY_SIGNAL_PATTERNS: readonly RegExp[] = Object.freeze([
  /\b(?:select|query|sql|rows?|records?|count|sum|avg|average|min|max|total)\b/,
  /\b(?:top\s+\d+|first\s+\d+|last\s+\d+|limit\s+\d+)\b/,
  /\b(?:filter|where|group\s+by|order\s+by|sort|aggregate)\b/,
  /\bjoin\s+(?:on|using|between|the\s+(?:tables?|services?|data))\b/,
  /\b(?:distinct|unique)\s+(?:values?|entries?|items?)/,
  /\bfrom\s+(?:\S+\s+)*service\b/,
  /\b(?:show|give|get|fetch|retrieve|pull|find|provide|display|return)\s+(?:me\s+)?/,
  /\b(?:compare|comparison|versus|vs\.?)\b/,
  /\b(?:what\s+percentage|what\s+%|what\s+proportion|what\s+fraction)\b/,
  /\b(?:which\s+\w+s?\s+(?:does|do|did|has|have|is|are|generate|earn|produce))\b/,
  /\b(?:how\s+(?:much|many|often))\b/,
  /\b\d{4}[-/]\d{2}[-/]\d{2}\b/,
  /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d/,
  /\b(?:as\s+of|since|before|after|between|from|until|latest|recent|yesterday|today)\b/,
  /\blast\s+(?:year|month|week|quarter|fiscal)\b/,
  /\b(?:fiscal\s+(?:year|quarter)|fy\s*\d|q[1-4]\s*\d{4})\b/,
  /\b(?:sedol|isin|cusip|ticker|symbol)[\s:=]*\w+/,
  /\([A-Z]{1,5}\)/,
  /\b(?:bonds?|securities|equities|options?|futures?|swaps?)\b/,
  /\b(?:stocks?|cds|etfs?|funds?)\b/,
  /\b(?:score|scores|spread|spreads|yield|yields|duration|convexity|coupon|nav|oas|dv01|notional|bid|ask|mid|vwap)\b/,
  /\b(?:revenue|sales|income|profit|earnings|margin|growth|volume|price|rate|exposure)\b/,
  /\b(?:breakdown|distribution|composition|split|allocation|attribution|ranking|trend)\b/,
  /\b(?:per\s+(?:country|region|year|month|quarter|segment|category))\b/,
  /\b(?:grouped?\s+by|broken?\s+down\s+by|split\s+by|segmented?\s+by)\b/,
]);

const EXPLICIT_METADATA_OVERRIDE_PATTERNS: readonly RegExp[] = [
  /\b(?:from|using|based\s+on|answer\s+from|just)\s+(?:the\s+)?metadata\b/,
  /\b(?:don'?t|do\s+not|no)\s+(?:run\s+(?:a\s+)?)?(?:query|queries|sql|execute|fetch)\b/,
  /\bjust\s+(?:answer|explain|describe|tell\s+me)\b/,
  /\b(?:without|skip)\s+(?:querying|executing|running|fetching)\b/,
];

const PRODUCT_REFERENCE_PATTERN =
  /\b(?:this|the)\s+(?:data\s*product|dataspace|data\s*space|product)\b/;

const STRUCTURAL_KEYWORD_PATTERN =
  /\b(?:services?|endpoints?|access\s*points?|capabilities|owner|maintainer|support)\b/;

const CAPABILITY_DISCOVERY_PATTERNS: readonly RegExp[] = [
  /\bwhat\s+data\s+does\b/,
  /\bwhat\s+does\s+\S+(?:\s+\S+)*\s+offer\b/,
  /\bhow\s+can\s+i\s+use\b/,
];

function countPatternMatches(
  question: string,
  patterns: readonly RegExp[],
): number {
  let count = 0;
  for (const pattern of patterns) {
    if (pattern.test(question)) {
      count++;
    }
  }
  return count;
}

/**
 * Result of the fast deterministic regex-based classifier.
 * Includes the scores and resolved intent so callers can decide
 * whether the classification is confident or needs LLM arbitration.
 */
export class QuestionIntentClassification {
  intent!: LegendAIQuestionIntent;
  metaScore!: number;
  dataScore!: number;
  ambiguous!: boolean;
}

function maskEntityNames(question: string, entityNames: string[]): string {
  const escaped = entityNames
    .filter((name) => name.length > 0)
    .map((name) =>
      name.toLowerCase().replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`),
    );
  if (escaped.length === 0) {
    return question;
  }
  return question.replaceAll(new RegExp(escaped.join('|'), 'g'), '___');
}

function classifyMixedSignal(
  q: string,
  metaScore: number,
  dataScore: number,
): QuestionIntentClassification {
  if (dataScore >= metaScore * 2) {
    return {
      intent: LegendAIQuestionIntent.DATA_QUERY,
      metaScore,
      dataScore,
      ambiguous: false,
    };
  }
  if (PRODUCT_REFERENCE_PATTERN.test(q) || STRUCTURAL_KEYWORD_PATTERN.test(q)) {
    return {
      intent: LegendAIQuestionIntent.METADATA,
      metaScore,
      dataScore,
      ambiguous: false,
    };
  }
  if (CAPABILITY_DISCOVERY_PATTERNS.some((p) => p.test(q))) {
    return {
      intent: LegendAIQuestionIntent.METADATA,
      metaScore,
      dataScore,
      ambiguous: false,
    };
  }
  return {
    intent:
      metaScore > dataScore
        ? LegendAIQuestionIntent.METADATA
        : LegendAIQuestionIntent.DATA_QUERY,
    metaScore,
    dataScore,
    ambiguous: true,
  };
}

/**
 * Fast deterministic regex classifier (sync, < 1ms).
 * Returns both the resolved intent AND whether the result is ambiguous,
 * so callers can decide to escalate to an LLM for ambiguous cases.
 */
export function classifyQuestionIntentFast(
  question: string,
  hasServices: boolean,
  entityNames?: string[],
): QuestionIntentClassification {
  const q = question.toLowerCase().trim();

  if (EXPLICIT_METADATA_OVERRIDE_PATTERNS.some((p) => p.test(q))) {
    return {
      intent: LegendAIQuestionIntent.METADATA,
      metaScore: 1,
      dataScore: 0,
      ambiguous: false,
    };
  }

  const metaScore = countPatternMatches(q, METADATA_SIGNAL_PATTERNS);
  const qForDataScore =
    entityNames && entityNames.length > 0 ? maskEntityNames(q, entityNames) : q;
  const dataScore = countPatternMatches(
    qForDataScore,
    DATA_QUERY_SIGNAL_PATTERNS,
  );

  if (metaScore > 0 && dataScore === 0) {
    const isStructural =
      PRODUCT_REFERENCE_PATTERN.test(q) || STRUCTURAL_KEYWORD_PATTERN.test(q);
    const isCapabilityDiscovery = CAPABILITY_DISCOVERY_PATTERNS.some((p) =>
      p.test(q),
    );
    return {
      intent: LegendAIQuestionIntent.METADATA,
      metaScore,
      dataScore,
      ambiguous: hasServices && !isStructural && !isCapabilityDiscovery,
    };
  }
  if (dataScore > 0 && metaScore === 0) {
    return {
      intent: LegendAIQuestionIntent.DATA_QUERY,
      metaScore,
      dataScore,
      ambiguous: false,
    };
  }
  if (metaScore > 0 && dataScore > 0) {
    return classifyMixedSignal(q, metaScore, dataScore);
  }

  return {
    intent: hasServices
      ? LegendAIQuestionIntent.DATA_QUERY
      : LegendAIQuestionIntent.METADATA,
    metaScore,
    dataScore,
    ambiguous: true,
  };
}

/**
 * Legacy synchronous classifier for backward compatibility.
 * Returns just the intent, discarding ambiguity info.
 */
export function classifyQuestionIntent(
  question: string,
  hasServices: boolean,
  entityNames?: string[],
): LegendAIQuestionIntent {
  return classifyQuestionIntentFast(question, hasServices, entityNames).intent;
}

export async function extractParameterSchemas(
  query: string,
  graphManager: AbstractPureGraphManager,
  graphManagerState: GraphManagerState,
): Promise<{
  parameters: string[];
  parameterSchemas: TDSParameterSchema[];
  parameterExtractionFailed: boolean;
}> {
  try {
    const rawLambda = await graphManager.pureCodeToLambda(query);
    const varExpressions = buildLambdaVariableExpressions(
      rawLambda,
      graphManagerState,
    ).filter(filterByType(VariableExpression));
    return {
      parameters: varExpressions.map((v) => v.name),
      parameterSchemas: varExpressions.map((v) => {
        const schema: TDSParameterSchema = { name: v.name };
        const typePath = v.genericType?.ownerReference.value.path;
        if (typePath) {
          schema.type = extractElementNameFromPath(typePath);
        }
        if (v.multiplicity.lowerBound > 0) {
          schema.required = true;
        }
        return schema;
      }),
      parameterExtractionFailed: false,
    };
  } catch {
    return {
      parameters: [],
      parameterSchemas: [],
      parameterExtractionFailed: true,
    };
  }
}

export interface LegendAIChatProps {
  services: TDSServiceSchema[];
  coordinates: string;
  config: LegendAIConfig;
  metadata: LegendAIProductMetadata;
  title?: string;
  plugin: LegendAI_LegendApplicationPlugin_Extension;
  /**
   * Structured data product coordinates for the Legend AI Orchestrator flow.
   * When provided alongside an orchestratorUrl in config, enables ad-hoc
   * query generation via entity resolution + orchestrator.
   */
  dataProductCoordinates?: LegendAIOrchestratorDataProductCoordinates;
  /**
   * Execution context (mapping + runtime) for executing Pure queries
   * returned by the orchestrator. Required for the execute-after-generate flow.
   */
  pureExecutionContext?: QueryExplicitExecutionContextInfo;
  modelContext?: LegendAIModelContext;
  availableScopes?: LegendAIScopeItem[];
  /** Called when the user clicks the close button in the chat header. */
  onClose?: () => void;
  /** Called when the user clicks the minimize button in the chat header. */
  onMinimize?: () => void;
  /**
   * Optional callback fired when users submit thumbs-up/down feedback
   * for an assistant response.
   */
  onMessageFeedback?: (
    feedback: LegendAIMessageFeedback,
  ) => Promise<void> | void;
  onRequestAccess?: (accessPointGroupTitle: string) => void;
  contextBannerMessage?: string;
}
