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

import { isNonEmptyString } from '../error/AssertionUtils.js';

const TAG_REQUEST = 'download-request';
const TAG_RESPONSE = 'download-response';

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

function closePort(port: MessagePort): void {
  port.onmessage = null;
  port.close();
}

interface DownloadRequest {
  tag: string;
  filename: string;
  url: string;
}

interface TagResponse {
  tag: string;
  downloadUrl: string;
}

/**
 * @param {string|undefined} [clientUrl]
 * @returns {Promise<ServiceWorker | undefined>}
 */
export function getServiceWorker(
  clientUrl?: string | undefined,
): Promise<ServiceWorker | undefined> {
  if (!('serviceWorker' in navigator)) {
    return Promise.reject(
      new Error('Service worker is not available; HTTPS protocol is required.'),
    );
  }

  return navigator.serviceWorker.getRegistration(clientUrl).then((reg) => {
    if (reg === undefined) {
      return undefined;
    }
    const pending = reg.installing ?? reg.waiting;
    return (
      reg.active ??
      new Promise((resolve) => {
        const listener = (): void => {
          if (pending?.state === 'activated') {
            pending.removeEventListener('statechange', listener);
            resolve(reg.active ?? undefined);
          }
        };
        pending?.addEventListener('statechange', listener);
      })
    );
  });
}

/**
 * @param {ReadableStream} stream
 * @param {string} filename
 * @returns {Promise<void>}
 */
export async function download(
  stream: ReadableStream,
  filename: string,
): Promise<void> {
  // creates communication channel with service worker with response handler
  const channel = new MessageChannel();
  channel.port1.onmessage = handleDownloadResponse;

  // grabs service worker and handles it download along with response channel port
  const sw = await getServiceWorker();
  const downloadRequest = createDownloadRequest(filename);
  if (!sw) {
    return;
  }
  sw.postMessage(downloadRequest, [channel.port2]);

  // creates new data stream over communication channel and pipes given stream in it
  stream.pipeTo(createWritableStreamFromMessageChannel(channel));
}

/**
 * Main context creates new message to be passed to the service worker.
 * @param {string} filename
 * @returns {object}
 */
function createDownloadRequest(filename: string): DownloadRequest {
  const PREFIX = 6;
  const prefix = String(Math.random()).slice(-PREFIX);
  const url = new URL(`${prefix}/${filename}`, window.location.href).toString();
  return { tag: TAG_REQUEST, filename, url };
}

/**
 * Main context opens new download URL received from the service worker.
 * @param {MessageEvent} event
 */
function handleDownloadResponse(
  event: MessageEvent<TagResponse | undefined>,
): void {
  const data = event.data;

  if (data?.tag === TAG_RESPONSE && isNonEmptyString(data.downloadUrl)) {
    openInIframe(data.downloadUrl);
  }
}

/**
 * Main context opens given URL in new hidden IFRAME.
 * @param {string} src
 * @returns {HTMLIFrameElement}
 */
function openInIframe(src: string): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.hidden = true;
  iframe.src = src;
  document.body.appendChild(iframe);
  return iframe;
}
