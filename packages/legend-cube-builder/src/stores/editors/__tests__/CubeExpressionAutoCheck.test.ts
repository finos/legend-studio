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

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import {
  CUBE_EXPRESSION_CHECK_DELAY_MS,
  CubeExpressionAutoCheck,
} from '../CubeExpressionAutoCheck.js';

/** A check that ends when told to */
const deferredCheck = (): {
  check: jest.Mock<() => Promise<void>>;
  finish: () => Promise<void>;
} => {
  let resolve: (() => void) | undefined;
  const check = jest.fn(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      }),
  );
  return {
    check,
    finish: async () => {
      resolve?.();
      // the check's promise settles, then the re-run starts
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    },
  };
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Pure code checked as it is typed', () => {
  test('Checks once typing pauses, once for every edit before the pause', () => {
    const { check } = deferredCheck();
    const auto = new CubeExpressionAutoCheck(check);
    auto.schedule();
    jest.advanceTimersByTime(CUBE_EXPRESSION_CHECK_DELAY_MS - 100);
    auto.schedule();
    jest.advanceTimersByTime(CUBE_EXPRESSION_CHECK_DELAY_MS - 100);
    expect(check).not.toHaveBeenCalled();
    expect(auto.isWaiting).toBe(true);
    jest.advanceTimersByTime(100);
    expect(check).toHaveBeenCalledTimes(1);
    expect(auto.isWaiting).toBe(false);
  });

  test('Checks again once a check ends, when the code changed while it ran, so the last code is the one checked', async () => {
    const { check, finish } = deferredCheck();
    const auto = new CubeExpressionAutoCheck(check);
    auto.schedule();
    jest.advanceTimersByTime(CUBE_EXPRESSION_CHECK_DELAY_MS);
    expect(check).toHaveBeenCalledTimes(1);
    // an edit while the check runs
    auto.schedule();
    jest.advanceTimersByTime(CUBE_EXPRESSION_CHECK_DELAY_MS);
    expect(check).toHaveBeenCalledTimes(1);
    await finish();
    expect(check).toHaveBeenCalledTimes(2);
    await finish();
    expect(check).toHaveBeenCalledTimes(2);
  });

  test('Checks at once on F10, and nothing once the editor closed', () => {
    const { check } = deferredCheck();
    const auto = new CubeExpressionAutoCheck(check);
    auto.schedule();
    auto.now();
    expect(check).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(CUBE_EXPRESSION_CHECK_DELAY_MS);
    expect(check).toHaveBeenCalledTimes(1);

    const closed = new CubeExpressionAutoCheck(check);
    closed.schedule();
    closed.dispose();
    jest.advanceTimersByTime(CUBE_EXPRESSION_CHECK_DELAY_MS);
    closed.now();
    expect(check).toHaveBeenCalledTimes(1);
  });
});
