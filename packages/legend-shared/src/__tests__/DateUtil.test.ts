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

import { test, expect } from '@jest/globals';
import { prettyDuration } from '../date/DateUtils.js';
import { unitTest } from '../__test-utils__/TestUtils.js';

test(unitTest('Test Pretty Duration'), () => {
  expect(prettyDuration(400)).toEqual('');
  expect(prettyDuration(10400)).toEqual('10 seconds');
  expect(prettyDuration(61000)).toEqual('1 minute 1 second');
  expect(prettyDuration(61500)).toEqual('1 minute 1 second');
  expect(prettyDuration(600000)).toEqual('10 minutes');
  expect(prettyDuration(3855000)).toEqual('1 hour 4 minutes 15 seconds');

  expect(prettyDuration(400, { ms: true })).toEqual('400 ms');
  expect(prettyDuration(10400, { ms: true })).toEqual('10 seconds 400 ms');
  expect(prettyDuration(61000, { ms: true })).toEqual('1 minute 1 second');
  expect(prettyDuration(61500, { ms: true })).toEqual(
    '1 minute 1 second 500 ms',
  );
  expect(prettyDuration(600000, { ms: true })).toEqual('10 minutes');
  expect(prettyDuration(3855000, { ms: true })).toEqual(
    '1 hour 4 minutes 15 seconds',
  );
});
