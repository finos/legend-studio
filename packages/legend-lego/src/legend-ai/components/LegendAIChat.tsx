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

import { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
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
  InfoCircleIcon,
  PythonIcon,
  JupyterIcon,
  CubeIcon,
  MarkdownTextViewer,
  clsx,
} from '@finos/legend-art';
import { assertErrorThrown, noop } from '@finos/legend-shared';
import type {
  LegendAIPythonQueryCode,
  LegendAIPythonCodegenRequest,
  LegendAIDataCubeQueryTranslationRequest,
} from '../LegendAI_LegendApplicationPlugin_Extension.js';
import {
  type LegendAIChatProps,
  type LegendAIAssistantMessage,
  type LegendAIMessageFeedback,
  type LegendAIThinkingStep,
  type LegendAIScopeItem,
  type LegendAIQuestionIntent,
  type LegendAIChatTelemetryEvent,
  LegendAIMessageFeedbackRating,
  LegendAIThinkingStepStatus,
  LegendAIMessageRole,
  LegendAIErrorType,
  TDSServiceSourceType,
  LEGEND_AI_FEEDBACK_PROMPT,
  classifyQuestionIntentFast,
  LegendAIChatTelemetryEventType,
  LegendAITelemetryArtifact,
  LegendAISuggestedQuerySource,
} from '../LegendAITypes.js';
import { useLegendAIChatState } from '../stores/LegendAIChatState.js';
import { looksLikeAccessError } from '../stores/LegendAIChatProcessors.js';
import { LegendAIResultGrid } from './LegendAIResultGrid.js';
import { LegendAIAnalysisPanel } from './LegendAIAnalysisPanel.js';
import { LegendAIChatInput } from './LegendAIChatInput.js';
import { buildSuggestedQueries } from './LegendAIChatHelpers.js';

export const LEGEND_AI_ANCHOR_ID = 'legend-ai-anchor';

const COPY_FEEDBACK_DURATION_MS = 2000;
const CONTEXT_BANNER_AUTO_DISMISS_MS = 20000;

type LegendAIPythonCodeEntry =
  | { status: 'loading' }
  | { status: 'ready'; code: LegendAIPythonQueryCode | undefined }
  | { status: 'error'; errorMessage: string };

const LegendAIContextBanner = (props: {
  message: string;
  onDismiss: () => void;
}): React.ReactNode => {
  const { message, onDismiss } = props;

  useEffect(() => {
    const timer = setTimeout(onDismiss, CONTEXT_BANNER_AUTO_DISMISS_MS);
    return (): void => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="legend-ai__context-banner">
      <div className="legend-ai__context-banner-icon">
        <InfoCircleIcon />
      </div>
      <div className="legend-ai__context-banner-text">{message}</div>
      <button
        type="button"
        className="legend-ai__context-banner-close"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <TimesIcon />
      </button>
    </div>
  );
};
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

const SuggestionButton = (props: {
  query: string;
  position: number;
  className: string;
  source: LegendAISuggestedQuerySource;
  onSelect: (query: string) => void;
  onLogTelemetryEvent?: (event: LegendAIChatTelemetryEvent) => void;
}): React.ReactNode => {
  const { query, position, className, source, onSelect, onLogTelemetryEvent } =
    props;
  return (
    <button
      type="button"
      className={className}
      onClick={(): void => {
        onLogTelemetryEvent?.({
          type: LegendAIChatTelemetryEventType.SUGGESTED_QUERY_CLICKED,
          position,
          source,
        });
        onSelect(query);
      }}
    >
      {query}
    </button>
  );
};

const AssistantMessageView = memo(function AssistantMessageView(props: {
  msg: LegendAIAssistantMessage;
  msgIndex: number;
  questionText: string;
  isThinkingVisible: boolean;
  onToggleThinking: (msgIndex: number) => void;
  onMessageFeedback?: (
    feedback: LegendAIMessageFeedback,
  ) => Promise<void> | void;
  selectedFeedbackRating: LegendAIMessageFeedbackRating | undefined;
  feedbackSubmitting: boolean;
  onSuggestedQueryClick?: (query: string) => void;
  onFallbackAction?: (messageId: string) => void;
  enghubDocUrl?: string;
  enthubRequestAccessUrl?: string;
  onRequestAccess?: (accessPointGroupTitle: string) => void;
  pythonEntry?: LegendAIPythonCodeEntry;
  onRequestPython?: (msg: LegendAIAssistantMessage) => void;
  onOpenInDataCube?: (msg: LegendAIAssistantMessage) => void;
  isOpeningInDataCube?: boolean;
  onLogTelemetryEvent?: (event: LegendAIChatTelemetryEvent) => void;
}): React.ReactNode {
  const {
    msg,
    msgIndex,
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
    onRequestAccess,
    pythonEntry,
    onRequestPython,
    onOpenInDataCube,
    isOpeningInDataCube,
    onLogTelemetryEvent,
  } = props;

  const hasPermissionAccessLinks =
    enghubDocUrl !== undefined || enthubRequestAccessUrl !== undefined;

  const [sqlCopied, setSqlCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [showPython, setShowPython] = useState(false);
  const [pythonCopied, setPythonCopied] = useState(false);
  const pythonCopyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(
    () => () => {
      if (copyTimerRef.current !== undefined) {
        clearTimeout(copyTimerRef.current);
      }
      if (pythonCopyTimerRef.current !== undefined) {
        clearTimeout(pythonCopyTimerRef.current);
      }
    },
    [],
  );

  const handleCopySql = useCallback(() => {
    if (msg.sql) {
      navigator.clipboard.writeText(msg.sql).catch(noop);
      setSqlCopied(true);
      onLogTelemetryEvent?.({
        type: LegendAIChatTelemetryEventType.ARTIFACT_COPIED,
        artifact: LegendAITelemetryArtifact.SQL,
      });
      if (copyTimerRef.current !== undefined) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setSqlCopied(false);
        copyTimerRef.current = undefined;
      }, COPY_FEEDBACK_DURATION_MS);
    }
  }, [msg.sql, onLogTelemetryEvent]);

  const handleCopyPython = useCallback(() => {
    if (pythonEntry?.status === 'ready' && pythonEntry.code) {
      navigator.clipboard.writeText(pythonEntry.code.code).catch(noop);
      setPythonCopied(true);
      onLogTelemetryEvent?.({
        type: LegendAIChatTelemetryEventType.ARTIFACT_COPIED,
        artifact: LegendAITelemetryArtifact.PYTHON,
      });
      if (pythonCopyTimerRef.current !== undefined) {
        clearTimeout(pythonCopyTimerRef.current);
      }
      pythonCopyTimerRef.current = setTimeout(() => {
        setPythonCopied(false);
        pythonCopyTimerRef.current = undefined;
      }, COPY_FEEDBACK_DURATION_MS);
    }
  }, [pythonEntry, onLogTelemetryEvent]);

  const handleTogglePython = useCallback((): void => {
    const opening = !showPython;
    setShowPython(opening);
    onLogTelemetryEvent?.({
      type: LegendAIChatTelemetryEventType.PYTHON_CODE_TOGGLED,
      shown: opening,
    });
    if (opening && !pythonEntry && onRequestPython) {
      onLogTelemetryEvent?.({
        type: LegendAIChatTelemetryEventType.PYTHON_CODE_REQUESTED,
      });
      onRequestPython(msg);
    }
  }, [showPython, pythonEntry, onRequestPython, msg, onLogTelemetryEvent]);

  const canShowFeedback =
    !msg.isProcessing &&
    (msg.textAnswer !== null || msg.gridData !== null || msg.error !== null);
  const visibleThinkingSteps = useMemo(
    () => formatThinkingSteps(msg.thinkingSteps),
    [msg.thinkingSteps],
  );
  const { metadataContext, analysisSummary, plainAnswer } = useMemo(() => {
    const split = splitCombinedAnswer(msg.textAnswer);
    const gridAnalysisFallback =
      split.metadataContext === null ? msg.textAnswer : null;
    return {
      metadataContext: split.metadataContext,
      analysisSummary:
        msg.gridData === null
          ? null
          : (split.queryAnalysis ?? gridAnalysisFallback),
      plainAnswer:
        msg.gridData === null
          ? (split.metadataContext ?? msg.textAnswer)
          : null,
    };
  }, [msg.textAnswer, msg.gridData]);

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
                onClick={(): void => onToggleThinking(msgIndex)}
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
                    className={clsx(
                      'legend-ai__thinking-step',
                      `legend-ai__thinking-step--${step.status}`,
                    )}
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
          <details
            className="legend-ai__sql-details"
            open={msg.gridData !== null}
            onToggle={(event): void =>
              onLogTelemetryEvent?.({
                type: LegendAIChatTelemetryEventType.SQL_DETAILS_TOGGLED,
                shown: event.currentTarget.open,
              })
            }
          >
            <summary className="legend-ai__sql-details-summary">
              {msg.gridData === null ? 'Show the query I tried' : 'Query'}
            </summary>
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
          </details>
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
            {msg.errorType === LegendAIErrorType.EXECUTION &&
              onRequestAccess &&
              msg.queriedAccessPointGroups.length > 0 &&
              looksLikeAccessError(msg.error) && (
                <div className="legend-ai__permission-error-action">
                  <span className="legend-ai__permission-error-note">
                    {msg.queriedAccessPointGroups.length === 1
                      ? 'You may not have access to this data. You can request access below.'
                      : `This query uses ${msg.queriedAccessPointGroups.length} access point groups. You can request access to each one below.`}
                  </span>
                  <div className="legend-ai__permission-error-btns">
                    {msg.queriedAccessPointGroups.map((apgTitle) => (
                      <button
                        key={apgTitle}
                        type="button"
                        className="legend-ai__permission-error-btn legend-ai__permission-error-btn--primary"
                        onClick={(): void => onRequestAccess(apgTitle)}
                      >
                        <ExternalLinkIcon />
                        <span>Request Access — {apgTitle}</span>
                      </button>
                    ))}
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
              {msg.suggestedQueries.map((q, position) => (
                <SuggestionButton
                  key={q}
                  query={q}
                  position={position}
                  className="legend-ai__follow-up-btn"
                  source={LegendAISuggestedQuerySource.FOLLOW_UP}
                  onSelect={onSuggestedQueryClick}
                  {...(onLogTelemetryEvent ? { onLogTelemetryEvent } : {})}
                />
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

        {(onRequestPython || onOpenInDataCube) &&
          !msg.isProcessing &&
          (msg.sql !== null || msg.gridData !== null) && (
            <div className="legend-ai__python-block">
              <div className="legend-ai__cta-row">
                {onRequestPython && (
                  <button
                    type="button"
                    className="legend-ai__python-cta"
                    onClick={handleTogglePython}
                  >
                    <PythonIcon />
                    <span>
                      {showPython
                        ? 'Hide Python code'
                        : 'Want the Python code for this query?'}
                    </span>
                    <span className="legend-ai__python-cta-caret">
                      {showPython ? <CaretDownIcon /> : <CaretRightIcon />}
                    </span>
                  </button>
                )}
                {onOpenInDataCube && msg.sql !== null && (
                  <button
                    type="button"
                    className="legend-ai__datacube-cta"
                    onClick={(): void => {
                      onLogTelemetryEvent?.({
                        type: LegendAIChatTelemetryEventType.OPEN_IN_DATACUBE_CLICKED,
                      });
                      onOpenInDataCube(msg);
                    }}
                    disabled={isOpeningInDataCube}
                    title="Open this query in DataCube"
                    aria-label="Open this query in DataCube"
                  >
                    {isOpeningInDataCube ? (
                      <LoadingIcon isLoading={true} />
                    ) : (
                      <CubeIcon />
                    )}
                    <span>
                      {isOpeningInDataCube
                        ? 'Opening in DataCube...'
                        : 'Open in DataCube'}
                    </span>
                    <span className="legend-ai__datacube-cta-launch">
                      <ExternalLinkIcon />
                    </span>
                  </button>
                )}
              </div>
              {showPython && onRequestPython && (
                <div className="legend-ai__python-panel">
                  <div className="legend-ai__python-panel-header">
                    <span className="legend-ai__python-panel-header-icon">
                      <CodeIcon />
                    </span>
                    <span>Python</span>
                    {pythonEntry?.status === 'ready' && pythonEntry.code && (
                      <button
                        type="button"
                        className="legend-ai__sql-copy-btn"
                        title="Copy Python code"
                        aria-label="Copy Python code"
                        onClick={handleCopyPython}
                      >
                        {pythonCopied ? (
                          <span className="legend-ai__sql-copy-btn--copied">
                            <CheckIcon />
                          </span>
                        ) : (
                          <CopyIcon />
                        )}
                      </button>
                    )}
                  </div>
                  {pythonEntry?.status === 'loading' && (
                    <div className="legend-ai__python-panel-loading">
                      <LoadingIcon isLoading={true} />
                      <span>Generating Python…</span>
                    </div>
                  )}
                  {pythonEntry?.status === 'error' && (
                    <div className="legend-ai__python-panel-error">
                      <span>
                        Could not generate Python code. Try again in a moment.
                      </span>
                      <button
                        type="button"
                        className="legend-ai__permission-error-btn"
                        onClick={(): void => {
                          onLogTelemetryEvent?.({
                            type: LegendAIChatTelemetryEventType.PYTHON_CODE_REQUESTED,
                          });
                          onRequestPython(msg);
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {pythonEntry?.status === 'ready' &&
                    pythonEntry.code === undefined && (
                      <div className="legend-ai__python-panel-loading">
                        <span>
                          Python code is not available for this data source.
                        </span>
                      </div>
                    )}
                  {pythonEntry?.status === 'ready' && pythonEntry.code && (
                    <>
                      <div className="legend-ai__sql-scroll">
                        <pre className="legend-ai__sql-display">
                          {pythonEntry.code.code}
                        </pre>
                      </div>
                      {pythonEntry.code.notebookUrl && (
                        <div className="legend-ai__python-panel-actions">
                          <a
                            className="legend-ai__permission-error-btn"
                            href={pythonEntry.code.notebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <JupyterIcon />
                            <span>Launch Notebook</span>
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

        {canShowFeedback && (
          <div className="legend-ai__message-feedback">
            <span className="legend-ai__message-feedback-label">
              {LEGEND_AI_FEEDBACK_PROMPT}
            </span>
            <div className="legend-ai__message-feedback-actions">
              <button
                type="button"
                className={clsx('legend-ai__message-feedback-btn', {
                  'legend-ai__message-feedback-btn--selected':
                    selectedFeedbackRating ===
                    LegendAIMessageFeedbackRating.THUMBS_UP,
                })}
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
                className={clsx('legend-ai__message-feedback-btn', {
                  'legend-ai__message-feedback-btn--selected':
                    selectedFeedbackRating ===
                    LegendAIMessageFeedbackRating.THUMBS_DOWN,
                })}
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
});

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
    modelContext,
    availableScopes,
    onMessageFeedback,
    onClose,
    onMinimize,
    onRequestAccess,
    onOpenInDataCube,
    contextBannerMessage,
    onLogTelemetryEvent,
  } = props;
  const state = useLegendAIChatState(
    services,
    coordinates,
    config,
    metadata,
    plugin,
    dataProductCoordinates,
    pureExecutionContext,
    modelContext,
    onLogTelemetryEvent,
  );
  const suggestedQueries = useMemo(
    () => buildSuggestedQueries(services, metadata),
    [services, metadata],
  );
  const overview = useMemo(() => {
    const raw =
      modelContext?.dataspaceDescription ?? metadata.description ?? '';
    const summary = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.length > 0 && !line.startsWith('#') && !line.startsWith('|'),
      )
      .slice(0, 3)
      .join(' ')
      .slice(0, 300);
    const entityCount = modelContext?.entities.length ?? 0;
    const serviceCount =
      metadata.serviceSummaries.length > 0
        ? metadata.serviceSummaries.length
        : services.length;
    return { summary, entityCount, serviceCount };
  }, [modelContext, metadata, services]);
  const hasServices = services.length > 0;

  const inferSuggestedQueryIntent = useCallback(
    (query: string): LegendAIQuestionIntent =>
      classifyQuestionIntentFast(query, hasServices).intent,
    [hasServices],
  );
  const { isDataProduct, supportsPython, supportsDataCube } = useMemo(
    () => ({
      isDataProduct: services.some(
        (s) => s.sourceType === TDSServiceSourceType.ACCESS_POINT,
      ),
      supportsPython: services.some((s) => plugin.supportsPythonCodegen(s)),
      supportsDataCube: services.some((s) => plugin.supportsOpenInDataCube(s)),
    }),
    [services, plugin],
  );
  const [pythonCodeByMessageId, setPythonCodeByMessageId] = useState<
    Map<string, LegendAIPythonCodeEntry>
  >(new Map());
  const pythonCodeByMessageIdRef = useRef(pythonCodeByMessageId);
  pythonCodeByMessageIdRef.current = pythonCodeByMessageId;
  const requestPythonCode = useCallback(
    async (msg: LegendAIAssistantMessage): Promise<void> => {
      const existing = pythonCodeByMessageIdRef.current.get(msg.id);
      if (existing?.status === 'loading' || existing?.status === 'ready') {
        return;
      }
      setPythonCodeByMessageId((prev) => {
        const next = new Map(prev);
        next.set(msg.id, { status: 'loading' });
        return next;
      });
      const resolvedSet = new Set(msg.queriedAccessPoints);
      const service =
        services.find((s) => resolvedSet.has(s.pattern.replace(/^\//u, ''))) ??
        services[0];
      if (!service) {
        setPythonCodeByMessageId((prev) => {
          const next = new Map(prev);
          next.set(msg.id, { status: 'ready', code: undefined });
          return next;
        });
        return;
      }
      const msgIndex = state.messages.findIndex((m) => m.id === msg.id);
      const previousUser =
        msgIndex > 0 ? state.messages[msgIndex - 1] : undefined;
      const question =
        previousUser?.role === LegendAIMessageRole.USER
          ? previousUser.text
          : undefined;
      const request: LegendAIPythonCodegenRequest = {
        service,
        config,
        ...(dataProductCoordinates ? { dataProductCoordinates } : {}),
        ...(question === undefined ? {} : { question }),
        ...(msg.sql === null ? {} : { sql: msg.sql }),
      };
      try {
        const code = await plugin.generatePythonQueryCodeAsync(request);
        setPythonCodeByMessageId((prev) => {
          const next = new Map(prev);
          next.set(msg.id, { status: 'ready', code });
          return next;
        });
      } catch (error) {
        assertErrorThrown(error);
        setPythonCodeByMessageId((prev) => {
          const next = new Map(prev);
          next.set(msg.id, { status: 'error', errorMessage: error.message });
          return next;
        });
      }
    },
    [plugin, services, dataProductCoordinates, config, state.messages],
  );
  const [openingDataCubeMessageIds, setOpeningDataCubeMessageIds] = useState<
    Set<string>
  >(new Set());

  // Resolves the AP, best-effort translates its SQL to a DataCube Pure query, and
  // launches DataCube; on translation failure it opens on the bare access point.
  const handleOpenInDataCubeMsg = useCallback(
    async (msg: LegendAIAssistantMessage): Promise<void> => {
      if (!onOpenInDataCube || msg.sql === null) {
        return;
      }
      const accessPointName = msg.queriedAccessPoints[0];
      if (accessPointName === undefined) {
        return;
      }
      const service =
        services.find(
          (s) => s.pattern.replace(/^\//u, '') === accessPointName,
        ) ?? services[0];
      if (!service) {
        return;
      }
      const dataProductPath = dataProductCoordinates?.data_product ?? '';
      setOpeningDataCubeMessageIds((prev) => {
        const next = new Set(prev);
        next.add(msg.id);
        return next;
      });
      const msgIndex = state.messages.findIndex((m) => m.id === msg.id);
      const previousUser =
        msgIndex > 0 ? state.messages[msgIndex - 1] : undefined;
      const question =
        previousUser?.role === LegendAIMessageRole.USER
          ? previousUser.text
          : undefined;
      const request: LegendAIDataCubeQueryTranslationRequest = {
        sql: msg.sql,
        service,
        dataProductPath,
        config,
        ...(question === undefined ? {} : { question }),
      };
      let pureQuery: string | undefined;
      try {
        pureQuery =
          await plugin.translateAccessPointSqlToDataCubeQuery(request);
      } catch (error) {
        assertErrorThrown(error);
      }
      try {
        onOpenInDataCube(accessPointName, pureQuery);
      } finally {
        setOpeningDataCubeMessageIds((prev) => {
          if (!prev.has(msg.id)) {
            return prev;
          }
          const next = new Set(prev);
          next.delete(msg.id);
          return next;
        });
      }
    },
    [
      onOpenInDataCube,
      plugin,
      services,
      dataProductCoordinates,
      config,
      state.messages,
    ],
  );
  const [showContextBanner, setShowContextBanner] = useState(true);
  const dismissBanner = useCallback(() => setShowContextBanner(false), []);
  const hasMessages = state.messages.length > 0;
  const scopes = useMemo(
    () => (isDataProduct ? [] : (availableScopes ?? DEFAULT_SCOPES)),
    [isDataProduct, availableScopes],
  );
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
      } catch (error) {
        assertErrorThrown(error);
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

  const { toggleThinking, runFallbackAction, askQuestionWithIntent } = state;
  const handleSuggestedQueryClick = useCallback(
    (query: string): void =>
      askQuestionWithIntent(query, inferSuggestedQueryIntent(query)),
    [askQuestionWithIntent, inferSuggestedQueryIntent],
  );
  const handleRequestPython = useCallback(
    (message: LegendAIAssistantMessage): void => {
      requestPythonCode(message).catch(noop);
    },
    [requestPythonCode],
  );
  const handleOpenInDataCube = useCallback(
    (message: LegendAIAssistantMessage): void => {
      handleOpenInDataCubeMsg(message).catch(noop);
    },
    [handleOpenInDataCubeMsg],
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
              onClick={(): void => {
                onLogTelemetryEvent?.({
                  type: LegendAIChatTelemetryEventType.ASSISTANT_CLOSED,
                });
                onClose();
              }}
            >
              <TimesIcon />
            </button>
          )}
        </div>
      </div>

      {showContextBanner && contextBannerMessage && (
        <LegendAIContextBanner
          message={contextBannerMessage}
          onDismiss={dismissBanner}
        />
      )}

      <div className="legend-ai__conversation" ref={state.conversationRef}>
        {!hasMessages && (
          <div className="legend-ai__empty-state">
            <div className="legend-ai__empty-icon">
              <SparkleStarsIcon />
            </div>
            <div className="legend-ai__empty-text">
              Ask a question about your data
            </div>
            {overview.summary.length > 0 && (
              <div className="legend-ai__empty-overview">
                {overview.summary}
              </div>
            )}
            {(overview.entityCount > 0 || overview.serviceCount > 0) && (
              <div className="legend-ai__empty-meta">
                {overview.entityCount > 0 &&
                  `${overview.entityCount} entit${
                    overview.entityCount === 1 ? 'y' : 'ies'
                  }`}
                {overview.entityCount > 0 && overview.serviceCount > 0 && ' · '}
                {overview.serviceCount > 0 &&
                  `${overview.serviceCount} service${
                    overview.serviceCount === 1 ? '' : 's'
                  }`}
              </div>
            )}
            <div className="legend-ai__suggestions">
              {suggestedQueries.map((q, position) => (
                <SuggestionButton
                  key={q}
                  query={q}
                  position={position}
                  className="legend-ai__suggestion-chip"
                  source={LegendAISuggestedQuerySource.STARTER}
                  onSelect={(query): void =>
                    state.askQuestionWithIntent(
                      query,
                      inferSuggestedQueryIntent(query),
                    )
                  }
                  {...(onLogTelemetryEvent ? { onLogTelemetryEvent } : {})}
                />
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
          const messagePython = pythonCodeByMessageId.get(msg.id);
          return (
            <AssistantMessageView
              key={msg.id}
              msg={msg}
              msgIndex={msgIndex}
              questionText={questionText}
              isThinkingVisible={isThinkingVisible}
              onToggleThinking={toggleThinking}
              onMessageFeedback={handleMessageFeedback}
              selectedFeedbackRating={feedbackByMessageId.get(msg.id)}
              feedbackSubmitting={pendingFeedbackByMessageId.has(msg.id)}
              {...(config.enghubDocUrl === undefined
                ? {}
                : { enghubDocUrl: config.enghubDocUrl })}
              {...(config.enthubRequestAccessUrl === undefined
                ? {}
                : { enthubRequestAccessUrl: config.enthubRequestAccessUrl })}
              {...(onRequestAccess ? { onRequestAccess } : {})}
              {...(messagePython ? { pythonEntry: messagePython } : {})}
              {...(supportsPython
                ? { onRequestPython: handleRequestPython }
                : {})}
              {...(supportsDataCube && onOpenInDataCube
                ? {
                    onOpenInDataCube: handleOpenInDataCube,
                    isOpeningInDataCube: openingDataCubeMessageIds.has(msg.id),
                  }
                : {})}
              onFallbackAction={runFallbackAction}
              onSuggestedQueryClick={handleSuggestedQueryClick}
              {...(onLogTelemetryEvent ? { onLogTelemetryEvent } : {})}
            />
          );
        })}
      </div>

      <LegendAIChatInput state={state} scopes={scopes} />
    </div>
  );
};
