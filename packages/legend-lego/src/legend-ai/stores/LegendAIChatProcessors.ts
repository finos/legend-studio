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
import { assertErrorThrown, isPlainObject, uuid } from '@finos/legend-shared';
import {
  type TDSServiceSchema,
  type LegendAIConfig,
  type LegendAIAssistantMessage,
  type LegendAIUserMessage,
  type LegendAIMessage,
  type LegendAIConversationTurn,
  type LegendAIProductMetadata,
  type LegendAIModelContext,
  LegendAIQuestionIntent,
  LegendAIThinkingStepStatus,
  LegendAIMessageRole,
  LegendAIErrorType,
  LegendAIServiceError,
  LegendAIUnsupportedEngineShapeError,
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
import {
  buildEnrichedBusinessContext,
  buildModelContextEnrichmentText,
  findBestAlternateRoot,
  splitIdentifierTokens,
  tokenizeText,
} from '../LegendAIDocEnrichment.js';
import {
  isFuzzyMatch,
  preFilterServicesByRelevance,
} from '../LegendAIServiceRetrieval.js';
import {
  isNumericColumn,
  isStringColumn,
} from '../components/LegendAIChatHelpers.js';

const MAX_ERROR_MESSAGE_LENGTH = 500;
const MAX_THINKING_ERROR_PREVIEW_LENGTH = 200;
const DEFAULT_MAX_JUDGE_ATTEMPTS = 5;
const DEFAULT_MAX_EXECUTION_RETRIES = 3;
const ANALYSIS_TIMEOUT_MS = 15_000;
const ORCHESTRATOR_GENERATION_TIMEOUT_MS = 120_000;
const EXECUTION_TIMEOUT_MS = 300_000;
const ANALYSIS_PREVIEW_ROW_LIMIT = 3;
const ANALYSIS_PREVIEW_VALUE_LIMIT = 40;
const MAX_NON_SQL_PASS_ATTEMPTS = 2;
const JOIN_PATTERN = /\bJOIN\b/i;
const ORDER_BY_SPLIT = /\bORDER\s+BY\b/i;
const UNION_ALL_PATTERN = /\bUNION\s+ALL\b/i;
const LITERAL_COL_PATTERN = /,\s*'[^']*'\s+AS\s+(?:"[^"]+"|[a-z]\w*)/gi;
const SELECT_ALIAS_PATTERN =
  /\b(?<tbl>[a-z]\w*)\s*\.\s*"(?<col>[^"]+)"\s+AS\s+(?:"(?<qAlias>[^"]+)"|(?<uAlias>\w+))/gi;
const ALIAS_DOT_COL_PATTERN = /\b(?<tbl>[a-z]\w*)\s*\.\s*"(?<col>[^"]+)"/gi;
const SERVICE_CALL_PATTERN = /\bservice\s*\([^()]*\)/gi;
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
const GENERIC_TABLE_PATTERNS = /combined|consolidated|all|master|summary/i;

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
      queriedAccessPointGroups: [],
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

export enum ExecutionErrorCategory {
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  SQL_FIXABLE = 'SQL_FIXABLE',
  ACCESS = 'ACCESS',
  NONE = 'NONE',
}

const EXECUTION_ERROR_RULES: ReadonlyArray<{
  category: ExecutionErrorCategory;
  patterns: readonly RegExp[];
}> = [
  {
    category: ExecutionErrorCategory.ACCESS,
    patterns: [
      /\binsufficient privileges\b/i,
      /\baccess denied\b/i,
      /\bpermission denied\b/i,
      /\bunauthorized\b/i,
      /\bentitlement\b/i,
    ],
  },
  {
    category: ExecutionErrorCategory.INFRASTRUCTURE,
    patterns: [/__lake_action/i, /__lake/i],
  },
  {
    category: ExecutionErrorCategory.SQL_FIXABLE,
    patterns: [
      /\binvalid identifier\b/i,
      /\bambiguous column\b/i,
      /\bdoes not exist\b/i,
      /\bsql compilation error\b/i,
      /\bnot found\b/i,
    ],
  },
];

export function categorizeExecutionError(
  errMsg: string,
  error?: Error,
): ExecutionErrorCategory {
  if (error instanceof LegendAIUnsupportedEngineShapeError) {
    return ExecutionErrorCategory.SQL_FIXABLE;
  }
  if (
    error instanceof LegendAIServiceError &&
    error.errorType === LegendAIErrorType.PERMISSION
  ) {
    return ExecutionErrorCategory.ACCESS;
  }
  for (const rule of EXECUTION_ERROR_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(errMsg))) {
      return rule.category;
    }
  }
  return ExecutionErrorCategory.NONE;
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
    if (asstMsg.error) {
      turn.resultSummary = `ERROR: ${asstMsg.error.slice(0, 200)}`;
    } else if (asstMsg.gridData) {
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
  if (asstMsg.error && !asstMsg.sql) {
    return {
      question: userText,
      sql: '(generation failed)',
      resultSummary: `ERROR: ${asstMsg.error.slice(0, 200)}`,
      intent: LegendAIQuestionIntent.DATA_QUERY,
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
  const result: string[] = [];
  for (const svc of services.slice(0, 3)) {
    const strCol = svc.columns.find(isStringColumn);
    const numCol = svc.columns.find(isNumericColumn);
    if (numCol && strCol) {
      result.push(
        `What are the top 10 ${strCol.name} values by ${numCol.name} in ${svc.title}?`,
      );
    } else if (strCol) {
      result.push(`Show the breakdown by ${strCol.name} in ${svc.title}`);
    } else {
      result.push(`Show 10 records from ${svc.title}`);
    }
  }
  return result;
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

function buildSnowflakeSqlError(
  rawError: string,
  services: TDSServiceSchema[],
): string {
  const lowerError = rawError.toLowerCase();
  const coreMatch =
    /SnowflakeSQLException:\s*(?<core>SQL compilation error[^"]*?)(?:\\n|\n|$)/i.exec(
      rawError,
    );
  const coreMsg = coreMatch?.groups?.core?.trim() ?? 'SQL compilation error';
  if (lowerError.includes('__lake_action') || lowerError.includes('__lake')) {
    return [
      `Lakehouse SQL execution failed: ${coreMsg}`,
      '\nThis is an internal engine error with this access point — it may not be fully supported yet.',
      '\nTry querying a different access point, or contact the data product team.',
    ].join('');
  }
  if (
    lowerError.includes('invalid identifier') ||
    lowerError.includes('does not exist')
  ) {
    const svcCols = services.map(
      (s) => `${s.title}: ${s.columns.map((c) => c.name).join(', ')}`,
    );
    return [
      `Lakehouse SQL execution failed: ${coreMsg}`,
      `\nAvailable columns:\n${svcCols.join('\n')}`,
      '\nTry rephrasing your question so the AI can pick the correct columns.',
    ].join('');
  }
  return `Lakehouse SQL execution failed: ${coreMsg}`;
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

  if (errLower.includes('rename(~')) {
    return [
      'Cross-access-point JOINs on columns with the same name are not yet supported by the execution engine.',
      '\nTry querying each access point separately, or ask a metadata question instead.',
    ].join('');
  }

  if (
    /can't find a match for function '\w+\(Timestamp/i.test(errStr) &&
    errLower.includes('string')
  ) {
    return [
      'Date comparison type mismatch: a Timestamp column was compared with a plain string literal.',
      '\nPlease rephrase your question so the AI can regenerate the query with the correct date format.',
    ].join('');
  }

  // Snowflake SQL compilation errors — extract the core message from the trace
  if (errLower.includes('snowflakesqlexception: sql compilation error')) {
    return buildSnowflakeSqlError(errStr, services);
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

const COVERAGE_STOPWORDS = new Set([
  'show',
  'give',
  'join',
  'combine',
  'merge',
  'columns',
  'column',
  'results',
  'result',
  'data',
  'services',
  'service',
  'access',
  'points',
  'point',
  'table',
  'tables',
  'query',
  'rows',
  'records',
  'values',
  'list',
  'display',
  'fetch',
  'retrieve',
  'return',
  'from',
  'with',
  'that',
  'this',
  'what',
  'which',
  'where',
  'have',
  'each',
  'both',
  'first',
  'last',
  'some',
  'available',
  'possible',
]);

function tokenizeQuestionForCoverage(question: string): string[] {
  return tokenizeText(question, {
    minLength: 4,
    stopwords: COVERAGE_STOPWORDS,
  });
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

function buildJoinDiagnosticNote(
  query: string,
  columns: string[],
  rows: unknown[],
): string {
  if (!/\bJOIN\b/i.test(query) || rows.length === 0 || columns.length < 2) {
    return '';
  }

  const allNullColumns: string[] = [];
  const someDataColumns: string[] = [];
  for (const col of columns) {
    const allNull = rows.every((row) => {
      if (isPlainObject(row)) {
        const val = row[col];
        return val === null || val === undefined;
      }
      return true;
    });
    if (allNull) {
      allNullColumns.push(col);
    } else {
      someDataColumns.push(col);
    }
  }

  if (
    allNullColumns.length > 0 &&
    someDataColumns.length > 0 &&
    allNullColumns.length >= 2
  ) {
    return (
      `Note: ${allNullColumns.length} columns (${allNullColumns.slice(0, 3).join(', ')}${allNullColumns.length > 3 ? ', ...' : ''}) ` +
      'returned entirely NULL values. This typically means the joined services do not share ' +
      'overlapping values for the join key. The services may track different records. ' +
      'Try querying each service separately to explore their data independently.'
    );
  }

  return '';
}

function buildDeterministicResultSummary(
  question: string,
  query: string,
  columns: string[],
  rows: unknown[],
): string {
  const selectedColumns = columns.length === 0 ? 'none' : columns.join(', ');
  const rowCount = rows.length;
  const previewRows = rows
    .slice(0, ANALYSIS_PREVIEW_ROW_LIMIT)
    .map((row, index) => {
      if (isPlainObject(row)) {
        const entries = Object.entries(row).slice(0, 4);
        const formattedEntries = entries.map(
          ([key, value]) => `${key}: ${formatPreviewValue(value)}`,
        );
        return `${index + 1}. ${formattedEntries.join(', ')}`;
      }
      return `${index + 1}. ${formatPreviewValue(row)}`;
    })
    .join('\n');

  const coverageNote = buildQuestionCoverageNote(question, columns);
  const joinDiagnostic = buildJoinDiagnosticNote(query, columns, rows);
  const parts = [
    `I retrieved ${rowCount} row${rowCount === 1 ? '' : 's'} for your question using this query.`,
    `Columns returned: ${selectedColumns}.`,
    `Sample rows:\n${previewRows || 'No sample rows available.'}`,
  ];
  if (joinDiagnostic) {
    parts.push(joinDiagnostic);
  }
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
  services?: TDSServiceSchema[],
  modelContextEnrichment?: string,
): Promise<void> {
  const { config, plugin, history, setMessages } = context;
  addThinkingStep(setMessages, 'Answering from product metadata...');
  const metadataPromptText = plugin.buildMetadataPrompt(
    question,
    metadata,
    history,
    services,
    modelContextEnrichment,
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
  modelContextEnrichment?: string,
): Promise<string | null> {
  const { plugin, config, history, setMessages } = context;
  addThinkingStep(setMessages, 'Building context from service schemas...');
  const prompt = plugin.buildGeneratorPrompt(
    question,
    services,
    coordinates,
    history,
    metadata,
    modelContextEnrichment,
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
  modelContextEnrichment?: string,
): Promise<string | null> {
  const { plugin, config, history, setMessages } = context;
  addThinkingStep(setMessages, 'Building context from access point schemas...');
  plugin.preWarmSchemaAnalysis(accessPoints, config);
  const prompt = plugin.buildAccessPointGeneratorPrompt(
    question,
    accessPoints,
    history,
    modelContextEnrichment,
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
      plugin.buildAccessPointJudgePrompt(
        sql,
        question,
        accessPoints,
        history,
        modelContextEnrichment,
      ),
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
    const rawResult = await executeSqlForServices(
      sql,
      services,
      dataProductCoordinates,
      plugin,
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

const HAS_PURE_AGGREGATION_PATTERN =
  /->groupBy\(|->distinct\(|->count\(\)|->sum\(\)|->average\(\)|->olapGroupBy\(/;

const HAS_PURE_TAKE_PATTERN = /->take\(\s*\d+\s*\)/;

const PURE_LIMIT_PATTERN = /->limit\(\s*(?<count>\d+)\s*\)/g;

export function ensurePureSafetyLimit(
  pureQuery: string,
  limit: number = DEFAULT_SAFETY_LIMIT,
): string {
  const normalized = pureQuery.replaceAll(
    PURE_LIMIT_PATTERN,
    (_match, n) => `->take(${n})`,
  );
  if (HAS_PURE_TAKE_PATTERN.test(normalized)) {
    return normalized;
  }
  if (HAS_PURE_AGGREGATION_PATTERN.test(normalized)) {
    return normalized;
  }
  return `${normalized.trimEnd()}->take(${limit})`;
}

export async function executePureQueryAndReport(
  pureQuery: string,
  pureExecutionContext: QueryExplicitExecutionContextInfo,
  dataProductCoordinates: LegendAIOrchestratorDataProductCoordinates,
  config: LegendAIConfig,
  plugin: LegendAI_LegendApplicationPlugin_Extension,
  setMessages: MessageSetter,
  startTime: number,
): Promise<LegendAISqlExecutionResultData | undefined> {
  const execStartTime = Date.now();
  const safeQuery = ensurePureSafetyLimit(pureQuery);
  try {
    addThinkingStep(setMessages, 'Executing Pure query...');
    const rawResult = await withTimeout(
      plugin.executePureQuery(
        safeQuery,
        pureExecutionContext,
        dataProductCoordinates,
        config,
      ),
      EXECUTION_TIMEOUT_MS,
    );
    if (!rawResult) {
      throw new Error(
        'Query execution timed out after 5 minutes. The dataset may be too large — try adding more filters or reducing the result set.',
      );
    }
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
    return undefined;
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

async function retryWithAlternateRoot(
  question: string,
  alternateRoot: string,
  resolvedEntities: LegendAIResolvedEntities,
  orchestratorOptions: Required<LegendAIOrchestratorOptionsParam>,
  metadata: LegendAIProductMetadata,
  context: LegendAIOperationContext,
  options: {
    startTime: number;
    modelContext?: LegendAIModelContext;
  },
): Promise<boolean> {
  const { startTime, modelContext } = options;
  const { dataProductCoordinates, pureExecutionContext } = orchestratorOptions;
  const { config, plugin, setMessages } = context;
  addThinkingStep(
    setMessages,
    `No results with ${extractElementNameFromPath(resolvedEntities.rootEntity)}, retrying with ${extractElementNameFromPath(alternateRoot)}...`,
  );
  try {
    const retryRelated = resolvedEntities.relatedEntities.filter(
      (e) => e !== alternateRoot,
    );
    const retryEnriched = modelContext
      ? buildEnrichedBusinessContext(
          question,
          alternateRoot,
          retryRelated,
          modelContext,
        )
      : undefined;
    const retryResponse = await withTimeout(
      plugin.generateQueryViaOrchestrator(
        {
          user_question: question,
          semantic_search_resolution_details: {
            data_product_coordinates: dataProductCoordinates,
            root_entity: alternateRoot,
            related_entities: retryRelated,
            ...(retryEnriched
              ? { enriched_business_context: retryEnriched }
              : {}),
          },
        },
        config,
      ),
      ORCHESTRATOR_GENERATION_TIMEOUT_MS,
    );
    if (!retryResponse) {
      addThinkingStep(setMessages, 'Retry query generation timed out');
      return false;
    }
    const retrySafeQuery = ensurePureSafetyLimit(retryResponse.legend_query);
    updateLastAssistant(setMessages, () => ({
      sql: retrySafeQuery,
      sqlGenTime: elapsedSeconds(startTime, 2),
      isExecuting: true,
    }));
    const retryResult = await executePureQueryAndReport(
      retrySafeQuery,
      pureExecutionContext,
      dataProductCoordinates,
      config,
      plugin,
      setMessages,
      startTime,
    );
    if (retryResult && retryResult.rows.length > 0) {
      await analyzeOrchestratorResults(
        question,
        retryResponse.legend_query,
        retryResult,
        metadata,
        context,
        startTime,
      );
      return true;
    }
    return false;
  } catch (retryError) {
    assertErrorThrown(retryError);
    addThinkingStep(
      setMessages,
      `Retry with alternate entity failed: ${retryError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );
    return false;
  }
}

async function handleEmptyOrchestratorResults(
  question: string,
  legendQuery: string,
  orchestratorOptions: Required<LegendAIOrchestratorOptionsParam>,
  metadata: LegendAIProductMetadata,
  resolvedEntities: LegendAIResolvedEntities,
  context: LegendAIOperationContext,
  options: {
    startTime: number;
    modelContext?: LegendAIModelContext;
  },
): Promise<void> {
  const { startTime, modelContext } = options;
  const { config, plugin, setMessages } = context;

  if (resolvedEntities.relatedEntities.length > 0) {
    const alternateRoot = modelContext
      ? findBestAlternateRoot(
          resolvedEntities.rootEntity,
          resolvedEntities.relatedEntities,
          modelContext,
        )
      : resolvedEntities.relatedEntities[0];
    if (alternateRoot) {
      const succeeded = await retryWithAlternateRoot(
        question,
        alternateRoot,
        resolvedEntities,
        orchestratorOptions,
        metadata,
        context,
        { startTime, ...(modelContext === undefined ? {} : { modelContext }) },
      );
      if (succeeded) {
        return;
      }
    }
  }

  addThinkingStep(
    setMessages,
    'No results returned \u2014 building contextual guidance...',
  );
  updateLastAssistant(setMessages, () => ({ isProcessing: true }));
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

async function resolveOrchestrationEntities(
  question: string,
  dataProductCoordinates: LegendAIOrchestratorDataProductCoordinates,
  context: LegendAIOperationContext,
  pureExecutionContext?: QueryExplicitExecutionContextInfo,
  preResolvedEntities?: LegendAIResolvedEntities,
  modelContext?: LegendAIModelContext,
): Promise<LegendAIResolvedEntities> {
  const { config, plugin, setMessages } = context;
  if (preResolvedEntities) {
    addThinkingStep(
      setMessages,
      `Using pre-resolved root entity: ${extractElementNameFromPath(preResolvedEntities.rootEntity)}`,
    );
    return preResolvedEntities;
  }
  addThinkingStep(setMessages, 'Resolving entities for your query...');
  const resolvedEntities = await plugin.resolveEntitiesForQuery(
    question,
    dataProductCoordinates,
    config,
    pureExecutionContext,
    modelContext,
  );
  addThinkingStep(
    setMessages,
    `Found root entity: ${extractElementNameFromPath(resolvedEntities.rootEntity)}`,
  );
  return resolvedEntities;
}

function extractUserErrorFromMessage(errorMessage: string): string {
  const marker = 'with error:';
  const idx = errorMessage.toLowerCase().indexOf(marker);
  if (idx !== -1) {
    const after = errorMessage.slice(idx + marker.length).trimStart();
    const newlineIdx = after.indexOf('\n');
    const reason = (
      newlineIdx === -1 ? after : after.slice(0, newlineIdx)
    ).trim();
    if (reason.length > 0) {
      return reason.slice(0, MAX_ERROR_MESSAGE_LENGTH);
    }
  }
  return errorMessage.slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

async function handleOrchestratorError(
  error: Error,
  startTime: number,
  question: string,
  metadata: LegendAIProductMetadata,
  context: LegendAIOperationContext,
): Promise<void> {
  const { config, plugin, setMessages } = context;
  const orchErrorType = classifyError(error);
  const genTime = elapsedSeconds(startTime, 2);
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
        sqlGenTime: genTime,
        error: extractUserErrorFromMessage(error.message),
        errorType: LegendAIErrorType.GENERATION,
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
  finishWithThinkingError(setMessages, error.message, startTime, orchErrorType);
}

export async function processQuestionViaOrchestrator(
  question: string,
  dataProductCoordinates: LegendAIOrchestratorDataProductCoordinates,
  metadata: LegendAIProductMetadata,
  context: LegendAIOperationContext,
  pureExecutionContext?: QueryExplicitExecutionContextInfo,
  preResolvedEntities?: LegendAIResolvedEntities,
  modelContext?: LegendAIModelContext,
): Promise<void> {
  const { config, plugin, setMessages } = context;
  const startTime = Date.now();

  try {
    const resolvedEntities = await resolveOrchestrationEntities(
      question,
      dataProductCoordinates,
      context,
      pureExecutionContext,
      preResolvedEntities,
      modelContext,
    );

    if (resolvedEntities.relatedEntities.length > 0) {
      addThinkingStep(
        setMessages,
        `Found ${resolvedEntities.relatedEntities.length} related entities`,
      );
    }

    addThinkingStep(setMessages, 'Generating Legend query via orchestrator...');
    const enrichedContext = modelContext
      ? buildEnrichedBusinessContext(
          question,
          resolvedEntities.rootEntity,
          resolvedEntities.relatedEntities,
          modelContext,
        )
      : undefined;
    const orchestratorResponse = await withTimeout(
      plugin.generateQueryViaOrchestrator(
        {
          user_question: question,
          semantic_search_resolution_details: {
            data_product_coordinates: dataProductCoordinates,
            root_entity: resolvedEntities.rootEntity,
            related_entities: resolvedEntities.relatedEntities,
            ...(enrichedContext
              ? { enriched_business_context: enrichedContext }
              : {}),
          },
        },
        config,
      ),
      ORCHESTRATOR_GENERATION_TIMEOUT_MS,
    );

    if (!orchestratorResponse) {
      throw new Error(
        'Query generation timed out. The orchestrator took too long to respond. Try a simpler question.',
      );
    }

    const safeQuery = ensurePureSafetyLimit(orchestratorResponse.legend_query);
    completeThinkingSteps(setMessages);
    updateLastAssistant(setMessages, () => ({
      sql: safeQuery,
      sqlGenTime: elapsedSeconds(startTime, 2),
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
      safeQuery,
      pureExecutionContext,
      dataProductCoordinates,
      config,
      plugin,
      setMessages,
      startTime,
    );

    if (!execResult) {
      return;
    }

    try {
      if (execResult.rows.length > 0) {
        await analyzeOrchestratorResults(
          question,
          safeQuery,
          execResult,
          metadata,
          context,
          startTime,
        );
      } else {
        await handleEmptyOrchestratorResults(
          question,
          safeQuery,
          { dataProductCoordinates, pureExecutionContext },
          metadata,
          resolvedEntities,
          context,
          {
            startTime,
            ...(modelContext === undefined ? {} : { modelContext }),
          },
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
    await handleOrchestratorError(
      error,
      startTime,
      question,
      metadata,
      context,
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
  for (const m of beforeOrderBy.matchAll(SELECT_ALIAS_PATTERN)) {
    const tableAlias = (m.groups?.tbl ?? '').toLowerCase();
    const colName = (m.groups?.col ?? '').toLowerCase();
    const asAlias = m.groups?.qAlias ?? m.groups?.uAlias ?? '';
    selectAliases.set(`${tableAlias}.${colName}`, asAlias);
  }

  if (selectAliases.size === 0) {
    return sql;
  }

  // Build a lookup of the original alias.col text → its SELECT alias replacement.
  // matchAll exposes typed `.groups`, so no cast is needed.
  const replacements = new Map<string, string>();
  for (const m of afterOrderBy.matchAll(ALIAS_DOT_COL_PATTERN)) {
    const tbl = (m.groups?.tbl ?? '').toLowerCase();
    const col = (m.groups?.col ?? '').toLowerCase();
    const alias = selectAliases.get(`${tbl}.${col}`);
    if (alias) {
      replacements.set(m[0], `"${alias}"`);
    }
  }

  if (replacements.size === 0) {
    return sql;
  }

  const rewritten = afterOrderBy.replaceAll(
    ALIAS_DOT_COL_PATTERN,
    (match) => replacements.get(match) ?? match,
  );

  if (rewritten === afterOrderBy) {
    return sql;
  }
  return `${beforeOrderBy}ORDER BY ${rewritten}`;
}

export function sanitizeJoinSameKeyColumns(
  sql: string,
  services?: TDSServiceSchema[],
): string {
  if (!JOIN_PATTERN.test(sql)) {
    return sql;
  }

  const joinRegex =
    /\bJOIN\s{1,5}p\(\s{0,5}'(?<pId>[^']{1,200})'\s{0,5}\)\s{1,5}AS\s{1,5}(?<rAlias>[a-z]\w{0,63})\s{1,5}ON\s{1,5}(?<onClause>[^\n]{1,500})/gi;

  let result = sql;
  let match: RegExpExecArray | null;

  while ((match = joinRegex.exec(sql)) !== null) {
    const pId = match.groups?.pId ?? '';
    const rightAlias = match.groups?.rAlias ?? '';
    const onClause = (match.groups?.onClause ?? '').slice(0, 500);

    const sameKeyMatch =
      /(?<lAlias>[a-z]\w{0,63}) {0,5}\. {0,5}"(?<lCol>[^"]{1,200})" {0,5}= {0,5}(?<rAl>[a-z]\w{0,63}) {0,5}\. {0,5}"(?<rCol>[^"]{1,200})"/i.exec(
        onClause,
      );
    if (!sameKeyMatch) {
      continue;
    }

    const leftCol = sameKeyMatch.groups?.lCol ?? '';
    const rightCol = sameKeyMatch.groups?.rCol ?? '';
    const matchedRightAlias = sameKeyMatch.groups?.rAl ?? '';

    if (
      leftCol.toLowerCase() !== rightCol.toLowerCase() ||
      matchedRightAlias.toLowerCase() !== rightAlias.toLowerCase()
    ) {
      continue;
    }

    const renamedKey = `${rightAlias}_${rightCol}`;
    const columnList = buildSubqueryColumnList(
      pId,
      rightCol,
      renamedKey,
      services,
    );
    const originalFragment = `p('${pId}') AS ${rightAlias}`;
    const subqueryFragment = `(SELECT ${columnList} FROM p('${pId}')) AS ${rightAlias}`;

    const oldOnRef = `${rightAlias}."${rightCol}"`;
    const newOnRef = `${rightAlias}."${renamedKey}"`;

    result = result.replace(originalFragment, subqueryFragment);
    result = result.replaceAll(oldOnRef, newOnRef);
  }

  return result;
}

function buildSubqueryColumnList(
  pId: string,
  originalKey: string,
  renamedKey: string,
  services?: TDSServiceSchema[],
): string {
  const svc = services?.find(
    (s) =>
      s.dataProductPath &&
      s.pattern &&
      pId === `${s.dataProductPath}.${s.pattern.replace(/^\//, '')}`,
  );
  if (!svc || svc.columns.length === 0) {
    return `"${originalKey}" AS "${renamedKey}", *`;
  }
  return svc.columns
    .map((c) =>
      c.name.toLowerCase() === originalKey.toLowerCase()
        ? `"${c.name}" AS "${renamedKey}"`
        : `"${c.name}"`,
    )
    .join(', ');
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

  return sql.replaceAll(SERVICE_CALL_PATTERN, (match) => {
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

const NESTED_P_IN_CLAUSE = /\bIN\s*\(\s*SELECT\b[^)]*\bFROM\s+p\s*\(/i;
const NESTED_P_CROSS_JOIN =
  /\bCROSS\s+JOIN\s*\(\s*SELECT\b[^)]*\bFROM\s+p\s*\(/i;
const NESTED_P_SCALAR =
  /\(\s*SELECT\s+(?:COUNT|SUM|AVG|MIN|MAX)\s*\([^)]*\)\s+(?:AS\s+\w+\s+)?FROM\s+p\s*\(/i;

export function hasNestedPCalls(sql: string): boolean {
  return (
    NESTED_P_IN_CLAUSE.test(sql) ||
    NESTED_P_CROSS_JOIN.test(sql) ||
    NESTED_P_SCALAR.test(sql)
  );
}

const NESTED_AGGREGATE_PATTERN =
  /\b(?:SUM|AVG|MIN|MAX|COUNT)\s*\(\s*(?:SUM|AVG|MIN|MAX|COUNT)\s*\(/i;
const OVER_CLAUSE_PATTERN = /\bOVER\s*\(/i;

const AGGREGATE_IN_WINDOW_ARGS_PATTERN =
  /\bOVER\s*\((?:[^()]|\([^()]*\)){0,300}\b(?:SUM|AVG|MIN|MAX|COUNT)\s*\(/i;

const NON_WINDOW_SCALAR_FUNCTIONS: ReadonlySet<string> = new Set([
  'ROUND',
  'CAST',
  'COALESCE',
  'CEIL',
  'CEILING',
  'FLOOR',
  'ABS',
  'CONCAT',
  'NULLIF',
  'IFNULL',
  'GREATEST',
  'LEAST',
  'TRUNC',
  'TRUNCATE',
  'MOD',
  'POWER',
  'SQRT',
  'LN',
  'LOG',
  'EXP',
  'SUBSTR',
  'SUBSTRING',
  'TO_CHAR',
  'TO_NUMBER',
  'TO_DATE',
]);
const FUNCTION_CALL_WITH_OVER_PATTERN =
  /\b(?<fn>[A-Z_]{1,32})\s*\((?:[^()]|\([^()]*\)){0,200}\bOVER\s*\(/gi;

function hasWindowInsideNonWindowFunctionCall(sql: string): boolean {
  FUNCTION_CALL_WITH_OVER_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FUNCTION_CALL_WITH_OVER_PATTERN.exec(sql)) !== null) {
    const fn = match.groups?.fn?.toUpperCase();
    if (fn && NON_WINDOW_SCALAR_FUNCTIONS.has(fn)) {
      return true;
    }
  }
  return false;
}

const LATERAL_SUBQUERY_PATTERN =
  /\b(?:CROSS|INNER|LEFT|RIGHT)?\s*JOIN\s+LATERAL\b|\bLATERAL\s*\(/i;

export interface UnsupportedEnginePattern {
  kind:
    | 'NESTED_AGGREGATE_IN_WINDOW'
    | 'AGGREGATE_IN_WINDOW_ARGS'
    | 'WINDOW_INSIDE_FUNCTION_CALL'
    | 'LATERAL_SUBQUERY';
  hint: string;
}

export function detectUnsupportedEnginePattern(
  sql: string,
): UnsupportedEnginePattern | undefined {
  if (NESTED_AGGREGATE_PATTERN.test(sql) && OVER_CLAUSE_PATTERN.test(sql)) {
    return {
      kind: 'NESTED_AGGREGATE_IN_WINDOW',
      hint: "The engine's SQL→Pure translator cannot combine an aggregate function with a window function in the same SELECT (e.g. SUM(COUNT(*)) OVER ()). Move the aggregation into a CTE first, then apply the window over the CTE.",
    };
  }
  if (AGGREGATE_IN_WINDOW_ARGS_PATTERN.test(sql)) {
    return {
      kind: 'AGGREGATE_IN_WINDOW_ARGS',
      hint: "The engine's SQL→Pure translator cannot evaluate an aggregate function inside an OVER clause's PARTITION BY or ORDER BY at the same level as GROUP BY (e.g. ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC)). Materialize the aggregate into a CTE column first, then reference that column from the window — for example: SELECT col, cnt, ROW_NUMBER() OVER (ORDER BY cnt DESC) AS rn FROM (SELECT col, COUNT(*) AS cnt FROM p('…') GROUP BY col) agg.",
    };
  }
  if (hasWindowInsideNonWindowFunctionCall(sql)) {
    return {
      kind: 'WINDOW_INSIDE_FUNCTION_CALL',
      hint: "The engine's SQL→Pure translator cannot evaluate a window function inside another function call (e.g. ROUND(SUM(x) OVER (), 2)). Materialize the window expression into its own column in a subquery or CTE, then apply the wrapping function in the outer SELECT — for example: SELECT col, ROUND(cnt * 100.0 / total, 2) FROM (SELECT col, cnt, SUM(cnt) OVER () AS total FROM (SELECT col, COUNT(*) AS cnt FROM p('…') GROUP BY col) agg) windowed.",
    };
  }
  if (LATERAL_SUBQUERY_PATTERN.test(sql)) {
    return {
      kind: 'LATERAL_SUBQUERY',
      hint: "The engine's SQL parser does not support LATERAL subqueries (CROSS JOIN LATERAL (...)). Rewrite using ROW_NUMBER() OVER (PARTITION BY ...) in a CTE and filter on the rank, or use a correlated subquery.",
    };
  }
  return undefined;
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

function prepareSafeSql(sql: string, services: TDSServiceSchema[]): string {
  const safeSql = ensureSafeLimit(
    ensureDateParameters(
      sanitizeLiteralColumns(
        sanitizeJoinSameKeyColumns(sanitizeJoinOrderBy(sql), services),
      ),
      services,
    ),
  );
  const unsupported = detectUnsupportedEnginePattern(safeSql);
  if (unsupported) {
    throw new LegendAIUnsupportedEngineShapeError(unsupported.hint);
  }
  return safeSql;
}

/**
 * The single execution chokepoint for SQL in this module. Every code
 * path that needs to run SQL — primary orchestrator, retry-with-fix,
 * exported `executeSqlAndReport`, internal helpers — calls through
 * here. No other code in this file may call `plugin.executeLakehouseSql`
 * or `plugin.executeSql` directly.
 */
async function executeSqlForServices(
  sql: string,
  services: TDSServiceSchema[],
  dataProductCoordinates:
    | LegendAIOrchestratorDataProductCoordinates
    | undefined,
  plugin: LegendAI_LegendApplicationPlugin_Extension,
  config: LegendAIConfig,
): Promise<LegendAISqlExecutionResultData> {
  const safeSql = prepareSafeSql(sql, services);
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

export function supplementMissingCoverage(
  question: string,
  selected: TDSServiceSchema[],
  allServices: TDSServiceSchema[],
  maxTotal: number = 4,
): TDSServiceSchema[] {
  if (selected.length >= maxTotal || allServices.length <= selected.length) {
    return selected;
  }
  const questionTokens = tokenizeText(question);
  if (questionTokens.length === 0) {
    return selected;
  }

  const coveredTokens = new Set<string>();
  for (const svc of selected) {
    for (const col of svc.columns) {
      for (const token of splitIdentifierTokens(col.name)) {
        coveredTokens.add(token);
      }
      coveredTokens.add(col.name.toLowerCase());
    }
    for (const token of splitIdentifierTokens(svc.title)) {
      coveredTokens.add(token);
    }
  }

  const coveredArray = Array.from(coveredTokens);
  const uncovered = questionTokens.filter(
    (t) =>
      !coveredTokens.has(t) &&
      !(t.length >= 4 && coveredArray.some((ct) => isFuzzyMatch(t, ct))),
  );
  if (uncovered.length === 0) {
    return selected;
  }

  const selectedSet = new Set(selected.map((s) => s.pattern));
  const supplementCandidates = allServices
    .filter((svc) => !selectedSet.has(svc.pattern))
    .map((svc) => {
      const svcTokens = new Set<string>();
      for (const col of svc.columns) {
        svcTokens.add(col.name.toLowerCase());
        for (const token of splitIdentifierTokens(col.name)) {
          svcTokens.add(token);
        }
      }
      for (const token of splitIdentifierTokens(svc.title)) {
        svcTokens.add(token);
      }
      const coverCount = uncovered.filter((t) => svcTokens.has(t)).length;
      const isGeneric = GENERIC_TABLE_PATTERNS.test(svc.title) ? 1 : 0;
      return { svc, coverCount, isGeneric };
    })
    .filter((c) => c.coverCount > 0)
    .sort((a, b) => b.coverCount - a.coverCount || a.isGeneric - b.isGeneric);

  const result = [...selected];
  for (const candidate of supplementCandidates) {
    if (result.length >= maxTotal) {
      break;
    }
    result.push(candidate.svc);
  }
  return result;
}

// ─── Question Normalization ──────────────────────────────────────────────────

/** Delegates to the plugin's LLM to fix natural-language typos in the user's question before AP selection; falls back to the original on failure. */
export async function normalizeQuestion(
  question: string,
  plugin: LegendAI_LegendApplicationPlugin_Extension,
  config: LegendAIConfig,
): Promise<string> {
  try {
    return await plugin.normalizeQuestion(question, config);
  } catch (error) {
    assertErrorThrown(error);
    return question;
  }
}

// ─── Multi-Turn AP Bias ──────────────────────────────────────────────────────

/**
 * Extracts AP patterns that were successfully used in previous conversation
 * turns. When the user asks a follow-up question, these APs should be
 * preferred since they're likely still relevant.
 */
function extractPreviousTurnAPPatterns(
  history: LegendAIConversationTurn[],
): Set<string> {
  const patterns = new Set<string>();
  for (const turn of history) {
    const pCallPattern = /p\(\s*'(?<pId>[^']+)'\s*\)/g;
    let pCall: RegExpExecArray | null;
    while ((pCall = pCallPattern.exec(turn.sql)) !== null) {
      const pattern = pCall.groups?.pId;
      if (pattern) {
        const lastDot = pattern.lastIndexOf('.');
        if (lastDot >= 0) {
          patterns.add(pattern.slice(lastDot + 1).toLowerCase());
        }
        patterns.add(pattern.toLowerCase());
      }
    }
  }
  return patterns;
}

/**
 * Applies a scoring boost to services whose patterns appeared in previous
 * conversation turns, biasing the pre-filter toward continuity when the
 * user asks follow-up questions about the same data.
 */
export function applyMultiTurnBias(
  services: TDSServiceSchema[],
  history: LegendAIConversationTurn[],
): TDSServiceSchema[] {
  if (history.length === 0) {
    return services;
  }
  const previousAPs = extractPreviousTurnAPPatterns(history);
  if (previousAPs.size === 0) {
    return services;
  }

  // Sort so that previously-used APs come first, preserving relative order
  const biased = [...services].sort((a, b) => {
    const aUsed =
      previousAPs.has(a.pattern.replace(/^\//, '').toLowerCase()) ||
      previousAPs.has(a.title.toLowerCase())
        ? 1
        : 0;
    const bUsed =
      previousAPs.has(b.pattern.replace(/^\//, '').toLowerCase()) ||
      previousAPs.has(b.title.toLowerCase())
        ? 1
        : 0;
    return bUsed - aUsed;
  });
  return biased;
}

async function selectBestServices(
  question: string,
  services: TDSServiceSchema[],
  context: LegendAIOperationContext,
): Promise<TDSServiceSchema[]> {
  const { plugin, config, setMessages, history } = context;
  if (services.length <= 1) {
    return services;
  }

  // ── Step 0: Normalize the question (expand abbreviations, fix typos) ──
  addThinkingStep(setMessages, 'Normalizing question...');
  const normalizedQuestion = await normalizeQuestion(question, plugin, config);
  if (normalizedQuestion !== question) {
    addThinkingStep(setMessages, `Normalized: "${normalizedQuestion}"`);
  }

  // ── Step 0b: Apply multi-turn bias if this is a follow-up ──
  let inputServices = services;
  if (history.length > 0) {
    inputServices = applyMultiTurnBias(services, history);
  }

  let candidates = inputServices;
  if (inputServices.length > MAX_SERVICES_FOR_LLM_SELECTION) {
    candidates = preFilterServicesByRelevance(
      normalizedQuestion,
      inputServices,
      MAX_SERVICES_FOR_LLM_SELECTION,
    );
    const topNames = candidates
      .slice(0, 5)
      .map((s) => `${s.title} (${s.columns.length} cols)`)
      .join(', ');
    addThinkingStep(
      setMessages,
      `Pre-filtered ${services.length} services to ${candidates.length} candidates. Top: ${topNames}`,
    );
  }

  try {
    addThinkingStep(setMessages, 'Selecting best service for your query...');
    const selected = await plugin.selectRelevantServices(
      normalizedQuestion,
      candidates,
      config,
    );
    const selectedNames = selected.map((s) => s.title).join(', ');
    addThinkingStep(setMessages, `LLM selected: ${selectedNames}`);
    const validated = supplementMissingCoverage(
      normalizedQuestion,
      selected,
      candidates,
    );
    if (validated.length > selected.length) {
      const supplemented = validated
        .slice(selected.length)
        .map((s) => s.title)
        .join(', ');
      addThinkingStep(
        setMessages,
        `Supplemented with ${supplemented} for column coverage`,
      );
    }
    return validated;
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

async function resolveNestedPCalls(
  sql: string,
  question: string,
  selectedAPs: TDSServiceSchema[],
  context: LegendAIOperationContext,
  modelContextEnrichment?: string,
): Promise<string> {
  if (!hasNestedPCalls(sql)) {
    return sql;
  }
  const { plugin, config, setMessages } = context;
  addThinkingStep(setMessages, 'Detected nested p() call — rewriting query...');
  const fixPrompt = plugin.buildAccessPointErrorCorrectionPrompt(
    sql,
    question,
    'The SQL contains p() inside a subquery (IN clause, CROSS JOIN, or scalar subquery). p() can ONLY appear directly after FROM or JOIN.',
    selectedAPs,
    context.history,
    modelContextEnrichment,
  );
  try {
    const fixResponse = await plugin.callLLM(fixPrompt, config);
    const fixResult = plugin.extractJudgeResult(fixResponse);
    const corrected = fixResult.correctedSql;
    if (corrected && !hasNestedPCalls(corrected)) {
      return corrected;
    }
  } catch (fixError) {
    assertErrorThrown(fixError);
    addThinkingStep(
      setMessages,
      `Could not rewrite query: ${fixError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}. Proceeding with original SQL.`,
    );
  }
  return sql;
}

interface AccessPointSqlFixOptions {
  failedSql: string;
  question: string;
  errMsg: string;
  selectedAPs: TDSServiceSchema[];
  dataProductCoordinates: LegendAIOrchestratorDataProductCoordinates;
  modelContextEnrichment?: string;
  startTime: number;
}

async function retryAccessPointSqlFix(
  options: AccessPointSqlFixOptions,
  context: LegendAIOperationContext,
  metadata: LegendAIProductMetadata,
): Promise<boolean> {
  const {
    failedSql,
    question,
    errMsg,
    selectedAPs,
    dataProductCoordinates,
    modelContextEnrichment,
    startTime,
  } = options;
  const { plugin, config, setMessages } = context;
  addThinkingStep(
    setMessages,
    'SQL error detected — asking LLM to fix the query on the same access points...',
  );
  const fixPrompt = plugin.buildAccessPointErrorCorrectionPrompt(
    failedSql,
    question,
    errMsg.slice(0, MAX_ERROR_MESSAGE_LENGTH),
    selectedAPs,
    context.history,
    modelContextEnrichment,
  );
  try {
    const fixResponse = await plugin.callLLM(fixPrompt, config);
    const fixResult = plugin.extractJudgeResult(fixResponse);
    const correctedSql = fixResult.correctedSql;
    if (correctedSql) {
      addThinkingStep(setMessages, 'Re-executing corrected SQL...');
      updateLastAssistant(setMessages, () => ({
        sql: correctedSql,
        isExecuting: true,
      }));
      const retryResult = await executeSqlForServices(
        correctedSql,
        selectedAPs,
        dataProductCoordinates,
        plugin,
        config,
      );
      await reportQueryResults(
        {
          currentSql: correctedSql,
          sqlResult: retryResult,
          question,
          services: selectedAPs,
        },
        metadata,
        context,
        startTime,
        false,
      );
      return true;
    }
  } catch (retryError) {
    assertErrorThrown(retryError);
    addThinkingStep(
      setMessages,
      `SQL correction also failed: ${retryError.message.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );
  }
  return false;
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
  modelContextEnrichment?: string,
): Promise<void> {
  const { config, plugin, setMessages } = context;

  addThinkingStep(setMessages, 'Found relevant access points to query');

  const selectedAPs = await selectBestServices(question, accessPoints, context);

  const judgedSql = await generateAndJudgeAccessPointSql(
    question,
    selectedAPs,
    context,
    startTime,
    modelContextEnrichment,
  );

  if (!judgedSql) {
    addThinkingStep(
      setMessages,
      'SQL generation could not produce a valid query.',
    );
    handleSqlGenerationFailure(
      setMessages,
      startTime,
      false,
      SQL_GENERATION_FAILURE_WITH_ORCHESTRATOR,
      SQL_GENERATION_FAILURE_NO_ORCHESTRATOR,
      LegendAIErrorType.GENERATION,
      buildFallbackSuggestions(selectedAPs),
    );
    return;
  }

  const sqlGenTimeValue = elapsedSeconds(startTime, 2);
  completeThinkingSteps(setMessages);

  const finalSql = await resolveNestedPCalls(
    judgedSql,
    question,
    selectedAPs,
    context,
    modelContextEnrichment,
  );

  updateLastAssistant(setMessages, () => ({
    sql: finalSql,
    sqlGenTime: sqlGenTimeValue,
    isExecuting: true,
  }));

  const execStartTime = Date.now();
  try {
    const rawResult = await executeSqlForServices(
      finalSql,
      selectedAPs,
      dataProductCoordinates,
      plugin,
      config,
    );

    await reportQueryResults(
      {
        currentSql: finalSql,
        sqlResult: rawResult,
        question,
        services: selectedAPs,
      },
      metadata,
      context,
      startTime,
      false,
    );
  } catch (executeError) {
    assertErrorThrown(executeError);
    const execErrorType = classifyError(executeError);
    const errMsg = executeError.message;
    const errorCategory = categorizeExecutionError(errMsg, executeError);

    addThinkingStep(
      setMessages,
      `Execution failed: ${errMsg.slice(0, MAX_THINKING_ERROR_PREVIEW_LENGTH)}`,
    );

    if (errorCategory === ExecutionErrorCategory.SQL_FIXABLE) {
      const retried = await retryAccessPointSqlFix(
        {
          failedSql: finalSql,
          question,
          errMsg,
          selectedAPs,
          dataProductCoordinates,
          ...(modelContextEnrichment === undefined
            ? {}
            : { modelContextEnrichment }),
          startTime,
        },
        context,
        metadata,
      );
      if (retried) {
        return;
      }
    }

    finishWithThinkingError(
      setMessages,
      buildExecutionErrorMessage(errMsg, selectedAPs),
      startTime,
      execErrorType === LegendAIErrorType.GENERAL
        ? LegendAIErrorType.EXECUTION
        : execErrorType,
    );
    const queriedGroups = [
      ...new Set(
        selectedAPs
          .map((ap) => ap.accessPointGroupTitle)
          .filter((t): t is string => t !== undefined),
      ),
    ];
    updateLastAssistant(setMessages, () => ({
      execTime: elapsedSeconds(execStartTime, 2),
      isExecuting: false,
      suggestedQueries: buildFallbackSuggestions(selectedAPs),
      queriedAccessPointGroups: queriedGroups,
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
  modelContextEnrichment?: string,
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
    modelContextEnrichment,
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
  modelContextEnrichment?: string,
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
      modelContextEnrichment,
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
      modelContextEnrichment,
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
  modelContext?: LegendAIModelContext,
): Promise<void> {
  const { config, plugin, setMessages } = context;
  const startTime = Date.now();
  const modelContextEnrichment = modelContext
    ? buildModelContextEnrichmentText(modelContext, services)
    : undefined;

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
        services,
        modelContextEnrichment,
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
        services,
        modelContextEnrichment,
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
        modelContextEnrichment,
      );
    } catch (sqlError) {
      assertErrorThrown(sqlError);
      addThinkingStep(
        setMessages,
        'Query failed, answering from product metadata...',
      );
      await handleMetadataQuestion(
        question,
        metadata,
        context,
        startTime,
        true,
        services,
        modelContextEnrichment,
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
  modelContextEnrichment?: string,
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
      modelContextEnrichment,
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
  modelContext?: LegendAIModelContext,
): Promise<void> {
  const { config, setMessages } = context;
  const dataProductCoordinates = orchestratorOptions?.dataProductCoordinates;
  const modelContextEnrichment = modelContext
    ? buildModelContextEnrichmentText(modelContext, services)
    : undefined;

  if (intent === LegendAIQuestionIntent.METADATA) {
    const startTime = Date.now();
    try {
      await handleMetadataQuestion(
        question,
        metadata,
        context,
        startTime,
        services.length > 0,
        services,
        modelContextEnrichment,
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
        modelContextEnrichment,
      );
      return;
    }
    const startTime = Date.now();
    await handleMetadataQuestion(
      question,
      metadata,
      context,
      startTime,
      false,
      services,
      modelContextEnrichment,
    );
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
    modelContextEnrichment,
  );
}
