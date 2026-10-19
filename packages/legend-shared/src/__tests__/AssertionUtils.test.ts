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

import { test, expect } from '@jest/globals';
import { unitTest } from '../__test-utils__/TestUtils.js';
import { isFunction } from '../error/AssertionUtils.js';

test(unitTest('isFunction is only true for functions'), () => {
  [
    (): number => 1,
    function named(): number {
      return 1;
    },
    async (): Promise<number> => 1,
    class Example {},
    Math.max,
  ].forEach((value) => expect(isFunction(value)).toBe(true));
  [undefined, null, 0, 'function', {}, [], { call: (): number => 1 }].forEach(
    (value) => expect(isFunction(value)).toBe(false),
  );
});

test(
  unitTest('isFunction narrows a value-or-updater union to the updater'),
  () => {
    const apply = (
      updater: number | ((previous: number) => number),
      previous: number,
    ): number => (isFunction(updater) ? updater(previous) : updater);
    expect(apply(5, 1)).toBe(5);
    expect(apply((previous) => previous + 1, 1)).toBe(2);
  },
);
