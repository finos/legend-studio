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
import { unitTest } from '../../__test-utils__/TestUtils.js';
import { Pair } from '../Pair.js';

test(unitTest('Pair constructor sets first and second properties'), () => {
  // Test with string values
  const stringPair = new Pair('first', 'second');
  expect(stringPair.first).toBe('first');
  expect(stringPair.second).toBe('second');

  // Test with number values
  const numberPair = new Pair(1, 2);
  expect(numberPair.first).toBe(1);
  expect(numberPair.second).toBe(2);

  // Test with mixed types
  const mixedPair = new Pair('key', 42);
  expect(mixedPair.first).toBe('key');
  expect(mixedPair.second).toBe(42);

  // Test with object values
  const obj1 = { id: 1 };
  const obj2 = { id: 2 };
  const objectPair = new Pair(obj1, obj2);
  expect(objectPair.first).toBe(obj1);
  expect(objectPair.second).toBe(obj2);

  // Test with null/undefined values
  const nullPair = new Pair(null, undefined);
  expect(nullPair.first).toBeNull();
  expect(nullPair.second).toBeUndefined();
});

test(unitTest('Pair properties can be modified after creation'), () => {
  const pair = new Pair('initial1', 'initial2');

  // Modify first property
  pair.first = 'modified1';
  expect(pair.first).toBe('modified1');
  expect(pair.second).toBe('initial2');

  // Modify second property
  pair.second = 'modified2';
  expect(pair.first).toBe('modified1');
  expect(pair.second).toBe('modified2');
});
