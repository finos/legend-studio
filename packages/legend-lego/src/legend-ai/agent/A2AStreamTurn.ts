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
  LegendAIThinkingStepStatus,
  type LegendAIThinkingStep,
} from '../LegendAITypes.js';

/**
 * Reading an A2A `message/stream` reply. Each SSE event is a JSON-RPC result
 * whose text parts carry three things, told apart by content because all
 * are `kind: "text"` (some conversation bridges drop `kind: "data"` parts):
 *
 * - a thinking step: a JSON envelope `{<thought marker>: {stage, text, completed, is_error}}`;
 * - something this chat cannot render (e.g. a widget envelope), dropped
 *   rather than shown as raw JSON;
 * - anything else: the answer, accumulated across events.
 *
 * The user's own message is echoed back (as a status message and in task
 * history) and is skipped, or every reply would start with the question.
 */

export interface A2APart {
  kind?: string;
  text?: string;
}

interface A2AMessage {
  role?: string;
  parts?: A2APart[];
}

interface A2AResult extends A2AMessage {
  kind?: string;
  status?: { message?: A2AMessage };
  artifact?: { parts?: A2APart[] };
  artifacts?: { parts?: A2APart[] }[];
}

export interface A2AStreamMarkers {
  /** The envelope key of a thinking step */
  thought: string;
  /** Envelope keys of parts to drop */
  ignored: string[];
}

export const DEFAULT_A2A_STREAM_MARKERS: A2AStreamMarkers = {
  thought: 'stream_thinking_data',
  ignored: ['a2ui_response'],
};

/** What one event adds to the turn. */
export interface A2AStreamEventUpdate {
  steps: LegendAIThinkingStep[];
  /** Answer text the event added, already deduplicated */
  text: string;
  error: string | undefined;
}

/** The JSON envelope a text part carries, if it mentions `marker`. */
export const readJsonEnvelope = (
  part: A2APart,
  marker: string,
): Record<string, unknown> | undefined => {
  const text = part.kind === 'text' ? (part.text ?? '') : '';
  // The cheap test first: most answer parts are prose.
  if (!text.includes(marker)) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

const spoken = (message: A2AMessage | undefined): A2APart[] =>
  message?.role === 'user' ? [] : (message?.parts ?? []);

/** Every part of `result` the agent said, wherever the event carries it. */
export const extractA2AAgentParts = (result: A2AResult): A2APart[] => [
  ...spoken(result.status?.message),
  ...(result.artifact?.parts ?? []),
  ...(result.kind === 'message' ? spoken(result) : []),
  ...(result.artifacts ?? []).flatMap((artifact) => artifact.parts ?? []),
];

const stepOf = (
  part: A2APart,
  marker: string,
): LegendAIThinkingStep | undefined => {
  const payload = readJsonEnvelope(part, marker)?.[marker] as
    | Record<string, unknown>
    | undefined;
  if (!payload) {
    return undefined;
  }
  const label = String(payload.text ?? payload.stage ?? '');
  return {
    id: String(payload.stage ?? label),
    label,
    status: payload.is_error
      ? LegendAIThinkingStepStatus.ERROR
      : payload.completed
        ? LegendAIThinkingStepStatus.DONE
        : LegendAIThinkingStepStatus.ACTIVE,
  };
};

/**
 * Read one SSE event's data into what it adds to the answer so far. An event
 * repeating text already shown (a final event restating the whole answer)
 * adds nothing.
 */
export const parseA2AStreamEvent = (
  data: string,
  answerSoFar: string,
  markers: A2AStreamMarkers = DEFAULT_A2A_STREAM_MARKERS,
): A2AStreamEventUpdate => {
  const update: A2AStreamEventUpdate = {
    steps: [],
    text: '',
    error: undefined,
  };
  let event: { result?: A2AResult; error?: { message?: string } };
  try {
    event = JSON.parse(data) as typeof event;
  } catch {
    return update;
  }
  if (event.error) {
    update.error = event.error.message ?? 'The agent returned an error.';
    return update;
  }
  const answer: string[] = [];
  for (const part of event.result ? extractA2AAgentParts(event.result) : []) {
    const step = stepOf(part, markers.thought);
    if (step) {
      update.steps.push(step);
    } else if (
      part.kind === 'text' &&
      part.text &&
      !markers.ignored.some((marker) =>
        Boolean(readJsonEnvelope(part, marker)?.[marker]),
      )
    ) {
      answer.push(part.text);
    }
  }
  const chunk = answer.join('\n');
  if (chunk && !answerSoFar.endsWith(chunk)) {
    update.text = chunk;
  }
  return update;
};

/** One turn's answer and thinking steps, folded from its events in order. */
export class A2AStreamTurn {
  answer = '';
  private readonly stepsById = new Map<string, LegendAIThinkingStep>();

  /** `now` times each step, from its first event to the one that ends it. */
  constructor(
    private readonly markers: A2AStreamMarkers = DEFAULT_A2A_STREAM_MARKERS,
    private readonly now: () => number = Date.now,
  ) {}

  /** Fold one event's `data` in; throws the error the agent reported. */
  add(data: string): void {
    const update = parseA2AStreamEvent(data, this.answer, this.markers);
    if (update.error) {
      throw new Error(update.error);
    }
    // One time per event: a step that starts and ends in it takes no time.
    const now = this.now();
    update.steps.forEach((step) => {
      const seen = this.stepsById.get(step.id);
      const ended = step.status !== LegendAIThinkingStepStatus.ACTIVE;
      this.stepsById.set(step.id, {
        ...step,
        startedAt: seen?.startedAt ?? now,
        endedAt: ended ? (seen?.endedAt ?? now) : undefined,
      });
    });
    if (update.text) {
      this.answer = this.answer
        ? `${this.answer}\n${update.text}`
        : update.text;
    }
  }

  get steps(): LegendAIThinkingStep[] {
    return [...this.stepsById.values()];
  }
}
