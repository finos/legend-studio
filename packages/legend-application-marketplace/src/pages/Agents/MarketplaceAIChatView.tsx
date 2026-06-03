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

import { useRef, useEffect, useCallback, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import {
  LoadingIcon,
  SparkleStarsIcon,
  CodeIcon,
  TableIcon,
  CopyIcon,
  RefreshIcon,
  TimesIcon,
  CheckIcon,
  CaretDownIcon,
  CaretRightIcon,
  DotIcon,
  MarkdownTextViewer,
  ExternalLinkIcon,
} from '@finos/legend-art';
import { noop } from '@finos/legend-shared';
import {
  type LegendAIAssistantMessage,
  LegendAIMessageRole,
  LegendAIErrorType,
  LegendAIResultGrid,
  LegendAIAnalysisPanel,
  renderStepStatusIcon,
  LAKEHOUSE_ENV_PROD,
  COVERAGE_NAME_PROD,
  COVERAGE_NAME_SANDBOX,
} from '@finos/legend-lego/legend-ai';
import { useLegendMarketplaceAIChatStore } from '../../application/providers/LegendMarketplaceAIChatStoreProvider.js';
import { MarketplaceAIChatStage } from '../../stores/ai/LegendMarketplaceAIChatStore.js';
import { MarketplaceAIProductCards } from './MarketplaceAIProductCards.js';
import { MarketplaceAIProductAutosuggest } from './MarketplaceAIProductAutosuggest.js';
import { MarketplaceAIInputBar } from './MarketplaceAIInputBar.js';

const COPY_FEEDBACK_DURATION_MS = 2000;

const AISummaryRenderer = ({ value }: { value: string }): React.ReactNode => (
  <MarkdownTextViewer value={{ value }} className="legend-ai__text-answer-md" />
);

const AssistantMessageView = observer(
  (props: {
    msg: LegendAIAssistantMessage;
    onSuggestedQueryClick?: (query: string) => void;
    onFallbackAction?: (messageId: string, actionId: string) => void;
  }): React.ReactNode => {
    const { msg, onSuggestedQueryClick, onFallbackAction } = props;
    const store = useLegendMarketplaceAIChatStore();
    const { enghubDocUrl, enthubRequestAccessUrl, lakehouseEnvironment } =
      store.config;
    const isProd = lakehouseEnvironment === LAKEHOUSE_ENV_PROD;
    const hasAccessLinks =
      enghubDocUrl !== undefined || enthubRequestAccessUrl !== undefined;
    const [isThinkingVisible, setIsThinkingVisible] = useState(
      msg.isProcessing,
    );
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

    useEffect(() => {
      setIsThinkingVisible(msg.isProcessing);
    }, [msg.isProcessing]);

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
                  onClick={(): void => setIsThinkingVisible(!isThinkingVisible)}
                >
                  <span className="legend-ai__thinking-toggle-icon">
                    {isThinkingVisible ? <CaretDownIcon /> : <CaretRightIcon />}
                  </span>
                  Thought for {msg.thinkingDuration ?? '...'}s
                </button>
              )}
              {isThinkingVisible && (
                <div className="legend-ai__thinking-steps">
                  {msg.thinkingSteps.map((step) => (
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

          {msg.dataContext && (
            <div className="legend-ai__data-context">
              <MarkdownTextViewer
                value={{ value: msg.dataContext }}
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
                <span>Generated Query</span>
                {msg.sqlGenTime && (
                  <span className="legend-ai__sql-block-time">
                    {msg.sqlGenTime}s
                  </span>
                )}
                <button
                  type="button"
                  className="legend-ai__sql-copy-btn"
                  title="Copy query"
                  aria-label="Copy query"
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

          {msg.textAnswer && !msg.gridData && (
            <div className="legend-ai__text-answer">
              <MarkdownTextViewer
                value={{ value: msg.textAnswer }}
                className="legend-ai__text-answer-md"
              />
            </div>
          )}

          {msg.error && (
            <div className="legend-ai__exec-error">
              {msg.error}
              {msg.errorType === LegendAIErrorType.PERMISSION &&
                hasAccessLinks && (
                  <div className="legend-ai__permission-error-action">
                    <span className="legend-ai__permission-error-note">
                      Select coverage:{' '}
                      <strong>
                        {isProd ? COVERAGE_NAME_PROD : COVERAGE_NAME_SANDBOX}
                      </strong>
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
              {msg.errorType === LegendAIErrorType.NETWORK && (
                <div className="legend-ai__permission-error-action">
                  <span className="legend-ai__permission-error-note">
                    Please check your network connection and try again.
                  </span>
                </div>
              )}
            </div>
          )}

          {msg.fallbackAction && !msg.isProcessing && onFallbackAction && (
            <button
              type="button"
              className="legend-ai__fallback-action-btn"
              onClick={(): void => {
                const actionId = msg.fallbackAction?.actionId;
                if (actionId) {
                  onFallbackAction(msg.id, actionId);
                }
              }}
            >
              <SparkleStarsIcon />
              <span>{msg.fallbackAction.label}</span>
            </button>
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

          {msg.textAnswer && msg.gridData && (
            <LegendAIAnalysisPanel
              gridData={msg.gridData}
              summary={msg.textAnswer}
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
                  Follow-up questions:
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
        </div>
      </div>
    );
  },
);

export const MarketplaceAIChatView = observer(
  (props: { initialQuery?: string }): React.ReactNode => {
    const { initialQuery } = props;
    const store = useLegendMarketplaceAIChatStore();
    const conversationRef = useRef<HTMLDivElement>(null);
    const hasMessages = store.messages.length > 0;
    const initialQuerySubmitted = useRef(false);

    useEffect(() => {
      const el = conversationRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, [store.messages.length]);

    const dispatchQuery = useCallback(
      (text: string): void => {
        if (store.selectedProduct) {
          flowResult(store.askFollowUp(text)).catch(noop());
        } else {
          flowResult(store.submitQuery(text)).catch(noop());
        }
      },
      [store],
    );

    useEffect(() => {
      if (
        initialQuery &&
        initialQuery.trim().length > 0 &&
        !initialQuerySubmitted.current &&
        store.isEnabled
      ) {
        initialQuerySubmitted.current = true;
        store.setQuestionText(initialQuery);
        flowResult(store.submitQuery(initialQuery)).catch(noop());
      }
    }, [initialQuery, store]);

    const handleSubmit = useCallback((): void => {
      if (!store.questionText.trim() || store.isSending) {
        return;
      }
      dispatchQuery(store.questionText);
    }, [store, dispatchQuery]);

    const handleFallbackAction = useCallback(
      (messageId: string, _actionId: string): void => {
        flowResult(store.runOrchestratorFallback(messageId)).catch(noop());
      },
      [store],
    );

    const handleSuggestedQueryClick = useCallback(
      (query: string): void => {
        store.setQuestionText(query);
        dispatchQuery(query);
      },
      [store, dispatchQuery],
    );

    if (!store.isEnabled) {
      return (
        <div className="marketplace-ai-chat marketplace-ai-chat--disabled">
          <div className="marketplace-ai-chat__empty">
            <div className="marketplace-ai-chat__empty-text">
              Legend AI is not configured. Please contact your administrator.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="marketplace-ai-chat">
        {hasMessages ? (
          <>
            <div className="marketplace-ai-chat__header">
              {store.selectedProduct && (
                <div className="marketplace-ai-chat__product-pill">
                  <SparkleStarsIcon />
                  <span className="marketplace-ai-chat__product-pill-text">
                    Scoped to:{' '}
                    <strong>
                      {store.selectedProduct.dataProductTitle ?? 'Data Product'}
                    </strong>
                  </span>
                  <button
                    type="button"
                    className="marketplace-ai-chat__product-pill-dismiss"
                    title="Remove product scope"
                    aria-label="Remove product scope"
                    onClick={(): void => {
                      store.deselectProduct();
                    }}
                  >
                    <TimesIcon />
                  </button>
                </div>
              )}
              <button
                type="button"
                className="marketplace-ai-chat__clear-btn"
                title="Clear chat"
                aria-label="Clear chat"
                onClick={(): void => store.clearChat()}
              >
                <RefreshIcon />
                <span>Clear chat</span>
              </button>
            </div>
            <div
              className="marketplace-ai-chat__messages"
              ref={conversationRef}
            >
              {store.messages.map((msg) => {
                if (msg.role === LegendAIMessageRole.USER) {
                  return (
                    <div
                      key={msg.id}
                      className="marketplace-ai-chat__msg marketplace-ai-chat__msg--user"
                    >
                      <div className="marketplace-ai-chat__msg-bubble">
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                return (
                  <AssistantMessageView
                    key={msg.id}
                    msg={msg}
                    onSuggestedQueryClick={handleSuggestedQueryClick}
                    onFallbackAction={handleFallbackAction}
                  />
                );
              })}

              {store.stage === MarketplaceAIChatStage.PRODUCT_SELECTION &&
                store.suggestedProducts.length > 0 && (
                  <MarketplaceAIProductCards
                    products={store.suggestedProducts}
                    {...(store.scoredCandidates.length > 0
                      ? {
                          scoredCandidates: store.scoredCandidates,
                        }
                      : {})}
                    onSelect={(product): void => {
                      store.selectDataProduct(product);
                      dispatchQuery(store.lastUserMessageText);
                    }}
                  />
                )}

              {store.stage === MarketplaceAIChatStage.PRODUCT_SELECTION && (
                <div className="marketplace-ai-chat__product-search">
                  <div className="marketplace-ai-chat__product-search-label">
                    Don&apos;t see the right product? Search for it:
                  </div>
                  <MarketplaceAIProductAutosuggest
                    onSelect={(result): void => {
                      store.selectAutosuggestProduct(result);
                      dispatchQuery(store.lastUserMessageText);
                    }}
                    className="marketplace-ai-chat__product-search-autosuggest"
                  />
                </div>
              )}
            </div>

            <div className="marketplace-ai-chat__input-bar">
              <MarketplaceAIInputBar
                placeholder={
                  store.selectedProduct || store.scopeProducts.length > 0
                    ? `Ask about ${store.selectedProduct?.dataProductTitle ?? store.scopeProducts[0]?.name ?? 'this data product'}...`
                    : 'Ask a follow-up...'
                }
                onSubmit={handleSubmit}
              />
            </div>
          </>
        ) : (
          <div className="marketplace-ai-chat__welcome">
            <div className="marketplace-ai-chat__welcome-spacer" />
            <div className="marketplace-ai-chat__welcome-icon">
              <SparkleStarsIcon />
            </div>
            <h1 className="marketplace-ai-chat__welcome-title">
              Legend Marketplace AI
            </h1>
            <p className="marketplace-ai-chat__welcome-subtitle">
              Ask anything about your data. I&apos;ll find the right data
              product and query it for you.
            </p>
            <div className="marketplace-ai-chat__welcome-input">
              <MarketplaceAIInputBar
                placeholder="Ask anything about your data..."
                onSubmit={handleSubmit}
              />
            </div>
            <div className="marketplace-ai-chat__suggestions">
              {store.welcomeSuggestedQueries.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="marketplace-ai-chat__suggestion"
                  onClick={(): void => {
                    store.setQuestionText(q);
                    dispatchQuery(q);
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="marketplace-ai-chat__welcome-spacer-bottom" />
          </div>
        )}
      </div>
    );
  },
);
