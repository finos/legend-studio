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
 *
 * @jest-environment jsdom
 */

import { test, expect } from '@jest/globals';
import { unitTest } from '../jest/testUtils.js';
import '../jest/setupDOMPolyfills.js';

const observeResizes = async (element) => {
  let calls = 0;
  const observer = new window.ResizeObserver(() => {
    calls++;
  });
  observer.observe(element);
  // the polyfill checks for resizes on the next animation frame
  await new Promise((resolve) => setTimeout(resolve, 100));
  observer.disconnect();
  return calls;
};

// jsdom has no layout, so mock the size a browser would report
const createSizedElement = () => {
  const element = document.createElement('div');
  element.style.width = '100px';
  element.style.height = '50px';
  Object.defineProperty(element, 'offsetWidth', { value: 100 });
  Object.defineProperty(element, 'offsetHeight', { value: 50 });
  document.body.appendChild(element);
  return element;
};

test(
  unitTest('The DOM setup installs a ResizeObserver that never calls back'),
  async () => {
    expect(await observeResizes(createSizedElement())).toBe(0);
  },
);

test(unitTest('Tests can opt in to the ResizeObserver polyfill'), async () => {
  await import('../jest/setupResizeObserverPolyfill.js');
  expect(await observeResizes(createSizedElement())).toBe(1);
  // an element jsdom measures as 0x0 is never reported
  expect(await observeResizes(document.createElement('div'))).toBe(0);
});
