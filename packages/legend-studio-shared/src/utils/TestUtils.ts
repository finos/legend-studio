/**
 * Copyright Goldman Sachs
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

import { noop } from './CommonUtils';
import { configure as configureMobx } from 'mobx';

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
export const restoreMock = (mocked: unknown): void =>
  (mocked as jest.Mock).mockRestore();
export const asMock = (mock: unknown): jest.Mock => mock as jest.Mock;

/**
 * MobX makes some fields non-configurable or non-writable which would prevent spying/mocking/stubbing in your tests.
 * NOTE: Use with caution and only when needed - do not turn this off globally for all tests, otherwise you risk
 * false positives (passing tests with broken code).
 *
 * A small caveat is with the usage of `flow` with `makeObservable`, if we use the `flow(function* (args) { })` form,
 * the latter will treat these non-observable (stateless) fields (action, flow) as non-writable. So we have to call this
 * function at test environment setup (due to the fact that `flow` decorates the class property outside of `makeObservable`)
 * or change the function to use flow decorater form in `makeObservable`.
 *
 * See https://mobx.js.org/configuration.html#safedescriptors-boolean
 * See https://github.com/mobxjs/mobx/issues/2752
 */
export const MOBX__enableSpyOrMock = (): void => {
  configureMobx({ safeDescriptors: false });
};
export const MOBX__disableSpyOrMock = (): void => {
  configureMobx({ safeDescriptors: false });
};
