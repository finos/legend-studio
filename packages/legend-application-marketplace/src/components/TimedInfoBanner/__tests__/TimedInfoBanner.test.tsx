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

import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, render, screen } from '@testing-library/react';
import { TimedInfoBanner } from '../TimedInfoBanner.js';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('renders its content immediately', () => {
  render(<TimedInfoBanner>Hello there</TimedInfoBanner>);

  expect(screen.getByText('Hello there')).toBeDefined();
});

test('collapses after the default 30 second delay', () => {
  render(<TimedInfoBanner>Hello there</TimedInfoBanner>);

  act(() => {
    jest.advanceTimersByTime(29_999);
  });
  expect(screen.getByText('Hello there')).toBeDefined();

  act(() => {
    jest.advanceTimersByTime(1);
  });
  // Let the Collapse exit transition finish before its content unmounts.
  act(() => {
    jest.advanceTimersByTime(1_000);
  });
  expect(screen.queryByText('Hello there')).toBeNull();
});

test('respects a custom auto-collapse delay', () => {
  render(
    <TimedInfoBanner autoCollapseAfterMs={5_000}>Hello there</TimedInfoBanner>,
  );

  act(() => {
    jest.advanceTimersByTime(5_000);
  });
  // Let the Collapse exit transition finish before its content unmounts.
  act(() => {
    jest.advanceTimersByTime(1_000);
  });

  expect(screen.queryByText('Hello there')).toBeNull();
});
