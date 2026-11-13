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
import {
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  LoadingIcon,
  TimesIcon,
  clsx,
} from '@finos/legend-art';
import {
  LegendAIThinkingStepStatus,
  type LegendAIThinkingStep,
} from '../LegendAITypes.js';
import { LegendAIElapsedTime } from './LegendAIElapsedTime.js';

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

/**
 * A reply's thinking steps under a fold toggle. Without `onToggle` there is
 * no toggle (e.g. while the reply is still being worked on). A step with a
 * `startedAt` shows its time; one whose end never arrives stops counting
 * once `isLive` is false, rather than ticking forever.
 */
export const LegendAIThinkingSteps = (props: {
  steps: LegendAIThinkingStep[];
  isOpen: boolean;
  toggleLabel: React.ReactNode;
  onToggle?: (() => void) | undefined;
  isLive?: boolean | undefined;
}): React.ReactNode => {
  const { steps, isOpen, toggleLabel, onToggle, isLive = false } = props;
  return (
    <div className="legend-ai__thinking">
      {onToggle && (
        <button
          type="button"
          className="legend-ai__thinking-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <span className="legend-ai__thinking-toggle-icon">
            {isOpen ? <CaretDownIcon /> : <CaretRightIcon />}
          </span>
          {toggleLabel}
        </button>
      )}
      {isOpen && (
        <div className="legend-ai__thinking-steps">
          {steps.map((step) => (
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
              {step.startedAt !== undefined &&
                (step.endedAt !== undefined || isLive) && (
                  <LegendAIElapsedTime
                    from={step.startedAt}
                    to={step.endedAt}
                  />
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
