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

import { TextEncoder, TextDecoder } from 'util';

// Polyfills

/**
 * jsdom has no `ResizeObserver`, so we install one that observes nothing:
 * code that creates observers runs, but no resize callback ever fires.
 *
 * NOTE: this is what a real polyfill (e.g. `@juggle/resize-observer`) amounts to
 * in jsdom anyway: jsdom has no layout, every element reports a zero size and no
 * client rects, so the polyfill treats them all as hidden and never calls back.
 * It still calls `getComputedStyle()` on every observed element after every DOM
 * mutation though, and jsdom answers that by matching every style rule on the
 * page, which made large component tests several times slower.
 *
 * A test that mocks element sizes and needs resize callbacks can opt in to the
 * polyfill with `@finos/legend-dev-utils/jest/setupResizeObserverPolyfill`.
 */
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// https://github.com/jsdom/jsdom/issues/2524
window.TextEncoder = TextEncoder;
window.TextDecoder = TextDecoder;

document.fonts = {
  load: () => Promise.resolve([]),
  check: () => true,
};
