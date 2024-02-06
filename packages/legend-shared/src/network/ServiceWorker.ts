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
} from './ServiceWorkerHelper.js';

declare const self: ServiceWorkerGlobalScope;

function handleInstall(event: ExtendableEvent): void {
  event.waitUntil(self.skipWaiting());
}

function handleActivate(event: ExtendableEvent): void {
  event.waitUntil(self.clients.claim());
}

function handleMessage(event: ExtendableMessageEvent): void {
  handleDownloadMessage(event);
}

function handleFetch(event: FetchEvent): void {
  handleDownloadFetch(event);
}

self.addEventListener('install', handleInstall);
self.addEventListener('activate', handleActivate);
self.addEventListener('message', handleMessage);
self.addEventListener('fetch', handleFetch);
