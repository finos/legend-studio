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

import type React from 'react';
import { assertErrorThrown, uuid } from '@finos/legend-shared';
import {
  type TDSServiceSchema,
  type LegendAIConfig,
  type LegendAIAssistantMessage,
  type LegendAIUserMessage,
  type LegendAIMessage,
  type LegendAIConversationTurn,
  type LegendAIProductMetadata,
  classifyQuestionIntentFast,
  LegendAIQuestionIntent,
  LegendAIThinkingStepStatus,
  LegendAIMessageRole,
  LegendAIErrorType,
  LegendAIServiceError,
  TDSServiceSourceType,
  buildColumnDefsFromNames,
  LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
  getTodayISO,
} from '../LegendAITypes.js';
import {
  type LegendAI_LegendApplicationPlugin_Extension,
  type LegendAIOrchestratorDataProductCoordinates,
  type LegendAISqlExecutionResultData,
  type LegendAIResolvedEntities,
  LegendAIJudgeVerdict,
} from '../LegendAI_LegendApplicationPlugin_Extension.js';
import {
  type QueryExplicitExecutionContextInfo,
  extractElementNameFromPath,
} from '@finos/legend-graph';

const MAX_ERROR_MESSAGE_LENGTH = 500;
const MAX_THINKING_ERROR_PREVIEW_LENGTH = 200;
const DEFAULT_MAX_JUDGE_ATTEMPTS = 5;
const DEFAULT_MAX_EXECUTION_RETRIES = 3;
const ANALYSIS_TIMEOUT_MS = 15_000;
const ANALYSIS_PREVIEW_ROW_LIMIT = 3;
const ANALYSIS_PREVIEW_VALUE_LIMIT = 40;
const MAX_NON_SQL_PASS_ATTEMPTS = 2;
const ALIAS_DOT_COL_PATTERN = /\b(?<tbl>[a-z]\w*)\s*\.\s*"(?<col>[^"]+)"/gi;
const JOIN_PATTERN = /\bJOIN\b/i;
const ORDER_BY_SPLIT = /\bORDER\s+BY\b/i;
const UNION_ALL_PATTERN = /\bUNION\s+ALL\b/i;
const LITERAL_COL_PATTERN = /,\s*'[^']*'\s+AS\s+(?:"[^"]+"|[a-z]\w*)/gi;
const DEFAULT_SAFETY_LIMIT = 1000;
const HAS_LIMIT_PATTERN = /\bLIMIT\s+\d+/i;
const HAS_AGGREGATION_PATTERN =
  /\bGROUP\s+BY\b|\bCOUNT\s*\(|\bSUM\s*\(|\bAVG\s*\(|\bMIN\s*\(|\bMAX\s*\(/i;
const MAX_SERVICES_FOR_LLM_SELECTION = 30;
const ORCHESTRATOR_FALLBACK_LABEL = 'Try Legend AI Orchestrator';
const SQL_GENERATION_FAILURE_WITH_ORCHESTRATOR =
  'SQL generation could not handle this query. You can try the Legend AI Orchestrator to generate a Pure query instead.';
const SQL_GENERATION_FAILURE_NO_ORCHESTRATOR =
  'SQL generation could not handle this query. Try rephrasing your question.';
const SERVICE_PARAM_DATE_LIKE_PATTERNS: readonly RegExp[] = [
  /date|time|day|month|year|period|asOf|businessDate|processingDate|snapshot/i,
  /effective|valid|settle|trade|maturity|expir|inception|close|open/i,
  /start|end|from|until|begin|report|cutoff|valuation|pricing/i,
];

function isLikelySqlQuery(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return (
    trimmed.startsWith('select') ||
    trimmed.startsWith('with') ||
    trimmed.startsWith('(')
  );
}

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

function buildTurnFromAssistant(
  userText: string,
  asstMsg: LegendAIAssistantMessage,
): LegendAIConversationTurn | undefined {
  if (asstMsg.sql) {
    const turn: LegendAIConversationTurn = {
      question: userText,
      sql: asstMsg.sql,
      intent: LegendAIQuestionIntent.DATA_QUERY,
    };
    if (asstMsg.gridData) {
      turn.rowCount = asstMsg.gridData.rowData.length;
      const colNames = asstMsg.gridData.columnDefs
        .map((c) => c.headerName ?? c.colId ?? '')
        .filter((n) => n.length > 0);
      if (colNames.length > 0) {
        turn.resultSummary = `Columns: ${colNames.join(', ')}; ${turn.rowCount} row(s) returned`;
      }
    }
    return turn;
  }
  if (asstMsg.textAnswer) {
    return {
      question: userText,
      sql: asstMsg.textAnswer,
      intent: LegendAIQuestionIntent.METADATA,
    };
  }
  return undefined;
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
      const turn = buildTurnFromAssistant(userMsg.text, asstMsg);
      if (turn) {
        history.push(turn);
      }
      i += 2;
    } else {
      i += 1;
    }
  }
  return history;
}

function formatServiceParams(services: TDSServiceSchema[]): string[] {
  return services.flatMap((s) => {
    if (s.parameterSchemas && s.parameterSchemas.length > 0) {
      return [
        `${s.title}: ${s.parameterSchemas
          .map((ps) => {
            const parts = [ps.name];
            if (ps.type) {
              parts.push(`(${ps.type})`);
            }
            return parts.join(' ');
          })
          .join(', ')}`,
      ];
    }
    return s.parameters.length > 0
      ? [`${s.title}: ${s.parameters.join(', ')}`]
      : [];
  });
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

function buildFallbackSuggestions(services: TDSServiceSchema[]): string[] {
  return services.slice(0, 3).map((svc) => `Show 10 records from ${svc.title}`);
}

function appendFallbackSuggestions(
  setMessages: MessageSetter,
  services: TDSServiceSchema[],
): void {
  const suggestions = buildFallbackSuggestions(services);
  if (suggestions.length > 0) {
    updateLastAssistant(setMessages, () => ({
      suggestedQueries: suggestions,
    }));
  }
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

function tokenizeQuestionForCoverage(question: string): string[] {
  return question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);
}

function buildQuestionCoverageNote(
  question: string,
  columns: string[],
): string {
  const questionTokens = tokenizeQuestionForCoverage(question);
  if (questionTokens.length === 0 || columns.length === 0) {
    return '';
  }

  const normalizedColumns = columns.map((c) => c.toLowerCase());
  const matchedTokenCount = questionTokens.filter((token) =>
    normalizedColumns.some((column) => column.includes(token)),
  ).length;

  if (matchedTokenCount > 0) {
    return '';
  }

  return 'The retrieved columns do not clearly map to the key terms in your question. Consider refining the question with specific fields, entities, or filters.';
}

function formatPreviewValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  if (raw.length <= ANALYSIS_PREVIEW_VALUE_LIMIT) {
    return raw;
  }
  return `${raw.slice(0, ANALYSIS_PREVIEW_VALUE_LIMIT)}...`;
}

function buildDeterministicResultSummary(
  question: string,
  _query: string,
  columns: string[],
  rows: unknown[],
): string {
  const selectedColumns = columns.length === 0 ? 'none' : columns.join(', ');
  const rowCount = rows.length;
  const previewRows = rows
    .slice(0, ANALYSIS_PREVIEW_ROW_LIMIT)
    .map((row, index) => {
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        const entries = Object.entries(row as Record<string, unknown>).slice(
          0,
          4,
        );
        const formattedEntries = entries.map(
          ([key, value]) => `${key}: ${formatPreviewValue(value)}`,
        );
        return `${index + 1}. ${formattedEntries.join(', ')}`;
      }
      return `${index + 1}. ${formatPreviewValue(row)}`;
    })
    .join('\n');

  const coverageNote = buildQuestionCoverageNote(question, columns);
  const parts = [
    `I retrieved ${rowCount} row${rowCount === 1 ? '' : 's'} for your question using this query.`,
    `Columns returned: ${selectedColumns}.`,
    `Sample rows:\n${previewRows || 'No sample rows available.'}`,
  ];
  if (coverageNote) {
    parts.push(coverageNote);
  }
  return parts.join('\n\n');
}

export async function buildMetadataOverview(
  question: string,
  metadata: LegendAIProductMetadata,
  context: LegendAIOperationContext,
): Promise<string> {
  const { plugin, config, history } = context;
  const metadataPromptText = plugin.buildMetadataPrompt(
    question,
    metadata,
    history,
  );
  const rawAnswer = await plugin.callLLM(metadataPromptText, config);
  return parseSuggestedQueries(rawAnswer).answer;
}

function mergeMetadataAndQueryAnalysis(
  metadataOverview: string,
  queryAnalysis: string | null,
): string {
  const metadata = metadataOverview.trim();
  const analysis = queryAnalysis?.trim();
  if (!analysis) {
    return `### Metadata context\n${metadata}`;
  }
  return `### Metadata context\n${metadata}\n\n### Query analysis\n${analysis}`;
}

export function attachMetadataOverview(
  setMessages: MessageSetter,
  metadataOverview: string,
): void {
  const normalized = metadataOverview.trim();
  if (!normalized) {
    return;
  }
  updateLastAssistant(setMessages, (msg) => {
    const existing = msg.textAnswer?.trim() ?? null;
    if (existing?.includes('### Metadata context')) {
      return {};
    }
    return {
      textAnswer: mergeMetadataAndQueryAnalysis(normalized, existing),
    };
  });
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

function handleNonSqlPass(
  setMessages: MessageSetter,
  nonSqlPassAttempts: number,
  attempt: number,
  maxAttempts: number,
): 'continue' | 'abort' {
  addThinkingStep(
    setMessages,
    'Judge approved a non-SQL draft, requesting query correction...',
  );
  if (
    attempt === maxAttempts ||
    nonSqlPassAttempts >= MAX_NON_SQL_PASS_ATTEMPTS
  ) {
    addThinkingStep(
      setMessages,
      'Max verification attempts reached without a valid SQL query',
    );
    return 'abort';
  }
  return 'continue';
}

function finalizeJudgeAttempt(
  currentSql: string,
  previousSql: string,
  attempt: number,
  maxAttempts: number,
  setMessages: MessageSetter,
): string | null | undefined {
  if (currentSql !== previousSql && attempt < maxAttempts) {
    return undefined;
  }
  addThinkingStep(
    setMessages,
    isLikelySqlQuery(currentSql)
      ? 'Max verification attempts reached, using best query'
      : 'Max verification attempts reached without a valid SQL query',
  );
  return isLikelySqlQuery(currentSql) ? currentSql : null;
}

async function runJudgeLoop(
  generatedSql: string,
  buildJudgePromptFn: (sql: string) => string,
  context: LegendAIOperationContext,
): Promise<string | null> {
  const { config, plugin, setMessages } = context;
  const maxAttempts = config.maxJudgeAttempts ?? DEFAULT_MAX_JUDGE_ATTEMPTS;
  let currentSql = generatedSql;
  let nonSqlPassAttempts = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    addThinkingStep(
      setMessages,
      `Verifying query correctness (${attempt}/${maxAttempts})...`,
    );
    const judgePrompt = buildJudgePromptFn(currentSql);
    const judgeAnswer = await plugin.callLLM(judgePrompt, config);
    const judgeResult = plugin.extractJudgeResult(judgeAnswer);

    if (judgeResult.verdict === LegendAIJudgeVerdict.PASS) {
      if (!isLikelySqlQuery(currentSql)) {
        nonSqlPassAttempts++;
        const action = handleNonSqlPass(
          setMessages,
          nonSqlPassAttempts,
          attempt,
          maxAttempts,
        );
        if (action === 'abort') {
          return null;
        }
        continue;
      }
      completeThinkingSteps(setMessages);
      return currentSql;
    }

    const previousSql = currentSql;
    const correctedSql = judgeResult.correctedSql?.trim();
    if (correctedSql !== undefined && isLikelySqlQuery(correctedSql)) {
      addThinkingStep(setMessages, `Query corrected (attempt ${attempt})`);
      currentSql = correctedSql;
    }

    const result = finalizeJudgeAttempt(
      currentSql,
      previousSql,
      attempt,
      maxAttempts,
      setMessages,
    );
    if (result !== undefined) {
      return result;
    }
  }

  return null;
}

export async function generateAndJudgeSql(
  question: string,
  services: TDSServiceSchema[],
  coordinates: string,
  context: LegendAIOperationContext,
  startTime: number,
  metadata?: LegendAIProductMetadata,
): Promise<string | null> {
  const { plugin, config, history, setMessages } = context;
  addThinkingStep(setMessages, 'Building context from service schemas...');
  const prompt = plugin.buildGeneratorPrompt(
    question,
    services,
    coordinates,
    history,
    metadata,
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

  return runJudgeLoop(
    generatedSql,
    (sql) =>
      plugin.buildJudgePrompt(sql, question, services, coordinates, history),
    context,
  );
}

/**
 * Dedicated generate-and-judge loop for access point queries.
 * Uses AP-specific prompts that focus on `p()` syntax and omit
 * coordinates, parameters, and service()-related rules.
 */
export async function generateAndJudgeAccessPointSql(
  question: string,
  accessPoints: TDSServiceSchema[],
  context: LegendAIOperationContext,
  startTime: number,
): Promise<string | null> {
  const { plugin, config, history, setMessages } = context;
  addThinkingStep(setMessages, 'Building context from access point schemas...');
  const prompt = plugin.buildAccessPointGeneratorPrompt(
    question,
    accessPoints,
    history,
  );
  addThinkingStep(setMessages, 'Generating SQL query for access points...');

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
      buildGenerationFailureMessage(failure, suggestion, accessPoints),
      startTime,
      LegendAIErrorType.GENERATION,
    );
    return null;
  }

  if (!generatedSql) {
    addThinkingStep(setMessages, 'Could not extract SQL from response');
    finishWithThinkingError(
      setMessages,
      'Could not extract SQL from LLM response.\nTry rephrasing your question or ask about a specific access point.',
      startTime,
      LegendAIErrorType.GENERATION,
    );
    return null;
  }

  return runJudgeLoop(
    generatedSql,
    (sql) =>
      plugin.buildAccessPointJudgePrompt(sql, question, accessPoints, history),
    context,
  );
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
  addThinkingStep(setMessages, 'Verifying answer coverage...');
  if (analysis) {
    const coverageNote = buildQuestionCoverageNote(
      question,
      execResult.columns,
    );
    const summary = coverageNote
      ? `${analysis.summary}\n\n${coverageNote}`
      : analysis.summary;
    completeThinkingSteps(setMessages);
    updateLastAssistant(setMessages, () => ({
      textAnswer: summary,
      suggestedQueries: analysis.suggestedQueries,
      isProcessing: false,
      thinkingDuration: elapsedSeconds(startTime),
    }));
  } else {
    const fallbackSummary = buildDeterministicResultSummary(
      question,
      query,
      execResult.columns,
      execResult.rows,
    );
    completeThinkingSteps(setMessages);
    updateLastAssistant(setMessages, () => ({
      textAnswer: fallbackSummary,
      suggestedQueries: [],
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
        `No results with ${extractElementNameFromPath(resolvedEntities.rootEntity)}, retrying with ${extractElementNameFromPath(alternateRoot)}...`,
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
      } catch (retryError) {
        assertErrorThrown(retryError);
        addThinkingStep(
          setMessages,
          `Retry with alternate entity failed: ${retryError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
        );
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
        `Using pre-resolved root entity: ${extractElementNameFromPath(resolvedEntities.rootEntity)}`,
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
        `Found root entity: ${extractElementNameFromPath(resolvedEntities.rootEntity)}`,
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
    } catch (analysisError) {
      assertErrorThrown(analysisError);
      addThinkingStep(
        setMessages,
        `Result analysis failed: ${analysisError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
      );
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
    } catch (fallbackError) {
      assertErrorThrown(fallbackError);
      addThinkingStep(
        setMessages,
        `Fallback guidance failed: ${fallbackError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
      );
    }

    finishWithThinkingError(
      setMessages,
      error.message,
      startTime,
      orchErrorType,
    );
  }
}

export function cleanLlmSqlResponse(raw: string): string {
  return raw
    .trim()
    .replace(/^```\w*\n?/, '')
    .replace(/\n?```$/, '')
    .replace(/;\s*$/, '')
    .trim();
}

export function isValidSqlCorrection(
  trimmed: string,
  currentSql: string,
): boolean {
  return (
    trimmed.length > 0 &&
    trimmed.toLowerCase().startsWith('select') &&
    trimmed !== currentSql
  );
}

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

function isDateLikeParam(paramName: string): boolean {
  return SERVICE_PARAM_DATE_LIKE_PATTERNS.some((p) => p.test(paramName));
}

function hasUnresolvableParams(service: TDSServiceSchema): boolean {
  return service.parameters.some((p) => !isDateLikeParam(p));
}

function getNonDateParamNames(service: TDSServiceSchema): string[] {
  return service.parameters.filter((p) => !isDateLikeParam(p));
}

/**
 * Strips non-date service parameters whose values were NOT explicitly
 * mentioned by the user in their question. Parameters with values that
 * appear in the question text are kept, since those are user-intended.
 */
export function stripGuessedNonDateServiceParams(
  sql: string,
  question: string,
): string {
  const lowerQuestion = question.toLowerCase();
  return sql.replaceAll(/,\s*\w+\s*=>\s*'[^']*'/g, (match) => {
    const parts = /,\s*(?<param>\w+)\s*=>\s*'(?<value>[^']*)'/.exec(
      match,
    )?.groups;
    if (!parts?.param) {
      return match;
    }
    if (parts.param === 'coordinates' || isDateLikeParam(parts.param)) {
      return match;
    }
    if (parts.value && lowerQuestion.includes(parts.value.toLowerCase())) {
      return match;
    }
    return '';
  });
}

/**
 * Ensures all date-like parameters from the service schemas are present
 * in EVERY service() call in the SQL. If the LLM omitted a mandatory date
 * parameter, this injects it with today's date into each service() call
 * that lacks it. Only applies to service() calls (not p() calls).
 */
export function ensureDateParameters(
  sql: string,
  services: TDSServiceSchema[],
): string {
  const dateParams = new Set<string>();
  for (const svc of services) {
    if (svc.sourceType === TDSServiceSourceType.ACCESS_POINT) {
      continue;
    }
    for (const p of svc.parameters) {
      if (isDateLikeParam(p)) {
        dateParams.add(p);
      }
    }
  }
  if (dateParams.size === 0) {
    return sql;
  }

  const today = getTodayISO();

  const serviceCallPattern = /\bservice\s*\([^()]*\)/gi;
  return sql.replaceAll(serviceCallPattern, (match) => {
    let patched = match;
    for (const param of dateParams) {
      if (new RegExp(String.raw`\b${param}\s*=>`, 'i').test(patched)) {
        continue;
      }
      const lastParen = patched.lastIndexOf(')');
      if (lastParen !== -1) {
        patched = `${patched.slice(
          0,
          lastParen,
        )},\n    ${param} => '${today}'${patched.slice(lastParen)}`;
      }
    }
    return patched;
  });
}

export interface MissingParamInfo {
  name: string;
  hint?: string;
  isDateLike: boolean;
}

function resolveParamHint(
  paramName: string,
  isDateLike: boolean,
  service: TDSServiceSchema,
): string | undefined {
  if (isDateLike) {
    return `today's date: ${getTodayISO()}`;
  }
  const matchingCol = service.columns.find((c) => c.name === paramName);
  return matchingCol?.sampleValues ?? matchingCol?.documentation ?? undefined;
}

/**
 * Detects ALL service parameters required by the schema but missing from
 * the generated SQL. Works for any parameter type — date, identifier, key,
 * or anything else. Each result includes a hint (from schema column docs
 * or sample values) and whether the param is date-like.
 */
export function detectMissingServiceParams(
  sql: string,
  services: TDSServiceSchema[],
): MissingParamInfo[] {
  const missing: MissingParamInfo[] = [];
  const seen = new Set<string>();

  for (const svc of services) {
    if (svc.sourceType === TDSServiceSourceType.ACCESS_POINT) {
      continue;
    }
    for (const p of svc.parameters) {
      if (seen.has(p)) {
        continue;
      }
      seen.add(p);
      if (!new RegExp(String.raw`\b${p}\s*=>`, 'i').test(sql)) {
        const isDateLike = isDateLikeParam(p);
        const hint = resolveParamHint(p, isDateLike, svc);
        missing.push({
          name: p,
          isDateLike,
          ...(hint === undefined ? {} : { hint }),
        });
      }
    }
  }
  return missing;
}

/**
 * Builds a user-facing warning message listing which service parameters
 * are missing from the query and need to be provided by the user.
 */
export function buildMissingParamsWarning(
  missingParams: MissingParamInfo[],
): string {
  const paramDescriptions = missingParams.map((mp) => {
    if (mp.hint) {
      return `- **${mp.name}** (e.g. ${mp.hint})`;
    }
    return `- **${mp.name}**`;
  });
  const exampleValues = missingParams
    .map((mp) => {
      if (mp.isDateLike) {
        return `${mp.name}=${getTodayISO()}`;
      }
      return `${mp.name}=[your value]`;
    })
    .join(', ');
  return [
    `This service requires the following parameter${missingParams.length > 1 ? 's' : ''} to execute:`,
    '',
    ...paramDescriptions,
    '',
    `Please provide ${missingParams.length > 1 ? 'values' : 'a value'} in your question, e.g. "show data where ${exampleValues}".`,
  ].join('\n');
}

/**
 * Appends a safety LIMIT to queries that lack one, preventing unbounded
 * result sets on large services. Skips aggregation queries since those
 * naturally produce bounded output.
 */
export function ensureSafeLimit(
  sql: string,
  limit: number = DEFAULT_SAFETY_LIMIT,
): string {
  if (HAS_LIMIT_PATTERN.test(sql) || HAS_AGGREGATION_PATTERN.test(sql)) {
    return sql;
  }
  return `${sql.trimEnd()}\nLIMIT ${limit}`;
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
  const safeSql = ensureSafeLimit(
    ensureDateParameters(
      sanitizeLiteralColumns(sanitizeJoinOrderBy(sql)),
      services,
    ),
  );
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
        context,
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
  context: LegendAIOperationContext,
): Promise<string | undefined> {
  const { plugin, config, setMessages } = context;

  let availableColumns: string[] | undefined;
  if (/no column found|column.*not.*found/i.test(errorMessage)) {
    const primaryService = services[0];
    if (primaryService) {
      availableColumns = await plugin.probeServiceColumns(
        primaryService,
        coordinates,
        config,
      );
    }
  }

  const prompt = plugin.buildErrorCorrectionPrompt(
    currentSql,
    errorMessage,
    question,
    services,
    coordinates,
    availableColumns,
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
  } catch (correctionError) {
    assertErrorThrown(correctionError);
    addThinkingStep(
      setMessages,
      `SQL error correction failed: ${correctionError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );
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
    } catch (retryExecError) {
      assertErrorThrown(retryExecError);
      addThinkingStep(
        setMessages,
        `Corrected query execution failed: ${retryExecError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
      );
    }
  } catch (correctionError) {
    assertErrorThrown(correctionError);
    addThinkingStep(
      setMessages,
      `Zero-row correction failed: ${correctionError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );
  }
  return undefined;
}

function formatUnresolvableParams(services: TDSServiceSchema[]): string[] {
  const parts: string[] = [];
  for (const svc of services) {
    for (const paramName of getNonDateParamNames(svc)) {
      const matchingCol = svc.columns.find((c) => c.name === paramName);
      const docHint = matchingCol?.documentation ?? matchingCol?.sampleValues;
      parts.push(
        docHint ? `**${paramName}** (${docHint})` : `**${paramName}**`,
      );
    }
  }
  return [...new Set(parts)];
}

function buildZeroRowMessage(services: TDSServiceSchema[]): string {
  const withUnresolvable = services.filter((s) => hasUnresolvableParams(s));
  if (withUnresolvable.length > 0) {
    const uniqueParts = formatUnresolvableParams(withUnresolvable);
    const firstSvc = withUnresolvable[0];
    const firstParam = firstSvc
      ? (getNonDateParamNames(firstSvc)[0] ?? 'parameter')
      : 'parameter';
    return `The SQL query executed successfully but returned **0 rows**. This service requires specific values for ${uniqueParts.join(', ')} to return data. Please include ${uniqueParts.length === 1 ? 'a value' : 'values'} in your question, e.g., "show data where ${firstParam} is [your value]".`;
  }

  const withFailedExtraction = services.filter(
    (s) => s.parameterExtractionFailed,
  );
  if (withFailedExtraction.length > 0) {
    const names = withFailedExtraction.map((s) => `**${s.title}**`).join(', ');
    return `The SQL query executed successfully but returned **0 rows**. Note: parameter detection for ${names} was incomplete — this service may require additional parameters not shown in the schema. Try specifying filter values (dates, IDs, etc.) directly in your question.`;
  }

  return 'The SQL query executed successfully but returned **0 rows**. The applied filters may not match any records, or the specific values may not exist in the queried datasets.';
}

function handleSqlGenerationFailure(
  setMessages: MessageSetter,
  startTime: number,
  hasOrchestratorFallback: boolean,
  orchestratorMessage: string,
  errorMessage: string,
  errorType: LegendAIErrorType,
  suggestedQueries?: string[],
): void {
  const suggestions = suggestedQueries ?? [];
  completeThinkingSteps(setMessages);
  if (hasOrchestratorFallback) {
    updateLastAssistant(setMessages, () => ({
      textAnswer: orchestratorMessage,
      suggestedQueries: suggestions,
      fallbackAction: {
        label: ORCHESTRATOR_FALLBACK_LABEL,
        actionId: LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
      },
      isProcessing: false,
      thinkingDuration: elapsedSeconds(startTime),
    }));
  } else {
    finishWithThinkingError(setMessages, errorMessage, startTime, errorType);
    if (suggestions.length > 0) {
      updateLastAssistant(setMessages, () => ({
        suggestedQueries: suggestions,
      }));
    }
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
    } catch (analysisError) {
      assertErrorThrown(analysisError);
      addThinkingStep(
        setMessages,
        `Result analysis failed: ${analysisError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
      );
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
            label: ORCHESTRATOR_FALLBACK_LABEL,
            actionId: LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
          },
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

/**
 * Scores each service against the user question by counting keyword
 * overlap between the question tokens and the service title, description,
 * column names, and parameter names. Returns services sorted by
 * descending relevance score.
 */
export function preFilterServicesByRelevance(
  question: string,
  services: TDSServiceSchema[],
  limit: number,
): TDSServiceSchema[] {
  const queryTokens = question
    .toLowerCase()
    .split(/[\s,.:;!?'"()\-/]+/)
    .filter((t) => t.length > 2);
  if (queryTokens.length === 0) {
    return services.slice(0, limit);
  }
  const scored = services.map((svc) => {
    const haystack = [
      svc.title,
      svc.description ?? '',
      svc.pattern,
      ...svc.columns.slice(0, 30).map((c) => c.name),
      ...svc.parameters,
      ...(svc.preFilters ?? []).flatMap((pf) => {
        const parts = [pf.property, pf.operator];
        if (pf.value !== undefined) {
          parts.push(String(pf.value));
        }
        return parts;
      }),
    ]
      .join(' ')
      .toLowerCase();
    let score = 0;
    for (const token of queryTokens) {
      if (haystack.includes(token)) {
        score += 1;
      }
    }
    return { svc, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.svc);
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

  let candidates = services;
  if (services.length > MAX_SERVICES_FOR_LLM_SELECTION) {
    candidates = preFilterServicesByRelevance(
      question,
      services,
      MAX_SERVICES_FOR_LLM_SELECTION,
    );
    addThinkingStep(
      setMessages,
      `Pre-filtered ${services.length} services to ${candidates.length} candidates`,
    );
  }

  try {
    addThinkingStep(setMessages, 'Selecting best service for your query...');
    return await plugin.selectRelevantServices(question, candidates, config);
  } catch (selectionError) {
    assertErrorThrown(selectionError);
    addThinkingStep(
      setMessages,
      `Service selection failed, using pre-filtered candidates: ${selectionError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );
    return candidates;
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

  const strippedSql = stripGuessedNonDateServiceParams(recoveredSql, question);
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
    } catch (stripError) {
      assertErrorThrown(stripError);
      addThinkingStep(
        setMessages,
        `Parameter stripping recovery failed: ${stripError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
      );
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

/**
 * Dedicated query flow for data product access points.
 * Unlike processDataQuery this:
 * - Uses AP-specific generator/judge prompts (p() syntax, no coordinates/params)
 * - Skips parameter detection (APs have no parameters)
 */
async function processAccessPointQuery(
  question: string,
  accessPoints: TDSServiceSchema[],
  metadata: LegendAIProductMetadata,
  context: LegendAIOperationContext,
  startTime: number,
  dataProductCoordinates: LegendAIOrchestratorDataProductCoordinates,
): Promise<void> {
  const { config, plugin, setMessages } = context;
  const hasOrchestratorFallback = Boolean(config.orchestratorUrl);

  addThinkingStep(setMessages, 'Found relevant access points to query');

  const selectedAPs = await selectBestServices(question, accessPoints, context);

  const judgedSql = await generateAndJudgeAccessPointSql(
    question,
    selectedAPs,
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
      SQL_GENERATION_FAILURE_WITH_ORCHESTRATOR,
      SQL_GENERATION_FAILURE_NO_ORCHESTRATOR,
      LegendAIErrorType.GENERATION,
      buildFallbackSuggestions(selectedAPs),
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

  const execStartTime = Date.now();
  try {
    const safeSql = ensureSafeLimit(judgedSql);
    const rawResult = await plugin.executeLakehouseSql(
      safeSql,
      dataProductCoordinates,
      config,
    );

    await reportQueryResults(
      {
        currentSql: judgedSql,
        sqlResult: rawResult,
        question,
        services: selectedAPs,
      },
      metadata,
      context,
      startTime,
      hasOrchestratorFallback,
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
      buildExecutionErrorMessage(executeError.message, selectedAPs),
      startTime,
      execErrorType === LegendAIErrorType.GENERAL
        ? LegendAIErrorType.EXECUTION
        : execErrorType,
    );
    updateLastAssistant(setMessages, () => ({
      execTime: elapsedSeconds(execStartTime, 2),
      isExecuting: false,
      suggestedQueries: buildFallbackSuggestions(selectedAPs),
      ...(hasOrchestratorFallback
        ? {
            fallbackAction: {
              label: ORCHESTRATOR_FALLBACK_LABEL,
              actionId: LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
            },
          }
        : {}),
    }));
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
    metadata,
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
      SQL_GENERATION_FAILURE_WITH_ORCHESTRATOR,
      SQL_GENERATION_FAILURE_NO_ORCHESTRATOR,
      LegendAIErrorType.GENERATION,
      buildFallbackSuggestions(selectedServices),
    );
    return;
  }

  // Check for any missing service parameters (date, id, key — anything)
  const missingParams = detectMissingServiceParams(judgedSql, selectedServices);
  if (missingParams.length > 0) {
    const sqlGenTimeValue = elapsedSeconds(startTime, 2);
    completeThinkingSteps(setMessages);
    addThinkingStep(
      setMessages,
      `Missing required parameter${missingParams.length > 1 ? 's' : ''}: ${missingParams.map((p) => p.name).join(', ')}`,
    );
    completeThinkingSteps(setMessages);
    updateLastAssistant(setMessages, () => ({
      sql: judgedSql,
      sqlGenTime: sqlGenTimeValue,
      textAnswer: buildMissingParamsWarning(missingParams),
      isProcessing: false,
      isExecuting: false,
      thinkingDuration: elapsedSeconds(startTime),
    }));
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
      suggestedQueries: buildFallbackSuggestions(selectedServices),
      ...(hasOrchestratorFallback
        ? {
            fallbackAction: {
              label: ORCHESTRATOR_FALLBACK_LABEL,
              actionId: LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
            },
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

function splitServicesByType(services: TDSServiceSchema[]): {
  tdsServices: TDSServiceSchema[];
  accessPoints: TDSServiceSchema[];
} {
  return {
    tdsServices: services.filter(
      (s) => s.sourceType !== TDSServiceSourceType.ACCESS_POINT,
    ),
    accessPoints: services.filter(
      (s) => s.sourceType === TDSServiceSourceType.ACCESS_POINT,
    ),
  };
}

async function routeToAccessPointOrData(
  question: string,
  services: TDSServiceSchema[],
  coordinates: string,
  metadata: LegendAIProductMetadata,
  context: LegendAIOperationContext,
  startTime: number,
  orchestratorOpts: LegendAIOrchestratorOptionsParam | undefined,
): Promise<void> {
  const dataProductCoordinates = orchestratorOpts?.dataProductCoordinates;
  const { tdsServices, accessPoints } = splitServicesByType(services);
  if (
    tdsServices.length === 0 &&
    accessPoints.length > 0 &&
    dataProductCoordinates
  ) {
    await processAccessPointQuery(
      question,
      accessPoints,
      metadata,
      context,
      startTime,
      dataProductCoordinates,
    );
  } else {
    await processDataQuery(
      question,
      tdsServices,
      coordinates,
      metadata,
      context,
      startTime,
      orchestratorOpts,
    );
  }
}

async function handleAmbiguousIntent(
  question: string,
  services: TDSServiceSchema[],
  coordinates: string,
  metadata: LegendAIProductMetadata,
  context: LegendAIOperationContext,
  startTime: number,
  orchestratorOpts: LegendAIOrchestratorOptionsParam | undefined,
): Promise<void> {
  const { setMessages } = context;
  addThinkingStep(
    setMessages,
    'Intent is ambiguous, providing metadata context and querying data...',
  );
  let metadataOverview: string | undefined;
  try {
    addThinkingStep(setMessages, 'Building metadata context...');
    metadataOverview = await buildMetadataOverview(question, metadata, context);
  } catch (metadataError) {
    assertErrorThrown(metadataError);
    addThinkingStep(
      setMessages,
      `Metadata context failed: ${metadataError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );
  }

  try {
    await routeToAccessPointOrData(
      question,
      services,
      coordinates,
      metadata,
      context,
      startTime,
      orchestratorOpts,
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
    await handleMetadataQuestion(question, metadata, context, startTime, true);
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

    const orchestratorOpts = dataProductCoordinates
      ? {
          dataProductCoordinates,
          ...(pureExecutionContext === undefined
            ? {}
            : { pureExecutionContext }),
        }
      : undefined;

    if (services.length === 0) {
      await handleMetadataQuestion(
        question,
        metadata,
        context,
        startTime,
        false,
      );
      if (config.orchestratorUrl && dataProductCoordinates) {
        updateLastAssistant(setMessages, () => ({
          fallbackAction: {
            label: ORCHESTRATOR_FALLBACK_LABEL,
            actionId: LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
          },
        }));
      }
      return;
    }

    const fastIntent = classifyQuestionIntentFast(question, true);
    if (
      fastIntent.intent === LegendAIQuestionIntent.METADATA &&
      !fastIntent.ambiguous
    ) {
      await handleMetadataQuestion(
        question,
        metadata,
        context,
        startTime,
        true,
      );
      return;
    }

    if (fastIntent.ambiguous) {
      await handleAmbiguousIntent(
        question,
        services,
        coordinates,
        metadata,
        context,
        startTime,
        orchestratorOpts,
      );
      return;
    }

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

    try {
      await routeToAccessPointOrData(
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
      appendFallbackSuggestions(setMessages, services);
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
    appendFallbackSuggestions(setMessages, services);
  }
}

async function routeDataQueryWithErrorHandling(
  question: string,
  services: TDSServiceSchema[],
  coordinates: string,
  metadata: LegendAIProductMetadata,
  context: LegendAIOperationContext,
  orchestratorOptions: LegendAIOrchestratorOptionsParam | undefined,
): Promise<void> {
  const { setMessages } = context;
  const startTime = Date.now();
  try {
    addThinkingStep(setMessages, 'Preparing data query...');
    await routeToAccessPointOrData(
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

  if (
    intent === LegendAIQuestionIntent.ORCHESTRATOR &&
    config.orchestratorUrl &&
    dataProductCoordinates
  ) {
    if (services.length > 0) {
      await routeDataQueryWithErrorHandling(
        question,
        services,
        coordinates,
        metadata,
        context,
        orchestratorOptions,
      );
      return;
    }
    const startTime = Date.now();
    await handleMetadataQuestion(question, metadata, context, startTime, false);
    updateLastAssistant(setMessages, () => ({
      fallbackAction: {
        label: ORCHESTRATOR_FALLBACK_LABEL,
        actionId: LEGEND_AI_ORCHESTRATOR_FALLBACK_ACTION_ID,
      },
    }));
    return;
  }

  await routeDataQueryWithErrorHandling(
    question,
    services,
    coordinates,
    metadata,
    context,
    orchestratorOptions,
  );
}
