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
import { unitTest } from '../__test-utils__/TestUtils.js';
import { Randomizer } from '../application/RandomizerUtils.js';

const NUMBER_OF_ITERATIONS = 10000;
const repeater = (fn: () => void, repeat = NUMBER_OF_ITERATIONS): void => {
  for (let i = 0; i < repeat; ++i) {
    fn();
  }
};

test(unitTest('Generate random numbers'), () => {
  const randomizer = new Randomizer();
  repeater(() => {
    const f = randomizer.getRandomFloat();
    expect(0 <= f && f <= 1).toBe(true);
  });
  repeater(() => {
    const d = randomizer.getRandomDouble();
    expect(0 <= d && d <= 1).toBe(true);
  });
  repeater(() => {
    const num = randomizer.getRandomWholeNumber();
    expect(num).toBeGreaterThanOrEqual(0);
  });
  expect(randomizer.getRandomWholeNumber(0)).toBe(0);
  repeater(() => {
    const num = randomizer.getRandomWholeNumber(10);
    expect(num).toBeLessThanOrEqual(10);
  });
});

test(unitTest('Get random item in collections'), () => {
  const randomizer = new Randomizer();
  const emptyCollection: string[] = [];
  repeater(() => {
    expect(
      randomizer.getRandomItemInCollection(emptyCollection),
    ).toBeUndefined();
  });
  const singleItemCollection = ['1'];
  repeater(() => {
    expect(randomizer.getRandomItemInCollection(singleItemCollection)).toEqual(
      '1',
    );
  });
  const testCollection = ['1', '2', '3', '4'];
  repeater(() => randomizer.getRandomItemInCollection(testCollection));
});
