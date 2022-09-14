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

import { noop } from '../CommonUtils.js';

/**
 * This is a pass through worker, it will post message, but do not ever reply so `onmessage` and `onerror` are never called
 */
export class PassThruWorker {
  url: string | URL;

  constructor(url: string | URL) {
    this.url = url;
  }

  postMessage: (message: unknown) => void = noop();
  onmessageerror: (event: MessageEvent) => void = noop();
  onmessage: (event: MessageEvent) => void = noop();
  onerror: (event: ErrorEvent) => void = noop();
  addEventListener: (type: string, listener: EventListener) => void = noop();
  removeEventListener: (type: string, listener: EventListener) => void = noop();
  terminate: () => void = noop();
  dispatchEvent = (event: Event): boolean => true;
}

// TODO: move these functions to `dev-utils` when we add typings to that package
export const integrationTest = (testName: string): string =>
  `[INTEGRATION] ${testName}`;
export const unitTest = (testName: string): string => `[UNIT] ${testName}`;

/**
 * Currently, `jest-extended` augments the matchers from @types/jest instead of expect (or @jest/expect)
 * so we're stubbing this type for now.
 *
 * Also, the type of `jest.fn` is not compatible with a lot of mocks right now
 *
 * TODO: We will remove these when Jest sort this out
 * See https://github.com/facebook/jest/issues/12424
 */
export type TEMPORARY__JestMatcher = any; // eslint-disable-line @typescript-eslint/no-explicit-any
export type TEMPORARY__JestMock = any; // eslint-disable-line @typescript-eslint/no-explicit-any
