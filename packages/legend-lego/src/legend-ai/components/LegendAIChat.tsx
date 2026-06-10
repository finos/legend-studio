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
  SparkleStarsIcon,
  CodeIcon,
  TableIcon,
  CopyIcon,
  CheckIcon,
  TimesIcon,
  MinusIcon,
  PlusIcon,
  CaretDownIcon,
  CaretRightIcon,
  DotIcon,
  LoadingIcon,
  LikeIcon,
  DislikeIcon,
  ExternalLinkIcon,
  MarkdownTextViewer,
} from '@finos/legend-art';
import { noop } from '@finos/legend-shared';
import {
  type LegendAIChatProps,
  type LegendAIAssistantMessage,
  type LegendAIMessageFeedback,
  type LegendAIThinkingStep,
  type LegendAIScopeItem,
  type LegendAIQuestionIntent,
  LegendAIMessageFeedbackRating,
  LegendAIThinkingStepStatus,
  LegendAIMessageRole,
  LegendAIErrorType,
  classifyQuestionIntentFast,
} from '../LegendAITypes.js';
import { useLegendAIChatState } from '../stores/LegendAIChatState.js';
import { LegendAIResultGrid } from './LegendAIResultGrid.js';
import { LegendAIAnalysisPanel } from './LegendAIAnalysisPanel.js';
import { LegendAIChatInput } from './LegendAIChatInput.js';
import { buildSuggestedQueries } from './LegendAIChatHelpers.js';

export const LEGEND_AI_ANCHOR_ID = 'legend-ai-anchor';

const COPY_FEEDBACK_DURATION_MS = 2000;
const METADATA_CONTEXT_HEADING = '### Metadata context';
const QUERY_ANALYSIS_HEADING = '### Query analysis';

function toUserFacingThinkingLabel(label: string): string {
  const normalized = label.toLowerCase();
  if (
    normalized.includes('analyzing your question') ||
    normalized.includes('intent is ambiguous')
  ) {
    return 'Understanding your request';
  }
  if (
    normalized.includes('building metadata context') ||
    normalized.includes('answering from product metadata')
  ) {
    return 'Checking product capabilities and services';
  }
  if (
    normalized.includes('found relevant services') ||
    normalized.includes('selecting best service') ||
    normalized.includes('building context from service schemas') ||
    normalized.includes('preparing data query') ||
    normalized.includes('generating sql query') ||
    normalized.includes('verifying query correctness') ||
    normalized.includes('query corrected') ||
    normalized.includes('max verification attempts reached') ||
    normalized.includes('judge approved a non-sql draft')
  ) {
    return 'Trying a data query when helpful';
  }
  if (
    normalized.includes('retrieved ') ||
    normalized.includes('executing') ||
    normalized.includes('analyzing results') ||
    normalized.includes('verifying answer coverage')
  ) {
    return 'Summarizing what matters for your question';
  }
  if (normalized.includes('error')) {
    return 'Hit an issue while preparing the answer';
  }
  return label;
}

function formatThinkingSteps(
  thinkingSteps: LegendAIThinkingStep[],
): LegendAIThinkingStep[] {
  const formatted: LegendAIThinkingStep[] = [];
  for (const step of thinkingSteps) {
    const userLabel = toUserFacingThinkingLabel(step.label);
    const last = formatted[formatted.length - 1];
    if (last?.label === userLabel) {
      formatted[formatted.length - 1] = {
        ...last,
        status: step.status,
      };
    } else {
      formatted.push({
        ...step,
        label: userLabel,
      });
    }
  }
  return formatted;
}

function splitCombinedAnswer(textAnswer: string | null): {
  metadataContext: string | null;
  queryAnalysis: string | null;
} {
  if (!textAnswer) {
    return { metadataContext: null, queryAnalysis: null };
  }
  const metadataIndex = textAnswer.indexOf(METADATA_CONTEXT_HEADING);
  if (metadataIndex < 0) {
    return { metadataContext: null, queryAnalysis: textAnswer };
  }

  const metadataStart = metadataIndex + METADATA_CONTEXT_HEADING.length;
  const queryIndex = textAnswer.indexOf(QUERY_ANALYSIS_HEADING, metadataStart);

  const metadataContext =
    queryIndex >= 0
      ? textAnswer.slice(metadataStart, queryIndex).trim()
      : textAnswer.slice(metadataStart).trim();
  const queryAnalysis =
    queryIndex >= 0
      ? textAnswer.slice(queryIndex + QUERY_ANALYSIS_HEADING.length).trim() ||
        null
      : null;

  return {
    metadataContext: metadataContext.length > 0 ? metadataContext : null,
    queryAnalysis,
  };
}

const AISummaryRenderer = ({ value }: { value: string }): React.ReactNode => (
  <MarkdownTextViewer value={{ value }} className="legend-ai__text-answer-md" />
);

const DEFAULT_SCOPES: LegendAIScopeItem[] = [
  {
    id: 'legend-ai-mcp',
    label: 'Legend AI MCP',
    description: 'Model Context Protocol via Marketplace /mcp proxy',
  },
];

export function renderStepStatusIcon(
  status: LegendAIThinkingStepStatus,
): React.ReactNode {
  if (status === LegendAIThinkingStepStatus.ACTIVE) {
    return <LoadingIcon isLoading={true} />;
  }
  return status === LegendAIThinkingStepStatus.DONE ? (
    <CheckIcon />
  ) : (
    <TimesIcon />
  );
}

const AssistantMessageView = (props: {
  msg: LegendAIAssistantMessage;
  questionText: string;
  isThinkingVisible: boolean;
  onToggleThinking: () => void;
  onMessageFeedback?: (
    feedback: LegendAIMessageFeedback,
  ) => Promise<void> | void;
  selectedFeedbackRating: LegendAIMessageFeedbackRating | undefined;
  feedbackSubmitting: boolean;
  onSuggestedQueryClick?: (query: string) => void;
  onFallbackAction?: (messageId: string) => void;
  enghubDocUrl?: string;
  enthubRequestAccessUrl?: string;
}): React.ReactNode => {
  const {
    msg,
    questionText,
    isThinkingVisible,
    onToggleThinking,
    onMessageFeedback,
    selectedFeedbackRating,
    feedbackSubmitting,
    onSuggestedQueryClick,
    onFallbackAction,
    enghubDocUrl,
    enthubRequestAccessUrl,
  } = props;

  const hasPermissionAccessLinks =
    enghubDocUrl !== undefined || enthubRequestAccessUrl !== undefined;

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
      navigator.clipboard.writeText(msg.sql).catch(noop);
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

  const canShowFeedback =
    !msg.isProcessing &&
    (msg.textAnswer !== null || msg.gridData !== null || msg.error !== null);
  const visibleThinkingSteps = formatThinkingSteps(msg.thinkingSteps);
  const { metadataContext, queryAnalysis } = splitCombinedAnswer(
    msg.textAnswer,
  );
  const analysisSummary = (() => {
    if (msg.gridData === null) {
      return null;
    }
    return queryAnalysis ?? (metadataContext === null ? msg.textAnswer : null);
  })();
  const plainAnswer =
    msg.gridData === null ? (metadataContext ?? msg.textAnswer) : null;

  const submitFeedback = useCallback(
    (rating: LegendAIMessageFeedbackRating): void => {
      const result = onMessageFeedback?.({
        messageId: msg.id,
        rating,
        question: questionText,
        ...(msg.textAnswer === null ? {} : { answer: msg.textAnswer }),
        ...(msg.sql === null ? {} : { sql: msg.sql }),
        ...(msg.gridData === null
          ? {}
          : { rowCount: msg.gridData.rowData.length }),
      });
      if (result instanceof Promise) {
        result.catch(noop);
      }
    },
    [msg, onMessageFeedback, questionText],
  );

  return (
    <div className="legend-ai__msg legend-ai__msg--assistant">
      <div className="legend-ai__msg-avatar">
        <SparkleStarsIcon />
      </div>
      <div className="legend-ai__msg-content">
        {visibleThinkingSteps.length > 0 && (
          <div className="legend-ai__thinking">
            {!msg.isProcessing && (
              <button
                type="button"
                className="legend-ai__thinking-toggle"
                onClick={onToggleThinking}
              >
                <span className="legend-ai__thinking-toggle-icon">
                  {isThinkingVisible ? <CaretDownIcon /> : <CaretRightIcon />}
                </span>
                Thought for {msg.thinkingDuration ?? '...'}s
              </button>
            )}
            {isThinkingVisible && (
              <div className="legend-ai__thinking-steps">
                {visibleThinkingSteps.map((step) => (
                  <div
                    key={step.id}
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

        {metadataContext && msg.gridData && (
          <div className="legend-ai__inline-answer">
            <MarkdownTextViewer
              value={{ value: metadataContext }}
              className="legend-ai__text-answer-md"
            />
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
                    <CheckIcon />
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

        {msg.error && (
          <div className="legend-ai__exec-error">
            {msg.error}
            {msg.errorType === LegendAIErrorType.PERMISSION &&
              hasPermissionAccessLinks && (
                <div className="legend-ai__permission-error-action">
                  <span className="legend-ai__permission-error-note">
                    Need access?
                  </span>
                  <div className="legend-ai__permission-error-btns">
                    {enghubDocUrl && (
                      <a
                        className="legend-ai__permission-error-btn"
                        href={enghubDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLinkIcon />
                        <span>View Documentation</span>
                      </a>
                    )}
                    {enthubRequestAccessUrl && (
                      <a
                        className="legend-ai__permission-error-btn legend-ai__permission-error-btn--primary"
                        href={enthubRequestAccessUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLinkIcon />
                        <span>Request Access</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
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
                {msg.execTime ? (
                  <>
                    {' '}
                    <DotIcon className="legend-ai__results-meta-dot" />{' '}
                    {msg.execTime}s
                  </>
                ) : (
                  ''
                )}
              </span>
            </div>
            <LegendAIResultGrid data={msg.gridData} />
          </div>
        )}

        {plainAnswer && (
          <div className="legend-ai__inline-answer">
            <MarkdownTextViewer
              value={{ value: plainAnswer }}
              className="legend-ai__text-answer-md"
            />
          </div>
        )}

        {analysisSummary && msg.gridData && (
          <LegendAIAnalysisPanel
            gridData={msg.gridData}
            summary={analysisSummary}
            SummaryRenderer={AISummaryRenderer}
          />
        )}

        {msg.isProcessing && !msg.isExecuting && msg.gridData && (
          <div className="legend-ai__analyzing">
            <LoadingIcon isLoading={true} />
            <span>Analyzing results...</span>
          </div>
        )}

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

        {msg.fallbackAction && !msg.isProcessing && onFallbackAction && (
          <button
            type="button"
            className="legend-ai__fallback-action-btn"
            onClick={(): void => {
              if (msg.fallbackAction?.actionId) {
                onFallbackAction(msg.id);
              }
            }}
          >
            <SparkleStarsIcon />
            <span>{msg.fallbackAction.label}</span>
          </button>
        )}

        {canShowFeedback && (
          <div className="legend-ai__message-feedback">
            <span className="legend-ai__message-feedback-label">
              Did this answer your question?
            </span>
            <div className="legend-ai__message-feedback-actions">
              <button
                type="button"
                className={`legend-ai__message-feedback-btn${
                  selectedFeedbackRating ===
                  LegendAIMessageFeedbackRating.THUMBS_UP
                    ? 'legend-ai__message-feedback-btn--selected'
                    : ''
                }`}
                title="Thumbs up"
                aria-label="Thumbs up"
                onClick={(): void =>
                  submitFeedback(LegendAIMessageFeedbackRating.THUMBS_UP)
                }
                disabled={feedbackSubmitting}
              >
                <LikeIcon />
              </button>
              <button
                type="button"
                className={`legend-ai__message-feedback-btn${
                  selectedFeedbackRating ===
                  LegendAIMessageFeedbackRating.THUMBS_DOWN
                    ? 'legend-ai__message-feedback-btn--selected'
                    : ''
                }`}
                title="Thumbs down"
                aria-label="Thumbs down"
                onClick={(): void =>
                  submitFeedback(LegendAIMessageFeedbackRating.THUMBS_DOWN)
                }
                disabled={feedbackSubmitting}
              >
                <DislikeIcon />
              </button>
            </div>
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
    availableScopes,
    onMessageFeedback,
    onClose,
    onMinimize,
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
  const hasServices = services.length > 0;

  const inferSuggestedQueryIntent = useCallback(
    (query: string): LegendAIQuestionIntent =>
      classifyQuestionIntentFast(query, hasServices).intent,
    [hasServices],
  );
  const hasMessages = state.messages.length > 0;
  const scopes = availableScopes ?? DEFAULT_SCOPES;
  const [feedbackByMessageId, setFeedbackByMessageId] = useState<
    Map<string, LegendAIMessageFeedbackRating>
  >(new Map());
  const [pendingFeedbackByMessageId, setPendingFeedbackByMessageId] = useState<
    Set<string>
  >(new Set());

  const handleMessageFeedback = useCallback(
    async (feedback: LegendAIMessageFeedback): Promise<void> => {
      setFeedbackByMessageId((prev) => {
        const next = new Map(prev);
        next.set(feedback.messageId, feedback.rating);
        return next;
      });

      if (!onMessageFeedback) {
        return;
      }

      setPendingFeedbackByMessageId((prev) => {
        const next = new Set(prev);
        next.add(feedback.messageId);
        return next;
      });

      try {
        await onMessageFeedback(feedback);
      } catch {
        setFeedbackByMessageId((prev) => {
          const next = new Map(prev);
          next.delete(feedback.messageId);
          return next;
        });
      } finally {
        setPendingFeedbackByMessageId((prev) => {
          const next = new Set(prev);
          next.delete(feedback.messageId);
          return next;
        });
      }
    },
    [onMessageFeedback],
  );

  return (
    <div className="legend-ai" id={LEGEND_AI_ANCHOR_ID}>
      <div className="legend-ai__header">
        <div className="legend-ai__header-icon">
          <SparkleStarsIcon />
        </div>
        <div className="legend-ai__title">{title ?? 'Legend AI'}</div>
        <div className="legend-ai__header-actions">
          <button
            type="button"
            className="legend-ai__header-action"
            title="New chat"
            aria-label="New chat"
            onClick={(): void => state.clearChat()}
          >
            <PlusIcon />
          </button>
          {onMinimize && (
            <button
              type="button"
              className="legend-ai__header-action"
              title="Minimize"
              aria-label="Minimize"
              onClick={onMinimize}
            >
              <MinusIcon />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              className="legend-ai__header-action"
              title="Close"
              aria-label="Close"
              onClick={onClose}
            >
              <TimesIcon />
            </button>
          )}
        </div>
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
              {suggestedQueries.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="legend-ai__suggestion-chip"
                  onClick={(): void => {
                    state.askQuestionWithIntent(
                      q,
                      inferSuggestedQueryIntent(q),
                    );
                  }}
                >
                  {q}
                </button>
              ))}
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
          const previousMessage =
            msgIndex > 0 ? state.messages[msgIndex - 1] : null;
          const questionText =
            previousMessage?.role === LegendAIMessageRole.USER
              ? previousMessage.text
              : '';
          return (
            <AssistantMessageView
              key={msg.id}
              msg={msg}
              questionText={questionText}
              isThinkingVisible={isThinkingVisible}
              onToggleThinking={(): void => state.toggleThinking(msgIndex)}
              onMessageFeedback={handleMessageFeedback}
              selectedFeedbackRating={feedbackByMessageId.get(msg.id)}
              feedbackSubmitting={pendingFeedbackByMessageId.has(msg.id)}
              {...(config.enghubDocUrl === undefined
                ? {}
                : { enghubDocUrl: config.enghubDocUrl })}
              {...(config.enthubRequestAccessUrl === undefined
                ? {}
                : { enthubRequestAccessUrl: config.enthubRequestAccessUrl })}
              onFallbackAction={(messageId): void =>
                state.runFallbackAction(messageId)
              }
              onSuggestedQueryClick={(q): void =>
                state.askQuestionWithIntent(q, inferSuggestedQueryIntent(q))
              }
            />
          );
        })}
      </div>

      <LegendAIChatInput state={state} scopes={scopes} />
    </div>
  );
};
