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

import { useState } from 'react';
import {
  CaretDownIcon,
  CaretRightIcon,
  LoadingIcon,
  clsx,
} from '@finos/legend-art';
import type { LegendAIThinkingStepStatus } from '../LegendAITypes.js';
import { LegendAIElapsedTime } from './LegendAIElapsedTime.js';

export enum LegendAIProcessActivity {
  WORKING = 'working',
  WAITING = 'waiting',
  READY = 'ready',
}

const ACTIVITY_LABEL: Record<LegendAIProcessActivity, string> = {
  [LegendAIProcessActivity.WORKING]: 'Working',
  [LegendAIProcessActivity.WAITING]: 'Waiting on you',
  [LegendAIProcessActivity.READY]: 'Ready',
};

/** Something under way, timed from `startedAt` when given. */
export interface LegendAIProcessRunning {
  id: string;
  label: string;
  startedAt?: number | undefined;
}

export interface LegendAIProcessStep {
  id: string;
  label: string;
  statusLabel: string;
  /** Undefined for a step that has not started */
  status?: LegendAIThinkingStepStatus | undefined;
  /** Shown as the step's time; leave undefined when there is none to show */
  startedAt?: number | undefined;
  endedAt?: number | undefined;
  /** Shown on one line until the step is opened */
  detail?: string | undefined;
}

export const LegendAIProcessStepRow = (props: {
  step: LegendAIProcessStep;
}): React.ReactNode => {
  const { step } = props;
  const [open, setOpen] = useState(false);
  return (
    <li
      className={clsx(
        'legend-ai__process-step',
        step.status && `legend-ai__process-step--${step.status}`,
      )}
    >
      <button
        type="button"
        className="legend-ai__process-step-head"
        onClick={(): void => setOpen(!open)}
        aria-expanded={open}
        disabled={!step.detail}
      >
        <span className="legend-ai__process-step-dot" aria-hidden={true} />
        <span className="legend-ai__process-step-name">{step.label}</span>
        <span className="legend-ai__process-step-status">
          {step.statusLabel}
        </span>
        {step.startedAt !== undefined && (
          <LegendAIElapsedTime from={step.startedAt} to={step.endedAt} />
        )}
      </button>
      {step.detail && (
        <p
          className={clsx('legend-ai__process-step-detail', {
            'legend-ai__process-step-detail--open': open,
          })}
        >
          {step.detail}
        </p>
      )}
    </li>
  );
};

/**
 * A long-running process at a glance, above the conversation: its activity,
 * what is under way, what waits on the user, errors, and its steps on demand.
 */
export const LegendAIProcessPanel = (props: {
  title: string;
  subtitle?: string | undefined;
  activity: LegendAIProcessActivity;
  running?: LegendAIProcessRunning[] | undefined;
  /** What waits on the user, one line each */
  waiting?: string[] | undefined;
  errors?: string[] | undefined;
  steps?: LegendAIProcessStep[] | undefined;
}): React.ReactNode => {
  const {
    title,
    subtitle,
    activity,
    running = [],
    waiting = [],
    errors = [],
    steps = [],
  } = props;
  const [showSteps, setShowSteps] = useState(false);
  return (
    <div className="legend-ai__process">
      <div className="legend-ai__process-head">
        <span className="legend-ai__process-title">{title}</span>
        {subtitle && (
          <span className="legend-ai__process-subtitle">{subtitle}</span>
        )}
        <span
          className={`legend-ai__process-pill legend-ai__process-pill--${activity}`}
        >
          {ACTIVITY_LABEL[activity]}
        </span>
        {steps.length > 0 && (
          <button
            type="button"
            className="legend-ai__process-toggle"
            onClick={(): void => setShowSteps(!showSteps)}
            aria-expanded={showSteps}
          >
            {showSteps ? <CaretDownIcon /> : <CaretRightIcon />}
            {steps.length} {steps.length === 1 ? 'step' : 'steps'}
          </button>
        )}
      </div>
      {running.map((item) => (
        <div key={item.id} className="legend-ai__process-running">
          <span aria-hidden={true}>
            <LoadingIcon isLoading={true} />
          </span>
          {item.label}
          {item.startedAt !== undefined && (
            <LegendAIElapsedTime from={item.startedAt} />
          )}
        </div>
      ))}
      {waiting.map((line) => (
        <div key={line} className="legend-ai__process-waiting">
          {line}
        </div>
      ))}
      {errors.map((error) => (
        <div key={error} className="legend-ai__process-error" role="alert">
          {error}
        </div>
      ))}
      {showSteps && (
        <ol className="legend-ai__process-steps">
          {steps.map((step) => (
            <LegendAIProcessStepRow key={step.id} step={step} />
          ))}
        </ol>
      )}
    </div>
  );
};
