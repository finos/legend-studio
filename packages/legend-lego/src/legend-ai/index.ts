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

export * from './LegendAITypes.js';
export * from './LegendAI_LegendApplicationPlugin_Extension.js';
export {
  LegendAIChat,
  LEGEND_AI_ANCHOR_ID,
  renderStepStatusIcon,
} from './components/LegendAIChat.js';
export {
  isStringColumn,
  isNumericColumn,
  isDateColumn,
  buildSuggestedQueries,
} from './components/LegendAIChatHelpers.js';
export { LegendAIScopeSelector } from './components/LegendAIScopeSelector.js';
export { LegendAIChatInput } from './components/LegendAIChatInput.js';
export { LegendAIErrorBoundary } from './components/LegendAIErrorBoundary.js';
export { useLegendAIChatState } from './stores/LegendAIChatState.js';
export {
  updateLastAssistant,
  addThinkingStep,
  completeThinkingSteps,
  finishWithThinkingError,
  classifyError,
  buildConversationHistory,
  buildGenerationFailureMessage,
  buildExecutionErrorMessage,
  generateAndJudgeSql,
  generateAndJudgeAccessPointSql,
  executeSqlAndReport,
  executePureQueryAndReport,
  processQuestionViaOrchestrator,
  processQuestion,
  processQuestionWithIntent,
  handleMetadataQuestion,
  buildMetadataOverview,
  attachMetadataOverview,
  elapsedSeconds,
  createMessagePair,
  analyzeOrchestratorResults,
  cleanLlmSqlResponse,
  isValidSqlCorrection,
  sanitizeJoinOrderBy,
  sanitizeJoinSameKeyColumns,
  sanitizeLiteralColumns,
  stripGuessedNonDateServiceParams,
  ensureDateParameters,
  detectMissingServiceParams,
  buildMissingParamsWarning,
  ensureSafeLimit,
  ensurePureSafetyLimit,
  detectUnsupportedEnginePattern,
  type UnsupportedEnginePattern,
  supplementMissingCoverage,
  normalizeQuestion,
  applyMultiTurnBias,
  categorizeExecutionError,
  ExecutionErrorCategory,
  type MessageSetter,
  type LegendAIOperationContext,
  type MissingParamInfo,
} from './stores/LegendAIChatProcessors.js';
export {
  preFilterServicesByRelevance,
  isFuzzyMatch,
  levenshteinDistance,
} from './LegendAIServiceRetrieval.js';
export { LegendAIResultGrid } from './components/LegendAIResultGrid.js';
export { LegendAIAnalysisPanel } from './components/LegendAIAnalysisPanel.js';
export {
  LegendAIBarChart,
  LegendAIDonutChart,
  LegendAILineChart,
} from './components/LegendAICharts.js';
export {
  type LegendAIGridAnalysis,
  computeKeyMetrics,
  computeChartData,
  inferChartType,
  computeTopItems,
  findNumericColumnName,
  analyzeGridData,
} from './components/LegendAIAnalysisUtils.js';
export {
  buildPropertyDocIndex,
  enrichColumnsFromElementDocs,
  inferServiceRelationshipsFromAssociations,
  extractLambdaPreFilters,
  formatPreFiltersForContext,
  extractModelContext,
  buildEnrichedBusinessContext,
  buildModelContextEnrichmentText,
  findBestAlternateRoot,
  resolveEntitiesDeterministic,
  buildSemanticPropertyIndex,
  splitIdentifierTokens,
} from './LegendAIDocEnrichment.js';
