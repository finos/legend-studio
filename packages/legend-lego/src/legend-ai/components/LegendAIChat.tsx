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

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  SendIcon,
  LoadingIcon,
  SparkleStarsIcon,
  CodeIcon,
  TableIcon,
  CopyIcon,
  RefreshIcon,
  MarkdownTextViewer,
} from '@finos/legend-art';
import { noop } from '@finos/legend-shared';
import { PRIMITIVE_TYPE } from '@finos/legend-graph';
import {
  type LegendAIChatProps,
  type LegendAIAssistantMessage,
  type LegendAIProductMetadata,
  type TDSServiceSchema,
  type TDSColumnSchema,
  LegendAIThinkingStepStatus,
  LegendAIMessageRole,
  LegendAIQuestionIntent,
} from '../LegendAITypes.js';
import { useLegendAIChatState } from '../stores/LegendAIChatState.js';
import { LegendAIResultGrid } from './LegendAIResultGrid.js';

export const LEGEND_AI_ANCHOR_ID = 'legend-ai-anchor';

const COPY_FEEDBACK_DURATION_MS = 2000;
const MAX_SUGGESTED_QUERIES = 8;

const STRING_TYPES = new Set<string>([PRIMITIVE_TYPE.STRING]);

const NUMERIC_TYPES = new Set<string>([
  PRIMITIVE_TYPE.NUMBER,
  PRIMITIVE_TYPE.INTEGER,
  PRIMITIVE_TYPE.FLOAT,
  PRIMITIVE_TYPE.DECIMAL,
]);

const DATE_TYPES = new Set<string>([
  PRIMITIVE_TYPE.DATE,
  PRIMITIVE_TYPE.STRICTDATE,
  PRIMITIVE_TYPE.DATETIME,
]);

export function isStringColumn(c: TDSColumnSchema): boolean {
  return STRING_TYPES.has(c.type ?? '') && !c.name.toLowerCase().includes('id');
}

export function isNumericColumn(c: TDSColumnSchema): boolean {
  return NUMERIC_TYPES.has(c.type ?? '');
}

export function isDateColumn(c: TDSColumnSchema): boolean {
  return (
    DATE_TYPES.has(c.type ?? '') ||
    c.name.toLowerCase().includes('date') ||
    c.name.toLowerCase().includes('time')
  );
}

function buildDataInsightSuggestions(
  primary: TDSServiceSchema,
  stringCol: TDSColumnSchema | undefined,
  numericCol: TDSColumnSchema | undefined,
  dateCol: TDSColumnSchema | undefined,
): string[] {
  const result: string[] = [];
  if (stringCol && numericCol) {
    result.push(
      `What are the top ${stringCol.name} values by total ${numericCol.name} in ${primary.title}?`,
    );
  } else if (stringCol) {
    result.push(
      `What are the distinct ${stringCol.name} values in ${primary.title}?`,
    );
  }

  if (dateCol && stringCol) {
    result.push(
      `Show ${primary.title} records from the last month grouped by ${stringCol.name}`,
    );
  }

  if (numericCol && !stringCol) {
    result.push(`What is the total ${numericCol.name} in ${primary.title}?`);
  }
  return result;
}

function buildMultiServiceSuggestion(services: TDSServiceSchema[]): string[] {
  if (services.length < 2) {
    return [];
  }
  const svcA = services[0];
  const svcB = services[1];
  if (!svcA || !svcB) {
    return [];
  }

  const result: string[] = [`Show the latest 10 records from ${svcB.title}`];

  const colNamesA = new Set(svcA.columns.map((c) => c.name.toLowerCase()));
  const sharedCol = svcB.columns.find((c) =>
    colNamesA.has(c.name.toLowerCase()),
  );
  if (sharedCol) {
    result.push(
      `Compare ${svcA.title} and ${svcB.title} by ${sharedCol.name}, show 10 rows`,
    );
  }

  return result;
}

export function buildSuggestedQueries(
  services: TDSServiceSchema[],
  metadata: LegendAIProductMetadata,
): string[] {
  const suggestions: string[] = [
    `What data does ${metadata.name} offer and how can I use it?`,
  ];

  if (services.length === 0) {
    return [
      ...suggestions,
      'What access points are available?',
      'Describe the data model and key entities',
    ];
  }

  const primary = services[0];
  if (!primary) {
    return [
      ...suggestions,
      'What access points are available and what columns do they have?',
    ];
  }

  const stringCol = primary.columns.find(isStringColumn);
  const numericCol = primary.columns.find(isNumericColumn);
  const dateCol = primary.columns.find(isDateColumn);

  const multiSvcSuggestions = buildMultiServiceSuggestion(services);

  const primaryRecordsSuggestion = dateCol
    ? `Show the 10 most recent records from ${primary.title} by ${dateCol.name}`
    : `Show 10 records from ${primary.title}`;

  return [
    ...suggestions,
    primaryRecordsSuggestion,
    ...buildDataInsightSuggestions(primary, stringCol, numericCol, dateCol),
    ...multiSvcSuggestions,
  ].slice(0, MAX_SUGGESTED_QUERIES);
}

function renderStepStatusIcon(
  status: LegendAIThinkingStepStatus,
): React.ReactNode {
  if (status === LegendAIThinkingStepStatus.ACTIVE) {
    return <LoadingIcon isLoading={true} />;
  }
  return status === LegendAIThinkingStepStatus.DONE ? '\u2713' : '\u2717';
}

const AssistantMessageView = (props: {
  msg: LegendAIAssistantMessage;
  isThinkingVisible: boolean;
  onToggleThinking: () => void;
  onSuggestedQueryClick?: (query: string) => void;
}): React.ReactNode => {
  const { msg, isThinkingVisible, onToggleThinking, onSuggestedQueryClick } =
    props;

  const [sqlCopied, setSqlCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(
    () => () => {
      if (copyTimerRef.current !== undefined) {
        clearTimeout(copyTimerRef.current);
      }
    },
    [],
  );

  const handleCopySql = useCallback(() => {
    if (msg.sql) {
      navigator.clipboard.writeText(msg.sql).catch(noop());
      setSqlCopied(true);
      if (copyTimerRef.current !== undefined) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setSqlCopied(false);
        copyTimerRef.current = undefined;
      }, COPY_FEEDBACK_DURATION_MS);
    }
  }, [msg.sql]);

  return (
    <div className="legend-ai__msg legend-ai__msg--assistant">
      <div className="legend-ai__msg-avatar">
        <SparkleStarsIcon />
      </div>
      <div className="legend-ai__msg-content">
        {msg.thinkingSteps.length > 0 && (
          <div className="legend-ai__thinking">
            {!msg.isProcessing && (
              <button
                type="button"
                className="legend-ai__thinking-toggle"
                onClick={onToggleThinking}
              >
                <span className="legend-ai__thinking-toggle-icon">
                  {isThinkingVisible ? '\u25BC' : '\u25B6'}
                </span>
                Thought for {msg.thinkingDuration ?? '...'}s
              </button>
            )}
            {isThinkingVisible && (
              <div className="legend-ai__thinking-steps">
                {msg.thinkingSteps.map((step) => (
                  <div
                    key={step.label}
                    className={`legend-ai__thinking-step legend-ai__thinking-step--${step.status}`}
                  >
                    <span className="legend-ai__thinking-step-icon">
                      {renderStepStatusIcon(step.status)}
                    </span>
                    <span>{step.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {msg.sql && (
          <div className="legend-ai__sql-block">
            <div className="legend-ai__sql-block-header">
              <span className="legend-ai__sql-block-header-icon">
                <CodeIcon />
              </span>
              <span>Generated SQL</span>
              {msg.sqlGenTime && (
                <span className="legend-ai__sql-block-time">
                  {msg.sqlGenTime}s
                </span>
              )}
              <button
                type="button"
                className="legend-ai__sql-copy-btn"
                title="Copy SQL"
                aria-label="Copy SQL"
                onClick={handleCopySql}
              >
                {sqlCopied ? (
                  <span className="legend-ai__sql-copy-btn--copied">
                    \u2713
                  </span>
                ) : (
                  <CopyIcon />
                )}
              </button>
            </div>
            <div className="legend-ai__sql-scroll">
              <pre className="legend-ai__sql-display">{msg.sql}</pre>
            </div>
          </div>
        )}

        {msg.isExecuting && (
          <div className="legend-ai__executing">
            <LoadingIcon isLoading={true} />
            <span>Executing query...</span>
          </div>
        )}

        {msg.textAnswer && (
          <div className="legend-ai__text-answer">
            <MarkdownTextViewer
              value={{ value: msg.textAnswer }}
              className="legend-ai__text-answer-md"
            />
          </div>
        )}

        {msg.error && <div className="legend-ai__exec-error">{msg.error}</div>}

        {!msg.isProcessing &&
          msg.suggestedQueries.length > 0 &&
          onSuggestedQueryClick && (
            <div className="legend-ai__follow-up-suggestions">
              <span className="legend-ai__follow-up-label">
                Try a data query:
              </span>
              {msg.suggestedQueries.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="legend-ai__follow-up-btn"
                  onClick={(): void => onSuggestedQueryClick(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

        {msg.gridData && (
          <div className="legend-ai__results-block">
            <div className="legend-ai__results-header">
              <span className="legend-ai__results-header-icon">
                <TableIcon />
              </span>
              <span>Results</span>
              <span className="legend-ai__results-meta">
                {msg.gridData.rowData.length} row
                {msg.gridData.rowData.length === 1 ? '' : 's'}
                {msg.execTime ? ` \u00B7 ${msg.execTime}s` : ''}
              </span>
            </div>
            <LegendAIResultGrid data={msg.gridData} />
          </div>
        )}
      </div>
    </div>
  );
};

export const LegendAIChat = (props: LegendAIChatProps): React.ReactNode => {
  const {
    services,
    coordinates,
    config,
    metadata,
    title,
    plugin,
    dataProductCoordinates,
    pureExecutionContext,
  } = props;
  const state = useLegendAIChatState(
    services,
    coordinates,
    config,
    metadata,
    plugin,
    dataProductCoordinates,
    pureExecutionContext,
  );
  const suggestedQueries = useMemo(
    () => buildSuggestedQueries(services, metadata),
    [services, metadata],
  );
  const hasMessages = state.messages.length > 0;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [state.questionText]);

  return (
    <div className="legend-ai" id={LEGEND_AI_ANCHOR_ID}>
      <div className="legend-ai__header">
        <div className="legend-ai__header-icon">
          <SparkleStarsIcon />
        </div>
        <div className="legend-ai__title">{title ?? 'Legend AI'}</div>
        {hasMessages && (
          <button
            type="button"
            className="legend-ai__clear-btn"
            title="Clear chat"
            aria-label="Clear chat"
            onClick={(): void => state.clearChat()}
          >
            <RefreshIcon />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="legend-ai__conversation" ref={state.conversationRef}>
        {!hasMessages && (
          <div className="legend-ai__empty-state">
            <div className="legend-ai__empty-icon">
              <SparkleStarsIcon />
            </div>
            <div className="legend-ai__empty-text">
              Ask a question about your data
            </div>
            <div className="legend-ai__suggestions">
              <div className="legend-ai__suggestions-grid">
                {suggestedQueries.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="legend-ai__suggestion-card"
                    onClick={(): void => {
                      state.setQuestionText(q);
                    }}
                  >
                    <span className="legend-ai__suggestion-card-icon">
                      <SparkleStarsIcon />
                    </span>
                    <span className="legend-ai__suggestion-card-text">{q}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {state.messages.map((msg, msgIndex) => {
          if (msg.role === LegendAIMessageRole.USER) {
            return (
              <div key={msg.id} className="legend-ai__msg legend-ai__msg--user">
                <div className="legend-ai__msg-bubble">{msg.text}</div>
              </div>
            );
          }

          const isThinkingVisible =
            msg.isProcessing || state.expandedThinking.has(msgIndex);
          return (
            <AssistantMessageView
              key={msg.id}
              msg={msg}
              isThinkingVisible={isThinkingVisible}
              onToggleThinking={(): void => state.toggleThinking(msgIndex)}
              onSuggestedQueryClick={(q): void =>
                state.askQuestionWithIntent(
                  q,
                  services.length > 0
                    ? LegendAIQuestionIntent.DATA_QUERY
                    : LegendAIQuestionIntent.ORCHESTRATOR,
                )
              }
            />
          );
        })}
      </div>

      <div className="legend-ai__input-area">
        <div className="legend-ai__question-wrapper">
          <textarea
            ref={textareaRef}
            className="legend-ai__question"
            placeholder="Ask anything about the data..."
            rows={1}
            spellCheck={false}
            value={state.questionText}
            onChange={(e): void => state.setQuestionText(e.target.value)}
            onKeyDown={(e): void => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!state.isSending && state.questionText.trim()) {
                  state.askQuestion();
                }
              }
            }}
          />
          <button
            type="button"
            title="Send"
            aria-label="Send"
            className="legend-ai__send-btn"
            disabled={state.isSending || !state.questionText.trim()}
            onClick={(): void => state.askQuestion()}
          >
            {state.isSending ? <LoadingIcon isLoading={true} /> : <SendIcon />}
          </button>
        </div>
      </div>
    </div>
  );
};
