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

import {
  handleDownloadFetch,
  handleDownloadMessage,
} from './DownloadHelper.js';

// following https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers#updating_your_service_worker
// install -> activate
// ad event listen for message, fetch event

function handleInstall(): void {
  //forces the waiting service worker to become the active service worker.
  (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
}

function handleActivate(event: ExtendableEvent): void {
  event.waitUntil(
    (self as unknown as ServiceWorkerGlobalScope).clients.claim(),
  );
}

(self as unknown as ServiceWorkerGlobalScope).addEventListener(
  'install',
  handleInstall,
);

(self as unknown as ServiceWorkerGlobalScope).addEventListener(
  'activate',
  handleActivate,
);

function handleMessage(event: ExtendableMessageEvent): void {
  handleDownloadMessage(event);
}

(self as unknown as ServiceWorkerGlobalScope).addEventListener(
  'message',
  handleMessage,
);

function handleFetch(event: FetchEvent): void {
  handleDownloadFetch(event);
}

(self as unknown as ServiceWorkerGlobalScope).addEventListener(
  'fetch',
  handleFetch,
);
