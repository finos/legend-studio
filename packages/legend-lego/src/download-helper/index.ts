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

enum DOWNLOAD_EVENTS {
  TAG_REQUEST = 'download-request',
  TAG_RESPONSE = 'download-response',
  STREAM_CLOSED = '#stream-closed',
  STREAM_ABORTED = '#stream-aborted',
}

function createWritableStreamFromMessageChannel(
  channel: MessageChannel,
): WritableStream {
  return new WritableStream({
    write(chunk) {
      channel.port1.postMessage(chunk);
    },
    close() {
      channel.port1.postMessage(DOWNLOAD_EVENTS.STREAM_CLOSED);
    },
    abort() {
      channel.port1.postMessage(DOWNLOAD_EVENTS.STREAM_ABORTED);
      closeMessagePort(channel.port1);
      closeMessagePort(channel.port2);
    },
  });
}

function closeMessagePort(port: MessagePort): void {
  port.onmessage = null;
  port.close();
}

interface LegendApplicationDownloadRequest {
  tag: string;
  filename: string;
  url: string;
}

interface LegendApplicationTagResponse {
  tag: string;
  downloadUrl: string;
}

async function getServiceWorker(): Promise<ServiceWorker | undefined> {
  if (!('serviceWorker' in navigator)) {
    return Promise.reject(
      new Error(
        'Service worker is not available. Service Worker requires HTTPS protocol',
      ),
    );
  }
  return navigator.serviceWorker
    .getRegistration()
    .then((workerRegistration) => {
      if (workerRegistration === undefined) {
        return undefined;
      }
      const pending =
        workerRegistration.installing ?? workerRegistration.waiting;
      return (
        workerRegistration.active ??
        new Promise((resolve) => {
          // if not activated, add listener to waiting or installing registration
          const listener = (): void => {
            if (pending?.state === 'activated') {
              pending.removeEventListener('statechange', listener);
              resolve(workerRegistration.active ?? undefined);
            }
          };
          pending?.addEventListener('statechange', listener);
        })
      );
    });
}

function createDownloadRequest(
  filename: string,
): LegendApplicationDownloadRequest {
  const PREFIX = 6;
  const prefix = String(Math.random()).slice(-PREFIX);
  const url = new URL(`${prefix}/${filename}`, window.location.href).toString();
  return { tag: DOWNLOAD_EVENTS.TAG_REQUEST, filename, url };
}

function handleServiceWorkerDownloadResponse(
  event: MessageEvent<LegendApplicationTagResponse | undefined>,
): void {
  const data = event.data;
  if (data?.tag === DOWNLOAD_EVENTS.TAG_RESPONSE && data.downloadUrl.length) {
    openInIframe(data.downloadUrl);
  }
}

function openInIframe(src: string): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.hidden = true;
  iframe.src = src;
  document.body.appendChild(iframe);
  return iframe;
}

export async function downloadStream(
  responseBody: ReadableStream,
  filename: string,
): Promise<void> {
  // creates communication channel with service worker with response handler
  const channel = new MessageChannel();
  channel.port1.onmessage = handleServiceWorkerDownloadResponse;

  // grabs service worker and handles it download along with response channel port
  const serviceWorker = await getServiceWorker();
  if (!serviceWorker) {
    return;
  }
  const downloadRequest = createDownloadRequest(filename);
  serviceWorker.postMessage(downloadRequest, [channel.port2]);

  // creates new data stream over communication channel and pipes given stream in it
  responseBody
    .pipeTo(createWritableStreamFromMessageChannel(channel))
    .then(() => {
      // TODO: trace success
    })
    .catch(() => {
      // TODO: fail
    });
}

export function registerDownloadHelperServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register(new URL('./DownloadHelper.service-worker.js', import.meta.url))
      .then((reg) => {
        // TODO: add trace
        // console.debug('register service worker success', reg);
      })
      .catch((error) => {
        // TODO: add trace
        // console.debug('register service worker error', error);
      });
  }
}
