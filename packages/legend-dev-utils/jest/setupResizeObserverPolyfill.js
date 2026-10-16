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

import { ResizeObserver } from '@juggle/resize-observer';

/**
 * Replaces the no-op `ResizeObserver` installed by `setupDOMPolyfills` with the
 * `@juggle/resize-observer` polyfill. Import this at the top of a test file (or
 * list it in `setupFiles` after `setupDOMPolyfills`) when the test mocks element
 * sizes (e.g. `offsetWidth`, `getClientRects()`) and needs resize callbacks.
 *
 * NOTE: the polyfill calls `getComputedStyle()` on every observed element after
 * every DOM mutation, which is slow in jsdom, so only opt in where it is needed.
 */
window.ResizeObserver = ResizeObserver;
