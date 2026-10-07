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

import React, { useState } from 'react';
import { CaretDownIcon, CaretRightIcon, clsx } from '@finos/legend-art';
import type { SSEThinkingStep } from '../SSEThinkingStepTypes.js';

/**
 * Renders a collapsible panel of pre-classified SSE progress steps.
 *
 * This component does no SSE parsing, markdown handling, or text
 * classification of any kind — it only renders whatever `steps` it is
 * given. Any chat surface whose backend streams progress over SSE can use
 * this once it has translated its own protocol's progress signal into
 * `SSEThinkingStep[]` (see `SSEThinkingStepTypes.ts`).
 *
 * Each step is a frozen, one-time record of a single ping that already
 * happened — not a live entity transitioning between states — so there is
 * deliberately no per-step status icon (a spinner/check next to a historical
 * log line reads as "still in progress" even after the fact, which is
 * misleading once dozens of steps are sitting in a static list). `status`
 * is still carried on each step for callers that want to style it (e.g. an
 * `error` step in red via the `sse-thinking-steps-panel__step--error` class)
 * — callers that want a per-step glyph should bake it into `label` instead,
 * the way `GS_AgentChatStore`'s emoji-prefixed labels do.
 *
 * A fixed header row acts as the always-visible toggle for the collapsible
 * region holding all the steps. The region is open by default so the full
 * progress trace is visible alongside the response; users can collapse it
 * manually to keep the panel compact.
 */
export const ThinkingStepsPanel: React.FC<{
  steps: SSEThinkingStep[];
  /** Defaults to "💭 Thinking" — override for a different house style. */
  headerLabel?: string;
}> = ({ steps, headerLabel = '💭 Thinking' }) => {
  const [isOpen, setIsOpen] = useState(true);
  if (steps.length === 0) {
    return null;
  }
  return (
    <div className="sse-thinking-steps-panel">
      <button
        type="button"
        className="sse-thinking-steps-panel__header"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className="sse-thinking-steps-panel__header__label">
          {headerLabel}
        </span>
        <span className="sse-thinking-steps-panel__header__toggle">
          {isOpen ? <CaretDownIcon /> : <CaretRightIcon />} {steps.length}
        </span>
      </button>
      {isOpen && (
        <div className="sse-thinking-steps-panel__body">
          {steps.map((step) => (
            <div
              key={step.id}
              className={clsx(
                'sse-thinking-steps-panel__step',
                `sse-thinking-steps-panel__step--${step.status}`,
              )}
            >
              <span className="sse-thinking-steps-panel__step__label">
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
