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

import { useEffect, useRef, useState } from 'react';
import { clsx, ThumbsUpIcon, ThumbsDownIcon } from '@finos/legend-art';
import { useApplicationStore } from '@finos/legend-application';
import { LegendStudioUserDataHelper } from '../../__lib__/LegendStudioUserDataHelper.js';
import {
  LegendStudioTelemetryHelper,
  SHOWCASE_FEEDBACK_VOTE,
  type SHOWCASE_FEEDBACK_SURFACE,
} from '../../__lib__/LegendStudioTelemetryHelper.js';

const THANKS_DISPLAY_DURATION_MS = 2500;

/**
 * "Was this showcase helpful?" widget.
 *
 * v1 storage strategy: telemetry is the source of truth for aggregate
 * analysis (`showcase.viewer.feedback.submit`). The user's vote per
 * showcase is cached in browser `UserDataService` (localStorage) purely
 * so we can suppress re-prompting on revisit — there is no backend today.
 *
 * UX: once a user votes, the buttons are replaced with a brief
 * "Thanks for the feedback!" message and then the whole widget unmounts.
 * On subsequent visits to the same showcase, the widget renders nothing.
 */
export const ShowcaseFeedback = (props: {
  showcasePath: string;
  title?: string | undefined;
  surface: SHOWCASE_FEEDBACK_SURFACE;
  /** Optional CSS class hook so the two mount points can size / align. */
  className?: string | undefined;
}) => {
  const { showcasePath, title, surface, className } = props;
  const applicationStore = useApplicationStore();
  const alreadyVoted = Boolean(
    LegendStudioUserDataHelper.showcaseFeedback_getVote(
      applicationStore.userDataService,
      showcasePath,
    ),
  );
  const [phase, setPhase] = useState<'prompt' | 'thanks' | 'done'>(
    alreadyVoted ? 'done' : 'prompt',
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(
    () => (): void => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const submit = (vote: SHOWCASE_FEEDBACK_VOTE): void => {
    LegendStudioUserDataHelper.showcaseFeedback_recordVote(
      applicationStore.userDataService,
      {
        showcasePath,
        vote: vote === SHOWCASE_FEEDBACK_VOTE.UP ? 'up' : 'down',
      },
    );
    LegendStudioTelemetryHelper.logEvent_ShowcaseFeedbackSubmit(
      applicationStore.telemetryService,
      {
        showcasePath,
        title,
        vote,
        surface,
      },
    );
    setPhase('thanks');
    timeoutRef.current = setTimeout(() => {
      setPhase('done');
    }, THANKS_DISPLAY_DURATION_MS);
  };

  if (phase === 'done') {
    return null;
  }

  if (phase === 'thanks') {
    return (
      <div
        className={clsx('showcase-feedback', className)}
        role="status"
        aria-live="polite"
      >
        <div className="showcase-feedback__prompt">
          Thanks for the feedback!
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('showcase-feedback', className)}>
      <div className="showcase-feedback__prompt">Was this helpful?</div>
      <button
        type="button"
        className="showcase-feedback__btn"
        tabIndex={-1}
        title="Thumbs up"
        onClick={() => submit(SHOWCASE_FEEDBACK_VOTE.UP)}
      >
        <ThumbsUpIcon />
      </button>
      <button
        type="button"
        className="showcase-feedback__btn"
        tabIndex={-1}
        title="Thumbs down"
        onClick={() => submit(SHOWCASE_FEEDBACK_VOTE.DOWN)}
      >
        <ThumbsDownIcon />
      </button>
    </div>
  );
};
