/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { noop } from 'Utilities/GeneralUtil';

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

export const integration = (testName: string): string => `[INTEGRATION] ${testName}`;
export const unit = (testName: string): string => `[UNIT] ${testName}`;

/**
 * This helps with restoring mocked/spyed object that works with Typescript.
 * Note that we rarely call this function since this restoring mocks only work with `jest.spyOn`
 * and for those, we can conveniently call `jest.restoreAllMocks` or set `restoreMocks: true` in Jest config
 * See https://jestjs.io/docs/en/mock-function-api#mockfnmockrestore
 * See https://jestjs.io/docs/en/jest-object#jestrestoreallmocks
 *
 * For cases where we stub the implementation using `jest.fn` we have to store the original implementation and restore it
 * manually, for example:
 *
 *    const originalFn = moduleA.fn;
 *    moduleA.fn = jest.fn().mockResolvedValue({});
 *    ...
 *    moduleA.fn = originalFn;
 */
export const restoreMock = (mocked: unknown): void => (mocked as jest.Mock).mockRestore();
export const asMock = (mock: unknown): jest.Mock => mock as jest.Mock;
