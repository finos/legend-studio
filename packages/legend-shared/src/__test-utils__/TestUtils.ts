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

import { prettyDOM } from '@testing-library/dom';
import { noop, type SuperGenericFunction } from '../CommonUtils.js';
import { jest } from '@jest/globals';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

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

export const outputDOM = (element: Element) => {
  writeFileSync(
    resolve(process.cwd(), 'test.html'),
    prettyDOM(element, 100000, { highlight: false }).toString(),
  );
};

/**
 * Currently, `jest-extended` augments the matchers from @types/jest instead of expect (or @jest/expect)
 * so we're stubbing this type for now.
 * See https://github.com/facebook/jest/issues/12424
 * See https://github.com/DefinitelyTyped/DefinitelyTyped/pull/62037
 */
export type TEMPORARY__JestMatcher = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * This is a more ergonomic way to type mocks produced by `jest.fn`
 * See https://github.com/facebook/jest/issues/12479
 */
export const createMock = <T extends SuperGenericFunction>(
  reference?: T,
): jest.Mock<T> => jest.fn(reference);

/**
 * Since `jest.spyOn` has not been made global, this is just
 * a more ergonomic version of it
 * See https://github.com/jest-community/eslint-plugin-jest/issues/35#issuecomment-388386336
 */
export const createSpy = jest.spyOn;

// TODO: move this function to `dev-utils` when we add typings to that package
export const MOCK__reactOIDCContext = {
  __esModule: true,
  withAuthenticationRequired: (component: React.ComponentType) => component,
  withAuth: (component: React.ComponentType) => component,
  useAuth: jest.fn(() => ({
    isLoading: false,
    isAuthenticated: true,
    user: {
      profile: {
        name: 'Test User',
        sub: 'test-user-id',
        email: 'test@example.com',
      },
      access_token: 'mock-access-token',
    },
    signinRedirect: jest.fn(),
    signoutRedirect: jest.fn(),
    removeUser: jest.fn(),
    error: null,
    activeNavigator: 'window',
    settings: {},
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  hasAuthParams: () => false,
  useAuthUser: () => ({
    profile: {
      name: 'Test User',
      sub: 'test-user-id',
      email: 'test@example.com',
    },
    access_token: 'mock-access-token',
  }),
};
