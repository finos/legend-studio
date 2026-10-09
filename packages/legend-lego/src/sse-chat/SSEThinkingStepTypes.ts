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

/**
 * Status of a single step in an SSE-driven "thinking" / progress stepper.
 *
 * This type is deliberately independent of `legend-ai`'s
 * `LegendAIThinkingStep`/`LegendAIThinkingStepStatus` — that model is driven
 * imperatively by an orchestrator calling `addThinkingStep`/
 * `completeThinkingSteps` for a different chat pipeline. `SSEThinkingStep`
 * is for consumers whose backend streams progress over Server-Sent Events
 * and reports status via its own protocol-specific fields (e.g. an A2A
 * `kind: 'progress' | 'final'` discriminator); nothing in this module reads
 * SSE events or markdown text.
 */
export type SSEThinkingStepStatus = 'active' | 'done' | 'error';

/**
 * A single pre-classified progress step, ready to render. Consumers are
 * responsible for turning their own backend's protocol (SSE event fields,
 * polled status, etc.) into this shape *before* handing it to
 * `ThinkingStepsPanel` — this module does no text/event classification of
 * its own, by design, so it can't inherit the bugs that come from guessing
 * step boundaries out of rendered prose.
 */
export interface SSEThinkingStep {
  /** Stable identity for React list rendering and in-place step updates. */
  id: string;
  /** Human-readable description of what this step is doing. */
  label: string;
  status: SSEThinkingStepStatus;
}
