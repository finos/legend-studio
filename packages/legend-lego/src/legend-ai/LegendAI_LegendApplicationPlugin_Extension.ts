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
   * Send a prompt to the LLM service and return the raw response text.
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
}
