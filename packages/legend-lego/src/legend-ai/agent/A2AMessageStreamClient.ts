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
  AbstractServerClient,
  TracerService,
  guaranteeNonEmptyString,
  guaranteeNonNullable,
  readSSEStream,
  uuid,
} from '@finos/legend-shared';

/** One exchange of an earlier conversation: what was asked and what the agent answered. */
export interface A2AChatTurn {
  question: string;
  response: string;
}

/** One user turn sent to an A2A agent. */
export interface A2AMessageStreamTurn {
  conversationId: string;
  text: string;
  /** Sent as the message's `metadata`, for what the agent needs beyond the text */
  metadata?: Record<string, unknown> | undefined;
  /** The conversation so far, sent with the message (`formatA2AChatHistory`) */
  history?: A2AChatTurn[] | undefined;
}

// Legend AI's convention for a conversation sent with a message, as Legend
// Query's chat already sends it: one text part, before the message, that the
// agent reads as context rather than as the question.
const CHAT_HISTORY_PREFIX = 'Chat History:';

/**
 * *turns* as the conversation part Legend AI reads, `Chat History: customer:
 * ...\nassistant: ...`. The agent keeps a conversation only in its own memory,
 * which a restart or another replica does not have, so the chat sends it.
 */
export const formatA2AChatHistory = (turns: A2AChatTurn[]): string =>
  `${CHAT_HISTORY_PREFIX} ${turns
    .map((turn) => `customer: ${turn.question}\nassistant: ${turn.response}`)
    .join('\n')}`;

/** The A2A `message/stream` JSON-RPC body for `turn`. */
export const buildA2AMessageStreamPayload = (
  turn: A2AMessageStreamTurn,
): Record<string, unknown> => ({
  jsonrpc: '2.0',
  id: uuid(),
  method: 'message/stream',
  params: {
    message: {
      messageId: uuid(),
      role: 'user',
      parts: [
        ...(turn.history?.length
          ? [{ kind: 'text', text: formatA2AChatHistory(turn.history) }]
          : []),
        { kind: 'text', text: turn.text },
      ],
      context_id: turn.conversationId,
      ...(turn.metadata ? { metadata: turn.metadata } : {}),
    },
  },
});

/**
 * A client for an agent's A2A endpoint: JSON-RPC `message/stream` over HTTP,
 * answered as an SSE stream.
 */
export class A2AMessageStreamClient extends AbstractServerClient {
  constructor(
    agentUrl: string,
    getToken: () => string | undefined,
    tracer: TracerService = new TracerService(),
  ) {
    super({
      baseUrl: guaranteeNonEmptyString(agentUrl, 'The agent URL is required'),
      getAuthenticationToken: getToken,
    });
    this.setTracerService(tracer);
  }

  /** Send one turn, calling `onData` with each SSE event's data, in order. */
  async stream(
    turn: A2AMessageStreamTurn,
    signal: AbortSignal,
    onData: (data: string) => void,
  ): Promise<void> {
    const response = await this.post<Response>(
      guaranteeNonNullable(this.baseUrl),
      buildA2AMessageStreamPayload(turn),
      { signal },
      { Accept: 'text/event-stream', conversation_id: turn.conversationId },
      undefined,
      undefined,
      // The raw response, so its body can be read as it streams.
      { skipProcessing: true },
    );
    if (!response.body) {
      throw new Error('The agent returned an empty reply.');
    }
    await readSSEStream(response.body, onData);
  }
}
