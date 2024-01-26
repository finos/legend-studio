/**
 * Copyright (c) 2020-present, Goldman Sachs
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

const STREAM_CLOSED = '#stream-closed';
const STREAM_ABORTED = '#stream-aborted';

export function createWritableStreamFromMessageChannel(
  channel: MessageChannel,
): WritableStream {
  return new WritableStream({
    write(chunk) {
      channel.port1.postMessage(chunk);
    },
    close() {
      channel.port1.postMessage(STREAM_CLOSED);
    },
    abort() {
      channel.port1.postMessage(STREAM_ABORTED);
      closePort(channel.port1);
      closePort(channel.port2);
    },
  });
}

export function createReadableStreamFromMessagePort(
  port: MessagePort,
): ReadableStream {
  return new ReadableStream({
    start(controller) {
      port.onmessage = ({ data }) => {
        if (data === STREAM_CLOSED) {
          return controller.close();
        }
        if (data === STREAM_ABORTED) {
          controller.error('aborted');
          return undefined;
        }
        controller.enqueue(data);
        return undefined;
      };
    },
  });
}

function closePort(port: MessagePort): void {
  port.onmessage = null;
  port.close();
}
