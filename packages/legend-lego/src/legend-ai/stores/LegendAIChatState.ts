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
  LegendAIQuestionIntent,
  LegendAIThinkingStepStatus,
  LegendAIMessageRole,
  TDSServiceSourceType,
  buildColumnDefsFromNames,
} from '../LegendAITypes.js';
import {
  type LegendAI_LegendApplicationPlugin_Extension,
  type LegendAIOrchestratorDataProductCoordinates,
  type LegendAISqlExecutionResultData,
  LegendAIJudgeVerdict,
} from '../LegendAI_LegendApplicationPlugin_Extension.js';
import type { QueryExplicitExecutionContextInfo } from '@finos/legend-graph';

const MAX_ERROR_MESSAGE_LENGTH = 500;
const MAX_THINKING_ERROR_PREVIEW_LENGTH = 200;
const DEFAULT_MAX_JUDGE_ATTEMPTS = 5;

const SUGGESTED_QUERIES_DELIMITER = '---SUGGESTED_QUERIES---';

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

function createMessagePair(
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
      gridData: null,
      error: null,
      sqlGenTime: null,
      execTime: null,
      thinkingDuration: null,
      isProcessing: true,
      isExecuting: false,
      suggestedQueries: [],
    },
  ];
}

interface LegendAIOperationContext {
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
      { label, status: LegendAIThinkingStepStatus.ACTIVE },
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

export function finishWithThinkingError(
  setMessages: MessageSetter,
  errorMsg: string,
  startTime: number,
): void {
  updateLastAssistant(setMessages, (msg) => ({
    thinkingSteps: msg.thinkingSteps.map((s) =>
      s.status === LegendAIThinkingStepStatus.ACTIVE
        ? { ...s, status: LegendAIThinkingStepStatus.ERROR }
        : s,
    ),
    error: errorMsg.slice(0, MAX_ERROR_MESSAGE_LENGTH),
    isProcessing: false,
    thinkingDuration: ((Date.now() - startTime) / 1000).toFixed(1),
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
    thinkingDuration: ((Date.now() - startTime) / 1000).toFixed(1),
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
    );
    return null;
  }

  if (!generatedSql) {
    addThinkingStep(setMessages, 'Could not extract SQL from response');
    finishWithThinkingError(
      setMessages,
      'Could not extract SQL from LLM response.\nTry rephrasing your question or ask about a specific service.',
      startTime,
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
    execTime: ((Date.now() - execStartTime) / 1000).toFixed(2),
    isProcessing: false,
    isExecuting: false,
    thinkingDuration: ((Date.now() - startTime) / 1000).toFixed(1),
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
    addThinkingStep(
      setMessages,
      `Execution failed: ${executeError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );
    finishWithThinkingError(
      setMessages,
      buildExecutionErrorMessage(executeError.message, services),
      startTime,
    );
    updateLastAssistant(setMessages, () => ({
      execTime: ((Date.now() - execStartTime) / 1000).toFixed(2),
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
    addThinkingStep(
      setMessages,
      `Execution failed: ${executeError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );
    completeThinkingSteps(setMessages);
    updateLastAssistant(setMessages, () => ({
      execTime: ((Date.now() - execStartTime) / 1000).toFixed(2),
      isExecuting: false,
      isProcessing: false,
      error: `Execution failed: ${executeError.message.slice(0, MAX_ERROR_MESSAGE_LENGTH)}`,
      thinkingDuration: ((Date.now() - startTime) / 1000).toFixed(1),
    }));
    return { columns: [], rows: [] };
  }
}

export async function processQuestionViaOrchestrator(
  question: string,
  dataProductCoordinates: LegendAIOrchestratorDataProductCoordinates,
  _metadata: LegendAIProductMetadata,
  context: LegendAIOperationContext,
  pureExecutionContext?: QueryExplicitExecutionContextInfo,
): Promise<void> {
  const { config, plugin, setMessages } = context;
  const startTime = Date.now();

  try {
    addThinkingStep(setMessages, 'Resolving entities for your query...');
    const resolvedEntities = await plugin.resolveEntitiesForQuery(
      question,
      dataProductCoordinates,
      config,
    );

    addThinkingStep(
      setMessages,
      `Found root entity: ${resolvedEntities.rootEntity.split('::').pop() ?? resolvedEntities.rootEntity}`,
    );
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

    const queryGenTime = ((Date.now() - startTime) / 1000).toFixed(2);
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
        thinkingDuration: ((Date.now() - startTime) / 1000).toFixed(1),
      }));
      return;
    }

    await executePureQueryAndReport(
      orchestratorResponse.legend_query,
      pureExecutionContext,
      dataProductCoordinates,
      config,
      plugin,
      setMessages,
      startTime,
    );
  } catch (error) {
    assertErrorThrown(error);
    addThinkingStep(
      setMessages,
      `Error: ${error.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );
    finishWithThinkingError(setMessages, error.message, startTime);
  }
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
  const { config, plugin, setMessages } = context;
  const dataProductCoordinates = orchestratorOptions?.dataProductCoordinates;
  const pureExecutionContext = orchestratorOptions?.pureExecutionContext;

  if (services.length === 0) {
    if (config.orchestratorUrl && dataProductCoordinates) {
      completeThinkingSteps(setMessages);
      await processQuestionViaOrchestrator(
        question,
        dataProductCoordinates,
        metadata,
        context,
        pureExecutionContext,
      );
      return;
    }
    finishWithThinkingError(
      setMessages,
      'No TDS services available for querying',
      startTime,
    );
    return;
  }

  addThinkingStep(setMessages, 'Found relevant services to query');

  const judgedSql = await generateAndJudgeSql(
    question,
    services,
    coordinates,
    context,
    startTime,
  );

  if (!judgedSql) {
    if (config.orchestratorUrl && dataProductCoordinates) {
      addThinkingStep(
        setMessages,
        'SQL generation could not handle this query, trying Legend AI orchestrator...',
      );
      updateLastAssistant(setMessages, () => ({
        error: null,
        isProcessing: true,
      }));
      await processQuestionViaOrchestrator(
        question,
        dataProductCoordinates,
        metadata,
        context,
        pureExecutionContext,
      );
      return;
    }
    return;
  }

  const sqlGenTimeValue = ((Date.now() - startTime) / 1000).toFixed(2);
  completeThinkingSteps(setMessages);
  updateLastAssistant(setMessages, () => ({
    sql: judgedSql,
    sqlGenTime: sqlGenTimeValue,
    isExecuting: true,
  }));

  const sqlResult = await executeSqlAndReport(
    judgedSql,
    services,
    config,
    plugin,
    setMessages,
    startTime,
    dataProductCoordinates,
  );

  if (
    sqlResult?.rows.length === 0 &&
    config.orchestratorUrl &&
    dataProductCoordinates
  ) {
    addThinkingStep(
      setMessages,
      'SQL query returned no results, trying Legend AI orchestrator...',
    );
    updateLastAssistant(setMessages, () => ({
      gridData: null,
      error: null,
      isProcessing: true,
      isExecuting: false,
    }));
    await processQuestionViaOrchestrator(
      question,
      dataProductCoordinates,
      metadata,
      context,
      pureExecutionContext,
    );
  }
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

    const serviceNames = services.map((s) => s.title);
    const intent = await plugin.classifyQuestionIntent(
      question,
      services.length > 0,
      config,
      serviceNames,
    );

    if (intent === LegendAIQuestionIntent.METADATA) {
      await handleMetadataQuestion(
        question,
        metadata,
        context,
        startTime,
        services.length > 0,
      );
      return;
    }

    if (intent === LegendAIQuestionIntent.ORCHESTRATOR) {
      if (config.orchestratorUrl && dataProductCoordinates) {
        completeThinkingSteps(setMessages);
        await processQuestionViaOrchestrator(
          question,
          dataProductCoordinates,
          metadata,
          context,
          pureExecutionContext,
        );
        return;
      }
      addThinkingStep(
        setMessages,
        'Orchestrator not available, trying SQL generation...',
      );
    }

    await processDataQuery(
      question,
      services,
      coordinates,
      metadata,
      context,
      startTime,
      dataProductCoordinates
        ? {
            dataProductCoordinates,
            ...(pureExecutionContext === undefined
              ? {}
              : { pureExecutionContext }),
          }
        : undefined,
    );
  } catch (error) {
    assertErrorThrown(error);
    addThinkingStep(
      setMessages,
      `Error: ${error.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );
    finishWithThinkingError(setMessages, error.message, startTime);
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
    await handleMetadataQuestion(
      question,
      metadata,
      context,
      startTime,
      services.length > 0,
    );
    return;
  }

  if (intent === LegendAIQuestionIntent.ORCHESTRATOR) {
    if (config.orchestratorUrl && dataProductCoordinates) {
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
    finishWithThinkingError(setMessages, error.message, startTime);
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

  return {
    questionText,
    setQuestionText,
    isSending,
    messages,
    askQuestion,
    askQuestionWithIntent,
    clearChat,
    expandedThinking,
    toggleThinking,
    conversationRef,
  };
};
