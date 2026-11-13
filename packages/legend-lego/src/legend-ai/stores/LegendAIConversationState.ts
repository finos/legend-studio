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

import { action, makeObservable, observable } from 'mobx';
import { assertErrorThrown, uuid } from '@finos/legend-shared';
import {
  LegendAIMessageRole,
  type LegendAIThinkingStep,
} from '../LegendAITypes.js';
import { A2AStreamTurn } from '../agent/A2AStreamTurn.js';
import type { A2AChatTurn } from '../agent/A2AMessageStreamClient.js';

// Exchanges sent back with each turn: enough for the agent to follow the
// conversation, bounded because every turn pays for them again.
export const MAX_HISTORY_TURNS = 20;

export interface LegendAIChatMessage {
  id: string;
  role: LegendAIMessageRole;
  text: string;
  steps: LegendAIThinkingStep[];
  isStreaming: boolean;
  isError: boolean;
}

/** Adds one line to a progress note; `replaceLast` overwrites the previous line. */
export type LegendAIProgressNote = (
  line: string,
  replaceLast?: boolean,
) => void;

/** Sends one turn, calling `onData` with each streamed event's data, in order. */
export type LegendAITurnStreamer = (
  signal: AbortSignal,
  onData: (data: string) => void,
) => Promise<void>;

export const createLegendAIChatMessage = (
  role: LegendAIMessageRole,
  text: string,
  isStreaming = false,
): LegendAIChatMessage => ({
  id: uuid(),
  role,
  text,
  steps: [],
  isStreaming,
  isError: false,
});

/**
 * A conversation with a streaming agent: its messages, whether a turn is in
 * flight, and streaming one turn's reply into a message.
 */
export class LegendAIConversationState {
  messages: LegendAIChatMessage[] = [];
  isSending = false;
  /** The exchanges with the agent, as sent and answered: what `history` gives back */
  private readonly turns: A2AChatTurn[] = [];

  private controller: AbortController | undefined;
  private disposed = false;

  constructor(
    /** A fresh fold per turn; e.g. with the agent's own stream markers */
    private readonly createTurn: () => A2AStreamTurn = () =>
      new A2AStreamTurn(),
  ) {
    makeObservable<LegendAIConversationState>(this, {
      messages: observable,
      isSending: observable,
      addMessage: action,
      updateMessage: action,
      setSending: action,
    });
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  addMessage(message: LegendAIChatMessage): void {
    this.messages.push(message);
  }

  updateMessage(id: string, change: Partial<LegendAIChatMessage>): void {
    const message = this.messages.find((m) => m.id === id);
    if (message) {
      Object.assign(message, change);
    }
  }

  setSending(isSending: boolean): void {
    this.isSending = isSending;
  }

  /** The latest exchanges with the agent, oldest first, to send with the next turn. */
  history(max = MAX_HISTORY_TURNS): A2AChatTurn[] {
    return this.turns.slice(-max);
  }

  /** A note from the assistant that is not a reply to a turn. */
  announce(text: string): void {
    this.addMessage(
      createLegendAIChatMessage(LegendAIMessageRole.ASSISTANT, text),
    );
  }

  /**
   * A note that grows a line at a time, for the steps of something the UI
   * does itself. It appears with its first line, so a step that says
   * nothing leaves no empty note.
   */
  progressNote(): LegendAIProgressNote {
    const note = createLegendAIChatMessage(LegendAIMessageRole.ASSISTANT, '');
    const lines: string[] = [];
    return (line: string, replaceLast = false): void => {
      if (lines.length === 0) {
        this.addMessage(note);
      }
      if (replaceLast && lines.length > 0) {
        lines.pop();
      }
      lines.push(`- ${line}`);
      this.updateMessage(note.id, { text: lines.join('\n') });
    };
  }

  /**
   * Stream one turn's reply into `reply`, showing `placeholder` until the
   * answer starts. Returns the answer -- `''` when the agent answered nothing --
   * and undefined when the turn failed or was stopped. A failure is written
   * into `reply` with `failureText`.
   */
  async streamTurn(
    reply: LegendAIChatMessage,
    streamer: LegendAITurnStreamer,
    options: {
      placeholder?: string | undefined;
      emptyReplyText: string;
      failureText: (message: string) => string;
      /** What was sent; kept with the answer for `history` */
      question?: string | undefined;
    },
  ): Promise<string | undefined> {
    const placeholder = options.placeholder ?? '';
    const controller = new AbortController();
    this.controller = controller;
    const turn = this.createTurn();
    try {
      await streamer(controller.signal, (data) => {
        turn.add(data);
        this.updateMessage(reply.id, {
          text: turn.answer || placeholder,
          steps: turn.steps,
        });
      });
      this.updateMessage(reply.id, {
        text: turn.answer || options.emptyReplyText,
        isStreaming: false,
      });
      if (options.question !== undefined && turn.answer) {
        this.turns.push({ question: options.question, response: turn.answer });
      }
      return turn.answer;
    } catch (error) {
      assertErrorThrown(error);
      // A thrown event error leaves the response open: stop reading it.
      controller.abort();
      const stopped = error.name === 'AbortError';
      this.updateMessage(reply.id, {
        text: stopped ? turn.answer : options.failureText(error.message),
        isStreaming: false,
        isError: !stopped,
      });
      return undefined;
    } finally {
      if (this.controller === controller) {
        this.controller = undefined;
      }
    }
  }

  /** Stop the turn in flight, keeping what it said so far. */
  stop(): void {
    this.controller?.abort();
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
  }
}
