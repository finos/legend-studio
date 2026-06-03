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
  isStringColumn,
  isNumericColumn,
  isDateColumn,
  buildSuggestedQueries,
} from './components/LegendAIChat.js';
export { LegendAIErrorBoundary } from './components/LegendAIErrorBoundary.js';
export {
  useLegendAIChatState,
  updateLastAssistant,
  addThinkingStep,
  completeThinkingSteps,
  finishWithThinkingError,
  buildConversationHistory,
  buildGenerationFailureMessage,
  buildExecutionErrorMessage,
  generateAndJudgeSql,
  executeSqlAndReport,
  executePureQueryAndReport,
  processQuestionViaOrchestrator,
  processQuestion,
  processQuestionWithIntent,
  handleMetadataQuestion,
  type MessageSetter,
} from './stores/LegendAIChatState.js';
export { LegendAIResultGrid } from './components/LegendAIResultGrid.js';
