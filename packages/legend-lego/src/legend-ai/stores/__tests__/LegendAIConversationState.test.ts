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

import { describe, expect, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { LegendAIMessageRole } from '../../LegendAITypes.js';
import {
  LegendAIConversationState,
  MAX_HISTORY_TURNS,
  createLegendAIChatMessage,
  type LegendAITurnStreamer,
} from '../LegendAIConversationState.js';

const answerEvent = (text: string): string =>
  JSON.stringify({
    result: {
      kind: 'status-update',
      status: { message: { role: 'agent', parts: [{ kind: 'text', text }] } },
    },
  });

const OPTIONS = {
  placeholder: 'Thinking…',
  emptyReplyText: 'No reply.',
  failureText: (message: string): string => `Failed: ${message}`,
};

const withReply = (): {
  state: LegendAIConversationState;
  reply: ReturnType<typeof createLegendAIChatMessage>;
} => {
  const state = new LegendAIConversationState();
  const reply = createLegendAIChatMessage(
    LegendAIMessageRole.ASSISTANT,
    OPTIONS.placeholder,
    true,
  );
  state.addMessage(reply);
  return { state, reply };
};

describe(unitTest('LegendAIConversationState'), () => {
  test('a turn streams into its reply and returns the answer', async () => {
    const { state, reply } = withReply();
    const seen: string[] = [];
    const streamer: LegendAITurnStreamer = (_signal, onData) => {
      onData(answerEvent('Hello'));
      seen.push(state.messages[0]?.text ?? '');
      onData(answerEvent('world'));
      return Promise.resolve();
    };

    const answer = await state.streamTurn(reply, streamer, OPTIONS);

    expect(answer).toBe('Hello\nworld');
    expect(seen).toEqual(['Hello']);
    expect(state.messages[0]).toEqual(
      expect.objectContaining({ text: 'Hello\nworld', isStreaming: false }),
    );
  });

  test('history keeps the latest answered exchanges, oldest first', async () => {
    const state = new LegendAIConversationState();
    const ask = (
      question: string,
      answer: string,
    ): Promise<string | undefined> =>
      state.streamTurn(
        createLegendAIChatMessage(LegendAIMessageRole.ASSISTANT, '', true),
        (_signal, onData) => {
          if (answer) {
            onData(answerEvent(answer));
          }
          return Promise.resolve();
        },
        { ...OPTIONS, question },
      );

    for (let i = 0; i < MAX_HISTORY_TURNS + 2; i++) {
      await ask(`q${i}`, `a${i}`);
    }
    await ask('unanswered', '');

    const history = state.history();
    expect(history).toHaveLength(MAX_HISTORY_TURNS);
    expect(history[0]).toEqual({ question: 'q2', response: 'a2' });
    expect(history.at(-1)).toEqual({
      question: `q${MAX_HISTORY_TURNS + 1}`,
      response: `a${MAX_HISTORY_TURNS + 1}`,
    });
  });

  test('a turn with no answer says so', async () => {
    const { state, reply } = withReply();

    const answer = await state.streamTurn(
      reply,
      () => Promise.resolve(),
      OPTIONS,
    );

    expect(answer).toBe('');
    expect(state.messages[0]?.text).toBe('No reply.');
  });

  test('a failed turn is written into its reply as an error', async () => {
    const { state, reply } = withReply();

    const answer = await state.streamTurn(
      reply,
      () => Promise.reject(new Error('offline')),
      OPTIONS,
    );

    expect(answer).toBeUndefined();
    expect(state.messages[0]).toEqual(
      expect.objectContaining({ text: 'Failed: offline', isError: true }),
    );
  });

  test('a stopped turn keeps what it said, without an error', async () => {
    const { state, reply } = withReply();
    const streamer: LegendAITurnStreamer = (signal, onData) => {
      onData(answerEvent('Partial'));
      state.stop();
      const error = new Error('aborted');
      error.name = 'AbortError';
      return signal.aborted ? Promise.reject(error) : Promise.resolve();
    };

    const answer = await state.streamTurn(reply, streamer, OPTIONS);

    expect(answer).toBeUndefined();
    expect(state.messages[0]).toEqual(
      expect.objectContaining({ text: 'Partial', isError: false }),
    );
  });

  test('a progress note appears with its first line and grows', () => {
    const state = new LegendAIConversationState();
    const note = state.progressNote();
    expect(state.messages).toHaveLength(0);

    note('Checking');
    note('Compiling');
    note('Compiled', true);

    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]?.text).toBe('- Checking\n- Compiled');
  });

  test('disposing stops the turn in flight', () => {
    const { state, reply } = withReply();
    let signal: AbortSignal | undefined;

    // The streamer never settles, so the turn is left pending.
    state
      .streamTurn(
        reply,
        (s) => {
          signal = s;
          return new Promise(() => undefined);
        },
        OPTIONS,
      )
      .catch(() => undefined);
    state.dispose();

    expect(signal?.aborted).toBe(true);
    expect(state.isDisposed).toBe(true);
  });
});
