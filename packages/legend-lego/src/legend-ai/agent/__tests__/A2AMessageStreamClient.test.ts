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
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  A2AMessageStreamClient,
  buildA2AMessageStreamPayload,
  type A2AMessageStreamTurn,
} from '../A2AMessageStreamClient.js';

const AGENT_URL = 'https://agent.example.com/';

const turn = (
  overrides: Partial<A2AMessageStreamTurn> = {},
): A2AMessageStreamTurn => ({
  conversationId: 'conv-1',
  text: 'Hello agent',
  ...overrides,
});

const messageOf = (payload: Record<string, unknown>): Record<string, unknown> =>
  (payload.params as { message: Record<string, unknown> }).message;

describe(unitTest('buildA2AMessageStreamPayload'), () => {
  test("sends the user's words as the one text part, on the conversation", () => {
    const payload = buildA2AMessageStreamPayload(turn());
    const message = messageOf(payload);

    expect(payload.method).toBe('message/stream');
    expect(message.role).toBe('user');
    expect(message.parts).toEqual([{ kind: 'text', text: 'Hello agent' }]);
    expect(message.context_id).toBe('conv-1');
    expect(message).not.toHaveProperty('metadata');
  });

  test('sends the metadata given', () => {
    const message = messageOf(
      buildA2AMessageStreamPayload(
        turn({ metadata: { legend: { mode: 'onboarding' } } }),
      ),
    );

    expect(message.metadata).toEqual({ legend: { mode: 'onboarding' } });
  });

  test('sends the conversation so far as a part before the words', () => {
    const message = messageOf(
      buildA2AMessageStreamPayload(
        turn({
          history: [
            { question: 'Hi', response: 'Hello' },
            { question: 'Onboard x', response: 'Done' },
          ],
        }),
      ),
    );

    expect(message.parts).toEqual([
      {
        kind: 'text',
        text: 'Chat History: customer: Hi\nassistant: Hello\ncustomer: Onboard x\nassistant: Done',
      },
      { kind: 'text', text: 'Hello agent' },
    ]);
  });

  test('sends no history part for an empty conversation', () => {
    const message = messageOf(
      buildA2AMessageStreamPayload(turn({ history: [] })),
    );

    expect(message.parts).toEqual([{ kind: 'text', text: 'Hello agent' }]);
  });
});

// jsdom has no `Response`: a stream read needs `ok`, `status` and a body
// whose reader yields the reply in `chunks`.
const sseResponse = (chunks: string[], status = 200): Response => {
  const encoded = chunks.map((chunk) => new TextEncoder().encode(chunk));
  return {
    ok: status < 300,
    status,
    statusText: '',
    url: AGENT_URL,
    headers: new Map(),
    text: () => Promise.resolve(chunks.join('')),
    body: {
      getReader: () => ({
        read: () =>
          Promise.resolve(
            encoded.length
              ? { done: false, value: encoded.shift() }
              : { done: true, value: undefined },
          ),
        cancel: () => Promise.resolve(),
      }),
    },
  } as unknown as Response;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const spyOnFetch = () => jest.spyOn(globalThis, 'fetch' as any);

describe(unitTest('A2AMessageStreamClient.stream'), () => {
  let fetchSpy: ReturnType<typeof spyOnFetch>;

  beforeEach(() => {
    fetchSpy = spyOnFetch();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  const lastRequest = (): RequestInit =>
    (fetchSpy.mock.calls.at(-1) as [string, RequestInit])[1];

  test("asks for an SSE reply, on the turn's conversation", async () => {
    fetchSpy.mockResolvedValueOnce(sseResponse(['data: {}\n\n']) as never);
    const controller = new AbortController();

    await new A2AMessageStreamClient(AGENT_URL, () => 'tok').stream(
      turn(),
      controller.signal,
      () => undefined,
    );

    const request = lastRequest();
    const headers = request.headers as Record<string, string>;
    expect(request.method).toBe('POST');
    expect(request.signal).toBe(controller.signal);
    expect(headers.Accept).toBe('text/event-stream');
    expect(headers.conversation_id).toBe('conv-1');
    expect(headers.Authorization).toBe('Bearer tok');
  });

  test('delivers each event of the reply, in order', async () => {
    fetchSpy.mockResolvedValueOnce(
      // One event split across chunks, as a network read may deliver it.
      sseResponse(['data: {"a":1}\r\n\r\ndata: {"b"', ':2}\r\n\r\n']) as never,
    );
    const data: string[] = [];

    await new A2AMessageStreamClient(AGENT_URL, () => undefined).stream(
      turn(),
      new AbortController().signal,
      (item) => data.push(item),
    );

    expect(data).toEqual(['{"a":1}', '{"b":2}']);
  });

  test('a failed request rejects', async () => {
    fetchSpy.mockResolvedValueOnce(sseResponse(['nope'], 500) as never);

    await expect(
      new A2AMessageStreamClient(AGENT_URL, () => undefined).stream(
        turn(),
        new AbortController().signal,
        () => undefined,
      ),
    ).rejects.toThrow();
  });
});
