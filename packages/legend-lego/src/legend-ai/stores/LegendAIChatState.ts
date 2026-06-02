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

import { useState, useRef, useCallback, useEffect } from 'react';
import { assertErrorThrown, noop, uuid } from '@finos/legend-shared';
import {
  type TDSServiceSchema,
  type LegendAIConfig,
  type LegendAIChatState,
  type LegendAIAssistantMessage,
  type LegendAIUserMessage,
  type LegendAIMessage,
  type LegendAIConversationTurn,
  type LegendAIProductMetadata,
  type LegendAIFallbackAction,
  LegendAIQuestionIntent,
  LegendAIThinkingStepStatus,
  LegendAIMessageRole,
  LegendAIErrorType,
  LegendAIServiceError,
  TDSServiceSourceType,
  buildColumnDefsFromNames,
  LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
} from '../LegendAITypes.js';
import {
  type LegendAI_LegendApplicationPlugin_Extension,
  type LegendAIOrchestratorDataProductCoordinates,
  type LegendAISqlExecutionResultData,
  type LegendAIResolvedEntities,
  LegendAIJudgeVerdict,
} from '../LegendAI_LegendApplicationPlugin_Extension.js';
import type { QueryExplicitExecutionContextInfo } from '@finos/legend-graph';

const MAX_ERROR_MESSAGE_LENGTH = 500;
const MAX_THINKING_ERROR_PREVIEW_LENGTH = 200;
const DEFAULT_MAX_JUDGE_ATTEMPTS = 5;
const DEFAULT_MAX_EXECUTION_RETRIES = 3;
const ANALYSIS_TIMEOUT_MS = 15_000;

const SUGGESTED_QUERIES_DELIMITER = '---SUGGESTED_QUERIES---';

export function elapsedSeconds(startTime: number, decimals: 1 | 2 = 1): string {
  return ((Date.now() - startTime) / 1000).toFixed(decimals);
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise.finally(() => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }),
    new Promise<undefined>((resolve) => {
      timer = setTimeout(() => resolve(undefined), ms);
    }),
  ]);
}

function deduplicateColumns(columns: string[]): string[] {
  const seen = new Map<string, number>();
  return columns.map((col) => {
    const count = seen.get(col) ?? 0;
    seen.set(col, count + 1);
    return count === 0 ? col : `${col}_${count + 1}`;
  });
}

export type MessageSetter = React.Dispatch<
  React.SetStateAction<LegendAIMessage[]>
>;

export function createMessagePair(
  text: string,
): [LegendAIUserMessage, LegendAIAssistantMessage] {
  return [
    { id: uuid(), role: LegendAIMessageRole.USER, text },
    {
      id: uuid(),
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
      isProcessing: true,
      isExecuting: false,
      suggestedQueries: [],
      fallbackAction: null,
    },
  ];
}

export interface LegendAIOperationContext {
  config: LegendAIConfig;
  plugin: LegendAI_LegendApplicationPlugin_Extension;
  history: LegendAIConversationTurn[];
  setMessages: MessageSetter;
}

interface LegendAIOrchestratorOptionsParam {
  dataProductCoordinates: LegendAIOrchestratorDataProductCoordinates;
  pureExecutionContext?: QueryExplicitExecutionContextInfo;
}

export function updateLastAssistant(
  setMessages: MessageSetter,
  updater: (msg: LegendAIAssistantMessage) => Partial<LegendAIAssistantMessage>,
): void {
  setMessages((prev) => {
    const newMsgs = [...prev];
    const lastIdx = newMsgs.length - 1;
    const last = newMsgs[lastIdx];
    if (last?.role === LegendAIMessageRole.ASSISTANT) {
      newMsgs[lastIdx] = { ...last, ...updater(last) };
    }
    return newMsgs;
  });
}

export function addThinkingStep(
  setMessages: MessageSetter,
  label: string,
): void {
  updateLastAssistant(setMessages, (msg) => ({
    thinkingSteps: [
      ...msg.thinkingSteps.map((s) =>
        s.status === LegendAIThinkingStepStatus.ACTIVE
          ? { ...s, status: LegendAIThinkingStepStatus.DONE }
          : s,
      ),
      { id: uuid(), label, status: LegendAIThinkingStepStatus.ACTIVE },
    ],
  }));
}

export function completeThinkingSteps(setMessages: MessageSetter): void {
  updateLastAssistant(setMessages, (msg) => ({
    thinkingSteps: msg.thinkingSteps.map((s) =>
      s.status === LegendAIThinkingStepStatus.ACTIVE
        ? { ...s, status: LegendAIThinkingStepStatus.DONE }
        : s,
    ),
  }));
}

export function classifyError(error: Error): LegendAIErrorType {
  if (error instanceof LegendAIServiceError) {
    return error.errorType;
  }
  return LegendAIErrorType.GENERAL;
}

export function finishWithThinkingError(
  setMessages: MessageSetter,
  errorMsg: string,
  startTime: number,
  errorType?: LegendAIErrorType,
): void {
  updateLastAssistant(setMessages, (msg) => ({
    thinkingSteps: msg.thinkingSteps.map((s) =>
      s.status === LegendAIThinkingStepStatus.ACTIVE
        ? { ...s, status: LegendAIThinkingStepStatus.ERROR }
        : s,
    ),
    error: errorMsg.slice(0, MAX_ERROR_MESSAGE_LENGTH),
    errorType: errorType ?? null,
    isProcessing: false,
    thinkingDuration: elapsedSeconds(startTime),
  }));
}

export function buildConversationHistory(
  messages: LegendAIMessage[],
): LegendAIConversationTurn[] {
  const history: LegendAIConversationTurn[] = [];
  let i = 0;
  while (i < messages.length - 1) {
    const userMsg = messages[i];
    const asstMsg = messages[i + 1];
    if (
      userMsg?.role === LegendAIMessageRole.USER &&
      asstMsg?.role === LegendAIMessageRole.ASSISTANT
    ) {
      if (asstMsg.sql) {
        history.push({
          question: userMsg.text,
          sql: asstMsg.sql,
          intent: LegendAIQuestionIntent.DATA_QUERY,
        });
      } else if (asstMsg.textAnswer) {
        history.push({
          question: userMsg.text,
          sql: asstMsg.textAnswer,
          intent: LegendAIQuestionIntent.METADATA,
        });
      }
      i += 2;
    } else {
      i += 1;
    }
  }
  return history;
}

function formatServiceParams(services: TDSServiceSchema[]): string[] {
  return services.flatMap((s) =>
    s.parameters.length > 0 ? [`${s.title}: ${s.parameters.join(', ')}`] : [],
  );
}

export function buildGenerationFailureMessage(
  failure: string,
  suggestion: string | undefined,
  services: TDSServiceSchema[],
): string {
  const parts = [failure];
  if (suggestion) {
    parts.push(`\nTry instead: "${suggestion}"`);
  }
  const svcNames = services.map((s) => s.title);
  if (svcNames.length > 0) {
    parts.push(`\nAvailable services: ${svcNames.join(', ')}`);
  }
  const allParams = formatServiceParams(services);
  if (allParams.length > 0) {
    parts.push(`\nService parameters: ${allParams.join('; ')}`);
  }
  return parts.join('');
}

export function buildExecutionErrorMessage(
  errStr: string,
  services: TDSServiceSchema[],
): string {
  const errParts: string[] = [];
  const errLower = errStr.toLowerCase();

  const missingParamMatch =
    /missing required parameter values?\s*\[(?<params>[^\]]+)\]/i.exec(errStr);
  if (missingParamMatch) {
    const paramNames = missingParamMatch.groups?.params ?? '';
    const paramList = paramNames.split(',').map((p) => p.trim());
    const hint = paramList
      .map(
        (p) =>
          `a specific ${p.replaceAll(/(?<lower>[a-z])(?<upper>[A-Z])/g, '$<lower> $<upper>').toLowerCase()}`,
      )
      .join(' and ');
    errParts.push(
      `This service requires a value for: ${paramNames}`,
      `\nTry rephrasing your question to include ${hint}.`,
    );
    const svcParams = formatServiceParams(services);
    if (svcParams.length > 0) {
      errParts.push(`\nService parameters:\n${svcParams.join('\n')}`);
    }
    return errParts.join('');
  }

  errParts.push(errStr.slice(0, MAX_ERROR_MESSAGE_LENGTH));
  if (
    errLower.includes('column') &&
    (errLower.includes('not found') ||
      errLower.includes('does not exist') ||
      errLower.includes('unknown'))
  ) {
    const svcCols = services.map(
      (s) => `${s.title}: ${s.columns.map((c) => c.name).join(', ')}`,
    );
    errParts.push(`\nAvailable columns:\n${svcCols.join('\n')}`);
  }
  if (errLower.includes('parameter') || errLower.includes('argument')) {
    const svcParams = formatServiceParams(services);
    if (svcParams.length > 0) {
      errParts.push(`\nRequired parameters:\n${svcParams.join('\n')}`);
    }
  }
  return errParts.join('');
}

function parseSuggestedQueries(rawAnswer: string): {
  answer: string;
  suggestedQueries: string[];
} {
  const delimIndex = rawAnswer.indexOf(SUGGESTED_QUERIES_DELIMITER);
  if (delimIndex === -1) {
    return { answer: rawAnswer.trim(), suggestedQueries: [] };
  }
  const answer = rawAnswer.slice(0, delimIndex).trim();
  const suggestionsBlock = rawAnswer.slice(
    delimIndex + SUGGESTED_QUERIES_DELIMITER.length,
  );
  const suggestedQueries = suggestionsBlock
    .split('\n')
    .map((line) => line.replace(/^\d+[.)]\s*/, '').trim())
    .filter((line) => line.length > 0)
    .slice(0, 3);
  return { answer, suggestedQueries };
}

export async function handleMetadataQuestion(
  question: string,
  metadata: LegendAIProductMetadata,
  context: LegendAIOperationContext,
  startTime: number,
  hasQueryableServices?: boolean,
): Promise<void> {
  const { config, plugin, history, setMessages } = context;
  addThinkingStep(setMessages, 'Answering from product metadata...');
  const metadataPromptText = plugin.buildMetadataPrompt(
    question,
    metadata,
    history,
  );
  const rawAnswer = await plugin.callLLM(metadataPromptText, config);
  const { answer, suggestedQueries: parsedSuggestions } =
    parseSuggestedQueries(rawAnswer);
  const suggestedQueries =
    hasQueryableServices === false && !config.orchestratorUrl
      ? []
      : parsedSuggestions;
  completeThinkingSteps(setMessages);
  updateLastAssistant(setMessages, () => ({
    textAnswer: answer,
    suggestedQueries,
    isProcessing: false,
    thinkingDuration: elapsedSeconds(startTime),
  }));
}

export async function generateAndJudgeSql(
  question: string,
  services: TDSServiceSchema[],
  coordinates: string,
  context: LegendAIOperationContext,
  startTime: number,
): Promise<string | null> {
  const { config, plugin, history, setMessages } = context;
  addThinkingStep(setMessages, 'Building context from service schemas...');
  const prompt = plugin.buildGeneratorPrompt(
    question,
    services,
    coordinates,
    history,
  );
  addThinkingStep(setMessages, 'Generating SQL query...');

  const answerText = await plugin.callLLM(prompt, config);
  const {
    sql: generatedSql,
    failure,
    suggestion,
  } = plugin.extractSqlFromResponse(answerText);

  if (failure) {
    addThinkingStep(setMessages, `Generation failed: ${failure}`);
    finishWithThinkingError(
      setMessages,
      buildGenerationFailureMessage(failure, suggestion, services),
      startTime,
      LegendAIErrorType.GENERATION,
    );
    return null;
  }

  if (!generatedSql) {
    addThinkingStep(setMessages, 'Could not extract SQL from response');
    finishWithThinkingError(
      setMessages,
      'Could not extract SQL from LLM response.\nTry rephrasing your question or ask about a specific service.',
      startTime,
      LegendAIErrorType.GENERATION,
    );
    return null;
  }

  const maxAttempts = config.maxJudgeAttempts ?? DEFAULT_MAX_JUDGE_ATTEMPTS;
  let currentSql = generatedSql;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    addThinkingStep(
      setMessages,
      `Verifying query correctness (${attempt}/${maxAttempts})...`,
    );

    const judgePrompt = plugin.buildJudgePrompt(
      currentSql,
      question,
      services,
      coordinates,
      history,
    );
    const judgeAnswer = await plugin.callLLM(judgePrompt, config);
    const judgeResult = plugin.extractJudgeResult(judgeAnswer);

    if (judgeResult.verdict === LegendAIJudgeVerdict.PASS) {
      completeThinkingSteps(setMessages);
      return currentSql;
    }

    const previousSql = currentSql;
    const correctedSql = judgeResult.correctedSql?.trim();
    if (
      correctedSql !== undefined &&
      (correctedSql.toLowerCase().startsWith('select') ||
        correctedSql.toLowerCase().startsWith('with') ||
        correctedSql.toLowerCase().startsWith('('))
    ) {
      addThinkingStep(setMessages, `Query corrected (attempt ${attempt})`);
      currentSql = correctedSql;
    }

    if (currentSql === previousSql || attempt === maxAttempts) {
      addThinkingStep(
        setMessages,
        'Max verification attempts reached, using best query',
      );
      return currentSql;
    }
  }

  return null;
}

function reportExecutionResult(
  rawResult: LegendAISqlExecutionResultData,
  setMessages: MessageSetter,
  execStartTime: number,
  startTime: number,
): LegendAISqlExecutionResultData {
  const columns = deduplicateColumns(rawResult.columns);
  const rows = rawResult.rows;
  completeThinkingSteps(setMessages);
  addThinkingStep(
    setMessages,
    `Retrieved ${rows.length} row${rows.length === 1 ? '' : 's'}`,
  );
  completeThinkingSteps(setMessages);

  updateLastAssistant(setMessages, () => ({
    gridData: { columnDefs: buildColumnDefsFromNames(columns), rowData: rows },
    execTime: elapsedSeconds(execStartTime, 2),
    isProcessing: false,
    isExecuting: false,
    thinkingDuration: elapsedSeconds(startTime),
  }));
  return { columns, rows };
}

export async function executeSqlAndReport(
  sql: string,
  services: TDSServiceSchema[],
  config: LegendAIConfig,
  plugin: LegendAI_LegendApplicationPlugin_Extension,
  setMessages: MessageSetter,
  startTime: number,
  dataProductCoordinates?: LegendAIOrchestratorDataProductCoordinates,
): Promise<LegendAISqlExecutionResultData | undefined> {
  const execStartTime = Date.now();
  try {
    const isAccessPoint = services.some(
      (s) => s.sourceType === TDSServiceSourceType.ACCESS_POINT,
    );
    const rawResult =
      isAccessPoint && dataProductCoordinates
        ? await plugin.executeLakehouseSql(sql, dataProductCoordinates, config)
        : await plugin.executeSql(sql, config);
    return reportExecutionResult(
      rawResult,
      setMessages,
      execStartTime,
      startTime,
    );
  } catch (executeError) {
    assertErrorThrown(executeError);
    const execErrorType = classifyError(executeError);
    addThinkingStep(
      setMessages,
      `Execution failed: ${executeError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );
    finishWithThinkingError(
      setMessages,
      buildExecutionErrorMessage(executeError.message, services),
      startTime,
      execErrorType === LegendAIErrorType.GENERAL
        ? LegendAIErrorType.EXECUTION
        : execErrorType,
    );
    updateLastAssistant(setMessages, () => ({
      execTime: elapsedSeconds(execStartTime, 2),
      isExecuting: false,
    }));
    return undefined;
  }
}

export async function executePureQueryAndReport(
  pureQuery: string,
  pureExecutionContext: QueryExplicitExecutionContextInfo,
  dataProductCoordinates: LegendAIOrchestratorDataProductCoordinates,
  config: LegendAIConfig,
  plugin: LegendAI_LegendApplicationPlugin_Extension,
  setMessages: MessageSetter,
  startTime: number,
): Promise<LegendAISqlExecutionResultData> {
  const execStartTime = Date.now();
  try {
    addThinkingStep(setMessages, 'Executing Pure query...');
    const rawResult = await plugin.executePureQuery(
      pureQuery,
      pureExecutionContext,
      dataProductCoordinates,
      config,
    );
    return reportExecutionResult(
      rawResult,
      setMessages,
      execStartTime,
      startTime,
    );
  } catch (executeError) {
    assertErrorThrown(executeError);
    const execErrorType = classifyError(executeError);
    addThinkingStep(
      setMessages,
      `Execution failed: ${executeError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );
    completeThinkingSteps(setMessages);
    updateLastAssistant(setMessages, () => ({
      execTime: elapsedSeconds(execStartTime, 2),
      isExecuting: false,
      isProcessing: false,
      error: `Execution failed: ${executeError.message.slice(0, MAX_ERROR_MESSAGE_LENGTH)}`,
      errorType:
        execErrorType === LegendAIErrorType.GENERAL
          ? LegendAIErrorType.EXECUTION
          : execErrorType,
      thinkingDuration: elapsedSeconds(startTime),
    }));
    return { columns: [], rows: [] };
  }
}

export async function analyzeOrchestratorResults(
  question: string,
  query: string,
  execResult: LegendAISqlExecutionResultData,
  metadata: LegendAIProductMetadata,
  context: LegendAIOperationContext,
  startTime: number,
): Promise<void> {
  const { config, plugin, setMessages } = context;
  addThinkingStep(setMessages, 'Analyzing results...');
  updateLastAssistant(setMessages, () => ({
    isProcessing: true,
  }));
  const analysis = await withTimeout(
    plugin.analyzeQueryResults(
      question,
      query,
      execResult.columns,
      execResult.rows,
      metadata,
      config,
    ),
    ANALYSIS_TIMEOUT_MS,
  );
  if (analysis) {
    completeThinkingSteps(setMessages);
    updateLastAssistant(setMessages, () => ({
      textAnswer: analysis.summary,
      suggestedQueries: analysis.suggestedQueries,
      isProcessing: false,
      thinkingDuration: elapsedSeconds(startTime),
    }));
  }
}

async function handleEmptyOrchestratorResults(
  question: string,
  legendQuery: string,
  orchestratorOptions: Required<LegendAIOrchestratorOptionsParam>,
  metadata: LegendAIProductMetadata,
  resolvedEntities: LegendAIResolvedEntities,
  context: LegendAIOperationContext,
  startTime: number,
): Promise<void> {
  const { dataProductCoordinates, pureExecutionContext } = orchestratorOptions;
  const { config, plugin, setMessages } = context;

  if (resolvedEntities.relatedEntities.length > 0) {
    const alternateRoot = resolvedEntities.relatedEntities[0];
    if (alternateRoot) {
      addThinkingStep(
        setMessages,
        `No results with ${resolvedEntities.rootEntity.split('::').pop() ?? resolvedEntities.rootEntity}, retrying with ${alternateRoot.split('::').pop() ?? alternateRoot}...`,
      );

      try {
        const retryResponse = await plugin.generateQueryViaOrchestrator(
          {
            user_question: question,
            semantic_search_resolution_details: {
              data_product_coordinates: dataProductCoordinates,
              root_entity: alternateRoot,
              related_entities: resolvedEntities.relatedEntities.slice(1),
            },
          },
          config,
        );

        updateLastAssistant(setMessages, () => ({
          sql: retryResponse.legend_query,
          sqlGenTime: elapsedSeconds(startTime, 2),
          isExecuting: true,
        }));

        const retryResult = await executePureQueryAndReport(
          retryResponse.legend_query,
          pureExecutionContext,
          dataProductCoordinates,
          config,
          plugin,
          setMessages,
          startTime,
        );

        if (retryResult.rows.length > 0) {
          await analyzeOrchestratorResults(
            question,
            retryResponse.legend_query,
            retryResult,
            metadata,
            context,
            startTime,
          );
          return;
        }
      } catch {
        /* empty */
      }
    }
  }

  addThinkingStep(
    setMessages,
    'No results returned \u2014 building contextual guidance...',
  );
  updateLastAssistant(setMessages, () => ({
    isProcessing: true,
  }));
  const fallback = await withTimeout(
    plugin.buildNoResultsFallback(question, legendQuery, metadata, config),
    ANALYSIS_TIMEOUT_MS,
  );
  if (fallback) {
    completeThinkingSteps(setMessages);
    updateLastAssistant(setMessages, () => ({
      textAnswer: fallback.summary,
      suggestedQueries: fallback.suggestedQueries,
      isProcessing: false,
      thinkingDuration: elapsedSeconds(startTime),
    }));
  }
}

export async function processQuestionViaOrchestrator(
  question: string,
  dataProductCoordinates: LegendAIOrchestratorDataProductCoordinates,
  metadata: LegendAIProductMetadata,
  context: LegendAIOperationContext,
  pureExecutionContext?: QueryExplicitExecutionContextInfo,
  preResolvedEntities?: LegendAIResolvedEntities,
): Promise<void> {
  const { config, plugin, setMessages } = context;
  const startTime = Date.now();

  try {
    let resolvedEntities: LegendAIResolvedEntities;
    if (preResolvedEntities) {
      resolvedEntities = preResolvedEntities;
      addThinkingStep(
        setMessages,
        `Using pre-resolved root entity: ${resolvedEntities.rootEntity.split('::').pop() ?? resolvedEntities.rootEntity}`,
      );
    } else {
      addThinkingStep(setMessages, 'Resolving entities for your query...');
      resolvedEntities = await plugin.resolveEntitiesForQuery(
        question,
        dataProductCoordinates,
        config,
        pureExecutionContext,
      );
      addThinkingStep(
        setMessages,
        `Found root entity: ${resolvedEntities.rootEntity.split('::').pop() ?? resolvedEntities.rootEntity}`,
      );
    }

    if (resolvedEntities.relatedEntities.length > 0) {
      addThinkingStep(
        setMessages,
        `Found ${resolvedEntities.relatedEntities.length} related entities`,
      );
    }

    addThinkingStep(setMessages, 'Generating Legend query via orchestrator...');
    const orchestratorResponse = await plugin.generateQueryViaOrchestrator(
      {
        user_question: question,
        semantic_search_resolution_details: {
          data_product_coordinates: dataProductCoordinates,
          root_entity: resolvedEntities.rootEntity,
          related_entities: resolvedEntities.relatedEntities,
        },
      },
      config,
    );

    const queryGenTime = elapsedSeconds(startTime, 2);
    completeThinkingSteps(setMessages);
    updateLastAssistant(setMessages, () => ({
      sql: orchestratorResponse.legend_query,
      sqlGenTime: queryGenTime,
      isExecuting: true,
      isProcessing: true,
    }));

    if (!pureExecutionContext) {
      updateLastAssistant(setMessages, () => ({
        isProcessing: false,
        isExecuting: false,
        error:
          'No execution context available — cannot execute query via engine.',
        errorType: LegendAIErrorType.EXECUTION,
        thinkingDuration: elapsedSeconds(startTime),
      }));
      return;
    }

    const execResult = await executePureQueryAndReport(
      orchestratorResponse.legend_query,
      pureExecutionContext,
      dataProductCoordinates,
      config,
      plugin,
      setMessages,
      startTime,
    );

    try {
      if (execResult.rows.length > 0) {
        await analyzeOrchestratorResults(
          question,
          orchestratorResponse.legend_query,
          execResult,
          metadata,
          context,
          startTime,
        );
      } else {
        await handleEmptyOrchestratorResults(
          question,
          orchestratorResponse.legend_query,
          { dataProductCoordinates, pureExecutionContext },
          metadata,
          resolvedEntities,
          context,
          startTime,
        );
      }
    } catch {
      /* empty */
    } finally {
      completeThinkingSteps(setMessages);
      updateLastAssistant(setMessages, () => ({
        isProcessing: false,
        thinkingDuration: elapsedSeconds(startTime),
      }));
    }
  } catch (error) {
    assertErrorThrown(error);
    const orchErrorType = classifyError(error);
    addThinkingStep(
      setMessages,
      `Error: ${error.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );

    try {
      addThinkingStep(
        setMessages,
        'Building guidance from available metadata...',
      );
      const fallbackText = await withTimeout(
        plugin.buildFailureFallback(question, error.message, metadata, config),
        ANALYSIS_TIMEOUT_MS,
      );
      if (fallbackText) {
        completeThinkingSteps(setMessages);
        updateLastAssistant(setMessages, () => ({
          dataContext: fallbackText,
          isProcessing: false,
          thinkingDuration: elapsedSeconds(startTime),
        }));
        return;
      }
    } catch {
      /* empty */
    }

    finishWithThinkingError(
      setMessages,
      error.message,
      startTime,
      orchErrorType,
    );
  }
}

function cleanLlmSqlResponse(raw: string): string {
  return raw
    .trim()
    .replace(/^```\w*\n?/, '')
    .replace(/\n?```$/, '')
    .replace(/;\s*$/, '')
    .trim();
}

function isValidSqlCorrection(trimmed: string, currentSql: string): boolean {
  return (
    trimmed.length > 0 &&
    trimmed.toLowerCase().startsWith('select') &&
    trimmed !== currentSql
  );
}

const ALIAS_DOT_COL_PATTERN = /\b(?<tbl>[a-z]\w*)\s*\.\s*"(?<col>[^"]+)"/gi;

const JOIN_PATTERN = /\bJOIN\b/i;

const ORDER_BY_SPLIT = /\bORDER\s+BY\b/i;

export function sanitizeJoinOrderBy(sql: string): string {
  if (!JOIN_PATTERN.test(sql)) {
    return sql;
  }
  const parts = sql.split(ORDER_BY_SPLIT);
  if (parts.length < 2) {
    return sql;
  }

  const beforeOrderBy = parts[0] ?? '';
  const afterOrderBy = parts.slice(1).join('ORDER BY').replace(/^\s+/, '');

  const selectAliases = new Map<string, string>();
  const aliasRegex =
    /\b(?<tbl>[a-z]\w*)\s*\.\s*"(?<col>[^"]+)"\s+AS\s+(?:"(?<qAlias>[^"]+)"|(?<uAlias>\w+))/gi;
  let m: RegExpExecArray | null;
  while ((m = aliasRegex.exec(beforeOrderBy)) !== null) {
    const tableAlias = (m.groups?.tbl ?? '').toLowerCase();
    const colName = (m.groups?.col ?? '').toLowerCase();
    const asAlias = m.groups?.qAlias ?? m.groups?.uAlias ?? '';
    selectAliases.set(`${tableAlias}.${colName}`, asAlias);
  }

  if (selectAliases.size === 0) {
    return sql;
  }

  const rewritten = afterOrderBy.replaceAll(
    ALIAS_DOT_COL_PATTERN,
    (...args) => {
      const groups = args[args.length - 1] as {
        tbl: string;
        col: string;
      };
      const key = `${groups.tbl.toLowerCase()}.${groups.col.toLowerCase()}`;
      const alias = selectAliases.get(key);
      return alias ? `"${alias}"` : String(args[0]);
    },
  );

  if (rewritten === afterOrderBy) {
    return sql;
  }
  return `${beforeOrderBy}ORDER BY ${rewritten}`;
}

const UNION_ALL_PATTERN = /\bUNION\s+ALL\b/i;

const LITERAL_COL_PATTERN = /,\s*'[^']*'\s+AS\s+(?:"[^"]+"|[a-z]\w*)/gi;

export function sanitizeLiteralColumns(sql: string): string {
  if (!UNION_ALL_PATTERN.test(sql)) {
    return sql;
  }
  LITERAL_COL_PATTERN.lastIndex = 0;
  if (!LITERAL_COL_PATTERN.test(sql)) {
    return sql;
  }
  LITERAL_COL_PATTERN.lastIndex = 0;
  return sql.replace(LITERAL_COL_PATTERN, '');
}

const SERVICE_PARAM_DATE_LIKE =
  /date|time|day|month|year|period|asOf|businessDate|processingDate|snapshot/i;

function hasUnresolvableParams(service: TDSServiceSchema): boolean {
  return service.parameters.some((p) => !SERVICE_PARAM_DATE_LIKE.test(p));
}

function getNonDateParamNames(service: TDSServiceSchema): string[] {
  return service.parameters.filter((p) => !SERVICE_PARAM_DATE_LIKE.test(p));
}

export function stripNonDateServiceParams(sql: string): string {
  return sql.replaceAll(/,\s*\w+\s*=>\s*'[^']*'/g, (match) => {
    const paramName = /,\s*(?<param>\w+)\s*=>/.exec(match)?.groups?.param;
    if (!paramName) {
      return match;
    }
    if (
      paramName === 'coordinates' ||
      SERVICE_PARAM_DATE_LIKE.test(paramName)
    ) {
      return match;
    }
    return '';
  });
}

async function executeSqlForServices(
  sql: string,
  services: TDSServiceSchema[],
  dataProductCoordinates:
    | LegendAIOrchestratorDataProductCoordinates
    | undefined,
  plugin: LegendAI_LegendApplicationPlugin_Extension,
  config: LegendAIConfig,
): Promise<LegendAISqlExecutionResultData> {
  const safeSql = sanitizeLiteralColumns(sanitizeJoinOrderBy(sql));
  const isAccessPoint = services.some(
    (s) => s.sourceType === TDSServiceSourceType.ACCESS_POINT,
  );
  if (isAccessPoint && dataProductCoordinates) {
    return plugin.executeLakehouseSql(safeSql, dataProductCoordinates, config);
  }
  return plugin.executeSql(safeSql, config);
}

interface SqlExecutionOutcome {
  sql: string;
  result?: LegendAISqlExecutionResultData;
  error?: string;
}

async function executeSqlWithRetries(
  initialSql: string,
  question: string,
  services: TDSServiceSchema[],
  coordinates: string,
  dataProductCoordinates:
    | LegendAIOrchestratorDataProductCoordinates
    | undefined,
  context: LegendAIOperationContext,
): Promise<SqlExecutionOutcome> {
  const { plugin, config, setMessages } = context;
  let currentSql = initialSql;

  for (let attempt = 0; attempt <= DEFAULT_MAX_EXECUTION_RETRIES; attempt++) {
    try {
      const result = await executeSqlForServices(
        currentSql,
        services,
        dataProductCoordinates,
        plugin,
        config,
      );
      return { sql: currentSql, result };
    } catch (executeError) {
      assertErrorThrown(executeError);
      if (attempt >= DEFAULT_MAX_EXECUTION_RETRIES) {
        return { sql: currentSql, error: executeError.message };
      }
      addThinkingStep(
        setMessages,
        `Execution failed (attempt ${attempt + 1}/${DEFAULT_MAX_EXECUTION_RETRIES + 1}), correcting query...`,
      );
      const corrected = await attemptErrorCorrection(
        currentSql,
        executeError.message,
        question,
        services,
        coordinates,
        plugin,
        config,
      );
      if (corrected) {
        currentSql = corrected;
        updateLastAssistant(setMessages, () => ({ sql: currentSql }));
        continue;
      }
      return { sql: currentSql, error: executeError.message };
    }
  }
  return { sql: currentSql };
}

async function attemptErrorCorrection(
  currentSql: string,
  errorMessage: string,
  question: string,
  services: TDSServiceSchema[],
  coordinates: string,
  plugin: LegendAI_LegendApplicationPlugin_Extension,
  config: LegendAIConfig,
): Promise<string | undefined> {
  const prompt = plugin.buildErrorCorrectionPrompt(
    currentSql,
    errorMessage,
    question,
    services,
    coordinates,
  );
  if (!prompt) {
    return undefined;
  }
  try {
    const correctedSql = await plugin.callLLM(prompt, config);
    const trimmed = cleanLlmSqlResponse(correctedSql);
    if (isValidSqlCorrection(trimmed, currentSql)) {
      return trimmed;
    }
  } catch {
    /* empty */
  }
  return undefined;
}

async function attemptZeroRowCorrection(
  currentSql: string,
  question: string,
  services: TDSServiceSchema[],
  coordinates: string,
  dataProductCoordinates:
    | LegendAIOrchestratorDataProductCoordinates
    | undefined,
  context: LegendAIOperationContext,
): Promise<
  { sql: string; result: LegendAISqlExecutionResultData } | undefined
> {
  const { plugin, config, setMessages } = context;
  addThinkingStep(
    setMessages,
    'Query returned 0 rows, attempting filter correction...',
  );
  const prompt = plugin.buildZeroRowCorrectionPrompt(
    currentSql,
    question,
    services,
    coordinates,
  );
  if (!prompt) {
    return undefined;
  }
  try {
    const correctedSql = await plugin.callLLM(prompt, config);
    const trimmed = cleanLlmSqlResponse(correctedSql);
    if (!isValidSqlCorrection(trimmed, currentSql)) {
      return undefined;
    }
    addThinkingStep(setMessages, 'Retrying with corrected filters...');
    updateLastAssistant(setMessages, () => ({ sql: trimmed }));
    try {
      const retryResult = await executeSqlForServices(
        trimmed,
        services,
        dataProductCoordinates,
        plugin,
        config,
      );
      if (retryResult.rows.length > 0) {
        return { sql: trimmed, result: retryResult };
      }
    } catch {
      /* empty */
    }
  } catch {
    /* empty */
  }
  return undefined;
}

function buildZeroRowMessage(services: TDSServiceSchema[]): string {
  const withUnresolvable = services.filter((s) => hasUnresolvableParams(s));
  if (withUnresolvable.length > 0) {
    const parts: string[] = [];
    for (const svc of withUnresolvable) {
      for (const paramName of getNonDateParamNames(svc)) {
        const matchingCol = svc.columns.find((c) => c.name === paramName);
        const docHint = matchingCol?.documentation ?? matchingCol?.sampleValues;
        if (docHint) {
          parts.push(`**${paramName}** (${docHint})`);
        } else {
          parts.push(`**${paramName}**`);
        }
      }
    }
    const uniqueParts = [...new Set(parts)];
    const firstSvc = withUnresolvable[0];
    const firstParam = firstSvc
      ? (getNonDateParamNames(firstSvc)[0] ?? 'parameter')
      : 'parameter';
    return `The SQL query executed successfully but returned **0 rows**. This service requires specific values for ${uniqueParts.join(', ')} to return data. Please include ${uniqueParts.length === 1 ? 'a value' : 'values'} in your question, e.g., "show data where ${firstParam} is [your value]".`;
  }
  return 'The SQL query executed successfully but returned **0 rows**. The applied filters may not match any records, or the specific values may not exist in the queried datasets.';
}

function offerOrchestratorFallbackMessage(
  setMessages: MessageSetter,
  startTime: number,
  fallbackMessage: string,
): void {
  updateLastAssistant(setMessages, () => ({
    textAnswer: fallbackMessage,
    fallbackAction: {
      label: 'Try Legend AI Orchestrator',
      actionId: LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
    },
    isProcessing: false,
    thinkingDuration: elapsedSeconds(startTime),
  }));
}

function reportFatalQueryError(
  setMessages: MessageSetter,
  startTime: number,
  errorMessage: string,
  errorType: LegendAIErrorType,
): void {
  finishWithThinkingError(setMessages, errorMessage, startTime, errorType);
}

function handleSqlGenerationFailure(
  setMessages: MessageSetter,
  startTime: number,
  hasOrchestratorFallback: boolean,
  orchestratorMessage: string,
  errorMessage: string,
  errorType: LegendAIErrorType,
): void {
  completeThinkingSteps(setMessages);
  if (hasOrchestratorFallback) {
    offerOrchestratorFallbackMessage(
      setMessages,
      startTime,
      orchestratorMessage,
    );
  } else {
    reportFatalQueryError(setMessages, startTime, errorMessage, errorType);
  }
}

interface QueryResultReport {
  currentSql: string;
  sqlResult: LegendAISqlExecutionResultData;
  question: string;
  services: TDSServiceSchema[];
}

async function reportQueryResults(
  report: QueryResultReport,
  metadata: LegendAIProductMetadata,
  context: LegendAIOperationContext,
  startTime: number,
  hasOrchestratorFallback: boolean,
): Promise<void> {
  const { currentSql, sqlResult, question, services } = report;
  const { setMessages } = context;
  if (sqlResult.rows.length > 0) {
    const columns = deduplicateColumns(sqlResult.columns);
    const rows = sqlResult.rows;
    completeThinkingSteps(setMessages);
    addThinkingStep(
      setMessages,
      `Retrieved ${rows.length} row${rows.length === 1 ? '' : 's'}`,
    );
    completeThinkingSteps(setMessages);
    updateLastAssistant(setMessages, () => ({
      sql: currentSql,
      gridData: {
        columnDefs: buildColumnDefsFromNames(columns),
        rowData: rows,
      },
      execTime: elapsedSeconds(startTime, 2),
      isProcessing: true,
      isExecuting: false,
      thinkingDuration: elapsedSeconds(startTime),
    }));

    try {
      await analyzeOrchestratorResults(
        question,
        currentSql,
        sqlResult,
        metadata,
        context,
        startTime,
      );
    } catch {
      /* empty */
    } finally {
      completeThinkingSteps(setMessages);
      updateLastAssistant(setMessages, () => ({
        isProcessing: false,
        thinkingDuration: elapsedSeconds(startTime),
      }));
    }
  } else {
    addThinkingStep(
      setMessages,
      'Query returned 0 rows after correction attempts.',
    );
    completeThinkingSteps(setMessages);
    const fallback = hasOrchestratorFallback
      ? {
          fallbackAction: {
            label: 'Try Legend AI Orchestrator',
            actionId: LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
          } as LegendAIFallbackAction,
        }
      : {};
    updateLastAssistant(setMessages, () => ({
      textAnswer: buildZeroRowMessage(services),
      ...fallback,
      isProcessing: false,
      isExecuting: false,
      thinkingDuration: elapsedSeconds(startTime),
    }));
  }
}

async function selectBestServices(
  question: string,
  services: TDSServiceSchema[],
  context: LegendAIOperationContext,
): Promise<TDSServiceSchema[]> {
  const { plugin, config, setMessages } = context;
  if (services.length <= 1) {
    return services;
  }
  try {
    addThinkingStep(setMessages, 'Selecting best service for your query...');
    return await plugin.selectRelevantServices(question, services, config);
  } catch {
    return services;
  }
}

async function tryRecoverZeroRows(
  currentSql: string,
  sqlResult: LegendAISqlExecutionResultData,
  question: string,
  selectedServices: TDSServiceSchema[],
  coordinates: string,
  dataProductCoordinates:
    | LegendAIOrchestratorDataProductCoordinates
    | undefined,
  context: LegendAIOperationContext,
): Promise<{ sql: string; result: LegendAISqlExecutionResultData }> {
  const { plugin, config, setMessages } = context;
  let recoveredSql = currentSql;
  let recoveredResult = sqlResult;

  const strippedSql = stripNonDateServiceParams(recoveredSql);
  if (strippedSql !== recoveredSql) {
    addThinkingStep(
      setMessages,
      'Trying query without guessed parameter values...',
    );
    try {
      const strippedResult = await executeSqlForServices(
        strippedSql,
        selectedServices,
        dataProductCoordinates,
        plugin,
        config,
      );
      if (strippedResult.rows.length > 0) {
        recoveredSql = strippedSql;
        recoveredResult = strippedResult;
        updateLastAssistant(setMessages, () => ({ sql: strippedSql }));
      }
    } catch {
      /* empty */
    }
  }

  if (recoveredResult.rows.length === 0) {
    const correction = await attemptZeroRowCorrection(
      recoveredSql,
      question,
      selectedServices,
      coordinates,
      dataProductCoordinates,
      context,
    );
    if (correction) {
      recoveredSql = correction.sql;
      recoveredResult = correction.result;
    }
  }

  return { sql: recoveredSql, result: recoveredResult };
}

async function processDataQuery(
  question: string,
  services: TDSServiceSchema[],
  coordinates: string,
  metadata: LegendAIProductMetadata,
  context: LegendAIOperationContext,
  startTime: number,
  orchestratorOptions?: LegendAIOrchestratorOptionsParam,
): Promise<void> {
  const { config, setMessages } = context;
  const dataProductCoordinates = orchestratorOptions?.dataProductCoordinates;
  const hasOrchestratorFallback = Boolean(
    config.orchestratorUrl && dataProductCoordinates,
  );

  if (services.length === 0) {
    handleSqlGenerationFailure(
      setMessages,
      startTime,
      hasOrchestratorFallback,
      'No TDS services available for SQL querying. You can try the Legend AI Orchestrator to generate a Pure query instead.',
      'No TDS services available for querying',
      LegendAIErrorType.GENERAL,
    );
    return;
  }

  addThinkingStep(setMessages, 'Found relevant services to query');

  const selectedServices = await selectBestServices(
    question,
    services,
    context,
  );

  const judgedSql = await generateAndJudgeSql(
    question,
    selectedServices,
    coordinates,
    context,
    startTime,
  );

  if (!judgedSql) {
    addThinkingStep(
      setMessages,
      'SQL generation could not produce a valid query.',
    );
    handleSqlGenerationFailure(
      setMessages,
      startTime,
      hasOrchestratorFallback,
      'SQL generation could not handle this query. You can try the Legend AI Orchestrator to generate a Pure query instead.',
      'SQL generation could not handle this query. Try rephrasing your question.',
      LegendAIErrorType.GENERATION,
    );
    return;
  }

  const sqlGenTimeValue = elapsedSeconds(startTime, 2);
  completeThinkingSteps(setMessages);
  updateLastAssistant(setMessages, () => ({
    sql: judgedSql,
    sqlGenTime: sqlGenTimeValue,
    isExecuting: true,
  }));

  const execOutcome = await executeSqlWithRetries(
    judgedSql,
    question,
    selectedServices,
    coordinates,
    dataProductCoordinates,
    context,
  );

  if (execOutcome.error) {
    const execErrorType = classifyError(new Error(execOutcome.error));
    addThinkingStep(
      setMessages,
      `Execution failed: ${execOutcome.error.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );
    finishWithThinkingError(
      setMessages,
      buildExecutionErrorMessage(execOutcome.error, selectedServices),
      startTime,
      execErrorType === LegendAIErrorType.GENERAL
        ? LegendAIErrorType.EXECUTION
        : execErrorType,
    );
    updateLastAssistant(setMessages, () => ({
      isExecuting: false,
      ...(hasOrchestratorFallback
        ? {
            fallbackAction: {
              label: 'Try Legend AI Orchestrator',
              actionId: LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
            } as LegendAIFallbackAction,
          }
        : {}),
    }));
    return;
  }

  if (!execOutcome.result) {
    return;
  }

  let currentSql = execOutcome.sql;
  let sqlResult = execOutcome.result;

  if (sqlResult.rows.length === 0) {
    const recovered = await tryRecoverZeroRows(
      currentSql,
      sqlResult,
      question,
      selectedServices,
      coordinates,
      dataProductCoordinates,
      context,
    );
    currentSql = recovered.sql;
    sqlResult = recovered.result;
  }

  await reportQueryResults(
    {
      currentSql,
      sqlResult,
      question,
      services: selectedServices,
    },
    metadata,
    context,
    startTime,
    hasOrchestratorFallback,
  );
}

export async function processQuestion(
  question: string,
  services: TDSServiceSchema[],
  coordinates: string,
  metadata: LegendAIProductMetadata,
  context: LegendAIOperationContext,
  dataProductCoordinates?: LegendAIOrchestratorDataProductCoordinates,
  pureExecutionContext?: QueryExplicitExecutionContextInfo,
): Promise<void> {
  const { config, plugin, setMessages } = context;
  const startTime = Date.now();

  try {
    addThinkingStep(setMessages, 'Analyzing your question...');

    const orchestratorOpts = dataProductCoordinates
      ? {
          dataProductCoordinates,
          ...(pureExecutionContext === undefined
            ? {}
            : { pureExecutionContext }),
        }
      : undefined;

    if (services.length > 0) {
      const serviceNames = services.map((s) => s.title);
      const intent = await plugin.classifyQuestionIntent(
        question,
        true,
        config,
        serviceNames,
      );

      if (intent === LegendAIQuestionIntent.METADATA) {
        await handleMetadataQuestion(
          question,
          metadata,
          context,
          startTime,
          true,
        );
        return;
      }

      // DATA_QUERY or ORCHESTRATOR — try SQL generation.
      // If SQL throws, fall back to metadata as a safety net
      // (e.g. misclassified metadata question).
      try {
        await processDataQuery(
          question,
          services,
          coordinates,
          metadata,
          context,
          startTime,
          orchestratorOpts,
        );
      } catch (sqlError) {
        assertErrorThrown(sqlError);
        addThinkingStep(
          setMessages,
          'SQL generation failed, answering from product metadata...',
        );
        await handleMetadataQuestion(
          question,
          metadata,
          context,
          startTime,
          true,
        );
      }
      return;
    }

    // No services available — use orchestrator if configured, else metadata only.
    if (config.orchestratorUrl && dataProductCoordinates) {
      completeThinkingSteps(setMessages);
      await processQuestionViaOrchestrator(
        question,
        dataProductCoordinates,
        metadata,
        context,
        pureExecutionContext,
      );
    } else {
      await handleMetadataQuestion(
        question,
        metadata,
        context,
        startTime,
        false,
      );
    }
  } catch (error) {
    assertErrorThrown(error);
    addThinkingStep(
      setMessages,
      `Error: ${error.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );
    finishWithThinkingError(
      setMessages,
      error.message,
      startTime,
      classifyError(error),
    );
  }
}

export async function processQuestionWithIntent(
  question: string,
  intent: LegendAIQuestionIntent,
  services: TDSServiceSchema[],
  coordinates: string,
  metadata: LegendAIProductMetadata,
  context: LegendAIOperationContext,
  orchestratorOptions?: LegendAIOrchestratorOptionsParam,
): Promise<void> {
  const { config, setMessages } = context;
  const dataProductCoordinates = orchestratorOptions?.dataProductCoordinates;
  const pureExecutionContext = orchestratorOptions?.pureExecutionContext;

  if (intent === LegendAIQuestionIntent.METADATA) {
    const startTime = Date.now();
    try {
      await handleMetadataQuestion(
        question,
        metadata,
        context,
        startTime,
        services.length > 0,
      );
    } catch (error) {
      assertErrorThrown(error);
      addThinkingStep(
        setMessages,
        `Error: ${error.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
      );
      finishWithThinkingError(
        setMessages,
        error.message,
        startTime,
        classifyError(error),
      );
    }
    return;
  }

  if (intent === LegendAIQuestionIntent.ORCHESTRATOR) {
    if (config.orchestratorUrl && dataProductCoordinates) {
      // When services are available, try SQL first even for ORCHESTRATOR intent
      if (services.length > 0) {
        const startTime = Date.now();
        try {
          addThinkingStep(setMessages, 'Preparing data query...');
          await processDataQuery(
            question,
            services,
            coordinates,
            metadata,
            context,
            startTime,
            orchestratorOptions,
          );
        } catch (error) {
          assertErrorThrown(error);
          addThinkingStep(
            setMessages,
            `Error: ${error.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
          );
          finishWithThinkingError(
            setMessages,
            error.message,
            startTime,
            classifyError(error),
          );
        }
        return;
      }
      await processQuestionViaOrchestrator(
        question,
        dataProductCoordinates,
        metadata,
        context,
        pureExecutionContext,
      );
      return;
    }
  }

  const startTime = Date.now();

  try {
    addThinkingStep(setMessages, 'Preparing data query...');
    await processDataQuery(
      question,
      services,
      coordinates,
      metadata,
      context,
      startTime,
      orchestratorOptions,
    );
  } catch (error) {
    assertErrorThrown(error);
    addThinkingStep(
      setMessages,
      `Error: ${error.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );
    finishWithThinkingError(
      setMessages,
      error.message,
      startTime,
      classifyError(error),
    );
  }
}

export const useLegendAIChatState = (
  services: TDSServiceSchema[],
  coordinates: string,
  config: LegendAIConfig,
  metadata: LegendAIProductMetadata,
  plugin: LegendAI_LegendApplicationPlugin_Extension,
  dataProductCoordinates?: LegendAIOrchestratorDataProductCoordinates,
  pureExecutionContext?: QueryExplicitExecutionContextInfo,
): LegendAIChatState => {
  const [questionText, setQuestionText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<LegendAIMessage[]>([]);
  const [expandedThinking, setExpandedThinking] = useState<Set<number>>(
    new Set(),
  );

  const conversationRef = useRef<HTMLDivElement>(null);
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    const el = conversationRef.current;
    if (el && messages.length > 0) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (sendTimeoutRef.current !== undefined) {
        clearTimeout(sendTimeoutRef.current);
      }
    };
  }, []);

  const toggleThinking = useCallback((index: number) => {
    setExpandedThinking((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setExpandedThinking(new Set());
    setQuestionText('');
    setIsSending(false);
    if (sendTimeoutRef.current !== undefined) {
      clearTimeout(sendTimeoutRef.current);
      sendTimeoutRef.current = undefined;
    }
  }, []);

  const dispatchQuestion = useCallback(
    (
      text: string,
      process: (
        trimmed: string,
        history: LegendAIConversationTurn[],
      ) => Promise<void>,
    ): void => {
      const trimmed = text.trim();
      if (!trimmed || isSending) {
        return;
      }
      const history = buildConversationHistory(messages);
      setIsSending(true);
      setQuestionText('');
      setMessages((prev) => [...prev, ...createMessagePair(trimmed)]);
      if (sendTimeoutRef.current !== undefined) {
        clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = undefined;
      }
      sendTimeoutRef.current = setTimeout(() => {
        process(trimmed, history)
          .catch(noop())
          .finally(() => {
            setIsSending(false);
            sendTimeoutRef.current = undefined;
          });
      }, 0);
    },
    [isSending, messages],
  );

  const askQuestion = useCallback(
    (): void =>
      dispatchQuestion(questionText, (trimmed, history) =>
        processQuestion(
          trimmed,
          services,
          coordinates,
          metadata,
          { config, plugin, history, setMessages },
          dataProductCoordinates,
          pureExecutionContext,
        ),
      ),
    [
      questionText,
      dispatchQuestion,
      services,
      coordinates,
      config,
      metadata,
      plugin,
      dataProductCoordinates,
      pureExecutionContext,
    ],
  );

  const askQuestionWithIntent = useCallback(
    (text: string, intent: LegendAIQuestionIntent): void =>
      dispatchQuestion(text, (trimmed, history) =>
        processQuestionWithIntent(
          trimmed,
          intent,
          services,
          coordinates,
          metadata,
          { config, plugin, history, setMessages },
          dataProductCoordinates
            ? {
                dataProductCoordinates,
                ...(pureExecutionContext === undefined
                  ? {}
                  : { pureExecutionContext }),
              }
            : undefined,
        ),
      ),
    [
      dispatchQuestion,
      services,
      coordinates,
      config,
      metadata,
      plugin,
      dataProductCoordinates,
      pureExecutionContext,
    ],
  );

  const runFallbackAction = useCallback(
    (messageId: string): void => {
      if (isSending || !config.orchestratorUrl || !dataProductCoordinates) {
        return;
      }
      // Find the user question associated with this assistant message
      let question: string | undefined;
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (
          msg?.role === LegendAIMessageRole.ASSISTANT &&
          msg.id === messageId &&
          i > 0
        ) {
          const userMsg = messages[i - 1];
          if (userMsg?.role === LegendAIMessageRole.USER) {
            question = userMsg.text;
          }
        }
      }
      if (!question) {
        return;
      }

      setIsSending(true);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.role === LegendAIMessageRole.ASSISTANT
            ? { ...m, fallbackAction: null, error: null, isProcessing: true }
            : m,
        ),
      );

      const history = buildConversationHistory(messages);
      const q = question;
      processQuestionViaOrchestrator(
        q,
        dataProductCoordinates,
        metadata,
        { config, plugin, history, setMessages },
        pureExecutionContext,
      )
        .catch(noop())
        .finally(() => {
          setIsSending(false);
        });
    },
    [
      isSending,
      messages,
      config,
      metadata,
      plugin,
      dataProductCoordinates,
      pureExecutionContext,
    ],
  );

  return {
    questionText,
    setQuestionText,
    isSending,
    messages,
    askQuestion,
    askQuestionWithIntent,
    runFallbackAction,
    clearChat,
    expandedThinking,
    toggleThinking,
    conversationRef,
  };
};
