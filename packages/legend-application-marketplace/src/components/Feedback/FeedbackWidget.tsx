/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconButton } from '@mui/material';
import {
  ChatIcon,
  StarIcon,
  SendIcon,
  TimesIcon,
  CheckCircleIcon,
  clsx,
} from '@finos/legend-art';
import { assertErrorThrown, LogEvent } from '@finos/legend-shared';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';
import { LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN } from '../../__lib__/LegendMarketplaceNavigation.js';
import type { FeedbackRequest } from '@finos/legend-server-marketplace';

const MAX_SUGGESTION_LENGTH = 1000;
const STAR_RATINGS = [1, 2, 3, 4, 5] as const;
const AUTO_CLOSE_DELAY_MS = 5000;

enum FeedbackWidgetState {
  IDLE = 'IDLE',
  SUBMITTING = 'SUBMITTING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export const FeedbackWidget = observer(() => {
  const baseStore = useLegendMarketplaceBaseStore();
  const applicationStore = baseStore.applicationStore;

  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [suggestion, setSuggestion] = useState('');
  const [submissionState, setSubmissionState] = useState<FeedbackWidgetState>(
    FeedbackWidgetState.IDLE,
  );
  const [isClosing, setIsClosing] = useState(false);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoCloseTimer = useCallback((): void => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, []);

  const resetForm = useCallback((): void => {
    setRating(0);
    setHoveredRating(0);
    setSuggestion('');
    setSubmissionState(FeedbackWidgetState.IDLE);
    setIsClosing(false);
    clearAutoCloseTimer();
  }, [clearAutoCloseTimer]);

  const handleToggle = useCallback((): void => {
    if (isOpen) {
      resetForm();
    }
    setIsOpen(!isOpen);
  }, [isOpen, resetForm]);

  const handleClose = useCallback((): void => {
    clearAutoCloseTimer();
    setIsClosing(true);
    setTimeout(() => {
      resetForm();
      setIsOpen(false);
    }, 300);
  }, [resetForm, clearAutoCloseTimer]);

  useEffect(() => {
    if (submissionState === FeedbackWidgetState.SUCCESS) {
      autoCloseTimerRef.current = setTimeout(() => {
        handleClose();
      }, AUTO_CLOSE_DELAY_MS);
    }
    return () => {
      clearAutoCloseTimer();
    };
  }, [submissionState, handleClose, clearAutoCloseTimer]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (rating === 0) {
      return;
    }

    setSubmissionState(FeedbackWidgetState.SUBMITTING);

    try {
      const username = applicationStore.identityService.currentUser;
      const originPage = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);
      const searchQuery =
        urlParams.get(
          LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN.QUERY,
        ) ?? '';
      const searchFilters =
        urlParams.get(
          LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN.USE_PRODUCER_SEARCH,
        ) === 'true'
          ? 'useProducerSearch=true'
          : '';

      const feedbackRequest: FeedbackRequest = {
        username,
        origin_page: originPage,
        query: searchQuery,
        filters: searchFilters,
        rating,
        suggestion: suggestion.trim(),
      };

      await baseStore.marketplaceServerClient.submitFeedback(feedbackRequest);

      LegendMarketplaceTelemetryHelper.logEvent_SubmitFeedback(
        applicationStore.telemetryService,
        originPage,
        rating,
      );

      setSubmissionState(FeedbackWidgetState.SUCCESS);
    } catch (error) {
      assertErrorThrown(error);
      applicationStore.logService.error(
        LogEvent.create(LEGEND_MARKETPLACE_APP_EVENT.SUBMIT_FEEDBACK_FAILURE),
        error,
      );
      setSubmissionState(FeedbackWidgetState.ERROR);
    }
  }, [applicationStore, baseStore.marketplaceServerClient, rating, suggestion]);

  const isSubmitDisabled =
    rating === 0 || submissionState === FeedbackWidgetState.SUBMITTING;

  return (
    <div className="legend-marketplace-feedback-widget">
      {isOpen && (
        <div
          className={clsx('legend-marketplace-feedback-widget__popup', {
            'legend-marketplace-feedback-widget__popup--closing': isClosing,
          })}
        >
          {submissionState === FeedbackWidgetState.SUCCESS ? (
            <div className="legend-marketplace-feedback-widget__success">
              <div className="legend-marketplace-feedback-widget__success-progress">
                <div className="legend-marketplace-feedback-widget__success-progress-bar" />
              </div>
              <CheckCircleIcon className="legend-marketplace-feedback-widget__success-icon" />
              <h3 className="legend-marketplace-feedback-widget__success-title">
                Thank you!
              </h3>
              <p className="legend-marketplace-feedback-widget__success-message">
                Your feedback has been submitted successfully.
              </p>
            </div>
          ) : (
            <>
              <div className="legend-marketplace-feedback-widget__header">
                <h3 className="legend-marketplace-feedback-widget__title">
                  Marketplace Feedback
                </h3>
                <IconButton
                  className="legend-marketplace-feedback-widget__header-close"
                  onClick={handleClose}
                  size="small"
                  title="Close feedback"
                >
                  <TimesIcon />
                </IconButton>
              </div>
              <div className="legend-marketplace-feedback-widget__body">
                <div className="legend-marketplace-feedback-widget__rating-section">
                  <label className="legend-marketplace-feedback-widget__label">
                    How would you rate your experience?
                  </label>
                  <div className="legend-marketplace-feedback-widget__stars">
                    {STAR_RATINGS.map((star) => (
                      <button
                        key={star}
                        className={clsx(
                          'legend-marketplace-feedback-widget__star',
                          {
                            'legend-marketplace-feedback-widget__star--active':
                              star <= (hoveredRating || rating),
                          },
                        )}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                      >
                        <StarIcon />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="legend-marketplace-feedback-widget__text-section">
                  <label className="legend-marketplace-feedback-widget__label">
                    Got ideas? We&apos;re all ears 👂 (optional)
                  </label>
                  <textarea
                    className="legend-marketplace-feedback-widget__textarea"
                    value={suggestion}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_SUGGESTION_LENGTH) {
                        setSuggestion(e.target.value);
                      }
                    }}
                    placeholder="Spill the tea ☕ — what would make Marketplace better?"
                    rows={4}
                  />
                  <span className="legend-marketplace-feedback-widget__char-count">
                    {suggestion.length}/{MAX_SUGGESTION_LENGTH}
                  </span>
                </div>
                {submissionState === FeedbackWidgetState.ERROR && (
                  <p className="legend-marketplace-feedback-widget__error">
                    Failed to submit feedback. Please try again.
                  </p>
                )}
              </div>
              <div className="legend-marketplace-feedback-widget__footer">
                <button
                  className={clsx(
                    'legend-marketplace-feedback-widget__submit-btn',
                    {
                      'legend-marketplace-feedback-widget__submit-btn--disabled':
                        isSubmitDisabled,
                    },
                  )}
                  onClick={() => {
                    // eslint-disable-next-line no-void
                    void handleSubmit();
                  }}
                  disabled={isSubmitDisabled}
                >
                  {submissionState === FeedbackWidgetState.SUBMITTING ? (
                    'Submitting...'
                  ) : (
                    <>
                      <SendIcon />
                      Submit
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <button
        className={clsx('legend-marketplace-feedback-widget__toggle', {
          'legend-marketplace-feedback-widget__toggle--active': isOpen,
        })}
        onClick={handleToggle}
        aria-label="Send feedback"
      >
        {isOpen ? <TimesIcon /> : <ChatIcon />}
      </button>
    </div>
  );
});
