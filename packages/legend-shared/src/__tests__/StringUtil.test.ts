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

import { describe, expect, test } from '@jest/globals';
import { unitTest } from '../__test-utils__/TestUtils.js';
import {
  DEFAULT_TELEMETRY_MESSAGE_LENGTH_LIMIT,
  truncateMessageForTelemetry,
} from '../string/StringUtil.js';

describe(unitTest('truncateMessageForTelemetry'), () => {
  test(unitTest('leaves a short message untouched and unflagged'), () => {
    expect(truncateMessageForTelemetry('boom')).toEqual({
      message: 'boom',
      truncated: false,
    });
  });

  test(unitTest('does not truncate a message exactly at the limit'), () => {
    const message = 'x'.repeat(DEFAULT_TELEMETRY_MESSAGE_LENGTH_LIMIT);
    const result = truncateMessageForTelemetry(message);
    expect(result.truncated).toBe(false);
    expect(result.message).toHaveLength(DEFAULT_TELEMETRY_MESSAGE_LENGTH_LIMIT);
  });

  test(unitTest('truncates one character past the limit and flags it'), () => {
    const message = 'x'.repeat(DEFAULT_TELEMETRY_MESSAGE_LENGTH_LIMIT + 1);
    const result = truncateMessageForTelemetry(message);
    expect(result.truncated).toBe(true);
    expect(result.message).toHaveLength(DEFAULT_TELEMETRY_MESSAGE_LENGTH_LIMIT);
  });

  test(unitTest('caps a very long message to the limit'), () => {
    const result = truncateMessageForTelemetry('y'.repeat(100_000));
    expect(result.message).toHaveLength(DEFAULT_TELEMETRY_MESSAGE_LENGTH_LIMIT);
    expect(result.truncated).toBe(true);
  });

  test(unitTest('honours an explicit limit'), () => {
    expect(truncateMessageForTelemetry('abcdef', 3)).toEqual({
      message: 'abc',
      truncated: true,
    });
  });

  test(unitTest('handles an empty message'), () => {
    expect(truncateMessageForTelemetry('')).toEqual({
      message: '',
      truncated: false,
    });
  });
});
