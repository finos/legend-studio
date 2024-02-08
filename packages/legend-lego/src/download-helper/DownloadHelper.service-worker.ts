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

const TAG_REQUEST = 'download-request';
const TAG_RESPONSE = 'download-response';

const STREAM_CLOSED = '#stream-closed';
const STREAM_ABORTED = '#stream-aborted';

// will interact from `createWritableStreamFromMessageChannel`
function createReadableStreamFromMessagePort(
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

interface DownloadRequest {
  tag: string;
  filename: string;
  url: string;
}

const entries: Map<string, [ReadableStream, DownloadRequest, MessagePort]> =
  new Map();

export function handleDownloadMessage(event: ExtendableMessageEvent): void {
  const data = event.data as DownloadRequest;
  if (event.data && event.data.tag === TAG_REQUEST) {
    const port = event.ports[0];
    if (port === undefined) {
      throw new Error('Port 1 expected to handle download request');
    }
    const entry: [ReadableStream, DownloadRequest, MessagePort] = [
      createReadableStreamFromMessagePort(port),
      data,
      port,
    ];
    entries.set(data.url, entry);
    port.postMessage({ tag: TAG_RESPONSE, downloadUrl: data.url });
  }
}

function handleDownloadFetch(event: FetchEvent): void {
  const url = event.request.url;
  const entry = entries.get(url);

  if (entry) {
    entries.delete(url);
    const [stream, data] = entry;
    const { filename } = data;
    const headers = new Headers({
      'Content-Type': 'application/octet-stream; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      'Content-Security-Policy': "default-src 'none'",
    });
    // TODO: add trace
    // console.log('responding to ffetch', stream);
    event.respondWith(new Response(stream, { headers }));
  }
}

// ------------------ Service Worker Lifecycle ------------------

declare const self: ServiceWorkerGlobalScope;

function handleInstall(event: ExtendableEvent): void {
  // TODO: add trace
  // console.log('service worker install', event);
  event.waitUntil(self.skipWaiting());
}

function handleActivate(event: ExtendableEvent): void {
  // TODO: add trace
  // console.log('service worker activate', event);
  event.waitUntil(self.clients.claim());
}

function handleMessage(event: ExtendableMessageEvent): void {
  // TODO: add trace
  // console.log('service worker message', event);
  handleDownloadMessage(event);
}

function handleFetch(event: FetchEvent): void {
  // TODO: add trace
  // console.log('service worker fetch', event);
  handleDownloadFetch(event);
}

self.addEventListener('install', handleInstall);
self.addEventListener('activate', handleActivate);
self.addEventListener('message', handleMessage);
self.addEventListener('fetch', handleFetch);
