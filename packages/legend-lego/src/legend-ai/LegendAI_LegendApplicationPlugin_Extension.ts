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
  LegendApplicationPlugin,
  type LegendApplicationPluginManager,
} from '@finos/legend-application';
import type {
  QueryExplicitExecutionContextInfo,
  TDSRowDataType,
} from '@finos/legend-graph';
import type {
  TDSServiceSchema,
  LegendAIConfig,
  LegendAIConversationTurn,
  LegendAIProductMetadata,
  LegendAIQuestionIntent,
} from './LegendAITypes.js';

export class LegendAISqlExtractionResult {
  sql!: string | null;
  failure!: string | null;
  suggestion?: string;
}

export enum LegendAIJudgeVerdict {
  PASS = 'PASS',
  FAIL = 'FAIL',
}

export class LegendAIJudgeResult {
  verdict!: LegendAIJudgeVerdict;
  issues?: string;
  correctedSql?: string;
}

export class LegendAISqlExecutionResultData {
  columns!: string[];
  rows!: TDSRowDataType[];
}

export class LegendAIOrchestratorDataProductCoordinates {
  data_product!: string;
  group_id!: string;
  artifact_id!: string;
  version!: string;
}

export interface LegendAISemanticSearchResolutionDetails {
  data_product_coordinates: LegendAIOrchestratorDataProductCoordinates;
  root_entity: string;
  related_entities: string[];
}

export class LegendAIOrchestratorRequest {
  user_question!: string;
  semantic_search_resolution_details!: LegendAISemanticSearchResolutionDetails;
}

export class LegendAIOrchestratorResponse {
  legend_query!: string;
}

export class LegendAIResolvedEntities {
  rootEntity!: string;
  relatedEntities!: string[];
}

export class LegendAIEntityCandidate {
  datasetName!: string;
  description?: string;
  modelPath!: string;
  similarityScore!: number;
}

export enum LegendAIChartType {
  BAR = 'bar',
  LINE = 'line',
  PIE = 'pie',
  TABLE = 'table',
  NONE = 'none',
}

export class LegendAIChartRecommendation {
  chartType!: LegendAIChartType;
  xAxis?: string;
  yAxis?: string;
  label?: string;
  reasoning!: string;
}

export class LegendAIKeyMetric {
  label!: string;
  value!: string;
  detail?: string;
}

export class LegendAIChartDataPoint {
  label!: string;
  value!: number;
  color?: string;
  colorIndex?: number;
}

export class LegendAIResultAnalysis {
  summary!: string;
  chartRecommendation?: LegendAIChartRecommendation;
  keyMetrics!: LegendAIKeyMetric[];
  chartData!: LegendAIChartDataPoint[];
  suggestedQueries!: string[];
}

/**
 * @deprecated Use {@link QueryExplicitExecutionContextInfo} from `@finos/legend-graph` directly.
 */
export type LegendAIPureExecutionContext = QueryExplicitExecutionContextInfo;

export abstract class LegendAI_LegendApplicationPlugin_Extension extends LegendApplicationPlugin {
  /**
   * This helps to better type-check for this empty abstract type
   * See https://github.com/finos/legend-studio/blob/master/docs/technical/typescript-usage.md#understand-typescript-structual-type-system
   */
  private readonly _$nominalTypeBrand!: 'LegendAI_LegendApplicationPlugin_Extension';

  install(
    pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>,
  ): void {
    pluginManager.registerApplicationPlugin(this);
  }

  /**
   * Classify the user question as either a data query or a metadata question.
   *
   * This is async to allow implementations to use an LLM micro-classifier
   * for ambiguous questions while falling back to fast regex for clear-cut cases.
   */
  abstract classifyQuestionIntent(
    question: string,
    hasServices: boolean,
    config: LegendAIConfig,
    serviceNames?: string[],
  ): Promise<LegendAIQuestionIntent>;

  /**
   * Build the LLM prompt for answering a metadata question about the product.
   */
  abstract buildMetadataPrompt(
    question: string,
    metadata: LegendAIProductMetadata,
    history?: LegendAIConversationTurn[],
  ): string;

  /**
   * Build the LLM prompt for generating a SQL query from the user question.
   */
  abstract buildGeneratorPrompt(
    question: string,
    services: TDSServiceSchema[],
    coordinates: string,
    history?: LegendAIConversationTurn[],
    metadata?: LegendAIProductMetadata,
  ): string;

  /**
   * Build the LLM prompt for verifying and correcting a generated SQL query.
   */
  abstract buildJudgePrompt(
    sql: string,
    question: string,
    services: TDSServiceSchema[],
    coordinates: string,
    history?: LegendAIConversationTurn[],
  ): string;

  /**
   * Build the LLM prompt for generating a SQL query targeting data product
   * access points. Unlike service-based prompts this uses `p()` syntax,
   * has no coordinates or parameters, and focuses on lakehouse execution.
   */
  abstract buildAccessPointGeneratorPrompt(
    question: string,
    accessPoints: TDSServiceSchema[],
    history?: LegendAIConversationTurn[],
  ): string;

  /**
   * Build the LLM prompt for verifying and correcting a SQL query that
   * targets data product access points using `p()` syntax.
   */
  abstract buildAccessPointJudgePrompt(
    sql: string,
    question: string,
    accessPoints: TDSServiceSchema[],
    history?: LegendAIConversationTurn[],
  ): string;

  /**
   * Send a prompt to the LLM service and return the raw response text.
   * The plugin manages conversation lifecycle internally — callers
   * do not need to create or track conversations.
   */
  abstract callLLM(prompt: string, config: LegendAIConfig): Promise<string>;

  /**
   * Execute a SQL query against the data platform and return tabular results.
   */
  abstract executeSql(
    sql: string,
    config: LegendAIConfig,
  ): Promise<LegendAISqlExecutionResultData>;

  /**
   * Parse the LLM generator response to extract the SQL query or failure reason.
   */
  abstract extractSqlFromResponse(
    answerText: string,
  ): LegendAISqlExtractionResult;

  /**
   * Parse the LLM judge response to extract the verdict and optional corrections.
   */
  abstract extractJudgeResult(answerText: string): LegendAIJudgeResult;

  /**
   * Call the Legend AI Orchestrator to generate a Legend/PURE query from
   * natural language using resolved entity information.
   */
  abstract generateQueryViaOrchestrator(
    request: LegendAIOrchestratorRequest,
    config: LegendAIConfig,
  ): Promise<LegendAIOrchestratorResponse>;

  /**
   * Resolve root and related entities for a given user query within a data product.
   * Uses the dataset search API to determine which entities are most relevant.
   */
  abstract resolveEntitiesForQuery(
    query: string,
    dataProductCoordinates: LegendAIOrchestratorDataProductCoordinates,
    config: LegendAIConfig,
    pureExecutionContext?: QueryExplicitExecutionContextInfo,
  ): Promise<LegendAIResolvedEntities>;

  /**
   * Execute a Pure/Legend query against the engine and return tabular results.
   * Converts the Pure expression text to a lambda, then executes it using
   * the engine's execution endpoint with the provided execution context.
   */
  abstract executePureQuery(
    pureQuery: string,
    executionContext: QueryExplicitExecutionContextInfo,
    dataProductCoordinates: LegendAIOrchestratorDataProductCoordinates,
    config: LegendAIConfig,
  ): Promise<LegendAISqlExecutionResultData>;

  /**
   * Execute a SQL query that uses `p()` syntax against data product access points.
   * Wraps the SQL in `#SQL{...}#`, builds a lakehouse runtime, and executes via the engine.
   */
  abstract executeLakehouseSql(
    sql: string,
    dataProductCoordinates: LegendAIOrchestratorDataProductCoordinates,
    config: LegendAIConfig,
  ): Promise<LegendAISqlExecutionResultData>;

  /**
   * Analyze query results using the LLM to produce a summary, chart
   * recommendation, key metrics, and suggested follow-up queries.
   */
  abstract analyzeQueryResults(
    question: string,
    query: string,
    columns: string[],
    rows: TDSRowDataType[],
    metadata: LegendAIProductMetadata,
    config: LegendAIConfig,
  ): Promise<LegendAIResultAnalysis | undefined>;

  /**
   * Build a fallback analysis when the query returns no results.
   */
  abstract buildNoResultsFallback(
    question: string,
    query: string,
    metadata: LegendAIProductMetadata,
    config: LegendAIConfig,
  ): Promise<LegendAIResultAnalysis | undefined>;

  /**
   * Build a contextual summary of the data product for the user.
   */
  abstract buildDataContextSummary(
    question: string,
    metadata: LegendAIProductMetadata,
    config: LegendAIConfig,
  ): Promise<string | undefined>;

  /**
   * Build a fallback message when query execution fails.
   */
  abstract buildFailureFallback(
    question: string,
    errorMessage: string,
    metadata: LegendAIProductMetadata,
    config: LegendAIConfig,
  ): Promise<string | undefined>;

  /**
   * Given a user question and pre-fetched entity search candidates, disambiguate
   * which entity is the correct root for the query. Uses LLM disambiguation
   * and/or probing to pick the best entity.
   */
  abstract disambiguateEntity(
    question: string,
    candidates: LegendAIEntityCandidate[],
    config: LegendAIConfig,
    pureExecutionContext?: QueryExplicitExecutionContextInfo,
    dataProductCoordinates?: LegendAIOrchestratorDataProductCoordinates,
  ): Promise<LegendAIResolvedEntities>;

  /**
   * Given a user question and candidate data products (with their matched fields),
   * use the LLM to pick the top N most relevant products.
   * Returns 0-based indices into the candidates array, ordered by relevance.
   * Returns undefined if reranking is not possible (e.g. LLM unavailable).
   */
  abstract rerankProducts(
    question: string,
    candidates: {
      title: string;
      description: string;
      matchedFields: string[];
    }[],
    allFieldNames: string[],
    topN: number,
    config: LegendAIConfig,
  ): Promise<number[] | undefined>;

  /**
   * Given a user question and available services, use LLM to select the most
   * relevant service(s) for SQL generation. Returns the filtered subset of
   * services. Default implementation returns all services (no pre-filtering).
   * Override in plugins to add LLM-based service selection.
   */
  selectRelevantServices(
    _question: string,
    services: TDSServiceSchema[],
    _config: LegendAIConfig,
  ): Promise<TDSServiceSchema[]> {
    return Promise.resolve(services);
  }

  /**
   * Probe a service by executing SELECT * LIMIT 1 to discover the real column
   * names from the engine. Returns the actual column names or undefined if
   * probing fails (non-fatal). This is the ground truth for column names.
   */
  probeServiceColumns(
    _service: TDSServiceSchema,
    _coordinates: string,
    _config: LegendAIConfig,
  ): Promise<string[] | undefined> {
    return Promise.resolve(undefined);
  }

  /**
   * Build an error correction prompt that feeds the execution error back to
   * the LLM and asks it to fix the SQL. Used in the execution retry loop.
   */
  abstract buildErrorCorrectionPrompt(
    failedSql: string,
    errorMessage: string,
    question: string,
    services: TDSServiceSchema[],
    coordinates: string,
    availableColumns?: string[],
  ): string;

  /**
   * Build a zero-row correction prompt that asks the LLM to relax or fix
   * filters when a syntactically valid query returns 0 rows.
   */
  abstract buildZeroRowCorrectionPrompt(
    sql: string,
    question: string,
    services: TDSServiceSchema[],
    coordinates: string,
  ): string;
}
