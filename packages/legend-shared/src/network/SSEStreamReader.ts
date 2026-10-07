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

const SSE_DATA_PREFIX = 'data:';
const SSE_DONE_MARKER = '[DONE]';

/**
 * Read a `fetch` response body as a stream of Server-Sent Events, invoking
 * `onEvent` with each event's `data:` payload — every `data:` line in the
 * event joined with `\n` per the SSE spec, trimmed. Does NOT parse the
 * payload itself (JSON or otherwise): that's entirely up to the caller,
 * since the payload shape is whatever the specific backend protocol defines.
 * This function only implements the generic SSE *framing* every such
 * backend shares:
 *
 *   - CRLF / bare-CR → LF normalization, since servers vary in line-ending
 *     choice and a single `\n\n` split is only authoritative once
 *     normalized.
 *   - Blank-line event-boundary splitting, carrying a partial (not yet
 *     terminated) tail event over to the next chunk instead of dropping it.
 *   - A final flush for a trailing event that was never terminated by a
 *     blank line — some servers omit the trailing separator on the last
 *     event before closing the connection.
 *   - Skipping SSE comment / keep-alive lines (e.g. `: ping`) and any event
 *     that carries no `data:` field at all, per the SSE spec's "ignore
 *     events that dispatch no data" rule.
 *   - Skipping the conventional `data: [DONE]` end-of-stream sentinel used
 *     by many LLM/agent streaming APIs (not part of the SSE spec itself,
 *     but common enough across backends to handle once here).
 *
 * Cancellation is the caller's responsibility: abort the underlying
 * `fetch` (e.g. via the `AbortSignal` passed to it) and `reader.read()`
 * will reject, propagating out of this function same as any other stream
 * error.
 */
export const readSSEStream = async (
  body: ReadableStream<Uint8Array>,
  onEvent: (data: string) => void,
): Promise<void> => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Process a single fully-buffered SSE event (already normalized to LF
  // line endings, with the trailing blank line stripped).
  const processEvent = (event: string): void => {
    const dataLines: string[] = [];
    for (const line of event.split('\n')) {
      if (!line.startsWith(SSE_DATA_PREFIX)) {
        continue;
      }
      let fieldValue = line.slice(SSE_DATA_PREFIX.length);
      if (fieldValue.startsWith(' ')) {
        fieldValue = fieldValue.slice(1);
      }
      dataLines.push(fieldValue);
    }
    if (dataLines.length === 0) {
      return;
    }
    const dataStr = dataLines.join('\n').trim();
    if (!dataStr || dataStr === SSE_DONE_MARKER) {
      return;
    }
    onEvent(dataStr);
  };

  // Drain a fully-buffered chunk of SSE stream text, dispatching any
  // complete events and returning the residual (partial) tail.
  const drainBuffer = (chunk: string, isFinal: boolean): string => {
    const normalized = chunk.replaceAll(/\r\n|\r/g, '\n');
    const events = normalized.split('\n\n');
    const tail = isFinal ? '' : (events.pop() ?? '');
    for (const event of events) {
      if (event.length === 0) {
        continue;
      }
      processEvent(event);
    }
    return tail;
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    buffer = drainBuffer(buffer, false);
  }
  // Flush any trailing bytes and dispatch a final event that was not
  // terminated by a blank line.
  buffer += decoder.decode();
  if (buffer.length > 0) {
    drainBuffer(buffer, true);
  }
};
